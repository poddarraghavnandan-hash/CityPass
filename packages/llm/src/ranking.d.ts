export interface RankableEvent {
    id: string;
    title: string;
    description?: string;
    category: string;
    city: string;
    startTime: string;
    priceMin?: number;
    priceMax?: number;
    venueName?: string;
    neighborhood?: string;
    tags?: string[];
    viewCount?: number;
    saveCount?: number;
    shareCount?: number;
    clickCount?: number;
    viewCount24h?: number;
    saveCount24h?: number;
    imageUrl?: string;
    hasDescription: boolean;
    hasVenue: boolean;
    hasPrice: boolean;
    embedding?: number[];
}
export interface UserProfile {
    sessionId: string;
    userId?: string;
    favoriteCategories?: string[];
    favoriteCities?: string[];
    priceRange?: {
        min: number;
        max: number;
    };
    viewedCategories?: Map<string, number>;
    likedCategories?: Map<string, number>;
    viewedVenues?: Map<string, number>;
    viewedNeighborhoods?: Map<string, number>;
    avgSessionDuration?: number;
    preferredTimeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
    avgPricePoint?: number;
    preferenceEmbedding?: number[];
}
export interface RankingContext {
    query?: string;
    queryEmbedding?: number[];
    city?: string;
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
    dayOfWeek?: number;
    date?: Date;
    device?: 'mobile' | 'desktop';
    referrer?: string;
}
interface RankingFeatures {
    categoryMatch: number;
    cityMatch: number;
    priceMatch: number;
    semanticSimilarity: number;
    popularity: number;
    recency: number;
    quality: number;
    engagement: number;
    timeMatch: number;
    trending: number;
    score: number;
}
export declare function recallStage(context: RankingContext, userProfile?: UserProfile, options?: {
    maxCandidates?: number;
    strategies?: ('semantic' | 'category' | 'collaborative' | 'trending' | 'popular')[];
}): Promise<string[]>;
export declare function coarseRanking(events: RankableEvent[], context: RankingContext, userProfile?: UserProfile): RankableEvent[];
export declare function fineRanking(events: RankableEvent[], context: RankingContext, userProfile?: UserProfile): Promise<Array<{
    event: RankableEvent;
    score: number;
    features: RankingFeatures;
}>>;
export declare function rankEvents(context: RankingContext, userProfile?: UserProfile, options?: {
    maxResults?: number;
    includeFeatures?: boolean;
}): Promise<Array<{
    event: RankableEvent;
    score: number;
    features?: RankingFeatures;
}>>;
export {};
//# sourceMappingURL=ranking.d.ts.map