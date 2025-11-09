/**
 * External API Aggregator
 * Fetches events from multiple third-party sources
 */

import { searchEventbrite } from './eventbrite';
import { searchViator } from './viator';
import { searchClassPass } from './classpass';
import { prisma } from '@citypass/db';
import { normalizeCategory, type EventCategoryValue } from '../categories';

interface ExternalEvent {
  sourceUrl: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date | null;
  venueName: string | null;
  address: string | null;
  city: string;
  lat: number | null;
  lon: number | null;
  priceMin: number | null;
  priceMax: number | null;
  currency: string;
  category: EventCategoryValue;
  imageUrl: string | null;
  bookingUrl: string;
  timezone: string;
  organizer?: string | null;
}

interface SearchOptions {
  query: string;
  city: string;
  category?: EventCategoryValue | null;
  limit?: number;
}

/**
 * Search all external APIs in parallel
 */
export async function searchExternalAPIs(options: SearchOptions): Promise<any[]> {
  const { query, city, category, limit = 10 } = options;

  console.log(`   🔌 Searching external APIs for "${query}" in ${city}`);

  // Run all API searches in parallel for speed
  const [eventbriteResults, viatorResults, classPassResults] = await Promise.allSettled([
    searchEventbrite(query, city, category),
    searchViator(query, city, category),
    searchClassPass(query, city, category),
  ]);

  // Collect successful results
  const allEvents: ExternalEvent[] = [];

  if (eventbriteResults.status === 'fulfilled') {
    console.log(`   ✅ Eventbrite: ${eventbriteResults.value.length} events`);
    allEvents.push(...eventbriteResults.value);
  } else {
    console.error(`   ❌ Eventbrite failed:`, eventbriteResults.reason);
  }

  if (viatorResults.status === 'fulfilled') {
    console.log(`   ✅ Viator: ${viatorResults.value.length} experiences`);
    allEvents.push(...viatorResults.value);
  } else {
    console.error(`   ❌ Viator failed:`, viatorResults.reason);
  }

  if (classPassResults.status === 'fulfilled') {
    console.log(`   ✅ ClassPass/Mindbody: ${classPassResults.value.length} classes`);
    allEvents.push(...classPassResults.value);
  } else {
    console.error(`   ❌ ClassPass failed:`, classPassResults.reason);
  }

  // Deduplicate by URL and normalize categories
  const uniqueEvents = deduplicateByUrl(allEvents).map(event => ({
    ...event,
    category: normalizeCategory(event.category) ?? 'OTHER',
  }));

  // Save to database for future searches (async, don't wait)
  saveExternalEventsToDatabase(uniqueEvents).catch(err =>
    console.error('Failed to save external events:', err)
  );

  // Return limited results
  return uniqueEvents.slice(0, limit).map(event => ({
    ...event,
    id: event.sourceUrl,
  }));
}

/**
 * Deduplicate events by source URL
 */
function deduplicateByUrl(events: ExternalEvent[]): ExternalEvent[] {
  const seen = new Set<string>();
  return events.filter(event => {
    if (seen.has(event.sourceUrl)) return false;
    seen.add(event.sourceUrl);
    return true;
  });
}

/**
 * Save external events to database for caching
 */
async function saveExternalEventsToDatabase(events: ExternalEvent[]): Promise<void> {
  for (const event of events) {
    try {
      const normalizedCategory = normalizeCategory(event.category) ?? 'OTHER';
      // Check if event already exists
      const existing = await prisma.event.findFirst({
        where: { sourceUrl: event.sourceUrl },
      });

      if (existing) {
        // Update if changed
        await prisma.event.update({
          where: { id: existing.id },
          data: {
            title: event.title,
            description: event.description,
            startTime: event.startTime,
            endTime: event.endTime,
            venueName: event.venueName,
            address: event.address,
            city: event.city,
            lat: event.lat,
            lon: event.lon,
            priceMin: event.priceMin,
            priceMax: event.priceMax,
            currency: event.currency,
            category: normalizedCategory,
            imageUrl: event.imageUrl,
            bookingUrl: event.bookingUrl,
            timezone: event.timezone,
            organizer: event.organizer,
          },
        });
      } else {
        // Create new event
        await prisma.event.create({
          data: {
            sourceUrl: event.sourceUrl,
            title: event.title,
            description: event.description,
            startTime: event.startTime,
            endTime: event.endTime,
            venueName: event.venueName,
            address: event.address,
            city: event.city,
            lat: event.lat,
            lon: event.lon,
            priceMin: event.priceMin,
            priceMax: event.priceMax,
            currency: event.currency,
            category: normalizedCategory,
            imageUrl: event.imageUrl,
            bookingUrl: event.bookingUrl,
            timezone: event.timezone,
            organizer: event.organizer,
            sourceDomain: extractDomain(event.sourceUrl),
            canonicalUrlHash: hashUrl(event.sourceUrl),
            checksum: generateChecksum(event),
          },
        });
      }
    } catch (error) {
      console.error(`Failed to save event: ${event.title}`, error);
    }
  }
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return 'unknown';
  }
}

/**
 * Generate URL hash for deduplication
 */
function hashUrl(url: string): string {
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

/**
 * Generate content checksum for change detection
 */
function generateChecksum(event: ExternalEvent): string {
  const content = JSON.stringify({
    title: event.title,
    description: event.description,
    startTime: event.startTime,
    price: event.priceMin,
  });
  return hashUrl(content);
}
