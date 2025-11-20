import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * Manual Scrape API
 * Trigger event scraping on-demand via POST request
 *
 * Note: Full scraper implementation requires worker package integration.
 * For now, this endpoint is a placeholder.
 */

const ScrapeRequestSchema = z.object({
  cities: z.array(z.string()).optional(),
  category: z.string().optional(),
  daysAhead: z.number().min(1).max(30).optional(),
  maxEventsPerSource: z.number().min(10).max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Verify API key
    const authHeader = req.headers.get('authorization');
    const apiKey = process.env.SCRAPER_API_KEY || process.env.CRON_SECRET;

    if (authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawBody = await req.json();
    const body = ScrapeRequestSchema.parse(rawBody);

    console.log('[ScrapeAPI] Manual scrape triggered with params:', body);

    // TODO: Integrate worker scraper once monorepo structure is set up
    // For now, return success without doing anything
    // The LLM event discovery in chat API will handle new events on-demand

    return NextResponse.json({
      success: true,
      message: 'Scraper placeholder - using LLM event discovery instead',
      note: 'Full scraper integration pending',
      params: body,
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
