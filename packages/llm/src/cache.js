"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CACHE_TTL = void 0;
exports.withCache = withCache;
exports.cacheEmbedding = cacheEmbedding;
exports.cacheEmbeddingsBatch = cacheEmbeddingsBatch;
exports.cacheWebScrape = cacheWebScrape;
exports.cacheExtraction = cacheExtraction;
exports.cacheSearchResults = cacheSearchResults;
exports.cacheRanking = cacheRanking;
exports.cacheUserPersona = cacheUserPersona;
exports.updateCachedPersona = updateCachedPersona;
exports.invalidateCache = invalidateCache;
exports.getCacheStats = getCacheStats;
exports.clearAllCache = clearAllCache;
exports.warmupCache = warmupCache;
exports.closeRedisConnection = closeRedisConnection;
const redis_1 = require("redis");
const crypto_1 = require("crypto");
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
let redisClient = null;
let isConnected = false;
async function getRedisClient() {
    if (!redisClient) {
        redisClient = (0, redis_1.createClient)({
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
        }
        catch (error) {
            console.error('Failed to connect to Redis:', error);
            throw error;
        }
    }
    return redisClient;
}
function generateCacheKey(namespace, params) {
    const paramString = JSON.stringify(params, Object.keys(params).sort());
    const hash = (0, crypto_1.createHash)('sha256').update(paramString).digest('hex').slice(0, 16);
    return `citypass:${namespace}:${hash}`;
}
exports.CACHE_TTL = {
    EMBEDDING: 60 * 60 * 24 * 7,
    WEB_SCRAPE: 60 * 60 * 6,
    EXTRACTION: 60 * 60 * 12,
    SEARCH_RESULTS: 60 * 5,
    RANKING: 60 * 2,
    PERSONA: 60 * 60 * 24,
    INFERENCE: 60 * 60,
};
async function withCache(namespace, params, computeFn, options = {}) {
    const { ttl = exports.CACHE_TTL.INFERENCE, skipCache = false, refreshCache = false } = options;
    if (skipCache) {
        return await computeFn();
    }
    try {
        const client = await getRedisClient();
        const cacheKey = generateCacheKey(namespace, params);
        if (!refreshCache) {
            const cached = await client.get(cacheKey);
            if (cached) {
                console.log(`Cache HIT: ${namespace}`);
                return JSON.parse(cached);
            }
        }
        console.log(`Cache MISS: ${namespace}`);
        const result = await computeFn();
        client.setEx(cacheKey, ttl, JSON.stringify(result)).catch((err) => {
            console.error(`Failed to cache ${namespace}:`, err);
        });
        return result;
    }
    catch (error) {
        console.error('Cache error, computing directly:', error);
        return await computeFn();
    }
}
async function cacheEmbedding(text, model, generateFn) {
    return withCache('embedding', { text: text.slice(0, 1000), model }, generateFn, { ttl: exports.CACHE_TTL.EMBEDDING });
}
async function cacheEmbeddingsBatch(texts, model, generateFn) {
    const client = await getRedisClient();
    const results = [];
    const uncachedIndices = [];
    const uncachedTexts = [];
    for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        const cacheKey = generateCacheKey('embedding', { text: text.slice(0, 1000), model });
        try {
            const cached = await client.get(cacheKey);
            if (cached) {
                results[i] = JSON.parse(cached);
            }
            else {
                uncachedIndices.push(i);
                uncachedTexts.push(text);
                results[i] = [];
            }
        }
        catch (error) {
            uncachedIndices.push(i);
            uncachedTexts.push(text);
            results[i] = [];
        }
    }
    if (uncachedTexts.length > 0) {
        console.log(`Cache MISS: ${uncachedTexts.length}/${texts.length} embeddings`);
        const freshEmbeddings = await generateFn();
        for (let i = 0; i < uncachedIndices.length; i++) {
            const idx = uncachedIndices[i];
            const embedding = freshEmbeddings[i];
            results[idx] = embedding;
            const text = uncachedTexts[i];
            const cacheKey = generateCacheKey('embedding', { text: text.slice(0, 1000), model });
            client.setEx(cacheKey, exports.CACHE_TTL.EMBEDDING, JSON.stringify(embedding)).catch((err) => {
                console.error('Failed to cache embedding:', err);
            });
        }
    }
    else {
        console.log(`Cache HIT: ${texts.length}/${texts.length} embeddings`);
    }
    return results;
}
async function cacheWebScrape(url, scrapeFn) {
    return withCache('web-scrape', { url }, scrapeFn, { ttl: exports.CACHE_TTL.WEB_SCRAPE });
}
async function cacheExtraction(html, url, extractFn) {
    return withCache('extraction', { url }, extractFn, { ttl: exports.CACHE_TTL.EXTRACTION });
}
async function cacheSearchResults(query, filters, searchFn) {
    return withCache('search', { query, filters }, searchFn, { ttl: exports.CACHE_TTL.SEARCH_RESULTS });
}
async function cacheRanking(eventIds, userId, context, rankFn) {
    return withCache('ranking', { eventIds: eventIds.sort(), userId, context }, rankFn, { ttl: exports.CACHE_TTL.RANKING });
}
async function cacheUserPersona(sessionId, computeFn, options = {}) {
    if (options.skipCache) {
        return await computeFn();
    }
    try {
        const client = await getRedisClient();
        const cacheKey = `citypass:persona:${sessionId}`;
        const cached = await client.get(cacheKey);
        if (cached) {
            console.log(`Cache HIT: persona ${sessionId}`);
            return JSON.parse(cached);
        }
        console.log(`Cache MISS: persona ${sessionId}`);
        const result = await computeFn();
        await client.setEx(cacheKey, exports.CACHE_TTL.PERSONA, JSON.stringify(result));
        return result;
    }
    catch (error) {
        console.error('Persona cache error:', error);
        return await computeFn();
    }
}
async function updateCachedPersona(sessionId, persona) {
    try {
        const client = await getRedisClient();
        const cacheKey = `citypass:persona:${sessionId}`;
        await client.setEx(cacheKey, exports.CACHE_TTL.PERSONA, JSON.stringify(persona));
        console.log(`Updated cached persona: ${sessionId}`);
    }
    catch (error) {
        console.error('Failed to update cached persona:', error);
    }
}
async function invalidateCache(pattern) {
    try {
        const client = await getRedisClient();
        const keys = await client.keys(`citypass:${pattern}*`);
        if (keys.length === 0) {
            return 0;
        }
        await client.del(keys);
        console.log(`Invalidated ${keys.length} cache entries matching: ${pattern}`);
        return keys.length;
    }
    catch (error) {
        console.error('Failed to invalidate cache:', error);
        return 0;
    }
}
async function getCacheStats() {
    try {
        const client = await getRedisClient();
        const keys = await client.keys('citypass:*');
        const info = await client.info('memory');
        const memoryMatch = info.match(/used_memory_human:(\S+)/);
        const memoryUsed = memoryMatch ? memoryMatch[1] : 'unknown';
        const stats = await client.info('stats');
        const hitsMatch = stats.match(/keyspace_hits:(\d+)/);
        const missesMatch = stats.match(/keyspace_misses:(\d+)/);
        let hitRate;
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
    }
    catch (error) {
        console.error('Failed to get cache stats:', error);
        return {
            connected: false,
            keyCount: 0,
            memoryUsed: 'unknown',
        };
    }
}
async function clearAllCache() {
    try {
        const client = await getRedisClient();
        const keys = await client.keys('citypass:*');
        if (keys.length > 0) {
            await client.del(keys);
            console.log(`Cleared ${keys.length} cache entries`);
        }
    }
    catch (error) {
        console.error('Failed to clear cache:', error);
    }
}
async function warmupCache(embedTexts, generateEmbeddingFn) {
    let cached = 0;
    let failed = 0;
    console.log(`Warming up cache with ${embedTexts.length} embeddings...`);
    for (const text of embedTexts) {
        try {
            await cacheEmbedding(text, 'bge-m3', () => generateEmbeddingFn(text));
            cached++;
        }
        catch (error) {
            console.error('Warmup failed for text:', text.slice(0, 50), error);
            failed++;
        }
    }
    console.log(`Warmup complete: ${cached} cached, ${failed} failed`);
    return { cached, failed };
}
async function closeRedisConnection() {
    if (redisClient && isConnected) {
        await redisClient.quit();
        isConnected = false;
        redisClient = null;
        console.log('Redis connection closed');
    }
}
//# sourceMappingURL=cache.js.map