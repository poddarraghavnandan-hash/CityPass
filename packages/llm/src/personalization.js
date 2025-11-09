"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserPersona = createUserPersona;
exports.updatePersonaFromInteraction = updatePersonaFromInteraction;
exports.generatePreferenceEmbedding = generatePreferenceEmbedding;
exports.calculatePersonaEventMatch = calculatePersonaEventMatch;
exports.getTopCategories = getTopCategories;
exports.getPersonalizationInsights = getPersonalizationInsights;
const embeddings_1 = require("./embeddings");
const embeddings_2 = require("./embeddings");
function createUserPersona(sessionId, userId) {
    const now = new Date();
    return {
        sessionId,
        userId,
        createdAt: now,
        lastActive: now,
        explicitly: {
            favoriteCategories: [],
            favoriteCities: [],
        },
        implicitly: {
            categoryAffinities: new Map(),
            venueAffinities: new Map(),
            neighborhoodAffinities: new Map(),
            pricePoints: [],
            activityPatterns: new Map(),
            interestTags: new Map(),
        },
        behavior: {
            totalViews: 0,
            totalLikes: 0,
            totalSaves: 0,
            totalShares: 0,
            totalClicks: 0,
            avgSessionDuration: 0,
            sessionsCount: 0,
            avgEventsPerSession: 0,
            swipeLeft: 0,
            swipeRight: 0,
            scrollDepth: 0,
            viewToClickRate: 0,
            viewToSaveRate: 0,
        },
        context: {
            recentViewedIds: [],
            recentSearches: [],
        },
        computed: {
            userType: 'explorer',
            engagementLevel: 'cold',
            diversityScore: 0.5,
            confidenceScore: 0.1,
            priceSensitivity: 'moderate',
            adventureScore: 0.5,
        },
        profileVersion: 1,
        lastUpdated: now,
    };
}
async function updatePersonaFromInteraction(persona, interaction) {
    const updated = { ...persona };
    updated.lastActive = interaction.timestamp;
    updated.lastUpdated = interaction.timestamp;
    updated.behavior.totalViews++;
    if (interaction.type === 'LIKE')
        updated.behavior.totalLikes++;
    if (interaction.type === 'SAVE')
        updated.behavior.totalSaves++;
    if (interaction.type === 'SHARE')
        updated.behavior.totalShares++;
    if (interaction.type === 'BOOK_CLICK')
        updated.behavior.totalClicks++;
    if (interaction.type === 'DISLIKE')
        updated.behavior.swipeLeft++;
    if (interaction.type === 'LIKE')
        updated.behavior.swipeRight++;
    if (['LIKE', 'SAVE', 'BOOK_CLICK'].includes(interaction.type)) {
        const category = interaction.event.category;
        const currentAffinity = updated.implicitly.categoryAffinities.get(category) || {
            score: 0,
            count: 0,
            lastUpdated: interaction.timestamp,
        };
        const decayFactor = calculateDecayFactor(currentAffinity.lastUpdated, interaction.timestamp);
        const incrementValue = interaction.type === 'SAVE' ? 2 : interaction.type === 'BOOK_CLICK' ? 3 : 1;
        updated.implicitly.categoryAffinities.set(category, {
            score: (currentAffinity.score * decayFactor) + incrementValue,
            count: currentAffinity.count + 1,
            lastUpdated: interaction.timestamp,
        });
        if (interaction.event.venueName) {
            const venue = interaction.event.venueName;
            const currentVenue = updated.implicitly.venueAffinities.get(venue) || { score: 0, visits: 0 };
            updated.implicitly.venueAffinities.set(venue, {
                score: currentVenue.score + incrementValue,
                visits: currentVenue.visits + 1,
            });
        }
        if (interaction.event.neighborhood) {
            const neighborhood = interaction.event.neighborhood;
            const currentNeighborhood = updated.implicitly.neighborhoodAffinities.get(neighborhood) || {
                score: 0,
                visits: 0,
            };
            updated.implicitly.neighborhoodAffinities.set(neighborhood, {
                score: currentNeighborhood.score + incrementValue,
                visits: currentNeighborhood.visits + 1,
            });
        }
        if (interaction.event.priceMin !== undefined) {
            updated.implicitly.pricePoints.push(interaction.event.priceMin);
            if (updated.implicitly.pricePoints.length > 50) {
                updated.implicitly.pricePoints.shift();
            }
            updated.implicitly.estimatedBudget = calculateMedian(updated.implicitly.pricePoints);
        }
        if (interaction.event.tags) {
            for (const tag of interaction.event.tags) {
                const currentScore = updated.implicitly.interestTags.get(tag) || 0;
                updated.implicitly.interestTags.set(tag, currentScore + incrementValue);
            }
        }
    }
    updated.computed = computeDerivedFeatures(updated);
    if (updated.behavior.totalViews > 0) {
        updated.behavior.viewToClickRate = updated.behavior.totalClicks / updated.behavior.totalViews;
        updated.behavior.viewToSaveRate = updated.behavior.totalSaves / updated.behavior.totalViews;
    }
    updated.context.recentViewedIds.unshift(interaction.eventId);
    if (updated.context.recentViewedIds.length > 20) {
        updated.context.recentViewedIds = updated.context.recentViewedIds.slice(0, 20);
    }
    return updated;
}
function calculateDecayFactor(lastUpdate, current) {
    const daysElapsed = (current.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
    const halfLife = 30;
    return Math.pow(0.5, daysElapsed / halfLife);
}
function computeDerivedFeatures(persona) {
    let userType = 'explorer';
    const { totalViews, totalSaves, totalShares, totalLikes } = persona.behavior;
    const saveRate = totalViews > 0 ? totalSaves / totalViews : 0;
    const shareRate = totalViews > 0 ? totalShares / totalViews : 0;
    if (saveRate > 0.3)
        userType = 'planner';
    else if (shareRate > 0.1)
        userType = 'social';
    else if (persona.implicitly.categoryAffinities.size > 5)
        userType = 'explorer';
    else if (totalLikes > 50)
        userType = 'culture_enthusiast';
    let engagementLevel = 'cold';
    if (totalViews > 100)
        engagementLevel = 'power_user';
    else if (totalViews > 50)
        engagementLevel = 'hot';
    else if (totalViews > 10)
        engagementLevel = 'warm';
    const diversityScore = Math.min(1, persona.implicitly.categoryAffinities.size / 10);
    const confidenceScore = Math.min(1, totalViews / 50);
    let priceSensitivity = 'moderate';
    if (persona.implicitly.estimatedBudget) {
        if (persona.implicitly.estimatedBudget < 20)
            priceSensitivity = 'budget';
        else if (persona.implicitly.estimatedBudget < 50)
            priceSensitivity = 'moderate';
        else if (persona.implicitly.estimatedBudget < 100)
            priceSensitivity = 'premium';
        else
            priceSensitivity = 'luxury';
    }
    const totalInteractions = totalLikes + totalSaves;
    const uniqueCategories = persona.implicitly.categoryAffinities.size;
    const adventureScore = totalInteractions > 0
        ? Math.min(1, uniqueCategories / totalInteractions)
        : 0.5;
    return {
        userType,
        engagementLevel,
        diversityScore,
        confidenceScore,
        priceSensitivity,
        adventureScore,
    };
}
async function generatePreferenceEmbedding(persona) {
    const parts = [];
    const topCategories = Array.from(persona.implicitly.categoryAffinities.entries())
        .sort((a, b) => b[1].score - a[1].score)
        .slice(0, 5)
        .map(([cat]) => cat);
    if (topCategories.length > 0) {
        parts.push(`Interested in: ${topCategories.join(', ')}`);
    }
    if (persona.explicitly.favoriteCities.length > 0) {
        parts.push(`Cities: ${persona.explicitly.favoriteCities.join(', ')}`);
    }
    if (persona.implicitly.estimatedBudget) {
        parts.push(`Budget: $${persona.implicitly.estimatedBudget}`);
    }
    const topTags = Array.from(persona.implicitly.interestTags.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag]) => tag);
    if (topTags.length > 0) {
        parts.push(`Interests: ${topTags.join(', ')}`);
    }
    parts.push(`User type: ${persona.computed.userType}`);
    const text = parts.join('\n');
    return await (0, embeddings_1.generateEmbedding)(text, { useCase: 'user-preference' });
}
async function calculatePersonaEventMatch(persona, event) {
    let score = 0;
    let maxScore = 0;
    maxScore += 0.3;
    const categoryAffinity = persona.implicitly.categoryAffinities.get(event.category);
    if (categoryAffinity) {
        const normalizedAffinity = Math.min(1, categoryAffinity.score / 10);
        score += normalizedAffinity * 0.3;
    }
    maxScore += 0.15;
    if (persona.explicitly.favoriteCities.includes(event.city)) {
        score += 0.15;
    }
    maxScore += 0.15;
    if (event.priceMin !== undefined && persona.implicitly.estimatedBudget) {
        const priceDiff = Math.abs(event.priceMin - persona.implicitly.estimatedBudget);
        const priceMatch = Math.max(0, 1 - (priceDiff / persona.implicitly.estimatedBudget));
        score += priceMatch * 0.15;
    }
    else {
        score += 0.075;
    }
    maxScore += 0.1;
    if (event.venueName) {
        const venueAffinity = persona.implicitly.venueAffinities.get(event.venueName);
        if (venueAffinity) {
            const normalizedAffinity = Math.min(1, venueAffinity.score / 5);
            score += normalizedAffinity * 0.1;
        }
    }
    maxScore += 0.1;
    if (event.neighborhood) {
        const neighborhoodAffinity = persona.implicitly.neighborhoodAffinities.get(event.neighborhood);
        if (neighborhoodAffinity) {
            const normalizedAffinity = Math.min(1, neighborhoodAffinity.score / 5);
            score += normalizedAffinity * 0.1;
        }
    }
    maxScore += 0.2;
    if (event.tags && event.tags.length > 0) {
        let tagScore = 0;
        for (const tag of event.tags) {
            const tagRelevance = persona.implicitly.interestTags.get(tag) || 0;
            tagScore += Math.min(1, tagRelevance / 5);
        }
        score += (tagScore / event.tags.length) * 0.2;
    }
    if (persona.preferenceEmbedding && event.embedding) {
        const semanticSimilarity = (0, embeddings_2.cosineSimilarity)(persona.preferenceEmbedding, event.embedding);
        score += semanticSimilarity * 0.2;
        maxScore += 0.2;
    }
    return maxScore > 0 ? score / maxScore : 0;
}
function getTopCategories(persona, limit = 5) {
    return Array.from(persona.implicitly.categoryAffinities.entries())
        .sort((a, b) => b[1].score - a[1].score)
        .slice(0, limit)
        .map(([category]) => category);
}
function getPersonalizationInsights(persona) {
    const topCategories = getTopCategories(persona, 3);
    let summary = `${persona.computed.userType} who `;
    if (topCategories.length > 0) {
        summary += `enjoys ${topCategories.join(', ')}. `;
    }
    summary += `Engagement: ${persona.computed.engagementLevel}. `;
    summary += `Confidence: ${(persona.computed.confidenceScore * 100).toFixed(0)}%.`;
    return {
        summary,
        topCategories,
        userType: persona.computed.userType,
        engagementLevel: persona.computed.engagementLevel,
        confidenceScore: persona.computed.confidenceScore,
    };
}
function calculateMedian(numbers) {
    if (numbers.length === 0)
        return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
        return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
}
//# sourceMappingURL=personalization.js.map