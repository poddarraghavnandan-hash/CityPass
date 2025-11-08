/**
 * OpenP5-Inspired User Modeling Framework
 *
 * Implements core concepts from OpenP5 personalization:
 * - Multi-faceted user profiles (demographics, behavior, preferences)
 * - Dynamic profile updates with decay
 * - Context-aware personalization
 * - Cold start handling with progressive disclosure
 * - Privacy-preserving local-first storage
 *
 * Adapted for event discovery use case
 */

import { generateEmbedding } from './embeddings';
import { cosineSimilarity } from './embeddings';

/**
 * Multi-faceted user profile following OpenP5 principles
 */
export interface UserPersona {
  // Identity
  sessionId: string;
  userId?: string;
  createdAt: Date;
  lastActive: Date;

  // Demographic (optional, inferred)
  ageGroup?: '18-24' | '25-34' | '35-44' | '45-54' | '55+';
  location?: {
    city: string;
    neighborhood?: string;
    coordinates?: { lat: number; lon: number };
  };

  // Explicit Preferences (stated)
  explicitly: {
    favoriteCategories: string[];
    favoriteCities: string[];
    priceRange?: { min: number; max: number };
    timePreferences?: ('morning' | 'afternoon' | 'evening' | 'night')[];
    accessibility?: string[];
  };

  // Implicit Preferences (learned from behavior)
  implicitly: {
    // Category affinities with confidence scores
    categoryAffinities: Map<string, { score: number; count: number; lastUpdated: Date }>;

    // Venue preferences
    venueAffinities: Map<string, { score: number; visits: number }>;

    // Neighborhood preferences
    neighborhoodAffinities: Map<string, { score: number; visits: number }>;

    // Price sensitivity (inferred from clicks)
    pricePoints: number[]; // Historical prices of events user engaged with
    estimatedBudget?: number;

    // Time-of-day preferences
    activityPatterns: Map<string, number>; // timeOfDay → frequency

    // Tags and interests
    interestTags: Map<string, number>; // tag → relevance score
  };

  // Behavioral Signals
  behavior: {
    // Engagement metrics
    totalViews: number;
    totalLikes: number;
    totalSaves: number;
    totalShares: number;
    totalClicks: number;

    // Session metrics
    avgSessionDuration: number;
    sessionsCount: number;
    avgEventsPerSession: number;

    // Interaction patterns
    swipeLeft: number; // Dislikes
    swipeRight: number; // Likes
    scrollDepth: number; // How far they browse

    // Conversion metrics
    viewToClickRate: number;
    viewToSaveRate: number;
  };

  // Contextual State (current session)
  context: {
    currentCity?: string;
    currentQuery?: string;
    deviceType?: 'mobile' | 'desktop' | 'tablet';
    referrer?: string;
    sessionStart?: Date;
    recentViewedIds: string[]; // Last 20 viewed events
    recentSearches: string[]; // Last 10 searches
  };

  // Derived Features (computed)
  computed: {
    // User type classification
    userType: 'explorer' | 'planner' | 'opportunist' | 'social' | 'culture_enthusiast';

    // Engagement level
    engagementLevel: 'cold' | 'warm' | 'hot' | 'power_user';

    // Diversity score (how varied their interests are)
    diversityScore: number; // 0-1

    // Preference strength (how strong/confident we are)
    confidenceScore: number; // 0-1

    // Price sensitivity
    priceSensitivity: 'budget' | 'moderate' | 'premium' | 'luxury';

    // Adventure score (willingness to try new things)
    adventureScore: number; // 0-1
  };

  // Embedding representing user's overall preferences
  preferenceEmbedding?: number[];

  // Metadata
  profileVersion: number; // For schema migrations
  lastUpdated: Date;
}

/**
 * Create a new user persona with sensible defaults
 */
