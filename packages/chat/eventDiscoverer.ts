/**
 * Chat Brain V2 - Event Discovery Agent
 * Uses LLM with function calling to discover events from the web when database has insufficient results
 */

import OpenAI from 'openai';
import type { ChatContextSnapshot, CandidateEvent, IntentionV2 } from './types';
import { searchAllPlatforms } from './eventApis';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;

export interface DiscoveredEvent {
  title: string;
  venueName: string | null;
  address: string | null;
  city: string;
  category: string;
  startTime: string; // ISO string
  endTime: string | null;
  priceMin: number | null;
  priceMax: number | null;
  description: string | null;
  sourceUrl: string;
  imageUrl: string | null;
  lat: number | null;
  lon: number | null;
}

const DISCOVERY_SYSTEM_PROMPT = `You are CityLens Event Discovery Agent, an expert at finding real-time events from the web.

CRITICAL RULES:
- You MUST use the provided tools to search for events
- You MUST return REAL events with accurate details (title, venue, time, price)
- NEVER invent or hallucinate event details
- Extract structured data from search results and web pages
- Focus on events matching the user's query, time window, and location

Your tools:
1. web_search - Search for events using queries
2. scrape_webpage - Extract event details from specific URLs

Process:
1. Analyze the user's query and intention
2. Construct smart search queries (e.g., "fitness classes New York tonight", "yoga workout Brooklyn 2025-11-19")
3. Use web_search to find event sources
4. Use scrape_webpage to extract detailed event information
5. Return structured event data

Output format:
Return an array of discovered events with all required fields filled accurately.`;

/**
 * Discover events using LLM with function calling
 */
