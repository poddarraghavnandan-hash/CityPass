/**
 * Node: Enrich Context
 * Add graph signals, taste matching, and spatial features
 */

import { noveltyForUser, friendOverlap, getSocialHeat } from '@citypass/cag';
import { getUserTasteVector, calculateTasteSimilarity } from '@citypass/taste';
import type { AgentState, EnrichedEvent } from '../types';
import { fetchEventEmbeddings } from '@citypass/rag';
import { calculateDistance, estimateTravelTime, getCityCenter } from '@citypass/utils';

export async function enrichNode(state: AgentState): Promise<Partial<AgentState>> {
  if (!state.candidates || state.candidates.length === 0) {
    console.warn('[enrich] No candidates to enrich');
    return {
      enrichedCandidates: [],
    };
  }

  const eventIds = state.candidates.map(c => c.id);
  const userId = state.userId;

  // Fetch enrichments in parallel
  const [noveltyScores, friendSignals, socialHeat, tasteVector, eventEmbeddings] = await Promise.all([
    userId
      ? noveltyForUser(userId, eventIds).catch(err => {
          console.warn('[enrich] Novelty fetch failed:', err.message);
          return [];
        })
      : Promise.resolve([]),
    userId
      ? friendOverlap(userId, eventIds).catch(err => {
          console.warn('[enrich] Friend overlap fetch failed:', err.message);
          return [];
        })
      : Promise.resolve([]),
    getSocialHeat(eventIds, 3).catch(err => {
      console.warn('[enrich] Social heat fetch failed:', err.message);
      return {};
    }),
    userId
      ? getUserTasteVector(userId).catch(err => {
          console.warn('[enrich] Taste vector fetch failed:', err.message);
          return null;
        })
      : Promise.resolve(null),
    fetchEventEmbeddings(eventIds).catch(err => {
      console.warn('[enrich] Event embeddings fetch failed:', err.message);
      return new Map();
    }),
  ]);

  // Build lookup maps
  const noveltyMap = new Map(noveltyScores.map(n => [n.eventId, n.novelty]));
  const friendMap = new Map(friendSignals.map(f => [f.eventId, f.friendCount]));

  // Get user/city location for distance calculation
  const userLocation = state.intention?.city
    ? getCityCenter(state.intention.city)
    : null;

  // Enrich each candidate
  const enrichedCandidates: EnrichedEvent[] = state.candidates.map(candidate => {
    const novelty = noveltyMap.get(candidate.id) ?? 0.5;
    const friendCount = friendMap.get(candidate.id) ?? 0;
    const social = (socialHeat as any)[candidate.id] || { views: 0, saves: 0, attends: 0 };

    // Calculate actual distance using haversine formula
    const distanceKm =
      candidate.lat && candidate.lon && userLocation
        ? calculateDistance(userLocation.lat, userLocation.lon, candidate.lat, candidate.lon)
        : null;

    // Fetch event embedding for taste matching
    const eventEmbedding = eventEmbeddings.get(candidate.id) || null;
    const tasteMatchScore = tasteVector && eventEmbedding
      ? calculateTasteSimilarity(tasteVector, eventEmbedding)
      : 0.5;

    return {
      ...candidate,
      distanceKm,
      travelTimeMinutes: distanceKm ? estimateTravelTime(distanceKm) : null,
      noveltyScore: novelty,
      friendInterest: friendCount,
      socialHeat: social,
      tasteMatchScore,
      embedding: eventEmbedding,
    };
  });

  console.log(`✅ [enrich] Enriched ${enrichedCandidates.length} candidates`);

  const degradedFlags: any = { ...(state.degradedFlags || {}) };
  if (userId && !tasteVector) {
    degradedFlags.noTasteVector = true;
  }

  return {
    enrichedCandidates,
    degradedFlags,
  };
}
