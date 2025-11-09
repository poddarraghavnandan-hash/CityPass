export interface ExtractionResult<T> {
    data: T;
    confidence: number;
    tier: 'llama' | 'haiku' | 'sonnet';
    retries: number;
    tokens?: {
        input: number;
        output: number;
    };
    cost?: number;
}
export interface ExtractedEvent {
    title: string;
    subtitle?: string;
    description?: string;
    startTime: string;
    endTime?: string;
    venueName?: string;
    address?: string;
    neighborhood?: string;
    city: string;
    category?: string;
    priceMin?: number;
    priceMax?: number;
    currency?: string;
    tags?: string[];
    imageUrl?: string;
    bookingUrl?: string;
    organizer?: string;
    contactInfo?: string;
    ageRestriction?: string;
    capacity?: number;
    accessibility?: string[];
}
export declare function extractEvent(html: string, url: string, options?: {
    startTier?: 'llama' | 'haiku' | 'sonnet';
    maxRetries?: number;
    confidenceThreshold?: number;
    skipCache?: boolean;
}): Promise<ExtractionResult<ExtractedEvent>>;
export declare function extractEventsBatch(htmlContents: Array<{
    html: string;
    url: string;
}>, options?: {
    startTier?: 'llama' | 'haiku' | 'sonnet';
    maxConcurrent?: number;
    confidenceThreshold?: number;
}): Promise<ExtractionResult<ExtractedEvent>[]>;
export declare function calculateExtractionCost(results: ExtractionResult<ExtractedEvent>[]): {
    totalCost: number;
    breakdown: {
        llama: {
            count: number;
            cost: number;
        };
        haiku: {
            count: number;
            cost: number;
        };
        sonnet: {
            count: number;
            cost: number;
        };
    };
};
//# sourceMappingURL=extraction.d.ts.map