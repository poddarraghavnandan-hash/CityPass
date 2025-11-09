/**
 * Worker: Refresh graph similarity edges
 * Runs daily to recompute SIMILAR and NEAR edges in Neo4j
 * Idempotent: safe to run multiple times
 */

import { prisma } from '@citypass/db';
import { initializeGraphDB, executeCypher } from './neo4j-utils';

interface SimilarityEdge {
  fromId: string;
  toId: string;
  score: number;
  reason: 'category' | 'venue' | 'tags' | 'temporal';
}

/**
 * Main job: Refresh similarity edges
 */
export async function refreshSimilarityEdges(): Promise<{
  similarEdgesCreated: number;
  nearEdgesCreated: number;
  durationMs: number;
}> {
  const startTime = Date.now();
  console.log('🔄 Starting similarity edge refresh...');

  const driver = initializeGraphDB();

  try {
    // Step 1: Clear old edges
    await clearOldEdges();

    // Step 2: Compute category-based similarity
    const categorySimilar = await computeCategorySimilarity();

    // Step 3: Compute venue-based similarity
    const venueSimilar = await computeVenueSimilarity();

    // Step 4: Compute tag-based similarity
    const tagSimilar = await computeTagSimilarity();

    // Step 5: Compute temporal proximity (NEAR edges)
    const nearEdges = await computeTemporalProximity();

    // Step 6: Batch insert edges
    const allSimilar = [...categorySimilar, ...venueSimilar, ...tagSimilar];
    await batchInsertEdges(allSimilar, 'SIMILAR');
    await batchInsertEdges(nearEdges, 'NEAR');

    const durationMs = Date.now() - startTime;

    console.log(`✅ Similarity refresh complete: ${allSimilar.length} SIMILAR, ${nearEdges.length} NEAR edges in ${durationMs}ms`);

    return {
      similarEdgesCreated: allSimilar.length,
      nearEdgesCreated: nearEdges.length,
      durationMs,
    };
  } catch (error: any) {
    console.error('❌ Similarity refresh failed:', error.message);
    throw error;
  }
}

/**
 * Clear old SIMILAR and NEAR edges
 */
async function clearOldEdges(): Promise<void> {
  const query = `
    MATCH ()-[r:SIMILAR|NEAR]-()
    DELETE r
  `;

  await executeCypher(query);
  console.log('🗑️ Cleared old similarity edges');
}

/**
 * Compute category-based similarity
 */
async function computeCategorySimilarity(): Promise<SimilarityEdge[]> {
  const events = await prisma.event.findMany({
    select: {
      id: true,
      category: true,
    },
    where: {
      category: { not: null },
    },
  });

  const categoryGroups = new Map<string, string[]>();
  events.forEach(event => {
    if (!event.category) return;
    const group = categoryGroups.get(event.category) || [];
    group.push(event.id);
    categoryGroups.set(event.category, group);
  });

  const edges: SimilarityEdge[] = [];

  categoryGroups.forEach((eventIds, category) => {
    for (let i = 0; i < eventIds.length; i++) {
      for (let j = i + 1; j < eventIds.length; j++) {
        edges.push({
          fromId: eventIds[i],
          toId: eventIds[j],
          score: 0.8, // High similarity for same category
          reason: 'category',
        });
      }
    }
  });

  console.log(`📊 Computed ${edges.length} category-based edges`);
  return edges;
}

/**
 * Compute venue-based similarity
 */
async function computeVenueSimilarity(): Promise<SimilarityEdge[]> {
  const events = await prisma.event.findMany({
    select: {
      id: true,
      venueId: true,
    },
    where: {
      venueId: { not: null },
    },
  });

  const venueGroups = new Map<string, string[]>();
  events.forEach(event => {
    if (!event.venueId) return;
    const group = venueGroups.get(event.venueId) || [];
    group.push(event.id);
    venueGroups.set(event.venueId, group);
  });

  const edges: SimilarityEdge[] = [];

  venueGroups.forEach((eventIds, venueId) => {
    for (let i = 0; i < eventIds.length; i++) {
      for (let j = i + 1; j < eventIds.length; j++) {
        edges.push({
          fromId: eventIds[i],
          toId: eventIds[j],
          score: 0.9, // Very high similarity for same venue
          reason: 'venue',
        });
      }
    }
  });

  console.log(`📊 Computed ${edges.length} venue-based edges`);
  return edges;
}

/**
 * Compute tag-based similarity using Jaccard similarity
 */
async function computeTagSimilarity(): Promise<SimilarityEdge[]> {
  const events = await prisma.event.findMany({
    select: {
      id: true,
      tags: true,
    },
    where: {
      tags: { not: null },
    },
  });

  const edges: SimilarityEdge[] = [];

  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const tagsA = new Set(events[i].tags || []);
      const tagsB = new Set(events[j].tags || []);

      if (tagsA.size === 0 || tagsB.size === 0) continue;

      const intersection = new Set([...tagsA].filter(tag => tagsB.has(tag)));
      const union = new Set([...tagsA, ...tagsB]);

      const jaccard = intersection.size / union.size;

      if (jaccard >= 0.3) {
        // Threshold for similarity
        edges.push({
          fromId: events[i].id,
          toId: events[j].id,
          score: jaccard,
          reason: 'tags',
        });
      }
    }
  }

  console.log(`📊 Computed ${edges.length} tag-based edges`);
  return edges;
}

/**
 * Compute temporal proximity (events happening around the same time)
 */
async function computeTemporalProximity(): Promise<SimilarityEdge[]> {
  const events = await prisma.event.findMany({
    select: {
      id: true,
      startTime: true,
    },
    orderBy: {
      startTime: 'asc',
    },
  });

  const edges: SimilarityEdge[] = [];
  const TIME_WINDOW_MS = 4 * 60 * 60 * 1000; // 4 hours

  for (let i = 0; i < events.length; i++) {
    const current = events[i];

    // Look ahead for events within time window
    for (let j = i + 1; j < events.length; j++) {
      const next = events[j];
      const timeDiff = Math.abs(next.startTime.getTime() - current.startTime.getTime());

      if (timeDiff > TIME_WINDOW_MS) {
        break; // Events are sorted, so we can break early
      }

      const score = 1 - timeDiff / TIME_WINDOW_MS; // Closer = higher score

      edges.push({
        fromId: current.id,
        toId: next.id,
        score,
        reason: 'temporal',
      });
    }
  }

  console.log(`📊 Computed ${edges.length} temporal proximity edges`);
  return edges;
}

/**
 * Batch insert edges into Neo4j
 */
async function batchInsertEdges(
  edges: SimilarityEdge[],
  relationType: 'SIMILAR' | 'NEAR'
): Promise<void> {
  if (edges.length === 0) return;

  const BATCH_SIZE = 1000;

  for (let i = 0; i < edges.length; i += BATCH_SIZE) {
    const batch = edges.slice(i, i + BATCH_SIZE);

    const query = `
      UNWIND $edges as edge
      MATCH (a:Event {id: edge.fromId})
      MATCH (b:Event {id: edge.toId})
      CREATE (a)-[r:${relationType} {
        score: edge.score,
        reason: edge.reason,
        createdAt: datetime()
      }]->(b)
    `;

    await executeCypher(query, { edges: batch });
    console.log(`  ✓ Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(edges.length / BATCH_SIZE)}`);
  }
}
