/**
 * Redis Caching Layer for LLM/ML Operations
 * - Cache embeddings (reduce compute by 80%)
 * - Cache web scraping results
 * - Cache ML model inferences
 * - Improve response times for repeated queries
 */

import { createClient, RedisClientType } from 'redis';
import { createHash } from 'crypto';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Singleton Redis client
let redisClient: RedisClientType | null = null;
let isConnected = false;

/**
 * Get or create Redis client
 */
async function getRedisClient(): Promise<RedisClientType> {
  if (!redisClient) {
    redisClient = createClient({
      url: REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('Redis: Max reconnection attempts reached');
            return new Error('Redis connection failed');
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
      isConnected = false;
    });

    redisClient.on('connect', () => {
      console.log('Redis Client Connected');
      isConnected = true;
    });

    redisClient.on('reconnecting', () => {
      console.log('Redis Client Reconnecting...');
    });
  }

  if (!isConnected) {
    try {
      await redisClient.connect();
      isConnected = true;
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  return redisClient;
}

/**
 * Generate cache key from parameters
 */
function generateCacheKey(namespace: string, params: any): string {
  const paramString = JSON.stringify(params, Object.keys(params).sort());
  const hash = createHash('sha256').update(paramString).digest('hex').slice(0, 16);
  return `citypass:${namespace}:${hash}`;
}

/**
 * Cache TTL configurations (in seconds)
 */
export const CACHE_TTL = {
  // Embeddings (long-lived, rarely change)
  EMBEDDING: 60 * 60 * 24 * 7, // 7 days

  // Web scraping (medium-lived, events change)
  WEB_SCRAPE: 60 * 60 * 6, // 6 hours

  // Event extraction (medium-lived)
  EXTRACTION: 60 * 60 * 12, // 12 hours

  // Search results (short-lived, user-specific)
  SEARCH_RESULTS: 60 * 5, // 5 minutes

  // Ranking results (short-lived, personalized)
  RANKING: 60 * 2, // 2 minutes

  // User personas (session-based)
  PERSONA: 60 * 60 * 24, // 24 hours

  // ML inferences (medium-lived)
  INFERENCE: 60 * 60, // 1 hour
} as const;

/**
 * Generic cache wrapper with automatic serialization
 */
export async function withCache<T>(
  namespace: string,
  params: any,
  computeFn: () => Promise<T>,
  options: {
    ttl?: number;
    skipCache?: boolean;
    refreshCache?: boolean;
  } = {}
): Promise<T> {
  const { ttl = CACHE_TTL.INFERENCE, skipCache = false, refreshCache = false } = options;

  // Skip cache if requested
  if (skipCache) {
    return await computeFn();
  }

  try {
    const client = await getRedisClient();
    const cacheKey = generateCacheKey(namespace, params);

    // Try to get from cache (unless refreshing)
    if (!refreshCache) {
      const cached = await client.get(cacheKey);
      if (cached) {
        console.log(`Cache HIT: ${namespace}`);
        return JSON.parse(cached) as T;
      }
    }

    console.log(`Cache MISS: ${namespace}`);

    // Compute value
    const result = await computeFn();

    // Store in cache (fire and forget)
    client.setEx(cacheKey, ttl, JSON.stringify(result)).catch((err) => {
      console.error(`Failed to cache ${namespace}:`, err);
    });

    return result;
  } catch (error) {
    // If Redis fails, fallback to computing directly
    console.error('Cache error, computing directly:', error);
    return await computeFn();
  }
}

/**
 * Cache embeddings by text content
 */
export async function cacheEmbedding(
  text: string,
  model: string,
  generateFn: () => Promise<number[]>
): Promise<number[]> {
  return withCache(
    'embedding',
    { text: text.slice(0, 1000), model }, // Truncate text for key generation
    generateFn,
    { ttl: CACHE_TTL.EMBEDDING }
  );
}

/**
 * Cache batch embeddings
 */
export async function cacheEmbeddingsBatch(
  texts: string[],
  model: string,
  generateFn: () => Promise<number[][]>
): Promise<number[][]> {
  // For batch, we cache individually and aggregate
  const client = await getRedisClient();
  const results: number[][] = [];
  const uncachedIndices: number[] = [];
  const uncachedTexts: string[] = [];

  // Check cache for each text
  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    const cacheKey = generateCacheKey('embedding', { text: text.slice(0, 1000), model });

    try {
      const cached = await client.get(cacheKey);
      if (cached) {
        results[i] = JSON.parse(cached) as number[];
      } else {
        uncachedIndices.push(i);
        uncachedTexts.push(text);
        results[i] = []; // Placeholder
      }
    } catch (error) {
      uncachedIndices.push(i);
      uncachedTexts.push(text);
      results[i] = [];
    }
  }

  // Generate uncached embeddings
  if (uncachedTexts.length > 0) {
    console.log(`Cache MISS: ${uncachedTexts.length}/${texts.length} embeddings`);
    const freshEmbeddings = await generateFn();

    // Store in cache and update results
    for (let i = 0; i < uncachedIndices.length; i++) {
      const idx = uncachedIndices[i];
      const embedding = freshEmbeddings[i];
      results[idx] = embedding;

      // Cache individual embedding
      const text = uncachedTexts[i];
      const cacheKey = generateCacheKey('embedding', { text: text.slice(0, 1000), model });
      client.setEx(cacheKey, CACHE_TTL.EMBEDDING, JSON.stringify(embedding)).catch((err) => {
        console.error('Failed to cache embedding:', err);
      });
    }
  } else {
    console.log(`Cache HIT: ${texts.length}/${texts.length} embeddings`);
  }

  return results;
}

/**
 * Cache web scraping results
 */
export async function cacheWebScrape(
  url: string,
  scrapeFn: () => Promise<{ html: string; markdown?: string; metadata?: any }>
): Promise<{ html: string; markdown?: string; metadata?: any }> {
  return withCache(
    'web-scrape',
    { url },
    scrapeFn,
    { ttl: CACHE_TTL.WEB_SCRAPE }
  );
}

/**
 * Cache event extraction results
 */
export async function cacheExtraction<T>(
  html: string,
  url: string,
  extractFn: () => Promise<T>
): Promise<T> {
  // Use URL as primary key (same URL = same event)
  return withCache(
    'extraction',
    { url },
    extractFn,
    { ttl: CACHE_TTL.EXTRACTION }
  );
}

/**
 * Cache search results (with short TTL for freshness)
 */
export async function cacheSearchResults<T>(
  query: string,
  filters: any,
  searchFn: () => Promise<T>
): Promise<T> {
  return withCache(
    'search',
    { query, filters },
    searchFn,
    { ttl: CACHE_TTL.SEARCH_RESULTS }
  );
}

/**
 * Cache ranking results (personalized, very short TTL)
 */
export async function cacheRanking<T>(
  eventIds: string[],
  userId: string,
  context: any,
  rankFn: () => Promise<T>
): Promise<T> {
  return withCache(
    'ranking',
    { eventIds: eventIds.sort(), userId, context },
    rankFn,
    { ttl: CACHE_TTL.RANKING }
  );
}

/**
 * Cache user persona (session-based)
 */
export async function cacheUserPersona<T>(
  sessionId: string,
  computeFn: () => Promise<T>,
  options: { skipCache?: boolean } = {}
): Promise<T> {
  if (options.skipCache) {
    return await computeFn();
  }

  try {
    const client = await getRedisClient();
    const cacheKey = `citypass:persona:${sessionId}`;

    // Get from cache
    const cached = await client.get(cacheKey);
    if (cached) {
      console.log(`Cache HIT: persona ${sessionId}`);
      return JSON.parse(cached) as T;
    }

    console.log(`Cache MISS: persona ${sessionId}`);

    // Compute
    const result = await computeFn();

    // Store with session TTL
    await client.setEx(cacheKey, CACHE_TTL.PERSONA, JSON.stringify(result));

    return result;
  } catch (error) {
    console.error('Persona cache error:', error);
    return await computeFn();
  }
}

/**
 * Update user persona in cache (for incremental updates)
 */
export async function updateCachedPersona(sessionId: string, persona: any): Promise<void> {
  try {
    const client = await getRedisClient();
    const cacheKey = `citypass:persona:${sessionId}`;
    await client.setEx(cacheKey, CACHE_TTL.PERSONA, JSON.stringify(persona));
    console.log(`Updated cached persona: ${sessionId}`);
  } catch (error) {
    console.error('Failed to update cached persona:', error);
  }
}

/**
 * Invalidate cache by pattern
 */
export async function invalidateCache(pattern: string): Promise<number> {
  try {
    const client = await getRedisClient();
    const keys = await client.keys(`citypass:${pattern}*`);

    if (keys.length === 0) {
      return 0;
    }

    await client.del(keys);
    console.log(`Invalidated ${keys.length} cache entries matching: ${pattern}`);
    return keys.length;
  } catch (error) {
    console.error('Failed to invalidate cache:', error);
    return 0;
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  connected: boolean;
  keyCount: number;
  memoryUsed: string;
  hitRate?: number;
}> {
  try {
    const client = await getRedisClient();

    // Get key count
    const keys = await client.keys('citypass:*');

    // Get memory info
    const info = await client.info('memory');
    const memoryMatch = info.match(/used_memory_human:(\S+)/);
    const memoryUsed = memoryMatch ? memoryMatch[1] : 'unknown';

    // Get stats info for hit rate
    const stats = await client.info('stats');
    const hitsMatch = stats.match(/keyspace_hits:(\d+)/);
    const missesMatch = stats.match(/keyspace_misses:(\d+)/);

    let hitRate: number | undefined;
    if (hitsMatch && missesMatch) {
      const hits = parseInt(hitsMatch[1]);
      const misses = parseInt(missesMatch[1]);
      const total = hits + misses;
      hitRate = total > 0 ? (hits / total) * 100 : undefined;
    }

    return {
      connected: isConnected,
      keyCount: keys.length,
      memoryUsed,
      hitRate,
    };
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    return {
      connected: false,
      keyCount: 0,
      memoryUsed: 'unknown',
    };
  }
}

/**
 * Clear all CityPass cache
 */
export async function clearAllCache(): Promise<void> {
  try {
    const client = await getRedisClient();
    const keys = await client.keys('citypass:*');

    if (keys.length > 0) {
      await client.del(keys);
      console.log(`Cleared ${keys.length} cache entries`);
    }
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
}

/**
 * Warmup cache with common queries
 */
export async function warmupCache(
  embedTexts: string[],
  generateEmbeddingFn: (text: string) => Promise<number[]>
): Promise<{ cached: number; failed: number }> {
  let cached = 0;
  let failed = 0;

  console.log(`Warming up cache with ${embedTexts.length} embeddings...`);

  for (const text of embedTexts) {
    try {
      await cacheEmbedding(text, 'bge-m3', () => generateEmbeddingFn(text));
      cached++;
    } catch (error) {
      console.error('Warmup failed for text:', text.slice(0, 50), error);
      failed++;
    }
  }

  console.log(`Warmup complete: ${cached} cached, ${failed} failed`);
  return { cached, failed };
}

/**
 * Close Redis connection
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient && isConnected) {
    await redisClient.quit();
    isConnected = false;
    redisClient = null;
    console.log('Redis connection closed');
  }
}
