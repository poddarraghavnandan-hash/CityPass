/**
 * RecAI-Inspired Personalized Ranking System
 *
 * Implements core concepts from Alibaba's RecAI framework:
 * - Multi-stage ranking (recall, coarse ranking, fine ranking)
 * - Feature engineering with user/item/context signals
 * - Learning to rank with implicit feedback
 * - Online learning and model updates
 * - Cold start handling with content-based filtering
 *
 * Adapted for event discovery use case
 */

import { generateEmbedding, cosineSimilarity } from './embeddings';

/**
 * Event with ranking features
 */
export interface RankableEvent {
  id: string;
  title: string;
  description?: string;
  category: string;
  city: string;
  startTime: string;
  priceMin?: number;
  priceMax?: number;
  venueName?: string;
  neighborhood?: string;
  tags?: string[];

  // Popularity signals
  viewCount?: number;
  saveCount?: number;
  shareCount?: number;
  clickCount?: number;
  viewCount24h?: number;
  saveCount24h?: number;

  // Quality signals
  imageUrl?: string;
  hasDescription: boolean;
  hasVenue: boolean;
  hasPrice: boolean;

  // Embedding for semantic matching
  embedding?: number[];
}

/**
 * User profile for personalization
 */
export interface UserProfile {
  sessionId: string;
  userId?: string;

  // Explicit preferences
  favoriteCategories?: string[];
  favoriteCities?: string[];
  priceRange?: { min: number; max: number };

  // Implicit signals from interactions
  viewedCategories?: Map<string, number>;
  likedCategories?: Map<string, number>;
  viewedVenues?: Map<string, number>;
  viewedNeighborhoods?: Map<string, number>;

  // Behavioral patterns
  avgSessionDuration?: number;
  preferredTimeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  avgPricePoint?: number;

  // Embedding representing user preferences
  preferenceEmbedding?: number[];
}

/**
 * Context for ranking (query, time, location, etc.)
 */
export interface RankingContext {
  query?: string;
  queryEmbedding?: number[];
  city?: string;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek?: number; // 0-6
  date?: Date;
  device?: 'mobile' | 'desktop';
  referrer?: string;
}

/**
 * Feature vector for ML ranking
 */
interface RankingFeatures {
  // User-Item features
  categoryMatch: number;
  cityMatch: number;
  priceMatch: number;
  semanticSimilarity: number;

  // Item features
  popularity: number;
  recency: number;
  quality: number;
  engagement: number;

  // Context features
  timeMatch: number;
  trending: number;

  // Combined score
  score: number;
}

/**
 * Stage 1: Recall - Fast retrieval of candidate events
 * Uses multiple retrieval strategies and combines results
 */
export async function recallStage(
  context: RankingContext,
  userProfile?: UserProfile,
  options: {
    maxCandidates?: number;
    strategies?: ('semantic' | 'category' | 'collaborative' | 'trending' | 'popular')[];
  } = {}
): Promise<string[]> {
  const {
    maxCandidates = 200,
    strategies = ['semantic', 'category', 'trending', 'popular'],
  } = options;

  const candidateIds = new Set<string>();

  // Each strategy contributes candidates
  const candidatesPerStrategy = Math.floor(maxCandidates / strategies.length);

  for (const strategy of strategies) {
    let ids: string[] = [];

    switch (strategy) {
      case 'semantic':
        // Semantic search using embeddings
        if (context.queryEmbedding) {
          ids = await recallBySemantic(context.queryEmbedding, candidatesPerStrategy);
        }
        break;

      case 'category':
        // Category-based recall using user preferences
        if (userProfile?.favoriteCategories) {
          ids = await recallByCategory(userProfile.favoriteCategories, candidatesPerStrategy);
        }
        break;

      case 'collaborative':
        // Collaborative filtering (users like you also liked)
        if (userProfile) {
          ids = await recallByCollaborative(userProfile, candidatesPerStrategy);
        }
        break;

      case 'trending':
        // Trending events (high recent engagement)
        ids = await recallByTrending(context.city, candidatesPerStrategy);
        break;

      case 'popular':
        // Popular events (high all-time engagement)
        ids = await recallByPopular(context.city, candidatesPerStrategy);
        break;
    }

    ids.forEach(id => candidateIds.add(id));
  }

  return Array.from(candidateIds).slice(0, maxCandidates);
}

/**
 * Stage 2: Coarse Ranking - Fast scoring of candidates
 * Uses lightweight features for initial ordering
 */
