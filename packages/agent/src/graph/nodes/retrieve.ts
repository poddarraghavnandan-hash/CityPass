/**
 * Node: Retrieve Candidates
 * Execute hybrid RAG retrieval (keyword + vector)
 */

import { retrieve } from '@citypass/rag';
import type { AgentState, CandidateEvent } from '../types';

export async function retrieveNode(state: AgentState): Promise<Partial<AgentState>> {
  if (!state.intention) {
    throw new Error('[retrieve] No intention set. Run parseIntent first.');
  }

  const queryText = state.freeText || state.intention.tokens.mood;

  try {
    const result = await retrieve(queryText, state.intention, {
      topK: 100,
      rerankTop: 50,
      useReranker: true,
      timeout: 6000,
      cacheKey: state.traceId ? `retrieve:${state.traceId}` : undefined,
    });

    const candidates: CandidateEvent[] = result.candidates.map(c => ({
      id: c.id,
      title: c.title,
      description: c.description,
      category: c.category,
      venueName: c.venueName,
      city: c.city,
      startTime: c.startTime,
      endTime: (c as any).endTime ?? null,
      priceMin: c.priceMin,
      priceMax: c.priceMax,
      lat: c.lat,
      lon: c.lon,
      tags: c.tags || [],
      imageUrl: c.imageUrl,
      bookingUrl: c.bookingUrl,
      source: c.source as any,
      score: c.score,
    }));

    console.log(`✅ [retrieve] Found ${candidates.length} candidates`);

    return {
      candidates,
    };
  } catch (error: any) {
    console.error('[retrieve] Retrieval failed:', error.message);

    return {
      candidates: [],
      degradedFlags: {
        ...(state.degradedFlags || {}),
        noQdrant: error.message.includes('Qdrant') || error.message.includes('vector'),
      },
      errors: [...(state.errors || []), `Retrieval failed: ${error.message}`],
    };
  }
}
