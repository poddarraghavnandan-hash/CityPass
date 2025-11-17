/**
 * Node: Format Answer
 * Generate final response with reasons and optional AI summary
 */

import type { AgentState } from '../types';

export async function formatNode(state: AgentState): Promise<Partial<AgentState>> {
  if (!state.slates) {
    throw new Error('[format] No slates to format');
  }

  const reasons: string[] = [...(state.reasons || [])];

  // Generate contextual reasons based on intention
  if (state.intention) {
    const { mood, budget, distanceKm } = state.intention.tokens;

    // Mood-based reason
    if (mood) {
      reasons.push(`Curated for ${mood} vibes`);
    }

    // Budget-based reason
    if (budget === 'free') {
      reasons.push('Focused on free and low-cost options');
    } else if (budget === 'splurge') {
      reasons.push('Premium experiences included');
    }

    // Location-based reason
    if (distanceKm && distanceKm <= 3) {
      reasons.push(`Staying within ${distanceKm}km`);
    }

    // Time-based reason
    const { untilMinutes } = state.intention.tokens;
    if (untilMinutes <= 120) {
      reasons.push('Happening very soon');
    } else if (untilMinutes <= 1440) {
      reasons.push('Perfect for today');
    }
  }

  // Add slate-specific insights
  const totalEvents =
    state.slates.best.events.length +
    state.slates.wildcard.events.length +
    state.slates.closeAndEasy.events.length;

  if (state.slates.wildcard.events.length > 0) {
    reasons.push('Wildcard picks for discovery');
  }

  if (state.slates.closeAndEasy.events.length > 0) {
    reasons.push('Easy-access options available');
  }

  // TODO: Generate AI summary using LLM (optional, for chat responses)
  let aiSummary: string | undefined;

  if (state.freeText && !state.degradedFlags?.noLLM) {
    // This would call an LLM to generate a natural language summary
    // For now, generate a simple template-based summary
    aiSummary = generateTemplateSummary(state);
  }

  console.log(
    `✅ [format] Formatted response with ${reasons.length} reasons, ${totalEvents} total events`
  );

  return {
    reasons: reasons.slice(0, 5), // Limit to top 5 reasons
    aiSummary,
  };
}

/**
 * Generate template-based summary
 * TODO: Replace with LLM-generated summary
 */
function generateTemplateSummary(state: AgentState): string {
  const eventCount =
    (state.slates?.best.events.length || 0) +
    (state.slates?.wildcard.events.length || 0) +
    (state.slates?.closeAndEasy.events.length || 0);

  if (eventCount === 0) {
    return "I couldn't find any events matching your request. Try adjusting your filters or expanding your search criteria.";
  }

  const mood = state.intention?.tokens.mood || 'any';
  const city = state.intention?.city || 'your area';

  const templates = [
    `I found ${eventCount} great options for ${mood === 'any' ? 'things to do' : `${mood} vibes`} in ${city}.`,
    `Here are ${eventCount} recommendations tailored to your preferences in ${city}.`,
    `I've curated ${eventCount} events that match what you're looking for in ${city}.`,
  ];

  const randomTemplate = templates[Math.floor(Math.random() * templates.length)];

  return randomTemplate;
}
