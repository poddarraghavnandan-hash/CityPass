/**
 * Acceptance Tests for CityPass
 *
 * Tests the full pipeline:
 * 1. Load fixture HTML
 * 2. Extract events using LLM
 * 3. Validate schema
 * 4. Upsert to database
 * 5. Index to Typesense
 * 6. Search and retrieve
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';
import { prisma } from '@citypass/db';
import { extractEventsFromContent } from '../src/lib/extraction';
import { indexEvent, searchEvents, ensureEventsCollection } from '../src/lib/typesense';
import { canonicalUrlHash, contentChecksum } from '@citypass/utils';

const fixturesDir = join(__dirname, 'fixtures');

describe('CityPass End-to-End Pipeline', () => {
  beforeAll(async () => {
    // Ensure Typesense collection exists
    await ensureEventsCollection();
  });

  test('Bowery Ballroom: Extract → DB → Search', async () => {
    const html = readFileSync(join(fixturesDir, 'bowery-ballroom.html'), 'utf-8');
    const url = 'https://www.boweryballroom.com/calendar';

    // Step 1: Extract events
    const events = await extractEventsFromContent(html, url, 'New York');
    expect(events.length).toBeGreaterThan(0);

    const firstEvent = events[0];
    expect(firstEvent.title).toBeTruthy();
    expect(firstEvent.venue_name).toContain('Bowery');
    expect(firstEvent.category).toBe('music');

    // Step 2: Upsert to database
    const urlHash = canonicalUrlHash(firstEvent.source_url);
    const checksum = contentChecksum(firstEvent);

    const dbEvent = await prisma.event.upsert({
      where: {
        unique_event: {
          canonicalUrlHash: urlHash,
          startTime: new Date(firstEvent.start_time),
        },
      },
      update: {
        title: firstEvent.title,
        checksum,
      },
      create: {
        sourceUrl: firstEvent.source_url,
        title: firstEvent.title,
        subtitle: firstEvent.subtitle,
        description: firstEvent.description,
        category: 'MUSIC',
        venueName: firstEvent.venue_name,
        address: firstEvent.address,
        city: firstEvent.city,
        startTime: new Date(firstEvent.start_time),
        endTime: firstEvent.end_time ? new Date(firstEvent.end_time) : null,
        priceMin: firstEvent.price_min,
        priceMax: firstEvent.price_max,
        sourceDomain: 'boweryballroom.com',
        canonicalUrlHash: urlHash,
        checksum,
      },
    });

    expect(dbEvent.id).toBeTruthy();

    // Step 3: Index to Typesense
    await indexEvent(dbEvent);

    // Step 4: Search and verify
    const searchResults = await searchEvents({
      q: firstEvent.title,
      city: 'New York',
    });

    expect(searchResults.found).toBeGreaterThan(0);
    const foundEvent = searchResults.hits?.[0]?.document;
    expect(foundEvent).toBeTruthy();
    expect(foundEvent.title).toBe(firstEvent.title);
  }, 60000); // 60s timeout for LLM call

  test('Comedy Cellar: Extract comedy events', async () => {
    const html = readFileSync(join(fixturesDir, 'comedy-cellar.html'), 'utf-8');
    const url = 'https://www.comedycellar.com/shows';

    const events = await extractEventsFromContent(html, url, 'New York');
    expect(events.length).toBeGreaterThan(0);

    const comedyEvent = events.find(e => e.category === 'comedy');
    expect(comedyEvent).toBeTruthy();
    expect(comedyEvent?.min_age).toBeDefined();
    expect(comedyEvent?.venue_name).toContain('Comedy Cellar');
  }, 60000);

  test('Free Yoga: Extract free events', async () => {
    const html = readFileSync(join(fixturesDir, 'free-yoga.html'), 'utf-8');
    const url = 'https://brooklynwellness.org/events';

    const events = await extractEventsFromContent(html, url, 'New York');
    expect(events.length).toBeGreaterThan(0);

    const yogaEvent = events[0];
    expect(yogaEvent.category).toBe('fitness');
    expect(yogaEvent.price_min).toBe(0);
    expect(yogaEvent.accessibility?.length).toBeGreaterThan(0);
    expect(yogaEvent.neighborhood).toContain('Park Slope');
  }, 60000);

  test('Search: Filter by category', async () => {
    const results = await searchEvents({
      city: 'New York',
      category: 'MUSIC',
    });

    expect(results.found).toBeGreaterThan(0);
    results.hits?.forEach(hit => {
      expect(hit.document.category).toBe('MUSIC');
    });
  });

  test('Search: Filter by price', async () => {
    const results = await searchEvents({
      city: 'New York',
      priceMax: 0, // Free events only
    });

    results.hits?.forEach(hit => {
      expect(hit.document.price_min).toBeLessThanOrEqual(0);
    });
  });

  test('Dedupe: Same event not duplicated', async () => {
    const html = readFileSync(join(fixturesDir, 'bowery-ballroom.html'), 'utf-8');
    const url = 'https://www.boweryballroom.com/calendar';

    // Extract twice
    const events1 = await extractEventsFromContent(html, url, 'New York');
    const events2 = await extractEventsFromContent(html, url, 'New York');

    const firstEvent = events1[0];
    const urlHash = canonicalUrlHash(firstEvent.source_url);

    // Both should resolve to same event in DB
    const countBefore = await prisma.event.count({
      where: {
        canonicalUrlHash: urlHash,
      },
    });

    // Upsert both
    for (const event of [...events1, ...events2]) {
      const hash = canonicalUrlHash(event.source_url);
      await prisma.event.upsert({
        where: {
          unique_event: {
            canonicalUrlHash: hash,
            startTime: new Date(event.start_time),
          },
        },
        update: { title: event.title },
        create: {
          sourceUrl: event.source_url,
          title: event.title,
          city: event.city,
          startTime: new Date(event.start_time),
          sourceDomain: 'boweryballroom.com',
          canonicalUrlHash: hash,
          checksum: contentChecksum(event),
        },
      });
    }

    const countAfter = await prisma.event.count({
      where: {
        canonicalUrlHash: urlHash,
      },
    });

    // Should be same count (no duplicates)
    expect(countAfter).toBe(countBefore);
  }, 90000);
});
