/**
 * Event Extraction using OpenAI
 * Extracts structured event data from web content
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { Ollama } from 'ollama';
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
  "category": "MUSIC|COMEDY|FOOD|ARTS|THEATRE|DANCE|FITNESS|FAMILY|NETWORKING|OTHER",
  "imageUrl": "Image URL (if available)",
  "bookingUrl": "Ticket/registration URL",
  "organizer": "Event organizer"
}

Rules:
1. Only extract FUTURE events (not past)
2. Infer category from content - MUST use EXACTLY one of these categories:
   - MUSIC: concerts, music performances, DJ sets
   - COMEDY: stand-up, improv shows
   - THEATRE: plays, musicals, performances
   - DANCE: dance performances, dance parties
   - ARTS: art exhibits, painting classes, creative workshops
   - FITNESS: workouts, yoga, sports, climbing, running
   - FOOD: food festivals, cooking classes, tastings
   - NETWORKING: professional meetups, mixers
   - FAMILY: kid-friendly events
   - OTHER: everything else
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
 * Extract events using Anthropic Claude (fallback option)
 */
export async function extractEventsWithClaude(
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
    const anthropic = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });

    const truncatedContent = content.slice(0, 50000);

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022', // Fast and cheap
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: `${EXTRACTION_PROMPT}\n\nExtract events from this content (city: ${city}, source: ${sourceUrl || 'unknown'}):\n\n${truncatedContent}`,
        },
      ],
    });

    const result = response.content[0]?.type === 'text' ? response.content[0].text : '';
    if (!result) {
      return { events: [], confidence: 0 };
    }

    // Parse JSON response
    let parsed: any;
    try {
      parsed = JSON.parse(result);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', result);
      return { events: [], confidence: 0, rawResponse: result };
    }

    // Handle both array and object with events array
    let events: ExtractedEvent[] = [];
    if (Array.isArray(parsed)) {
      events = parsed;
    } else if (parsed.events && Array.isArray(parsed.events)) {
      events = parsed.events;
    } else {
      console.warn('Unexpected Claude response format:', parsed);
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

    const confidence = validEvents.length > 0 ? 0.75 : 0;

    return {
      events: validEvents,
      confidence,
      rawResponse: result,
    };
  } catch (error: any) {
    console.error('Claude event extraction error:', error.message);
    return { events: [], confidence: 0 };
  }
}

/**
 * Extract events using Ollama (free, local/remote LLM)
 */
