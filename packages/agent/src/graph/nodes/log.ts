/**
 * Node: Log Outcome
 * Persist interaction data to event log for learning
 */

import { logEvent } from '@citypass/db/logging';
import type { AgentState } from '../types';

export async function logNode(state: AgentState): Promise<Partial<AgentState>> {
  try {
    // Log the query event
    await logEvent(
      'QUERY',
      {
        freeText: state.freeText,
        intention: state.intention,
        candidateCount: state.candidates?.length || 0,
        rankedCount: state.rankedCandidates?.length || 0,
        slatePolicy: state.slatePolicy,
        degradedFlags: state.degradedFlags,
        warnings: state.warnings,
      },
      {
        userId: state.userId,
        anonId: state.anonId,
        sessionId: state.sessionId,
        traceId: state.traceId,
      }
    );

    // Log slate impressions
    if (state.slates) {
      for (const [slateName, slate] of Object.entries(state.slates)) {
        if (slate.events.length > 0) {
          await logEvent(
            'SLATE_IMPRESSION',
            {
              slateName,
              slateLabel: slate.label,
              strategy: slate.strategy,
              diversity: slate.diversity,
              eventIds: slate.events.map(e => e.eventId),
              eventScores: slate.events.map(e => e.score),
              eventPositions: slate.events.map(e => e.position),
              slatePolicy: state.slatePolicy,
            },
            {
              userId: state.userId,
              anonId: state.anonId,
              sessionId: state.sessionId,
              traceId: state.traceId,
            }
          );
        }
      }
    }

    console.log(`✅ [log] Logged query and ${Object.keys(state.slates || {}).length} slate impressions`);

    return {};
  } catch (error: any) {
    console.error('[log] Failed to log outcome:', error.message);

    // Don't fail the request if logging fails
    return {
      warnings: [...(state.warnings || []), 'Failed to log interaction'],
    };
  }
}
