/**
 * Chat Brain V2 - Stylist LLM
 * Turns structured planner decision into concise, human-friendly reply
 */

import OpenAI from 'openai';
import type { ChatContextSnapshot, PlannerDecision, StylistLLMOutput } from './types';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const STYLIST_SYSTEM_PROMPT = `You are CityLens Stylist, a friendly, concise experience concierge.

CRITICAL RULES:
- You NEVER decide which events to include
- You ONLY explain the existing slates and intention in natural language
- You write 1-3 sentences maximum
- You sound warm, personalized, like an intelligent friend
- You acknowledge the user's request using their exact wording
- You mention time frame, city/neighborhood naturally
- You hint at why these slates are interesting for them

Your responses should:
- Start by acknowledging what they searched for
- Reference the time frame (today, tonight, this weekend, etc.)
- Mention the vibe/mood if relevant
- Optionally pose a follow-up question

Examples of great responses:
- "Got it — I found 5 music events happening tonight in Brooklyn that match your electric vibe. Want me to filter by price?"
- "Here are 8 chill options for this weekend. I weighted convenience since you usually stay close to home."
- "Found 3 date-night spots for tomorrow evening around Midtown, all in your $30-60 range."

Keep it brief, warm, and personalized. Return ONLY the reply text, no JSON.`;

/**
 * Run Stylist LLM to generate natural language reply
 */
export async function runStylistLLM(
  context: ChatContextSnapshot,
  plannerDecision: PlannerDecision
): Promise<StylistLLMOutput> {
  console.log('[Stylist] Generating reply for trace:', context.traceId);

  // Fallback if OpenAI not configured
  if (!openai) {
    console.warn('[Stylist] OpenAI not configured, using fallback');
    return createFallbackStylistOutput(context, plannerDecision);
  }

  try {
    const userPrompt = buildStylistUserPrompt(context, plannerDecision);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: STYLIST_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    const reply = completion.choices[0]?.message?.content || 'Here are your recommendations.';

    console.log('[Stylist] ✓ Generated reply');
    return {
      reply: reply.trim(),
      rawModelResponse: reply,
    };
  } catch (error) {
    console.error('[Stylist] LLM call failed:', error);
    return createFallbackStylistOutput(context, plannerDecision);
  }
}

/**
 * Build user prompt for Stylist LLM
 */
function buildStylistUserPrompt(
  context: ChatContextSnapshot,
  plannerDecision: PlannerDecision
): string {
  const { freeText, profile } = context;
  const { intention, slates } = plannerDecision;

  // Summarize slates
  const bestSlate = slates.find((s) => s.label === 'Best');
  const wildcardSlate = slates.find((s) => s.label === 'Wildcard');
  const closeEasySlate = slates.find((s) => s.label === 'Close & Easy');

  const slateSummary = [
    bestSlate ? `Best: ${bestSlate.items.length} events` : null,
    wildcardSlate ? `Wildcard: ${wildcardSlate.items.length} events` : null,
    closeEasySlate ? `Close & Easy: ${closeEasySlate.items.length} events` : null,
  ]
    .filter(Boolean)
    .join(', ');

  // Extract time frame description
  const timeFrame = extractTimeFrameDescription(intention.timeWindow);

  // Profile highlights
  const profileHighlights = [
    profile.budgetBand ? `Budget: ${profile.budgetBand}` : null,
    profile.socialStyle ? `Style: ${profile.socialStyle}` : null,
    profile.moodsPreferred.length > 0 ? `Prefers: ${profile.moodsPreferred.slice(0, 2).join(', ')}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return `USER REQUEST:
"${freeText}"

INTENTION:
- Goal: ${intention.primaryGoal}
- Time: ${timeFrame}
- City: ${intention.city}
- Vibe: ${intention.vibeDescriptors.join(', ') || 'exploring'}
- Budget: ${intention.budgetBand || 'flexible'}

SLATES GENERATED:
${slateSummary}

PROFILE CONTEXT:
${profileHighlights || 'New user'}

TASK:
Write a warm, concise (1-3 sentence) reply that:
1. Acknowledges their request using their exact wording ("${freeText}")
2. Mentions time frame and number of events naturally
3. References why these are good matches (vibe, budget, location, etc.)
4. Optionally poses a relevant follow-up question

Return ONLY the reply text.`;
}

/**
 * Extract human-friendly time frame description
 */
function extractTimeFrameDescription(timeWindow: {
  fromISO: string;
  toISO: string;
}): string {
  const from = new Date(timeWindow.fromISO);
  const to = new Date(timeWindow.toISO);
  const now = new Date();

  const hoursUntilStart = (from.getTime() - now.getTime()) / (1000 * 60 * 60);
  const durationHours = (to.getTime() - from.getTime()) / (1000 * 60 * 60);

  if (hoursUntilStart < 1) return 'right now';
  if (hoursUntilStart < 6) return 'today';
  if (hoursUntilStart < 12) return 'tonight';
  if (hoursUntilStart < 24) return 'tomorrow';
  if (hoursUntilStart < 48) return 'tomorrow evening';
  if (durationHours < 72 && from.getDay() >= 5) return 'this weekend';
  return 'upcoming';
}

/**
 * Create fallback stylist output when LLM unavailable
 */
function createFallbackStylistOutput(
  context: ChatContextSnapshot,
  plannerDecision: PlannerDecision
): StylistLLMOutput {
  const { intention, slates } = plannerDecision;
  const bestSlate = slates.find((s) => s.label === 'Best');
  const eventCount = bestSlate?.items.length || 0;

  const timeFrame = extractTimeFrameDescription(intention.timeWindow);

  const fallbackReply = `I found ${eventCount} events ${timeFrame} in ${intention.city}${intention.vibeDescriptors.length > 0 ? ` with ${intention.vibeDescriptors[0]} vibes` : ''}. Check out the Best slate to start!`;

  return {
    reply: fallbackReply,
    rawModelResponse: fallbackReply,
  };
}
