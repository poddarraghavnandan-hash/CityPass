export type EmbeddingModel = 'bge-m3' | 'e5-base-v2' | 'gte-small' | 'minilm-l6-v2' | 'voyage-2' | 'claude-embeddings';
export type EmbeddingUseCase = 'event-indexing' | 'query-search' | 'event-similarity' | 'reranking' | 'user-preference' | 'category-matching' | 'domain-specific';
export declare const MODEL_CONFIG: Record<EmbeddingModel, {
    dimensions: number;
    maxTokens: number;
    provider: 'ollama' | 'api';
    costPer1MTokens?: number;
    avgLatency?: number;
    useCases: EmbeddingUseCase[];
}>;
export declare function selectModelForUseCase(useCase: EmbeddingUseCase, preferLocal?: boolean): EmbeddingModel;
export declare function generateEmbedding(text: string, options?: {
    useCase?: EmbeddingUseCase;
    model?: EmbeddingModel;
    normalize?: boolean;
    skipCache?: boolean;
}): Promise<number[]>;
export declare function generateEmbeddingsBatch(texts: string[], options?: {
    useCase?: EmbeddingUseCase;
    model?: EmbeddingModel;
    batchSize?: number;
    normalize?: boolean;
    skipCache?: boolean;
}): Promise<number[][]>;
export declare function normalizeVector(vector: number[]): number[];
export declare function cosineSimilarity(a: number[], b: number[]): number;
export declare function findMostSimilar(queryEmbedding: number[], candidateEmbeddings: number[][]): {
    index: number;
    similarity: number;
}[];
export declare function prepareEventTextForEmbedding(event: {
    title: string;
    description?: string;
    category?: string;
    venueName?: string;
    neighborhood?: string;
    tags?: string[];
}): string;
export declare function prepareQueryForEmbedding(query: string, context?: {
    category?: string;
    city?: string;
    timePreference?: string;
}): string;
//# sourceMappingURL=embeddings.d.ts.map