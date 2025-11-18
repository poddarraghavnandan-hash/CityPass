/**
 * Worker: Continuous Event Extraction Job
 * Runs event extraction from multiple sources on a schedule
 * Uses Ollama + HuggingFace (no OpenAI - reserved for user chat)
 */

import { extractEventsFromUrl } from '../../../packages/utils/src/event-extraction';
import { prisma } from '@citypass/db';

const EVENT_SOURCES = {
  NYC: [
    'https://www.eventbrite.com/d/ny--new-york/events/',
    'https://www.ticketmaster.com/discover/concerts/new-york',
    'https://donyc.com/events',
    'https://www.timeout.com/newyork/things-to-do/best-things-to-do-in-new-york',
  ],
  LA: [
    'https://www.eventbrite.com/d/ca--los-angeles/events/',
    'https://www.ticketmaster.com/discover/concerts/los-angeles',
  ],
  SF: [
    'https://www.eventbrite.com/d/ca--san-francisco/events/',
    'https://www.ticketmaster.com/discover/concerts/san-francisco',
  ],
};

async function extractFromSource(url: string, city: string): Promise<{ extracted: number; saved: number }> {
  try {
    console.log(`  📡 Fetching events from ${url}...`);

    const result = await extractEventsFromUrl(url, {
      city,
      skipFirecrawl: true, // Use direct scraping (Firecrawl has quota limits)
    });

    if (result.events.length === 0) {
      console.log(`  ⚠️  No events found`);
      return { extracted: 0, saved: 0 };
    }

    console.log(`  ✨ Extracted ${result.events.length} events`);

    // Save events to database
    let savedCount = 0;
    for (const event of result.events) {
      try {
        const crypto = require('crypto');
        const urlHash = crypto
          .createHash('sha256')
          .update(`${url}:${event.title}:${event.startTime}`)
          .digest('hex')
          .slice(0, 32);

        await prisma.event.upsert({
          where: {
            unique_event: {
              canonicalUrlHash: urlHash,
              startTime: new Date(event.startTime),
            },
          },
          update: {
            title: event.title,
            description: event.description,
          },
          create: {
            sourceUrl: url,
            title: event.title,
            description: event.description || '',
            city: event.city,
            startTime: new Date(event.startTime),
            endTime: event.endTime ? new Date(event.endTime) : null,
            venueName: event.venueName,
            address: event.address,
            neighborhood: event.neighborhood,
            priceMin: event.priceMin || null,
            priceMax: event.priceMax || null,
            category: event.category || 'OTHER',
            imageUrl: event.imageUrl,
            bookingUrl: event.bookingUrl || url,
            organizer: event.organizer,
            sourceDomain: new URL(url).hostname,
            canonicalUrlHash: urlHash,
            checksum: crypto
              .createHash('md5')
              .update(JSON.stringify(event))
              .digest('hex')
              .slice(0, 32),
          },
        });

        savedCount++;
      } catch (error: any) {
        console.error(`  ✗ Failed to save "${event.title}": ${error.message}`);
      }
    }

    console.log(`  💾 Saved ${savedCount}/${result.events.length} events`);
    return { extracted: result.events.length, saved: savedCount };
  } catch (error: any) {
    console.error(`  ❌ Error processing ${url}: ${error.message}`);
    return { extracted: 0, saved: 0 };
  }
}

/**
 * Main extraction job - processes all configured sources
 */
export async function runEventExtraction(): Promise<{
  totalExtracted: number;
  totalSaved: number;
  cities: Record<string, { extracted: number; saved: number }>;
}> {
  console.log('\n🔄 Starting event extraction cycle...\n');

  const cities = process.env.CITYLENS_CITIES?.split(',') || ['NYC'];
  const results: Record<string, { extracted: number; saved: number }> = {};
  let totalExtracted = 0;
  let totalSaved = 0;

  for (const city of cities) {
    const sources = EVENT_SOURCES[city as keyof typeof EVENT_SOURCES] || EVENT_SOURCES.NYC;
    let cityExtracted = 0;
    let citySaved = 0;

    console.log(`\n📍 Processing ${city}...`);

    for (const url of sources) {
      const result = await extractFromSource(url, getCityName(city));
      cityExtracted += result.extracted;
      citySaved += result.saved;

      // Rate limiting - wait 2s between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    results[city] = { extracted: cityExtracted, saved: citySaved };
    totalExtracted += cityExtracted;
    totalSaved += citySaved;

    console.log(`  ✅ ${city}: Extracted ${cityExtracted}, Saved ${citySaved}`);
  }

  console.log(`\n✅ Event extraction complete!`);
  console.log(`   Total extracted: ${totalExtracted} events`);
  console.log(`   Total saved: ${totalSaved} events`);

  return { totalExtracted, totalSaved, cities: results };
}

function getCityName(code: string): string {
  const cityMap: Record<string, string> = {
    NYC: 'New York',
    LA: 'Los Angeles',
    SF: 'San Francisco',
  };
  return cityMap[code] || code;
}
