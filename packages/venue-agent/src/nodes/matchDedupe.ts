/**
 * Match and Deduplicate Node
 * Matches normalized candidates against existing venues in the database
 */

import type { CityIngestionContext, NormalizedVenueCandidate, MatchCandidate } from '../types';
import { prisma } from '@citypass/db';
import { areVenuesMatch } from '../utils/matching';

/**
 * Match and deduplicate venue candidates
 */
export async function matchAndDeduplicateVenues(
  context: CityIngestionContext
): Promise<CityIngestionContext> {
  console.log(
    `[MatchDedupeAgent] Matching ${context.normalizedCandidates?.length || 0} candidates...`
  );

  if (!context.normalizedCandidates || context.normalizedCandidates.length === 0) {
    context.matchedCandidates = [];
    context.stats.matched = 0;
    context.stats.newVenues = 0;
    return context;
  }

  // Fetch existing venues in this city
  const existingVenues = await prisma.venue.findMany({
    where: {
      city: context.city.name,
      isActive: true,
    },
    select: {
      id: true,
      canonicalName: true,
      normalizedName: true,
      lat: true,
      lon: true,
      primaryCategory: true,
      aliases: {
        select: {
          alias: true,
          aliasNormalized: true,
        },
      },
    },
  });

  console.log(`[MatchDedupeAgent] Found ${existingVenues.length} existing venues`);

  const matched: MatchCandidate[] = [];
  let matchCount = 0;
  let newCount = 0;

  for (const candidate of context.normalizedCandidates) {
    // Try to find a match
    let bestMatch: { id: string; confidence: number } | null = null;

    for (const existing of existingVenues) {
      const result = areVenuesMatch(
        {
          normalizedName: candidate.normalizedName,
          lat: candidate.lat,
          lon: candidate.lon,
          primaryCategory: candidate.primaryCategory,
          aliases: candidate.aliases,
        },
        {
          normalizedName: existing.normalizedName,
          lat: existing.lat || undefined,
          lon: existing.lon || undefined,
          primaryCategory: existing.primaryCategory,
          aliases: existing.aliases.map(a => a.aliasNormalized),
        },
        0.85 // Match threshold
      );

      if (result.isMatch) {
        if (!bestMatch || result.confidence > bestMatch.confidence) {
          bestMatch = {
            id: existing.id,
            confidence: result.confidence,
          };
        }
      }
    }

    if (bestMatch) {
      // Matched to existing venue
      matched.push({
        candidate,
        matchedVenueId: bestMatch.id,
        matchConfidence: bestMatch.confidence,
        isNew: false,
      });
      matchCount++;
    } else {
      // New venue
      matched.push({
        candidate,
        isNew: true,
      });
      newCount++;
    }
  }

  console.log(`[MatchDedupeAgent] Matched: ${matchCount}, New: ${newCount}`);

  context.matchedCandidates = matched;
  context.stats.matched = matchCount;
  context.stats.newVenues = newCount;

  return context;
}
