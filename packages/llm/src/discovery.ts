import OpenAI from 'openai';
import { prisma, SourceType, CrawlMethod } from '@citypass/db';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// Singleton client
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
    if (!openaiClient) {
        openaiClient = new OpenAI({ apiKey: OPENAI_API_KEY });
    }
    return openaiClient;
}

export interface GPTSuggestedEvent {
    title: string;
    venueName: string;
    startTime: string; // ISO string
    description?: string;
    url: string; // Critical for source capture
    sourceName?: string;
    neighborhood?: string;
    category?: string;
    priceMin?: number;
    priceMax?: number;
}

/**
 * Fetch real-time event suggestions from GPT
 * @param query User's search query or intention
 * @param city City context
 * @returns List of events found by GPT
 */
export async function fetchEventsFromGPT(
    query: string,
    city: string = 'New York'
): Promise<GPTSuggestedEvent[]> {
    const client = getOpenAIClient();

    const prompt = `
    You are a local event expert for ${city}.
    The user is looking for: "${query}".
    
    Current Date: ${new Date().toISOString()}
    
    Find 3-5 REAL, specific events happening SOON (ideally today/tonight or this week) that match this request.
    If the user asks for "tonight" or "this evening", prioritize events happening within the next 12 hours.
    
    You MUST provide a valid URL for each event where the user can find more info or buy tickets.
    Do not invent events. If you are unsure, return fewer results.
    
    Return a JSON object with a "events" key containing an array of objects with these fields:
    - title: string
    - venueName: string
    - neighborhood: string (e.g., "Williamsburg", "Downtown", "Brooklyn") - CRITICAL
    - startTime: ISO 8601 string (assume current year/month if not specified)
    - description: short summary
    - url: string (REQUIRED)
    - sourceName: string (e.g., "Eventbrite", "Venue Website")
    - category: string (MUSIC, COMEDY, ART, FOOD, etc.)
    - priceMin: number (optional)
    - priceMax: number (optional)
  `;

    try {
        const response = await client.chat.completions.create({
            model: 'gpt-4o', // Using gpt-4o for now, will update to gpt-5.1 when available
            messages: [
                { role: 'system', content: 'You are a helpful event discovery assistant that outputs JSON.' },
                { role: 'user', content: prompt }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.7,
        });

        const content = response.choices[0].message.content;
        if (!content) return [];

        const parsed = JSON.parse(content);
        const events = parsed.events || [];

        // Capture sources asynchronously (fire and forget)
        captureSources(events, city).catch(err => console.error('[GPT Discovery] Source capture failed:', err));

        return events;
    } catch (error) {
        console.error('[GPT Discovery] Failed to fetch events:', error);
        return [];
    }
}

/**
 * Save discovered sources to DB for future scraping
 */
async function captureSources(events: GPTSuggestedEvent[], city: string) {
    for (const event of events) {
        if (!event.url) continue;

        try {
            const urlObj = new URL(event.url);
            const domain = urlObj.hostname.replace('www.', '');

            // Determine source type heuristic
            let sourceType: SourceType = SourceType.VENUE;
            if (domain.includes('eventbrite') || domain.includes('meetup') || domain.includes('ra.co')) {
                sourceType = SourceType.AGGREGATOR;
            } else if (domain.includes('ticketmaster') || domain.includes('dice.fm')) {
                sourceType = SourceType.TICKETING;
            }

            try {
                await prisma.source.upsert({
                    where: { url: event.url },
                    update: { lastSuccess: new Date() },
                    create: {
                        name: event.sourceName || domain,
                        url: event.url,
                        domain: domain,
                        city: city,
                        sourceType: sourceType,
                        crawlMethod: CrawlMethod.FIRECRAWL,
                        active: true
                    }
                });
            } catch (dbError) {
                // Silent failure for DB issues to not block the main thread
                // console.warn('[GPT Discovery] Failed to save source:', dbError);
            }
        } catch (e) {
            // Ignore invalid URLs or DB errors
        }
    }
}