export async function extractEventsWithOllama(
  content: string,
  options: {
    city?: string;
    sourceUrl?: string;
    maxEvents?: number;
    model?: string;
    host?: string;
    apiKey?: string;
  } = {}
): Promise<EventExtractionResult> {
  const {
    city = 'New York',
    sourceUrl,
    maxEvents = 50,
    model = 'gpt-oss:20b', // Using cloud-available model
    host = process.env.OLLAMA_HOST || 'http://localhost:11434',
    apiKey = process.env.OLLAMA_API_KEY
  } = options;

  try {
    // Configure Ollama client with host and API key for cloud
    const ollamaConfig: any = { host };
    if (apiKey) {
      ollamaConfig.headers = {
        'Authorization': `Bearer ${apiKey}`
      };
    }
    const ollama = new Ollama(ollamaConfig);

    // For cloud API, use larger content size; for local, keep it small
    const truncatedContent = apiKey ? content.slice(0, 50000) : content.slice(0, 15000);

    const response = await ollama.chat({
      model,
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
      format: 'json',
      options: {
        temperature: 0.1,
      },
    });

    const result = response.message.content;
    if (!result) {
      return { events: [], confidence: 0 };
    }

    // Parse JSON response - strip markdown code blocks if present
    let parsed: any;
    try {
      // Remove markdown code blocks (```json ... ``` or ``` ... ```)
      let cleanedResult = result.trim();
      if (cleanedResult.startsWith('```')) {
        cleanedResult = cleanedResult
          .replace(/^```(?:json)?\s*\n/i, '')
          .replace(/\n```\s*$/,  '');
      }
      parsed = JSON.parse(cleanedResult);
    } catch (parseError) {
      console.error('Failed to parse Ollama response:', result.slice(0, 500));
      return { events: [], confidence: 0, rawResponse: result };
    }

    // Handle both array and object with events array
    let events: ExtractedEvent[] = [];
    if (Array.isArray(parsed)) {
      events = parsed;
    } else if (parsed.events && Array.isArray(parsed.events)) {
      events = parsed.events;
    } else {
      console.warn('Unexpected Ollama response format:', parsed);
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

    const confidence = validEvents.length > 0 ? 0.6 : 0;

    return {
      events: validEvents,
      confidence,
      rawResponse: result,
    };
  } catch (error: any) {
    console.error('Ollama event extraction error:', error.message);
    console.error('Ollama error details:', {
      code: error.code,
      cause: error.cause,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'),
      host
    });
    return { events: [], confidence: 0 };
  }
}

/**
 * Extract events using HuggingFace Inference API (free, no auth required)
 */
export async function extractEventsWithHuggingFace(
  content: string,
  options: {
    city?: string;
    sourceUrl?: string;
    maxEvents?: number;
    model?: string;
    apiKey?: string;
  } = {}
): Promise<EventExtractionResult> {
  const {
    city = 'New York',
    sourceUrl,
    maxEvents = 50,
    model = 'meta-llama/Llama-3.2-3B-Instruct',
    apiKey = process.env.HUGGINGFACE_API_KEY
  } = options;

  try {
    const truncatedContent = content.slice(0, 50000);
    const prompt = `${EXTRACTION_PROMPT}\n\nExtract events from this content (city: ${city}, source: ${sourceUrl || 'unknown'}):\n\n${truncatedContent}`;

    const response = await fetch(
      `https://api-inference.huggingface.co/models/${model}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 4000,
            temperature: 0.1,
            return_full_text: false,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HuggingFace API error: ${response.status}`);
    }

    const data = await response.json() as any;
    const result = Array.isArray(data) ? data[0]?.generated_text : data.generated_text || '';

    if (!result) {
      return { events: [], confidence: 0 };
    }

    // Try to extract JSON from the response
    let parsed: any;
    try {
      // Find JSON in the response
      const jsonMatch = result.match(/\[[\s\S]*\]/) || result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = JSON.parse(result);
      }
    } catch (parseError) {
      console.error('Failed to parse HuggingFace response:', result.slice(0, 200));
      return { events: [], confidence: 0, rawResponse: result };
    }

    // Handle both array and object with events array
    let events: ExtractedEvent[] = [];
    if (Array.isArray(parsed)) {
      events = parsed;
    } else if (parsed.events && Array.isArray(parsed.events)) {
      events = parsed.events;
    } else {
      console.warn('Unexpected HuggingFace response format:', parsed);
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

    const confidence = validEvents.length > 0 ? 0.5 : 0;

    return {
      events: validEvents,
      confidence,
      rawResponse: result,
    };
  } catch (error: any) {
    console.error('HuggingFace event extraction error:', error.message);
    return { events: [], confidence: 0 };
  }
}

/**
 * Extract events with automatic LLM fallback
 * Tries Ollama → HuggingFace only (OpenAI reserved exclusively for user chat)
 */
