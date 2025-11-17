import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { prisma } from '@citypass/db';
import { plan } from '@citypass/agent';
import {
  IntentionTokensSchema,
  type RankedItem,
  type IntentionTokens,
  type Intention,
} from '@citypass/types';
import { diversifyByGraph } from '@citypass/cag';
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/rate-limit';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { parsePreferencesCookie } from '@/lib/preferences';
import type { Event } from '@citypass/db';

const BodySchema = z.object({
  intention: z
    .object({
      city: z.string().optional(),
      user: z
        .object({
          id: z.string(),
          city: z.string().optional(),
        })
        .optional(),
      tokens: IntentionTokensSchema.partial().optional(),
      freeText: z.string().optional(),
    })
    .optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(6).max(30).default(15),
  ids: z.array(z.string()).min(1).optional(),
  graphDiversification: z.boolean().optional().default(false),
  ingestionRequest: z
    .object({
      city: z.string().min(2).optional(),
      reason: z.string().max(280).optional(),
      priority: z.number().int().min(0).max(5).optional(),
      requestedBy: z.string().max(120).optional(),
    })
    .optional(),
});

const DEFAULT_CITY = process.env.NEXT_PUBLIC_DEFAULT_CITY || 'New York';
const FALLBACK_TOKENS: IntentionTokens = {
  mood: 'calm',
  untilMinutes: 150,
  distanceKm: 5,
  budget: 'casual',
  companions: ['solo'],
};

type EventLike = Pick<Event, 'id' | 'title' | 'city' | 'startTime'> &
  Partial<
    Pick<
      Event,
      | 'subtitle'
      | 'description'
      | 'category'
      | 'venueName'
      | 'neighborhood'
      | 'priceMin'
      | 'priceMax'
      | 'imageUrl'
      | 'bookingUrl'
      | 'endTime'
    >
  >;

const STATIC_FALLBACK_EVENTS: EventLike[] = [
  {
    id: 'static-salsa-pier',
    title: 'Sunset Salsa on the Pier',
    city: 'New York',
    startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    category: 'DANCE' as any,
    venueName: 'Pier 15',
    neighborhood: 'Seaport District',
    description: 'Free-spirited salsa session with DJs + sunset views.',
    priceMin: 0,
    priceMax: 15,
    bookingUrl: 'https://houseofyes.org/events/sunset-salsa',
  },
  {
    id: 'static-hadestown-matinee',
    title: 'Broadway Matinee: Hadestown',
    city: 'New York',
    startTime: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    category: 'THEATRE' as any,
    venueName: 'Walter Kerr Theatre',
    neighborhood: 'Midtown',
    description: 'Tony-winning musical retelling of Orpheus & Eurydice.',
    priceMin: 129,
    priceMax: 289,
    bookingUrl: 'https://www.broadway.com/shows/hadestown/tickets',
  },
  {
    id: 'static-liberty-playoffs',
    title: 'NY Liberty Playoff Game',
    city: 'New York',
    startTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    category: 'OTHER' as any,
    venueName: 'Barclays Center',
    neighborhood: 'Prospect Heights',
    description: 'WNBA Eastern Conference showdown. High energy crowd.',
    priceMin: 45,
    priceMax: 160,
    bookingUrl: 'https://www.nycliberty.com/tickets/playoffs',
  },
  {
    id: 'static-rooftop-yoga',
    title: 'Sunrise Rooftop Yoga Flow',
    city: 'New York',
    startTime: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000 + 7 * 60 * 60 * 1000),
    category: 'FITNESS' as any,
    venueName: 'The William Vale Rooftop',
    neighborhood: 'Williamsburg',
    description: 'Guided vinyasa with skyline views + live ambient DJ.',
    priceMin: 20,
    priceMax: 35,
    bookingUrl: 'https://www.nycgovparks.org/events/sunrise-rooftop-yoga',
  },
  {
    id: 'static-queens-night-market',
    title: 'Queens Night Market',
    city: 'New York',
    startTime: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
    category: 'FOOD' as any,
    venueName: 'Flushing Meadows Park',
    neighborhood: 'Corona',
    description: 'Open-air market with 50+ vendors, DJs, and art pop-ups.',
    priceMin: 5,
    priceMax: 25,
    bookingUrl: 'https://www.timeout.com/newyork/things-to-do/queens-night-market',
  },
];

