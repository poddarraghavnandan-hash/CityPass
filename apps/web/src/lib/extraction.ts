import Anthropic from '@anthropic-ai/sdk';
import { EventSchema, type EventData } from '@citypass/types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const EXTRACTION_TOOL = {
  name: 'extract_events',
  description: 'Extract structured event data from HTML or text content',
  input_schema: {
    type: 'object',
    properties: {
      events: {
        type: 'array',
        description: 'List of events found in the content',
        items: {
          type: 'object',
          required: ['source_url', 'title', 'city', 'start_time'],
          properties: {
            source_url: { type: 'string', description: 'URL of the event page' },
            title: { type: 'string', description: 'Event title' },
            subtitle: { type: 'string', description: 'Event subtitle or tagline' },
            description: { type: 'string', description: 'Event description' },
            category: {
              type: 'string',
              enum: ['music', 'comedy', 'theatre', 'fitness', 'dance', 'arts', 'food', 'networking', 'family', 'other'],
              description: 'Event category',
            },
            organizer: { type: 'string', description: 'Event organizer or host' },
            venue_name: { type: 'string', description: 'Venue name' },
            address: { type: 'string', description: 'Full address' },
            neighborhood: { type: 'string', description: 'Neighborhood or area' },
            city: { type: 'string', description: 'City name' },
            lat: { type: 'number', description: 'Latitude' },
            lon: { type: 'number', description: 'Longitude' },
            start_time: { type: 'string', description: 'Start time in ISO 8601 format' },
            end_time: { type: 'string', description: 'End time in ISO 8601 format' },
            timezone: { type: 'string', description: 'Timezone (e.g., America/New_York)' },
            price_min: { type: 'number', description: 'Minimum price' },
            price_max: { type: 'number', description: 'Maximum price' },
            currency: { type: 'string', description: 'Currency code (e.g., USD)' },
            min_age: { type: 'integer', description: 'Minimum age requirement' },
            tags: { type: 'array', items: { type: 'string' }, description: 'Event tags' },
            image_url: { type: 'string', description: 'Event image URL' },
            booking_url: { type: 'string', description: 'Booking/ticket URL' },
            accessibility: { type: 'array', items: { type: 'string' }, description: 'Accessibility features' },
          },
        },
      },
    },
    required: ['events'],
  },
};

export async function extractEventsFromContent(
  content: string,
  sourceUrl: string,
  city: string = 'New York'
): Promise<EventData[]> {
  console.log(`🤖 Extracting events from ${sourceUrl}...`);

  const prompt = `Extract all event information from the following content. The source URL is ${sourceUrl} and the city is ${city}.

Look for:
- Event titles, dates, and times
- Venue names and addresses
- Prices and age restrictions
- Categories (music, comedy, theatre, etc.)
- Images and booking links

Use the extract_events tool to return structured data. If dates are relative (e.g., "Tonight", "This Saturday"), convert them to absolute ISO 8601 timestamps. Assume timezone is America/New_York unless specified otherwise.

Content:
${content.substring(0, 15000)}`; // Limit to avoid token limits

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      tools: [EXTRACTION_TOOL],
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Find tool use in response
    const toolUse = response.content.find((block) => block.type === 'tool_use');

    if (!toolUse || toolUse.type !== 'tool_use') {
      console.log('❌ No tool use in response');
      return [];
    }

    const { events } = toolUse.input as { events: any[] };

    // Validate and normalize each event
    const validEvents: EventData[] = [];
    for (const event of events) {
      try {
        // Ensure required fields
        const normalized = {
          ...event,
          source_url: event.source_url || sourceUrl,
          city: event.city || city,
          tags: event.tags || [],
          accessibility: event.accessibility || [],
        };

        const validated = EventSchema.parse(normalized);
        validEvents.push(validated);
      } catch (err) {
        console.error('❌ Event validation failed:', err);
        console.error('Event data:', event);
      }
    }

    console.log(`✅ Extracted ${validEvents.length} valid events`);
    return validEvents;
  } catch (error) {
    console.error('❌ Extraction failed:', error);
    throw error;
  }
}
