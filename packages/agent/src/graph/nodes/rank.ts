/**
 * Node: Rank Candidates
 * Score events using the Ranker v1 model
 */

import { createRanker, calculateTimeFit, calculateDistanceComfort, calculatePriceComfort, calculateMoodAlignment, calculateSocialHeat } from '@citypass/ranker';
import type { AgentState, ScoredEvent } from '../types';
import type { RankingFeatures } from '@citypass/ranker';

export async function rankNode(state: AgentState): Promise<Partial<AgentState>> {
  if (!state.enrichedCandidates || !state.intention) {
    throw new Error('[rank] Missing enriched candidates or intention');
  }

  if (state.enrichedCandidates.length === 0) {
    console.warn('[rank] No candidates to rank');
    return {
      rankedCandidates: [],
    };
  }

  // Load ranker from latest snapshot or defaults
  const ranker = await createRanker();

  // Build features for each candidate
  const eventFeatures: RankingFeatures[] = state.enrichedCandidates.map(event => {
    const timeFit = calculateTimeFit(event.startTime, state.intention!);

    const distanceComfort = calculateDistanceComfort(
      event.distanceKm,
      state.intention!.tokens.distanceKm
    );

    const priceComfort = calculatePriceComfort(
      event.priceMin,
      event.priceMax,
      state.intention!.tokens.budget
    );

    const moodAlignment = calculateMoodAlignment(
      event.category,
      event.tags,
      state.intention!.tokens.mood
    );

    const socialHeatScore = calculateSocialHeat(
      event.socialHeat.views,
      event.socialHeat.saves,
      event.friendInterest
    );

    return {
      eventId: event.id,
      textualSimilarity: event.source === 'keyword' ? event.score : 0.5,
      semanticSimilarity: event.source === 'vector' ? event.score : 0.5,
      timeFit,
      recencyScore: timeFit, // Same as timeFit for now
      distanceKm: event.distanceKm,
      distanceComfort,
      priceMin: event.priceMin,
      priceMax: event.priceMax,
      priceComfort,
      category: event.category,
      tags: event.tags,
      moodAlignment,
      views24h: event.socialHeat.views,
      saves24h: event.socialHeat.saves,
      friendInterest: event.friendInterest,
      socialHeatScore,
      noveltyScore: event.noveltyScore,
      tasteMatchScore: event.tasteMatchScore,
    } as RankingFeatures;
  });

  // Score all events
  const scoredEvents = ranker.scoreEvents(eventFeatures);

  // Sort by score descending
  scoredEvents.sort((a, b) => b.score - a.score);

  console.log(`✅ [rank] Ranked ${scoredEvents.length} events (top score: ${scoredEvents[0]?.score.toFixed(3)})`);

  return {
    rankedCandidates: scoredEvents,
  };
}
