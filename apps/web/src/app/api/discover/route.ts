import { NextRequest, NextResponse } from 'next/server';
// import { generateResponse } from '@citypass/llm'; // Temporarily disabled
import { prisma } from '@citypass/db';

/**
 * Dynamic discovery endpoint - searches web for events on-demand
 * Example: "house music tonight in Brooklyn"
 */
export async function POST(req: NextRequest) {
  try {
    const { query, city } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Step 1: Parse query (LLM temporarily disabled - using simple parsing)
    // When Ollama models finish downloading, this will use Llama 3.1 for parsing
    const parsedQuery: any = {
      searchTerms: query.split(' ').filter((word: string) => word.length > 2),
      intent: query,
      category: null,
      neighborhood: null,
      timeframe: null,
    };

    // Simple keyword detection
    if (query.toLowerCase().includes('music')) parsedQuery.category = 'MUSIC';
    if (query.toLowerCase().includes('comedy')) parsedQuery.category = 'COMEDY';
    if (query.toLowerCase().includes('food')) parsedQuery.category = 'FOOD';
    if (query.toLowerCase().includes('tonight')) parsedQuery.timeframe = 'tonight';
    if (query.toLowerCase().includes('weekend')) parsedQuery.timeframe = 'this weekend';

    // Step 2: Generate search URLs to crawl
    const searchUrls = generateSearchUrls(parsedQuery, city || 'New York');

    // Step 3: Log discovery attempt
    const discoveryLogs = [];
    for (const url of searchUrls.slice(0, 3)) {
      // Limit to 3 URLs
      const log = await prisma.discoveryLog.create({
        data: {
          city: city || 'New York',
          query,
          engine: 'google', // Would use SerpAPI in production
          url,
          score: null,
          accepted: false,
          eventsFound: 0,
        },
      });
      discoveryLogs.push(log);
    }

    // Step 4: Simulate web search results (in production, use SerpAPI + Firecrawl)
    const mockResults = {
      message: 'Dynamic discovery initiated',
      query: parsedQuery,
      searchUrls: searchUrls.slice(0, 3),
      status: 'queued',
      note: 'In production, this would trigger Firecrawl to scrape these URLs and extract events',
      discoveryLogIds: discoveryLogs.map((log) => log.id),
    };

    // Step 5: Return discovery intent
    return NextResponse.json(mockResults);
  } catch (error: any) {
    console.error('Discovery error:', error);
    return NextResponse.json(
      { error: error.message || 'Discovery failed' },
      { status: 500 }
    );
  }
}

/**
 * Generate search URLs based on parsed query
 */
function generateSearchUrls(parsedQuery: any, city: string): string[] {
  const urls: string[] = [];
  const searchTerms = parsedQuery.searchTerms?.join(' ') || '';
  const category = parsedQuery.category?.toLowerCase() || 'events';
  const neighborhood = parsedQuery.neighborhood || '';
  const timeframe = parsedQuery.timeframe || '';

  // Event aggregator sites
  const aggregators = [
    `timeout.com/${city.toLowerCase().replace(' ', '-')}`,
    'eventbrite.com',
    'meetup.com',
    'dice.fm',
    'residentadvisor.net',
  ];

  // Generate search queries
  for (const site of aggregators) {
    let siteQuery = `site:${site} ${searchTerms} ${city}`;
    if (neighborhood) siteQuery += ` ${neighborhood}`;
    if (timeframe) siteQuery += ` ${timeframe}`;

    urls.push(`https://www.google.com/search?q=${encodeURIComponent(siteQuery)}`);
  }

  // Add venue-specific searches if category is known
  if (parsedQuery.category === 'MUSIC') {
    urls.push(
      `https://www.google.com/search?q=site:residentadvisor.net+${searchTerms}+${city}`
    );
  } else if (parsedQuery.category === 'COMEDY') {
    urls.push(
      `https://www.google.com/search?q=site:comedycellar.com+${timeframe}`
    );
  }

  return urls;
}

/**
 * Get status of discovery job
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const logId = searchParams.get('logId');

    if (!logId) {
      return NextResponse.json({ error: 'logId is required' }, { status: 400 });
    }

    const log = await prisma.discoveryLog.findUnique({
      where: { id: logId },
    });

    if (!log) {
      return NextResponse.json({ error: 'Discovery log not found' }, { status: 404 });
    }

    return NextResponse.json({
      status: log.accepted ? 'completed' : 'pending',
      eventsFound: log.eventsFound,
      url: log.url,
      error: log.errorMessage,
    });
  } catch (error: any) {
    console.error('Discovery status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get discovery status' },
      { status: 500 }
    );
  }
}
