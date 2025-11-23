/**
 * RAG Retriever: Hybrid search with Qdrant (vector) + Typesense (keyword)
 * Implements E5 embeddings, BGE reranking, and robust error handling
 * Falls back to direct database queries when search services unavailable
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import Typesense from 'typesense';
import { prisma } from '@citypass/db';
import type { Intention, TypesenseEvent } from '@citypass/types';

// Types
export interface RetrievalCandidate {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  startTime: Date;
  priceMin: number | null;
  priceMax: number | null;
  venueName: string | null;
  city: string;
  lat: number | null;
  lon: number | null;
  tags: string[] | null;
  bookingUrl: string | null;
  imageUrl: string | null;
  score: number;
  source: 'vector' | 'keyword' | 'hybrid';
}

export interface RetrievalOptions {
  topK?: number;
  rerankTop?: number;
  useReranker?: boolean;
  timeout?: number;
  cacheKey?: string;
}

export interface RetrievalResult {
  candidates: RetrievalCandidate[];
  vectorCount: number;
  keywordCount: number;
  rerankApplied: boolean;
  latencyMs: number;
}

type TypesenseKeywordHit = {
  document: TypesenseEvent;
  text_match_info?: {
    score?: number;
  };
};

type TypesenseKeywordResponse = {
  hits?: TypesenseKeywordHit[];
};

// Lazy-initialize clients (don't create at module level to avoid build errors)
let qdrantClient: QdrantClient | null = null;
let typesenseClient: InstanceType<typeof Typesense.Client> | null = null;

function getQdrantClient(): QdrantClient {
  if (!qdrantClient) {
    qdrantClient = new QdrantClient({
      url: process.env.QDRANT_URL || 'http://localhost:6333',
      apiKey: process.env.QDRANT_API_KEY,
    });
  }
  return qdrantClient;
}

function getTypesenseClient(): InstanceType<typeof Typesense.Client> {
  if (!typesenseClient) {
    typesenseClient = new Typesense.Client({
      nodes: [
        {
          host: process.env.TYPESENSE_HOST || 'localhost',
          port: parseInt(process.env.TYPESENSE_PORT || '8108'),
          protocol: (process.env.TYPESENSE_PROTOCOL as 'http' | 'https') || 'http',
        },
      ],
      apiKey: process.env.TYPESENSE_API_KEY || 'xyz',
      connectionTimeoutSeconds: 2,
    });
  }
  return typesenseClient;
}

const QDRANT_COLLECTION = 'events_e5';
const TYPESENSE_COLLECTION = 'events';
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'e5-base-v2';

import { cache } from '@citypass/llm';
import crypto from 'crypto';
import OpenAI from 'openai';

// Lazy-init OpenAI client
let openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

/**
 * Generate E5 embedding for query text using OpenAI
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const hash = crypto.createHash('md5').update(text).digest('hex');
  const cacheKey = `emb:${hash}`;

  const cached = await cache.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  try {
    const response = await getOpenAI().embeddings.create({
      model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
      input: text,
      dimensions: 768, // Ensure compatibility with Qdrant collection
    });

    const embedding = response.data[0].embedding;

    // Cache for 7 days
    await cache.set(cacheKey, JSON.stringify(embedding), 86400 * 7);

    return embedding;
  } catch (error: any) {
    console.error('Embedding generation failed:', error.message);
    // Fallback to zero vector to prevent crash, but log severe error
    return Array.from({ length: 768 }, () => 0);
  }
}

/**
 * Search Qdrant for vector-similar events
 */
async function searchQdrant(
  queryText: string,
  intention: Intention,
  topK: number = 100
): Promise<RetrievalCandidate[]> {
  try {
    const embedding = await generateEmbedding(queryText);

    const filter = {
      must: [
        { key: 'city', match: { value: intention.city } },
      ],
    };

    const searchResult = await getQdrantClient().search(QDRANT_COLLECTION, {
      vector: embedding,
      filter,
      limit: topK,
      with_payload: true,
    });

    return searchResult.map((hit: any) => ({
      id: hit.id.toString(),
      title: hit.payload.title,
      description: hit.payload.description || null,
      category: hit.payload.category || null,
      startTime: new Date(hit.payload.startTime),
      priceMin: hit.payload.priceMin ?? null,
      priceMax: hit.payload.priceMax ?? null,
      venueName: hit.payload.venueName || null,
      city: hit.payload.city,
      lat: hit.payload.lat ?? null,
      lon: hit.payload.lon ?? null,
      tags: hit.payload.tags || null,
      bookingUrl: hit.payload.bookingUrl || null,
      imageUrl: hit.payload.imageUrl || null,
      score: hit.score,
      source: 'vector' as const,
    }));
  } catch (error: any) {
    console.error('Qdrant search failed:', error.message);
    // Graceful degradation: return empty array
    return [];
  }
}

