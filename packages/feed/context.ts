/**
 * Feed Context Integration
 * Bridges chat brain state into feed ranking system
 */

import { prisma } from '@citypass/db';
import type { IntentionV2 } from '../chat/types';

export interface FeedContext {
  lastIntention?: IntentionV2;
  tasteVectorId?: string | null;
  explorationLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  recentActivitySummary?: {
    saves: number;
    clicks: number;
    hides: number;
  };
}

/**
 * Get feed personalization context for a user
 * Reads from UserContextSnapshot (populated by chat orchestrator)
 */
export async function getFeedContextForUser(
  userId?: string,
  anonId?: string
): Promise<FeedContext> {
  console.log('[FeedContext] Loading context for user:', userId || anonId);

  // Default fallback
  const defaultContext: FeedContext = {
    explorationLevel: 'MEDIUM',
    tasteVectorId: null,
  };

  if (!userId && !anonId) {
    return defaultContext;
  }

  try {
    // 1. Load user context snapshot if userId exists
    let contextSnapshot: any = null;
    if (userId) {
      contextSnapshot = await prisma.userContextSnapshot.findUnique({
        where: { userId },
        select: {
          lastIntentionJson: true,
          lastTasteVectorId: true,
          lastUpdatedAt: true,
        },
      });
    }

    // 2. Load taste vector metadata for exploration level
    let tasteVectorId: string | null = null;
    let explorationLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';

    if (userId) {
      const tasteVector = await prisma.tasteVector.findUnique({
        where: { userId },
        select: {
          id: true,
          metadata: true,
        },
      });

      if (tasteVector) {
        tasteVectorId = tasteVector.id;
        const metadata = tasteVector.metadata as any;
        explorationLevel = metadata?.explorationLevel || 'MEDIUM';
      }
    }

    // 3. Load recent activity summary
    const recentActivitySummary = await loadRecentActivitySummary(userId, anonId);

    // 4. Parse last intention from snapshot
    let lastIntention: IntentionV2 | undefined;
    if (contextSnapshot?.lastIntentionJson) {
      try {
        lastIntention = contextSnapshot.lastIntentionJson as IntentionV2;
      } catch (error) {
        console.warn('[FeedContext] Failed to parse last intention:', error);
      }
    }

    // Use snapshot taste vector ID if available
    if (contextSnapshot?.lastTasteVectorId) {
      tasteVectorId = contextSnapshot.lastTasteVectorId;
    }

    console.log('[FeedContext] ✓ Loaded context:', {
      hasIntention: !!lastIntention,
      tasteVectorId,
      explorationLevel,
    });

    return {
      lastIntention,
      tasteVectorId,
      explorationLevel,
      recentActivitySummary,
    };
  } catch (error) {
    console.error('[FeedContext] Failed to load feed context:', error);
    return defaultContext;
  }
}

/**
 * Load recent activity summary from event logs
 */
