/**
 * @citypass/chat - Chat Brain V2
 * Multi-layer, learning-aware chat system
 */

// Main orchestrator
export { runChatTurn, getChatHistory } from './orchestrator';

// Context assembly
export { buildChatContextSnapshot } from './contextAssembler';

// LLM agents
export { runAnalystLLM } from './analyst';
export { runStylistLLM } from './stylist';

// Deterministic planner
export { runPlanner } from './planner';

// Event discovery and scoring
export { discoverEventsWithLLM, convertDiscoveredToCandidateEvents, type DiscoveredEvent } from './eventDiscoverer';
export { scoreEventMatch, scoreEventBatch, sortByMatchScore, type EventScore } from './matchScorer';
export { getPopularEventsForColdStart, isUserInColdStart, type ColdStartOptions } from './coldStartStrategy';

// Types
export * from './types';