export async function discoverEventsWithLLM(
  context: ChatContextSnapshot,
  intention: IntentionV2,
  maxEvents: number = 10
): Promise<DiscoveredEvent[]> {
  console.log('[EventDiscoverer] Starting LLM event discovery...');

  if (!openai) {
    console.warn('[EventDiscoverer] OpenAI not configured, skipping discovery');
    return [];
  }

  try {
    const userPrompt = buildDiscoveryPrompt(context, intention);

    console.log('\n=== [EventDiscoverer] DISCOVERY PROMPT ===');
    console.log(userPrompt);
    console.log('=== END PROMPT ===\n');

    const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
      {
        type: 'function',
        function: {
          name: 'web_search',
          description: 'Search the web for events using a query string',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query (e.g., "yoga classes Brooklyn tonight", "fitness events New York")',
              },
            },
            required: ['query'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'scrape_webpage',
          description: 'Scrape a specific webpage to extract event details',
          parameters: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'URL of the webpage to scrape',
              },
            },
            required: ['url'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'return_discovered_events',
          description: 'Return the final list of discovered events',
          parameters: {
            type: 'object',
            properties: {
              events: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    venueName: { type: 'string', nullable: true },
                    address: { type: 'string', nullable: true },
                    city: { type: 'string' },
                    category: { type: 'string', enum: ['MUSIC', 'COMEDY', 'THEATRE', 'FITNESS', 'DANCE', 'ARTS', 'FOOD', 'NETWORKING', 'FAMILY', 'OTHER'] },
                    startTime: { type: 'string', description: 'ISO 8601 datetime' },
                    endTime: { type: 'string', nullable: true, description: 'ISO 8601 datetime' },
                    priceMin: { type: 'number', nullable: true },
                    priceMax: { type: 'number', nullable: true },
                    description: { type: 'string', nullable: true },
                    sourceUrl: { type: 'string' },
                    imageUrl: { type: 'string', nullable: true },
                    lat: { type: 'number', nullable: true },
                    lon: { type: 'number', nullable: true },
                  },
                  required: ['title', 'city', 'category', 'startTime', 'sourceUrl'],
                },
              },
            },
            required: ['events'],
          },
        },
      },
    ];

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: DISCOVERY_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ];

    let discoveredEvents: DiscoveredEvent[] = [];
    let iterationCount = 0;
    const maxIterations = 5;

    while (iterationCount < maxIterations) {
      iterationCount++;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o', // Use GPT-4o for better tool calling
        messages,
        tools,
        tool_choice: 'auto',
        temperature: 0.3,
        max_tokens: 2000,
      });

      const assistantMessage = completion.choices[0]?.message;
      if (!assistantMessage) break;

      messages.push(assistantMessage);

      const toolCalls = assistantMessage.tool_calls;
      if (!toolCalls || toolCalls.length === 0) {
        console.log('[EventDiscoverer] No more tool calls, finishing discovery');
        break;
      }

      // Execute all tool calls
      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);

        console.log(`[EventDiscoverer] Executing ${functionName} with args:`, functionArgs);

        let toolResult: string;

        if (functionName === 'web_search') {
          toolResult = await executeWebSearch(functionArgs.query, context, intention);
        } else if (functionName === 'scrape_webpage') {
          toolResult = await scrapeWebpage(functionArgs.url);
        } else if (functionName === 'return_discovered_events') {
          discoveredEvents = functionArgs.events;
          console.log(`[EventDiscoverer] Received ${discoveredEvents.length} discovered events`);
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: 'Events received successfully',
          });
          iterationCount = maxIterations; // Exit loop
          break;
        } else {
          toolResult = 'Unknown function';
        }

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: toolResult,
        });
      }
    }

    console.log(`[EventDiscoverer] Discovered ${discoveredEvents.length} events from web`);

    // Verification Step
    const verifiedEvents: DiscoveredEvent[] = [];
    // Import dynamically to avoid circular dependency issues if any (though we checked)
    // Actually, we added the dependency, so static import is fine, but let's use dynamic for safety in this function
    const { verifyEventData } = await import('@citypass/llm');

    for (const event of discoveredEvents) {
      try {
        const verification = await verifyEventData(event);
        if (verification.isValid && verification.confidence > 0.6) {
          verifiedEvents.push(event);
        } else {
          console.warn(`[EventDiscoverer] Event rejected by verification: ${event.title}`, verification.issues);
        }
      } catch (err) {
        console.error(`[EventDiscoverer] Verification error for ${event.title}:`, err);
        // If verification fails technically, we might want to keep it or drop it. 
        // Let's keep it if it looks basic valid
        if (event.title && event.startTime) verifiedEvents.push(event);
      }
    }

    console.log(`[EventDiscoverer] ${verifiedEvents.length} events passed verification`);
    return verifiedEvents.slice(0, maxEvents);
  } catch (error) {
    console.error('[EventDiscoverer] Discovery failed:', error);
    return [];
  }
}

/**
 * Build discovery prompt
 */
function buildDiscoveryPrompt(
  context: ChatContextSnapshot,
  intention: IntentionV2
): string {
  return `TASK: Find real-time events matching this user request.

USER REQUEST:
"${context.freeText}"

PRIMARY GOAL:
${intention.primaryGoal}

TIME WINDOW:
${intention.timeWindow.fromISO} to ${intention.timeWindow.toISO}

LOCATION:
City: ${intention.city}
${intention.neighborhoodPreference ? `Neighborhood: ${intention.neighborhoodPreference}` : ''}

PREFERENCES:
- Vibe: ${intention.vibeDescriptors.join(', ')}
${intention.budgetBand ? `- Budget: ${intention.budgetBand}` : ''}
${intention.socialContext ? `- Social context: ${intention.socialContext}` : ''}
${intention.exertionLevel ? `- Exertion level: ${intention.exertionLevel}` : ''}

CONSTRAINTS:
${intention.constraints.join(', ') || 'None'}

INSTRUCTIONS:
1. Search the web for events matching this criteria
2. Look for event listings on sites like Eventbrite, Meetup, ClassPass, Mindbody, local venue websites
3. Extract accurate event details (title, venue, time, price, description)
4. Focus on events in the specified time window and location
5. Return structured data using the return_discovered_events function

IMPORTANT:
- Only return REAL events you found online
- Include the source URL for each event
- Ensure startTime is within the time window
- Categorize events correctly (FITNESS for workouts, MUSIC for concerts, etc.)`;
}

/**
 * Execute web search using event platform APIs
 */
