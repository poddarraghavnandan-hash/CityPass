import 'dotenv/config';
import { prisma } from '@citypass/db';
import { SearchTimeframe } from '@prisma/client';
import { searchExternalAPIs } from '../apps/web/src/lib/external-apis';
import { saveCacheEntry, timeframeWindow, cacheExpiryFor } from '../apps/web/src/lib/search-cache';
import type { CityPassEvent } from '../apps/web/src/lib/event-types';
import { normalizeCategory, type EventCategoryValue } from '../apps/web/src/lib/categories';

const POPULAR_CITIES = ['New York', 'San Francisco', 'Los Angeles', 'Chicago'];
const POPULAR_TOPICS: Array<{ label: string; query: string; category: EventCategoryValue | null }> = [
  { label: 'top', query: '', category: null },
  { label: 'music', query: 'music', category: 'MUSIC' },
  { label: 'comedy', query: 'comedy', category: 'COMEDY' },
  { label: 'family', query: 'family', category: 'FAMILY' },
  { label: 'fitness', query: 'fitness', category: 'FITNESS' },
];

async function run() {
  console.log('🚀 Starting cold-start batch cache generation');

  for (const city of POPULAR_CITIES) {
    for (const timeframe of [SearchTimeframe.TODAY, SearchTimeframe.WEEK, SearchTimeframe.MONTH]) {
      for (const topic of POPULAR_TOPICS) {
        await buildCacheFor({ city, timeframe, topic });
      }
    }
  }

  console.log('✅ Cold-start cache complete');
  process.exit(0);
}

async function buildCacheFor(params: {
  city: string;
  timeframe: SearchTimeframe;
  topic: { label: string; query: string; category: EventCategoryValue | null };
}) {
  const { city, timeframe, topic } = params;
  const { start, end } = timeframeWindow(timeframe);
  console.log(`   ➤ Precomputing ${topic.label || 'top'} events for ${city} (${timeframe})`);

  const dbEvents = await prisma.event.findMany({
    where: {
      city,
      startTime: { gte: start, lte: end },
      ...(topic.category ? { category: topic.category } : {}),
    },
    include: { venue: true },
    orderBy: [
      { viewCount24h: 'desc' },
      { saveCount24h: 'desc' },
      { startTime: 'asc' },
    ],
    take: 40,
  });

  const normalizedDb = dbEvents.map(mapDbEventToCache);

  let externalEvents: CityPassEvent[] = [];
  try {
    const categoryFilter = normalizeCategory(topic.category || undefined);
    const external = await searchExternalAPIs({
      query: topic.query || `events in ${city}`,
      city,
      category: categoryFilter,
      limit: 15,
    });
    externalEvents = external.map(mapExternalEventToCache);
  } catch (error: any) {
    console.warn(`      ⚠️ External API warmup failed for ${city}:`, error?.message || error);
  }

  const merged = mergeEvents(normalizedDb, externalEvents).slice(0, 40);

  await saveCacheEntry({
    city,
    query: topic.query,
    category: topic.category,
    timeframe,
    events: merged,
    source: 'BATCH',
    expiresAt: cacheExpiryFor(timeframe),
  });
}

function mapDbEventToCache(event: any): CityPassEvent {
  return {
    id: event.id,
    title: event.title,
    subtitle: event.subtitle ?? undefined,
    description: event.description ?? undefined,
    category: event.category ?? undefined,
    venueName: event.venueName ?? event.venue?.name ?? undefined,
    neighborhood: event.neighborhood ?? event.venue?.neighborhood ?? undefined,
    city: event.city,
    startTime: event.startTime.toISOString(),
    endTime: event.endTime ? event.endTime.toISOString() : null,
    priceMin: event.priceMin ?? null,
    priceMax: event.priceMax ?? null,
    imageUrl: event.imageUrl ?? null,
    bookingUrl: event.bookingUrl ?? null,
    score: computeScore(event),
    source: 'database',
    tags: event.tags ?? [],
    lat: event.lat,
    lon: event.lon,
  };
}

function mapExternalEventToCache(event: any): CityPassEvent {
  return {
    id: event.id || event.sourceUrl,
    title: event.title,
    subtitle: event.subtitle ?? undefined,
    description: event.description ?? undefined,
    category: event.category ?? undefined,
    venueName: event.venueName ?? undefined,
    neighborhood: event.neighborhood ?? undefined,
    city: event.city,
    startTime: (event.startTime instanceof Date ? event.startTime : new Date(event.startTime)).toISOString(),
    endTime: event.endTime ? (event.endTime instanceof Date ? event.endTime : new Date(event.endTime)).toISOString() : null,
    priceMin: event.priceMin ?? null,
    priceMax: event.priceMax ?? null,
    imageUrl: event.imageUrl ?? null,
    bookingUrl: event.bookingUrl ?? event.sourceUrl,
    score: event.score ?? 0.4,
    source: event.source || 'external_api',
    lat: event.lat,
    lon: event.lon,
  };
}

function mergeEvents(primary: CityPassEvent[], secondary: CityPassEvent[]): CityPassEvent[] {
  const seen = new Set<string>();
  const merged: CityPassEvent[] = [];
  for (const list of [primary, secondary]) {
    for (const event of list) {
      const key = event.id || `${event.title}-${event.startTime}`;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(event);
    }
  }
  return merged;
}

function computeScore(event: any): number {
  const views = event.viewCount24h || event.viewCount || 0;
  const saves = event.saveCount24h || event.saveCount || 0;
  return views * 0.6 + saves * 1.2;
}

run().catch((error) => {
  console.error('Cold-start batch job failed:', error);
  process.exit(1);
});
