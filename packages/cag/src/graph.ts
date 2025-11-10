/**
 * CAG (Context-Augmented Generation) with Neo4j
 * Graph-based reasoning for event recommendations
 */

import neo4j, { Driver, Session, Result } from 'neo4j-driver';

// Types
export interface GraphNode {
  id: string;
  labels: string[];
  properties: Record<string, any>;
}

export interface SimilarEvent {
  eventId: string;
  similarity: number;
  reason: 'category' | 'venue' | 'tags' | 'temporal';
}

export interface NoveltyScore {
  eventId: string;
  novelty: number; // 0-1, higher = more novel
  userHistoryCount: number;
  similarViewedCount: number;
}

export interface FriendSignal {
  eventId: string;
  friendCount: number;
  friends: Array<{ userId: string; action: 'viewed' | 'saved' | 'attended' }>;
}

// Singleton driver
let driver: Driver | null = null;

/**
 * Initialize Neo4j driver
 */
export function initializeGraphDB(): Driver {
  if (driver) return driver;

  const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
  const username = process.env.NEO4J_USERNAME || 'neo4j';
  const password = process.env.NEO4J_PASSWORD || 'password';

  driver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
    maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3 hours
    maxConnectionPoolSize: 50,
    connectionAcquisitionTimeout: 2 * 60 * 1000, // 2 minutes
  });

  return driver;
}

/**
 * Get or create Neo4j driver
 */
function getDriver(): Driver {
  if (!driver) {
    driver = initializeGraphDB();
  }
  return driver;
}

/**
 * Execute Cypher query with error handling
 */
async function executeCypher<T = any>(
  query: string,
  params: Record<string, any> = {},
  timeoutMs: number = 5000
): Promise<T[]> {
  let session: Session | null = null;

  try {
    const driver = getDriver();
    session = driver.session();

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
    );

    const result = await Promise.race([session.run(query, params), timeoutPromise]);

    return result.records.map((record: any) => record.toObject() as T);
  } catch (error: any) {
    console.error('Cypher query failed:', error.message);
    console.error('Query:', query);
    throw error;
  } finally {
    if (session) {
      await session.close();
    }
  }
}

/**
 * Find similar events using graph relationships
 * Uses SIMILAR and NEAR edges created by worker jobs
 */
export async function similarEvents(
  eventIds: string[],
  limit: number = 20
): Promise<SimilarEvent[]> {
  const query = `
    MATCH (e:Event)
    WHERE e.id IN $eventIds
    MATCH (e)-[r:SIMILAR|NEAR]-(similar:Event)
    WHERE NOT similar.id IN $eventIds
    WITH similar,
         AVG(r.score) as avgScore,
         COUNT(DISTINCT e) as sourceCount,
         r.reason as reason
    ORDER BY sourceCount DESC, avgScore DESC
    LIMIT $limit
    RETURN
      similar.id as eventId,
      avgScore as similarity,
      COALESCE(reason, 'category') as reason
  `;

  try {
    const results = await executeCypher<{
      eventId: string;
      similarity: number;
      reason: string;
    }>(query, { eventIds, limit });

    return results.map(r => ({
      eventId: r.eventId,
      similarity: r.similarity,
      reason: r.reason as SimilarEvent['reason'],
    }));
  } catch (error: any) {
    console.error('similarEvents failed:', error.message);
    return [];
  }
}

/**
 * Calculate novelty scores for candidates based on user history
 * Higher novelty = less similar to what user has seen before
 */
export async function noveltyForUser(
  userId: string,
  candidateIds: string[]
): Promise<NoveltyScore[]> {
  const query = `
    MATCH (u:User {id: $userId})
    OPTIONAL MATCH (u)-[:VIEWED|SAVED|ATTENDED]->(viewed:Event)
    WITH u, COLLECT(DISTINCT viewed.id) as viewedIds

    UNWIND $candidateIds as candidateId
    MATCH (candidate:Event {id: candidateId})

    OPTIONAL MATCH (candidate)-[:SIMILAR]-(viewed:Event)
    WHERE viewed.id IN viewedIds
    WITH candidate, viewedIds, COUNT(DISTINCT viewed) as similarViewedCount

    WITH candidate,
         SIZE(viewedIds) as userHistoryCount,
         similarViewedCount,
         CASE
           WHEN SIZE(viewedIds) = 0 THEN 0.5
           WHEN similarViewedCount = 0 THEN 1.0
           ELSE 1.0 - (toFloat(similarViewedCount) / toFloat(SIZE(viewedIds)))
         END as novelty

    RETURN
      candidate.id as eventId,
      novelty,
      userHistoryCount,
      similarViewedCount
    ORDER BY novelty DESC
  `;

  try {
    const results = await executeCypher<NoveltyScore>(query, { userId, candidateIds });
    return results;
  } catch (error: any) {
    console.error('noveltyForUser failed:', error.message);
    // Graceful degradation: return neutral novelty
    return candidateIds.map(eventId => ({
      eventId,
      novelty: 0.5,
      userHistoryCount: 0,
      similarViewedCount: 0,
    }));
  }
}

/**
 * Find friend overlap for candidates
 * Returns which friends have engaged with each event
 */
