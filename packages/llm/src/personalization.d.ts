export interface UserPersona {
    sessionId: string;
    userId?: string;
    createdAt: Date;
    lastActive: Date;
    ageGroup?: '18-24' | '25-34' | '35-44' | '45-54' | '55+';
    location?: {
        city: string;
        neighborhood?: string;
        coordinates?: {
            lat: number;
            lon: number;
        };
    };
    explicitly: {
        favoriteCategories: string[];
        favoriteCities: string[];
        priceRange?: {
            min: number;
            max: number;
        };
        timePreferences?: ('morning' | 'afternoon' | 'evening' | 'night')[];
        accessibility?: string[];
    };
    implicitly: {
        categoryAffinities: Map<string, {
            score: number;
            count: number;
            lastUpdated: Date;
        }>;
        venueAffinities: Map<string, {
            score: number;
            visits: number;
        }>;
        neighborhoodAffinities: Map<string, {
            score: number;
            visits: number;
        }>;
        pricePoints: number[];
        estimatedBudget?: number;
        activityPatterns: Map<string, number>;
        interestTags: Map<string, number>;
    };
    behavior: {
        totalViews: number;
        totalLikes: number;
        totalSaves: number;
        totalShares: number;
        totalClicks: number;
        avgSessionDuration: number;
        sessionsCount: number;
        avgEventsPerSession: number;
        swipeLeft: number;
        swipeRight: number;
        scrollDepth: number;
        viewToClickRate: number;
        viewToSaveRate: number;
    };
    context: {
        currentCity?: string;
        currentQuery?: string;
        deviceType?: 'mobile' | 'desktop' | 'tablet';
        referrer?: string;
        sessionStart?: Date;
        recentViewedIds: string[];
        recentSearches: string[];
    };
    computed: {
        userType: 'explorer' | 'planner' | 'opportunist' | 'social' | 'culture_enthusiast';
        engagementLevel: 'cold' | 'warm' | 'hot' | 'power_user';
        diversityScore: number;
        confidenceScore: number;
        priceSensitivity: 'budget' | 'moderate' | 'premium' | 'luxury';
        adventureScore: number;
    };
    preferenceEmbedding?: number[];
    profileVersion: number;
    lastUpdated: Date;
}
export declare function createUserPersona(sessionId: string, userId?: string): UserPersona;
export declare function updatePersonaFromInteraction(persona: UserPersona, interaction: {
    type: 'VIEW' | 'LIKE' | 'DISLIKE' | 'SAVE' | 'SHARE' | 'BOOK_CLICK';
    eventId: string;
    event: {
        category: string;
        city: string;
        venueName?: string;
        neighborhood?: string;
        priceMin?: number;
        tags?: string[];
    };
    dwellTimeMs?: number;
    timestamp: Date;
}): Promise<UserPersona>;
export declare function generatePreferenceEmbedding(persona: UserPersona): Promise<number[]>;
export declare function calculatePersonaEventMatch(persona: UserPersona, event: {
    category: string;
    city: string;
    priceMin?: number;
    venueName?: string;
    neighborhood?: string;
    tags?: string[];
    embedding?: number[];
}): Promise<number>;
export declare function getTopCategories(persona: UserPersona, limit?: number): string[];
export declare function getPersonalizationInsights(persona: UserPersona): {
    summary: string;
    topCategories: string[];
    userType: string;
    engagementLevel: string;
    confidenceScore: number;
};
//# sourceMappingURL=personalization.d.ts.map