/**
 * Ranker v1: Learning-to-Rank System
 * Pluggable architecture that can be backed by:
 * - Weighted sum (current)
 * - LightGBM / XGBoost (future)
 * - Neural network (future)
 */

import type { Intention } from '@citypass/types';
import { getLatestRankerSnapshot } from '@citypass/db/logging';

// ============================================
// Types
// ============================================

export interface RankingFeatures {
  // Text relevance
  textualSimilarity: number; // 0-1, from keyword search
  semanticSimilarity: number; // 0-1, from vector search

  // Temporal features
  timeFit: number; // 0-1, how well event timing matches intention
  recencyScore: number; // 0-1, based on how soon event starts

  // Spatial features
  distanceKm: number | null;
  distanceComfort: number; // 0-1, derived from distance vs preference

  // Price features
  priceMin: number | null;
  priceMax: number | null;
  priceComfort: number; // 0-1, matches budget preference

  // Mood/vibe alignment
  category: string | null;
  tags: string[];
  moodAlignment: number; // 0-1, category/tag match to mood

  // Social signals
  views24h: number;
  saves24h: number;
  friendInterest: number; // Count of friends interested
  socialHeatScore: number; // 0-1, normalized social proof

  // Novelty and exploration
  noveltyScore: number; // 0-1, from graph analysis
  tasteMatchScore: number; // 0-1, similarity to user taste vector
}

export interface ScoredEvent {
  eventId: string;
  score: number;
  factorContributions: Record<string, number>;
  features: RankingFeatures;
}

export interface RankerConfig {
  // Model type: 'weighted_sum' | 'lightgbm' | 'xgboost' | 'neural'
  modelType: 'weighted_sum' | 'ml_model';

  // Factor weights (for weighted_sum model)
  weights?: {
    textual: number;
    semantic: number;
    timeFit: number;
    distanceComfort: number;
    priceComfort: number;
    moodAlignment: number;
    socialHeatScore: number;
    noveltyScore: number;
    tasteMatchScore: number;
    recency: number;
  };

  // ML model artifact path (for ml_model type)
  modelPath?: string;

  // Version info
  version: string;
}

// Default weights (can be overridden by DB snapshot)
const DEFAULT_WEIGHTS: RankerConfig['weights'] = {
  textual: 0.20,
  semantic: 0.18,
  timeFit: 0.08,
  distanceComfort: 0.04,
  priceComfort: 0.08,
  moodAlignment: 0.16,
  socialHeatScore: 0.12,
  noveltyScore: 0.10,
  tasteMatchScore: 0.04,
  recency: 0.00,
};

// ============================================
// Ranker Class
// ============================================

export class Ranker {
  private config: RankerConfig;

  constructor(config?: Partial<RankerConfig>) {
    this.config = {
      modelType: 'weighted_sum',
      weights: { ...DEFAULT_WEIGHTS, ...(config?.weights || {}) } as typeof DEFAULT_WEIGHTS,
      version: config?.version || '1.0.0',
      ...config,
    };
  }

  /**
   * Load latest ranker configuration from DB
   */
  static async fromLatestSnapshot(): Promise<Ranker> {
    try {
      const snapshot = await getLatestRankerSnapshot();

      if (snapshot && snapshot.weights) {
        console.log(`✅ Loaded ranker snapshot: ${snapshot.id}`);
        return new Ranker({
          modelType: 'weighted_sum',
          weights: snapshot.weights as any,
          version: '1.0.0-snapshot',
        });
      }
    } catch (error) {
      console.warn('[Ranker] Failed to load snapshot, using defaults:', error);
    }

    return new Ranker();
  }

  /**
   * Score a single event
   */
  score(features: RankingFeatures): ScoredEvent {
    const { eventId, ...featureValues } = features as any;

    if (this.config.modelType === 'weighted_sum') {
      return this.scoreWithWeightedSum(features);
    } else {
      // TODO: Implement ML model scoring
      throw new Error(`Model type ${this.config.modelType} not yet implemented`);
    }
  }

  /**
   * Score multiple events efficiently
   */
  scoreEvents(eventFeatures: RankingFeatures[]): ScoredEvent[] {
    return eventFeatures.map(features => this.score(features));
  }

