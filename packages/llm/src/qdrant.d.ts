export declare function ensureEventsCollection(): Promise<void>;
export declare function indexEventVector(event: {
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
}): Promise<string>;
export declare function searchEvents(query: string, city?: string, limit?: number): Promise<Array<{
    eventId: string;
    score: number;
    title: string;
    description?: string;
    category?: string;
    venueName?: string;
}>>;
export declare function hybridSearch(query: string, keywordResults: string[], city?: string, limit?: number): Promise<Array<{
    eventId: string;
    score: number;
    title: string;
    description?: string;
}>>;
export declare function deleteEventVector(qdrantId: string): Promise<void>;
export declare function updateEventVector(qdrantId: string, event: Parameters<typeof indexEventVector>[0]): Promise<void>;
//# sourceMappingURL=qdrant.d.ts.map