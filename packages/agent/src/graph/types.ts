/**
 * Agent Graph Types
 * Core types for the agentic recommendation pipeline
 */

import type { Intention, IntentionTokens } from '@citypass/types';
import type { RankingFeatures, ScoredEvent } from '@citypass/ranker';
import type { Slate } from '@citypass/slate';

// Re-export types from dependencies for convenience
export type { ScoredEvent, RankingFeatures } from '@citypass/ranker';

// ============================================
// Candidate and Event Types
// ============================================

export interface CandidateEvent {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  venueName: string | null;
  city: string;
  startTime: Date;
  endTime: Date | null;
  priceMin: number | null;
  priceMax: number | null;
  lat: number | null;
  lon: number | null;
  tags: string[];
  imageUrl: string | null;
  bookingUrl: string | null;

  // Retrieval metadata
  source: 'keyword' | 'vector' | 'hybrid';
  score: number; // Retrieval score
}

export interface EnrichedEvent extends CandidateEvent {
  // Context enrichments
  distanceKm: number | null;
  travelTimeMinutes: number | null;

  // Graph signals
  noveltyScore: number; // 0-1, from CAG
  friendInterest: number; // Count of friends interested
  socialHeat: {
    views: number;
    saves: number;
    attends: number;
  };

  // Taste matching
  tasteMatchScore: number; // 0-1, similarity to user taste vector
  embedding: number[] | null; // Event embedding vector
}

// ============================================
// Agent State
// ============================================

export interface AgentState {
  // Request context
  userId?: string;
  anonId?: string;
  sessionId: string;
  traceId: string;

  // Input
  freeText?: string;
  tokens?: Partial<IntentionTokens>;

  // Parsed intention
  intention?: Intention;

  // Retrieved candidates
  candidates?: CandidateEvent[];

  // Enriched candidates
  enrichedCandidates?: EnrichedEvent[];

  // Ranked candidates
  rankedCandidates?: ScoredEvent[];

  // Slates
  slates?: {
    best: Slate;
    wildcard: Slate;
    closeAndEasy: Slate;
  };

  // Policy metadata
  slatePolicy?: {
    name: string;
    wasExploration: boolean;
  };

  // Reasons and explanations
  reasons?: string[];
  aiSummary?: string; // Generated summary (optional)

  // Error handling and degradation
  degradedFlags?: {
    noQdrant?: boolean;
    noNeo4j?: boolean;
    noReranker?: boolean;
    noLLM?: boolean;
    noTasteVector?: boolean;
  };

  // Execution metadata
  errors?: string[];
  warnings?: string[];
}

// ============================================
// Node Execution Log
// ============================================

export interface NodeLog {
  node: string;
  startMs: number;
  endMs: number;
  durationMs: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

// ============================================
// Agent Result
// ============================================

export interface AgentResult {
  state: AgentState;
  logs: NodeLog[];
  totalDurationMs: number;
}

// ============================================
// Trace Metadata
// ============================================

export interface TraceMeta {
  traceId: string;
  userId?: string;
  sessionId: string;
  timestamp: Date;
  modelVersions: {
    ranker?: string;
    tasteVector?: string;
    slatePolicy?: string;
    llm?: string;
  };
}

// ============================================
// Reason Types
// ============================================

export interface Reason {
  eventId: string;
  factor: string;
  contribution: number;
  explanation: string;
}

// ============================================
// Slate Item
// ============================================

export interface SlateItem {
  eventId: string;
  position: number;
  score: number;
  reasons: string[];

  // Event details (for rendering)
  title: string;
  venueName: string | null;
  city: string;
  startTime: string;
  endTime: string | null;
  priceMin: number | null;
  priceMax: number | null;
  imageUrl: string | null;
  bookingUrl: string | null;
  category: string | null;

  // Additional details for rich UI
  description: string | null;
  subtitle: string | null;
  neighborhood: string | null;
  distanceKm: number | null;
}
