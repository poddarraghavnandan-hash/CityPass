/**
 * Apify Wrapper for Event Scraping
 * Uses Apify actors for Eventbrite, Meetup, and other event platforms
 */

import { ApifyClient } from 'apify-client';
import type { RawEvent, ScraperResult, EventSource } from '../types';
import { sleep } from '@citypass/utils';

const apifyClient = new ApifyClient({
  token: process.env.APIFY_API_KEY || '',
});

interface EventbriteEvent {
  id: string;
  name: { text: string };
  description: { text?: string };
  start: { local: string };
  end: { local: string };
  venue?: {
    name?: string;
    address?: {
      city?: string;
      address_1?: string;
      latitude?: string;
      longitude?: string;
    };
  };
  ticket_classes?: Array<{
    cost?: { display?: string };
    free?: boolean;
  }>;
  logo?: { url?: string };
  url: string;
  category_id?: string;
}

/**
 * Scrape Eventbrite using Apify
 */
export async function scrapeEventbrite(
  city: string,
  options: {
    maxEvents?: number;
    daysAhead?: number;
  } = {}
): Promise<ScraperResult> {
  const { maxEvents = 100, daysAhead = 14 } = options;
  const startTime = Date.now();
  const errors: string[] = [];
  const events: RawEvent[] = [];

  try {
    console.log(`🎫 Apify: Scraping Eventbrite for ${city}...`);

    // Run Eventbrite scraper actor
    const run = await apifyClient.actor('apify/eventbrite-scraper').call({
      search: city,
      maxItems: maxEvents,
      proxy: { useApifyProxy: true },
    });

    // Wait for run to finish
    await waitForRun(run.id, 300000); // 5 min timeout

    // Get dataset items
    const dataset = await apifyClient.dataset(run.defaultDatasetId).listItems();
    const items = dataset.items as EventbriteEvent[];

    const now = new Date();
    const maxDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    for (const item of items) {
      try {
        const startTime = new Date(item.start.local);

        // Filter by date range
        if (startTime < now || startTime > maxDate) continue;

        const event: RawEvent = {
          sourceId: `eventbrite:${item.id}`,
          sourceUrl: item.url,
          title: item.name?.text || 'Untitled Event',
          description: item.description?.text,
          venueName: item.venue?.name,
          address: item.venue?.address?.address_1,
          city: item.venue?.address?.city || city,
          lat: item.venue?.address?.latitude
            ? parseFloat(item.venue.address.latitude)
            : undefined,
          lon: item.venue?.address?.longitude
            ? parseFloat(item.venue.address.longitude)
            : undefined,
          startTime,
          endTime: item.end?.local ? new Date(item.end.local) : undefined,
          category: mapEventbriteCategory(item.category_id),
          imageUrl: item.logo?.url,
          bookingUrl: item.url,
          priceMin: extractPriceMin(item.ticket_classes),
          priceMax: extractPriceMax(item.ticket_classes),
        };

        events.push(event);
      } catch (error: any) {
        errors.push(`Failed to parse Eventbrite event: ${error.message}`);
      }
    }

    console.log(`✅ Apify: Scraped ${events.length} Eventbrite events for ${city}`);
  } catch (error: any) {
    console.error(`❌ Apify Eventbrite error:`, error.message);
    errors.push(error.message);
  }

  return {
    source: 'eventbrite',
    city,
    events,
    scrapedAt: new Date(),
    errors,
    metadata: {
      durationMs: Date.now() - startTime,
    },
  };
}

/**
 * Scrape Meetup using Apify
 */
