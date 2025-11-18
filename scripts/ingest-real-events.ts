/**
 * Script to ingest real events from popular sources
 * Usage: npx tsx scripts/ingest-real-events.ts
 */

import { extractEventsFromUrl, extractEventsWithFallback, extractEventsWithDirectScrape } from '../packages/utils/src/event-extraction';
import { prisma } from '../packages/db/src/index';

const REAL_EVENT_SOURCES = {
  NYC: [
    'https://www.eventbrite.com/d/ny--new-york/events/',
    'https://www.ticketmaster.com/discover/concerts/new-york',
    'https://ra.co/events/us/newyork',
    'https://donyc.com/events',
    'https://www.timeout.com/newyork/things-to-do/best-things-to-do-in-new-york',
    'https://www.nycgo.com/events',
  ],
  LA: [
    'https://www.eventbrite.com/d/ca--los-angeles/events/',
    'https://www.timeout.com/los-angeles/things-to-do',
    'https://ra.co/events/us/losangeles',
  ],
  SF: [
    'https://www.eventbrite.com/d/ca--san-francisco/events/',
    'https://www.timeout.com/san-francisco/things-to-do',
    'https://ra.co/events/us/sanfrancisco',
  ],
};

async function ingestFromSource(url: string, city: string) {
  console.log(`\n📡 Fetching events from ${url}...`);

  try {
    // Use direct scrape (skip Firecrawl since it's quota exceeded)
    // This function will automatically try LLM fallback: OpenAI → Claude → Ollama → HuggingFace
    const result = await extractEventsFromUrl(url, {
      city,
      skipFirecrawl: true,
      openaiApiKey: process.env.OPENAI_API_KEY,
    });

    if (result.events.length === 0) {
      console.log(`⚠️  No events found`);
      return { extracted: 0, saved: 0 };
    }

    console.log(`✨ Extracted ${result.events.length} events (confidence: ${(result.confidence * 100).toFixed(0)}%)`);

    // Save events to database
    let savedCount = 0;
    for (const event of result.events) {
      try {
        const urlHash = require('crypto')
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
            checksum: require('crypto')
              .createHash('md5')
              .update(JSON.stringify(event))
              .digest('hex')
              .slice(0, 32),
          },
        });

        savedCount++;
        console.log(`  ✓ ${event.title}`);
      } catch (error: any) {
        console.error(`  ✗ Failed to save "${event.title}": ${error.message}`);
      }
    }

    console.log(`💾 Saved ${savedCount}/${result.events.length} events`);
    return { extracted: result.events.length, saved: savedCount };
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    return { extracted: 0, saved: 0 };
  }
}

async function main() {
  console.log('🚀 Starting real event ingestion...\n');

  const city = process.argv[2] || 'NYC';
  const sources = REAL_EVENT_SOURCES[city as keyof typeof REAL_EVENT_SOURCES] || REAL_EVENT_SOURCES.NYC;

  let totalExtracted = 0;
  let totalSaved = 0;

  for (const url of sources) {
    const result = await ingestFromSource(url, city === 'NYC' ? 'New York' : city);
    totalExtracted += result.extracted;
    totalSaved += result.saved;

    // Rate limiting - wait between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\n✅ Complete!`);
  console.log(`   Extracted: ${totalExtracted} events`);
  console.log(`   Saved: ${totalSaved} events`);

  process.exit(0);
}

main().catch(console.error);
