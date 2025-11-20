/**
 * Chat Brain V2 - Event Match Scorer
 * Scores events 0-100 based on relevance to user intention
 * Used for real-time restacking when LLM discovers new events
 */

import type { CandidateEvent, IntentionV2, Profile } from './types';

export interface EventScore {
  eventId: string;
  totalScore: number; // 0-105 (includes starting soon bonus)
  breakdown: {
    categoryMatch: number; // 0-30
    vibeAlignment: number; // 0-25
    timeFit: number; // 0-25 (includes +5 starting soon bonus)
    priceComfort: number; // 0-15
    socialFit: number; // 0-10
  };
}

/**
 * Score a single event against user intention
 */
export function scoreEventMatch(
  event: CandidateEvent,
  intention: IntentionV2,
  profile: Profile,
  nowISO: string
): EventScore {
  const breakdown = {
    categoryMatch: scoreCategoryMatch(event, intention),
    vibeAlignment: scoreVibeAlignment(event, intention),
    timeFit: scoreTimeFit(event, intention, nowISO),
    priceComfort: scorePriceComfort(event, intention, profile),
    socialFit: scoreSocialFit(event, intention),
  };

  const totalScore = Object.values(breakdown).reduce((sum, score) => sum + score, 0);

  return {
    eventId: event.id,
    totalScore: Math.min(100, Math.max(0, totalScore)),
    breakdown,
  };
}

/**
 * Score batch of events
 */
export function scoreEventBatch(
  events: CandidateEvent[],
  intention: IntentionV2,
  profile: Profile,
  nowISO: string
): EventScore[] {
  return events.map((event) => scoreEventMatch(event, intention, profile, nowISO));
}

/**
 * Category match score (0-30)
 */
function scoreCategoryMatch(event: CandidateEvent, intention: IntentionV2): number {
  const primaryGoal = intention.primaryGoal.toLowerCase();
  const eventCategories = event.categories.map((c) => c.toLowerCase());

  // Extract category keywords from goal
  const categoryKeywords: Record<string, string[]> = {
    fitness: ['workout', 'fitness', 'gym', 'yoga', 'exercise', 'training'],
    music: ['music', 'concert', 'show', 'band', 'performance'],
    comedy: ['comedy', 'standup', 'comedian', 'laugh'],
    theatre: ['theatre', 'theater', 'play', 'musical', 'drama'],
    dance: ['dance', 'dancing', 'ballet', 'choreography'],
    arts: ['art', 'gallery', 'museum', 'exhibition', 'painting'],
    food: ['food', 'restaurant', 'dining', 'brunch', 'dinner', 'eat'],
    networking: ['networking', 'meetup', 'professional', 'business'],
    family: ['family', 'kids', 'children'],
  };

  // Check if any category matches the goal
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (eventCategories.includes(category)) {
      // Check if any keyword appears in the goal
      const hasKeyword = keywords.some((kw) => primaryGoal.includes(kw));
      if (hasKeyword) {
        return 30; // Perfect match
      }
      return 15; // Category match but no keyword
    }
  }

  // Check if goal keywords match event title
  const titleLower = event.title.toLowerCase();
  for (const keywords of Object.values(categoryKeywords)) {
    const matchCount = keywords.filter((kw) =>
      primaryGoal.includes(kw) && titleLower.includes(kw)
    ).length;
    if (matchCount > 0) {
      return 20; // Keyword match in title
    }
  }

  return 5; // No strong match
}

/**
 * Vibe alignment score (0-25)
 */
function scoreVibeAlignment(event: CandidateEvent, intention: IntentionV2): number {
  const vibeDescriptors = intention.vibeDescriptors.map((v) => v.toLowerCase());
  const eventMoods = event.moods.map((m) => m.toLowerCase());
  const titleLower = event.title.toLowerCase();

  let score = 0;

  // Check for direct mood matches
  const moodMatches = vibeDescriptors.filter((vibe) => eventMoods.includes(vibe));
  score += moodMatches.length * 8; // 8 points per mood match

  // Check for vibe keywords in title
  const titleMatches = vibeDescriptors.filter((vibe) => titleLower.includes(vibe));
  score += titleMatches.length * 5; // 5 points per title match

  // Bonus for energy level alignment
  const hasHighEnergy = vibeDescriptors.some((v) =>
    ['energetic', 'intense', 'wild', 'party', 'loud'].includes(v)
  );
  const hasLowEnergy = vibeDescriptors.some((v) =>
    ['chill', 'relaxed', 'calm', 'mellow', 'peaceful', 'gentle'].includes(v)
  );

  if (intention.exertionLevel === 'HIGH' && hasHighEnergy) {
    score += 5;
  } else if (intention.exertionLevel === 'LOW' && hasLowEnergy) {
    score += 5;
  }

  return Math.min(25, score);
}

