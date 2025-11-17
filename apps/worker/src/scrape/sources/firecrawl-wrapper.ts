/**
 * Firecrawl Wrapper for Event Scraping
 * Uses Firecrawl for structured data extraction from event sites
 */

import FirecrawlApp from '@mendable/firecrawl-js';
import type { RawEvent, ScraperResult, EventSource } from '../types';
import { retryWithBackoff } from '@citypass/utils';

const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY || '',
});

interface FirecrawlEventSchema {
  title?: string;
  description?: string;
  venue_name?: string;
  address?: string;
  start_time?: string;
  end_time?: string;
  price?: string;
  price_min?: number;
  price_max?: number;
  image_url?: string;
  booking_url?: string;
  category?: string;
  tags?: string[];
}

/**
 * Scrape events from a URL using Firecrawl
 */
export async function scrapeWithFirecrawl(
  url: string,
  city: string,
  source: EventSource,
  options: {
    maxEvents?: number;
    schema?: Record<string, any>;
  } = {}
): Promise<ScraperResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const events: RawEvent[] = [];

  try {
    console.log(`🔥 Firecrawl: Scraping ${url} for ${city}...`);

    const result = await retryWithBackoff(
      async () => {
        return await firecrawl.scrapeUrl(url, {
          formats: ['markdown', 'html'],
          onlyMainContent: true,
          waitFor: 2000,
        });
      },
      3,
      2000
    );

    if (!result.success) {
      throw new Error(`Firecrawl failed: ${result.error || 'Unknown error'}`);
    }

    // Extract events from markdown content using pattern matching
    const markdown = result.markdown || '';
    const extractedEvents = extractEventsFromMarkdown(markdown, url, city);

    events.push(...extractedEvents.slice(0, options.maxEvents || 50));

    console.log(`✅ Firecrawl: Extracted ${events.length} events from ${url}`);
  } catch (error: any) {
    console.error(`❌ Firecrawl error for ${url}:`, error.message);
    errors.push(error.message);
  }

  return {
    source,
    city,
    events,
    scrapedAt: new Date(),
    errors,
    metadata: {
      url,
      durationMs: Date.now() - startTime,
    },
  };
}

/**
 * Extract events from markdown content
 * Uses heuristics to identify event listings
 */
function extractEventsFromMarkdown(
  markdown: string,
  sourceUrl: string,
  city: string
): RawEvent[] {
  const events: RawEvent[] = [];

  // Split by common event separators (headers, horizontal rules, etc.)
  const sections = markdown.split(/\n#{1,3}\s+/);

  for (const section of sections) {
    const lines = section.split('\n').filter(line => line.trim());

    if (lines.length < 2) continue;

    // First line is likely the title
    const title = lines[0].trim().replace(/[*_#]+/g, '');

    // Look for date/time patterns
    const dateMatch = section.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(\w+\s+\d{1,2},?\s+\d{4})/i);
    const timeMatch = section.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);

    // Look for price patterns
    const priceMatch = section.match(/\$(\d+(?:\.\d{2})?)/);

    // Look for venue/location
    const venueMatch = section.match(/(?:at|@)\s+([^,\n]+)/i);

    if (!title || !dateMatch) continue;

    let startTime: Date | undefined;
    try {
      const dateStr = dateMatch[0];
      const timeStr = timeMatch ? timeMatch[0] : '19:00';
      startTime = new Date(`${dateStr} ${timeStr}`);

      if (isNaN(startTime.getTime())) {
        startTime = undefined;
      }
    } catch {
      // Skip if date parsing fails
      continue;
    }

    if (!startTime) continue;

    const event: RawEvent = {
      sourceId: `${sourceUrl}:${title}`.replace(/\s+/g, '-').toLowerCase(),
      sourceUrl,
      title,
      description: section.substring(0, 500),
      city,
      startTime,
      venueName: venueMatch ? venueMatch[1].trim() : undefined,
      priceMin: priceMatch ? parseFloat(priceMatch[1]) : undefined,
      bookingUrl: sourceUrl,
    };

    events.push(event);
  }

  return events;
}

/**
 * Batch scrape multiple URLs
 */
export async function batchScrapeWithFirecrawl(
  urls: string[],
  city: string,
  source: EventSource,
  options: {
    maxEventsPerUrl?: number;
    concurrency?: number;
  } = {}
): Promise<ScraperResult> {
  const { maxEventsPerUrl = 20, concurrency = 3 } = options;

  const allEvents: RawEvent[] = [];
  const allErrors: string[] = [];
  const startTime = Date.now();

  // Process URLs in batches
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);

    const results = await Promise.all(
      batch.map(url =>
        scrapeWithFirecrawl(url, city, source, { maxEvents: maxEventsPerUrl })
      )
    );

    results.forEach(result => {
      allEvents.push(...result.events);
      allErrors.push(...result.errors);
    });
  }

  return {
    source,
    city,
    events: allEvents,
    scrapedAt: new Date(),
    errors: allErrors,
    metadata: {
      totalUrls: urls.length,
      durationMs: Date.now() - startTime,
    },
  };
}
