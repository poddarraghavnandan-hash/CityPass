import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@citypass/db';
import { typesenseClient } from '@/lib/typesense';
import { searchEvents as semanticSearch } from '@citypass/llm';
import {
  calculateFitScore,
  applyEpsilonGreedyWithExploration,
  type FitScoreResult,
} from '@citypass/search';
import {
  IntentionTokensSchema,
  type Intention,
  type RankedItem,
  type SocialPreview,
} from '@citypass/types';
import { buildIntention } from '@citypass/utils';
import { diversifyByGraph } from '@citypass/cag';

const BodySchema = z.object({
  intention: z
    .object({
      city: z.string().optional(),
      sessionId: z.string().optional(),
      userId: z.string().optional(),
      tokens: IntentionTokensSchema.partial().optional(),
    })
    .optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(6).max(30).default(15),
  ids: z.array(z.string()).min(1).optional(),
  graphDiversification: z.boolean().optional().default(false),
});

const MIN_SPONSORED_FIT = 0.65;

interface Candidate {
  id: string;
  textual: number;
  semantic: number;
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const body = BodySchema.parse(payload);

    const cookieIntention = req.cookies.get('citylens_intention')?.value;
    const intention = buildIntention({
      city: body.intention?.city,
      sessionId: body.intention?.sessionId,
      userId: body.intention?.userId,
      profileTokens: body.intention?.tokens,
      cookie: cookieIntention,
      overrides: body.intention?.tokens,
    });

    const limit = body.limit;
    const page = body.page;
    const offset = (page - 1) * limit;

    const focusIds = body.ids ? new Set(body.ids) : null;

    const [candidates, consent] = await Promise.all([
      focusIds ? seedCandidatesFromIds(focusIds) : getCandidates(intention, limit * 4),
      body.intention?.sessionId
        ? prisma.userConsent.findUnique({
            where: { sessionId: body.intention.sessionId },
          })
        : null,
    ]);

    const candidateIds = candidates.map(candidate => candidate.id);

    if (candidateIds.length === 0) {
      return NextResponse.json({
        items: [],
        intention,
        page,
        hasMore: false,
      });
    }

    const advertisingConsent = consent?.advertising ?? false;

    const [events, socialProof, blocklist, sponsoredMeta] = await Promise.all([
      prisma.event.findMany({
        where: { id: { in: candidateIds } },
        include: { venue: true },
      }),
      loadSocialProof(candidateIds),
      loadBlocklist(body.intention?.sessionId, body.intention?.userId),
      loadSponsoredEvents(candidateIds, advertisingConsent, intention),
    ]);

    const blockedEventIds = blocklist.blockedEventIds;
    const blockedVenues = blocklist.blockedVenueIds;
    const blockedCategories = blocklist.blockedCategories;
    const personalizationEnabled = consent?.personalization ?? false;

    const scored = events
      .filter(event => {
        if (blockedEventIds.has(event.id)) return false;
        if (event.venueId && blockedVenues.has(event.venueId)) return false;
        if (event.category && blockedCategories.has(event.category)) return false;
        return true;
      })
      .map(event => {
        const candidate = candidates.find(c => c.id === event.id);
        if (!candidate) return null;

        const social = socialProof[event.id];
        const fit = calculateFitScore({
          event: {
            id: event.id,
            category: event.category,
            startTime: event.startTime,
            priceMin: event.priceMin,
            priceMax: event.priceMax,
            lat: event.lat,
            lon: event.lon,
            tags: event.tags,
          },
          intention,
          textualSimilarity: candidate.textual,
          semanticSimilarity: candidate.semantic,
          distanceKm: undefined,
          socialProof: social,
        });

        return {
          event,
          candidate,
          fit,
        };
      })
      .filter((entry): entry is { event: typeof events[number]; candidate: Candidate; fit: FitScoreResult } => entry !== null);

    const scores = scored.map(item => item.fit.score);
    const { scores: exploredScores, explorationIndexes } = applyEpsilonGreedyWithExploration(scores, personalizationEnabled ? 0.12 : 0.05);

    const ranked = scored
      .map((entry, index) => ({
        ...entry,
        adjustedScore: exploredScores[index],
        exploration: explorationIndexes.includes(index),
      }))
      .sort((a, b) => b.adjustedScore - a.adjustedScore);

    // Apply graph diversification if requested
    let diversifiedRanked = ranked;
    if (body.graphDiversification && body.intention?.userId) {
      const rankedIds = ranked.map(r => r.event.id);
      const diversifiedIds = await diversifyByGraph(
        rankedIds,
        body.intention.userId,
        0.7, // diversityThreshold
        Math.min(rankedIds.length, limit * 3) // maxResults
      );

      // Reorder ranked items based on diversified IDs
      const idToRank = new Map(diversifiedIds.map((id, index) => [id, index]));
      diversifiedRanked = ranked.sort((a, b) => {
        const aRank = idToRank.get(a.event.id) ?? 999999;
        const bRank = idToRank.get(b.event.id) ?? 999999;
        return aRank - bRank;
      });
    }

