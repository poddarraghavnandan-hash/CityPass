import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@citypass/db';
import { typesenseClient } from '@/lib/typesense';
import { searchEvents, rerank } from '@citypass/llm';
import {
  getUserPreferences,
  calculatePersonalizationBoost,
  logSearchSession,
} from '@/lib/personalization';
import {
  CATEGORY_HIERARCHY,
  DEFAULT_RECOMMENDATION_CATEGORIES,
  filterValidCategories,
  normalizeCategory,
  type EventCategoryValue,
} from '@/lib/categories';
import { getCachedResults, inferTimeframe } from '@/lib/search-cache';

// Query expansion keywords
const QUERY_EXPANSIONS: Record<string, string[]> = {
  'jazz': ['jazz', 'live music', 'music', 'concert', 'blues', 'soul'],
  'comedy': ['comedy', 'stand-up', 'improv', 'funny', 'laughs'],
  'yoga': ['yoga', 'fitness', 'wellness', 'meditation', 'stretching'],
  'art': ['art', 'gallery', 'museum', 'exhibition', 'artist'],
  'food': ['food', 'dining', 'restaurant', 'culinary', 'tasting'],
};

interface SearchTier {
  name: string;
  results: any[];
  resultCount: number;
}

export async function GET(req: NextRequest) {
  const searchTiers: SearchTier[] = [];

  try {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const city = searchParams.get('city') || 'New York';
    const rawCategory = searchParams.get('category');
    const category = normalizeCategory(rawCategory);
    const limit = parseInt(searchParams.get('limit') || '20');
    const timePreference = searchParams.get('timePreference');
    const requestedTimeframe = inferTimeframe(timePreference);
    const cacheOnly = searchParams.get('cacheOnly') === 'true';

    console.log(`🔍 Search query: "${query}" in ${city}${category ? ` [${category}]` : ''}`);

    if (cacheOnly) {
      const cacheHit = await getCachedResults({
        city,
        query,
        category,
        timeframe: requestedTimeframe,
      });

      if (!cacheHit) {
        return NextResponse.json({
          results: [],
          cacheMiss: true,
        });
      }

      return NextResponse.json({
        results: cacheHit.results,
        cacheMiss: false,
        generatedAt: cacheHit.entry.generatedAt,
        expiresAt: cacheHit.entry.expiresAt,
      });
    }

    // Get user preferences for personalization
    const prefs = await getUserPreferences();

    // ===== TIER 1: Enhanced Database Search (Keyword + Semantic) =====
    console.log('📊 Tier 1: Enhanced database search');
    const tier1Results = await performTier1Search(query, city, category, limit, prefs);
    searchTiers.push({ name: 'Tier 1: Database', results: tier1Results, resultCount: tier1Results.length });

    if (tier1Results.length >= 3) {
      console.log(`✅ Tier 1 sufficient: ${tier1Results.length} results`);
      return formatSuccessResponse(tier1Results, query, city, prefs, searchTiers, limit);
    }

    // ===== TIER 2: Adjacent/Similar Event Discovery =====
    console.log('🔄 Tier 2: Adjacent event discovery');
    const tier2Results = await performTier2AdjacentSearch(query, city, category, limit, prefs);
    searchTiers.push({ name: 'Tier 2: Adjacent', results: tier2Results, resultCount: tier2Results.length });

    const combinedT1T2 = deduplicateEvents([...tier1Results, ...tier2Results]);

    if (combinedT1T2.length >= 10) {
      console.log(`✅ Tier 2 sufficient: ${combinedT1T2.length} results`);
      return formatSuccessResponse(combinedT1T2, query, city, prefs, searchTiers, limit);
    }

    // ===== TIER 3: Real-Time LLM Web Search =====
    console.log('🌐 Tier 3: Real-time web search');
    const tier3Results = await performTier3WebSearch(query, city, category);
    searchTiers.push({ name: 'Tier 3: Web Search', results: tier3Results, resultCount: tier3Results.length });

    const combinedT1T2T3 = deduplicateEvents([...combinedT1T2, ...tier3Results]);

    if (combinedT1T2T3.length >= 5) {
      console.log(`✅ Tier 3 sufficient: ${combinedT1T2T3.length} results`);
      return formatSuccessResponse(combinedT1T2T3, query, city, prefs, searchTiers, limit);
    }

    // ===== TIER 4: External Event APIs =====
    console.log('🔌 Tier 4: External APIs');
    const tier4Results = await performTier4ExternalAPIs(query, city, category);
    searchTiers.push({ name: 'Tier 4: External APIs', results: tier4Results, resultCount: tier4Results.length });

    const combinedT1T2T3T4 = deduplicateEvents([...combinedT1T2T3, ...tier4Results]);

    if (combinedT1T2T3T4.length >= 5) {
      console.log(`✅ Tier 4 sufficient: ${combinedT1T2T3T4.length} results`);
      return formatSuccessResponse(combinedT1T2T3T4, query, city, prefs, searchTiers, limit);
    }

    // ===== TIER 5: Intelligent Recommendations =====
    console.log('💡 Tier 5: Intelligent recommendations');
    const tier5Results = await performTier5Recommendations(query, city, prefs, limit);
    searchTiers.push({ name: 'Tier 5: Recommendations', results: tier5Results, resultCount: tier5Results.length });

    const finalResults = deduplicateEvents([...combinedT1T2T3T4, ...tier5Results]);

    console.log(`✅ Final: ${finalResults.length} results across all tiers`);
    return formatSuccessResponse(finalResults, query, city, prefs, searchTiers, limit);

  } catch (error: any) {
    console.error('❌ Search error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Search failed',
        tiers: searchTiers,
      },
      { status: 500 }
    );
  }
}

