import { createClient, RedisClientType } from 'redis';

/**
 * CacheService
 * Provides a unified caching interface with Redis support and in-memory fallback.
 */
export class CacheService {
  private static instance: CacheService;
  private redisClient: RedisClientType | null = null;
  private memoryCache: Map<string, { value: string; expiresAt: number }> = new Map();
  private isRedisConnected = false;

  private constructor() {
    this.initRedis();
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  private async initRedis() {
    if (process.env.REDIS_URL) {
      try {
        this.redisClient = createClient({
          url: process.env.REDIS_URL,
        });

        this.redisClient.on('error', (err) => {
          console.warn('[CacheService] Redis Client Error', err);
          this.isRedisConnected = false;
        });

        this.redisClient.on('connect', () => {
          console.log('[CacheService] Redis Client Connected');
          this.isRedisConnected = true;
        });

        await this.redisClient.connect();
      } catch (error) {
        console.warn('[CacheService] Failed to connect to Redis, using memory cache', error);
        this.isRedisConnected = false;
      }
    } else {
      console.log('[CacheService] No REDIS_URL provided, using memory cache');
    }
  }

  /**
   * Get a value from cache
   */
  public async get(key: string): Promise<string | null> {
    if (this.isRedisConnected && this.redisClient) {
      try {
        return await this.redisClient.get(key);
      } catch (error) {
        console.warn('[CacheService] Redis get failed', error);
      }
    }

    // Fallback to memory cache
    const item = this.memoryCache.get(key);
    if (item) {
      if (item.expiresAt > Date.now()) {
        return item.value;
      } else {
        this.memoryCache.delete(key);
      }
    }
    return null;
  }

  /**
   * Set a value in cache
   * @param ttlSeconds Time to live in seconds (default: 1 hour)
   */
  public async set(key: string, value: string, ttlSeconds: number = 3600): Promise<void> {
    if (this.isRedisConnected && this.redisClient) {
      try {
        await this.redisClient.set(key, value, { EX: ttlSeconds });
        return;
      } catch (error) {
        console.warn('[CacheService] Redis set failed', error);
      }
    }

    // Fallback to memory cache
    this.memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Delete a value from cache
   */
  public async del(key: string): Promise<void> {
    if (this.isRedisConnected && this.redisClient) {
      try {
        await this.redisClient.del(key);
        return;
      } catch (error) {
        console.warn('[CacheService] Redis del failed', error);
      }
    }

    this.memoryCache.delete(key);
  }
}

export const cache = CacheService.getInstance();

import crypto from 'crypto';

/**
 * Cache wrapper for single embedding generation
 */
export async function cacheEmbedding(
  text: string,
  model: string,
  generator: () => Promise<number[]>
): Promise<number[]> {
  const hash = crypto.createHash('md5').update(`${model}:${text}`).digest('hex');
  const key = `emb:${hash}`;

  const cached = await cache.get(key);
  if (cached) {
    return JSON.parse(cached);
  }

  const result = await generator();
  await cache.set(key, JSON.stringify(result), 86400 * 30); // 30 days
  return result;
}

/**
 * Cache wrapper for batch embedding generation
 */
export async function cacheEmbeddingsBatch(
  texts: string[],
  model: string,
  generator: () => Promise<number[][]>
): Promise<number[][]> {
  // For now, just pass through to generator to avoid complex partial batch logic
  // TODO: Implement individual item caching for batches
  return generator();
}

/**
 * Cache wrapper for extraction
 */
export async function cacheExtraction<T>(
  text: string,
  keyContext: string,
  generator: () => Promise<T>
): Promise<T> {
  const hash = crypto.createHash('md5').update(`${keyContext}:${text}`).digest('hex');
  const key = `extract:${hash}`;

  const cached = await cache.get(key);
  if (cached) {
    return JSON.parse(cached);
  }

  const result = await generator();
  await cache.set(key, JSON.stringify(result), 86400 * 7); // 7 days
  return result;
}

// Stubs for other missing functions to satisfy imports
export const withCache = async <T>(key: string, fn: () => Promise<T>, ttl?: number) => {
  const cached = await cache.get(key);
  if (cached) return JSON.parse(cached);
  const res = await fn();
  await cache.set(key, JSON.stringify(res), ttl);
  return res;
};

export const cacheWebScrape = async (url: string, fn: () => Promise<string>) => withCache(`scrape:${url}`, fn, 86400);
export const cacheSearchResults = async (query: string, fn: () => Promise<any>) => withCache(`search:${query}`, fn, 3600);
export const cacheRanking = async (key: string, fn: () => Promise<any>) => withCache(`rank:${key}`, fn, 3600);
export const cacheUserPersona = async (id: string, fn: () => Promise<any>) => withCache(`persona:${id}`, fn, 3600);
export const updateCachedPersona = async (id: string, data: any) => cache.set(`persona:${id}`, JSON.stringify(data), 3600);
export const invalidateCache = async (key: string) => cache.del(key);
export const getCacheStats = () => ({
  connected: false,
  hits: 0,
  misses: 0,
  keys: 0,
  memoryUsed: 0,
});
export const clearAllCache = async () => { };
export const warmupCache = async () => { };
export const closeRedisConnection = async () => { };
export const CACHE_TTL = {
  SHORT: 60,
  MEDIUM: 3600,
  LONG: 86400,
};
