/**
 * Taste Vector Management
 * Personalized user preference vectors learned from interactions
 */

import { prisma } from '@citypass/db';
import type { Intention } from '@citypass/types';

// ============================================
// Types
// ============================================

export interface TasteVector {
  userId: string;
  vector: number[]; // Dense embedding vector
  dimension: number;
  version: string;
  metadata: {
    updateCount: number;
    lastLikedEventIds: string[];
    lastDislikedEventIds: string[];
    decayRate: number;
  };
  updatedAt: Date;
}

export interface UserFeatures {
  userId: string;

  // Derived from taste vector
  tasteVector: number[] | null;

  // Behavioral features
  averageBudget: number; // Average price of liked events
  preferredRadius: number; // Average distance of attended events
  favoriteCategories: string[]; // Top categories
  moodDistribution: Record<string, number>; // Mood preference weights

  // Temporal patterns
  preferredTimeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' | 'any';
  preferredDaysOfWeek: number[]; // 0-6, Sunday-Saturday
}

// ============================================
// Taste Vector Management
// ============================================

/**
 * Get user taste vector from DB
 */
export async function getUserTasteVector(userId: string): Promise<number[] | null> {
  try {
    const record = await prisma.tasteVector.findUnique({
      where: { userId },
      select: { vector: true, dimension: true },
    });

    if (!record) {
      console.log(`[getUserTasteVector] No taste vector found for user: ${userId}`);
      return null;
    }

    // Parse JSON vector
    const vector = record.vector as any;
    if (Array.isArray(vector)) {
      return vector;
    }

    console.warn(`[getUserTasteVector] Invalid vector format for user: ${userId}`);
    return null;
  } catch (error) {
    console.error('[getUserTasteVector] Failed to fetch taste vector:', error);
    return null;
  }
}

/**
 * Update user taste vector using exponential moving average
 * Combines liked and disliked event embeddings
 */
export async function updateUserTasteVector(
  userId: string,
  likedEventEmbeddings: number[][],
  dislikedEventEmbeddings: number[][] = [],
  options: {
    decayRate?: number; // Learning rate (0-1), default 0.1
    embeddingVersion?: string;
  } = {}
): Promise<void> {
  const { decayRate = 0.1, embeddingVersion = 'bge-m3-v1' } = options;

  try {
    // Get current taste vector
    const existing = await prisma.tasteVector.findUnique({
      where: { userId },
      select: { vector: true, metadata: true, dimension: true },
    });

    let newVector: number[];
    let metadata: any;

    if (!existing || !Array.isArray(existing.vector)) {
      // Initialize from liked events
      if (likedEventEmbeddings.length === 0) {
        console.log('[updateUserTasteVector] No embeddings to initialize taste vector');
        return;
      }

      newVector = averageEmbeddings(likedEventEmbeddings);
      metadata = {
        updateCount: 1,
        lastLikedEventIds: [],
        lastDislikedEventIds: [],
        decayRate,
      };

      console.log(`✨ Initialized taste vector for user: ${userId}`);
    } else {
      // Update existing vector with EMA
      const currentVector = existing.vector as number[];
      const currentMetadata = (existing.metadata || {}) as any;

      // Compute positive and negative updates
      const positiveUpdate = likedEventEmbeddings.length > 0
        ? averageEmbeddings(likedEventEmbeddings)
        : null;

      const negativeUpdate = dislikedEventEmbeddings.length > 0
        ? averageEmbeddings(dislikedEventEmbeddings)
        : null;

      // Apply EMA: new_vector = (1-α)*current + α*liked - β*disliked
      newVector = currentVector.map((val, i) => {
        let updated = val;

        if (positiveUpdate) {
          updated = (1 - decayRate) * updated + decayRate * positiveUpdate[i];
        }

        if (negativeUpdate) {
          // Negative signal: move away from disliked events
          updated = updated - 0.5 * decayRate * negativeUpdate[i];
        }

        return updated;
      });

      // Normalize to unit vector
      newVector = normalizeVector(newVector);

      metadata = {
        updateCount: (currentMetadata.updateCount || 0) + 1,
        lastLikedEventIds: currentMetadata.lastLikedEventIds || [],
        lastDislikedEventIds: currentMetadata.lastDislikedEventIds || [],
        decayRate,
      };

      console.log(`✅ Updated taste vector for user: ${userId} (update #${metadata.updateCount})`);
    }

    // Upsert to DB
    await prisma.tasteVector.upsert({
      where: { userId },
      update: {
        vector: newVector,
        metadata,
        updatedAt: new Date(),
      },
      create: {
        userId,
        vector: newVector,
        dimension: newVector.length,
        version: embeddingVersion,
        metadata,
      },
    });
  } catch (error) {
    console.error('[updateUserTasteVector] Failed to update taste vector:', error);
  }
}

