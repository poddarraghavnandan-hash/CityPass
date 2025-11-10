import { AdCampaign, AdCreative, AdTargeting, AdSlot } from '@citypass/db';
export interface AdContext {
    sessionId: string;
    userId?: string;
    city: string;
    query?: string;
    category?: string;
    neighborhood?: string;
    priceRange?: {
        min: number;
        max: number;
    };
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'late';
    dayOfWeek: string;
    slot: AdSlot;
}
export interface AdCandidate {
    campaign: AdCampaign & {
        creatives: AdCreative[];
        targetings: AdTargeting[];
    };
    creative: AdCreative;
    targeting: AdTargeting;
    targetingScore: number;
    qualityScore: number;
    bid: number;
}
export interface AdAuctionResult {
    winner: AdCandidate;
    price: number;
    impressionId?: string;
}
export declare function matchesTargeting(targeting: AdTargeting, context: AdContext): {
    matches: boolean;
    score: number;
};
export declare function calculateQualityScore(campaign: AdCampaign, creative: AdCreative, historicalCTR?: number): number;
export declare function checkBudgetAndPacing(campaign: AdCampaign, budget: {
    spent: number;
    todaySpent: number;
    todayDate: Date | null;
}, prisma: any): Promise<{
    canServe: boolean;
    reason?: string;
}>;
export declare function checkFrequencyCap(campaignId: string, sessionId: string, maxPerDay: number | undefined, prisma: any): Promise<{
    canServe: boolean;
    currentCount: number;
}>;
export declare function runAuction(candidates: AdCandidate[]): AdAuctionResult | null;
export declare function calculateCPMCost(baseCPM: number, qualityScore: number): number;
export declare function isViewable(impressionTime: Date, viewTime: Date | null, viewportPercentage: number): boolean;
export declare function isWithinAttributionWindow(impressionTime: Date, conversionTime: Date, clickTime: Date | null, windowHours?: {
    view: number;
    click: number;
}): {
    attributed: boolean;
    type: 'click' | 'view';
};
//# sourceMappingURL=ads.d.ts.map