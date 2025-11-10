import type { Intention } from '@citypass/types';
export interface FitScoreComponent {
    key: string;
    label: string;
    value: number;
    weight: number;
    contribution: number;
}
export interface FitScoreArgs {
    event: {
        id: string;
        category?: string | null;
        startTime: Date;
        priceMin?: number | null;
        priceMax?: number | null;
        lat?: number | null;
        lon?: number | null;
        tags?: string[] | null;
    };
    intention: Intention;
    textualSimilarity: number;
    semanticSimilarity: number;
    distanceKm?: number | null;
    socialProof?: {
        views: number;
        saves: number;
        friends: number;
    };
}
export interface FitScoreResult {
    score: number;
    moodScore: number;
    socialHeat: number;
    reasons: string[];
    components: FitScoreComponent[];
}
export declare function calculateFitScore(args: FitScoreArgs): FitScoreResult;
//# sourceMappingURL=fitScore.d.ts.map