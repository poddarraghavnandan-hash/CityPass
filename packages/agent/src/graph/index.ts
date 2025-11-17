/**
 * Agent Graph Orchestrator
 * Wires together the full agentic pipeline
 */

import { parseIntentNode } from './nodes/parseIntent';
import { retrieveNode } from './nodes/retrieve';
import { enrichNode } from './nodes/enrich';
import { rankNode } from './nodes/rank';
import { composeNode } from './nodes/compose';
import { criticNode } from './nodes/critic';
import { formatNode } from './nodes/format';
import { logNode } from './nodes/log';

import type { AgentState, AgentResult, NodeLog } from './types';

// Export types
export * from './types';

// ============================================
// Graph Execution
// ============================================

/**
 * Execute the full agent pipeline
 * Runs each node in sequence, accumulating state
 */
export async function executeAgentGraph(
  initialState: Partial<AgentState>
): Promise<AgentResult> {
  const startTime = Date.now();
  const logs: NodeLog[] = [];

  // Initialize state with required fields
  let state: AgentState = {
    sessionId: initialState.sessionId || `session_${Date.now()}`,
    traceId: initialState.traceId || `trace_${Date.now()}`,
    userId: initialState.userId,
    anonId: initialState.anonId,
    freeText: initialState.freeText,
    tokens: initialState.tokens,
    intention: initialState.intention,
    degradedFlags: {},
    errors: [],
    warnings: [],
    reasons: [],
  };

  // Define pipeline nodes
  const pipeline: Array<{
    name: string;
    node: (state: AgentState) => Promise<Partial<AgentState>>;
    required: boolean;
  }> = [
    { name: 'parseIntent', node: parseIntentNode, required: true },
    { name: 'retrieve', node: retrieveNode, required: true },
    { name: 'enrich', node: enrichNode, required: false },
    { name: 'rank', node: rankNode, required: true },
    { name: 'compose', node: composeNode, required: true },
    { name: 'critic', node: criticNode, required: false },
    { name: 'format', node: formatNode, required: false },
    { name: 'log', node: logNode, required: false },
  ];

  // Execute each node
  for (const { name, node, required } of pipeline) {
    const nodeStart = Date.now();
    let success = true;
    let error: string | undefined;

    try {
      console.log(`🔄 [Graph] Executing node: ${name}`);

      const updates = await node(state);

      // Merge updates into state
      state = {
        ...state,
        ...updates,
        degradedFlags: {
          ...state.degradedFlags,
          ...(updates.degradedFlags || {}),
        },
        errors: updates.errors || state.errors,
        warnings: updates.warnings || state.warnings,
        reasons: updates.reasons || state.reasons,
      };
    } catch (err: any) {
      success = false;
      error = err.message || String(err);

      console.error(`❌ [Graph] Node ${name} failed:`, error);

      if (required) {
        // Abort execution if required node fails
        (state.errors || (state.errors = [])).push(`Critical failure in ${name}: ${error}`);

        logs.push({
          node: name,
          startMs: nodeStart,
          endMs: Date.now(),
          durationMs: Date.now() - nodeStart,
          success: false,
          error,
        });

        break;
      } else {
        // Continue execution if optional node fails
        (state.warnings || (state.warnings = [])).push(`${name} failed: ${error}`);
      }
    }

    const nodeEnd = Date.now();

    logs.push({
      node: name,
      startMs: nodeStart,
      endMs: nodeEnd,
      durationMs: nodeEnd - nodeStart,
      success,
      error,
    });
  }

  const totalDurationMs = Date.now() - startTime;

  console.log(
    `✅ [Graph] Pipeline complete in ${totalDurationMs}ms`,
    `(${logs.filter(l => l.success).length}/${logs.length} nodes succeeded)`
  );

  return {
    state,
    logs,
    totalDurationMs,
  };
}

// ============================================
// Convenience Functions
// ============================================

/**
 * Execute graph with free text query
 */
export async function askAgent(params: {
  freeText: string;
  userId?: string;
  sessionId?: string;
  traceId?: string;
  city?: string;
}): Promise<AgentResult> {
  return executeAgentGraph({
    freeText: params.freeText,
    userId: params.userId,
    sessionId: params.sessionId || `session_${Date.now()}`,
    traceId: params.traceId || `trace_${Date.now()}`,
    anonId: params.userId ? undefined : `anon_${Date.now()}`,
    intention: params.city
      ? {
          city: params.city,
          nowISO: new Date().toISOString(),
          tokens: {} as any,
          source: 'inferred' as const,
        }
      : undefined,
  });
}

/**
 * Execute graph with structured tokens
 */
export async function planAgent(params: {
  tokens: Partial<any>;
  userId?: string;
  sessionId?: string;
  traceId?: string;
  city: string;
}): Promise<AgentResult> {
  return executeAgentGraph({
    tokens: params.tokens,
    userId: params.userId,
    sessionId: params.sessionId || `session_${Date.now()}`,
    traceId: params.traceId || `trace_${Date.now()}`,
    anonId: params.userId ? undefined : `anon_${Date.now()}`,
    intention: {
      city: params.city,
      nowISO: new Date().toISOString(),
      tokens: params.tokens as any,
      source: 'inferred' as const,
    },
  });
}

/**
 * Get execution metrics from result
 */
export function getExecutionMetrics(result: AgentResult): {
  totalMs: number;
  nodeMetrics: Record<string, number>;
  successRate: number;
} {
  const nodeMetrics: Record<string, number> = {};

  for (const log of result.logs) {
    nodeMetrics[log.node] = log.durationMs;
  }

  const successfulNodes = result.logs.filter(l => l.success).length;
  const successRate = result.logs.length > 0 ? successfulNodes / result.logs.length : 0;

  return {
    totalMs: result.totalDurationMs,
    nodeMetrics,
    successRate,
  };
}