// ===== TIER 1: Enhanced Database Search =====
async function performTier1Search(
  query: string,
  city: string,
  category: EventCategoryValue | null,
  limit: number,
  prefs: any
): Promise<any[]> {
  // Step 1: Keyword search with Typesense
  let typesenseResults: any = { hits: [] };
  try {
    const filter_by = category ? `city:=${city} && category:=${category}` : `city:=${city}`;
    typesenseResults = await typesenseClient
      .collections('events')
      .documents()
      .search({
        q: query || '*',
        query_by: 'title,description,venue_name,neighborhood,tags',
        filter_by,
        sort_by: 'start_time:asc',
        per_page: limit * 2, // Get more for fallback
      });
  } catch (error: any) {
    console.warn('   ⚠️ Typesense search failed, continuing with Prisma only:', error?.message || error);
  }

  const keywordEventIds = typesenseResults.hits?.map((hit: any) => hit.document.id) || [];

  // Step 2: Semantic search with Qdrant
  let semanticResults: Array<{ eventId: string; score: number }> = [];
  if (query.length > 0) {
    try {
      semanticResults = await searchEvents(query, city, limit * 2);
      console.log(`   🔮 Semantic search: ${semanticResults.length} results`);
    } catch (error) {
      console.warn('   ⚠️ Semantic search failed, continuing with keyword only');
    }
  }

  // Step 3: Combine and deduplicate
  const combinedEventIds = new Set([...keywordEventIds, ...semanticResults.map((r) => r.eventId)]);

  if (combinedEventIds.size === 0) {
    return [];
  }

  // Step 4: Fetch full event data
  const events = await prisma.event.findMany({
    where: { id: { in: Array.from(combinedEventIds) } },
    include: { venue: true },
  });

  // Step 5: Score with hybrid + personalization
  const scoredEvents = events.map((event) => {
    const keywordIndex = keywordEventIds.indexOf(event.id);
    const keywordScore = keywordIndex >= 0 ? 1 - keywordIndex / keywordEventIds.length : 0;

    const semanticMatch = semanticResults.find((r) => r.eventId === event.id);
    const semanticScore = semanticMatch ? semanticMatch.score : 0;

    let hybridScore = keywordScore * 0.6 + semanticScore * 0.4;
    const personalBoost = calculatePersonalizationBoost(event, prefs);
    hybridScore *= personalBoost;

    return { ...event, _score: hybridScore };
  });

  // Step 6: Rerank with BGE
  let finalResults = scoredEvents.sort((a, b) => b._score - a._score);

  if (query.length > 0 && finalResults.length > 0) {
    try {
      const topResults = finalResults.slice(0, Math.min(10, finalResults.length));
      const rerankedDocs = await rerank(
        query,
        topResults.map((event) => ({
          id: event.id,
          text: `${event.title} ${event.description || ''} ${event.venueName || ''}`,
        }))
      );

      const rerankedMap = new Map(rerankedDocs.map((doc) => [doc.id, doc.score]));
      finalResults = finalResults.map((event) => {
        const rerankedScore = rerankedMap.get(event.id);
        if (rerankedScore !== undefined) {
          return { ...event, _score: event._score * 0.7 + rerankedScore * 0.3 };
        }
        return event;
      });

      finalResults.sort((a, b) => b._score - a._score);
      console.log(`   🎯 Reranked top ${topResults.length} results`);
    } catch (error) {
      console.warn('   ⚠️ Reranking failed, using hybrid scores');
    }
  }

  return finalResults;
}

