/**
 * Slate Composer
 * Creates multiple recommendation slates with different strategies
 */

import type { UserFeatures } from '@citypass/taste';

// ============================================
// Types
// ============================================

export interface RankedEvent {
  eventId: string;
  score: number;
  noveltyScore: number;
  socialHeatScore: number;
  distanceKm: number | null;
  priceMin: number | null;
  priceMax: number | null;
  startTime: Date;
  endTime?: Date | null;
  category: string | null;
  factorContributions: Record<string, number>;

  // Full event data (for rendering)
  title: string;
  subtitle?: string | null;
  description: string | null;
  venueName: string | null;
  neighborhood?: string | null;
  city: string;
  imageUrl: string | null;
  bookingUrl: string | null;
}

export interface Slate {
  name: string;
  label: string;
  events: SlateItem[];
  strategy: string;
  diversity: number; // 0-1, measure of diversity
}

export interface SlateItem {
  eventId: string;
  position: number;
  score: number;
  reasons: string[];

  // Full event data
  title: string;
  venueName: string | null;
  city: string;
  startTime: string;
  endTime: string | null;
  priceMin: number | null;
  priceMax: number | null;
  imageUrl: string | null;
  bookingUrl: string | null;
  category: string | null;

  // Additional details for rich UI
  description: string | null;
  subtitle: string | null;
  neighborhood: string | null;
  distanceKm: number | null;
}

export interface SlatePolicy {
  name: string;

  // Slate composition parameters
  bestTopK: number; // Number of events in "Best" slate
  wildcardTopK: number; // Number in "Wildcard" slate
  closeEasyTopK: number; // Number in "Close & Easy" slate

  // Selection criteria
  wildcardNoveltyThreshold: number; // Min novelty for wildcard (0-1)
  wildcardMinScore: number; // Min overall score for wildcard (0-1)
  closeEasyMaxPrice: number; // Max price for close & easy
  closeEasyMinScore: number; // Min score for close & easy

  // Diversity settings
  enableDiversification: boolean;
  diversityWindow: number; // Look back N events to avoid duplicates
}

// ============================================
// Default Policies
// ============================================

export const DEFAULT_POLICY: SlatePolicy = {
  name: 'balanced',
  bestTopK: 10,
  wildcardTopK: 10,
  closeEasyTopK: 10,
  wildcardNoveltyThreshold: 0.6,
  wildcardMinScore: 0.4,
  closeEasyMaxPrice: 30,
  closeEasyMinScore: 0.3,
  enableDiversification: true,
  diversityWindow: 5,
};

export const EXPLORATION_POLICY: SlatePolicy = {
  name: '80safe-20novel',
  bestTopK: 8,
  wildcardTopK: 12,
  closeEasyTopK: 8,
  wildcardNoveltyThreshold: 0.7,
  wildcardMinScore: 0.35,
  closeEasyMaxPrice: 25,
  closeEasyMinScore: 0.3,
  enableDiversification: true,
  diversityWindow: 5,
};

// ============================================
// Slate Composer
// ============================================

/**
 * Compose slates from ranked events
 */
export function composeSlates(
  rankedEvents: RankedEvent[],
  userFeatures: UserFeatures | null,
  policy: SlatePolicy = DEFAULT_POLICY
): {
  best: Slate;
  wildcard: Slate;
  closeAndEasy: Slate;
} {
  // Sort by overall score
  const sorted = [...rankedEvents].sort((a, b) => b.score - a.score);

  // Slate 1: Best (top scores)
  const bestEvents = sorted.slice(0, policy.bestTopK);
  const bestSlate: Slate = {
    name: 'best',
    label: 'Best Matches',
    events: bestEvents.map((e, i) => toSlateItem(e, i, 'top fit score')),
    strategy: 'top_score',
    diversity: calculateSlateDiversity(bestEvents),
  };

  // Slate 2: Wildcard (high novelty, moderate fit)
  const wildcardCandidates = sorted.filter(
    e =>
      e.noveltyScore >= policy.wildcardNoveltyThreshold &&
      e.score >= policy.wildcardMinScore
  );

  wildcardCandidates.sort((a, b) => b.noveltyScore - a.noveltyScore);

  const wildcardEvents = wildcardCandidates.slice(0, policy.wildcardTopK);
  const wildcardSlate: Slate = {
    name: 'wildcard',
    label: 'Wildcard Picks',
    events: wildcardEvents.map((e, i) =>
      toSlateItem(e, i, 'novel discovery', 'something new')
    ),
    strategy: 'high_novelty',
    diversity: calculateSlateDiversity(wildcardEvents),
  };

  // Slate 3: Close & Easy (nearby, low price, accessible)
  const closeEasyCandidates = sorted.filter(e => {
    const isAffordable =
      e.priceMin === null ||
      e.priceMin === 0 ||
      e.priceMin <= policy.closeEasyMaxPrice;
    const meetsMinScore = e.score >= policy.closeEasyMinScore;
    return isAffordable && meetsMinScore;
  });

  // Sort by price (cheaper first), then by distance (closer first)
  closeEasyCandidates.sort((a, b) => {
    const aPrice = a.priceMin ?? 0;
    const bPrice = b.priceMin ?? 0;
    if (aPrice !== bPrice) return aPrice - bPrice;

    const aDist = a.distanceKm ?? 999;
    const bDist = b.distanceKm ?? 999;
    return aDist - bDist;
  });

  const closeEasyEvents = closeEasyCandidates.slice(0, policy.closeEasyTopK);
  const closeEasySlate: Slate = {
    name: 'close_and_easy',
    label: 'Close & Easy',
    events: closeEasyEvents.map((e, i) =>
      toSlateItem(e, i, 'affordable', 'nearby')
    ),
    strategy: 'accessible',
    diversity: calculateSlateDiversity(closeEasyEvents),
  };

  return {
    best: bestSlate,
    wildcard: wildcardSlate,
    closeAndEasy: closeEasySlate,
  };
}

