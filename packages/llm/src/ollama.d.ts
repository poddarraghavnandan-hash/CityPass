export declare function generateEmbedding(text: string): Promise<number[]>;
export declare function generateEmbeddings(texts: string[]): Promise<number[][]>;
export declare function rerank(query: string, documents: {
    id: string;
    text: string;
}[]): Promise<{
    id: string;
    text: string;
    score: number;
}[]>;
export declare function generateResponse(prompt: string, systemPrompt?: string): Promise<string>;
export declare function generateStreamingResponse(prompt: string, systemPrompt: string | undefined, onChunk: (chunk: string) => void): Promise<void>;
export declare function extractStructured<T>(text: string, schema: Record<string, any>): Promise<T>;
export declare function summarize(text: string, maxLength?: number): Promise<string>;
//# sourceMappingURL=ollama.d.ts.map