// ===== TIER 2: Adjacent/Similar Event Discovery =====
async function performTier2AdjacentSearch(
  query: string,
  city: string,
  category: EventCategoryValue | null,
  limit: number,
  prefs: any
): Promise<any[]> {
  const adjacentStrategies = [];

  // Strategy 1: Category hierarchy expansion
  if (category && CATEGORY_HIERARCHY[category]) {
    const relatedCategories = CATEGORY_HIERARCHY[category];
    console.log(`   📁 Expanding to related categories: ${relatedCategories.join(', ')}`);

    for (const relatedCat of relatedCategories.slice(0, 3)) {
      try {
        const results = await prisma.event.findMany({
          where: {
            city,
            category: relatedCat,
            startTime: { gte: new Date() },
          },
          include: { venue: true },
          take: 10,
          orderBy: { startTime: 'asc' },
        });
        adjacentStrategies.push(...results.map(e => ({ ...e, _score: 0.6, _source: 'category_expansion' })));
      } catch (error: any) {
        console.warn(`   ⚠️ Category expansion failed for ${relatedCat}:`, error?.message || error);
      }
    }
  }

  // Strategy 2: Query expansion
  const queryLower = query.toLowerCase();
  for (const [keyword, expansions] of Object.entries(QUERY_EXPANSIONS)) {
    if (queryLower.includes(keyword)) {
      console.log(`   🔍 Query expansion for "${keyword}": ${expansions.join(', ')}`);

      for (const expansion of expansions) {
        try {
          const results = await prisma.event.findMany({
            where: {
              city,
              OR: [
                { title: { contains: expansion, mode: 'insensitive' } },
                { description: { contains: expansion, mode: 'insensitive' } },
                { tags: { has: expansion } },
              ],
              startTime: { gte: new Date() },
            },
            include: { venue: true },
            take: 5,
            orderBy: { startTime: 'asc' },
          });
          adjacentStrategies.push(...results.map(e => ({ ...e, _score: 0.5, _source: 'query_expansion' })));
        } catch (error: any) {
          console.warn(`   ⚠️ Query expansion search failed for "${expansion}":`, error?.message || error);
        }
      }
      break; // Only expand first match
    }
  }

  // Strategy 3: Temporal flexibility - expand to "this week" if "tonight" had no results
  if (queryLower.includes('tonight') || queryLower.includes('today')) {
    console.log(`   📅 Temporal expansion: tonight → this week`);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    try {
      const results = await prisma.event.findMany({
        where: {
          city,
          startTime: { gte: new Date(), lte: nextWeek },
          ...(category ? { category } : {}),
        },
        include: { venue: true },
        take: 15,
        orderBy: { startTime: 'asc' },
      });
      adjacentStrategies.push(...results.map(e => ({ ...e, _score: 0.4, _source: 'temporal_expansion' })));
    } catch (error: any) {
      console.warn('   ⚠️ Temporal expansion failed:', error?.message || error);
    }
  }

  return deduplicateEvents(adjacentStrategies);
}

