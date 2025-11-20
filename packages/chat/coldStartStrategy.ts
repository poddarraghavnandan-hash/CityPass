/**
 * Cold Start Strategy
 * Provides quality event recommendations for first-time users with no profile/history
 *
 * Strategy:
 * 1. Popular events: High social heat, trending, well-reviewed
 * 2. Diverse categories: Show variety to learn user preferences
 * 3. Starting soon: Prioritize immediate availability for quick wins
 * 4. Quality venues: Favor established, reputable venues
 * 5. Free/low-cost: Lower barrier to first experience
 */

import { prisma } from '@citypass/db';
import type { CandidateEvent } from './types';

export interface ColdStartOptions {
  city: string;
  timeWindow: { fromISO: string; toISO: string };
  maxEvents?: number;
  diversityBoost?: boolean; // Ensure variety across categories
}

/**
 * Get popular events for cold start users
 * Returns a diverse mix of high-quality, trending events
 */
export async function getPopularEventsForColdStart(
  options: ColdStartOptions
): Promise<CandidateEvent[]> {
  const { city, timeWindow, maxEvents = 30, diversityBoost = true } = options;

  try {
    console.log('[ColdStart] Fetching popular events for first-time user...');

    // Query popular events with various quality signals
    const events = await prisma.event.findMany({
      where: {
        city,
        startTime: {
          gte: new Date(timeWindow.fromISO),
          lte: new Date(timeWindow.toISO),
        },
      },
      take: 100, // Get larger pool to ensure diversity
      orderBy: [
        // Prioritize events with more engagement (if we track this)
        // For now, prioritize starting soon + free/cheap events
        { startTime: 'asc' },
      ],
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        neighborhood: true,
        venueName: true,
        category: true,
        priceMin: true,
        priceMax: true,
        tags: true,
      },
    });

    console.log(`[ColdStart] Found ${events.length} events in pool`);

    // Convert to CandidateEvent format
    let candidates: CandidateEvent[] = events.map((event) => ({
      id: event.id,
      title: event.title,
      startISO: event.startTime.toISOString(),
      endISO: event.endTime ? event.endTime.toISOString() : undefined,
      neighborhood: event.neighborhood || null,
      distanceMin: null,
      priceBand: mapPriceToBand(event.priceMin, event.priceMax),
      categories: event.category ? [event.category] : [],
      moods: event.tags || [],
      venueName: event.venueName,
      socialHeatScore: null,
      noveltyScore: null,
      fitScore: null,
    }));

    // Apply cold start scoring
    const scoredCandidates = candidates.map((event) => ({
      event,
      score: calculateColdStartScore(event, timeWindow.fromISO),
    }));

    // Sort by cold start score
    scoredCandidates.sort((a, b) => b.score - a.score);

    // If diversity boost enabled, ensure variety across categories
    if (diversityBoost) {
      candidates = ensureCategoryDiversity(scoredCandidates.map((s) => s.event));
    } else {
      candidates = scoredCandidates.map((s) => s.event);
    }

    console.log(`[ColdStart] Returning ${Math.min(maxEvents, candidates.length)} diverse, popular events`);

    return candidates.slice(0, maxEvents);
  } catch (error) {
    console.error('[ColdStart] Failed to get popular events:', error);
    return [];
  }
}

/**
 * Calculate cold start quality score for an event
 * Prioritizes: starting soon, free/cheap, diverse categories
 */
function calculateColdStartScore(event: CandidateEvent, nowISO: string): number {
  let score = 0;

  // 1. Starting soon bonus (0-40 points)
  const now = new Date(nowISO);
  const eventStart = new Date(event.startISO);
  const minutesUntil = (eventStart.getTime() - now.getTime()) / (1000 * 60);

  if (minutesUntil <= 60) {
    score += 40; // Starting within 1 hour
  } else if (minutesUntil <= 120) {
    score += 35; // Within 2 hours
  } else if (minutesUntil <= 240) {
    score += 30; // Within 4 hours
  } else if (minutesUntil <= 360) {
    score += 25; // Within 6 hours
  } else if (minutesUntil <= 720) {
    score += 20; // Within 12 hours
  } else if (minutesUntil <= 1440) {
    score += 15; // Within 24 hours
  } else {
    score += 10; // Later
  }

  // 2. Price accessibility (0-30 points)
  if (event.priceBand === 'FREE') {
    score += 30;
  } else if (event.priceBand === 'LOW') {
    score += 25;
  } else if (event.priceBand === 'MID') {
    score += 15;
  } else if (event.priceBand === 'HIGH') {
    score += 5;
  }
  // LUXE gets 0 points - less accessible for cold start

  // 3. Category appeal for first-timers (0-20 points)
  // Prioritize broadly appealing categories
  const category = event.categories[0]?.toUpperCase();
  const categoryBoost: Record<string, number> = {
    MUSIC: 20,      // Universal appeal
    FOOD: 18,       // Universal appeal
    COMEDY: 18,     // Universal appeal
    ARTS: 15,       // Broad appeal
    THEATRE: 15,    // Broad appeal
    FAMILY: 12,     // Specific but accessible
    DANCE: 12,      // Specific but accessible
    FITNESS: 10,    // More niche
    NETWORKING: 8,  // More niche
    OTHER: 5,
  };
  score += categoryBoost[category] || 5;

  // 4. Venue reputation (0-10 points)
  // If we had venue ratings, we'd use them here
  // For now, give bonus for having a venue name (indicates established event)
  if (event.venueName) {
    score += 10;
  }

  return score;
}

/**
 * Ensure diversity across categories
 * Returns a balanced mix of different event types
 */
function ensureCategoryDiversity(events: CandidateEvent[]): CandidateEvent[] {
  const categoryCounts = new Map<string, number>();
  const maxPerCategory = 5; // Max events per category in final slate
  const diverseEvents: CandidateEvent[] = [];

  for (const event of events) {
    const category = event.categories[0] || 'OTHER';
    const count = categoryCounts.get(category) || 0;

    if (count < maxPerCategory) {
      diverseEvents.push(event);
      categoryCounts.set(category, count + 1);
    }

    // Stop when we have enough events
    if (diverseEvents.length >= 30) {
      break;
    }
  }

  return diverseEvents;
}

/**
 * Map price to band
 */
function mapPriceToBand(
  priceMin?: number | null,
  priceMax?: number | null
): 'FREE' | 'LOW' | 'MID' | 'HIGH' | 'LUXE' | null {
  if (priceMin == null && priceMax == null) return null;
  if (priceMin === 0 && (priceMax === 0 || priceMax == null)) return 'FREE';

  const avgPrice = ((priceMin || 0) + (priceMax || priceMin || 0)) / 2;

  if (avgPrice < 20) return 'LOW';
  if (avgPrice < 60) return 'MID';
  if (avgPrice < 120) return 'HIGH';
  return 'LUXE';
}

/**
 * Check if user is in cold start state
 * Returns true if user has minimal history/profile
 */
export function isUserInColdStart(profile: any): boolean {
  // User is in cold start if:
  // - No taste vector
  // - No mood preferences
  // - No budget band
  // - No social style
  const hasProfile = !!(
    profile.tasteVectorId ||
    (profile.moodsPreferred && profile.moodsPreferred.length > 0) ||
    profile.budgetBand ||
    profile.socialStyle
  );

  return !hasProfile;
}
