/**
 * Write Graph Node
 * Writes venue data to Postgres and Neo4j
 */

import type { CityIngestionContext, MatchCandidate } from '../types';
import { prisma } from '@citypass/db';
import neo4j from 'neo4j-driver';

const NEO4J_URI = process.env.NEO4J_URI;
const NEO4J_USERNAME = process.env.NEO4J_USERNAME || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;
const NEO4J_DATABASE = process.env.NEO4J_DATABASE || 'neo4j';

let neo4jDriver: neo4j.Driver | null = null;

/**
 * Get Neo4j driver (singleton)
 */
function getNeo4jDriver(): neo4j.Driver | null {
  if (!NEO4J_URI || !NEO4J_PASSWORD) {
    console.warn('[WriteGraphAgent] Neo4j not configured, skipping graph writes');
    return null;
  }

  if (!neo4jDriver) {
    neo4jDriver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD));
  }

  return neo4jDriver;
}

/**
 * Write venues to database and knowledge graph
 */
export async function writeVenueGraph(
  context: CityIngestionContext
): Promise<CityIngestionContext> {
  console.log(`[WriteGraphAgent] Writing ${context.matchedCandidates?.length || 0} venues...`);

  if (!context.matchedCandidates || context.matchedCandidates.length === 0) {
    return context;
  }

  let created = 0;
  let updated = 0;

  for (const matchCandidate of context.matchedCandidates) {
    try {
      const venueId = matchCandidate.isNew
        ? await createNewVenue(matchCandidate, context.city.name)
        : await updateExistingVenue(matchCandidate);

      if (matchCandidate.isNew) created++;
      else updated++;

      // Write to Neo4j (gracefully degrade if unavailable)
      await writeVenueToNeo4j(venueId, matchCandidate, context.city.name).catch(err => {
        console.warn(`[WriteGraphAgent] Neo4j write failed for ${venueId}:`, err.message);
      });
    } catch (error: any) {
      console.error(`[WriteGraphAgent] Error writing venue:`, error);
      context.errors.push({
        agentName: 'WriteGraphAgent',
        source: 'SYSTEM',
        message: `Failed to write venue: ${error.message}`,
        payload: { candidate: matchCandidate.candidate.canonicalName },
        timestamp: new Date(),
      });
    }
  }

  console.log(`[WriteGraphAgent] Created: ${created}, Updated: ${updated}`);

  context.stats.newVenues = created;
  context.stats.updatedVenues = updated;

  return context;
}

/**
 * Create a new venue in the database
 */
async function createNewVenue(
  matchCandidate: MatchCandidate,
  cityName: string
): Promise<string> {
  const { candidate } = matchCandidate;

  const venue = await prisma.venue.create({
    data: {
      name: candidate.canonicalName,
      canonicalName: candidate.canonicalName,
      normalizedName: candidate.normalizedName,

      lat: candidate.lat,
      lon: candidate.lon,
      address: candidate.address,
      neighborhood: candidate.neighborhood,
      city: cityName,

      primaryCategory: candidate.primaryCategory,
      subcategories: candidate.subcategories,

      priceBand: candidate.priceBand,
      capacity: candidate.capacity,

      website: candidate.website,
      phone: candidate.phone,
      description: candidate.description,
      imageUrl: candidate.imageUrl,

      isActive: candidate.isActive,
    },
  });

  // Create VenueSource entries
  for (const rawVenue of candidate.sources) {
    await prisma.venueSource.create({
      data: {
        venueId: venue.id,
        source: rawVenue.source,
        sourceExternalId: rawVenue.sourceExternalId,
        sourceUrl: rawVenue.sourceUrl,
        rawPayload: rawVenue.rawPayload as any,
        confidence: rawVenue.confidence,
      },
    });
  }

  // Create VenueAlias entries
  for (const alias of candidate.aliases) {
    await prisma.venueAlias.create({
      data: {
        venueId: venue.id,
        alias,
        aliasNormalized: alias.toLowerCase().replace(/[^\w\s]/g, '').trim(),
        source: 'ingestion',
      },
    });
  }

  return venue.id;
}

/**
 * Update an existing venue
 */
async function updateExistingVenue(matchCandidate: MatchCandidate): Promise<string> {
  const { candidate, matchedVenueId } = matchCandidate;
  if (!matchedVenueId) throw new Error('No matched venue ID');

  // Update venue (merge data, prefer non-null values)
  await prisma.venue.update({
    where: { id: matchedVenueId },
    data: {
      lat: candidate.lat || undefined,
      lon: candidate.lon || undefined,
      address: candidate.address || undefined,
      neighborhood: candidate.neighborhood || undefined,
      website: candidate.website || undefined,
      phone: candidate.phone || undefined,
      description: candidate.description || undefined,
      imageUrl: candidate.imageUrl || undefined,
      priceBand: candidate.priceBand || undefined,
      capacity: candidate.capacity || undefined,
      subcategories: candidate.subcategories.length > 0 ? candidate.subcategories : undefined,
      updatedAt: new Date(),
    },
  });

  // Add new source entries (if not already present)
  for (const rawVenue of candidate.sources) {
    const existingSource = await prisma.venueSource.findUnique({
      where: {
        source_sourceExternalId: {
          source: rawVenue.source,
          sourceExternalId: rawVenue.sourceExternalId,
        },
      },
    });

    if (!existingSource) {
      await prisma.venueSource.create({
        data: {
          venueId: matchedVenueId,
          source: rawVenue.source,
          sourceExternalId: rawVenue.sourceExternalId,
          sourceUrl: rawVenue.sourceUrl,
          rawPayload: rawVenue.rawPayload as any,
          confidence: rawVenue.confidence,
        },
      });
    }
  }

  return matchedVenueId;
}

/**
 * Write venue to Neo4j knowledge graph
 */
async function writeVenueToNeo4j(
  venueId: string,
  matchCandidate: MatchCandidate,
  cityName: string
): Promise<void> {
  const driver = getNeo4jDriver();
  if (!driver) return; // Gracefully skip if Neo4j not available

  const session = driver.session({ database: NEO4J_DATABASE });

  try {
    const { candidate } = matchCandidate;

    // Create/update Venue node
    await session.run(
      `
      MERGE (v:Venue {id: $id})
      SET v.name = $name,
          v.lat = $lat,
          v.lon = $lon,
          v.category = $category,
          v.city = $city,
          v.updatedAt = datetime()
      `,
      {
        id: venueId,
        name: candidate.canonicalName,
        lat: candidate.lat || null,
        lon: candidate.lon || null,
        category: candidate.primaryCategory,
        city: cityName,
      }
    );

    // Create neighborhood node and relationship
    if (candidate.neighborhood) {
      await session.run(
        `
        MERGE (n:Neighborhood {name: $neighborhood, city: $city})
        WITH n
        MATCH (v:Venue {id: $venueId})
        MERGE (v)-[:IN_NEIGHBORHOOD]->(n)
        `,
        {
          neighborhood: candidate.neighborhood,
          city: cityName,
          venueId,
        }
      );
    }

    // Create category node and relationship
    await session.run(
      `
      MERGE (c:Category {name: $category})
      WITH c
      MATCH (v:Venue {id: $venueId})
      MERGE (v)-[:HAS_CATEGORY]->(c)
      `,
      {
        category: candidate.primaryCategory,
        venueId,
      }
    );
  } finally {
    await session.close();
  }
}
