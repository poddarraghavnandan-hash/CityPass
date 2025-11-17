/**
 * Search Indexing
 * Syncs events from Postgres to Typesense and Qdrant
 */

import { prisma } from '@citypass/db';
import Typesense from 'typesense';
import { QdrantClient } from '@qdrant/js-client-rest';
import type { Event } from '@citypass/db';

const typesenseClient = new Typesense.Client({
  nodes: [
    {
      host: process.env.TYPESENSE_HOST || 'localhost',
      port: parseInt(process.env.TYPESENSE_PORT || '8108'),
      protocol: (process.env.TYPESENSE_PROTOCOL as 'http' | 'https') || 'http',
    },
  ],
  apiKey: process.env.TYPESENSE_API_KEY || 'xyz',
  connectionTimeoutSeconds: 10,
});

const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://localhost:6333',
  apiKey: process.env.QDRANT_API_KEY,
});

const TYPESENSE_COLLECTION = 'events';
const QDRANT_COLLECTION = 'events_e5';

/**
 * Index events in Typesense for a specific city
 */
export async function indexEventsInTypesense(
  city: string,
  options: {
    batchSize?: number;
    deleteOld?: boolean;
  } = {}
): Promise<number> {
  const { batchSize = 100, deleteOld = false } = options;

  try {
    console.log(`🔍 Indexing Typesense events for ${city}...`);

    // Get all future events for this city
    const events = await prisma.event.findMany({
      where: {
        city,
        startTime: { gte: new Date() },
      },
      orderBy: { startTime: 'asc' },
    });

    console.log(`📊 Found ${events.length} events to index`);

    if (deleteOld) {
      // Delete existing events for this city
      try {
        await typesenseClient
          .collections(TYPESENSE_COLLECTION)
          .documents()
          .delete({ filter_by: `city:=${city}` });

        console.log(`🗑️ Deleted old events for ${city} from Typesense`);
      } catch (error: any) {
        console.warn(
          `⚠️ Could not delete old events:`,
          error.message
        );
      }
    }

    // Index in batches
    let indexed = 0;
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);

      try {
        const documents = batch.map(event => ({
          id: event.id,
          title: event.title,
          description: event.description || '',
          venue_name: event.venueName || '',
          neighborhood: event.neighborhood || '',
          city: event.city,
          address: event.address || '',
          category: event.category || 'OTHER',
          tags: event.tags || [],
          start_time: Math.floor(event.startTime.getTime() / 1000),
          end_time: event.endTime
            ? Math.floor(event.endTime.getTime() / 1000)
            : null,
          price_min: event.priceMin ?? null,
          price_max: event.priceMax ?? null,
          lat: event.lat ?? null,
          lon: event.lon ?? null,
          image_url: event.imageUrl || '',
          booking_url: event.bookingUrl || '',
        }));

        await typesenseClient
          .collections(TYPESENSE_COLLECTION)
          .documents()
          .import(documents, { action: 'upsert' });

        indexed += batch.length;
        console.log(
          `  ✓ Indexed batch ${i / batchSize + 1}: ${batch.length} events`
        );
      } catch (error: any) {
        console.error(
          `❌ Error indexing batch ${i / batchSize + 1}:`,
          error.message
        );
      }
    }

    console.log(
      `✅ Indexed ${indexed}/${events.length} events in Typesense`
    );

    return indexed;
  } catch (error: any) {
    console.error(`❌ Typesense indexing error:`, error.message);
    throw error;
  }
}

/**
 * Index events in Qdrant for vector search
 * Note: Requires event embeddings to be generated first
 */
export async function indexEventsInQdrant(
  city: string,
  options: {
    batchSize?: number;
  } = {}
): Promise<number> {
  const { batchSize = 100 } = options;

  try {
    console.log(`🔍 Indexing Qdrant events for ${city}...`);

    // Get events that have embeddings
    const events = await prisma.event.findMany({
      where: {
        city,
        startTime: { gte: new Date() },
        embedding: { not: null },
      },
      orderBy: { startTime: 'asc' },
    });

    console.log(
      `📊 Found ${events.length} events with embeddings to index`
    );

    // Ensure collection exists
    try {
      await qdrantClient.getCollection(QDRANT_COLLECTION);
    } catch {
      console.log(
        `📦 Creating Qdrant collection: ${QDRANT_COLLECTION}...`
      );
      await qdrantClient.createCollection(QDRANT_COLLECTION, {
        vectors: {
          size: 768, // e5-base-v2 dimension
          distance: 'Cosine',
        },
      });
    }

    // Index in batches
    let indexed = 0;
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);

      try {
        const points = batch
          .filter(e => e.embedding && Array.isArray(e.embedding))
          .map(event => ({
            id: event.id,
            vector: event.embedding as number[],
            payload: {
              title: event.title,
              description: event.description,
              city: event.city,
              category: event.category,
              venueName: event.venueName,
              startTime: event.startTime.toISOString(),
              priceMin: event.priceMin,
              priceMax: event.priceMax,
              lat: event.lat,
              lon: event.lon,
              tags: event.tags,
              imageUrl: event.imageUrl,
              bookingUrl: event.bookingUrl,
            },
          }));

        if (points.length > 0) {
          await qdrantClient.upsert(QDRANT_COLLECTION, {
            wait: true,
            points,
          });

          indexed += points.length;
          console.log(
            `  ✓ Indexed batch ${i / batchSize + 1}: ${points.length} points`
          );
        }
      } catch (error: any) {
        console.error(
          `❌ Error indexing batch ${i / batchSize + 1}:`,
          error.message
        );
      }
    }

    console.log(
      `✅ Indexed ${indexed}/${events.length} events in Qdrant`
    );

    return indexed;
  } catch (error: any) {
    console.error(`❌ Qdrant indexing error:`, error.message);
    throw error;
  }
}

/**
 * Full reindex for a city (both Typesense and Qdrant)
 */
export async function reindexCity(city: string): Promise<{
  typesense: number;
  qdrant: number;
}> {
  console.log(`\n🔄 Full reindex for ${city}...`);

  const typesenseCount = await indexEventsInTypesense(city, {
    deleteOld: true,
  });

  const qdrantCount = await indexEventsInQdrant(city);

  console.log(
    `✅ Reindex complete: Typesense=${typesenseCount}, Qdrant=${qdrantCount}`
  );

  return {
    typesense: typesenseCount,
    qdrant: qdrantCount,
  };
}
