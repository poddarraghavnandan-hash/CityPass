import type { Intention } from '@citypass/types';

export interface FitScoreComponent {
  key: string;
  label: string;
  value: number;
  weight: number;
  contribution: number;
}

export interface FitScoreArgs {
  event: {
    id: string;
    category?: string | null;
    startTime: Date;
    priceMin?: number | null;
    priceMax?: number | null;
    lat?: number | null;
    lon?: number | null;
    tags?: string[] | null;
    venueName?: string | null;
    description?: string | null;
  };
  intention: Intention;
  textualSimilarity: number;
  semanticSimilarity: number;
  distanceKm?: number | null;
  socialProof?: {
    views: number;
    saves: number;
    friends: number;
  };
  novelty?: number; // From graph analysis
  graphDiversification?: boolean;
}

const BUDGET_THRESHOLDS: Record<Intention['tokens']['budget'], number> = {
  free: 0,
  casual: 75,
  splurge: 250,
};

const MOOD_CATEGORY_MAP: Record<Intention['tokens']['mood'], string[]> = {
  calm: ['FITNESS', 'ARTS', 'WELLNESS', 'FOOD'],
  social: ['FOOD', 'NETWORKING', 'MUSIC'],
  electric: ['MUSIC', 'DANCE', 'COMEDY'],
  artistic: ['ARTS', 'THEATRE', 'DANCE'],
  grounded: ['FAMILY', 'FITNESS', 'OTHER'],
};

const COMPONENT_WEIGHTS: Record<string, number> = {
  textual: 0.22,
  semantic: 0.18,
  mood: 0.18,
  social: 0.14,
  novelty: 0.12,
  budget: 0.08,
  distance: 0.04,
  recency: 0.04,
};

export interface FitScoreResult {
  score: number;
  moodScore: number;
  socialHeat: number;
  reasons: string[];
  components: FitScoreComponent[];
  novelty?: number;
  isExploration?: boolean; // True if selected via ε-greedy
}

export function calculateFitScore(args: FitScoreArgs): FitScoreResult {
  const components: FitScoreComponent[] = [];
  const intention = args.intention;

  const textual = clamp(args.textualSimilarity, 0, 1);
  components.push({
    key: 'textual',
    label: 'Matches your keywords',
    value: textual,
    weight: COMPONENT_WEIGHTS.textual,
    contribution: textual * COMPONENT_WEIGHTS.textual,
  });

  const semantic = clamp(args.semanticSimilarity, 0, 1);
  components.push({
    key: 'semantic',
    label: 'Similar to what you like',
    value: semantic,
    weight: COMPONENT_WEIGHTS.semantic,
    contribution: semantic * COMPONENT_WEIGHTS.semantic,
  });

  const moodScore = calculateMoodScore(intention.tokens.mood, args.event.category);
  components.push({
    key: 'mood',
    label: `Fits your ${intention.tokens.mood} vibe`,
    value: moodScore,
    weight: COMPONENT_WEIGHTS.mood,
    contribution: moodScore * COMPONENT_WEIGHTS.mood,
  });

  const socialHeat = calculateSocialHeat(args.socialProof);
  components.push({
    key: 'social',
    label: 'Trending with locals',
    value: socialHeat,
    weight: COMPONENT_WEIGHTS.social,
    contribution: socialHeat * COMPONENT_WEIGHTS.social,
  });

  const novelty = args.novelty ?? 0.5;
  components.push({
    key: 'novelty',
    label: 'Something new for you',
    value: novelty,
    weight: COMPONENT_WEIGHTS.novelty,
    contribution: novelty * COMPONENT_WEIGHTS.novelty,
  });

  const budgetScore = calculateBudgetScore(args.event, intention);
  components.push({
    key: 'budget',
    label: 'In your budget',
    value: budgetScore,
    weight: COMPONENT_WEIGHTS.budget,
    contribution: budgetScore * COMPONENT_WEIGHTS.budget,
  });

  const distanceScore = calculateDistanceScore(args.distanceKm, intention.tokens.distanceKm);
  components.push({
    key: 'distance',
    label: 'Close enough',
    value: distanceScore,
    weight: COMPONENT_WEIGHTS.distance,
    contribution: distanceScore * COMPONENT_WEIGHTS.distance,
  });

  const recencyScore = calculateRecencyScore(args.event.startTime, intention);
  components.push({
    key: 'recency',
    label: 'Happening in your window',
    value: recencyScore,
    weight: COMPONENT_WEIGHTS.recency,
    contribution: recencyScore * COMPONENT_WEIGHTS.recency,
  });

  const score = components.reduce((sum, component) => sum + component.contribution, 0);

  // Generate enhanced human-readable reasons
  const reasons = generateReasons(args, components, {
    moodScore,
    socialHeat,
    novelty,
  });

  return {
    score,
    moodScore,
    socialHeat,
    novelty,
    reasons,
    components,
  };
}

function calculateMoodScore(mood: Intention['tokens']['mood'], category?: string | null): number {
  if (!category) return 0.4;
  const normalizedCategory = category.toUpperCase();
  const matches = MOOD_CATEGORY_MAP[mood] || [];
  if (matches.includes(normalizedCategory)) return 1;
  return matches.some(match => normalizedCategory.includes(match)) ? 0.7 : 0.3;
}

function calculateSocialHeat(
  socialProof?: FitScoreArgs['socialProof']
): number {
  if (!socialProof) return 0.2;
  const viewHeat = sigmoid(socialProof.views / 50);
  const saveHeat = sigmoid(socialProof.saves / 15);
  const friendHeat = sigmoid(socialProof.friends);
  return clamp((viewHeat + saveHeat * 1.2 + friendHeat * 1.5) / 3.7, 0, 1);
}

