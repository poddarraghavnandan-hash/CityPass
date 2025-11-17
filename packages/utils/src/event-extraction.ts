/**
 * Event Extraction using OpenAI
 * Extracts structured event data from web content
 */

import OpenAI from 'openai';
import type { EventCategory } from '@citypass/types';

/**
 * Get OpenAI client with lazy initialization
 */
function getOpenAIClient(apiKey?: string) {
  return new OpenAI({
    apiKey: apiKey || process.env.OPENAI_API_KEY,
  });
}

export interface ExtractedEvent {
  title: string;
  description: string;
  startTime: string; // ISO 8601
  endTime?: string;
  venueName?: string;
  address?: string;
  neighborhood?: string;
  city: string;
  priceMin?: number;
  priceMax?: number;
  category?: EventCategory;
  imageUrl?: string;
  bookingUrl?: string;
  organizer?: string;
}

export interface EventExtractionResult {
  events: ExtractedEvent[];
  confidence: number;
  rawResponse?: string;
}

const EXTRACTION_PROMPT = `You are an expert at extracting structured event information from web content.

Extract ALL events from the provided text. For each event, return a JSON object with these fields:

{
  "title": "Event name",
  "description": "Brief description (1-2 sentences)",
  "startTime": "ISO 8601 datetime (e.g., 2025-01-20T19:00:00-05:00)",
  "endTime": "ISO 8601 datetime (optional)",
  "venueName": "Venue name",
  "address": "Street address",
  "neighborhood": "Neighborhood/district",
  "city": "City name",
  "priceMin": 0,
  "priceMax": 50,
  "category": "MUSIC|COMEDY|FOOD|ARTS|THEATRE|DANCE|SPORTS|FAMILY|NETWORKING|OTHER",
  "imageUrl": "Image URL (if available)",
  "bookingUrl": "Ticket/registration URL",
  "organizer": "Event organizer"
}

Rules:
1. Only extract FUTURE events (not past)
2. Infer category from content (music concert = MUSIC, stand-up = COMEDY, etc.)
3. Parse dates/times carefully - convert to ISO 8601 with timezone
4. If price is "free", set priceMin: 0, priceMax: 0
5. Return ONLY valid JSON array: [{"title": "...", ...}, ...]
6. If no events found, return: []

Return a JSON array of events.`;

/**
 * Extract events from HTML/text content using OpenAI
 */
export async function extractEventsWithOpenAI(
  content: string,
  options: {
    city?: string;
    sourceUrl?: string;
    maxEvents?: number;
    apiKey?: string;
  } = {}
): Promise<EventExtractionResult> {
  const { city = 'New York', sourceUrl, maxEvents = 50, apiKey } = options;

  try {
    // Truncate content if too long (OpenAI has token limits)
    const truncatedContent = content.slice(0, 50000);

    const openai = getOpenAIClient(apiKey);
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Fast and cheap for extraction
      messages: [
        {
          role: 'system',
          content: EXTRACTION_PROMPT,
        },
        {
          role: 'user',
          content: `Extract events from this content (city: ${city}, source: ${sourceUrl || 'unknown'}):\n\n${truncatedContent}`,
        },
      ],
      temperature: 0.1, // Low temperature for consistent extraction
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    });

    const result = response.choices[0]?.message?.content;
    if (!result) {
      return { events: [], confidence: 0 };
    }

    // Parse JSON response
    let parsed: any;
    try {
      parsed = JSON.parse(result);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', result);
      return { events: [], confidence: 0, rawResponse: result };
    }

    // Handle both array and object with events array
    let events: ExtractedEvent[] = [];
    if (Array.isArray(parsed)) {
      events = parsed;
    } else if (parsed.events && Array.isArray(parsed.events)) {
      events = parsed.events;
    } else {
      console.warn('Unexpected OpenAI response format:', parsed);
      return { events: [], confidence: 0, rawResponse: result };
    }

    // Validate and filter events
    const validEvents = events
      .filter(validateEvent)
      .slice(0, maxEvents)
      .map(event => ({
        ...event,
        city: event.city || city,
      }));

    const confidence = validEvents.length > 0 ? 0.8 : 0;

    return {
      events: validEvents,
      confidence,
      rawResponse: result,
    };
  } catch (error: any) {
    console.error('OpenAI event extraction error:', error.message);
    return { events: [], confidence: 0 };
  }
}

/**
 * Validate extracted event data
 */
function validateEvent(event: any): event is ExtractedEvent {
  if (!event.title || typeof event.title !== 'string') return false;
  if (!event.city || typeof event.city !== 'string') return false;
  if (!event.startTime || typeof event.startTime !== 'string') return false;

  // Try to parse date
  try {
    const date = new Date(event.startTime);
    if (isNaN(date.getTime())) return false;
    // Only future events
    if (date < new Date()) return false;
  } catch {
    return false;
  }

  return true;
}

/**
 * Extract events from a URL using Firecrawl + OpenAI
 */
export async function extractEventsFromUrl(
  url: string,
  options: {
    city?: string;
    maxEvents?: number;
    openaiApiKey?: string;
    firecrawlApiKey?: string;
  } = {}
): Promise<EventExtractionResult> {
  const firecrawlApiKey = options.firecrawlApiKey || process.env.FIRECRAWL_API_KEY;
  if (!firecrawlApiKey) {
    throw new Error('FIRECRAWL_API_KEY not configured');
  }

  try {
    // Scrape the URL with Firecrawl
    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${firecrawlApiKey}`,
      },
      body: JSON.stringify({
        url,
        formats: ['markdown', 'html'],
      }),
    });

    if (!scrapeResponse.ok) {
      throw new Error(`Firecrawl error: ${scrapeResponse.status}`);
    }

    const scrapeData = await scrapeResponse.json() as {
      data?: {
        markdown?: string;
        html?: string;
      };
    };
    const content = scrapeData.data?.markdown || scrapeData.data?.html || '';

    if (!content) {
      return { events: [], confidence: 0 };
    }

    // Extract events using OpenAI
    return extractEventsWithOpenAI(content, {
      ...options,
      sourceUrl: url,
      apiKey: options.openaiApiKey,
    });
  } catch (error: any) {
    console.error('Event extraction from URL error:', error.message);
    return { events: [], confidence: 0 };
  }
}

/**
 * Estimate cost for event extraction
 */
export function estimateExtractionCost(contentLength: number): {
  estimatedTokens: number;
  estimatedCostUSD: number;
} {
  // GPT-4o-mini pricing: $0.150 per 1M input tokens, $0.600 per 1M output tokens
  const inputTokens = Math.ceil(contentLength / 4); // ~4 chars per token
  const outputTokens = 1000; // Estimated response size

  const inputCost = (inputTokens / 1_000_000) * 0.15;
  const outputCost = (outputTokens / 1_000_000) * 0.6;

  return {
    estimatedTokens: inputTokens + outputTokens,
    estimatedCostUSD: inputCost + outputCost,
  };
}