  /**
   * Weighted sum scoring (Ranker v1 baseline)
   */
  private scoreWithWeightedSum(features: RankingFeatures): ScoredEvent {
    const weights = this.config.weights!;
    const contributions: Record<string, number> = {};

    // Calculate weighted contributions
    contributions.textual = features.textualSimilarity * weights.textual;
    contributions.semantic = features.semanticSimilarity * weights.semantic;
    contributions.timeFit = features.timeFit * weights.timeFit;
    contributions.distanceComfort = features.distanceComfort * weights.distanceComfort;
    contributions.priceComfort = features.priceComfort * weights.priceComfort;
    contributions.moodAlignment = features.moodAlignment * weights.moodAlignment;
    contributions.socialHeatScore = features.socialHeatScore * weights.socialHeatScore;
    contributions.noveltyScore = features.noveltyScore * weights.noveltyScore;
    contributions.tasteMatchScore = features.tasteMatchScore * weights.tasteMatchScore;

    // Sum all contributions
    const totalScore = Object.values(contributions).reduce((sum, val) => sum + val, 0);

    return {
      eventId: (features as any).eventId,
      score: Math.min(1.0, Math.max(0.0, totalScore)),
      factorContributions: contributions,
      features,
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): RankerConfig {
    return { ...this.config };
  }

  /**
   * Update weights (for online learning)
   */
  updateWeights(newWeights: Partial<RankerConfig['weights']>): void {
    if (this.config.modelType !== 'weighted_sum') {
      throw new Error('Can only update weights for weighted_sum model type');
    }

    this.config.weights = {
      ...this.config.weights!,
      ...newWeights,
    };

    console.log('✅ Updated ranker weights:', newWeights);
  }
}

// ============================================
// Feature Engineering Helpers
// ============================================

/**
 * Calculate time fit: how well event timing matches intention
 */
export function calculateTimeFit(
  eventStartTime: Date,
  intention: Intention
): number {
  const now = new Date(intention.nowISO);
  const diffMinutes = (eventStartTime.getTime() - now.getTime()) / (1000 * 60);

  if (diffMinutes < 0) return 0.1; // Event already started
  if (diffMinutes <= intention.tokens.untilMinutes) return 1.0;
  if (diffMinutes <= intention.tokens.untilMinutes * 1.5) return 0.6;
  if (diffMinutes <= intention.tokens.untilMinutes * 3) return 0.3;
  return 0.1;
}

/**
 * Calculate distance comfort: normalized distance score
 */
export function calculateDistanceComfort(
  distanceKm: number | null,
  maxDistanceKm: number
): number {
  if (distanceKm == null) return 0.5; // Unknown distance
  if (maxDistanceKm <= 0) return 0.5;

  const ratio = distanceKm / maxDistanceKm;
  if (ratio <= 0.5) return 1.0;
  if (ratio <= 1.0) return 0.7;
  if (ratio <= 1.5) return 0.4;
  return 0.1;
}

/**
 * Calculate price comfort: how well price matches budget
 */
export function calculatePriceComfort(
  priceMin: number | null,
  priceMax: number | null,
  budgetType: 'free' | 'casual' | 'splurge'
): number {
  const budgetThresholds = {
    free: 0,
    casual: 75,
    splurge: 250,
  };

  const budgetMax = budgetThresholds[budgetType];
  const price = priceMin ?? priceMax ?? 0;

  if (budgetMax === 0) {
    return price === 0 ? 1.0 : 0.0;
  }

  if (price === null) return 0.6; // Unknown price
  if (price <= budgetMax) return 1.0;
  if (price <= budgetMax * 1.3) return 0.6;
  return 0.2;
}

/**
 * Calculate mood alignment: category/tag match to mood
 */
export function calculateMoodAlignment(
  category: string | null,
  tags: string[],
  mood: Intention['tokens']['mood']
): number {
  const moodCategoryMap: Record<string, string[]> = {
    calm: ['FITNESS', 'ARTS', 'WELLNESS', 'FOOD'],
    social: ['FOOD', 'NETWORKING', 'MUSIC'],
    electric: ['MUSIC', 'DANCE', 'COMEDY'],
    artistic: ['ARTS', 'THEATRE', 'DANCE'],
    grounded: ['FAMILY', 'FITNESS', 'OTHER'],
  };

  const normalizedCategory = category?.toUpperCase();
  const matches = moodCategoryMap[mood] || [];

  if (normalizedCategory && matches.includes(normalizedCategory)) {
    return 1.0;
  }

  if (normalizedCategory && matches.some(m => normalizedCategory.includes(m))) {
    return 0.7;
  }

  // Check tags
  const tagMatch = tags.some(tag =>
    matches.some(m => tag.toUpperCase().includes(m))
  );

  if (tagMatch) return 0.6;

  return 0.3;
}

/**
 * Calculate social heat score: normalized social proof
 */
export function calculateSocialHeat(
  views24h: number,
  saves24h: number,
  friendInterest: number
): number {
  const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

  const viewHeat = sigmoid(views24h / 50);
  const saveHeat = sigmoid(saves24h / 15);
  const friendHeat = sigmoid(friendInterest);

  return Math.min(1.0, (viewHeat + saveHeat * 1.2 + friendHeat * 1.5) / 3.7);
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ============================================
// Exports
// ============================================

export { DEFAULT_WEIGHTS };

/**
 * Convenience function: create ranker instance
 */
export async function createRanker(): Promise<Ranker> {
  return Ranker.fromLatestSnapshot();
}
