/**
 * Worker: Embed and index social captions
 * Generates embeddings for social media captions and indexes to Qdrant
 * Updates socialHeat1h and socialHeat3h metrics
 */

import { prisma } from '@citypass/db';
import { QdrantClient } from '@qdrant/js-client-rest';

const QDRANT_COLLECTION = 'events_e5';
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'e5-base-v2';

const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://localhost:6333',
  apiKey: process.env.QDRANT_API_KEY,
});

/**
 * Generate E5 embedding for text
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const embeddingUrl = process.env.EMBEDDING_SERVICE_URL;

  if (!embeddingUrl) {
    console.warn('⚠️ EMBEDDING_SERVICE_URL not configured. Skipping embeddings.');
    return Array.from({ length: 768 }, () => 0);
  }

  try {
    const response = await fetch(embeddingUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model: EMBEDDING_MODEL }),
    });

    if (!response.ok) {
      throw new Error(`Embedding service error: ${response.status}`);
    }

    const data = await response.json();
    return data.embedding;
  } catch (error: any) {
    console.error('Embedding generation failed:', error.message);
    return Array.from({ length: 768 }, () => 0);
  }
}

/**
 * Main job: Embed social captions and update Qdrant
 */
export async function embedAndIndexSocial(): Promise<{
  processed: number;
  indexed: number;
  socialHeatUpdated: number;
  durationMs: number;
}> {
  const startTime = Date.now();
  console.log('🔄 Starting social embedding and indexing...');

  try {
    // Step 1: Get recent events with social previews
    const cutoff1h = new Date(Date.now() - 1 * 60 * 60 * 1000);
    const cutoff3h = new Date(Date.now() - 3 * 60 * 60 * 1000);

    const socialPreviews = await prisma.socialPreview.findMany({
      where: {
        createdAt: { gte: cutoff3h },
        caption: { not: null },
      },
      include: {
        event: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`📊 Found ${socialPreviews.length} social previews to process`);

    let indexed = 0;

    // Step 2: Generate embeddings and index to Qdrant
    for (const preview of socialPreviews) {
      if (!preview.caption) continue;

      try {
        const embedding = await generateEmbedding(preview.caption);

        // Index to Qdrant
        await qdrantClient.upsert(QDRANT_COLLECTION, {
          points: [
            {
              id: preview.id,
              vector: embedding,
              payload: {
                eventId: preview.eventId,
                caption: preview.caption,
                platform: preview.platform,
                createdAt: preview.createdAt.toISOString(),
                likeCount: preview.likeCount || 0,
                viewCount: preview.viewCount || 0,
                commentCount: preview.commentCount || 0,
              },
            },
          ],
        });

        indexed++;
      } catch (error: any) {
        console.error(`Failed to embed/index preview ${preview.id}:`, error.message);
      }
    }

    console.log(`✅ Indexed ${indexed} captions to Qdrant`);

    // Step 3: Update social heat metrics
    const heat1h = await computeSocialHeat(cutoff1h);
    const heat3h = await computeSocialHeat(cutoff3h);

    let socialHeatUpdated = 0;

    // Update events with social heat
    for (const [eventId, metrics] of Object.entries(heat3h)) {
      await prisma.event.update({
        where: { id: eventId },
        data: {
          // Store as JSON or separate fields depending on schema
          metadata: {
            socialHeat1h: heat1h[eventId] || 0,
            socialHeat3h: metrics,
          },
        },
      });
      socialHeatUpdated++;
    }

    const durationMs = Date.now() - startTime;

    console.log(`✅ Social embedding complete: ${indexed} indexed, ${socialHeatUpdated} events updated in ${durationMs}ms`);

    return {
      processed: socialPreviews.length,
      indexed,
      socialHeatUpdated,
      durationMs,
    };
  } catch (error: any) {
    console.error('❌ Social embedding failed:', error.message);
    throw error;
  }
}

/**
 * Compute social heat score for events
 */
async function computeSocialHeat(since: Date): Promise<Record<string, number>> {
  const analytics = await prisma.analyticsEvent.groupBy({
    by: ['eventId', 'type'],
    where: {
      occurredAt: { gte: since },
      type: { in: ['VIEW', 'SAVE', 'SHARE'] },
    },
    _count: true,
  });

  const heatMap: Record<string, number> = {};

  analytics.forEach(entry => {
    const current = heatMap[entry.eventId] || 0;
    let weight = 1;

    if (entry.type === 'SAVE') weight = 2;
    if (entry.type === 'SHARE') weight = 3;

    heatMap[entry.eventId] = current + entry._count * weight;
  });

  // Normalize to 0-1 scale
  const maxHeat = Math.max(...Object.values(heatMap), 1);
  Object.keys(heatMap).forEach(eventId => {
    heatMap[eventId] = heatMap[eventId] / maxHeat;
  });

  return heatMap;
}

/**
 * Health check for embedding service
 */
export async function healthCheckEmbedding(): Promise<boolean> {
  const embeddingUrl = process.env.EMBEDDING_SERVICE_URL;

  if (!embeddingUrl) {
    console.warn('⚠️ EMBEDDING_SERVICE_URL not configured');
    return false;
  }

  try {
    const response = await fetch(`${embeddingUrl}/health`, {
      method: 'GET',
    });
    return response.ok;
  } catch (error) {
    console.error('Embedding service health check failed');
    return false;
  }
}
