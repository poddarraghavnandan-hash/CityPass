import { NextResponse } from 'next/server';

/**
 * Vercel Cron Job: Scrape events from external sources
 * Runs every 6 hours to keep event database fresh
 */

export async function GET(request: Request) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[Cron] Starting event scraper...');

    // Import the worker scraper
    const { runScraperCycle } = await import('../../../../worker/src/scrape/schedule');

    // Run scraper for all configured cities
    const result = await runScraperCycle({
      cities: ['New York', 'Los Angeles', 'San Francisco', 'Chicago'],
      daysAhead: 14,
      maxEventsPerSource: 100,
    });

    console.log(`[Cron] Scraper completed: ${result.totalEventsScraped} events`);

    return NextResponse.json({
      success: true,
      totalEventsScraped: result.totalEventsScraped,
      eventsByCity: result.eventsByCity,
      message: `Successfully scraped ${result.totalEventsScraped} events`,
    });
  } catch (error: any) {
    console.error('[Cron] Scraper error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Scraper failed',
      },
      { status: 500 }
    );
  }
}
