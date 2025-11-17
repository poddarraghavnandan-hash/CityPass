/**
 * Recommendation API with Learning-to-Rank
 * Combines: Typesense keyword + Qdrant semantic + Ranking + Exploration
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@citypass/db';
import { z } from 'zod';
import {
  extractFeatures,
  computeScore,
  DEFAULT_WEIGHTS,
  applyEpsilonGreedy,
  addExplorationBonus,
  UserContext,
} from '@citypass/search';

const RecommendRequestSchema = z.object({
  query: z.string().optional(),
  city: z.string(),
  coords: z.object({ lat: z.number(), lon: z.number() }).optional(),
  category: z.string().optional(),
  priceMax: z.number().optional(),
  neighborhood: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  limit: z.number().min(1).max(100).default(20),
  sessionId: z.string(),
  userId: z.string().optional(),
  exploreRate: z.number().min(0).max(1).default(0.1), // Epsilon for exploration
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const params = RecommendRequestSchema.parse(body);

    // Get user preferences
    const prefs = await getUserPreferences(params.userId, params.sessionId);

    // Check consent for personalization
    const consent = await prisma.userConsent.findUnique({
      where: { sessionId: params.sessionId },
    });

    const canPersonalize = consent?.personalization ?? false;

    // Build user context
    const now = new Date();
    const hour = now.getHours();
    let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'late';
    if (hour < 12) timeOfDay = 'morning';
    else if (hour < 17) timeOfDay = 'afternoon';
    else if (hour < 22) timeOfDay = 'evening';
    else timeOfDay = 'late';

    const context: UserContext = {
      sessionId: params.sessionId,
      userId: params.userId,
      city: params.city,
      coords: params.coords,
      timeOfDay,
      dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase(),
      deviceType: getDeviceType(req.headers.get('user-agent') || ''),
      query: params.query,
      prefs: canPersonalize && prefs ? {
        ...prefs,
        priceMax: prefs.priceMax ?? undefined,
      } : undefined,
    };

    // Step 1: Get candidates from Typesense (keyword search)
    const candidates = await searchEvents({
      query: params.query || '*',
      city: params.city,
      category: params.category,
      priceMax: params.priceMax,
      neighborhood: params.neighborhood,
      dateFrom: params.dateFrom ? new Date(params.dateFrom) : undefined,
      dateTo: params.dateTo ? new Date(params.dateTo) : undefined,
      limit: params.limit * 3, // Get 3x for reranking
    });

    if (candidates.length === 0) {
      return NextResponse.json({
        results: [],
        total: 0,
        explainability: { message: 'No events found matching criteria' },
      });
    }

    // Step 2: Get recent user interactions for diversity and "seen" penalty
    const seenEventIds = await getSeenEventIds(params.sessionId, params.userId);
    const recentCategories = await getRecentCategories(params.sessionId, params.userId);

    // Step 3: Load ranking weights (use latest version)
    const weightsRecord = await prisma.rankingWeights.findFirst({
      orderBy: { version: 'desc' },
    });
    const weights = weightsRecord?.weights ? weightsRecord : DEFAULT_WEIGHTS;

    // Step 4: Get social proof data (views/saves in last 24h)
    const socialProofData = await getSocialProofData(
      candidates.map(e => e.id),
      params.sessionId,
      params.userId
    );

    // Step 5: Extract features and compute scores
    const scoredEvents = candidates.map((event) => {
      const features = extractFeatures(
        {
          ...event,
          viewCount: socialProofData[event.id]?.viewCount || 0,
          saveCount: socialProofData[event.id]?.saveCount || 0,
          friendSaves: socialProofData[event.id]?.friendSaves || 0,
        },
        context,
        seenEventIds,
        recentCategories
      );

      // Set textual similarity from Typesense rank (placeholder)
      features.textualSimilarity = event._score || 0.5;
      features.semanticSimilarity = 0.5; // TODO: Add Qdrant semantic search

      const baseScore = computeScore(features, weights as any);

      // Add impression-based exploration bonus
      const impressions = socialProofData[event.id]?.impressionCount || 0;
      const totalImpressions = Object.values(socialProofData).reduce(
        (sum, d) => sum + (d.impressionCount || 0),
        0
      );
      const scoreWithExploration = addExplorationBonus(baseScore, impressions, totalImpressions);

      return {
        ...event,
        _score: scoreWithExploration,
        _features: features,
        _socialProof: socialProofData[event.id],
      };
    });

    // Step 6: Apply epsilon-greedy exploration
    // Map to fitScore property for applyEpsilonGreedy
    const candidatesWithFitScore = scoredEvents.map(e => ({
      ...e,
      fitScore: e._score,
    }));

    const exploredResults = applyEpsilonGreedy(
      candidatesWithFitScore,
      params.limit,
      params.exploreRate
    );

    const rankedEvents = exploredResults.map(result => ({
      ...result,
      _score: result.fitScore,
    }));

    // Step 7: Log impressions for learning
    await logImpressions(
      rankedEvents.map((e, idx) => ({
        sessionId: params.sessionId,
        userId: params.userId,
        eventId: e.id,
        rank: idx + 1,
        score: e._score,
        query: params.query,
        city: params.city,
      }))
    );

    // Step 8: Build explainability for top results
    const explainability = rankedEvents.slice(0, 5).map((event) => ({
      eventId: event.id,
      title: event.title,
      score: event._score,
      topFeatures: getTopFeatures(event._features as any),
      socialProof: event._socialProof,
    }));

    return NextResponse.json({
      results: rankedEvents.map(e => ({
        id: e.id,
        title: e.title,
        subtitle: e.subtitle,
        description: e.description,
        category: e.category,
        venueName: e.venueName,
        neighborhood: e.neighborhood,
        city: e.city,
        startTime: e.startTime,
        endTime: e.endTime,
        priceMin: e.priceMin,
        priceMax: e.priceMax,
        imageUrl: e.imageUrl,
        bookingUrl: e.bookingUrl,
        tags: e.tags,
        score: e._score,
        socialProof: e._socialProof,
      })),
      total: rankedEvents.length,
      explainability: {
        topResults: explainability,
        weightsVersion: weights.version,
        exploratio: params.exploreRate,
        personalized: canPersonalize,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Recommend error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions

async function getUserPreferences(userId?: string, sessionId?: string) {
  if (userId) {
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
    });
    if (profile) {
      return {
        categories: profile.favoriteCategories,
        neighborhoods: profile.neighborhoods,
        priceMax: profile.priceMax,
      };
    }
  }

  // Fall back to cookie-based prefs (would come from middleware in real app)
  return {
    categories: [],
    neighborhoods: [],
  };
}

async function getSeenEventIds(sessionId: string, userId?: string): Promise<Set<string>> {
  const interactions = await prisma.userInteraction.findMany({
    where: {
      OR: [{ sessionId }, userId ? { userId } : {}],
    },
    select: { eventId: true },
  });

  return new Set(interactions.map(i => i.eventId));
}

async function getRecentCategories(sessionId: string, userId?: string): Promise<string[]> {
  const recentViews = await prisma.analyticsEvent.findMany({
    where: {
      OR: [{ sessionId }, userId ? { userId } : {}],
      type: 'VIEW',
      occurredAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
    },
    orderBy: { occurredAt: 'desc' },
    take: 50,
  });

  // Extract categories from props
  return recentViews
    .map(v => v.props as any)
    .filter(p => p.category)
    .map(p => p.category as string);
}

async function getSocialProofData(
  eventIds: string[],
  sessionId: string,
  userId?: string
): Promise<Record<string, { viewCount: number; saveCount: number; friendSaves: number; impressionCount: number }>> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Get view/save counts
  const counts = await prisma.analyticsEvent.groupBy({
    by: ['eventId', 'type'],
    where: {
      eventId: { in: eventIds },
      type: { in: ['VIEW', 'SAVE', 'IMPRESSION'] },
      occurredAt: { gte: oneDayAgo },
    },
    _count: true,
  });

  // Get friend saves (placeholder - would need friend graph)
  const friendSaves: Record<string, number> = {};

  const result: Record<string, any> = {};

  for (const eventId of eventIds) {
    const viewCount = counts.find(c => c.eventId === eventId && c.type === 'VIEW')?._count || 0;
    const saveCount = counts.find(c => c.eventId === eventId && c.type === 'SAVE')?._count || 0;
    const impressionCount = counts.find(c => c.eventId === eventId && c.type === 'IMPRESSION')?._count || 0;

    result[eventId] = {
      viewCount,
      saveCount,
      friendSaves: friendSaves[eventId] || 0,
      impressionCount,
    };
  }

  return result;
}

async function logImpressions(impressions: Array<{
  sessionId: string;
  userId?: string;
  eventId: string;
  rank: number;
  score: number;
  query?: string;
  city: string;
}>) {
  const events = impressions.map(imp => ({
    sessionId: imp.sessionId,
    userId: imp.userId || null,
    eventId: imp.eventId,
    type: 'IMPRESSION' as const,
    props: {
      rank: imp.rank,
      score: imp.score,
      query: imp.query,
    },
    city: imp.city,
    occurredAt: new Date(),
  }));

  await prisma.analyticsEvent.createMany({
    data: events,
    skipDuplicates: true,
  });
}

function getTopFeatures(features: any): Array<{ name: string; value: number; weight: number }> {
  const weights = DEFAULT_WEIGHTS.weights;
  const contributions = Object.entries(features).map(([key, value]) => ({
    name: key,
    value: value as number,
    weight: (weights as any)[key] || 0,
    contribution: (value as number) * ((weights as any)[key] || 0),
  }));

  return contributions
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 5);
}

async function searchEvents(params: {
  query: string;
  city: string;
  category?: string;
  priceMax?: number;
  neighborhood?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit: number;
}) {
  const where: any = {
    city: params.city,
    startTime: {
      gte: params.dateFrom || new Date(),
      lte: params.dateTo,
    },
  };

  if (params.category) where.category = params.category;
  if (params.neighborhood) where.neighborhood = params.neighborhood;
  if (params.priceMax !== undefined) {
    where.OR = [
      { priceMin: { lte: params.priceMax } },
      { priceMin: null },
    ];
  }

  // Simple database search (in production, use Typesense)
  const events = await prisma.event.findMany({
    where,
    orderBy: { startTime: 'asc' },
    take: params.limit,
  });

  return events.map(e => ({ ...e, _score: 0.7 })); // Placeholder score
}

function getDeviceType(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
  const ua = userAgent.toLowerCase();
  if (/(tablet|ipad)/i.test(ua)) return 'tablet';
  if (/mobile|android|iphone/i.test(ua)) return 'mobile';
  return 'desktop';
}