/**
 * Search Typesense for keyword-matched events
 */
async function searchTypesense(
  queryText: string,
  intention: Intention,
  topK: number = 100
): Promise<RetrievalCandidate[]> {
  try {
    const now = new Date(intention.nowISO);
    const untilTimestamp = Math.floor((now.getTime() + intention.tokens.untilMinutes * 60000) / 1000);
    const nowTimestamp = Math.floor(now.getTime() / 1000);

    const filterBy = [
      `city:=${intention.city}`,
      `start_time:>=${nowTimestamp}`,
      `start_time:<=${untilTimestamp}`,
    ];

    const searchParams = {
      q: queryText || '*',
      query_by: 'title,description,venue_name,neighborhood,tags',
      filter_by: filterBy.join(' && '),
      sort_by: '_text_match:desc,start_time:asc',
      per_page: topK,
    };

    const searchResult: TypesenseKeywordResponse = await getTypesenseClient()
      .collections(TYPESENSE_COLLECTION)
      .documents()
      .search(searchParams);

    const hits = searchResult.hits ?? [];

    return hits.map((hit) => {
      const doc = hit.document;
      return {
        id: doc.id,
        title: doc.title,
        description: doc.description || null,
        category: doc.category || null,
        startTime: new Date(doc.start_time * 1000),
        priceMin: doc.price_min ?? null,
        priceMax: doc.price_max ?? null,
        venueName: doc.venue_name || null,
        city: doc.city,
        lat: doc.lat ?? null,
        lon: doc.lon ?? null,
        tags: doc.tags || null,
        bookingUrl: doc.booking_url || null,
        imageUrl: doc.image_url || null,
        score: hit.text_match_info?.score ?? 0,
        source: 'keyword' as const,
      };
    });
  } catch (error: any) {
    console.error('Typesense search failed:', error.message);
    // Graceful degradation: return empty array
    return [];
  }
}

/**
 * Union and deduplicate candidates from multiple sources
 */
function unionCandidates(
  vectorCandidates: RetrievalCandidate[],
  keywordCandidates: RetrievalCandidate[]
): RetrievalCandidate[] {
  const seen = new Set<string>();
  const unioned: RetrievalCandidate[] = [];

  // Add vector candidates first (higher priority)
  for (const candidate of vectorCandidates) {
    if (!seen.has(candidate.id)) {
      seen.add(candidate.id);
      unioned.push(candidate);
    }
  }

  // Add keyword candidates that aren't already present
  for (const candidate of keywordCandidates) {
    if (!seen.has(candidate.id)) {
      seen.add(candidate.id);
      unioned.push({ ...candidate, source: 'hybrid' });
    }
  }

  return unioned;
}

/**
 * Rerank candidates using BGE reranker
 */
async function rerankCandidates(
  queryText: string,
  candidates: RetrievalCandidate[],
  topN: number = 20
): Promise<RetrievalCandidate[]> {
  const rerankerUrl = process.env.RERANKER_ENDPOINT_URL;

  if (!rerankerUrl) {
    console.warn('⚠️ RERANKER_ENDPOINT_URL not configured. Skipping rerank.');
    return candidates.slice(0, topN);
  }

  try {
    const passages = candidates.map(c => `${c.title}. ${c.description || ''}`);

    const response = await fetchWithTimeout(rerankerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: queryText, passages }),
    }, 5000);

    if (!response.ok) {
      throw new Error(`Reranker service error: ${response.status}`);
    }

    const data: any = await response.json();
    const scores: number[] = (data.scores || []) as number[];

    // Assign rerank scores
    const reranked = candidates.map((candidate, index) => ({
      ...candidate,
      score: scores[index] ?? candidate.score,
    }));

    // Sort by rerank score and take top N
    reranked.sort((a, b) => b.score - a.score);
    return reranked.slice(0, topN);
  } catch (error: any) {
    console.error('Reranker failed:', error.message);
    // Graceful degradation: return original order
    return candidates.slice(0, topN);
  }
}

/**
 * Fetch with timeout utility
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Database fallback: Direct Prisma query when search services are unavailable
 */
