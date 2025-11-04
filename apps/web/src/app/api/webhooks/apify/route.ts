import { NextRequest, NextResponse } from 'next/server';
import { ApifyWebhookSchema } from '@citypass/types';
import { ApifyClient } from 'apify-client';

const apifyClient = new ApifyClient({
  token: process.env.APIFY_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('📨 Apify webhook received');

    const payload = ApifyWebhookSchema.parse(body);

    if (payload.eventType !== 'ACTOR.RUN.SUCCEEDED') {
      console.log(`⏭️  Skipping event type: ${payload.eventType}`);
      return NextResponse.json({ success: true });
    }

    const runId = payload.eventData.actorRunId;
    const datasetId = payload.resource.defaultDatasetId;

    if (!datasetId) {
      console.log('❌ No dataset in webhook');
      return NextResponse.json({ error: 'No dataset' }, { status: 400 });
    }

    // Fetch dataset items
    const dataset = await apifyClient.dataset(datasetId);
    const { items } = await dataset.listItems();

    console.log(`📦 Fetched ${items.length} items from Apify dataset`);

    // Process each item
    let totalEvents = 0;
    for (const item of items) {
      const url = item.url || item.pageUrl;
      const html = item.html || item.content;

      if (!url || !html) continue;

      // Forward to ingestion
      const ingestUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/ingest`;
      const response = await fetch(ingestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, html }),
      });

      if (response.ok) {
        const result = await response.json();
        totalEvents += result.eventsCreated || 0;
      }
    }

    console.log(`✅ Ingested ${totalEvents} events from Apify run ${runId}`);

    return NextResponse.json({ success: true, eventsCreated: totalEvents });
  } catch (error: any) {
    console.error('Apify webhook error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