export function createUserPersona(sessionId: string, userId?: string): UserPersona {
  const now = new Date();

  return {
    sessionId,
    userId,
    createdAt: now,
    lastActive: now,

    explicitly: {
      favoriteCategories: [],
      favoriteCities: [],
    },

    implicitly: {
      categoryAffinities: new Map(),
      venueAffinities: new Map(),
      neighborhoodAffinities: new Map(),
      pricePoints: [],
      activityPatterns: new Map(),
      interestTags: new Map(),
    },

    behavior: {
      totalViews: 0,
      totalLikes: 0,
      totalSaves: 0,
      totalShares: 0,
      totalClicks: 0,
      avgSessionDuration: 0,
      sessionsCount: 0,
      avgEventsPerSession: 0,
      swipeLeft: 0,
      swipeRight: 0,
      scrollDepth: 0,
      viewToClickRate: 0,
      viewToSaveRate: 0,
    },

    context: {
      recentViewedIds: [],
      recentSearches: [],
    },

    computed: {
      userType: 'explorer', // Default for new users
      engagementLevel: 'cold',
      diversityScore: 0.5,
      confidenceScore: 0.1, // Low confidence for new users
      priceSensitivity: 'moderate',
      adventureScore: 0.5,
    },

    profileVersion: 1,
    lastUpdated: now,
  };
}

/**
 * Update user persona based on an interaction
 */
export async function updatePersonaFromInteraction(
  persona: UserPersona,
  interaction: {
    type: 'VIEW' | 'LIKE' | 'DISLIKE' | 'SAVE' | 'SHARE' | 'BOOK_CLICK';
    eventId: string;
    event: {
      category: string;
      city: string;
      venueName?: string;
      neighborhood?: string;
      priceMin?: number;
      tags?: string[];
    };
    dwellTimeMs?: number;
    timestamp: Date;
  }
): Promise<UserPersona> {
  const updated = { ...persona };
  updated.lastActive = interaction.timestamp;
  updated.lastUpdated = interaction.timestamp;

  // Update behavior counters
  updated.behavior.totalViews++;
  if (interaction.type === 'LIKE') updated.behavior.totalLikes++;
  if (interaction.type === 'SAVE') updated.behavior.totalSaves++;
  if (interaction.type === 'SHARE') updated.behavior.totalShares++;
  if (interaction.type === 'BOOK_CLICK') updated.behavior.totalClicks++;
  if (interaction.type === 'DISLIKE') updated.behavior.swipeLeft++;
  if (interaction.type === 'LIKE') updated.behavior.swipeRight++;

  // Update implicit preferences based on positive signals
  if (['LIKE', 'SAVE', 'BOOK_CLICK'].includes(interaction.type)) {
    // Update category affinity
    const category = interaction.event.category;
    const currentAffinity = updated.implicitly.categoryAffinities.get(category) || {
      score: 0,
      count: 0,
      lastUpdated: interaction.timestamp,
    };

    // Increase affinity (with decay for older signals)
    const decayFactor = calculateDecayFactor(currentAffinity.lastUpdated, interaction.timestamp);
    const incrementValue = interaction.type === 'SAVE' ? 2 : interaction.type === 'BOOK_CLICK' ? 3 : 1;

    updated.implicitly.categoryAffinities.set(category, {
      score: (currentAffinity.score * decayFactor) + incrementValue,
      count: currentAffinity.count + 1,
      lastUpdated: interaction.timestamp,
    });

    // Update venue affinity
    if (interaction.event.venueName) {
      const venue = interaction.event.venueName;
      const currentVenue = updated.implicitly.venueAffinities.get(venue) || { score: 0, visits: 0 };
      updated.implicitly.venueAffinities.set(venue, {
        score: currentVenue.score + incrementValue,
        visits: currentVenue.visits + 1,
      });
    }

    // Update neighborhood affinity
    if (interaction.event.neighborhood) {
      const neighborhood = interaction.event.neighborhood;
      const currentNeighborhood = updated.implicitly.neighborhoodAffinities.get(neighborhood) || {
        score: 0,
        visits: 0,
      };
      updated.implicitly.neighborhoodAffinities.set(neighborhood, {
        score: currentNeighborhood.score + incrementValue,
        visits: currentNeighborhood.visits + 1,
      });
    }

    // Update price points
    if (interaction.event.priceMin !== undefined) {
      updated.implicitly.pricePoints.push(interaction.event.priceMin);
      // Keep only last 50 price points
      if (updated.implicitly.pricePoints.length > 50) {
        updated.implicitly.pricePoints.shift();
      }
      // Recalculate estimated budget
      updated.implicitly.estimatedBudget = calculateMedian(updated.implicitly.pricePoints);
    }

    // Update interest tags
    if (interaction.event.tags) {
      for (const tag of interaction.event.tags) {
        const currentScore = updated.implicitly.interestTags.get(tag) || 0;
        updated.implicitly.interestTags.set(tag, currentScore + incrementValue);
      }
    }
  }

  // Update computed fields
  updated.computed = computeDerivedFeatures(updated);

  // Update conversion rates
  if (updated.behavior.totalViews > 0) {
    updated.behavior.viewToClickRate = updated.behavior.totalClicks / updated.behavior.totalViews;
    updated.behavior.viewToSaveRate = updated.behavior.totalSaves / updated.behavior.totalViews;
  }

  // Add to recent viewed
  updated.context.recentViewedIds.unshift(interaction.eventId);
  if (updated.context.recentViewedIds.length > 20) {
    updated.context.recentViewedIds = updated.context.recentViewedIds.slice(0, 20);
  }

  return updated;
}

