/**
 * Ad Serving Engine with Second-Price Auction and Quality Score
 * Implements targeting, frequency capping, pacing, and viewability tracking
 */

import { AdCampaign, AdCreative, AdTargeting, AdSlot, Prisma } from '@citypass/db';

export interface AdContext {
  sessionId: string;
  userId?: string;
  city: string;
  query?: string;
  category?: string;
  neighborhood?: string;
  priceRange?: { min: number; max: number };
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
  bid: number; // Effective bid = base bid × quality score
}

export interface AdAuctionResult {
  winner: AdCandidate;
  price: number; // Second-price
  impressionId?: string;
}

/**
 * Check if campaign targeting matches context
 */
export function matchesTargeting(targeting: AdTargeting, context: AdContext): { matches: boolean; score: number } {
  let score = 0;
  let maxScore = 0;

  // City matching (required)
  maxScore += 10;
  if (targeting.cities.length === 0 || targeting.cities.includes(context.city)) {
    score += 10;
  } else {
    return { matches: false, score: 0 };
  }

  // Neighborhood matching
  if (targeting.neighborhoods.length > 0) {
    maxScore += 5;
    if (context.neighborhood && targeting.neighborhoods.includes(context.neighborhood)) {
      score += 5;
    }
  }

  // Category matching
  if (targeting.categories.length > 0) {
    maxScore += 8;
    if (context.category && targeting.categories.includes(context.category)) {
      score += 8;
    }
  }

  // Time of day matching
  if (targeting.timesOfDay.length > 0) {
    maxScore += 3;
    if (targeting.timesOfDay.includes(context.timeOfDay)) {
      score += 3;
    }
  }

  // Day of week matching
  if (targeting.daysOfWeek.length > 0) {
    maxScore += 2;
    if (targeting.daysOfWeek.includes(context.dayOfWeek.toLowerCase().slice(0, 3))) {
      score += 2;
    }
  }

  // Price range matching
  if (targeting.priceMin !== null || targeting.priceMax !== null) {
    maxScore += 4;
    if (context.priceRange) {
      const overlaps =
        (targeting.priceMin === null || context.priceRange.max >= targeting.priceMin) &&
        (targeting.priceMax === null || context.priceRange.min <= targeting.priceMax);
      if (overlaps) score += 4;
    }
  }

  // Keyword matching (simple check)
  if (targeting.keywords.length > 0 && context.query) {
    maxScore += 5;
    const queryLower = context.query.toLowerCase();
    const keywordMatches = targeting.keywords.some(kw => queryLower.includes(kw.toLowerCase()));
    if (keywordMatches) score += 5;
  }

  const normalizedScore = maxScore > 0 ? score / maxScore : 0;
  return { matches: score > 0, score: normalizedScore };
}

/**
 * Calculate quality score based on historical performance
 * Quality Score = p(click) × creative_quality
 */
export function calculateQualityScore(
  campaign: AdCampaign,
  creative: AdCreative,
  historicalCTR: number = 0.02 // Default 2% CTR
): number {
  // Campaign-level quality score
  const campaignQuality = campaign.qualityScore || 1.0;

  // Creative-level factors
  let creativeQuality = 1.0;

  // Has image?
  if (creative.imageUrl) creativeQuality += 0.1;

  // Has body text?
  if (creative.body && creative.body.length > 20) creativeQuality += 0.05;

  // Native ads get bonus
  if (creative.kind === 'NATIVE' || creative.kind === 'HOUSE_EVENT') {
    creativeQuality += 0.15;
  }

  // Combine with historical CTR
  const qualityScore = campaignQuality * creativeQuality * (1 + historicalCTR * 10);

  return Math.min(qualityScore, 2.0); // Cap at 2.0
}

/**
 * Check budget and pacing constraints
 */
export async function checkBudgetAndPacing(
  campaign: AdCampaign,
  budget: { spent: number; todaySpent: number; todayDate: Date | null },
  prisma: any
): Promise<{ canServe: boolean; reason?: string }> {
  // Check total budget
  if (budget.spent >= campaign.totalBudget) {
    return { canServe: false, reason: 'Total budget exhausted' };
  }

  // Check daily budget
  const today = new Date().toDateString();
  const budgetToday = budget.todayDate?.toDateString() === today ? budget.todaySpent : 0;

  if (budgetToday >= campaign.dailyBudget) {
    return { canServe: false, reason: 'Daily budget exhausted' };
  }

  // Check pacing (even pacing distributes budget throughout the day)
  if (campaign.pacing === 'EVEN') {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const minutesSinceStart = (now.getTime() - startOfDay.getTime()) / (1000 * 60);
    const minutesInDay = 24 * 60;

    const expectedSpend = (campaign.dailyBudget * minutesSinceStart) / minutesInDay;
    const pacingBuffer = campaign.dailyBudget * 0.1; // 10% buffer

    if (budgetToday > expectedSpend + pacingBuffer) {
      return { canServe: false, reason: 'Pacing limit exceeded' };
    }
  }

  return { canServe: true };
}

/**
 * Check frequency cap for this session
 */
export async function checkFrequencyCap(
  campaignId: string,
  sessionId: string,
  maxPerDay: number = 3,
  prisma: any
): Promise<{ canServe: boolean; currentCount: number }> {
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

/**
 * Run second-price auction
 */
export function runAuction(candidates: AdCandidate[]): AdAuctionResult | null {
  if (candidates.length === 0) return null;

  // Sort by effective bid (bid × quality score)
  const sorted = candidates
    .map(c => ({
      ...c,
      effectiveBid: c.bid * c.qualityScore,
    }))
    .sort((a, b) => b.effectiveBid - a.effectiveBid);

  const winner = sorted[0];
  const secondPrice = sorted.length > 1 ? sorted[1].effectiveBid / winner.qualityScore : winner.bid * 0.8;

  return {
    winner: winner as AdCandidate,
    price: secondPrice,
  };
}

/**
 * Calculate CPM cost for an impression
 */
export function calculateCPMCost(baseCPM: number, qualityScore: number): number {
  // Higher quality = lower cost
  return baseCPM / qualityScore;
}

/**
 * Determine if ad is viewable (50% in viewport for 1+ second)
 * This is a placeholder - actual implementation is client-side
 */
export function isViewable(
  impressionTime: Date,
  viewTime: Date | null,
  viewportPercentage: number
): boolean {
  if (!viewTime) return false;

  const timeDiff = viewTime.getTime() - impressionTime.getTime();
  return timeDiff >= 1000 && viewportPercentage >= 0.5;
}

/**
 * Attribution window check for conversions
 */
export function isWithinAttributionWindow(
  impressionTime: Date,
  conversionTime: Date,
  clickTime: Date | null,
  windowHours: { view: number; click: number } = { view: 24, click: 168 }
): { attributed: boolean; type: 'click' | 'view' } {
  const impressionMs = impressionTime.getTime();
  const conversionMs = conversionTime.getTime();

  // Click-through attribution (7 days default)
  if (clickTime) {
    const clickMs = clickTime.getTime();
    const hoursSinceClick = (conversionMs - clickMs) / (1000 * 60 * 60);
    if (hoursSinceClick >= 0 && hoursSinceClick <= windowHours.click) {
      return { attributed: true, type: 'click' };
    }
  }

  // View-through attribution (24 hours default)
  const hoursSinceImpression = (conversionMs - impressionMs) / (1000 * 60 * 60);
  if (hoursSinceImpression >= 0 && hoursSinceImpression <= windowHours.view) {
    return { attributed: true, type: 'view' };
  }

  return { attributed: false, type: 'view' };
}
