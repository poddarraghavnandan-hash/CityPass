export declare const CACHE_TTL: {
    readonly EMBEDDING: number;
    readonly WEB_SCRAPE: number;
    readonly EXTRACTION: number;
    readonly SEARCH_RESULTS: number;
    readonly RANKING: number;
    readonly PERSONA: number;
    readonly INFERENCE: number;
};
export declare function withCache<T>(namespace: string, params: any, computeFn: () => Promise<T>, options?: {
    ttl?: number;
    skipCache?: boolean;
    refreshCache?: boolean;
}): Promise<T>;
export declare function cacheEmbedding(text: string, model: string, generateFn: () => Promise<number[]>): Promise<number[]>;
export declare function cacheEmbeddingsBatch(texts: string[], model: string, generateFn: () => Promise<number[][]>): Promise<number[][]>;
export declare function cacheWebScrape(url: string, scrapeFn: () => Promise<{
    html: string;
    markdown?: string;
    metadata?: any;
}>): Promise<{
    html: string;
    markdown?: string;
    metadata?: any;
}>;
export declare function cacheExtraction<T>(html: string, url: string, extractFn: () => Promise<T>): Promise<T>;
export declare function cacheSearchResults<T>(query: string, filters: any, searchFn: () => Promise<T>): Promise<T>;
export declare function cacheRanking<T>(eventIds: string[], userId: string, context: any, rankFn: () => Promise<T>): Promise<T>;
export declare function cacheUserPersona<T>(sessionId: string, computeFn: () => Promise<T>, options?: {
    skipCache?: boolean;
}): Promise<T>;
export declare function updateCachedPersona(sessionId: string, persona: any): Promise<void>;
export declare function invalidateCache(pattern: string): Promise<number>;
export declare function getCacheStats(): Promise<{
    connected: boolean;
    keyCount: number;
    memoryUsed: string;
    hitRate?: number;
}>;
export declare function clearAllCache(): Promise<void>;
export declare function warmupCache(embedTexts: string[], generateEmbeddingFn: (text: string) => Promise<number[]>): Promise<{
    cached: number;
    failed: number;
}>;
export declare function closeRedisConnection(): Promise<void>;
//# sourceMappingURL=cache.d.ts.map