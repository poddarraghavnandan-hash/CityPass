import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@citypass/db';

/**
 * Real-Time Web Search Endpoint
 * Uses Claude to search the web for current events matching a query
 */
export async function POST(req: NextRequest) {
  try {
    const { query, city, category } = await req.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const searchPrompt = `Find current events in ${city} matching the query: "${query}"${category ? ` in the ${category} category` : ''}.

Search the web for real events happening soon. Return a JSON array of events with this structure:
[
  {
    "title": "Event name",
    "description": "Brief description",
    "startTime": "ISO 8601 datetime",
    "endTime": "ISO 8601 datetime or null",
    "venueName": "Venue name",
    "address": "Full address",
    "city": "${city}",
    "priceMin": 0,
    "priceMax": 100,
    "category": "MUSIC|COMEDY|ARTS|FOOD_DRINK|THEATRE|SPORTS|FITNESS|NETWORKING|FAMILY|NIGHTLIFE|MARKETS|EDUCATION|WELLNESS",
    "ticketUrl": "URL to tickets",
    "sourceUrl": "Original source URL"
  }
]

Return only valid, real events with complete information. Maximum 5 events.`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      messages: [{ role: 'user', content: searchPrompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      return NextResponse.json({ events: [] });
    }

    // Extract JSON from response
    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ events: [] });
    }

    const webEvents = JSON.parse(jsonMatch[0]);
    console.log(`🌐 Found ${webEvents.length} events via web search for "${query}"`);

    // Save events to database
    const savedEvents = [];
    for (const webEvent of webEvents) {
      try {
        const event = await prisma.event.create({
          data: {
            ...webEvent,
            startTime: new Date(webEvent.startTime),
            endTime: webEvent.endTime ? new Date(webEvent.endTime) : null,
          },
          include: { venue: true },
        });
        savedEvents.push(event);
      } catch (error: any) {
        console.warn(`Failed to save web event: ${error.message}`);
        // Return the event even if not saved to DB
        savedEvents.push(webEvent);
      }
    }

    return NextResponse.json({
      events: savedEvents,
      count: savedEvents.length,
      query,
      city,
    });
  } catch (error: any) {
    console.error('Real-time search error:', error);
    return NextResponse.json(
      { error: error.message || 'Real-time search failed', events: [] },
      { status: 500 }
    );
  }
}
