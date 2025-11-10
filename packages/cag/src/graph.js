import neo4j from 'neo4j-driver';
let driver = null;
export function initializeGraphDB() {
    if (driver)
        return driver;
    const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
    const username = process.env.NEO4J_USERNAME || 'neo4j';
    const password = process.env.NEO4J_PASSWORD || 'password';
    driver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
        maxConnectionLifetime: 3 * 60 * 60 * 1000,
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 2 * 60 * 1000,
    });
    return driver;
}
function getDriver() {
    if (!driver) {
        driver = initializeGraphDB();
    }
    return driver;
}
async function executeCypher(query, params = {}, timeoutMs = 5000) {
    let session = null;
    try {
        const driver = getDriver();
        session = driver.session();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), timeoutMs));
        const result = await Promise.race([session.run(query, params), timeoutPromise]);
        return result.records.map((record) => record.toObject());
    }
    catch (error) {
        console.error('Cypher query failed:', error.message);
        console.error('Query:', query);
        throw error;
    }
    finally {
        if (session) {
            await session.close();
        }
    }
}
export async function similarEvents(eventIds, limit = 20) {
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
        const results = await executeCypher(query, { eventIds, limit });
        return results.map(r => ({
            eventId: r.eventId,
            similarity: r.similarity,
            reason: r.reason,
        }));
    }
    catch (error) {
        console.error('similarEvents failed:', error.message);
        return [];
    }
}
export async function noveltyForUser(userId, candidateIds) {
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
        const results = await executeCypher(query, { userId, candidateIds });
        return results;
    }
    catch (error) {
        console.error('noveltyForUser failed:', error.message);
        return candidateIds.map(eventId => ({
            eventId,
            novelty: 0.5,
            userHistoryCount: 0,
            similarViewedCount: 0,
        }));
    }
}
export async function friendOverlap(userId, candidateIds) {
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
        const results = await executeCypher(query, { userId, candidateIds });
        return results;
    }
    catch (error) {
        console.error('friendOverlap failed:', error.message);
        return candidateIds.map(eventId => ({
            eventId,
            friendCount: 0,
            friends: [],
        }));
    }
}
export async function diversifyByGraph(candidateIds, userId = null, diversityThreshold = 0.7, maxResults = 20) {
    if (candidateIds.length === 0)
        return [];
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
        const results = await executeCypher(query, { candidateIds, diversityThreshold });
        const selected = [];
        const seenSimilar = new Set();
        for (const result of results) {
            if (selected.length >= maxResults)
                break;
            const hasSimilarAlready = result.similarIds.some(id => seenSimilar.has(id));
            if (!hasSimilarAlready) {
                selected.push(result.eventId);
                result.similarIds.forEach(id => seenSimilar.add(id));
            }
        }
        const remaining = candidateIds.filter(id => !selected.includes(id));
        selected.push(...remaining.slice(0, maxResults - selected.length));
        return selected.slice(0, maxResults);
    }
    catch (error) {
        console.error('diversifyByGraph failed:', error.message);
        return candidateIds.slice(0, maxResults);
    }
}
export async function getSocialHeat(eventIds, hoursBack = 24) {
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
        const results = await executeCypher(query, { eventIds, cutoffTimestamp });
        const heatMap = {};
        results.forEach(r => {
            heatMap[r.eventId] = {
                views: r.views,
                saves: r.saves,
                attends: r.attends,
            };
        });
        eventIds.forEach(id => {
            if (!heatMap[id]) {
                heatMap[id] = { views: 0, saves: 0, attends: 0 };
            }
        });
        return heatMap;
    }
    catch (error) {
        console.error('getSocialHeat failed:', error.message);
        const heatMap = {};
        eventIds.forEach(id => {
            heatMap[id] = { views: 0, saves: 0, attends: 0 };
        });
        return heatMap;
    }
}
export async function healthCheck() {
    try {
        const driver = getDriver();
        await driver.verifyConnectivity();
        return true;
    }
    catch (error) {
        console.error('Neo4j health check failed:', error.message);
        return false;
    }
}
export async function closeGraphDB() {
    if (driver) {
        await driver.close();
        driver = null;
    }
}
//# sourceMappingURL=graph.js.map