async function loadRecentActivitySummary(
  userId?: string,
  anonId?: string
): Promise<{ saves: number; clicks: number; hides: number } | undefined> {
  const identifier = userId || anonId;
  if (!identifier) return undefined;

  try {
    const recentLogs = await prisma.eventLog.findMany({
      where: {
        OR: [
          { userId: userId || undefined },
          { anonId: anonId || undefined },
        ],
        eventType: { in: ['SAVE', 'CLICK_ROUTE', 'HIDE'] },
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
      select: {
        eventType: true,
      },
    });

    const saves = recentLogs.filter((log) => log.eventType === 'SAVE').length;
    const clicks = recentLogs.filter((log) => log.eventType === 'CLICK_ROUTE').length;
    const hides = recentLogs.filter((log) => log.eventType === 'HIDE').length;

    return { saves, clicks, hides };
  } catch (error) {
    console.warn('[FeedContext] Failed to load recent activity:', error);
    return undefined;
  }
}

/**
 * Check if user has recent chat context (within last 24 hours)
 */
export async function hasRecentChatContext(userId: string): Promise<boolean> {
  if (!userId) return false;

  try {
    const snapshot = await prisma.userContextSnapshot.findUnique({
      where: { userId },
      select: { lastUpdatedAt: true },
    });

    if (!snapshot) return false;

    const hoursSinceUpdate =
      (Date.now() - snapshot.lastUpdatedAt.getTime()) / (1000 * 60 * 60);

    return hoursSinceUpdate < 24;
  } catch (error) {
    console.error('[FeedContext] Failed to check recent context:', error);
    return false;
  }
}

/**
 * Enrich feed items with chat context signals
 * Can be used to boost events matching last intention
 */
export function enrichFeedItemsWithChatContext(
  feedItems: Array<{ eventId: string; score: number; [key: string]: any }>,
  feedContext: FeedContext
): Array<{ eventId: string; score: number; chatContextBoost?: number; [key: string]: any }> {
  if (!feedContext.lastIntention) {
    return feedItems;
  }

  const { lastIntention } = feedContext;

  return feedItems.map((item) => {
    let chatContextBoost = 0;

    // 1. Boost if event matches intention time window
    if (item.startTime && lastIntention.timeWindow) {
      const eventStart = new Date(item.startTime).getTime();
      const intentionStart = new Date(lastIntention.timeWindow.fromISO).getTime();
      const intentionEnd = new Date(lastIntention.timeWindow.toISO).getTime();

      if (eventStart >= intentionStart && eventStart <= intentionEnd) {
        chatContextBoost += 0.2; // Strong boost for time match
      }
    }

    // 2. Boost if event matches intention vibe descriptors
    if (lastIntention.vibeDescriptors.length > 0) {
      const eventTags = item.tags || [];
      const eventCategory = item.category || '';
      const eventDescription = item.description || '';

      const matchesVibe = lastIntention.vibeDescriptors.some((vibe) => {
        const vibeLower = vibe.toLowerCase();
        return (
          eventTags.some((tag: string) => tag.toLowerCase().includes(vibeLower)) ||
          eventCategory.toLowerCase().includes(vibeLower) ||
          eventDescription.toLowerCase().includes(vibeLower)
        );
      });

      if (matchesVibe) {
        chatContextBoost += 0.15; // Moderate boost for vibe match
      }
    }

    // 3. Boost if event matches intention budget band
    if (lastIntention.budgetBand && item.priceMin != null) {
      const budgetMatches = checkBudgetMatch(
        item.priceMin,
        item.priceMax,
        lastIntention.budgetBand
      );

      if (budgetMatches) {
        chatContextBoost += 0.1; // Smaller boost for budget match
      }
    }

    // 4. Boost if event matches intention city
    if (lastIntention.city && item.city) {
      if (item.city.toLowerCase() === lastIntention.city.toLowerCase()) {
        chatContextBoost += 0.05; // Small boost for city match
      }
    }

    // 5. Boost if event matches intention neighborhood
    if (lastIntention.neighborhoodHints.length > 0 && item.neighborhood) {
      const matchesNeighborhood = lastIntention.neighborhoodHints.some(
        (hint) => item.neighborhood.toLowerCase().includes(hint.toLowerCase())
      );

      if (matchesNeighborhood) {
        chatContextBoost += 0.1; // Moderate boost for neighborhood match
      }
    }

    // Apply boost to score (multiplicative)
    const boostedScore = item.score * (1 + chatContextBoost);

    return {
      ...item,
      score: boostedScore,
      chatContextBoost,
    };
  });
}

/**
 * Helper: Check if event price matches budget band
 */
function checkBudgetMatch(
  priceMin: number,
  priceMax: number | null,
  budgetBand: string
): boolean {
  const avgPrice = (priceMin + (priceMax || priceMin)) / 2;

  switch (budgetBand) {
    case 'LOW':
      return avgPrice < 30;
    case 'MID':
      return avgPrice >= 30 && avgPrice < 75;
    case 'HIGH':
      return avgPrice >= 75 && avgPrice < 150;
    case 'LUXE':
      return avgPrice >= 150;
    default:
      return true; // No budget restriction
  }
}
