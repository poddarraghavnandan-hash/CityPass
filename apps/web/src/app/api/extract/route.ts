import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { EventSchema } from '@citypass/types';

const EXTRACTION_TOOL = {
  name: 'extract_events',
  description: 'Extract structured event data from HTML or text content',
  input_schema: {
    type: 'object' as const,
    properties: {
      events: {
        type: 'array' as const,
        description: 'List of events found in the content',
        items: {
          type: 'object' as const,
          required: ['source_url', 'title', 'city', 'start_time'],
          properties: {
            source_url: { type: 'string' as const, description: 'URL of the event page' },
            title: { type: 'string' as const, description: 'Event title' },
            subtitle: { type: 'string' as const, description: 'Event subtitle or tagline' },
            description: { type: 'string' as const, description: 'Event description' },
            category: {
              type: 'string' as const,
              enum: ['music', 'comedy', 'theatre', 'fitness', 'dance', 'arts', 'food', 'networking', 'family', 'other'] as const,
              description: 'Event category',
            },
            organizer: { type: 'string' as const, description: 'Event organizer or host' },
            venue_name: { type: 'string' as const, description: 'Venue name' },
            address: { type: 'string' as const, description: 'Full address' },
            city: { type: 'string' as const, description: 'City' },
            state: { type: 'string' as const, description: 'State/Province' },
            country: { type: 'string' as const, description: 'Country' },
            latitude: { type: 'number' as const, description: 'Latitude coordinate' },
            longitude: { type: 'number' as const, description: 'Longitude coordinate' },
            start_time: { type: 'string' as const, description: 'Start time (ISO 8601)' },
            end_time: { type: 'string' as const, description: 'End time (ISO 8601)' },
            price_min: { type: 'number' as const, description: 'Minimum price' },
            price_max: { type: 'number' as const, description: 'Maximum price' },
            ticket_url: { type: 'string' as const, description: 'Ticket purchase URL' },
            image_url: { type: 'string' as const, description: 'Event image URL' },
            tags: {
              type: 'array' as const,
              items: { type: 'string' as const },
              description: 'Event tags/keywords',
            },
          },
        },
      },
    },
  },
};

/**
 * Extract Event Data Endpoint
 * Uses Claude to extract structured event information from web content
 */
export async function POST(req: NextRequest) {
  try {
    const { content, sourceUrl, sourceName } = await req.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const prompt = `Extract all events from this content.
Source: ${sourceName || sourceUrl}

Content:
${content.substring(0, 15000)}`; // Limit to avoid token limits

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
    const toolUse = response.content.find((block: any) => block.type === 'tool_use') as any;

    if (!toolUse || toolUse.name !== 'extract_events') {
      console.log('❌ No events extracted');
      return NextResponse.json({ events: [] });
    }

    const extractedEvents = toolUse.input.events || [];
    console.log(`✅ Extracted ${extractedEvents.length} events from ${sourceUrl}`);

    // Validate events with Zod
    const validEvents = [];
    for (const event of extractedEvents) {
      try {
        // Convert to EventData format
        const eventData = {
          sourceUrl: event.source_url,
          title: event.title,
          subtitle: event.subtitle,
          description: event.description,
          category: event.category?.toUpperCase(),
          organizer: event.organizer,
          venueName: event.venue_name,
          address: event.address,
          city: event.city,
          state: event.state,
          country: event.country || 'USA',
          latitude: event.latitude,
          longitude: event.longitude,
          startTime: event.start_time,
          endTime: event.end_time,
          priceMin: event.price_min,
          priceMax: event.price_max,
          ticketUrl: event.ticket_url,
          imageUrl: event.image_url,
          tags: event.tags || [],
        };

        // Validate
        const validated = EventSchema.parse(eventData);
        validEvents.push(validated);
      } catch (error: any) {
        console.warn(`⚠️ Invalid event data: ${error.message}`);
      }
    }

    return NextResponse.json({
      events: validEvents,
      count: validEvents.length,
      sourceUrl,
    });
  } catch (error: any) {
    console.error('Event extraction error:', error);
    return NextResponse.json(
      { error: error.message || 'Extraction failed', events: [] },
      { status: 500 }
    );
  }
}
