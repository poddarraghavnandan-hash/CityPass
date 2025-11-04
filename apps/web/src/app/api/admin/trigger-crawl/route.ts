import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const TriggerCrawlSchema = z.object({
  sourceId: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sourceId } = TriggerCrawlSchema.parse(body);

    // In production, this would trigger the worker
    // For now, we'll just return success
    console.log(`🚀 Triggering crawl for source: ${sourceId}`);

    // TODO: Trigger worker via queue or direct call
    // await processSource(sourceId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Trigger crawl error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