export async function extractEventsWithFallback(
  content: string,
  options: {
    city?: string;
    sourceUrl?: string;
    maxEvents?: number;
    ollamaModel?: string;
    ollamaHost?: string;
    ollamaApiKey?: string;
    huggingfaceApiKey?: string;
    huggingfaceModel?: string;
  } = {}
): Promise<EventExtractionResult & { provider?: string }> {
  // Try Ollama first (free, fast, good quality for event extraction)
  console.log('  → Trying Ollama extraction...');
  const ollamaResult = await extractEventsWithOllama(content, {
    city: options.city,
    sourceUrl: options.sourceUrl,
    maxEvents: options.maxEvents,
    model: options.ollamaModel,
    host: options.ollamaHost,
    apiKey: options.ollamaApiKey,
  });

  if (ollamaResult.events.length > 0) {
    console.log(`  ✓ Ollama extracted ${ollamaResult.events.length} events`);
    return { ...ollamaResult, provider: 'ollama' };
  }

  // Try HuggingFace as fallback (free cloud API)
  console.log('  → Ollama failed, trying HuggingFace (free cloud LLM)...');
  const huggingfaceResult = await extractEventsWithHuggingFace(content, {
    city: options.city,
    sourceUrl: options.sourceUrl,
    maxEvents: options.maxEvents,
    model: options.huggingfaceModel,
    apiKey: options.huggingfaceApiKey,
  });

  if (huggingfaceResult.events.length > 0) {
    console.log(`  ✓ HuggingFace extracted ${huggingfaceResult.events.length} events`);
    return { ...huggingfaceResult, provider: 'huggingface' };
  }

  console.log('  ✗ All extraction methods failed (OpenAI not used - reserved for user chat only)');
  return { events: [], confidence: 0, provider: 'none' };
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
 * Extract events from a URL using direct HTTP scraping + Cheerio + OpenAI
 * This is a backup method when Firecrawl API is unavailable
 */
export async function extractEventsWithDirectScrape(
  url: string,
  options: {
    city?: string;
    maxEvents?: number;
    openaiApiKey?: string;
  } = {}
): Promise<EventExtractionResult> {
  try {
    // Fetch HTML directly
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();

    // Use cheerio to parse and extract text content
    const cheerio = await import('cheerio');
    const $ = cheerio.load(html);

    // Remove script, style, and other non-content elements
    $('script, style, nav, header, footer, iframe, noscript').remove();

    // Extract main content - try common content selectors first
    const contentSelectors = [
      'main',
      'article',
      '[role="main"]',
      '.content',
      '#content',
      '.main-content',
      '.event-list',
      '.events',
      'body',
    ];

    let content = '';
    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        content = element.text();
        if (content.length > 500) {
          // Found substantial content
          break;
        }
      }
    }

    // If still no content, fall back to body text
    if (!content || content.length < 100) {
      content = $('body').text();
    }

    // Clean up whitespace
    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();

    if (!content || content.length < 50) {
      console.warn(`Direct scrape: Insufficient content from ${url}`);
      return { events: [], confidence: 0 };
    }

    console.log(`  ✓ Direct scrape fetched ${content.length} chars from ${url}`);

    // Extract events using LLM fallback chain (OpenAI → Claude → Ollama → HuggingFace)
    return extractEventsWithFallback(content, {
      ...options,
      sourceUrl: url,
      openaiApiKey: options.openaiApiKey,
    });
  } catch (error: any) {
    console.error(`Direct scrape error for ${url}:`, error.message);
    return { events: [], confidence: 0 };
  }
}

/**
 * Extract events from a URL using Firecrawl + OpenAI (with direct scrape fallback)
 */
export async function extractEventsFromUrl(
  url: string,
  options: {
    city?: string;
    maxEvents?: number;
    openaiApiKey?: string;
    firecrawlApiKey?: string;
    skipFirecrawl?: boolean;
  } = {}
): Promise<EventExtractionResult> {
  // Try direct scrape if Firecrawl is explicitly skipped or not configured
  const firecrawlApiKey = options.firecrawlApiKey || process.env.FIRECRAWL_API_KEY;

  if (options.skipFirecrawl || !firecrawlApiKey) {
    console.log('  → Using direct HTTP scrape (Firecrawl not available)');
    return extractEventsWithDirectScrape(url, options);
  }

  try {
    // Try Firecrawl first
    console.log('  → Trying Firecrawl scrape...');
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
      // If Firecrawl fails (e.g., 402 Payment Required), fall back to direct scrape
      console.warn(`  ✗ Firecrawl failed (${scrapeResponse.status}), falling back to direct scrape`);
      return extractEventsWithDirectScrape(url, options);
    }

    const scrapeData = await scrapeResponse.json() as {
      data?: {
        markdown?: string;
        html?: string;
      };
    };
    const content = scrapeData.data?.markdown || scrapeData.data?.html || '';

    if (!content) {
      console.warn('  ✗ Firecrawl returned no content, falling back to direct scrape');
      return extractEventsWithDirectScrape(url, options);
    }

    console.log(`  ✓ Firecrawl fetched ${content.length} chars`);

    // Extract events using OpenAI
    return extractEventsWithOpenAI(content, {
      ...options,
      sourceUrl: url,
      apiKey: options.openaiApiKey,
    });
  } catch (error: any) {
    console.error(`Event extraction from URL error: ${error.message}, falling back to direct scrape`);
    // Fall back to direct scrape on any error
    return extractEventsWithDirectScrape(url, options);
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