export async function POST(req: NextRequest) {
  const traceId = randomUUID();

  // Rate limiting: 200 requests per minute per IP (higher limit for recommendations)
  const rateLimitId = getRateLimitIdentifier(req);
  const rateLimit = checkRateLimit({
    identifier: rateLimitId,
    limit: 200,
    windowSeconds: 60,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        traceId,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.retryAfter),
          'X-RateLimit-Limit': '200',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(rateLimit.resetAt),
        },
      }
    );
  }

  try {
    const payload = await req.json();
    const body = BodySchema.parse(payload);
    const cookieStore = cookies();
    const prefCookie = cookieStore.get('citylens_prefs')?.value;
    const cookiePrefs = parsePreferencesCookie(prefCookie);
    const session = await getServerSession(authOptions);
    const userId = session?.user && 'id' in session.user ? (session.user as any).id : undefined;
    const profile = userId ? await prisma.userProfile.findUnique({ where: { userId } }) : null;
    const mergedPrefs = parsePreferencesCookie(
      JSON.stringify({ ...(cookiePrefs || {}), ...(profile?.meta || {}) })
    ) || cookiePrefs;
    const mergedTokens: IntentionTokens | undefined = {
      ...(mergedPrefs
        ? {
            mood: mergedPrefs.mood,
            distanceKm: mergedPrefs.distanceKm,
            budget: mergedPrefs.budget,
          }
        : {}),
      ...(body.intention?.tokens || {}),
    };
    const requestedCity = resolveCity(body);
    const limit = body.limit;
    const page = body.page;
    const offset = (page - 1) * limit;

    if (body.ingestionRequest) {
      const fallbackCity =
        body.ingestionRequest.city ??
        body.intention?.city ??
        body.intention?.user?.city ??
        process.env.NEXT_PUBLIC_DEFAULT_CITY ??
        'New York';

      const request = await prisma.ingestionRequest.create({
        data: {
          city: fallbackCity,
          tokens: body.intention?.tokens ?? {},
          reason: body.ingestionRequest.reason,
          priority: body.ingestionRequest.priority ?? 0,
          requestedBy: body.ingestionRequest.requestedBy ?? body.intention?.user?.id,
          requesterIp: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
          requesterAgent: req.headers.get('user-agent') || undefined,
        },
      });

      return NextResponse.json(
        {
          queued: true,
          request,
        },
        { status: 202 }
      );
    }

    let agentResult: Awaited<ReturnType<typeof plan>> | null = null;
    try {
      agentResult = await plan({
        user: body.intention?.user || (userId ? { id: userId } : undefined),
        tokens: mergedTokens,
        freeText: body.intention?.freeText,
      });
    } catch (error) {
      console.error('lens/recommend plan error, falling back to DB events', error);
    }

    if (!agentResult) {
      return NextResponse.json(
        await buildFallbackResponse({
          city: requestedCity,
          limit,
          page,
          offset,
          tokens: mergedTokens,
          traceId,
        })
      );
    }

    const slates = agentResult.state.slates || {
      best: [],
      wildcard: [],
      closeAndEasy: [],
    };

    const combined: RankedItem[] = [
      ...(slates.best || []),
      ...(slates.wildcard || []),
      ...(slates.closeAndEasy || []),
    ];

    if (combined.length === 0) {
      return NextResponse.json(
        await buildFallbackResponse({
          city: requestedCity,
          limit,
          page,
          offset,
          tokens: body.intention?.tokens,
          traceId: agentResult.state.traceId,
          baselineIntention: agentResult.state.intention,
        })
      );
    }

    // Deduplicate by event id preserving order
    const uniqueMap = new Map<string, RankedItem>();
    combined.forEach(item => {
      if (!uniqueMap.has(item.id)) {
        uniqueMap.set(item.id, item);
      }
    });

    let orderedItems = Array.from(uniqueMap.values());

    // If IDs were requested (e.g., deterministic tests), filter to that set
    if (body.ids) {
      orderedItems = body.ids
        .map(id => uniqueMap.get(id))
        .filter((item): item is RankedItem => Boolean(item));
    }

    // Optional graph diversification pass using user id
    if (body.graphDiversification && body.intention?.user?.id) {
      const diversifiedIds = await diversifyByGraph(
        orderedItems.map(item => item.id),
        body.intention.user.id,
        0.6,
        Math.min(orderedItems.length, limit * 3)
      );

      const idToItem = new Map(orderedItems.map(item => [item.id, item]));
      orderedItems = diversifiedIds
        .map(id => idToItem.get(id))
        .filter((item): item is RankedItem => Boolean(item));
    }

    const pageItems = orderedItems.slice(offset, offset + limit);

    return NextResponse.json({
      items: pageItems,
      slates,
      page,
      hasMore: orderedItems.length > offset + pageItems.length,
      intention: agentResult.state.intention,
      traceId: agentResult.state.traceId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.flatten() }, { status: 400 });
    }

    console.error('lens/recommend error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const requestId = searchParams.get('requestId');
  const city = searchParams.get('city');

  if (!requestId && !city) {
    return NextResponse.json(
      { error: 'Provide requestId or city query param to inspect ingestion status' },
      { status: 400 }
    );
  }

  const request = await prisma.ingestionRequest.findFirst({
    where: requestId ? { id: requestId } : { city: city ?? '' },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ request });
}