export async function friendOverlap(
  userId: string,
  candidateIds: string[]
): Promise<FriendSignal[]> {
  const query = `
    MATCH (u:User {id: $userId})-[:FRIENDS_WITH]-(friend:User)
    WITH COLLECT(DISTINCT friend.id) as friendIds

    UNWIND $candidateIds as candidateId
    MATCH (candidate:Event {id: candidateId})

    OPTIONAL MATCH (friend:User)-[action:VIEWED|SAVED|ATTENDED]->(candidate)
    WHERE friend.id IN friendIds
    WITH candidate,
         COLLECT(DISTINCT {
           userId: friend.id,
           action: toLower(type(action))
         }) as friendActions

    RETURN
      candidate.id as eventId,
      SIZE(friendActions) as friendCount,
      friendActions as friends
  `;

  try {
    const results = await executeCypher<FriendSignal>(query, { userId, candidateIds });
    return results;
  } catch (error: any) {
    console.error('friendOverlap failed:', error.message);
    // Graceful degradation: no friend signals
    return candidateIds.map(eventId => ({
      eventId,
      friendCount: 0,
      friends: [],
    }));
  }
}

/**
 * Diversify candidates using graph-based clustering
 * Ensures recommendations aren't too similar to each other
 */
export async function diversifyByGraph(
  candidateIds: string[],
  userId: string | null = null,
  diversityThreshold: number = 0.7,
  maxResults: number = 20
): Promise<string[]> {
  if (candidateIds.length === 0) return [];

  const query = `
    UNWIND $candidateIds as candidateId
    MATCH (candidate:Event {id: candidateId})

    OPTIONAL MATCH (candidate)-[sim:SIMILAR]-(other:Event)
    WHERE other.id IN $candidateIds AND sim.score >= $diversityThreshold

    WITH candidate, COLLECT(DISTINCT other.id) as similarIds

    RETURN
      candidate.id as eventId,
      SIZE(similarIds) as similarCount,
      similarIds
    ORDER BY similarCount ASC
  `;

  try {
    const results = await executeCypher<{
      eventId: string;
      similarCount: number;
      similarIds: string[];
    }>(query, { candidateIds, diversityThreshold });

    // Greedy diversification: pick events with least overlap
    const selected: string[] = [];
    const seenSimilar = new Set<string>();

    for (const result of results) {
      if (selected.length >= maxResults) break;

      const hasSimilarAlready = result.similarIds.some(id => seenSimilar.has(id));
      if (!hasSimilarAlready) {
        selected.push(result.eventId);
        result.similarIds.forEach(id => seenSimilar.add(id));
      }
    }

    // Fill remaining slots with original order
    const remaining = candidateIds.filter(id => !selected.includes(id));
    selected.push(...remaining.slice(0, maxResults - selected.length));

    return selected.slice(0, maxResults);
  } catch (error: any) {
    console.error('diversifyByGraph failed:', error.message);
    // Graceful degradation: return original order
    return candidateIds.slice(0, maxResults);
  }
}

/**
 * Get social heat for events based on recent activity
 * Returns view/save/attend counts from graph
 */
export async function getSocialHeat(
  eventIds: string[],
  hoursBack: number = 24
): Promise<Record<string, { views: number; saves: number; attends: number }>> {
  const cutoffTimestamp = Date.now() - hoursBack * 60 * 60 * 1000;

  const query = `
    UNWIND $eventIds as eventId
    MATCH (e:Event {id: eventId})

    OPTIONAL MATCH (u:User)-[v:VIEWED]->(e)
    WHERE v.timestamp >= $cutoffTimestamp
    WITH e, COUNT(v) as views

    OPTIONAL MATCH (u:User)-[s:SAVED]->(e)
    WHERE s.timestamp >= $cutoffTimestamp
    WITH e, views, COUNT(s) as saves

    OPTIONAL MATCH (u:User)-[a:ATTENDED]->(e)
    WHERE a.timestamp >= $cutoffTimestamp
    WITH e, views, saves, COUNT(a) as attends

    RETURN
      e.id as eventId,
      views,
      saves,
      attends
  `;

  try {
    const results = await executeCypher<{
      eventId: string;
      views: number;
      saves: number;
      attends: number;
    }>(query, { eventIds, cutoffTimestamp });

    const heatMap: Record<string, { views: number; saves: number; attends: number }> = {};
    results.forEach(r => {
      heatMap[r.eventId] = {
        views: r.views,
        saves: r.saves,
        attends: r.attends,
      };
    });

    // Fill missing events with zeros
    eventIds.forEach(id => {
      if (!heatMap[id]) {
        heatMap[id] = { views: 0, saves: 0, attends: 0 };
      }
    });

    return heatMap;
  } catch (error: any) {
    console.error('getSocialHeat failed:', error.message);
    // Graceful degradation: return zeros
    const heatMap: Record<string, { views: number; saves: number; attends: number }> = {};
    eventIds.forEach(id => {
      heatMap[id] = { views: 0, saves: 0, attends: 0 };
    });
    return heatMap;
  }
}

/**
 * Health check for Neo4j connection
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const driver = getDriver();
    await driver.verifyConnectivity();
    return true;
  } catch (error: any) {
    console.error('Neo4j health check failed:', error.message);
    return false;
  }
}

/**
 * Close Neo4j driver
 */
export async function closeGraphDB(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}
