/**
 * Event Embedding Retrieval
 * Fetch embeddings from Qdrant for taste matching and learning
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import { prisma } from '@citypass/db';

// Lazy-initialize client
let qdrantClient: QdrantClient | null = null;

function getQdrantClient(): QdrantClient {
  if (!qdrantClient) {
    qdrantClient = new QdrantClient({
      url: process.env.QDRANT_URL || 'http://localhost:6333',
      apiKey: process.env.QDRANT_API_KEY,
    });
  }
  return qdrantClient;
}

const QDRANT_COLLECTION = 'events_e5';

export interface EventEmbedding {
  eventId: string;
  qdrantId: string;
  vector: number[];
}

/**
 * Fetch embeddings for multiple event IDs
 * @param eventIds - Array of event IDs
 * @returns Map of eventId -> embedding vector
 */
export async function fetchEventEmbeddings(
  eventIds: string[]
): Promise<Map<string, number[]>> {
  if (eventIds.length === 0) {
    return new Map();
  }

  try {
    // Step 1: Get qdrantIds from EventVector table
    const eventVectors = await prisma.eventVector.findMany({
      where: {
        eventId: {
          in: eventIds,
        },
      },
      select: {
        eventId: true,
        qdrantId: true,
      },
    });

    if (eventVectors.length === 0) {
      console.warn(`[fetchEventEmbeddings] No vectors found for ${eventIds.length} events`);
      return new Map();
    }

    // Step 2: Retrieve points from Qdrant
    const qdrant = getQdrantClient();
    const qdrantIds = eventVectors.map(ev => ev.qdrantId);

    const points = await qdrant.retrieve(QDRANT_COLLECTION, {
      ids: qdrantIds,
      with_vector: true,
    });

    // Step 3: Build eventId -> vector map
    const qdrantIdToEventId = new Map(
      eventVectors.map(ev => [ev.qdrantId, ev.eventId])
    );

    const embeddingMap = new Map<string, number[]>();

    for (const point of points) {
      const eventId = qdrantIdToEventId.get(point.id as string);
      if (eventId && point.vector) {
        // Handle both array and named vector formats
        const vector = Array.isArray(point.vector)
          ? point.vector
          : (point.vector as any).default || [];

        embeddingMap.set(eventId, vector as number[]);
      }
    }

    console.log(
      `✅ [fetchEventEmbeddings] Retrieved ${embeddingMap.size}/${eventIds.length} embeddings`
    );

    return embeddingMap;
  } catch (error) {
    console.error('[fetchEventEmbeddings] Failed to fetch embeddings:', error);
    return new Map();
  }
}

/**
 * Fetch a single event embedding
 */
export async function fetchEventEmbedding(
  eventId: string
): Promise<number[] | null> {
  const embeddings = await fetchEventEmbeddings([eventId]);
  return embeddings.get(eventId) || null;
}

/**
 * Check if event has embedding in Qdrant
 */
export async function hasEmbedding(eventId: string): Promise<boolean> {
  try {
    const eventVector = await prisma.eventVector.findUnique({
      where: { eventId },
      select: { qdrantId: true },
    });

    return !!eventVector;
  } catch (error) {
    console.error('[hasEmbedding] Check failed:', error);
    return false;
  }
}

/**
 * Batch check if events have embeddings
 */
export async function checkEmbeddings(
  eventIds: string[]
): Promise<Map<string, boolean>> {
  try {
    const eventVectors = await prisma.eventVector.findMany({
      where: {
        eventId: {
          in: eventIds,
        },
      },
      select: {
        eventId: true,
      },
    });

    const hasEmbeddingSet = new Set(eventVectors.map(ev => ev.eventId));

    return new Map(eventIds.map(id => [id, hasEmbeddingSet.has(id)]));
  } catch (error) {
    console.error('[checkEmbeddings] Check failed:', error);
    return new Map();
  }
}
