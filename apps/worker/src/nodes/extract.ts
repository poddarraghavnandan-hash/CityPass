import { CrawlState, EventData } from '@citypass/types';

/**
 * Extract events from raw pages using LLM
 * This calls the extraction service (which uses Anthropic)
 */
export async function extractEvents(state: CrawlState): Promise<Partial<CrawlState>> {
  console.log(`🤖 Extracting events from ${state.rawPages.length} pages`);

  const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const allEvents: EventData[] = [];

  for (const page of state.rawPages) {
    try {
      console.log(`📡 Calling ${API_URL}/api/ingest for ${page.url}`);

      const response = await fetch(`${API_URL}/api/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceId: state.sourceId,
          url: page.url,
          html: page.html,
          markdown: page.markdown,
          city: state.city,
        }),
      });

      if (response.ok) {
        const result = await response.json() as any;
        console.log(`✅ Extracted from ${page.url}: ${result.eventsCreated} created, ${result.eventsUpdated} updated`);
      } else {
        const errorText = await response.text();
        console.error(`❌ Extraction API error (${response.status}): ${errorText}`);
      }
    } catch (error: any) {
      console.error(`❌ Extraction failed for ${page.url}:`, error.message);
    }
  }

  return {
    extractedEvents: allEvents,
  };
}
