/**
 * Background job to embed all events into Qdrant vector database
 * Run this periodically or trigger manually
 */

import { PrismaClient } from '@citypass/db';
import {
  ensureEventsCollection,
  indexEventVector,
  prepareEventTextForEmbedding,
  generateEmbedding,
} from '@citypass/llm';

const prisma = new PrismaClient();

async function embedAllEvents() {
  console.log('🚀 Starting event embedding job...');

  try {
    // Ensure Qdrant collection exists
    console.log('📦 Ensuring Qdrant collection...');
    await ensureEventsCollection();

    // Get all events without embeddings or with stale embeddings
    const events = await prisma.event.findMany({
      where: {
        OR: [
          { eventVector: null },
          {
            eventVector: {
              lastEmbeddedAt: {
                lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days old
              },
            },
          },
        ],
      },
      include: {
        venue: true,
      },
      take: 100, // Batch size
    });

    console.log(`📊 Found ${events.length} events to embed`);

    let successCount = 0;
    let errorCount = 0;

    // Process events in batches
    for (const event of events) {
      try {
        // Prepare text for embedding
        const text = prepareEventTextForEmbedding({
          title: event.title,
          description: event.description || undefined,
          category: event.category || undefined,
          venueName: event.venueName || event.venue?.name || undefined,
          neighborhood: event.neighborhood || undefined,
          city: event.city,
          tags: event.tags || undefined,
        });

        // Generate embedding
        const embedding = await generateEmbedding(text, {
          model: 'bge-m3', // Best for semantic search
          useCase: 'event-search',
        });

        // Index in Qdrant
        await indexEventVector(
          event.id,
          embedding,
          {
            city: event.city,
            category: event.category || 'GENERAL',
            startTime: event.startTime.toISOString(),
            priceMin: event.priceMin || 0,
            priceMax: event.priceMax || 1000,
          },
          'bge-m3'
        );

        // Update database record
        await prisma.eventVector.upsert({
          where: { eventId: event.id },
          create: {
            eventId: event.id,
            vectorId: event.id,
            embeddingVersion: 'bge-m3-v1',
            lastEmbeddedAt: new Date(),
          },
          update: {
            lastEmbeddedAt: new Date(),
          },
        });

        successCount++;
        console.log(`✅ Embedded event ${successCount}/${events.length}: "${event.title}"`);

      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to embed event "${event.title}":`, error);
      }
    }

    console.log(`\n🎉 Embedding complete!`);
    console.log(`  ✅ Success: ${successCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);
    console.log(`  📊 Total processed: ${events.length}`);

  } catch (error) {
    console.error('💥 Fatal error in embedding job:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  embedAllEvents()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { embedAllEvents };