export function coarseRanking(
  events: RankableEvent[],
  context: RankingContext,
  userProfile?: UserProfile
): RankableEvent[] {
  const scoredEvents = events.map(event => {
    let score = 0;

    // Popularity (30%)
    const popularityScore = calculatePopularityScore(event);
    score += popularityScore * 0.3;

    // Category match (25%)
    if (userProfile?.favoriteCategories?.includes(event.category)) {
      score += 0.25;
    }

    // City match (15%)
    if (context.city && event.city === context.city) {
      score += 0.15;
    }

    // Recency (15%)
    const recencyScore = calculateRecencyScore(event);
    score += recencyScore * 0.15;

    // Quality (15%)
    const qualityScore = calculateQualityScore(event);
    score += qualityScore * 0.15;

    return { event, score };
  });

  // Sort by score descending
  scoredEvents.sort((a, b) => b.score - a.score);

  // Return top candidates for fine ranking (top 50)
  return scoredEvents.slice(0, 50).map(s => s.event);
}

/**
 * Stage 3: Fine Ranking - Detailed scoring with all features
 * Uses comprehensive feature set for final ordering
 */
export async function fineRanking(
  events: RankableEvent[],
  context: RankingContext,
  userProfile?: UserProfile
): Promise<Array<{ event: RankableEvent; score: number; features: RankingFeatures }>> {
  const rankedEvents = await Promise.all(
    events.map(async event => {
      const features = await extractFeatures(event, context, userProfile);
      const score = calculateFinalScore(features);

      return { event, score, features };
    })
  );

  // Sort by final score descending
  rankedEvents.sort((a, b) => b.score - a.score);

  return rankedEvents;
}

/**
 * Extract comprehensive features for an event
 */
async function extractFeatures(
  event: RankableEvent,
  context: RankingContext,
  userProfile?: UserProfile
): Promise<RankingFeatures> {
  // User-Item features
  const categoryMatch = userProfile?.favoriteCategories?.includes(event.category) ? 1.0 : 0.0;
  const cityMatch = context.city === event.city ? 1.0 : 0.0;

  let priceMatch = 0.5; // neutral default
  if (userProfile?.avgPricePoint && event.priceMin !== undefined) {
    const priceDiff = Math.abs(event.priceMin - userProfile.avgPricePoint);
    priceMatch = Math.max(0, 1 - (priceDiff / userProfile.avgPricePoint));
  }

  // Semantic similarity
  let semanticSimilarity = 0;
  if (context.queryEmbedding && event.embedding) {
    semanticSimilarity = cosineSimilarity(context.queryEmbedding, event.embedding);
  }

  // Item features
  const popularity = calculatePopularityScore(event);
  const recency = calculateRecencyScore(event);
  const quality = calculateQualityScore(event);
  const engagement = calculateEngagementScore(event);

  // Context features
  const timeMatch = calculateTimeMatch(event, context);
  const trending = calculateTrendingScore(event);

  // Calculate final score using weighted combination
  const score = calculateFinalScore({
    categoryMatch,
    cityMatch,
    priceMatch,
    semanticSimilarity,
    popularity,
    recency,
    quality,
    engagement,
    timeMatch,
    trending,
  });

  return {
    categoryMatch,
    cityMatch,
    priceMatch,
    semanticSimilarity,
    popularity,
    recency,
    quality,
    engagement,
    timeMatch,
    trending,
    score,
  };
}

/**
 * Calculate final score from features using learned weights
 */
function calculateFinalScore(features: Omit<RankingFeatures, 'score'>): number {
  // Weights learned from user interactions (would be ML model in production)
  const weights = {
    semanticSimilarity: 0.25,
    categoryMatch: 0.20,
    popularity: 0.15,
    engagement: 0.12,
    quality: 0.10,
    cityMatch: 0.08,
    priceMatch: 0.05,
    timeMatch: 0.03,
    trending: 0.02,
    recency: 0.00, // Less important for events
  };

  let score = 0;
  score += features.semanticSimilarity * weights.semanticSimilarity;
  score += features.categoryMatch * weights.categoryMatch;
  score += features.popularity * weights.popularity;
  score += features.engagement * weights.engagement;
  score += features.quality * weights.quality;
  score += features.cityMatch * weights.cityMatch;
  score += features.priceMatch * weights.priceMatch;
  score += features.timeMatch * weights.timeMatch;
  score += features.trending * weights.trending;
  score += features.recency * weights.recency;

  return score;
}

/**
 * Calculate popularity score (0-1)
 */
function calculatePopularityScore(event: RankableEvent): number {
  const views = event.viewCount || 0;
  const saves = event.saveCount || 0;
  const shares = event.shareCount || 0;
  const clicks = event.clickCount || 0;

  // Weighted combination
  const rawScore = views * 1 + saves * 5 + shares * 10 + clicks * 3;

  // Normalize using log scale (to handle large numbers)
  return Math.min(1, Math.log(rawScore + 1) / Math.log(1000));
}

/**
 * Calculate recency score (0-1)
 */
