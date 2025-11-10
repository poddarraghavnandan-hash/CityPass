const BUDGET_THRESHOLDS = {
    free: 0,
    casual: 75,
    splurge: 250,
};
const MOOD_CATEGORY_MAP = {
    calm: ['FITNESS', 'ARTS', 'WELLNESS', 'FOOD'],
    social: ['FOOD', 'NETWORKING', 'MUSIC'],
    electric: ['MUSIC', 'DANCE', 'COMEDY'],
    artistic: ['ARTS', 'THEATRE', 'DANCE'],
    grounded: ['FAMILY', 'FITNESS', 'OTHER'],
};
const COMPONENT_WEIGHTS = {
    textual: 0.25,
    semantic: 0.2,
    mood: 0.2,
    social: 0.15,
    budget: 0.1,
    distance: 0.05,
    recency: 0.05,
};
export function calculateFitScore(args) {
    const components = [];
    const intention = args.intention;
    const textual = clamp(args.textualSimilarity, 0, 1);
    components.push({
        key: 'textual',
        label: 'Matches your keywords',
        value: textual,
        weight: COMPONENT_WEIGHTS.textual,
        contribution: textual * COMPONENT_WEIGHTS.textual,
    });
    const semantic = clamp(args.semanticSimilarity, 0, 1);
    components.push({
        key: 'semantic',
        label: 'Feels similar to what you watched',
        value: semantic,
        weight: COMPONENT_WEIGHTS.semantic,
        contribution: semantic * COMPONENT_WEIGHTS.semantic,
    });
    const moodScore = calculateMoodScore(intention.tokens.mood, args.event.category);
    components.push({
        key: 'mood',
        label: `Fits your ${intention.tokens.mood} vibe`,
        value: moodScore,
        weight: COMPONENT_WEIGHTS.mood,
        contribution: moodScore * COMPONENT_WEIGHTS.mood,
    });
    const socialHeat = calculateSocialHeat(args.socialProof);
    components.push({
        key: 'social',
        label: 'Trending with locals',
        value: socialHeat,
        weight: COMPONENT_WEIGHTS.social,
        contribution: socialHeat * COMPONENT_WEIGHTS.social,
    });
    const budgetScore = calculateBudgetScore(args.event, intention);
    components.push({
        key: 'budget',
        label: 'In your budget',
        value: budgetScore,
        weight: COMPONENT_WEIGHTS.budget,
        contribution: budgetScore * COMPONENT_WEIGHTS.budget,
    });
    const distanceScore = calculateDistanceScore(args.distanceKm, intention.tokens.distanceKm);
    components.push({
        key: 'distance',
        label: 'Close enough',
        value: distanceScore,
        weight: COMPONENT_WEIGHTS.distance,
        contribution: distanceScore * COMPONENT_WEIGHTS.distance,
    });
    const recencyScore = calculateRecencyScore(args.event.startTime, intention);
    components.push({
        key: 'recency',
        label: 'Happening in your window',
        value: recencyScore,
        weight: COMPONENT_WEIGHTS.recency,
        contribution: recencyScore * COMPONENT_WEIGHTS.recency,
    });
    const score = components.reduce((sum, component) => sum + component.contribution, 0);
    const reasons = components
        .filter(component => component.value >= 0.6)
        .sort((a, b) => b.contribution - a.contribution)
        .slice(0, 3)
        .map(component => component.label);
    return {
        score,
        moodScore,
        socialHeat,
        reasons,
        components,
    };
}
function calculateMoodScore(mood, category) {
    if (!category)
        return 0.4;
    const normalizedCategory = category.toUpperCase();
    const matches = MOOD_CATEGORY_MAP[mood] || [];
    if (matches.includes(normalizedCategory))
        return 1;
    return matches.some(match => normalizedCategory.includes(match)) ? 0.7 : 0.3;
}
function calculateSocialHeat(socialProof) {
    if (!socialProof)
        return 0.2;
    const viewHeat = sigmoid(socialProof.views / 50);
    const saveHeat = sigmoid(socialProof.saves / 15);
    const friendHeat = sigmoid(socialProof.friends);
    return clamp((viewHeat + saveHeat * 1.2 + friendHeat * 1.5) / 3.7, 0, 1);
}
function calculateBudgetScore(event, intention) {
    const budgetMax = BUDGET_THRESHOLDS[intention.tokens.budget];
    const price = event.priceMin ?? event.priceMax ?? 0;
    if (budgetMax === 0) {
        return price === 0 ? 1 : 0;
    }
    if (price === null)
        return 0.6;
    if (price <= budgetMax)
        return 1;
    if (price <= budgetMax * 1.3)
        return 0.6;
    return 0.2;
}
function calculateDistanceScore(distanceKm, maxDistance) {
    if (distanceKm == null || maxDistance == null || maxDistance <= 0)
        return 0.6;
    const ratio = distanceKm / maxDistance;
    if (ratio <= 0.5)
        return 1;
    if (ratio <= 1)
        return 0.7;
    if (ratio <= 1.5)
        return 0.4;
    return 0.1;
}
function calculateRecencyScore(startTime, intention) {
    const now = new Date(intention.nowISO);
    const diffMinutes = (startTime.getTime() - now.getTime()) / (1000 * 60);
    if (diffMinutes < 0)
        return 0.2;
    if (diffMinutes <= intention.tokens.untilMinutes)
        return 1;
    if (diffMinutes <= intention.tokens.untilMinutes * 1.5)
        return 0.6;
    return 0.3;
}
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
function sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
}
//# sourceMappingURL=fitScore.js.map