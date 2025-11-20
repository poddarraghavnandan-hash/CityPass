import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * Manual Scrape API
 * Trigger event scraping on-demand via POST request
 */

const ScrapeRequestSchema = z.object({
  cities: z.array(z.string()).optional(),
  category: z.string().optional(),
  daysAhead: z.number().min(1).max(30).optional(),
  maxEventsPerSource: z.number().min(10).max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Verify API key (you can use CRON_SECRET or create a separate API_SECRET)
    const authHeader = req.headers.get('authorization');
    const apiKey = process.env.SCRAPER_API_KEY || process.env.CRON_SECRET;

    if (authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawBody = await req.json();
    const body = ScrapeRequestSchema.parse(rawBody);

    console.log('[ScrapeAPI] Manual scrape triggered with params:', body);

    // Import the worker scraper
    const { runScraperCycle } = await import('../../../worker/src/scrape/schedule');

    // Run scraper with custom params
    const result = await runScraperCycle({
      cities: body.cities || ['New York'],
      daysAhead: body.daysAhead || 14,
      maxEventsPerSource: body.maxEventsPerSource || 100,
      categoryFilter: body.category,
    });

    console.log(`[ScrapeAPI] Scraper completed: ${result.totalEventsScraped} events`);

    return NextResponse.json({
      success: true,
      totalEventsScraped: result.totalEventsScraped,
      eventsByCity: result.eventsByCity,
      params: {
        cities: body.cities || ['New York'],
        daysAhead: body.daysAhead || 14,
        maxEventsPerSource: body.maxEventsPerSource || 100,
        category: body.category || 'all',
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          details: error.flatten(),
        },
        { status: 400 }
      );
    }

    console.error('[ScrapeAPI] Scraper error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Scraper failed',
      },
      { status: 500 }
    );
  }
}
