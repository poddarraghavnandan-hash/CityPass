/**
 * LangGraph-style Agent Orchestration
 * State machine for planning event recommendations
 */

import { buildIntention, type IntentionOptions } from '@citypass/utils';
import { retrieve, type RetrievalCandidate } from '@citypass/rag';
import { noveltyForUser, friendOverlap, diversifyByGraph, getSocialHeat } from '@citypass/cag';
import { calculateFitScore, type FitScoreResult } from '@citypass/search';
import type { Intention, IntentionTokens, RankedItem } from '@citypass/types/lens';
import { randomUUID } from 'crypto';

// Agent State
export interface AgentState {
  user?: {
    id: string;
    city?: string;
  };
  freeText?: string;
  tokens?: Partial<IntentionTokens>;
  intention?: Intention;
  retrieved?: RetrievalCandidate[];
  graphSignals?: {
    novelty: Map<string, number>;
    friendCounts: Map<string, number>;
    socialHeat: Map<string, { views: number; saves: number; attends: number }>;
  };
  slates?: {
    best: RankedItem[];
    wildcard: RankedItem[];
    closeAndEasy: RankedItem[];
  };
  reasons?: string[];
  traceId: string;
  errors?: string[];
}

// Node execution log
interface NodeLog {
  node: string;
  startMs: number;
  endMs: number;
  durationMs: number;
  success: boolean;
  error?: string;
}

// Agent result
export interface AgentResult {
  state: AgentState;
  logs: NodeLog[];
  totalDurationMs: number;
}

/**
 * Node: Understand
 * Parse free text and build intention
 */
async function understandNode(state: AgentState): Promise<Partial<AgentState>> {
  const options: IntentionOptions = {
    city: state.user?.city,
    userId: state.user?.id,
    overrides: state.tokens || {},
  };

  const intention = buildIntention(options);

  return {
    intention,
    tokens: intention.tokens,
  };
}

/**
 * Node: Retrieve
 * Execute hybrid RAG retrieval
 */
async function retrieveNode(state: AgentState): Promise<Partial<AgentState>> {
  if (!state.intention) {
    throw new Error('No intention set. Run understand node first.');
  }

  const queryText = state.freeText || state.intention.tokens.mood;

  const result = await retrieve(queryText, state.intention, {
    topK: 100,
    rerankTop: 50,
    useReranker: true,
    timeout: 6000,
    cacheKey: state.traceId ? `retrieve:${state.traceId}` : undefined,
  });

  return {
    retrieved: result.candidates,
  };
}

/**
 * Node: Reason
 * Apply graph-based reasoning (CAG)
 */
async function reasonNode(state: AgentState): Promise<Partial<AgentState>> {
  if (!state.retrieved || state.retrieved.length === 0) {
    return {
      graphSignals: {
        novelty: new Map(),
        friendCounts: new Map(),
        socialHeat: new Map(),
      },
    };
  }

  const eventIds = state.retrieved.map(c => c.id);
  const userId = state.user?.id;

  // Run graph queries in parallel
  const [noveltyScores, friendSignals, socialHeat] = await Promise.all([
    userId ? noveltyForUser(userId, eventIds) : Promise.resolve([]),
    userId ? friendOverlap(userId, eventIds) : Promise.resolve([]),
    getSocialHeat(eventIds, 3), // 3 hours back for social heat
  ]);

  const noveltyMap = new Map(noveltyScores.map(n => [n.eventId, n.novelty]));
  const friendCountMap = new Map(friendSignals.map(f => [f.eventId, f.friendCount]));

  return {
    graphSignals: {
      novelty: noveltyMap,
      friendCounts: friendCountMap,
      socialHeat: new Map(Object.entries(socialHeat)),
    },
  };
}

/**
 * Node: Plan
 * Create 3 slates: Best, Wildcard, Close & Easy
 */
async function planNode(state: AgentState): Promise<Partial<AgentState>> {
  if (!state.retrieved || !state.intention || !state.graphSignals) {
    throw new Error('Missing required state for planning');
  }

  // Calculate fit scores for all candidates
  const scoredCandidates = state.retrieved.map(candidate => {
    const novelty = state.graphSignals!.novelty.get(candidate.id) ?? 0.5;
    const friendCount = state.graphSignals!.friendCounts.get(candidate.id) ?? 0;
    const socialHeat = state.graphSignals!.socialHeat.get(candidate.id) ?? { views: 0, saves: 0, attends: 0 };

    const fitResult = calculateFitScore({
      event: {
        id: candidate.id,
        category: candidate.category,
        startTime: candidate.startTime,
        priceMin: candidate.priceMin,
        priceMax: candidate.priceMax,
        lat: candidate.lat,
        lon: candidate.lon,
        tags: candidate.tags || [],
      },
      intention: state.intention!,
      textualSimilarity: candidate.source === 'keyword' ? candidate.score : 0.5,
      semanticSimilarity: candidate.source === 'vector' ? candidate.score : 0.5,
      distanceKm: candidate.lat && candidate.lon ? calculateDistance(
        state.user?.city || state.intention!.city,
        candidate.lat,
        candidate.lon
      ) : null,
      socialProof: {
        views: socialHeat.views,
        saves: socialHeat.saves,
        friends: friendCount,
      },
    });

    return {
      candidate,
      fitScore: fitResult.score,
      moodScore: fitResult.moodScore,
      socialHeat: fitResult.socialHeat,
      reasons: fitResult.reasons,
      novelty,
    };
  });

  // Sort by fit score
  scoredCandidates.sort((a, b) => b.fitScore - a.fitScore);

  // Slate 1: Best (top fit scores)
  const bestSlate = scoredCandidates.slice(0, 10).map(toRankedItem);

  // Slate 2: Wildcard (high novelty, moderate fit)
  const wildcardCandidates = scoredCandidates
    .filter(c => c.novelty >= 0.7 && c.fitScore >= 0.4)
    .sort((a, b) => b.novelty - a.novelty);
  const wildcardSlate = wildcardCandidates.slice(0, 10).map(toRankedItem);

  // Slate 3: Close & Easy (nearby, low price, high recency)
  const closeAndEasyCandidates = scoredCandidates
    .filter(c => {
      const isAffordable = !c.candidate.priceMin || c.candidate.priceMin <= 30;
      return isAffordable && c.fitScore >= 0.3;
    })
    .sort((a, b) => {
      const aPrice = a.candidate.priceMin ?? 0;
      const bPrice = b.candidate.priceMin ?? 0;
      return aPrice - bPrice; // Cheaper first
    });
  const closeAndEasySlate = closeAndEasyCandidates.slice(0, 10).map(toRankedItem);

  // Collect top reasons
  const allReasons = scoredCandidates
    .slice(0, 10)
    .flatMap(c => c.reasons)
    .reduce((acc, reason) => {
      acc.set(reason, (acc.get(reason) || 0) + 1);
      return acc;
    }, new Map<string, number>());

  const topReasons = Array.from(allReasons.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([reason]) => reason);

  return {
    slates: {
      best: bestSlate,
      wildcard: wildcardSlate,
      closeAndEasy: closeAndEasySlate,
    },
    reasons: topReasons,
  };
}

