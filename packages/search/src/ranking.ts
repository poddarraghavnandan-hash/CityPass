/**
 * Learning-to-Rank System with Thompson Sampling
 * Features: Time-based, location-based, category, price, social proof, novelty
 */

import { Event, UserProfile } from '@citypass/db';

export interface UserContext {
  sessionId: string;
  userId?: string;
  city: string;
  coords?: { lat: number; lon: number };
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'late';
  dayOfWeek: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  query?: string;
  prefs?: {
    categories?: string[];
    neighborhoods?: string[];
    priceMin?: number;
    priceMax?: number;
  };
}

export interface EventFeatures {
  // Textual relevance
  textualSimilarity: number; // 0-1, from keyword search
  semanticSimilarity: number; // 0-1, from vector search

  // Temporal
  hoursUntilEvent: number;
  isDuringPreferredTime: number; // 0 or 1
  isDuringWeekend: number; // 0 or 1

  // Location
  distanceKm: number;
  isInPreferredNeighborhood: number; // 0 or 1

  // Category & Price
  isPreferredCategory: number; // 0 or 1
  priceLevel: number; // 0 (free), 1 (cheap), 2 (medium), 3 (expensive)
  isInPriceBudget: number; // 0 or 1

  // Social Proof
  viewCount24h: number;
  saveCount24h: number;
  friendSaveCount: number;

  // Quality & Novelty
  venueQualityScore: number; // 0-1
  isNewVenue: number; // 0 or 1
  hasBeenSeen: number; // 0 or 1

  // Diversity
  categoryDiversity: number; // 0-1, based on recent views
}

export interface RankingWeights {
  version: number;
  weights: {
    textualSimilarity: number;
    semanticSimilarity: number;
    hoursUntilEvent: number;
    isDuringPreferredTime: number;
    isDuringWeekend: number;
    distanceKm: number;
    isInPreferredNeighborhood: number;
    isPreferredCategory: number;
    priceLevel: number;
    isInPriceBudget: number;
    viewCount24h: number;
    saveCount24h: number;
    friendSaveCount: number;
    venueQualityScore: number;
    isNewVenue: number;
    hasBeenSeen: number;
    categoryDiversity: number;
  };
}

// Default weights (will be updated by learning)
export const DEFAULT_WEIGHTS: RankingWeights = {
  version: 1,
  weights: {
    textualSimilarity: 0.25,
    semanticSimilarity: 0.20,
    hoursUntilEvent: -0.005, // Slight penalty for far future
    isDuringPreferredTime: 0.15,
    isDuringWeekend: 0.05,
    distanceKm: -0.02, // Penalty per km
    isInPreferredNeighborhood: 0.12,
    isPreferredCategory: 0.18,
    priceLevel: -0.03, // Slight penalty for higher price
    isInPriceBudget: 0.10,
    viewCount24h: 0.0001, // Per view
    saveCount24h: 0.001, // Per save
    friendSaveCount: 0.05, // Per friend save
    venueQualityScore: 0.08,
    isNewVenue: 0.04,
    hasBeenSeen: -0.15, // Penalize already seen
    categoryDiversity: 0.06,
  },
};

/**
 * Extract features for an event given user context
 */
export function extractFeatures(
  event: Event & { viewCount?: number; saveCount?: number; friendSaves?: number },
  context: UserContext,
  seenEventIds: Set<string> = new Set(),
  recentCategories: string[] = []
): EventFeatures {
  const now = new Date();
  const eventStart = new Date(event.startTime);
  const hoursUntil = (eventStart.getTime() - now.getTime()) / (1000 * 60 * 60);

  // Distance calculation (if coords provided)
  let distanceKm = 10; // Default assumption
  if (context.coords && event.lat && event.lon) {
    distanceKm = haversineDistance(
      context.coords.lat,
      context.coords.lon,
      event.lat,
      event.lon
    );
  }

  // Time of day matching
  const eventHour = eventStart.getHours();
  let eventTimeOfDay: string;
  if (eventHour < 12) eventTimeOfDay = 'morning';
  else if (eventHour < 17) eventTimeOfDay = 'afternoon';
  else if (eventHour < 22) eventTimeOfDay = 'evening';
  else eventTimeOfDay = 'late';

  // Weekend
  const eventDayOfWeek = eventStart.getDay();
  const isWeekend = eventDayOfWeek === 0 || eventDayOfWeek === 6;

  // Price level
  const avgPrice = event.priceMin !== null && event.priceMax !== null
    ? (event.priceMin + event.priceMax) / 2
    : event.priceMin ?? event.priceMax ?? 0;

  let priceLevel = 0;
  if (avgPrice === 0) priceLevel = 0;
  else if (avgPrice < 30) priceLevel = 1;
  else if (avgPrice < 70) priceLevel = 2;
  else priceLevel = 3;

  // Budget match
  const isInBudget = context.prefs?.priceMax
    ? ((event.priceMin ?? 0) <= context.prefs.priceMax ? 1 : 0)
    : 1;

  // Category diversity
  const categoryCount = recentCategories.filter(c => c === event.category).length;
  const categoryDiversity = Math.max(0, 1 - categoryCount / 10);

  return {
    textualSimilarity: 0.5, // Placeholder - set by caller
    semanticSimilarity: 0.5, // Placeholder - set by caller
    hoursUntilEvent: Math.min(hoursUntil, 168), // Cap at 1 week
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
    venueQualityScore: 0.7, // Placeholder - could come from venue ratings
    isNewVenue: 0, // Placeholder - needs venue age data
    hasBeenSeen: seenEventIds.has(event.id) ? 1 : 0,
    categoryDiversity,
  };
}

/**
 * Compute ranking score using feature weights
 */
export function computeScore(features: EventFeatures, weights: RankingWeights): number {
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

/**
 * Thompson Sampling for exploration/exploitation
 * Uses Beta distribution for click-through rate estimation
 */
export interface BanditArm {
  eventId: string;
  alpha: number; // Success count + 1
  beta: number;  // Failure count + 1
}

export function sampleThompson(arm: BanditArm): number {
  // Sample from Beta(alpha, beta) using Gamma approximation
  const gammaAlpha = gammaRandom(arm.alpha, 1);
  const gammaBeta = gammaRandom(arm.beta, 1);
  return gammaAlpha / (gammaAlpha + gammaBeta);
}

/**
 * Epsilon-greedy exploration strategy
 */
export function applyEpsilonGreedy(
  scores: number[],
  epsilon: number = 0.1
): number[] {
  const shouldExplore = Math.random() < epsilon;

  if (shouldExplore) {
    // Add random noise for exploration
    return scores.map(s => s + Math.random() * 0.2 - 0.1);
  }

  return scores;
}

/**
 * Add exploration bonus (UCB1-style)
 */
export function addExplorationBonus(
  score: number,
  impressionCount: number,
  totalImpressions: number
): number {
  if (impressionCount === 0) return score + 1.0; // Max bonus for unseen

  const explorationTerm = Math.sqrt((2 * Math.log(totalImpressions)) / impressionCount);
  return score + 0.1 * explorationTerm;
}

// Utility: Haversine distance
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

// Simple Gamma distribution sampler (using Marsaglia & Tsang method)
function gammaRandom(shape: number, scale: number): number {
  if (shape < 1) {
    // Use Johnk's generator for shape < 1
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

// Box-Muller transform for normal distribution
function randomNormal(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
