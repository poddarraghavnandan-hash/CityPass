/**
 * Node: Compose Slates
 * Create multiple recommendation slates using bandit policy
 */

import { composeSlates } from '@citypass/slate';
import { choosePolicyForUser } from '@citypass/slate/bandit';
import { getUserFeatures } from '@citypass/taste';
import type { AgentState } from '../types';
import type { RankedEvent } from '@citypass/slate';

export async function composeNode(state: AgentState): Promise<Partial<AgentState>> {
  if (!state.rankedCandidates || !state.enrichedCandidates) {
    throw new Error('[compose] Missing ranked or enriched candidates');
  }

  if (state.rankedCandidates.length === 0) {
    console.warn('[compose] No ranked candidates to compose slates');
    return {
      slates: {
        best: { name: 'best', label: 'Best Matches', events: [], strategy: 'top_score', diversity: 0 },
        wildcard: { name: 'wildcard', label: 'Wildcard Picks', events: [], strategy: 'high_novelty', diversity: 0 },
        closeAndEasy: { name: 'close_and_easy', label: 'Close & Easy', events: [], strategy: 'accessible', diversity: 0 },
      },
    };
  }

  // Get user features for slate composition
  const userFeatures = state.userId
    ? await getUserFeatures(state.userId).catch(err => {
        console.warn('[compose] Failed to fetch user features:', err.message);
        return null;
      })
    : null;

  // Choose slate policy using bandit
  const { policy, policyName, wasExploration } = await choosePolicyForUser(
    state.userId,
    {
      sessionId: state.sessionId,
      isNewUser: !state.userId,
    }
  );

  // Convert rankedCandidates to RankedEvent format
  const rankedEvents: RankedEvent[] = state.rankedCandidates.map(scored => {
    const enriched = state.enrichedCandidates!.find(e => e.id === scored.eventId)!;

    return {
      eventId: scored.eventId,
      score: scored.score,
      noveltyScore: enriched.noveltyScore,
      socialHeatScore: scored.factorContributions.socialHeatScore || 0,
      distanceKm: enriched.distanceKm,
      priceMin: enriched.priceMin,
      priceMax: enriched.priceMax,
      startTime: enriched.startTime,
      endTime: enriched.endTime,
      category: enriched.category,
      factorContributions: scored.factorContributions,
      title: enriched.title,
      subtitle: (enriched as any).subtitle || null,
      description: enriched.description,
      venueName: enriched.venueName,
      neighborhood: (enriched as any).neighborhood || null,
      city: enriched.city,
      imageUrl: enriched.imageUrl,
      bookingUrl: enriched.bookingUrl,
    };
  });

  // Compose slates using the selected policy
  const slates = composeSlates(rankedEvents, userFeatures, policy);

  console.log(
    `✅ [compose] Created slates using policy "${policyName}" (exploration: ${wasExploration}):`,
    `Best: ${slates.best.events.length}, Wildcard: ${slates.wildcard.events.length}, Close&Easy: ${slates.closeAndEasy.events.length}`
  );

  return {
    slates: {
      best: slates.best,
      wildcard: slates.wildcard,
      closeAndEasy: slates.closeAndEasy,
    },
    slatePolicy: {
      name: policyName,
      wasExploration,
    },
  };
}