/**
 * Convert RankedEvent to SlateItem
 */
function toSlateItem(
  event: RankedEvent,
  position: number,
  ...extraReasons: string[]
): SlateItem {
  const reasons: string[] = [...extraReasons];

  // Add distance reason
  if (event.distanceKm !== null) {
    if (event.distanceKm <= 1) {
      reasons.push(`${Math.round(event.distanceKm * 10) / 10} km away`);
    } else if (event.distanceKm <= 5) {
      reasons.push(`${Math.round(event.distanceKm)} km away`);
    }
  }

  // Add price reason
  if (event.priceMin === 0) {
    reasons.push('free');
  } else if (event.priceMin && event.priceMin < 20) {
    reasons.push(`under $${event.priceMin}`);
  }

  // Add social reason
  if (event.socialHeatScore >= 0.7) {
    reasons.push('trending');
  }

  return {
    eventId: event.eventId,
    position,
    score: event.score,
    reasons: reasons.slice(0, 3), // Limit to 3 reasons
    title: event.title,
    venueName: event.venueName,
    city: event.city,
    startTime: event.startTime.toISOString(),
    endTime: (event as any).endTime ? new Date((event as any).endTime).toISOString() : null,
    priceMin: event.priceMin,
    priceMax: event.priceMax,
    imageUrl: event.imageUrl,
    bookingUrl: event.bookingUrl,
    category: event.category,
    description: event.description,
    subtitle: (event as any).subtitle || null,
    neighborhood: (event as any).neighborhood || null,
    distanceKm: event.distanceKm,
  };
}

/**
 * Calculate diversity of a slate
 * Measures category and venue distribution
 */
function calculateSlateDiversity(events: RankedEvent[]): number {
  if (events.length === 0) return 0;

  const categories = new Set(events.map(e => e.category).filter(Boolean));
  const venues = new Set(events.map(e => e.venueName).filter(Boolean));

  const categoryDiversity = categories.size / Math.min(events.length, 5);
  const venueDiversity = venues.size / events.length;

  return (categoryDiversity + venueDiversity) / 2;
}

/**
 * Apply diversification to remove similar events
 * Uses a greedy algorithm to maximize diversity
 */
export function diversifySlate(
  events: RankedEvent[],
  topK: number,
  diversityWeight: number = 0.3
): RankedEvent[] {
  if (events.length <= topK) return events;

  const selected: RankedEvent[] = [];
  const remaining = [...events];

  // Always select top event
  selected.push(remaining.shift()!);

  while (selected.length < topK && remaining.length > 0) {
    // Score each remaining event based on:
    // (1-w)*original_score + w*diversity_from_selected
    const scored = remaining.map(event => {
      const diversity = calculateEventDiversity(event, selected);
      const adjustedScore =
        (1 - diversityWeight) * event.score + diversityWeight * diversity;

      return { event, adjustedScore };
    });

    // Select best adjusted score
    scored.sort((a, b) => b.adjustedScore - a.adjustedScore);
    const best = scored[0];

    selected.push(best.event);
    remaining.splice(remaining.indexOf(best.event), 1);
  }

  return selected;
}

/**
 * Calculate how diverse an event is from a set of events
 */
function calculateEventDiversity(
  event: RankedEvent,
  others: RankedEvent[]
): number {
  if (others.length === 0) return 1.0;

  let diversitySum = 0;

  for (const other of others) {
    let similarity = 0;

    // Same category: -0.3
    if (event.category && event.category === other.category) {
      similarity += 0.3;
    }

    // Same venue: -0.5
    if (event.venueName && event.venueName === other.venueName) {
      similarity += 0.5;
    }

    // Similar price range: -0.2
    const eventPrice = event.priceMin ?? 0;
    const otherPrice = other.priceMin ?? 0;
    if (Math.abs(eventPrice - otherPrice) < 10) {
      similarity += 0.2;
    }

    diversitySum += 1.0 - similarity;
  }

  return diversitySum / others.length;
}

// ============================================
// Slate Overlap Metrics
// ============================================

/**
 * Calculate overlap between two slates
 */
export function calculateSlateOverlap(slate1: Slate, slate2: Slate): number {
  const ids1 = new Set(slate1.events.map(e => e.eventId));
  const ids2 = new Set(slate2.events.map(e => e.eventId));

  const intersection = new Set([...ids1].filter(id => ids2.has(id)));
  const union = new Set([...ids1, ...ids2]);

  return union.size > 0 ? intersection.size / union.size : 0;
}

// ============================================
// Exports
// ============================================

export * from './bandit';
