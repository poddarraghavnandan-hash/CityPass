export declare function canonicalUrlHash(url: string): string;
export declare function contentChecksum(data: Record<string, any>): string;
export declare function canonicalVenueName(name: string): string;
export declare function extractDomain(url: string): string;
export declare function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries?: number, baseDelayMs?: number): Promise<T>;
export declare function normalizeCategory(cat: string | undefined): string | undefined;
export declare function sleep(ms: number): Promise<void>;
export declare function chunk<T>(array: T[], size: number): T[][];
//# sourceMappingURL=index.d.ts.map