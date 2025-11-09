import type { ExtractedEvent, ExtractionResult } from './extraction';
type Provider = 'anthropic' | 'openai';
type TierLevel = 'local' | 'cheap' | 'balanced' | 'flagship';
export declare function extractEventEnhanced(html: string, url: string, options?: {
    startTier?: TierLevel;
    maxRetries?: number;
    confidenceThreshold?: number;
    skipCache?: boolean;
    preferredProvider?: Provider;
}): Promise<ExtractionResult<ExtractedEvent>>;
export declare function extractEventsBatchEnhanced(htmlContents: Array<{
    html: string;
    url: string;
}>, options?: {
    startTier?: TierLevel;
    maxConcurrent?: number;
    confidenceThreshold?: number;
}): Promise<ExtractionResult<ExtractedEvent>[]>;
export declare function calculateExtractionCostEnhanced(results: ExtractionResult<ExtractedEvent>[]): {
    totalCost: number;
    breakdown: Record<string, {
        count: number;
        cost: number;
    }>;
    avgConfidence: number;
};
export {};
//# sourceMappingURL=extraction-enhanced.d.ts.map