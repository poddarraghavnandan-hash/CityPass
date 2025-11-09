"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recallStage = recallStage;
exports.coarseRanking = coarseRanking;
exports.fineRanking = fineRanking;
exports.rankEvents = rankEvents;
const embeddings_1 = require("./embeddings");
async function recallStage(context, userProfile, options = {}) {
    const { maxCandidates = 200, strategies = ['semantic', 'category', 'trending', 'popular'], } = options;
    const candidateIds = new Set();
    const candidatesPerStrategy = Math.floor(maxCandidates / strategies.length);
    for (const strategy of strategies) {
        let ids = [];
        switch (strategy) {
            case 'semantic':
                if (context.queryEmbedding) {
                    ids = await recallBySemantic(context.queryEmbedding, candidatesPerStrategy);
                }
                break;
            case 'category':
                if (userProfile?.favoriteCategories) {
                    ids = await recallByCategory(userProfile.favoriteCategories, candidatesPerStrategy);
                }
                break;
            case 'collaborative':
                if (userProfile) {
                    ids = await recallByCollaborative(userProfile, candidatesPerStrategy);
                }
                break;
            case 'trending':
                ids = await recallByTrending(context.city, candidatesPerStrategy);
                break;
            case 'popular':
                ids = await recallByPopular(context.city, candidatesPerStrategy);
                break;
        }
        ids.forEach(id => candidateIds.add(id));
    }
    return Array.from(candidateIds).slice(0, maxCandidates);
}
function coarseRanking(events, context, userProfile) {
    const scoredEvents = events.map(event => {
        let score = 0;
        const popularityScore = calculatePopularityScore(event);
        score += popularityScore * 0.3;
        if (userProfile?.favoriteCategories?.includes(event.category)) {
            score += 0.25;
        }
        if (context.city && event.city === context.city) {
            score += 0.15;
        }
        const recencyScore = calculateRecencyScore(event);
        score += recencyScore * 0.15;
        const qualityScore = calculateQualityScore(event);
        score += qualityScore * 0.15;
        return { event, score };
    });
    scoredEvents.sort((a, b) => b.score - a.score);
    return scoredEvents.slice(0, 50).map(s => s.event);
}
async function fineRanking(events, context, userProfile) {
    const rankedEvents = await Promise.all(events.map(async (event) => {
        const features = await extractFeatures(event, context, userProfile);
        const score = calculateFinalScore(features);
        return { event, score, features };
    }));
    rankedEvents.sort((a, b) => b.score - a.score);
    return rankedEvents;
}
async function extractFeatures(event, context, userProfile) {
    const categoryMatch = userProfile?.favoriteCategories?.includes(event.category) ? 1.0 : 0.0;
    const cityMatch = context.city === event.city ? 1.0 : 0.0;
    let priceMatch = 0.5;
    if (userProfile?.avgPricePoint && event.priceMin !== undefined) {
        const priceDiff = Math.abs(event.priceMin - userProfile.avgPricePoint);
        priceMatch = Math.max(0, 1 - (priceDiff / userProfile.avgPricePoint));
    }
    let semanticSimilarity = 0;
    if (context.queryEmbedding && event.embedding) {
        semanticSimilarity = (0, embeddings_1.cosineSimilarity)(context.queryEmbedding, event.embedding);
    }
    const popularity = calculatePopularityScore(event);
    const recency = calculateRecencyScore(event);
    const quality = calculateQualityScore(event);
    const engagement = calculateEngagementScore(event);
    const timeMatch = calculateTimeMatch(event, context);
    const trending = calculateTrendingScore(event);
    const score = calculateFinalScore({
        categoryMatch,
        cityMatch,
        priceMatch,
        semanticSimilarity,
        popularity,
        recency,
        quality,
        engagement,
        timeMatch,
        trending,
    });
    return {
        categoryMatch,
        cityMatch,
        priceMatch,
        semanticSimilarity,
        popularity,
        recency,
        quality,
        engagement,
        timeMatch,
        trending,
        score,
    };
}
function calculateFinalScore(features) {
    const weights = {
        semanticSimilarity: 0.25,
        categoryMatch: 0.20,
        popularity: 0.15,
        engagement: 0.12,
        quality: 0.10,
        cityMatch: 0.08,
        priceMatch: 0.05,
        timeMatch: 0.03,
        trending: 0.02,
        recency: 0.00,
    };
    let score = 0;
    score += features.semanticSimilarity * weights.semanticSimilarity;
    score += features.categoryMatch * weights.categoryMatch;
    score += features.popularity * weights.popularity;
    score += features.engagement * weights.engagement;
    score += features.quality * weights.quality;
    score += features.cityMatch * weights.cityMatch;
    score += features.priceMatch * weights.priceMatch;
    score += features.timeMatch * weights.timeMatch;
    score += features.trending * weights.trending;
    score += features.recency * weights.recency;
    return score;
}
function calculatePopularityScore(event) {
    const views = event.viewCount || 0;
    const saves = event.saveCount || 0;
    const shares = event.shareCount || 0;
    const clicks = event.clickCount || 0;
    const rawScore = views * 1 + saves * 5 + shares * 10 + clicks * 3;
    return Math.min(1, Math.log(rawScore + 1) / Math.log(1000));
}
function calculateRecencyScore(event) {
    const now = new Date();
    const eventDate = new Date(event.startTime);
    const daysUntil = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysUntil < 0)
        return 0;
    if (daysUntil < 1)
        return 1.0;
    if (daysUntil < 7)
        return 0.8;
    if (daysUntil < 30)
        return 0.5;
    return 0.2;
}
function calculateQualityScore(event) {
    let score = 0;
    let maxScore = 0;
    maxScore += 0.3;
    if (event.imageUrl)
        score += 0.3;
    maxScore += 0.3;
    if (event.hasDescription)
        score += 0.3;
    maxScore += 0.2;
    if (event.hasVenue)
        score += 0.2;
    maxScore += 0.2;
    if (event.hasPrice)
        score += 0.2;
    return maxScore > 0 ? score / maxScore : 0;
}
function calculateEngagementScore(event) {
    const views24h = event.viewCount24h || 0;
    const saves24h = event.saveCount24h || 0;
    const rawScore = views24h * 2 + saves24h * 10;
    return Math.min(1, Math.log(rawScore + 1) / Math.log(100));
}
function calculateTimeMatch(event, context) {
    if (!context.timeOfDay)
        return 0.5;
    const eventTime = new Date(event.startTime);
    const hour = eventTime.getHours();
    let eventTimeOfDay;
    if (hour >= 6 && hour < 12)
        eventTimeOfDay = 'morning';
    else if (hour >= 12 && hour < 17)
        eventTimeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 22)
        eventTimeOfDay = 'evening';
    else
        eventTimeOfDay = 'night';
    return eventTimeOfDay === context.timeOfDay ? 1.0 : 0.3;
}
function calculateTrendingScore(event) {
    const views24h = event.viewCount24h || 0;
    const viewsTotal = event.viewCount || 1;
    const trendingRatio = views24h / viewsTotal;
    return Math.min(1, trendingRatio * 2);
}
async function rankEvents(context, userProfile, options = {}) {
    const { maxResults = 20, includeFeatures = false } = options;
    console.log('Stage 1: Recall...');
    const candidateIds = await recallStage(context, userProfile);
    console.log(`Recalled ${candidateIds.length} candidates`);
    const candidates = await fetchEventsByIds(candidateIds);
    console.log('Stage 2: Coarse ranking...');
    const coarseRanked = coarseRanking(candidates, context, userProfile);
    console.log(`Coarse ranked to ${coarseRanked.length} events`);
    console.log('Stage 3: Fine ranking...');
    const fineRanked = await fineRanking(coarseRanked, context, userProfile);
    const results = fineRanked.slice(0, maxResults);
    if (!includeFeatures) {
        return results.map(r => ({ event: r.event, score: r.score }));
    }
    return results;
}
async function recallBySemantic(queryEmbedding, limit) {
    return [];
}
async function recallByCategory(categories, limit) {
    return [];
}
async function recallByCollaborative(userProfile, limit) {
    return [];
}
async function recallByTrending(city, limit) {
    return [];
}
async function recallByPopular(city, limit) {
    return [];
}
async function fetchEventsByIds(ids) {
    return [];
}
//# sourceMappingURL=ranking.js.map