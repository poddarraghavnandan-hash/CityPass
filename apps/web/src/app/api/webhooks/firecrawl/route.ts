import { NextRequest, NextResponse } from 'next/server';
import { FirecrawlWebhookSchema } from '@citypass/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('📨 Firecrawl webhook received');

    // Validate payload
    const payload = FirecrawlWebhookSchema.parse(body);

    if (!payload.success) {
      console.log('❌ Firecrawl job failed');
      return NextResponse.json({ error: 'Crawl failed' }, { status: 400 });
    }

    const { data } = payload;
    const url = data.metadata.url;
    const content = data.markdown || data.html;

    if (!content) {
      console.log('❌ No content in webhook');
      return NextResponse.json({ error: 'No content' }, { status: 400 });
    }

    // Forward to ingestion pipeline
    const ingestUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/ingest`;
    const response = await fetch(ingestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        html: data.html,
        markdown: data.markdown,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ingest failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`✅ Ingested ${result.eventsCreated} events from ${url}`);

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('Firecrawl webhook error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