/**
 * Calculate similarity between user taste vector and event embedding
 * Returns cosine similarity score (0-1)
 */
export function calculateTasteSimilarity(
  tasteVector: number[] | null,
  eventEmbedding: number[]
): number {
  if (!tasteVector || tasteVector.length === 0) {
    return 0.5; // Neutral score if no taste vector
  }

  if (tasteVector.length !== eventEmbedding.length) {
    console.warn(
      `[calculateTasteSimilarity] Dimension mismatch: ${tasteVector.length} vs ${eventEmbedding.length}`
    );
    return 0.5;
  }

  return cosineSimilarity(tasteVector, eventEmbedding);
}

/**
 * Get comprehensive user features for ranking
 */
export async function getUserFeatures(userId: string): Promise<UserFeatures> {
  try {
    // Fetch taste vector
    const tasteVector = await getUserTasteVector(userId);

    // Fetch user profile and interaction history
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: {
        favoriteCategories: true,
        priceMin: true,
        priceMax: true,
        timeOfDay: true,
      },
    });

    // Fetch recent interactions to derive preferences
    const recentInteractions = await prisma.userInteraction.findMany({
      where: {
        userId,
        OR: [{ saved: true }, { bookmarked: true }],
      },
      take: 50,
      orderBy: { createdAt: 'desc' },
    });

    // Default features
    const features: UserFeatures = {
      userId,
      tasteVector,
      averageBudget: 50, // Default
      preferredRadius: 5, // 5km default
      favoriteCategories: profile?.favoriteCategories || [],
      moodDistribution: {
        calm: 0.2,
        social: 0.2,
        electric: 0.2,
        artistic: 0.2,
        grounded: 0.2,
      },
      preferredTimeOfDay: (profile?.timeOfDay as any) || 'any',
      preferredDaysOfWeek: [0, 1, 2, 3, 4, 5, 6], // All days
    };

    // TODO: Derive features from interactions
    // This would involve joining with Event table to get prices, categories, etc.

    return features;
  } catch (error) {
    console.error('[getUserFeatures] Failed to fetch user features:', error);

    // Return default features
    return {
      userId,
      tasteVector: null,
      averageBudget: 50,
      preferredRadius: 5,
      favoriteCategories: [],
      moodDistribution: {
        calm: 0.2,
        social: 0.2,
        electric: 0.2,
        artistic: 0.2,
        grounded: 0.2,
      },
      preferredTimeOfDay: 'any',
      preferredDaysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    };
  }
}

// ============================================
// Vector Math Helpers
// ============================================

/**
 * Average multiple embedding vectors
 */
function averageEmbeddings(embeddings: number[][]): number[] {
  if (embeddings.length === 0) {
    throw new Error('Cannot average empty embeddings');
  }

  const dimension = embeddings[0].length;
  const sum = new Array(dimension).fill(0);

  for (const embedding of embeddings) {
    if (embedding.length !== dimension) {
      throw new Error('Embedding dimension mismatch');
    }

    for (let i = 0; i < dimension; i++) {
      sum[i] += embedding[i];
    }
  }

  return sum.map(val => val / embeddings.length);
}

/**
 * Normalize vector to unit length
 */
function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(
    vector.reduce((sum, val) => sum + val * val, 0)
  );

  if (magnitude === 0) {
    return vector;
  }

  return vector.map(val => val / magnitude);
}

/**
 * Cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vector dimension mismatch');
  }

  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);

  if (magA === 0 || magB === 0) {
    return 0;
  }

  // Return normalized to 0-1 range
  const similarity = dotProduct / (magA * magB);
  return (similarity + 1) / 2; // Map from [-1,1] to [0,1]
}

// ============================================
// Exports
// ============================================

export {
  cosineSimilarity,
  normalizeVector,
  averageEmbeddings,
};
