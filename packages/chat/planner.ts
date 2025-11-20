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
 * PHASE 4 (WEEK 8-10): Causal debiasing using inverse propensity weighting
 * Reduces popularity bias by downweighting over-exposed events
 */
function debiasPopularity(scoredEvents: ScoredEvent[], alpha: number = 0.3): ScoredEvent[] {
  if (scoredEvents.length === 0) return [];

  // Calculate average view count for normalization
  const totalViews = scoredEvents.reduce(
    (sum, se) => sum + (se.event.socialHeatScore || 0),
    0
  );
  const avgViews = totalViews / scoredEvents.length || 1;

  // Apply inverse propensity weighting
  const debiased = scoredEvents.map((se) => {
    const views = se.event.socialHeatScore || 0;
    const propensity = (views + 1) / (avgViews + 1); // +1 for smoothing
    const debiasWeight = Math.pow(propensity, -alpha); // Inverse propensity with calibration

    return {
      ...se,
      score: se.score * debiasWeight,
    };
  });

  // Re-sort by debiased scores
  const sorted = debiased.sort((a, b) => b.score - a.score);

  console.log(`[Planner:Debias] Applied popularity debiasing (α=${alpha})`);
  return sorted;
}

/**
 * Run deterministic planner to score events and build slates
 * PHASE 4 (WEEK 8-10): Enhanced with popularity debiasing
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
  let scoredEvents = await scoreEvents(candidateEvents, intention, context, ranker);

  // 3. PHASE 4: Apply popularity debiasing to prevent feedback loops
  scoredEvents = debiasPopularity(scoredEvents, 0.3);

  // 4. Select bandit policy
  const banditPolicy = await selectBanditPolicy(userId, explorationPlan);

  // 5. Build slates using policy (now with debiased scores)
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
  const budgetValue = { FREE: 0, LOW: 1, MID: 2, HIGH: 3, LUXE: 4 }[budgetBand] || 2;

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
 * PHASE 2 (WEEK 3-4): MMR Diversity - Calculate similarity between two events
 * Returns value between 0 (very different) and 1 (very similar)
 */
function calculateEventSimilarity(event1: ScoredEvent, event2: ScoredEvent): number {
  let similarity = 0;

  // Category similarity (40% weight)
  const categories1 = event1.event.categories || [];
  const categories2 = event2.event.categories || [];
  const categoriesMatch = categories1.some((c) => categories2.includes(c));
  if (categoriesMatch) similarity += 0.4;

  // Venue similarity (30% weight)
  if (event1.event.venueName && event2.event.venueName) {
    if (event1.event.venueName === event2.event.venueName) {
      similarity += 0.3;
    }
  }

  // Time proximity (20% weight) - same day?
  const start1 = new Date(event1.event.startISO);
  const start2 = new Date(event2.event.startISO);
  const isSameDay =
    start1.getFullYear() === start2.getFullYear() &&
    start1.getMonth() === start2.getMonth() &&
    start1.getDate() === start2.getDate();
  if (isSameDay) similarity += 0.2;

  // Price proximity (10% weight)
  const price1 = event1.event.priceBand;
  const price2 = event2.event.priceBand;
  if (price1 && price2 && price1 === price2) {
    similarity += 0.1;
  }

  return similarity;
}

/**
 * PHASE 2 (WEEK 3-4): Maximal Marginal Relevance (MMR) algorithm
 * Balances relevance vs diversity to avoid showing redundant events
 *
 * Algorithm:
 * 1. Start with best event
 * 2. For remaining events: score = λ*relevance - (1-λ)*max_similarity_to_selected
 * 3. Pick event with highest MMR score
 * 4. Repeat until slate is full
 *
 * @param lambda - Weight for relevance vs diversity (0.7 = 70% relevance, 30% diversity)
 */