// ===== TIER 3: Real-Time LLM Web Search =====
async function performTier3WebSearch(
  query: string,
  city: string,
  category: EventCategoryValue | null
): Promise<any[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('   ⚠️ ANTHROPIC_API_KEY not set, skipping web search');
    return [];
  }

  try {
    // Call the isolated realtime search endpoint
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const response = await fetch(`${baseUrl}/api/search/realtime`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, city, category }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.warn(`   ⚠️ Real-time search failed: ${response.status} - ${errorData.error}`);
      return [];
    }

    const { events, count } = await response.json();
    console.log(`   🌐 Found ${count} events via web search for "${query}"`);

    // Add scoring metadata for consistent ranking
    return events.map((e: any) => ({
      ...e,
      _score: 0.7,
      _source: 'web_search'
    }));
  } catch (error: any) {
    console.error(`   ❌ Web search failed: ${error.message}`);
    return [];
  }
}

// ===== TIER 4: External Event APIs =====
async function performTier4ExternalAPIs(
  query: string,
  city: string,
  category: EventCategoryValue | null
): Promise<any[]> {
  try {
    const { searchExternalAPIs } = await import('@/lib/external-apis');

    const externalEvents = await searchExternalAPIs({
      query,
      city,
      category,
      limit: 15,
    });

    console.log(`   🔌 Found ${externalEvents.length} events from external APIs`);

    // Add scoring metadata
    return externalEvents.map((e: any) => ({
      ...e,
      _score: 0.6,
      _source: 'external_api',
    }));
  } catch (error: any) {
    console.error(`   ❌ External APIs failed: ${error.message}`);
    return [];
  }
}

// ===== TIER 5: Intelligent Recommendations =====
async function performTier5Recommendations(
  query: string,
  city: string,
  prefs: any,
  limit: number
): Promise<any[]> {
  console.log(`   💡 Showing personalized recommendations instead`);

  // Strategy: Show trending/popular events in user's preferred categories
  const preferredCategories = filterValidCategories(prefs.favoriteCategories);
  const categoriesToUse = preferredCategories.length > 0 ? preferredCategories : DEFAULT_RECOMMENDATION_CATEGORIES;

  const recommendations = await prisma.event.findMany({
    where: {
      city,
      ...(categoriesToUse.length ? { category: { in: categoriesToUse } } : {}),
      startTime: { gte: new Date() },
    },
    include: { venue: true },
    take: limit,
    orderBy: [
      { viewCount: 'desc' },
      { saveCount: 'desc' },
      { startTime: 'asc' },
    ],
  });

  return recommendations.map(e => ({ ...e, _score: 0.3, _source: 'recommendations' }));
}

// ===== UTILITIES =====
function deduplicateEvents(events: any[]): any[] {
  const seen = new Set<string>();
  return events.filter((event) => {
    const key =
      event.id ||
      event.sourceUrl ||
      event.bookingUrl ||
      `${event.title}-${event.startTime}`;

    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatSuccessResponse(
  results: any[],
  query: string,
  city: string,
  prefs: any,
  tiers: SearchTier[],
  limit: number
) {
  // Log search session
  logSearchSession(query, city, {}, results.length, prefs.userId).catch(console.error);

  return NextResponse.json({
    results: results.slice(0, limit).map(({ _score, _source, ...event }) => ({
      ...event,
      score: _score,
      source: _source || 'database',
    })),
    total: results.length,
    query,
    city,
    personalized: prefs.isLoggedIn,
    tiers: tiers.map(t => ({ name: t.name, count: t.resultCount })),
    message: results.length === 0 ?
      `No events found for "${query}" in ${city}. Try browsing all events or adjusting your search.` :
      null,
  });
}