export async function scrapeMeetup(
  city: string,
  options: {
    maxEvents?: number;
    daysAhead?: number;
  } = {}
): Promise<ScraperResult> {
  const { maxEvents = 100, daysAhead = 14 } = options;
  const startTime = Date.now();
  const errors: string[] = [];
  const events: RawEvent[] = [];

  try {
    console.log(`🤝 Apify: Scraping Meetup for ${city}...`);

    // Run Meetup scraper actor
    const run = await apifyClient.actor('compass/meetup-scraper').call({
      location: city,
      maxEvents,
      proxy: { useApifyProxy: true },
    });

    // Wait for run to finish
    await waitForRun(run.id, 300000);

    // Get dataset items
    const dataset = await apifyClient.dataset(run.defaultDatasetId).listItems();
    const items = dataset.items as any[];

    const now = new Date();
    const maxDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    for (const item of items) {
      try {
        const startTime = new Date(item.dateTime || item.time);

        if (startTime < now || startTime > maxDate) continue;

        const event: RawEvent = {
          sourceId: `meetup:${item.id || item.eventId}`,
          sourceUrl: item.link || item.url,
          title: item.title || item.name,
          description: item.description,
          venueName: item.venue?.name || item.venueName,
          address: item.venue?.address || item.address,
          city: item.venue?.city || city,
          lat: item.venue?.lat || item.latitude,
          lon: item.venue?.lon || item.longitude,
          startTime,
          category: 'NETWORKING',
          tags: item.topics?.map((t: any) => t.name) || [],
          priceMin: item.fee?.amount ? parseFloat(item.fee.amount) : 0,
          imageUrl: item.image || item.photo?.highres_link,
          bookingUrl: item.link || item.url,
          organizerName: item.group?.name,
          organizerId: `meetup:${item.group?.id}`,
        };

        events.push(event);
      } catch (error: any) {
        errors.push(`Failed to parse Meetup event: ${error.message}`);
      }
    }

    console.log(`✅ Apify: Scraped ${events.length} Meetup events for ${city}`);
  } catch (error: any) {
    console.error(`❌ Apify Meetup error:`, error.message);
    errors.push(error.message);
  }

  return {
    source: 'meetup',
    city,
    events,
    scrapedAt: new Date(),
    errors,
    metadata: {
      durationMs: Date.now() - startTime,
    },
  };
}

/**
 * Wait for Apify run to finish
 */
async function waitForRun(
  runId: string,
  timeoutMs: number = 300000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const run = await apifyClient.run(runId).get();

    if (run?.status === 'SUCCEEDED') {
      return;
    }

    if (run?.status === 'FAILED' || run?.status === 'ABORTED') {
      throw new Error(`Apify run ${run.status}: ${run.error}`);
    }

    // Wait 5 seconds before checking again
    await sleep(5000);
  }

  throw new Error(`Apify run timeout after ${timeoutMs}ms`);
}

/**
 * Map Eventbrite category ID to our category enum
 */
function mapEventbriteCategory(categoryId?: string): string | undefined {
  if (!categoryId) return undefined;

  const mapping: Record<string, string> = {
    '103': 'MUSIC',      // Music
    '105': 'ARTS',       // Performing & Visual Arts
    '108': 'FOOD',       // Food & Drink
    '110': 'NETWORKING', // Business & Professional
    '113': 'FAMILY',     // Family & Education
    '115': 'FITNESS',    // Sports & Fitness
    '116': 'WELLNESS',   // Health & Wellness
    '119': 'COMEDY',     // Film, Media & Entertainment
  };

  return mapping[categoryId] || 'OTHER';
}

/**
 * Extract minimum price from Eventbrite ticket classes
 */
function extractPriceMin(
  ticketClasses?: Array<{ cost?: { display?: string }; free?: boolean }>
): number | undefined {
  if (!ticketClasses || ticketClasses.length === 0) return undefined;

  const prices = ticketClasses
    .filter(tc => !tc.free && tc.cost?.display)
    .map(tc => {
      const match = tc.cost!.display!.match(/[\d.]+/);
      return match ? parseFloat(match[0]) : null;
    })
    .filter((p): p is number => p !== null);

  if (prices.length === 0) return 0; // Free event

  return Math.min(...prices);
}

/**
 * Extract maximum price from Eventbrite ticket classes
 */
function extractPriceMax(
  ticketClasses?: Array<{ cost?: { display?: string }; free?: boolean }>
): number | undefined {
  if (!ticketClasses || ticketClasses.length === 0) return undefined;

  const prices = ticketClasses
    .filter(tc => !tc.free && tc.cost?.display)
    .map(tc => {
      const match = tc.cost!.display!.match(/[\d.]+/);
      return match ? parseFloat(match[0]) : null;
    })
    .filter((p): p is number => p !== null);

  if (prices.length === 0) return 0;

  return Math.max(...prices);
}
