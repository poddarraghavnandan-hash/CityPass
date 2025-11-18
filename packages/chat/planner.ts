/**
 * Chat Brain V2 - Planner
 * Deterministic planner that scores events, applies bandit policies, builds slates
 */

import { Ranker, type RankingFeatures, createRanker } from '@citypass/ranker';
import { choosePolicyForUser } from '@citypass/slate';
import type {
  ChatContextSnapshot,
  IntentionV2,
  ExplorationPlan,
  PlannerDecision,
  SlateDecision,
  SlateItemDecision,
  CandidateEvent,
} from './types';

interface ScoredEvent {
  event: CandidateEvent;
  score: number;
  factorScores: Record<string, number>;
}

/**
 * Run deterministic planner to score events and build slates
 */
export async function runPlanner(
  context: ChatContextSnapshot,
  analystOutput: { intention: IntentionV2; explorationPlan: ExplorationPlan }
): Promise<PlannerDecision> {
  const { intention, explorationPlan } = analystOutput;
  const { candidateEvents, userId, traceId, profile, learnerState } = context;

  console.log('[Planner] Building slates for trace:', traceId);

  // 1. Initialize ranker
  const ranker = await createRanker();

  // 2. Score all candidate events
  const scoredEvents = await scoreEvents(candidateEvents, intention, context, ranker);

  // 3. Select bandit policy
  const banditPolicy = await selectBanditPolicy(userId, explorationPlan);

  // 4. Build slates using policy
  const slates = buildSlates(scoredEvents, intention, explorationPlan, banditPolicy);

  // 5. Compile reasons for each slate item
  const slatesWithReasons = slates.map((slate) => ({
    ...slate,
    items: slate.items.map((item) => {
      const scored = scoredEvents.find((se) => se.event.id === item.eventId);
      return {
        ...item,
        reasons: compileReasons(scored?.factorScores || {}),
        factorScores: scored?.factorScores,
      };
    }),
  }));

  return {
    intention,
    slates: slatesWithReasons,
    meta: {
      traceId,
      banditPolicyName: banditPolicy.name,
      usedProfile: profile.moodsPreferred.length > 0,
      usedLearnerState: !!learnerState.banditPolicyName,
    },
  };
}

/**
 * Score all candidate events using ranker
 */
async function scoreEvents(
  events: CandidateEvent[],
  intention: IntentionV2,
  context: ChatContextSnapshot,
  ranker: Ranker
): Promise<ScoredEvent[]> {
  const scored: ScoredEvent[] = [];

  for (const event of events) {
    const features = buildRankingFeatures(event, intention, context);
    const result = ranker.score(features);

    scored.push({
      event,
      score: result.score,
      factorScores: result.factorContributions,
    });
  }

  // Sort by score descending
  return scored.sort((a, b) => b.score - a.score);
}

/**
 * Build ranking features for an event
 */
function buildRankingFeatures(
  event: CandidateEvent,
  intention: IntentionV2,
  context: ChatContextSnapshot
): RankingFeatures & { eventId: string } {
  const now = new Date(context.nowISO);
  const eventStart = new Date(event.startISO);

  // Time fit: how well event timing matches intention
  const diffMinutes = (eventStart.getTime() - now.getTime()) / (1000 * 60);
  const intentionWindow = new Date(intention.timeWindow.toISO);
  const untilMinutes = (intentionWindow.getTime() - now.getTime()) / (1000 * 60);

  let timeFit = 0.5;
  if (diffMinutes < 0) timeFit = 0.1; // Past
  else if (diffMinutes <= untilMinutes) timeFit = 1.0; // Within window
  else if (diffMinutes <= untilMinutes * 1.5) timeFit = 0.6;
  else timeFit = 0.3;

  // Recency: prefer sooner events
  const recencyScore = Math.max(0, 1 - diffMinutes / (untilMinutes || 1440));

  // Distance comfort (if location available)
  const distanceComfort = event.distanceMin != null ? 1 - Math.min(1, event.distanceMin / 10) : 0.5;

  // Price comfort
  const budgetMatch = matchBudget(event.priceBand, intention.budgetBand);

  // Mood alignment
  const moodAlignment = calculateMoodAlignment(event.moods, event.categories, intention.vibeDescriptors);

  // Social heat (placeholder - should come from actual metrics)
  const socialHeatScore = event.socialHeatScore || 0.5;

  // Novelty score
  const noveltyScore = event.noveltyScore || 0.5;

  // Taste match (placeholder)
  const tasteMatchScore = event.fitScore || 0.5;

  return {
    eventId: event.id,
    textualSimilarity: 0.7, // Placeholder - should use actual keyword matching
    semanticSimilarity: 0.6, // Placeholder - should use vector similarity
    timeFit,
    recencyScore,
    distanceKm: event.distanceMin || null,
    distanceComfort,
    priceMin: null,
    priceMax: null,
    priceComfort: budgetMatch,
    category: event.categories[0] || null,
    tags: event.moods,
    moodAlignment,
    views24h: 0,
    saves24h: 0,
    friendInterest: 0,
    socialHeatScore,
    noveltyScore,
    tasteMatchScore,
  };
}

/**
 * Match price band to budget preference
 */
