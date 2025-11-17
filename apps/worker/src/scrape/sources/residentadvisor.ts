/**
 * Resident Advisor Scraper
 * Scrapes electronic music events from Resident Advisor
 */

import type { RawEvent, ScraperResult } from '../types';
import { scrapeWithFirecrawl } from './firecrawl-wrapper';

const RA_BASE_URL = 'https://ra.co/events';

const CITY_SLUGS: Record<string, string> = {
  'New York': 'us/newyork',
  'Los Angeles': 'us/losangeles',
  'San Francisco': 'us/sanfrancisco',
  'Chicago': 'us/chicago',
  'Miami': 'us/miami',
  'London': 'uk/london',
  'Berlin': 'de/berlin',
  'Paris': 'fr/paris',
  'Amsterdam': 'nl/amsterdam',
  'Barcelona': 'es/barcelona',
};

/**
 * Scrape Resident Advisor events for a city
 */
export async function scrapeResidentAdvisor(
  city: string,
  options: {
    maxEvents?: number;
    daysAhead?: number;
  } = {}
): Promise<ScraperResult> {
  const { maxEvents = 50 } = options;
  const citySlug = CITY_SLUGS[city];

  if (!citySlug) {
    return {
      source: 'residentadvisor',
      city,
      events: [],
      scrapedAt: new Date(),
      errors: [`City "${city}" not supported by Resident Advisor scraper`],
    };
  }

  const url = `${RA_BASE_URL}/${citySlug}`;

  console.log(`🎧 Scraping Resident Advisor: ${url}`);

  const result = await scrapeWithFirecrawl(url, city, 'residentadvisor', {
    maxEvents,
  });

  // Post-process: Set category to MUSIC for all RA events
  result.events.forEach(event => {
    event.category = 'MUSIC';
    event.tags = [...(event.tags || []), 'electronic', 'nightlife'];
  });

  return result;
}