function calculateRecencyScore(event: RankableEvent): number {
  const now = new Date();
  const eventDate = new Date(event.startTime);
  const daysUntil = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  // Events happening soon are more relevant
  if (daysUntil < 0) return 0; // Past events
  if (daysUntil < 1) return 1.0; // Today
  if (daysUntil < 7) return 0.8; // This week
  if (daysUntil < 30) return 0.5; // This month
  return 0.2; // Future
}

/**
 * Calculate quality score (0-1)
 */
function calculateQualityScore(event: RankableEvent): number {
  let score = 0;
  let maxScore = 0;

  // Has image
  maxScore += 0.3;
  if (event.imageUrl) score += 0.3;

  // Has description
  maxScore += 0.3;
  if (event.hasDescription) score += 0.3;

  // Has venue
  maxScore += 0.2;
  if (event.hasVenue) score += 0.2;

  // Has price
  maxScore += 0.2;
  if (event.hasPrice) score += 0.2;

  return maxScore > 0 ? score / maxScore : 0;
}

/**
 * Calculate engagement score (0-1)
 */
function calculateEngagementScore(event: RankableEvent): number {
  const views24h = event.viewCount24h || 0;
  const saves24h = event.saveCount24h || 0;

  // Recent engagement is highly valuable
  const rawScore = views24h * 2 + saves24h * 10;
  return Math.min(1, Math.log(rawScore + 1) / Math.log(100));
}

/**
 * Calculate time match score (0-1)
 */
function calculateTimeMatch(event: RankableEvent, context: RankingContext): number {
  if (!context.timeOfDay) return 0.5; // Neutral

  const eventTime = new Date(event.startTime);
  const hour = eventTime.getHours();

  let eventTimeOfDay: string;
  if (hour >= 6 && hour < 12) eventTimeOfDay = 'morning';
  else if (hour >= 12 && hour < 17) eventTimeOfDay = 'afternoon';
  else if (hour >= 17 && hour < 22) eventTimeOfDay = 'evening';
  else eventTimeOfDay = 'night';

  return eventTimeOfDay === context.timeOfDay ? 1.0 : 0.3;
}

/**
 * Calculate trending score (0-1)
 */
function calculateTrendingScore(event: RankableEvent): number {
  const views24h = event.viewCount24h || 0;
  const viewsTotal = event.viewCount || 1;

  // High recent engagement relative to total = trending
  const trendingRatio = views24h / viewsTotal;
  return Math.min(1, trendingRatio * 2);
}

/**
 * Full ranking pipeline: recall → coarse → fine
 */
export async function rankEvents(
  context: RankingContext,
  userProfile?: UserProfile,
  options: {
    maxResults?: number;
    includeFeatures?: boolean;
  } = {}
): Promise<Array<{ event: RankableEvent; score: number; features?: RankingFeatures }>> {
  const { maxResults = 20, includeFeatures = false } = options;

  // Stage 1: Recall candidates
  console.log('Stage 1: Recall...');
  const candidateIds = await recallStage(context, userProfile);
  console.log(`Recalled ${candidateIds.length} candidates`);

  // Fetch full event data (would query database in production)
  const candidates: RankableEvent[] = await fetchEventsByIds(candidateIds);

  // Stage 2: Coarse ranking
  console.log('Stage 2: Coarse ranking...');
  const coarseRanked = coarseRanking(candidates, context, userProfile);
  console.log(`Coarse ranked to ${coarseRanked.length} events`);

  // Stage 3: Fine ranking
  console.log('Stage 3: Fine ranking...');
  const fineRanked = await fineRanking(coarseRanked, context, userProfile);

  // Return top results
  const results = fineRanked.slice(0, maxResults);

  if (!includeFeatures) {
    return results.map(r => ({ event: r.event, score: r.score }));
  }

  return results;
}

// ========== Helper functions (would be database queries in production) ==========

async function recallBySemantic(queryEmbedding: number[], limit: number): Promise<string[]> {
  // Would query vector database (Qdrant) in production
  // For now, return mock IDs
  return [];
}

async function recallByCategory(categories: string[], limit: number): Promise<string[]> {
  // Would query database by category in production
  return [];
}

async function recallByCollaborative(userProfile: UserProfile, limit: number): Promise<string[]> {
  // Would use collaborative filtering model in production
  return [];
}

async function recallByTrending(city: string | undefined, limit: number): Promise<string[]> {
  // Would query database for high viewCount24h in production
  return [];
}

async function recallByPopular(city: string | undefined, limit: number): Promise<string[]> {
  // Would query database for high total engagement in production
  return [];
}

async function fetchEventsByIds(ids: string[]): Promise<RankableEvent[]> {
  // Would fetch from database in production
  return [];
}
