import { CrawlState, EventData } from '@citypass/types';
import { extractEventEnhanced, type ExtractedEvent } from '@citypass/llm';

/**
 * Extract events from raw pages using enhanced multi-provider LLM
 * Now calls the LLM package directly (no circular dependency)
 * Supports: Llama (local) → Anthropic/OpenAI (cloud)
 */
export async function extractEvents(state: CrawlState): Promise<Partial<CrawlState>> {
  console.log(`🤖 Extracting events from ${state.rawPages.length} pages using enhanced extraction`);

  const allEvents: EventData[] = [];

  for (const page of state.rawPages) {
    try {
      console.log(`🔍 Extracting from ${page.url}...`);

      // Use enhanced extraction with automatic tier escalation
      const result = await extractEventEnhanced(
        page.html || page.markdown || '',
        page.url,
        {
          startTier: 'local', // Start with free Llama
          confidenceThreshold: 0.7,
          skipCache: false,
        }
      );

      // Convert to EventData format
      const eventData: EventData = {
        source_url: page.url,
        title: result.data.title,
        subtitle: result.data.subtitle,
        description: result.data.description,
        start_time: result.data.startTime,
        end_time: result.data.endTime,
        venue_name: result.data.venueName,
        address: result.data.address,
        neighborhood: result.data.neighborhood,
        city: result.data.city || state.city,
        category: result.data.category as any,
        price_min: result.data.priceMin,
        price_max: result.data.priceMax,
        currency: result.data.currency || 'USD',
        tags: result.data.tags,
        image_url: result.data.imageUrl,
        booking_url: result.data.bookingUrl,
        organizer: result.data.organizer,
        contact_info: result.data.contactInfo,
        age_restriction: result.data.ageRestriction,
        capacity: result.data.capacity,
        accessibility: result.data.accessibility,
      };

      allEvents.push(eventData);

      console.log(`✅ Extracted "${eventData.title}" (confidence: ${result.confidence.toFixed(2)}, tier: ${result.tier}, cost: $${result.cost?.toFixed(4) || 0})`);

    } catch (error: any) {
      console.error(`❌ Extraction failed for ${page.url}:`, error.message);
      state.errors.push({
        step: 'extract',
        message: error.message,
        url: page.url,
      });
    }
  }

  console.log(`🎉 Extracted ${allEvents.length} events total`);

  return {
    extractedEvents: allEvents,
  };
}
