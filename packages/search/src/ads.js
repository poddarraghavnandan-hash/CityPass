export function matchesTargeting(targeting, context) {
    let score = 0;
    let maxScore = 0;
    maxScore += 10;
    if (targeting.cities.length === 0 || targeting.cities.includes(context.city)) {
        score += 10;
    }
    else {
        return { matches: false, score: 0 };
    }
    if (targeting.neighborhoods.length > 0) {
        maxScore += 5;
        if (context.neighborhood && targeting.neighborhoods.includes(context.neighborhood)) {
            score += 5;
        }
    }
    if (targeting.categories.length > 0) {
        maxScore += 8;
        if (context.category && targeting.categories.includes(context.category)) {
            score += 8;
        }
    }
    if (targeting.timesOfDay.length > 0) {
        maxScore += 3;
        if (targeting.timesOfDay.includes(context.timeOfDay)) {
            score += 3;
        }
    }
    if (targeting.daysOfWeek.length > 0) {
        maxScore += 2;
        if (targeting.daysOfWeek.includes(context.dayOfWeek.toLowerCase().slice(0, 3))) {
            score += 2;
        }
    }
    if (targeting.priceMin !== null || targeting.priceMax !== null) {
        maxScore += 4;
        if (context.priceRange) {
            const overlaps = (targeting.priceMin === null || context.priceRange.max >= targeting.priceMin) &&
                (targeting.priceMax === null || context.priceRange.min <= targeting.priceMax);
            if (overlaps)
                score += 4;
        }
    }
    if (targeting.keywords.length > 0 && context.query) {
        maxScore += 5;
        const queryLower = context.query.toLowerCase();
        const keywordMatches = targeting.keywords.some(kw => queryLower.includes(kw.toLowerCase()));
        if (keywordMatches)
            score += 5;
    }
    const normalizedScore = maxScore > 0 ? score / maxScore : 0;
    return { matches: score > 0, score: normalizedScore };
}
export function calculateQualityScore(campaign, creative, historicalCTR = 0.02) {
    const campaignQuality = campaign.qualityScore || 1.0;
    let creativeQuality = 1.0;
    if (creative.imageUrl)
        creativeQuality += 0.1;
    if (creative.body && creative.body.length > 20)
        creativeQuality += 0.05;
    if (creative.kind === 'NATIVE' || creative.kind === 'HOUSE_EVENT') {
        creativeQuality += 0.15;
    }
    const qualityScore = campaignQuality * creativeQuality * (1 + historicalCTR * 10);
    return Math.min(qualityScore, 2.0);
}
export async function checkBudgetAndPacing(campaign, budget, prisma) {
    if (budget.spent >= campaign.totalBudget) {
        return { canServe: false, reason: 'Total budget exhausted' };
    }
    const today = new Date().toDateString();
    const budgetToday = budget.todayDate?.toDateString() === today ? budget.todaySpent : 0;
    if (budgetToday >= campaign.dailyBudget) {
        return { canServe: false, reason: 'Daily budget exhausted' };
    }
    if (campaign.pacing === 'EVEN') {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const minutesSinceStart = (now.getTime() - startOfDay.getTime()) / (1000 * 60);
        const minutesInDay = 24 * 60;
        const expectedSpend = (campaign.dailyBudget * minutesSinceStart) / minutesInDay;
        const pacingBuffer = campaign.dailyBudget * 0.1;
        if (budgetToday > expectedSpend + pacingBuffer) {
            return { canServe: false, reason: 'Pacing limit exceeded' };
        }
    }
    return { canServe: true };
}
export async function checkFrequencyCap(campaignId, sessionId, maxPerDay = 3, prisma) {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const impressionCount = await prisma.adImpression.count({
        where: {
            campaignId,
            sessionId,
            occurredAt: { gte: oneDayAgo },
        },
    });
    return {
        canServe: impressionCount < maxPerDay,
        currentCount: impressionCount,
    };
}
export function runAuction(candidates) {
    if (candidates.length === 0)
        return null;
    const sorted = candidates
        .map(c => ({
        ...c,
        effectiveBid: c.bid * c.qualityScore,
    }))
        .sort((a, b) => b.effectiveBid - a.effectiveBid);
    const winner = sorted[0];
    const secondPrice = sorted.length > 1 ? sorted[1].effectiveBid / winner.qualityScore : winner.bid * 0.8;
    return {
        winner: winner,
        price: secondPrice,
    };
}
export function calculateCPMCost(baseCPM, qualityScore) {
    return baseCPM / qualityScore;
}
export function isViewable(impressionTime, viewTime, viewportPercentage) {
    if (!viewTime)
        return false;
    const timeDiff = viewTime.getTime() - impressionTime.getTime();
    return timeDiff >= 1000 && viewportPercentage >= 0.5;
}
export function isWithinAttributionWindow(impressionTime, conversionTime, clickTime, windowHours = { view: 24, click: 168 }) {
    const impressionMs = impressionTime.getTime();
    const conversionMs = conversionTime.getTime();
    if (clickTime) {
        const clickMs = clickTime.getTime();
        const hoursSinceClick = (conversionMs - clickMs) / (1000 * 60 * 60);
        if (hoursSinceClick >= 0 && hoursSinceClick <= windowHours.click) {
            return { attributed: true, type: 'click' };
        }
    }
    const hoursSinceImpression = (conversionMs - impressionMs) / (1000 * 60 * 60);
    if (hoursSinceImpression >= 0 && hoursSinceImpression <= windowHours.view) {
        return { attributed: true, type: 'view' };
    }
    return { attributed: false, type: 'view' };
}
//# sourceMappingURL=ads.js.map