function calculateBudgetScore(event: FitScoreArgs['event'], intention: Intention): number {
  const budgetMax = BUDGET_THRESHOLDS[intention.tokens.budget];
  const price = event.priceMin ?? event.priceMax ?? 0;
  if (budgetMax === 0) {
    return price === 0 ? 1 : 0;
  }
  if (price === null) return 0.6;
  if (price <= budgetMax) return 1;
  if (price <= budgetMax * 1.3) return 0.6;
  return 0.2;
}

function calculateDistanceScore(distanceKm?: number | null, maxDistance?: number): number {
  if (distanceKm == null || maxDistance == null || maxDistance <= 0) return 0.6;
  const ratio = distanceKm / maxDistance;
  if (ratio <= 0.5) return 1;
  if (ratio <= 1) return 0.7;
  if (ratio <= 1.5) return 0.4;
  return 0.1;
}

function calculateRecencyScore(startTime: Date, intention: Intention): number {
  const now = new Date(intention.nowISO);
  const diffMinutes = (startTime.getTime() - now.getTime()) / (1000 * 60);
  if (diffMinutes < 0) return 0.2;
  if (diffMinutes <= intention.tokens.untilMinutes) return 1;
  if (diffMinutes <= intention.tokens.untilMinutes * 1.5) return 0.6;
  return 0.3;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Generate human-readable reasons with specific details
 */
function generateReasons(
  args: FitScoreArgs,
  components: FitScoreComponent[],
  scores: { moodScore: number; socialHeat: number; novelty: number }
): string[] {
  const reasons: string[] = [];

  // Distance-based reason
  if (args.distanceKm !== null && args.distanceKm !== undefined) {
    if (args.distanceKm <= 1) {
      reasons.push(`${Math.round(args.distanceKm * 10) / 10} km walk`);
    } else if (args.distanceKm <= 3) {
      const walkMinutes = Math.round(args.distanceKm * 12);
      reasons.push(`${walkMinutes} min walk`);
    } else if (args.distanceKm <= 10) {
      reasons.push(`${Math.round(args.distanceKm)} km away`);
    }
  }

  // Price-based reason
  if (args.event.priceMin !== null && args.event.priceMin !== undefined) {
    if (args.event.priceMin === 0) {
      reasons.push('Free entry');
    } else if (args.event.priceMin < 30) {
      reasons.push(`Under $${args.event.priceMin}`);
    }
  }

  // Mood match
  if (scores.moodScore >= 0.7) {
    const moodLabel = args.intention.tokens.mood;
    if (args.event.category) {
      reasons.push(`Matches ${moodLabel}`);
    }
  }

  // Social proof
  if (args.socialProof) {
    const { views, saves, friends } = args.socialProof;
    if (friends > 0) {
      reasons.push(`${friends} friend${friends > 1 ? 's' : ''} interested`);
    } else if (saves > 10) {
      reasons.push(`${saves} saves nearby`);
    } else if (views > 50) {
      reasons.push(`${views} views nearby`);
    }
  }

  // Novelty
  if (scores.novelty >= 0.8) {
    reasons.push('Novel for you');
  }

  // Time-based reason
  const now = new Date(args.intention.nowISO);
  const eventTime = args.event.startTime;
  const hoursUntil = (eventTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntil < 1) {
    reasons.push('Starting soon');
  } else if (hoursUntil < 3) {
    reasons.push(`In ${Math.round(hoursUntil)}h`);
  }

  // Venue-based reason (if highly rated/known)
  if (args.event.venueName && args.socialProof && args.socialProof.views > 100) {
    reasons.push(`At ${args.event.venueName}`);
  }

  // Limit to top 3-4 reasons
  return reasons.slice(0, 4);
}

/**
 * Apply ε-greedy exploration to top-k candidates
 * With probability ε, select a random candidate from top 20%
 * Otherwise, select top candidates deterministically
 */
export function applyEpsilonGreedy<T extends { fitScore: number }>(
  candidates: T[],
  topK: number = 10,
  epsilon: number = 0.15
): T[] & { exploredIndices?: number[] } {
  if (candidates.length === 0) return candidates as any;

  // Sort by fit score descending
  const sorted = [...candidates].sort((a, b) => b.fitScore - a.fitScore);

  // Determine exploration count
  const exploreCount = Math.min(
    Math.floor(topK * epsilon),
    Math.floor(sorted.length * 0.2)
  );

  const selected: T[] = [];
  const exploredIndices: number[] = [];

  // Select top (topK - exploreCount) deterministically
  const deterministicCount = topK - exploreCount;
  selected.push(...sorted.slice(0, deterministicCount));

  // Select remaining from exploration pool (indices 10-30)
  if (exploreCount > 0) {
    const explorationPool = sorted.slice(10, Math.min(30, sorted.length));

    for (let i = 0; i < exploreCount && explorationPool.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * explorationPool.length);
      const candidate = explorationPool.splice(randomIndex, 1)[0];
      selected.push(candidate);
      exploredIndices.push(randomIndex + 10); // Adjust index
    }
  }

  const result = selected.slice(0, topK) as T[] & { exploredIndices?: number[] };
  result.exploredIndices = exploredIndices;

  return result;
}

/**
 * Calculate diversity overlap between two slates
 * Returns percentage of overlap (0-1)
 */
export function calculateSlateOverlap(
  slate1: Array<{ id: string }>,
  slate2: Array<{ id: string }>
): number {
  const ids1 = new Set(slate1.map(item => item.id));
  const ids2 = new Set(slate2.map(item => item.id));

  const intersection = new Set(
    [...ids1].filter(id => ids2.has(id))
  );

  const union = new Set([...ids1, ...ids2]);

  return union.size > 0 ? intersection.size / union.size : 0;
}
