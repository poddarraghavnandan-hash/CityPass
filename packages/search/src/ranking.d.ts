import { Event } from '@citypass/db';
export interface UserContext {
    sessionId: string;
    userId?: string;
    city: string;
    coords?: {
        lat: number;
        lon: number;
    };
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'late';
    dayOfWeek: string;
    deviceType: 'mobile' | 'tablet' | 'desktop';
    query?: string;
    prefs?: {
        categories?: string[];
        neighborhoods?: string[];
        priceMin?: number;
        priceMax?: number;
    };
}
export interface EventFeatures {
    textualSimilarity: number;
    semanticSimilarity: number;
    hoursUntilEvent: number;
    isDuringPreferredTime: number;
    isDuringWeekend: number;
    distanceKm: number;
    isInPreferredNeighborhood: number;
    isPreferredCategory: number;
    priceLevel: number;
    isInPriceBudget: number;
    viewCount24h: number;
    saveCount24h: number;
    friendSaveCount: number;
    venueQualityScore: number;
    isNewVenue: number;
    hasBeenSeen: number;
    categoryDiversity: number;
}
export interface RankingWeights {
    version: number;
    weights: {
        textualSimilarity: number;
        semanticSimilarity: number;
        hoursUntilEvent: number;
        isDuringPreferredTime: number;
        isDuringWeekend: number;
        distanceKm: number;
        isInPreferredNeighborhood: number;
        isPreferredCategory: number;
        priceLevel: number;
        isInPriceBudget: number;
        viewCount24h: number;
        saveCount24h: number;
        friendSaveCount: number;
        venueQualityScore: number;
        isNewVenue: number;
        hasBeenSeen: number;
        categoryDiversity: number;
    };
}
export declare const DEFAULT_WEIGHTS: RankingWeights;
export declare function extractFeatures(event: Event & {
    viewCount?: number;
    saveCount?: number;
    friendSaves?: number;
}, context: UserContext, seenEventIds?: Set<string>, recentCategories?: string[]): EventFeatures;
export declare function computeScore(features: EventFeatures, weights: RankingWeights): number;
export interface BanditArm {
    eventId: string;
    alpha: number;
    beta: number;
}
export declare function sampleThompson(arm: BanditArm): number;
export interface EpsilonGreedyResult {
    scores: number[];
    explorationIndexes: number[];
}
export declare function applyEpsilonGreedyWithExploration(scores: number[], epsilon?: number, topN?: number): EpsilonGreedyResult;
export declare function applyEpsilonGreedy(scores: number[], epsilon?: number): number[];
export declare function addExplorationBonus(score: number, impressionCount: number, totalImpressions: number): number;
//# sourceMappingURL=ranking.d.ts.map