async function searchDatabase(
  queryText: string,
  intention: Intention,
  topK: number = 50
): Promise<RetrievalCandidate[]> {
  try {
    console.log('💾 [database-fallback] Searching directly in database...');

    const now = new Date(intention.nowISO);
    const untilMinutes = intention.tokens.untilMinutes || 4320; // Default to 72 hours if not set
    const untilDate = new Date(now.getTime() + untilMinutes * 60000);

    console.log('💾 [database-fallback] Query params:', {
      city: intention.city,
      queryText,
      now: now.toISOString(),
      untilDate: untilDate.toISOString(),
      untilMinutes,
    });

    // For now, just return all events in city+timeframe (text search can be added later)
    // TODO: Add full-text search support when available
    const events = await prisma.event.findMany({
      where: {
        city: intention.city,
        startTime: {
          gte: isNaN(now.getTime()) ? new Date() : now,
          lte: isNaN(untilDate.getTime()) ? new Date(Date.now() + 72 * 60 * 60 * 1000) : untilDate,
        },
      },
      take: topK,
      orderBy: [
        { startTime: 'asc' },
      ],
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        startTime: true,
        endTime: true,
        venueName: true,
        city: true,
        lat: true,
        lon: true,
        priceMin: true,
        priceMax: true,
        tags: true,
        imageUrl: true,
        bookingUrl: true,
      },
    });

    console.log(`💾 [database-fallback] Found ${events.length} events`);

    return events.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      category: event.category,
      startTime: event.startTime,
      priceMin: event.priceMin,
      priceMax: event.priceMax,
      venueName: event.venueName,
      city: event.city,
      lat: event.lat,
      lon: event.lon,
      tags: event.tags,
      bookingUrl: event.bookingUrl,
      imageUrl: event.imageUrl,
      score: 0.5, // Default score for database results
      source: 'keyword' as const,
    }));
  } catch (error: any) {
    console.error('💾 [database-fallback] Database search failed:', error.message);
    return [];
  }
}

/**
 * Main retrieval function: Hybrid search with optional reranking
 */
export async function retrieve(
  queryText: string,
  intention: Intention,
  options: RetrievalOptions = {}
): Promise<RetrievalResult> {
  const {
    topK = 100,
    rerankTop = 20,
    useReranker = true,
    timeout = 7000,
    cacheKey,
  } = options;

  const startTime = Date.now();

  // Check cache
  if (cacheKey) {
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log('✅ Cache hit:', cacheKey);
      return JSON.parse(cached) as RetrievalResult;
    }
  }

  // Run vector and keyword searches in parallel with timeout
  const searchPromise = Promise.all([
    searchQdrant(queryText, intention, topK),
    searchTypesense(queryText, intention, topK),
  ]);

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Retrieval timeout')), timeout)
  );

  let vectorCandidates: RetrievalCandidate[] = [];
  let keywordCandidates: RetrievalCandidate[] = [];

  try {
    [vectorCandidates, keywordCandidates] = await Promise.race([
      searchPromise,
      timeoutPromise,
    ]);
  } catch (error: any) {
    console.error('Retrieval error:', error.message);
    // Graceful degradation: continue with empty results
  }

  // Union results
  let candidates = unionCandidates(vectorCandidates, keywordCandidates);

  // Fallback to database if no candidates found from search services
  if (candidates.length === 0) {
    console.warn('⚠️  No candidates from search services, falling back to database');
    const dbCandidates = await searchDatabase(queryText, intention, topK);
    candidates = dbCandidates;
  }

  // Rerank if enabled and reranker is configured
  let rerankApplied = false;
  if (useReranker && process.env.RERANKER_ENDPOINT_URL) {
    try {
      candidates = await rerankCandidates(queryText, candidates, rerankTop);
      rerankApplied = true;
    } catch (error: any) {
      console.error('Rerank failed:', error.message);
      candidates = candidates.slice(0, rerankTop);
    }
  } else {
    candidates = candidates.slice(0, rerankTop);
  }

  const latencyMs = Date.now() - startTime;

  const result: RetrievalResult = {
    candidates,
    vectorCount: vectorCandidates.length,
    keywordCount: keywordCandidates.length,
    rerankApplied,
    latencyMs,
  };

  // Cache result
  if (cacheKey) {
    await cache.set(cacheKey, JSON.stringify(result), 60); // 1 minute TTL
  }

  console.log(`📊 Retrieved ${candidates.length} candidates (vector: ${vectorCandidates.length}, keyword: ${keywordCandidates.length}) in ${latencyMs}ms`);

  return result;
}

/**
 * Health check for retrieval services
 */
export async function healthCheck(): Promise<{
  qdrant: boolean;
  typesense: boolean;
  reranker: boolean;
}> {
  let qdrantHealthy = false;
  let typesenseHealthy = false;
  let rerankerHealthy = false;

  // Check Qdrant
  try {
    await getQdrantClient().getCollections();
    qdrantHealthy = true;
  } catch (error) {
    console.error('Qdrant health check failed');
  }

  // Check Typesense
  try {
    await getTypesenseClient().collections().retrieve();
    typesenseHealthy = true;
  } catch (error) {
    console.error('Typesense health check failed');
  }

  // Check Reranker
  if (process.env.RERANKER_ENDPOINT_URL) {
    try {
      const response = await fetchWithTimeout(
        `${process.env.RERANKER_ENDPOINT_URL}/health`,
        { method: 'GET' },
        2000
      );
      rerankerHealthy = response.ok;
    } catch (error) {
      console.error('Reranker health check failed');
    }
  }

  return { qdrant: qdrantHealthy, typesense: typesenseHealthy, reranker: rerankerHealthy };
}
