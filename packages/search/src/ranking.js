export const DEFAULT_WEIGHTS = {
    version: 1,
    weights: {
        textualSimilarity: 0.25,
        semanticSimilarity: 0.20,
        hoursUntilEvent: -0.005,
        isDuringPreferredTime: 0.15,
        isDuringWeekend: 0.05,
        distanceKm: -0.02,
        isInPreferredNeighborhood: 0.12,
        isPreferredCategory: 0.18,
        priceLevel: -0.03,
        isInPriceBudget: 0.10,
        viewCount24h: 0.0001,
        saveCount24h: 0.001,
        friendSaveCount: 0.05,
        venueQualityScore: 0.08,
        isNewVenue: 0.04,
        hasBeenSeen: -0.15,
        categoryDiversity: 0.06,
    },
};
export function extractFeatures(event, context, seenEventIds = new Set(), recentCategories = []) {
    const now = new Date();
    const eventStart = new Date(event.startTime);
    const hoursUntil = (eventStart.getTime() - now.getTime()) / (1000 * 60 * 60);
    let distanceKm = 10;
    if (context.coords && event.lat && event.lon) {
        distanceKm = haversineDistance(context.coords.lat, context.coords.lon, event.lat, event.lon);
    }
    const eventHour = eventStart.getHours();
    let eventTimeOfDay;
    if (eventHour < 12)
        eventTimeOfDay = 'morning';
    else if (eventHour < 17)
        eventTimeOfDay = 'afternoon';
    else if (eventHour < 22)
        eventTimeOfDay = 'evening';
    else
        eventTimeOfDay = 'late';
    const eventDayOfWeek = eventStart.getDay();
    const isWeekend = eventDayOfWeek === 0 || eventDayOfWeek === 6;
    const avgPrice = event.priceMin !== null && event.priceMax !== null
        ? (event.priceMin + event.priceMax) / 2
        : event.priceMin ?? event.priceMax ?? 0;
    let priceLevel = 0;
    if (avgPrice === 0)
        priceLevel = 0;
    else if (avgPrice < 30)
        priceLevel = 1;
    else if (avgPrice < 70)
        priceLevel = 2;
    else
        priceLevel = 3;
    const isInBudget = context.prefs?.priceMax
        ? ((event.priceMin ?? 0) <= context.prefs.priceMax ? 1 : 0)
        : 1;
    const categoryCount = recentCategories.filter(c => c === event.category).length;
    const categoryDiversity = Math.max(0, 1 - categoryCount / 10);
    return {
        textualSimilarity: 0.5,
        semanticSimilarity: 0.5,
        hoursUntilEvent: Math.min(hoursUntil, 168),
        isDuringPreferredTime: eventTimeOfDay === context.timeOfDay ? 1 : 0,
        isDuringWeekend: isWeekend ? 1 : 0,
        distanceKm,
        isInPreferredNeighborhood: context.prefs?.neighborhoods?.includes(event.neighborhood || '') ? 1 : 0,
        isPreferredCategory: context.prefs?.categories?.includes(event.category || '') ? 1 : 0,
        priceLevel,
        isInPriceBudget: isInBudget,
        viewCount24h: event.viewCount || 0,
        saveCount24h: event.saveCount || 0,
        friendSaveCount: event.friendSaves || 0,
        venueQualityScore: 0.7,
        isNewVenue: 0,
        hasBeenSeen: seenEventIds.has(event.id) ? 1 : 0,
        categoryDiversity,
    };
}
export function computeScore(features, weights) {
    const w = weights.weights;
    let score = 0;
    score += features.textualSimilarity * w.textualSimilarity;
    score += features.semanticSimilarity * w.semanticSimilarity;
    score += features.hoursUntilEvent * w.hoursUntilEvent;
    score += features.isDuringPreferredTime * w.isDuringPreferredTime;
    score += features.isDuringWeekend * w.isDuringWeekend;
    score += features.distanceKm * w.distanceKm;
    score += features.isInPreferredNeighborhood * w.isInPreferredNeighborhood;
    score += features.isPreferredCategory * w.isPreferredCategory;
    score += features.priceLevel * w.priceLevel;
    score += features.isInPriceBudget * w.isInPriceBudget;
    score += features.viewCount24h * w.viewCount24h;
    score += features.saveCount24h * w.saveCount24h;
    score += features.friendSaveCount * w.friendSaveCount;
    score += features.venueQualityScore * w.venueQualityScore;
    score += features.isNewVenue * w.isNewVenue;
    score += features.hasBeenSeen * w.hasBeenSeen;
    score += features.categoryDiversity * w.categoryDiversity;
    return score;
}
export function sampleThompson(arm) {
    const gammaAlpha = gammaRandom(arm.alpha, 1);
    const gammaBeta = gammaRandom(arm.beta, 1);
    return gammaAlpha / (gammaAlpha + gammaBeta);
}
export function applyEpsilonGreedyWithExploration(scores, epsilon = 0.1, topN = 3) {
    if (scores.length === 0) {
        return { scores, explorationIndexes: [] };
    }
    const result = [...scores];
    const explorationIndexes = [];
    if (Math.random() < epsilon) {
        const candidateIndexes = scores.map((_, idx) => idx);
        shuffle(candidateIndexes);
        const picks = candidateIndexes.slice(0, Math.min(topN, scores.length));
        for (const idx of picks) {
            const noise = 0.2 + Math.random() * 0.3;
            result[idx] = scores[idx] + noise;
            explorationIndexes.push(idx);
        }
    }
    return { scores: result, explorationIndexes };
}
export function applyEpsilonGreedy(scores, epsilon = 0.1) {
    return applyEpsilonGreedyWithExploration(scores, epsilon).scores;
}
export function addExplorationBonus(score, impressionCount, totalImpressions) {
    if (impressionCount === 0)
        return score + 1.0;
    const explorationTerm = Math.sqrt((2 * Math.log(totalImpressions)) / impressionCount);
    return score + 0.1 * explorationTerm;
}
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
function toRad(degrees) {
    return (degrees * Math.PI) / 180;
}
function gammaRandom(shape, scale) {
    if (shape < 1) {
        return gammaRandom(shape + 1, scale) * Math.pow(Math.random(), 1 / shape);
    }
    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    while (true) {
        let x, v;
        do {
            x = randomNormal();
            v = 1 + c * x;
        } while (v <= 0);
        v = v * v * v;
        const u = Math.random();
        if (u < 1 - 0.0331 * x * x * x * x) {
            return d * v * scale;
        }
        if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
            return d * v * scale;
        }
    }
}
function randomNormal() {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}
//# sourceMappingURL=ranking.js.map