function diversifySlateMMR(
  scoredEvents: ScoredEvent[],
  slateSize: number,
  lambda: number = 0.7
): ScoredEvent[] {
  if (scoredEvents.length === 0) return [];
  if (scoredEvents.length <= slateSize) return scoredEvents.slice(0, slateSize);

  const selected: ScoredEvent[] = [scoredEvents[0]]; // Start with best
  const remaining = [...scoredEvents.slice(1)];

  while (selected.length < slateSize && remaining.length > 0) {
    let bestMMRScore = -Infinity;
    let bestMMRIdx = 0;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];

      // Relevance score (normalized 0-1)
      const relevanceScore = candidate.score / 100;

      // Max similarity to any already-selected event
      const maxSimilarity = Math.max(
        ...selected.map((s) => calculateEventSimilarity(candidate, s))
      );

      // MMR formula
      const mmrScore = lambda * relevanceScore - (1 - lambda) * maxSimilarity;

      if (mmrScore > bestMMRScore) {
        bestMMRScore = mmrScore;
        bestMMRIdx = i;
      }
    }

    // Add best MMR candidate to selected
    selected.push(remaining[bestMMRIdx]);
    remaining.splice(bestMMRIdx, 1);
  }

  console.log(`[Planner:MMR] Diversified ${scoredEvents.length} events → ${selected.length} diverse events (λ=${lambda})`);
  return selected;
}

/**
 * Build three slates: Best, Wildcard, Close & Easy
 * PHASE 2 (WEEK 3-4): Enhanced with MMR diversity optimization
 */
function buildSlates(
  scoredEvents: ScoredEvent[],
  intention: IntentionV2,
  explorationPlan: ExplorationPlan,
  banditPolicy: { name: string; params: any }
): SlateDecision[] {
  const slates: SlateDecision[] = [];

  // 1. Best Slate: Top-ranked events with MMR diversity
  // λ=0.7 means 70% relevance, 30% diversity
  const diverseBestEvents = diversifySlateMMR(scoredEvents, 10, 0.7);
  const bestItems: SlateItemDecision[] = diverseBestEvents.slice(0, 5).map((se, idx) => ({
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
      (se) => se.factorScores.noveltyScore > 0.4 && se.score > 0.35
    );

    const wildcardItems: SlateItemDecision[] = wildcardCandidates.slice(0, 5).map((se, idx) => ({
      eventId: se.event.id,
      priority: idx + 1,
      reasons: [],
      factorScores: se.factorScores,
    }));

    // Don't fallback to Best slate - if wildcard is empty, that's meaningful
    // The UI will show an explanation for why wildcard is empty
    slates.push({
      label: 'Wildcard',
      items: wildcardItems,
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
 * Enhanced to provide clear, specific explanations for recommendations
 */
function compileReasons(factorScores: Record<string, number>): string[] {
  const reasons: string[] = [];

  // Check for new matchScorer breakdown (raw point values)
  // categoryMatch: 0-30, vibeAlignment: 0-25, timeFit: 0-25, priceComfort: 0-15, socialFit: 0-10

  // Legacy normalized scores (0-1) support
  const isLegacyScores = Object.values(factorScores).some((score) => score > 0 && score <= 1);

  if (isLegacyScores) {
    // Legacy scoring system (0-1 normalized)
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
  } else {
    // New matchScorer breakdown (raw points)

    // Category match (0-30 points)
    if (factorScores.categoryMatch >= 25) {
      reasons.push('Perfect match for what you\'re looking for');
    } else if (factorScores.categoryMatch >= 15) {
      reasons.push('Matches your interests');
    }

    // Vibe alignment (0-25 points)
    if (factorScores.vibeAlignment >= 18) {
      reasons.push('Great vibe match');
    } else if (factorScores.vibeAlignment >= 12) {
      reasons.push('Fits your mood');
    }

    // Time fit (0-25 points) - includes starting soon bonus
    if (factorScores.timeFit >= 22) {
      reasons.push('Starting very soon - grab it now!');
    } else if (factorScores.timeFit >= 18) {
      reasons.push('Starting soon');
    } else if (factorScores.timeFit >= 10) {
      reasons.push('Good timing');
    }

    // Price comfort (0-15 points)
    if (factorScores.priceComfort >= 14) {
      reasons.push('Great price');
    } else if (factorScores.priceComfort >= 10) {
      reasons.push('Fair price');
    }

    // Social fit (0-10 points)
    if (factorScores.socialFit >= 8) {
      reasons.push('Perfect for your plans');
    }
  }

  // If still no reasons, provide a default
  if (reasons.length === 0) {
    reasons.push('Popular in your area');
  }

  // Prioritize and limit to top 3 most compelling reasons
  return reasons.slice(0, 3);
}