    const pageItems = diversifiedRanked.slice(offset, offset + limit);

    const items: RankedItem[] = pageItems.map(item => {
      const sponsorInfo = sponsoredMeta.get(item.event.id);
      const isSponsored = Boolean(sponsorInfo) && item.fit.score >= MIN_SPONSORED_FIT;

      return {
        id: item.event.id,
        title: item.event.title,
        subtitle: item.event.subtitle,
        description: item.event.description,
        category: item.event.category,
        venueName: item.event.venueName,
        neighborhood: item.event.neighborhood,
        city: item.event.city,
        startTime: item.event.startTime.toISOString(),
        endTime: item.event.endTime?.toISOString(),
        priceMin: item.event.priceMin ?? undefined,
        priceMax: item.event.priceMax ?? undefined,
        imageUrl: item.event.imageUrl ?? undefined,
        bookingUrl: item.event.bookingUrl ?? undefined,
        distanceKm: undefined,
        fitScore: item.adjustedScore,
        moodScore: item.fit.moodScore,
        socialHeat: item.fit.socialHeat,
        reasons: buildReasons(item.fit, item.exploration, isSponsored ? sponsorInfo?.reason : undefined),
        sponsored: isSponsored,
        patronLabel: isSponsored ? sponsorInfo?.label ?? 'Patron pick' : undefined,
        adDisclosure: isSponsored ? sponsorInfo?.disclosure ?? 'Sponsored match' : undefined,
        socialPreview: deriveSocialPreview(item.event),
      };
    });

    return NextResponse.json({
      items,
      page,
      hasMore: ranked.length > offset + pageItems.length,
      intention,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.flatten() }, { status: 400 });
    }

    console.error('lens/recommend error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getCandidates(intention: Intention, limit: number): Promise<Candidate[]> {
  const query = deriveQueryForMood(intention);
  const cityFilter = `city:=${intention.city}`;

  const typesenseCandidates = await typesenseClient
    .collections('events')
    .documents()
    .search({
      q: query,
      query_by: 'title,description,venue_name,neighborhood,tags',
      filter_by: cityFilter,
      per_page: limit,
      sort_by: 'start_time:asc',
    })
    .then(result => result.hits ?? [])
    .catch(error => {
      console.warn('Typesense search failed for CityLens', error.message);
      return [];
    });

  const keywordCandidates: Candidate[] = typesenseCandidates.map(hit => ({
    id: (hit.document as any).id,
    textual: normalizeScore(hit.text_match),
    semantic: 0.5,
  }));

  const keywordIds = keywordCandidates.map(c => c.id);

  const semanticCandidates = await semanticSearch(query, intention.city, limit).catch(error => {
    console.warn('Qdrant search failed for CityLens', error.message);
    return [];
  });

  const semanticMap = semanticCandidates.reduce<Record<string, number>>((map, candidate) => {
    map[candidate.eventId] = normalizeScore(candidate.score);
    return map;
  }, {});

  const combinedMap = new Map<string, Candidate>();
  keywordCandidates.forEach(candidate => {
    combinedMap.set(candidate.id, candidate);
  });

  semanticCandidates.forEach(candidate => {
    if (!combinedMap.has(candidate.eventId)) {
      combinedMap.set(candidate.eventId, {
        id: candidate.eventId,
        textual: keywordIds.includes(candidate.eventId) ? 0.8 : 0.4,
        semantic: normalizeScore(candidate.score),
      });
    } else {
      const existing = combinedMap.get(candidate.eventId)!;
      combinedMap.set(candidate.eventId, {
        ...existing,
        semantic: normalizeScore(candidate.score),
      });
    }
  });

  return Array.from(combinedMap.values()).slice(0, limit);
}

async function seedCandidatesFromIds(ids: Set<string>): Promise<Candidate[]> {
  if (ids.size === 0) return [];
  return Array.from(ids).map(id => ({
    id,
    textual: 0.85,
    semantic: 0.85,
  }));
}

function deriveQueryForMood(intention: Intention): string {
  const tokens = intention.tokens;
  switch (tokens.mood) {
    case 'calm':
      return 'wellness cozy serene';
    case 'social':
      return 'food meetup community hangout';
    case 'electric':
      return 'live music dj dance nightlife';
    case 'artistic':
      return 'gallery art theatre design';
    case 'grounded':
      return 'family market outdoor day';
    default:
      return 'city events now';
  }
}

