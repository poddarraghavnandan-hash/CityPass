import { QdrantClient } from '@qdrant/js-client-rest';
import { generateEmbedding } from './ollama';

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const EVENTS_COLLECTION = 'events';
const VECTOR_SIZE = 1024; // BGE-M3 embedding dimension

// Singleton Qdrant client
let qdrantClient: QdrantClient | null = null;

function getQdrantClient(): QdrantClient {
  if (!qdrantClient) {
    qdrantClient = new QdrantClient({ url: QDRANT_URL });
  }
  return qdrantClient;
}

/**
 * Initialize the events collection in Qdrant
 */
export async function ensureEventsCollection(): Promise<void> {
  const client = getQdrantClient();

  try {
    // Check if collection exists
    await client.getCollection(EVENTS_COLLECTION);
    console.log(`✓ Qdrant collection '${EVENTS_COLLECTION}' exists`);
  } catch (error) {
    // Collection doesn't exist, create it
    console.log(`Creating Qdrant collection '${EVENTS_COLLECTION}'...`);

    await client.createCollection(EVENTS_COLLECTION, {
      vectors: {
        size: VECTOR_SIZE,
        distance: 'Cosine',
      },
    });

    // Create indexes for filtering
    await client.createPayloadIndex(EVENTS_COLLECTION, {
      field_name: 'city',
      field_schema: 'keyword',
    });

    await client.createPayloadIndex(EVENTS_COLLECTION, {
      field_name: 'category',
      field_schema: 'keyword',
    });

    await client.createPayloadIndex(EVENTS_COLLECTION, {
      field_name: 'startTime',
      field_schema: 'datetime',
    });

    console.log(`✓ Created Qdrant collection '${EVENTS_COLLECTION}'`);
  }
}

/**
 * Index an event in Qdrant with its embedding
 * @param event Event data with all fields
 * @returns Qdrant point ID (UUID)
 */
export async function indexEventVector(event: {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  venueName?: string | null;
  neighborhood?: string | null;
  city: string;
  startTime: Date;
  priceMin?: number | null;
  priceMax?: number | null;
  tags: string[];
}): Promise<string> {
  const client = getQdrantClient();

  // Create searchable text from event data
  const searchableText = [
    event.title,
    event.description || '',
    event.category || '',
    event.venueName || '',
    event.neighborhood || '',
    event.tags.join(' '),
  ]
    .filter(Boolean)
    .join(' ');

  // Generate embedding
  const embedding = await generateEmbedding(searchableText);

  // Create unique UUID for Qdrant
  const qdrantId = crypto.randomUUID();

  // Index in Qdrant
  await client.upsert(EVENTS_COLLECTION, {
    wait: true,
    points: [
      {
        id: qdrantId,
        vector: embedding,
        payload: {
          eventId: event.id,
          title: event.title,
          description: event.description,
          category: event.category,
          venueName: event.venueName,
          neighborhood: event.neighborhood,
          city: event.city,
          startTime: event.startTime.toISOString(),
          priceMin: event.priceMin,
          priceMax: event.priceMax,
          tags: event.tags,
        },
      },
    ],
  });

  return qdrantId;
}

/**
 * Semantic search for events using natural language query
 * @param query Natural language search query
 * @param city City to filter by
 * @param limit Maximum number of results
 * @returns Relevant events with similarity scores
 */
export async function searchEvents(
  query: string,
  city?: string,
  limit: number = 20
): Promise<
  Array<{
    eventId: string;
    score: number;
    title: string;
    description?: string;
    category?: string;
    venueName?: string;
  }>
> {
  const client = getQdrantClient();

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);

  // Build filter
  const filter: any = {};
  if (city) {
    filter.must = [
      {
        key: 'city',
        match: { value: city },
      },
    ];
  }

  // Search in Qdrant
  const results = await client.search(EVENTS_COLLECTION, {
    vector: queryEmbedding,
    limit,
    filter: Object.keys(filter).length > 0 ? filter : undefined,
    with_payload: true,
  });

  return results.map((result) => ({
    eventId: result.payload?.eventId as string,
    score: result.score,
    title: result.payload?.title as string,
    description: result.payload?.description as string | undefined,
    category: result.payload?.category as string | undefined,
    venueName: result.payload?.venueName as string | undefined,
  }));
}

/**
 * Hybrid search combining keyword and semantic search
 * @param query Search query
 * @param keywordResults IDs from keyword search (Typesense)
 * @param city City filter
 * @param limit Result limit
 * @returns Combined and deduplicated results
 */
export async function hybridSearch(
  query: string,
  keywordResults: string[],
  city?: string,
  limit: number = 20
): Promise<
  Array<{
    eventId: string;
    score: number;
    title: string;
    description?: string;
  }>
> {
  // Get semantic search results
  const semanticResults = await searchEvents(query, city, limit);

  // Combine results with weighted scoring
  const combinedScores = new Map<string, number>();

  // Weight keyword matches higher (0.6)
  keywordResults.forEach((eventId, index) => {
    const keywordScore = 1 - index / keywordResults.length;
    combinedScores.set(eventId, keywordScore * 0.6);
  });

  // Add semantic matches (0.4 weight)
  semanticResults.forEach((result) => {
    const existing = combinedScores.get(result.eventId) || 0;
    combinedScores.set(result.eventId, existing + result.score * 0.4);
  });

  // Sort by combined score and return top results
  const sorted = Array.from(combinedScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  // Build result objects
  const resultMap = new Map(
    semanticResults.map((r) => [r.eventId, r])
  );

  return sorted.map(([eventId, score]) => {
    const result = resultMap.get(eventId);
    return {
      eventId,
      score,
      title: result?.title || '',
      description: result?.description,
    };
  });
}

/**
 * Delete an event from Qdrant
 * @param qdrantId Qdrant point ID (UUID)
 */
export async function deleteEventVector(qdrantId: string): Promise<void> {
  const client = getQdrantClient();

  await client.delete(EVENTS_COLLECTION, {
    wait: true,
    points: [qdrantId],
  });
}

/**
 * Update an event's vector in Qdrant
 * @param qdrantId Existing Qdrant point ID
 * @param event Updated event data
 */
export async function updateEventVector(
  qdrantId: string,
  event: Parameters<typeof indexEventVector>[0]
): Promise<void> {
  // Delete old vector
  await deleteEventVector(qdrantId);

  // Re-index with same ID
  const searchableText = [
    event.title,
    event.description || '',
    event.category || '',
    event.venueName || '',
    event.neighborhood || '',
    event.tags.join(' '),
  ]
    .filter(Boolean)
    .join(' ');

  const embedding = await generateEmbedding(searchableText);

  const client = getQdrantClient();

  await client.upsert(EVENTS_COLLECTION, {
    wait: true,
    points: [
      {
        id: qdrantId,
        vector: embedding,
        payload: {
          eventId: event.id,
          title: event.title,
          description: event.description,
          category: event.category,
          venueName: event.venueName,
          neighborhood: event.neighborhood,
          city: event.city,
          startTime: event.startTime.toISOString(),
          priceMin: event.priceMin,
          priceMax: event.priceMax,
          tags: event.tags,
        },
      },
    ],
  });
}