/**
 * Calculate decay factor based on time elapsed
 * More recent interactions have higher weight
 */
function calculateDecayFactor(lastUpdate: Date, current: Date): number {
  const daysElapsed = (current.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);

  // Exponential decay: half-life of 30 days
  const halfLife = 30;
  return Math.pow(0.5, daysElapsed / halfLife);
}

/**
 * Compute derived features from raw data
 */
function computeDerivedFeatures(persona: UserPersona): UserPersona['computed'] {
  // User type classification based on behavior
  let userType: UserPersona['computed']['userType'] = 'explorer';

  const { totalViews, totalSaves, totalShares, totalLikes } = persona.behavior;
  const saveRate = totalViews > 0 ? totalSaves / totalViews : 0;
  const shareRate = totalViews > 0 ? totalShares / totalViews : 0;

  if (saveRate > 0.3) userType = 'planner'; // High save rate = likes to plan
  else if (shareRate > 0.1) userType = 'social'; // High share rate = social
  else if (persona.implicitly.categoryAffinities.size > 5) userType = 'explorer'; // Diverse interests
  else if (totalLikes > 50) userType = 'culture_enthusiast'; // Heavy engagement

  // Engagement level
  let engagementLevel: UserPersona['computed']['engagementLevel'] = 'cold';
  if (totalViews > 100) engagementLevel = 'power_user';
  else if (totalViews > 50) engagementLevel = 'hot';
  else if (totalViews > 10) engagementLevel = 'warm';

  // Diversity score: how varied are their interests?
  const diversityScore = Math.min(1, persona.implicitly.categoryAffinities.size / 10);

  // Confidence score: how much data do we have?
  const confidenceScore = Math.min(1, totalViews / 50);

  // Price sensitivity
  let priceSensitivity: UserPersona['computed']['priceSensitivity'] = 'moderate';
  if (persona.implicitly.estimatedBudget) {
    if (persona.implicitly.estimatedBudget < 20) priceSensitivity = 'budget';
    else if (persona.implicitly.estimatedBudget < 50) priceSensitivity = 'moderate';
    else if (persona.implicitly.estimatedBudget < 100) priceSensitivity = 'premium';
    else priceSensitivity = 'luxury';
  }

  // Adventure score: willingness to try new categories
  const totalInteractions = totalLikes + totalSaves;
  const uniqueCategories = persona.implicitly.categoryAffinities.size;
  const adventureScore = totalInteractions > 0
    ? Math.min(1, uniqueCategories / totalInteractions)
    : 0.5;

  return {
    userType,
    engagementLevel,
    diversityScore,
    confidenceScore,
    priceSensitivity,
    adventureScore,
  };
}

/**
 * Generate preference embedding for semantic matching
 */
export async function generatePreferenceEmbedding(persona: UserPersona): Promise<number[]> {
  // Build text representation of user preferences
  const parts: string[] = [];

  // Top categories (by affinity)
  const topCategories = Array.from(persona.implicitly.categoryAffinities.entries())
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 5)
    .map(([cat]) => cat);

  if (topCategories.length > 0) {
    parts.push(`Interested in: ${topCategories.join(', ')}`);
  }

  // Favorite cities
  if (persona.explicitly.favoriteCities.length > 0) {
    parts.push(`Cities: ${persona.explicitly.favoriteCities.join(', ')}`);
  }

  // Price range
  if (persona.implicitly.estimatedBudget) {
    parts.push(`Budget: $${persona.implicitly.estimatedBudget}`);
  }

  // Top interest tags
  const topTags = Array.from(persona.implicitly.interestTags.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag]) => tag);

  if (topTags.length > 0) {
    parts.push(`Interests: ${topTags.join(', ')}`);
  }

  // User type description
  parts.push(`User type: ${persona.computed.userType}`);

  // Generate embedding
  const text = parts.join('\n');
  return await generateEmbedding(text, { useCase: 'user-preference' });
}

