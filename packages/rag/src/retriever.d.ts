import type { Intention } from '@citypass/types';
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
export declare function retrieve(queryText: string, intention: Intention, options?: RetrievalOptions): Promise<RetrievalResult>;
export declare function healthCheck(): Promise<{
    qdrant: boolean;
    typesense: boolean;
    reranker: boolean;
}>;
//# sourceMappingURL=retriever.d.ts.map