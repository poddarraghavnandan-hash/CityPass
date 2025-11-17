/**
 * Node: Critic Check
 * Validate slates and apply quality filters
 */

import type { AgentState } from '../types';

export async function criticNode(state: AgentState): Promise<Partial<AgentState>> {
  if (!state.slates) {
    throw new Error('[critic] No slates to check');
  }

  const warnings: string[] = [...(state.warnings || [])];
  const reasons: string[] = [...(state.reasons || [])];

  // Check 1: Do we have enough recommendations?
  const totalEvents =
    state.slates.best.events.length +
    state.slates.wildcard.events.length +
    state.slates.closeAndEasy.events.length;

  if (totalEvents === 0) {
    warnings.push('No events found matching criteria');
    reasons.push('Try broadening your search or adjusting filters');
  } else if (totalEvents < 5) {
    warnings.push('Limited recommendations available');
    reasons.push('Consider expanding time range or location');
  }

  // Check 2: Are slates diverse enough?
  const bestDiversity = state.slates.best.diversity;
  if (bestDiversity < 0.3 && state.slates.best.events.length >= 5) {
    reasons.push('Added variety picks for more diversity');
  }

  // Check 3: Do we have any degraded flags that affect quality?
  if (state.degradedFlags) {
    if (state.degradedFlags.noQdrant) {
      warnings.push('Vector search unavailable - using keyword search only');
      reasons.push('Recommendations may be less personalized');
    }

    if (state.degradedFlags.noTasteVector && state.userId) {
      reasons.push('Building your taste profile - recommendations will improve over time');
    }

    if (state.degradedFlags.noNeo4j) {
      warnings.push('Social signals unavailable');
    }
  }

  // Check 4: Price and location coverage
  const hasFreeEvents = state.slates.closeAndEasy.events.some(e => e.priceMin === 0);
  const hasNearbyEvents = state.slates.closeAndEasy.events.length > 0;

  if (!hasFreeEvents && state.intention?.tokens.budget === 'free') {
    warnings.push('No free events found - showing low-cost alternatives');
  }

  if (!hasNearbyEvents) {
    reasons.push('All events require some travel');
  }

  // Check 5: Time coverage
  const now = new Date();
  const hasImmediateEvents = state.slates.best.events.some(e => {
    const eventStart = new Date(e.startTime);
    const hoursUntil = (eventStart.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntil <= 4;
  });

  if (state.intention?.tokens.untilMinutes && state.intention.tokens.untilMinutes <= 240 && !hasImmediateEvents) {
    warnings.push('No events starting very soon - showing upcoming options');
  }

  console.log(
    `✅ [critic] Quality check complete: ${totalEvents} events, ${warnings.length} warnings`
  );

  return {
    warnings,
    reasons,
  };
}
