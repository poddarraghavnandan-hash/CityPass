/**
 * Event Crawler using Firecrawl + OpenAI
 * Scrapes venue websites and extracts structured event data
 */

import { prisma, EventCategory } from '@citypass/db';
import { extractEventsWithFallback } from '@citypass/utils/src/event-extraction';
import { canonicalUrlHash, contentChecksum } from '@citypass/utils';

interface FirecrawlResponse {
  success: boolean;
  data?: {
    markdown?: string;
    html?: string;
    metadata?: {
      title?: string;
      description?: string;
    };
  };
  error?: string;
}

/**
 * Scrape a URL using Firecrawl API
 */
async function scrapeWithFirecrawl(url: string): Promise<string> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error('FIRECRAWL_API_KEY not configured');
  }

  const response = await fetch('https://api.firecrawl.dev/v0/scrape', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      url,
      formats: ['markdown', 'html'],
      onlyMainContent: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Firecrawl API error: ${response.status} - ${error}`);
  }

  const data: FirecrawlResponse = await response.json();

  if (!data.success || !data.data) {
    throw new Error(`Firecrawl failed: ${data.error || 'Unknown error'}`);
  }

  // Prefer markdown, fallback to HTML
  return data.data.markdown || data.data.html || '';
}

/**
 * Process a source: scrape, extract, and save events
 */
export async function processSource(sourceId: string): Promise<{
  success: boolean;
  eventsCreated: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let eventsCreated = 0;

  try {
    // 1. Get source from database
    const source = await prisma.source.findUnique({
      where: { id: sourceId },
    });

    if (!source) {
      throw new Error(`Source ${sourceId} not found`);
    }

    if (!source.active) {
      throw new Error(`Source ${source.name} is inactive`);
    }

    console.log(`🔍 Scraping: ${source.name} (${source.url})`);

    // 2. Scrape content with Firecrawl
    const content = await scrapeWithFirecrawl(source.url);

    if (!content || content.length < 100) {
      throw new Error('Scraped content too short or empty');
    }

    console.log(`✓ Scraped ${content.length} characters from ${source.name}`);

    // 3. Extract events with automatic LLM fallback (OpenAI → Claude → Ollama → HuggingFace)
    const extraction = await extractEventsWithFallback(content, {
      city: source.city,
      sourceUrl: source.url,
      maxEvents: 50,
      openaiApiKey: process.env.OPENAI_API_KEY,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      ollamaHost: process.env.OLLAMA_HOST,
      ollamaApiKey: process.env.OLLAMA_API_KEY,
      huggingfaceApiKey: process.env.HUGGINGFACE_API_KEY,
    });

    if (extraction.provider) {
      console.log(`✓ Extracted ${extraction.events.length} events using ${extraction.provider}`);
    } else {
      console.log(`✓ Extracted ${extraction.events.length} events`);
    }

    // 4. Save events to database
    for (const extracted of extraction.events) {
      try {
        const startTime = new Date(extracted.startTime);
        const endTime = extracted.endTime ? new Date(extracted.endTime) : null;

        // Skip past events
        if (startTime < new Date()) {
          continue;
        }

        const urlHash = canonicalUrlHash(source.url + extracted.title);
        const checksum = contentChecksum({
          title: extracted.title,
          description: extracted.description,
          start_time: startTime.toISOString(),
          venue_name: extracted.venueName,
          price_min: extracted.priceMin ?? null,
          price_max: extracted.priceMax ?? null,
        });

        // Check if event already exists
        const existing = await prisma.event.findFirst({
          where: {
            OR: [
              { canonicalUrlHash: urlHash },
              {
                AND: [
                  { title: extracted.title },
                  { startTime },
                  { venueName: extracted.venueName },
                ],
              },
            ],
          },
        });

        if (existing) {
          console.log(`  ⊘ Skipping duplicate: ${extracted.title}`);
          continue;
        }

        // Create event
        await prisma.event.create({
          data: {
            sourceUrl: source.url,
            sourceDomain: source.domain,
            title: extracted.title,
            description: extracted.description,
            startTime,
            endTime,
            venueName: extracted.venueName,
            address: extracted.address,
            neighborhood: extracted.neighborhood,
            city: extracted.city || source.city,
            priceMin: extracted.priceMin ?? null,
            priceMax: extracted.priceMax ?? null,
            category: (extracted.category || source.category || EventCategory.OTHER) as EventCategory,
            imageUrl: extracted.imageUrl,
            bookingUrl: extracted.bookingUrl,
            organizer: extracted.organizer,
            canonicalUrlHash: urlHash,
            checksum,
            timezone: 'America/New_York',
            currency: 'USD',
            source: {
              connect: { id: sourceId },
            },
          },
        });

        eventsCreated++;
        console.log(`  ✓ Created: ${extracted.title}`);
      } catch (err: any) {
        errors.push(`Failed to save "${extracted.title}": ${err.message}`);
      }
    }

    // 5. Update source metadata
    await prisma.source.update({
      where: { id: sourceId },
      data: {
        lastCrawled: new Date(),
        lastSuccess: eventsCreated > 0 ? new Date() : source.lastSuccess,
      },
    });

    console.log(`✅ Completed: ${source.name} - Created ${eventsCreated} events`);

    return {
      success: true,
      eventsCreated,
      errors,
    };
  } catch (error: any) {
    console.error('Source processing error:', error);
    errors.push(error.message);

    return {
      success: false,
      eventsCreated,
      errors,
    };
  }
}

/**
 * Process all active sources
 */
export async function processAllSources(): Promise<{
  totalProcessed: number;
  totalEventsCreated: number;
  failures: string[];
}> {
  const sources = await prisma.source.findMany({
    where: { active: true },
  });

  console.log(`\n🚀 Processing ${sources.length} active sources...\n`);

  let totalEventsCreated = 0;
  const failures: string[] = [];

  for (const source of sources) {
    const result = await processSource(source.id);
    totalEventsCreated += result.eventsCreated;

    if (!result.success) {
      failures.push(`${source.name}: ${result.errors.join(', ')}`);
    }
  }

  return {
    totalProcessed: sources.length,
    totalEventsCreated,
    failures,
  };
}