/**
 * Node: Answer
 * Format final response (no-op for now, slates are the answer)
 */
async function answerNode(state: AgentState): Promise<Partial<AgentState>> {
  // This node could format the response, apply final diversification, etc.
  // For now, we'll just ensure slates are properly set
  return {};
}

/**
 * Convert scored candidate to RankedItem
 */
function toRankedItem(scored: {
  candidate: RetrievalCandidate;
  fitScore: number;
  moodScore: number;
  socialHeat: number;
  reasons: string[];
}): RankedItem {
  const { candidate, fitScore, moodScore, socialHeat, reasons } = scored;

  return {
    id: candidate.id,
    title: candidate.title,
    subtitle: null,
    description: candidate.description,
    category: candidate.category,
    venueName: candidate.venueName,
    neighborhood: null,
    city: candidate.city,
    startTime: candidate.startTime.toISOString(),
    endTime: null,
    priceMin: candidate.priceMin,
    priceMax: candidate.priceMax,
    imageUrl: candidate.imageUrl,
    bookingUrl: candidate.bookingUrl,
    distanceKm: null,
    fitScore,
    moodScore,
    socialHeat,
    sponsored: false,
    reasons,
    socialPreview: null,
    patronLabel: null,
    adDisclosure: null,
  };
}

/**
 * Calculate distance (mock implementation)
 * In production, use actual geocoding
 */
function calculateDistance(city: string, lat: number, lon: number): number {
  // Mock: return random distance 0-10 km
  return Math.random() * 10;
}

/**
 * Execute graph with node logging
 */
export async function executeGraph(initialState: Partial<AgentState>): Promise<AgentResult> {
  const startTime = Date.now();
  const logs: NodeLog[] = [];

  let state: AgentState = {
    traceId: randomUUID(),
    ...initialState,
  };

  const nodes = [
    { name: 'understand', fn: understandNode },
    { name: 'retrieve', fn: retrieveNode },
    { name: 'reason', fn: reasonNode },
    { name: 'plan', fn: planNode },
    { name: 'answer', fn: answerNode },
  ];

  for (const node of nodes) {
    const nodeStartTime = Date.now();

    try {
      const updates = await node.fn(state);
      state = { ...state, ...updates };

      const nodeEndTime = Date.now();
      logs.push({
        node: node.name,
        startMs: nodeStartTime,
        endMs: nodeEndTime,
        durationMs: nodeEndTime - nodeStartTime,
        success: true,
      });

      console.log(`✅ [${state.traceId}] ${node.name}: ${nodeEndTime - nodeStartTime}ms`);
    } catch (error: any) {
      const nodeEndTime = Date.now();
      logs.push({
        node: node.name,
        startMs: nodeStartTime,
        endMs: nodeEndTime,
        durationMs: nodeEndTime - nodeStartTime,
        success: false,
        error: error.message,
      });

      console.error(`❌ [${state.traceId}] ${node.name} failed:`, error.message);

      // Add error to state but continue gracefully
      state.errors = [...(state.errors || []), `${node.name}: ${error.message}`];

      // For critical nodes, stop execution
      if (node.name === 'understand' || node.name === 'retrieve') {
        break;
      }
    }
  }

  const totalDurationMs = Date.now() - startTime;

  console.log(`📊 [${state.traceId}] Total execution: ${totalDurationMs}ms`);

  return {
    state,
    logs,
    totalDurationMs,
  };
}

/**
 * Convenience function: Run full planning pipeline
 */
export async function plan(options: {
  user?: { id: string; city?: string };
  freeText?: string;
  tokens?: Partial<IntentionTokens>;
}): Promise<AgentResult> {
  return executeGraph(options);
}

/**
 * Convenience function: Just understand user intention
 */
export async function understand(options: IntentionOptions): Promise<Intention> {
  const state: AgentState = {
    traceId: randomUUID(),
    user: options.userId ? { id: options.userId, city: options.city } : undefined,
    tokens: options.overrides,
  };

  const result = await understandNode(state);
  if (!result.intention) {
    throw new Error('Failed to build intention');
  }

  return result.intention;
}