/**
 * Time fit score (0-20 base + up to 5 bonus)
 * Includes "starting soon" boost to prioritize immediate availability
 */
function scoreTimeFit(event: CandidateEvent, intention: IntentionV2, nowISO: string): number {
  const eventStart = new Date(event.startISO);
  const windowStart = new Date(intention.timeWindow.fromISO);
  const windowEnd = new Date(intention.timeWindow.toISO);
  const now = new Date(nowISO);

  // Event must be within time window
  if (eventStart < windowStart || eventStart > windowEnd) {
    return 0; // Outside window
  }

  // Score based on how soon the event is
  const minutesUntilEvent = (eventStart.getTime() - now.getTime()) / (1000 * 60);
  const windowDurationMinutes = (windowEnd.getTime() - windowStart.getTime()) / (1000 * 60);

  if (minutesUntilEvent < 0) {
    return 0; // Event already started
  }

  let baseScore = 0;

  // Base score: Prefer events happening soon (within first 25% of window)
  if (minutesUntilEvent < windowDurationMinutes * 0.25) {
    baseScore = 20; // Starting very soon
  } else if (minutesUntilEvent < windowDurationMinutes * 0.5) {
    baseScore = 15; // Starting soon
  } else if (minutesUntilEvent < windowDurationMinutes * 0.75) {
    baseScore = 10; // Mid-window
  } else {
    baseScore = 5; // Later in window
  }

  // BONUS: "Starting soon" boost for events within next few hours
  // This helps cold start users find immediate options
  let bonusScore = 0;
  if (minutesUntilEvent <= 60) {
    bonusScore = 5; // Starting within 1 hour - highest urgency
  } else if (minutesUntilEvent <= 120) {
    bonusScore = 4; // Starting within 2 hours
  } else if (minutesUntilEvent <= 240) {
    bonusScore = 3; // Starting within 4 hours
  } else if (minutesUntilEvent <= 360) {
    bonusScore = 2; // Starting within 6 hours
  }

  return Math.min(25, baseScore + bonusScore); // Cap at 25 to maintain score distribution
}

/**
 * Price comfort score (0-15)
 */
function scorePriceComfort(
  event: CandidateEvent,
  intention: IntentionV2,
  profile: Profile
): number {
  const userBudget = intention.budgetBand || profile.budgetBand;
  if (!userBudget || !event.priceBand) {
    return 10; // Neutral score if no price info
  }

  const budgetRank = { LOW: 1, MID: 2, HIGH: 3, LUXE: 4 };
  const priceRank = { FREE: 0, LOW: 1, MID: 2, HIGH: 3, LUXE: 4 };

  const userRank = budgetRank[userBudget];
  const eventRank = priceRank[event.priceBand];

  if (event.priceBand === 'FREE') {
    return 15; // Free is always good
  }

  // Perfect match
  if (eventRank === userRank) {
    return 15;
  }

  // One tier off
  if (Math.abs(eventRank - userRank) === 1) {
    return 10;
  }

  // Two tiers off
  if (Math.abs(eventRank - userRank) === 2) {
    return 5;
  }

  // Too expensive or too cheap
  return 2;
}

/**
 * Social fit score (0-10)
 */
function scoreSocialFit(event: CandidateEvent, intention: IntentionV2): number {
  const socialContext = intention.socialContext;
  if (!socialContext) {
    return 5; // Neutral
  }

  const titleLower = event.title.toLowerCase();
  const moods = event.moods.map((m) => m.toLowerCase());

  const socialKeywords = {
    SOLO: ['solo', 'individual', 'personal', 'self'],
    WITH_FRIENDS: ['group', 'social', 'friends', 'community'],
    DATE: ['romantic', 'couple', 'date', 'intimate'],
    FAMILY: ['family', 'kids', 'children', 'all ages'],
  };

  const keywords = socialKeywords[socialContext] || [];
  const titleMatches = keywords.filter((kw) => titleLower.includes(kw)).length;
  const moodMatches = keywords.filter((kw) => moods.includes(kw)).length;

  if (titleMatches + moodMatches > 0) {
    return 10; // Good social fit
  }

  return 5; // Neutral
}

/**
 * Sort events by match score (descending)
 */
export function sortByMatchScore(
  events: CandidateEvent[],
  scores: EventScore[]
): CandidateEvent[] {
  const scoreMap = new Map(scores.map((s) => [s.eventId, s.totalScore]));

  return [...events].sort((a, b) => {
    const scoreA = scoreMap.get(a.id) || 0;
    const scoreB = scoreMap.get(b.id) || 0;
    return scoreB - scoreA; // Descending
  });
}
