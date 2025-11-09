import { prisma, type SearchCache, SearchTimeframe, type EventCategory } from '@citypass/db';
import type { CityPassEvent } from './event-types';
import { normalizeCategory, type EventCategoryValue } from './categories';

const TTL_BY_TIMEFRAME: Record<SearchTimeframe, number> = {
  [SearchTimeframe.TODAY]: 1000 * 60 * 60 * 6, // 6 hours
  [SearchTimeframe.WEEK]: 1000 * 60 * 60 * 12, // 12 hours
  [SearchTimeframe.MONTH]: 1000 * 60 * 60 * 24, // 24 hours
};

export function normalizeQueryKey(query?: string | null): string {
  return (query || '').trim().toLowerCase();
}

export function inferTimeframe(value?: string | null): SearchTimeframe | null {
  if (!value) return null;
  const normalized = value.toLowerCase();

  if (normalized.includes('today') || normalized.includes('tonight') || normalized.includes('now')) {
    return SearchTimeframe.TODAY;
  }
  if (normalized.includes('week')) {
    return SearchTimeframe.WEEK;
  }
  if (normalized.includes('month')) {
    return SearchTimeframe.MONTH;
  }

  return null;
}

export function timeframeWindow(timeframe: SearchTimeframe): { start: Date; end: Date } {
  const start = new Date();
  const end = new Date(start);

  if (timeframe === SearchTimeframe.TODAY) {
    end.setDate(end.getDate() + 1);
  } else if (timeframe === SearchTimeframe.WEEK) {
    end.setDate(end.getDate() + 7);
  } else {
    end.setDate(end.getDate() + 30);
  }

  return { start, end };
}

export function cacheExpiryFor(timeframe: SearchTimeframe): Date {
  const ttl = TTL_BY_TIMEFRAME[timeframe] ?? TTL_BY_TIMEFRAME[SearchTimeframe.TODAY];
  return new Date(Date.now() + ttl);
}

interface CacheLookupOptions {
  city: string;
  query?: string | null;
  category?: EventCategoryValue | null;
  timeframe?: SearchTimeframe | null;
}

export async function getCachedResults(options: CacheLookupOptions): Promise<{
  entry: SearchCache;
  results: CityPassEvent[];
} | null> {
  const { city, query, category, timeframe } = options;
  const normalizedQuery = normalizeQueryKey(query);
  const normalizedCategory = normalizeCategory(category || undefined);
  const targetTimeframe = timeframe ?? SearchTimeframe.TODAY;

  const entry = await findCacheEntry({
    city,
    query: normalizedQuery,
    category: normalizedCategory,
    timeframe: targetTimeframe,
  }) || (normalizedQuery
      ? await findCacheEntry({ city, query: '', category: normalizedCategory, timeframe: targetTimeframe })
      : null) || (normalizedCategory
      ? await findCacheEntry({ city, query: normalizedQuery, category: null, timeframe: targetTimeframe })
      : null);

  if (!entry) {
    return null;
  }

  return {
    entry,
    results: (entry.results as unknown as CityPassEvent[]) || [],
  };
}

export async function saveCacheEntry(params: {
  city: string;
  query?: string | null;
  category?: EventCategoryValue | null;
  timeframe: SearchTimeframe;
  events: CityPassEvent[];
  source?: string;
  expiresAt?: Date;
}): Promise<SearchCache> {
  const { city, query, category, timeframe, events, source, expiresAt } = params;
  const normalizedQuery = normalizeQueryKey(query);
  const normalizedCategory = normalizeCategory(category || undefined);
  const cacheExpiry = expiresAt ?? cacheExpiryFor(timeframe);

  return prisma.searchCache.upsert({
    where: {
      unique_search_cache_key: {
        city,
        timeframe,
        query: normalizedQuery,
        category: (normalizedCategory as EventCategory) ?? undefined,
      },
    },
    update: {
      results: events as any,
      eventIds: events.map(event => event.id),
      generatedAt: new Date(),
      expiresAt: cacheExpiry,
      source: source ?? 'BATCH',
    },
    create: {
      city,
      query: normalizedQuery,
      category: normalizedCategory as EventCategory | null,
      timeframe,
      results: events as any,
      eventIds: events.map(event => event.id),
      generatedAt: new Date(),
      expiresAt: cacheExpiry,
      source: source ?? 'BATCH',
    },
  });
}

async function findCacheEntry(params: {
  city: string;
  query: string;
  category: EventCategoryValue | null;
  timeframe: SearchTimeframe;
}): Promise<SearchCache | null> {
  const { city, query, category, timeframe } = params;
  const now = new Date();

  return prisma.searchCache.findFirst({
    where: {
      city,
      query,
      timeframe,
      category,
      expiresAt: { gte: now },
    },
    orderBy: { generatedAt: 'desc' },
  });
}
