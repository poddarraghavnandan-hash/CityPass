/**
 * Update Taste Vectors
 * Processes recent interactions to update user taste vectors
 */

import { prisma } from '@citypass/db';
import { updateUserTasteVector } from '@citypass/taste';
import { fetchEventEmbeddings as fetchEmbeddingsFromQdrant } from '@citypass/rag';

/**
 * Update taste vectors for users with recent interactions
 * @param lookbackHours - How far back to look for interactions (default: 24)
 */
export async function updateTasteVectors(lookbackHours: number = 24): Promise<void> {
  try {
    const cutoffDate = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);

    console.log(`🎨 [update-taste] Updating taste vectors for interactions since ${cutoffDate.toISOString()}`);

    // Fetch recent save/click events grouped by user
    const recentLogs = await prisma.eventLog.findMany({
      where: {
        createdAt: {
          gte: cutoffDate,
        },
        userId: {
          not: null,
        },
        eventType: {
          in: ['SAVE', 'CLICK_BOOK', 'CLICK_ROUTE', 'HIDE'],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`📊 [update-taste] Processing ${recentLogs.length} interaction logs`);

    // Group by user
    const userInteractions = new Map<string, {
      liked: string[];
      disliked: string[];
    }>();

    for (const log of recentLogs) {
      if (!log.userId) continue;

      const payload = log.payload as any;
      const eventId = payload.eventId;

      if (!eventId) continue;

      if (!userInteractions.has(log.userId)) {
        userInteractions.set(log.userId, { liked: [], disliked: [] });
      }

      const interactions = userInteractions.get(log.userId)!;

      // Positive signals
      if (log.eventType === 'SAVE' || log.eventType === 'CLICK_BOOK') {
        interactions.liked.push(eventId);
      }

      // Negative signals
      if (log.eventType === 'HIDE') {
        interactions.disliked.push(eventId);
      }
    }

    console.log(`👥 [update-taste] Updating taste vectors for ${userInteractions.size} users`);

    // Update each user's taste vector
    let updated = 0;
    for (const [userId, { liked, disliked }] of userInteractions.entries()) {
      if (liked.length === 0 && disliked.length === 0) {
        continue;
      }

      // Fetch event embeddings
      const likedEmbeddings = await fetchEventEmbeddings(liked);
      const dislikedEmbeddings = await fetchEventEmbeddings(disliked);

      if (likedEmbeddings.length === 0 && dislikedEmbeddings.length === 0) {
        console.warn(`[update-taste] No embeddings found for user ${userId}`);
        continue;
      }

      // Update taste vector
      await updateUserTasteVector(userId, likedEmbeddings, dislikedEmbeddings, {
        decayRate: 0.1, // Learning rate
        embeddingVersion: 'bge-m3-v1',
      });

      updated++;
    }

    console.log(`✅ [update-taste] Updated ${updated} taste vectors`);
  } catch (error) {
    console.error('[update-taste] Failed to update taste vectors:', error);
  }
}

/**
 * Fetch event embeddings from Qdrant and convert to array format
 */
async function fetchEventEmbeddings(eventIds: string[]): Promise<number[][]> {
  if (eventIds.length === 0) return [];

  try {
    // Fetch embeddings from Qdrant via @citypass/rag
    const embeddingMap = await fetchEmbeddingsFromQdrant(eventIds);

    if (embeddingMap.size === 0) {
      console.warn(`[fetch-embeddings] No embeddings found for ${eventIds.length} events`);
      return [];
    }

    // Convert Map to array of vectors (maintain order of eventIds)
    const embeddings: number[][] = [];
    for (const eventId of eventIds) {
      const vector = embeddingMap.get(eventId);
      if (vector) {
        embeddings.push(vector);
      }
    }

    console.log(`✅ [fetch-embeddings] Fetched ${embeddings.length}/${eventIds.length} embeddings from Qdrant`);

    return embeddings;
  } catch (error) {
    console.error('[fetch-embeddings] Failed to fetch embeddings:', error);
    return [];
  }
}

/**
 * Batch update taste vectors for all active users
 * Use sparingly (expensive operation)
 */
export async function batchUpdateAllTasteVectors(): Promise<void> {
  try {
    console.log('🎨 [batch-update-taste] Starting batch taste vector update for all users...');

    // Get all users with interactions in the last 90 days
    const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const usersWithInteractions = await prisma.eventLog.groupBy({
      by: ['userId'],
      where: {
        userId: {
          not: null,
        },
        createdAt: {
          gte: cutoffDate,
        },
        eventType: {
          in: ['SAVE', 'CLICK_BOOK', 'HIDE'],
        },
      },
    });

    console.log(`👥 [batch-update-taste] Found ${usersWithInteractions.length} users with recent interactions`);

    for (const { userId } of usersWithInteractions) {
      if (!userId) continue;

      // Fetch user interactions
      const interactions = await prisma.eventLog.findMany({
        where: {
          userId,
          createdAt: {
            gte: cutoffDate,
          },
          eventType: {
            in: ['SAVE', 'CLICK_BOOK', 'HIDE'],
          },
        },
        select: {
          eventType: true,
          payload: true,
        },
      });

      const liked: string[] = [];
      const disliked: string[] = [];

      for (const interaction of interactions) {
        const payload = interaction.payload as any;
        const eventId = payload.eventId;

        if (!eventId) continue;

        if (interaction.eventType === 'SAVE' || interaction.eventType === 'CLICK_BOOK') {
          liked.push(eventId);
        } else if (interaction.eventType === 'HIDE') {
          disliked.push(eventId);
        }
      }

      if (liked.length === 0 && disliked.length === 0) {
        continue;
      }

      // Fetch embeddings and update
      const likedEmbeddings = await fetchEventEmbeddings(liked);
      const dislikedEmbeddings = await fetchEventEmbeddings(disliked);

      await updateUserTasteVector(userId, likedEmbeddings, dislikedEmbeddings, {
        decayRate: 0.15, // Higher decay for batch update
        embeddingVersion: 'bge-m3-v1',
      });
    }

    console.log('✅ [batch-update-taste] Batch update complete');
  } catch (error) {
    console.error('[batch-update-taste] Batch update failed:', error);
  }
}