function normalizeScore(score: number | undefined): number {
  if (score == null) return 0.5;
  const normalized = score > 1 ? score / 100 : score;
  return Math.max(0, Math.min(1, normalized));
}

async function loadSocialProof(eventIds: string[]) {
  if (eventIds.length === 0) {
    return {};
  }

  const since = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const rows = await prisma.analyticsEvent.groupBy({
    by: ['eventId', 'type'],
    where: {
      eventId: { in: eventIds },
      type: { in: ['VIEW', 'SAVE', 'IMPRESSION'] },
      occurredAt: { gte: since },
    },
    _count: true,
  });

  const map: Record<
    string,
    {
      views: number;
      saves: number;
      friends: number;
    }
  > = {};

  for (const eventId of eventIds) {
    map[eventId] = { views: 0, saves: 0, friends: 0 };
  }

  rows.forEach(row => {
    if (!row.eventId) return;
    const current = map[row.eventId] || { views: 0, saves: 0, friends: 0 };
    if (row.type === 'VIEW') current.views = row._count;
    if (row.type === 'SAVE') current.saves = row._count;
    map[row.eventId] = current;
  });

  return map;
}

async function loadBlocklist(sessionId?: string, userId?: string) {
  if (!sessionId && !userId) {
    return {
      blockedEventIds: new Set<string>(),
      blockedVenueIds: new Set<string>(),
      blockedCategories: new Set<string>(),
    };
  }

  const orClause = [
    sessionId ? { sessionId } : undefined,
    userId ? { userId } : undefined,
  ].filter(Boolean) as any;

  const [blocklist, interactions] = await Promise.all([
    prisma.userBlocklist.findMany({ where: { OR: orClause } }),
    prisma.userInteraction.findMany({
      where: {
        OR: orClause,
        dismissed: true,
      },
    }),
  ]);

  return {
    blockedEventIds: new Set(interactions.map(entry => entry.eventId)),
    blockedVenueIds: new Set(blocklist.map(entry => entry.venueId).filter((id): id is string => Boolean(id))),
    blockedCategories: new Set(blocklist.map(entry => entry.category).filter((cat): cat is string => Boolean(cat))),
  };
}

type SponsorMeta = {
  label: string;
  reason: string;
  disclosure: string;
};

async function loadSponsoredEvents(
  eventIds: string[],
  advertisingConsent: boolean,
  intention: Intention
): Promise<Map<string, SponsorMeta>> {
  if (!advertisingConsent || eventIds.length === 0) {
    return new Map();
  }

  const now = new Date();
  const creatives = await prisma.adCreative.findMany({
    where: {
      eventId: { in: eventIds },
      campaign: {
        status: 'ACTIVE',
        startDate: { lte: now },
        endDate: { gte: now },
      },
    },
    include: {
      campaign: true,
    },
  });

  const map = new Map<string, SponsorMeta>();
  creatives.forEach(creative => {
    if (!creative.eventId) return;
    const advertiser = creative.campaign?.advertiser || 'Local patron';
    const label = creative.campaign?.name || 'Patron pick';

    map.set(creative.eventId, {
      label,
      reason: `Partnered with ${advertiser}`,
      disclosure: `${advertiser} sponsors this slot because it fits your ${intention.tokens.mood} mode.`,
    });
  });

  return map;
}

function buildReasons(fit: FitScoreResult, exploration: boolean, sponsorReason?: string): string[] {
  const reasons = [...fit.reasons];
  if (exploration) {
    reasons.push('Trying something fresh for you');
  }
  if (sponsorReason) {
    reasons.push(sponsorReason);
  }
  return Array.from(new Set(reasons));
}

function deriveSocialPreview(event: any): SocialPreview | undefined {
  if (!event.sourceUrl) return undefined;
  try {
    const url = new URL(event.sourceUrl);
    if (url.hostname.includes('instagram.com')) {
      return {
        id: `${event.id}-ig`,
        eventId: event.id,
        platform: 'instagram',
        url: event.sourceUrl,
        caption: event.title,
        authorName: event.venueName,
        publishedAt: event.startTime.toISOString(),
        posterUrl: event.imageUrl ?? undefined,
      };
    }
    if (url.hostname.includes('tiktok.com')) {
      return {
        id: `${event.id}-tt`,
        eventId: event.id,
        platform: 'tiktok',
        url: event.sourceUrl,
        caption: event.title,
        authorName: event.venueName,
        publishedAt: event.startTime.toISOString(),
        posterUrl: event.imageUrl ?? undefined,
      };
    }
    return undefined;
  } catch {
    return undefined;
  }
}