/**
 * Calculate similarity between user persona and event
 */
export async function calculatePersonaEventMatch(
  persona: UserPersona,
  event: {
    category: string;
    city: string;
    priceMin?: number;
    venueName?: string;
    neighborhood?: string;
    tags?: string[];
    embedding?: number[];
  }
): Promise<number> {
  let score = 0;
  let maxScore = 0;

  // Category match (30%)
  maxScore += 0.3;
  const categoryAffinity = persona.implicitly.categoryAffinities.get(event.category);
  if (categoryAffinity) {
    // Normalize affinity score to 0-1
    const normalizedAffinity = Math.min(1, categoryAffinity.score / 10);
    score += normalizedAffinity * 0.3;
  }

  // City match (15%)
  maxScore += 0.15;
  if (persona.explicitly.favoriteCities.includes(event.city)) {
    score += 0.15;
  }

  // Price match (15%)
  maxScore += 0.15;
  if (event.priceMin !== undefined && persona.implicitly.estimatedBudget) {
    const priceDiff = Math.abs(event.priceMin - persona.implicitly.estimatedBudget);
    const priceMatch = Math.max(0, 1 - (priceDiff / persona.implicitly.estimatedBudget));
    score += priceMatch * 0.15;
  } else {
    score += 0.075; // Neutral if no price data
  }

  // Venue match (10%)
  maxScore += 0.1;
  if (event.venueName) {
    const venueAffinity = persona.implicitly.venueAffinities.get(event.venueName);
    if (venueAffinity) {
      const normalizedAffinity = Math.min(1, venueAffinity.score / 5);
      score += normalizedAffinity * 0.1;
    }
  }

  // Neighborhood match (10%)
  maxScore += 0.1;
  if (event.neighborhood) {
    const neighborhoodAffinity = persona.implicitly.neighborhoodAffinities.get(event.neighborhood);
    if (neighborhoodAffinity) {
      const normalizedAffinity = Math.min(1, neighborhoodAffinity.score / 5);
      score += normalizedAffinity * 0.1;
    }
  }

  // Tag match (20%)
  maxScore += 0.2;
  if (event.tags && event.tags.length > 0) {
    let tagScore = 0;
    for (const tag of event.tags) {
      const tagRelevance = persona.implicitly.interestTags.get(tag) || 0;
      tagScore += Math.min(1, tagRelevance / 5);
    }
    // Average across tags
    score += (tagScore / event.tags.length) * 0.2;
  }

  // Semantic match using embeddings (if available)
  if (persona.preferenceEmbedding && event.embedding) {
    const semanticSimilarity = cosineSimilarity(persona.preferenceEmbedding, event.embedding);
    // Use as bonus (not part of maxScore)
    score += semanticSimilarity * 0.2;
    maxScore += 0.2;
  }

  // Normalize to 0-1
  return maxScore > 0 ? score / maxScore : 0;
}

/**
 * Get top recommended categories for user
 */
export function getTopCategories(persona: UserPersona, limit: number = 5): string[] {
  return Array.from(persona.implicitly.categoryAffinities.entries())
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, limit)
    .map(([category]) => category);
}

/**
 * Get personalization insights for debugging/transparency
 */
export function getPersonalizationInsights(persona: UserPersona): {
  summary: string;
  topCategories: string[];
  userType: string;
  engagementLevel: string;
  confidenceScore: number;
} {
  const topCategories = getTopCategories(persona, 3);

  let summary = `${persona.computed.userType} who `;
  if (topCategories.length > 0) {
    summary += `enjoys ${topCategories.join(', ')}. `;
  }
  summary += `Engagement: ${persona.computed.engagementLevel}. `;
  summary += `Confidence: ${(persona.computed.confidenceScore * 100).toFixed(0)}%.`;

  return {
    summary,
    topCategories,
    userType: persona.computed.userType,
    engagementLevel: persona.computed.engagementLevel,
    confidenceScore: persona.computed.confidenceScore,
  };
}

// Helper: calculate median
function calculateMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0;

  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}