function resolveCity(body: z.infer<typeof BodySchema>): string {
  return (
    body.intention?.city ||
    body.intention?.user?.city ||
    DEFAULT_CITY
  );
}

function mergeTokens(partial?: Partial<IntentionTokens>): IntentionTokens {
  if (!partial) return { ...FALLBACK_TOKENS };
  return {
    ...FALLBACK_TOKENS,
    ...partial,
    companions: partial.companions ?? FALLBACK_TOKENS.companions,
  };
}

function buildIntention(city: string, partialTokens?: Partial<IntentionTokens>): Intention {
  return {
    city,
    nowISO: new Date().toISOString(),
    tokens: mergeTokens(partialTokens),
    source: 'inline',
  };
}

function toRankedItem(event: EventLike, fitScore: number): RankedItem {
  const reasons: string[] = [];
  if (event.neighborhood) reasons.push(`In ${event.neighborhood}`);
  if ((event.priceMin ?? 0) === 0) reasons.push('Free entry');
  if (!reasons.length) reasons.push('Handpicked from CityLens');

  return {
    id: event.id,
    title: event.title,
    subtitle: event.subtitle ?? undefined,
    description: event.description ?? undefined,
    category: event.category ?? undefined,
    venueName: event.venueName ?? undefined,
    neighborhood: event.neighborhood ?? undefined,
    city: event.city,
    startTime: event.startTime.toISOString(),
    endTime: event.endTime?.toISOString() ?? undefined,
    priceMin: event.priceMin ?? undefined,
    priceMax: event.priceMax ?? undefined,
    imageUrl: event.imageUrl ?? undefined,
    bookingUrl: event.bookingUrl ?? undefined,
    distanceKm: null,
    fitScore,
    moodScore: null,
    socialHeat: null,
    sponsored: false,
    reasons,
  };
}

async function fetchFallbackEvents(city: string, limit: number, offset: number): Promise<EventLike[]> {
  const now = new Date();
  let events = await prisma.event.findMany({
    where: {
      city,
      startTime: { gte: now },
    },
    orderBy: { startTime: 'asc' },
    skip: offset,
    take: limit,
  });

  if (events.length === 0 && city !== DEFAULT_CITY) {
    events = await prisma.event.findMany({
      where: {
        city: DEFAULT_CITY,
        startTime: { gte: now },
      },
      orderBy: { startTime: 'asc' },
      skip: offset,
      take: limit,
    });
  }

  if (events.length === 0) {
    const base = STATIC_FALLBACK_EVENTS.filter((event) => event.city === city);
    const fallbackPool = base.length ? base : STATIC_FALLBACK_EVENTS;
    return fallbackPool.slice(offset, offset + limit);
  }

  return events;
}

async function buildFallbackResponse({
  city,
  limit,
  page,
  offset,
  tokens,
  traceId,
  baselineIntention,
}: {
  city: string;
  limit: number;
  page: number;
  offset: number;
  tokens?: Partial<IntentionTokens>;
  traceId: string;
  baselineIntention?: Intention;
}) {
  const events = await fetchFallbackEvents(city, limit + 1, offset);
  const hasMore = events.length > limit;
  const visibleEvents = events.slice(0, limit);
  const items = visibleEvents.map((event, index) => toRankedItem(event, 0.45 - index * 0.01));

  return {
    items,
    slates: null,
    page,
    hasMore,
    intention: baselineIntention ?? buildIntention(city, tokens),
    traceId,
    degraded: 'agent',
  };
}
