/**
 * Scraper Scheduler
 * Orchestrates event scraping from all sources for configured cities
 */

import type { ScraperResult, ScraperStats, EventSource } from './types';
import { scrapeEventbrite, scrapeMeetup } from './sources/apify-wrapper';
import { scrapeResidentAdvisor } from './sources/residentadvisor';
import { persistEvents, cleanupOldEvents } from './normalize';
import { indexEventsInTypesense } from './indexing';

interface CityConfig {
  name: string;
  sources: EventSource[];
  maxEventsPerSource: number;
  daysAhead: number;
}

const CITIES: CityConfig[] = [
  {
    name: 'New York',
    sources: ['eventbrite', 'meetup', 'residentadvisor'],
    maxEventsPerSource: 100,
    daysAhead: 14,
  },
  {
    name: 'Los Angeles',
    sources: ['eventbrite', 'meetup'],
    maxEventsPerSource: 80,
    daysAhead: 14,
  },
  {
    name: 'San Francisco',
    sources: ['eventbrite', 'meetup'],
    maxEventsPerSource: 80,
    daysAhead: 14,
  },
  {
    name: 'Chicago',
    sources: ['eventbrite', 'meetup'],
    maxEventsPerSource: 60,
    daysAhead: 14,
  },
];

/**
 * Run full scraping cycle for all cities
 */
export async function runScraperCycle(): Promise<{
  cities: number;
  totalEvents: number;
  stats: Record<string, ScraperStats>;
}> {
  console.log(`\n🕷️ Starting scraper cycle for ${CITIES.length} cities...`);

  const startTime = Date.now();
  const allStats: Record<string, ScraperStats> = {};
  let totalEvents = 0;

  for (const cityConfig of CITIES) {
    try {
      const cityStats = await scrapeCityEvents(cityConfig);
      allStats[cityConfig.name] = cityStats;
      totalEvents += cityStats.newEvents + cityStats.updatedEvents;
    } catch (error: any) {
      console.error(
        `❌ Error scraping ${cityConfig.name}:`,
        error.message
      );
      allStats[cityConfig.name] = {
        totalScraped: 0,
        newEvents: 0,
        updatedEvents: 0,
        skippedEvents: 0,
        errors: 1,
        durationMs: 0,
      };
    }
  }

  // Clean up old events
  const deletedCount = await cleanupOldEvents(7);
  console.log(`🗑️ Cleaned up ${deletedCount} old events`);

  const durationMs = Date.now() - startTime;

  console.log(
    `\n✅ Scraper cycle complete: ${totalEvents} events in ${durationMs}ms`
  );

  return {
    cities: CITIES.length,
    totalEvents,
    stats: allStats,
  };
}

/**
 * Scrape events for a single city
 */
export async function scrapeCityEvents(
  cityConfig: CityConfig
): Promise<ScraperStats> {
  console.log(
    `\n🌆 Scraping ${cityConfig.name} from ${cityConfig.sources.length} sources...`
  );

  const allResults: ScraperResult[] = [];

  // Run scrapers for each source
  for (const source of cityConfig.sources) {
    try {
      let result: ScraperResult;

      switch (source) {
        case 'eventbrite':
          result = await scrapeEventbrite(cityConfig.name, {
            maxEvents: cityConfig.maxEventsPerSource,
            daysAhead: cityConfig.daysAhead,
          });
          break;

        case 'meetup':
          result = await scrapeMeetup(cityConfig.name, {
            maxEvents: cityConfig.maxEventsPerSource,
            daysAhead: cityConfig.daysAhead,
          });
          break;

        case 'residentadvisor':
          result = await scrapeResidentAdvisor(cityConfig.name, {
            maxEvents: cityConfig.maxEventsPerSource,
            daysAhead: cityConfig.daysAhead,
          });
          break;

        default:
          console.warn(`⚠️ Unknown source: ${source}`);
          continue;
      }

      allResults.push(result);

      if (result.errors.length > 0) {
        console.warn(
          `⚠️ ${source} had ${result.errors.length} errors:`,
          result.errors
        );
      }
    } catch (error: any) {
      console.error(`❌ ${source} failed:`, error.message);
    }
  }

  // Combine all events
  const allEvents = allResults.flatMap(r => r.events);

  console.log(
    `📦 Scraped ${allEvents.length} total events for ${cityConfig.name}`
  );

  // Persist to database
  const stats = await persistEvents(allEvents, {
    batchSize: 100,
    skipDuplicates: true,
  });

  // Index in Typesense
  if (stats.newEvents + stats.updatedEvents > 0) {
    try {
      await indexEventsInTypesense(cityConfig.name);
      console.log(`🔍 Indexed events in Typesense for ${cityConfig.name}`);
    } catch (error: any) {
      console.error(
        `❌ Typesense indexing failed for ${cityConfig.name}:`,
        error.message
      );
    }
  }

  return stats;
}

/**
 * Scrape a specific city by name
 */
export async function scrapeCityByName(
  cityName: string
): Promise<ScraperStats> {
  const cityConfig = CITIES.find(
    c => c.name.toLowerCase() === cityName.toLowerCase()
  );

  if (!cityConfig) {
    throw new Error(`City "${cityName}" not configured for scraping`);
  }

  return scrapeCityEvents(cityConfig);
}