function matchBudget(
  priceBand: CandidateEvent['priceBand'],
  budgetBand: IntentionV2['budgetBand']
): number {
  if (!priceBand || !budgetBand) return 0.7;

  const priceValue = { FREE: 0, LOW: 1, MID: 2, HIGH: 3, LUXE: 4 }[priceBand] || 2;
  const budgetValue = { LOW: 1, MID: 2, HIGH: 3, LUXE: 4 }[budgetBand] || 2;

  const diff = Math.abs(priceValue - budgetValue);
  if (diff === 0) return 1.0;
  if (diff === 1) return 0.7;
  if (diff === 2) return 0.4;
  return 0.2;
}

/**
 * Calculate mood alignment score
 */
function calculateMoodAlignment(
  eventMoods: string[],
  eventCategories: string[],
  vibeDescriptors: string[]
): number {
  if (vibeDescriptors.length === 0) return 0.5;

  const allEventTags = [...eventMoods, ...eventCategories].map((t) => t.toLowerCase());
  const allVibes = vibeDescriptors.map((v) => v.toLowerCase());

  const matches = allVibes.filter((vibe) =>
    allEventTags.some((tag) => tag.includes(vibe) || vibe.includes(tag))
  );

  return Math.min(1.0, matches.length / Math.max(1, vibeDescriptors.length));
}

/**
 * Select bandit policy for user
 */
async function selectBanditPolicy(
  userId: string | undefined,
  explorationPlan: ExplorationPlan
): Promise<{ name: string; params: any }> {
  // Try to use existing bandit system
  try {
    if (userId) {
      const result = await choosePolicyForUser(userId, {} as any);
      if (result) return { name: result.policyName, params: result.policy };
    }
  } catch (error) {
    console.warn('[Planner] Failed to load bandit policy, using default');
  }

  // Fallback based on exploration level
  const explorationWeights = {
    LOW: { safe: 0.9, novel: 0.1 },
    MEDIUM: { safe: 0.7, novel: 0.3 },
    HIGH: { safe: 0.5, novel: 0.5 },
  };

  const weights = explorationWeights[explorationPlan.explorationLevel];

  return {
    name: `exploration-${explorationPlan.explorationLevel.toLowerCase()}`,
    params: weights,
  };
}

/**
 * Build three slates: Best, Wildcard, Close & Easy
 */
function buildSlates(
  scoredEvents: ScoredEvent[],
  intention: IntentionV2,
  explorationPlan: ExplorationPlan,
  banditPolicy: { name: string; params: any }
): SlateDecision[] {
  const slates: SlateDecision[] = [];

  // 1. Best Slate: Top-ranked events
  const bestItems: SlateItemDecision[] = scoredEvents.slice(0, 5).map((se, idx) => ({
    eventId: se.event.id,
    priority: idx + 1,
    reasons: [],
    factorScores: se.factorScores,
  }));

  slates.push({
    label: 'Best',
    items: bestItems,
  });

  // 2. Wildcard Slate: High novelty if allowed
  if (explorationPlan.allowWildcardSlate) {
    const wildcardCandidates = scoredEvents.filter(
      (se) => se.factorScores.noveltyScore > 0.6 && se.score > 0.4
    );

    const wildcardItems: SlateItemDecision[] = wildcardCandidates.slice(0, 5).map((se, idx) => ({
      eventId: se.event.id,
      priority: idx + 1,
      reasons: [],
      factorScores: se.factorScores,
    }));

    slates.push({
      label: 'Wildcard',
      items: wildcardItems.length > 0 ? wildcardItems : bestItems,
    });
  }

  // 3. Close & Easy: Optimize for convenience
  const convenientCandidates = [...scoredEvents].sort((a, b) => {
    const scoreA = (a.factorScores.distanceComfort || 0) + (a.factorScores.timeFit || 0);
    const scoreB = (b.factorScores.distanceComfort || 0) + (b.factorScores.timeFit || 0);
    return scoreB - scoreA;
  });

  const closeEasyItems: SlateItemDecision[] = convenientCandidates.slice(0, 5).map((se, idx) => ({
    eventId: se.event.id,
    priority: idx + 1,
    reasons: [],
    factorScores: se.factorScores,
  }));

  slates.push({
    label: 'Close & Easy',
    items: closeEasyItems,
  });

  return slates;
}

/**
 * Compile human-friendly reasons from factor scores
 */
function compileReasons(factorScores: Record<string, number>): string[] {
  const reasons: string[] = [];

  if (factorScores.timeFit > 0.8) {
    reasons.push('Perfect timing for your schedule');
  }

  if (factorScores.moodAlignment > 0.7) {
    reasons.push('Matches your vibe');
  }

  if (factorScores.priceComfort > 0.8) {
    reasons.push('Within your budget');
  }

  if (factorScores.distanceComfort > 0.8) {
    reasons.push('Close by');
  }

  if (factorScores.socialHeatScore > 0.7) {
    reasons.push('Popular right now');
  }

  if (factorScores.noveltyScore > 0.7) {
    reasons.push('Something new to try');
  }

  if (factorScores.tasteMatchScore > 0.7) {
    reasons.push('Based on your past likes');
  }

  if (reasons.length === 0) {
    reasons.push('Recommended for you');
  }

  return reasons.slice(0, 3); // Max 3 reasons
}