async function executeWebSearch(
  query: string,
  context: ChatContextSnapshot,
  intention: IntentionV2
): Promise<string> {
  console.log(`[EventDiscoverer] Searching event platforms: "${query}"`);

  try {
    // Extract date range from intention
    const startDate = intention.timeWindow.fromISO.split('T')[0]; // YYYY-MM-DD
    const endDate = intention.timeWindow.toISO.split('T')[0];

    // Extract category if specified
    const category = intention.vibeDescriptors.find((v) =>
      ['MUSIC', 'COMEDY', 'THEATRE', 'FITNESS', 'DANCE', 'ARTS', 'FOOD', 'NETWORKING', 'FAMILY'].includes(v.toUpperCase())
    );

    // Search all platforms
    const discoveredEvents = await searchAllPlatforms({
      query,
      city: intention.city,
      startDate,
      endDate,
      category: category?.toUpperCase(),
    });

    if (discoveredEvents.length === 0) {
      return `No events found for "${query}" in ${intention.city} from ${startDate} to ${endDate}. Try a different search query or broader criteria.`;
    }

    // Format events as search results
    const results = discoveredEvents.slice(0, 20).map((event, i) => {
      return `${i + 1}. ${event.title}
   Venue: ${event.venueName || 'TBD'}
   Date: ${event.startTime}
   Price: ${event.priceMin ? `$${event.priceMin}${event.priceMax ? `-$${event.priceMax}` : '+'}` : 'Free/TBD'}
   Category: ${event.category}
   URL: ${event.sourceUrl}`;
    }).join('\n\n');

    return `Found ${discoveredEvents.length} events for "${query}" in ${intention.city}:

${results}

You can now use the return_discovered_events function to return these events. Extract the event details from the search results above.`;
  } catch (error) {
    console.error('[EventDiscoverer] Event platform search failed:', error);
    return `Search failed: ${error}. Try a different query.`;
  }
}

/**
 * Scrape webpage using Firecrawl
 */
async function scrapeWebpage(url: string): Promise<string> {
  console.log(`[EventDiscoverer] Scraping: ${url}`);

  if (!firecrawlApiKey) {
    return 'Firecrawl API not configured';
  }

  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
      }),
    });

    if (!response.ok) {
      return `Failed to scrape: ${response.statusText}`;
    }

    const data = await response.json() as any;
    const markdown = data.markdown || data.data?.markdown || '';

    // Limit markdown length to avoid token limits
    const truncated = markdown.slice(0, 5000);

    return `Scraped content from ${url}:

${truncated}

Extract event details from this content including title, venue, date/time, price, and description.`;
  } catch (error) {
    console.error('[EventDiscoverer] Scrape failed:', error);
    return `Scrape failed: ${error}`;
  }
}

/**
 * Convert discovered events to CandidateEvent format
 */
export function convertDiscoveredToCandidateEvents(
  discovered: DiscoveredEvent[]
): CandidateEvent[] {
  return discovered.map((event) => ({
    id: `llm-discovered-${Math.random().toString(36).substring(7)}`,
    title: event.title,
    startISO: event.startTime,
    endISO: event.endTime || undefined,
    neighborhood: event.address || null,
    distanceMin: null,
    priceBand: mapPriceToband(event.priceMin, event.priceMax),
    categories: [event.category],
    moods: [],
    venueName: event.venueName || null,
    socialHeatScore: null,
    noveltyScore: null,
    fitScore: null,
  }));
}

/**
 * Helper: Map price to band
 */
function mapPriceToband(
  priceMin?: number | null,
  priceMax?: number | null
): 'FREE' | 'LOW' | 'MID' | 'HIGH' | 'LUXE' | null {
  if (priceMin == null && priceMax == null) return null;
  if (priceMin === 0 && priceMax === 0) return 'FREE';

  const avgPrice = ((priceMin || 0) + (priceMax || 0)) / 2;

  if (avgPrice < 20) return 'LOW';
  if (avgPrice < 60) return 'MID';
  if (avgPrice < 120) return 'HIGH';
  return 'LUXE';
}
