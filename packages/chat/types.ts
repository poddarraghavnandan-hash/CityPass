/**
 * Chat Brain V2 - Domain Types
 * Multi-layer, learning-aware chat system
 */

import { z } from 'zod';

// ============================================================================
// CHAT CONTEXT SNAPSHOT
// ============================================================================

export const BudgetBandSchema = z.enum(['FREE', 'LOW', 'MID', 'HIGH', 'LUXE']);
export type BudgetBand = z.infer<typeof BudgetBandSchema>;

export const ExplorationLevelSchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);
export type ExplorationLevel = z.infer<typeof ExplorationLevelSchema>;

export const SocialStyleSchema = z.enum(['SOLO', 'WITH_FRIENDS', 'DATE', 'FAMILY']);
export type SocialStyle = z.infer<typeof SocialStyleSchema>;

export const PriceBandSchema = z.enum(['FREE', 'LOW', 'MID', 'HIGH', 'LUXE']);
export type PriceBand = z.infer<typeof PriceBandSchema>;

export const ProfileSchema = z.object({
  moodsPreferred: z.array(z.string()),
  dislikes: z.array(z.string()).optional(),
  budgetBand: BudgetBandSchema.nullable().optional(),
  maxTravelMinutes: z.number().nullable().optional(),
  scheduleBias: z.string().nullable().optional(),
  socialStyle: SocialStyleSchema.nullable().optional(),
  tasteVectorId: z.string().nullable().optional(),
});
export type Profile = z.infer<typeof ProfileSchema>;

export const LearnerStateSchema = z.object({
  explorationLevel: ExplorationLevelSchema,
  noveltyTarget: z.number().min(0).max(1).nullable().optional(),
  banditPolicyName: z.string().nullable().optional(),
});
export type LearnerState = z.infer<typeof LearnerStateSchema>;

export const CandidateEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  startISO: z.string(),
  endISO: z.string().optional(),
  neighborhood: z.string().nullable().optional(),
  distanceMin: z.number().nullable().optional(),
  priceBand: PriceBandSchema.nullable().optional(),
  categories: z.array(z.string()),
  moods: z.array(z.string()),
  venueName: z.string().nullable().optional(),
  socialHeatScore: z.number().nullable().optional(),
  noveltyScore: z.number().nullable().optional(),
  fitScore: z.number().nullable().optional(),
});
export type CandidateEvent = z.infer<typeof CandidateEventSchema>;

export const ChatContextSnapshotSchema = z.object({
  userId: z.string().optional(),
  anonId: z.string().optional(),
  sessionId: z.string(),
  freeText: z.string(),
  nowISO: z.string(),
  city: z.string(),
  locationApprox: z.object({ lat: z.number(), lon: z.number() }).nullable().optional(),

  profile: ProfileSchema,
  learnerState: LearnerStateSchema,

  chatHistorySummary: z.string(),
  recentPicksSummary: z.string(),

  searchWindow: z.object({
    fromISO: z.string(),
    toISO: z.string(),
  }),

  candidateEvents: z.array(CandidateEventSchema),
  traceId: z.string(),
});
export type ChatContextSnapshot = z.infer<typeof ChatContextSnapshotSchema>;

// ============================================================================
// INTENTION V2
// ============================================================================

export const ExertionLevelSchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);
export type ExertionLevel = z.infer<typeof ExertionLevelSchema>;

export const IntentionV2Schema = z.object({
  primaryGoal: z.string(),
  timeWindow: z.object({
    fromISO: z.string(),
    toISO: z.string(),
  }),
  city: z.string(),
  neighborhoodPreference: z.string().nullable().optional(),
  exertionLevel: ExertionLevelSchema.nullable().optional(),
  socialContext: SocialStyleSchema.nullable().optional(),
  budgetBand: BudgetBandSchema.nullable().optional(),
  vibeDescriptors: z.array(z.string()),
  constraints: z.array(z.string()),
  notes: z.string(),
});
export type IntentionV2 = z.infer<typeof IntentionV2Schema>;

// ============================================================================
// EXPLORATION PLAN
// ============================================================================

export const ExplorationPlanSchema = z.object({
  explorationLevel: ExplorationLevelSchema,
  noveltyTarget: z.number().min(0).max(1),
  allowWildcardSlate: z.boolean(),
});
export type ExplorationPlan = z.infer<typeof ExplorationPlanSchema>;

// ============================================================================
// SLATE DECISIONS
// ============================================================================

export const SlateLabelSchema = z.enum(['Best', 'Wildcard', 'Close & Easy']);
export type SlateLabel = z.infer<typeof SlateLabelSchema>;

export const SlateItemDecisionSchema = z.object({
  eventId: z.string(),
  priority: z.number(),
  reasons: z.array(z.string()),
  factorScores: z.record(z.string(), z.number()).optional(),
});
export type SlateItemDecision = z.infer<typeof SlateItemDecisionSchema>;

export const SlateDecisionSchema = z.object({
  label: SlateLabelSchema,
  items: z.array(SlateItemDecisionSchema),
});
export type SlateDecision = z.infer<typeof SlateDecisionSchema>;

// ============================================================================
// PLANNER DECISION
// ============================================================================

export const PlannerDecisionSchema = z.object({
  intention: IntentionV2Schema,
  slates: z.array(SlateDecisionSchema),
  meta: z.object({
    traceId: z.string(),
    banditPolicyName: z.string().nullable().optional(),
    usedProfile: z.boolean(),
    usedLearnerState: z.boolean(),
  }),
});
export type PlannerDecision = z.infer<typeof PlannerDecisionSchema>;

// ============================================================================
// ANALYST OUTPUT
// ============================================================================

export const AnalystOutputSchema = z.object({
  intention: IntentionV2Schema,
  explorationPlan: ExplorationPlanSchema,
  softOverrides: z.array(z.string()),
});
export type AnalystOutput = z.infer<typeof AnalystOutputSchema>;

// ============================================================================
// CHAT TURN RECORD
// ============================================================================

export const ChatTurnRecordSchema = z.object({
  contextSnapshot: ChatContextSnapshotSchema,
  analystOutput: AnalystOutputSchema,
  plannerDecision: PlannerDecisionSchema,
  stylistReply: z.string(),
  createdAt: z.string(),
});
export type ChatTurnRecord = z.infer<typeof ChatTurnRecordSchema>;

// ============================================================================
// API TYPES
// ============================================================================

export interface BuildContextInput {
  userId?: string;
  anonId?: string;
  freeText: string;
  cityHint?: string;
  threadId?: string;
}

export interface RunChatTurnInput {
  userId?: string;
  anonId?: string;
  freeText: string;
  cityHint?: string;
  threadId?: string;
}

export interface RunChatTurnOutput {
  threadId: string;
  plannerDecision: PlannerDecision;
  reply: string;
  context: ChatContextSnapshot;
}

export interface AnalystLLMOutput {
  intention: IntentionV2;
  explorationPlan: ExplorationPlan;
  softOverrides: string[];
  rawModelResponse: string;
}

export interface StylistLLMOutput {
  reply: string;
  rawModelResponse: string;
}
