import { CrawlState } from '@citypass/types';
import { EventSchema } from '@citypass/types';

/**
 * Validate extracted events
 */
export async function validateEvents(state: CrawlState): Promise<Partial<CrawlState>> {
  console.log(`✅ Validating ${state.extractedEvents.length} events`);

  const validEvents = state.extractedEvents.filter((event) => {
    try {
      EventSchema.parse(event);
      return true;
    } catch (err) {
      console.error('❌ Invalid event:', err);
      return false;
    }
  });

  console.log(`✅ ${validEvents.length} valid events`);

  return {
    extractedEvents: validEvents,
  };
}
