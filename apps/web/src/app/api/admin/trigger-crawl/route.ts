import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { processSource, processAllSources } from '@/lib/event-crawler';

const TriggerCrawlSchema = z.object({
  sourceId: z.string().optional(),
  all: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sourceId, all } = TriggerCrawlSchema.parse(body);

    if (all) {
      // Process all active sources
      console.log('🚀 Triggering crawl for ALL active sources');
      const result = await processAllSources();

      return NextResponse.json({
        success: true,
        ...result,
      });
    } else if (sourceId) {
      // Process specific source
      console.log(`🚀 Triggering crawl for source: ${sourceId}`);
      const result = await processSource(sourceId);

      return NextResponse.json({
        success: result.success,
        eventsCreated: result.eventsCreated,
        errors: result.errors,
      });
    } else {
      return NextResponse.json(
        { error: 'Either sourceId or all=true must be provided' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Trigger crawl error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
