/**
 * Chat Brain V2 - Analyst LLM
 * Interprets ChatContextSnapshot into IntentionV2 + ExplorationPlan
 */

import OpenAI from 'openai';
import {
  ChatContextSnapshot,
  AnalystLLMOutput,
  IntentionV2Schema,
  IntentionV2,
  ExplorationPlanSchema,
  ExplorationPlan,
  AnalystOutputSchema,
} from './types';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const ANALYST_SYSTEM_PROMPT = `You are CityLens Analyst, an expert at interpreting user intentions for event discovery.

CRITICAL RULES:
- You do NOT invent events or call tools
- You ONLY interpret the provided context into structured intention + exploration plan
- You consider user profile preferences and learner state exploration level
- You output STRICT JSON matching the schema exactly

Your role:
1. Analyze FREE_TEXT + PROFILE + LEARNER_STATE + HISTORY + CANDIDATE_EVENTS
2. Extract primary goal, time window, location preferences, social context, budget, vibe
3. Identify constraints and special requirements
4. Determine exploration level (how adventurous vs safe the user seems)
5. Output structured JSON with intention, explorationPlan, and softOverrides

Output format (strict JSON):
{
  "intention": {
    "primaryGoal": "concise user goal",
    "timeWindow": { "fromISO": "...", "toISO": "..." },
    "city": "...",
    "neighborhoodPreference": "..." | null,
    "exertionLevel": "LOW" | "MEDIUM" | "HIGH" | null,
    "socialContext": "SOLO" | "WITH_FRIENDS" | "DATE" | "FAMILY" | null,
    "budgetBand": "FREE" | "LOW" | "MID" | "HIGH" | "LUXE" | null,
    "vibeDescriptors": ["...", "..."],
    "constraints": ["...", "..."],
    "notes": "any additional context"
  },
  "explorationPlan": {
    "explorationLevel": "LOW" | "MEDIUM" | "HIGH",
    "noveltyTarget": 0.0-1.0,
    "allowWildcardSlate": true | false
  },
  "softOverrides": ["human-readable note 1", "..."]
}`;

/**
 * Run Analyst LLM to interpret context into intention + exploration plan
 */
export async function runAnalystLLM(
  context: ChatContextSnapshot
): Promise<AnalystLLMOutput> {
  console.log('[Analyst] Interpreting context for trace:', context.traceId);

  // Fallback if OpenAI not configured
  if (!openai) {
    console.warn('[Analyst] OpenAI not configured, using fallback');
    return createFallbackAnalystOutput(context);
  }

  try {
    const userPrompt = buildAnalystUserPrompt(context);

    // LOG FULL PROMPT
    console.log('\n=== [Analyst] SYSTEM PROMPT ===');
    console.log(ANALYST_SYSTEM_PROMPT);
    console.log('\n=== [Analyst] USER PROMPT ===');
    console.log(userPrompt);
    console.log('=== END PROMPTS ===\n');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: ANALYST_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1200, // Increased from 800 for better reasoning
      response_format: { type: 'json_object' },
    });

    const rawResponse = completion.choices[0]?.message?.content || '{}';

    // LOG RESPONSE
    console.log('\n=== [Analyst] MODEL RESPONSE ===');
    console.log(rawResponse);
    console.log('=== END RESPONSE ===\n');

    const parsed = JSON.parse(rawResponse);

    // Validate with Zod
    const validated = AnalystOutputSchema.parse(parsed);

    console.log('[Analyst] ✓ Successfully parsed intention');
    return {
      ...validated,
      rawModelResponse: rawResponse,
    };
  } catch (error) {
    console.error('[Analyst] LLM call failed:', error);
    return createFallbackAnalystOutput(context);
  }
}

/**
 * Build user prompt for Analyst LLM
 */
function buildAnalystUserPrompt(context: ChatContextSnapshot): string {
  const {
    freeText,
    profile,
    learnerState,
    chatHistorySummary,
    recentPicksSummary,
    candidateEvents,
    searchWindow,
    city,
    nowISO,
  } = context;

  // Summarize candidate events with statistics instead of full list (reduces LLM context)
  const categoryBreakdown = candidateEvents.reduce((acc, ev) => {
    const cat = ev.categories[0] || 'Other';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const priceBreakdown = candidateEvents.reduce((acc, ev) => {
    const band = ev.priceBand || 'Free';
    acc[band] = (acc[band] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const eventsSummary = `Total: ${candidateEvents.length} events
Categories: ${Object.entries(categoryBreakdown).map(([cat, count]) => `${cat}(${count})`).join(', ')}
Price bands: ${Object.entries(priceBreakdown).map(([band, count]) => `${band}(${count})`).join(', ')}
Time range: ${searchWindow.fromISO.slice(0, 16)} to ${searchWindow.toISO.slice(0, 16)}
City: ${city}`;

  return `USER REQUEST:
"${freeText}"

CURRENT TIME:
${nowISO}

USER PROFILE:
- Preferred moods: ${profile.moodsPreferred.join(', ') || 'none'}
- Dislikes: ${profile.dislikes?.join(', ') || 'none'}
- Budget preference: ${profile.budgetBand || 'not specified'}
- Max travel time: ${profile.maxTravelMinutes ? `${profile.maxTravelMinutes} min` : 'flexible'}
- Social style: ${profile.socialStyle || 'not specified'}
- Schedule bias: ${profile.scheduleBias || 'none'}

LEARNER STATE:
- Exploration level: ${learnerState.explorationLevel}
- Novelty target: ${learnerState.noveltyTarget}
- Active policy: ${learnerState.banditPolicyName}

CHAT HISTORY:
${chatHistorySummary}

RECENT INTERACTIONS:
${recentPicksSummary}

CANDIDATE EVENTS (${candidateEvents.length} found in ${city}, ${searchWindow.fromISO.slice(0, 16)} to ${searchWindow.toISO.slice(0, 16)}):
${eventsSummary || 'No events found in this window'}

TASK:
Interpret this context and return a structured JSON with:
1. intention: primary goal, time window, preferences, constraints
2. explorationPlan: how adventurous to be with recommendations
3. softOverrides: any human-readable notes for the planner

Remember: Return ONLY valid JSON, no extra text.`;
}

/**
 * Create fallback analyst output when LLM unavailable
 */
function createFallbackAnalystOutput(
  context: ChatContextSnapshot
): AnalystLLMOutput {
  const { freeText, searchWindow, city, profile, learnerState } = context;

  // Simple heuristic intention
  const intention: IntentionV2 = {
    primaryGoal: freeText,
    timeWindow: searchWindow,
    city,
    neighborhoodPreference: null,
    exertionLevel: null,
    socialContext: profile.socialStyle as any,
    budgetBand: profile.budgetBand as any,
    vibeDescriptors: profile.moodsPreferred.slice(0, 3),
    constraints: [],
    notes: 'Fallback intention (LLM unavailable)',
  };

  const explorationPlan: ExplorationPlan = {
    explorationLevel: learnerState.explorationLevel,
    noveltyTarget: learnerState.noveltyTarget || 0.3,
    allowWildcardSlate: learnerState.explorationLevel !== 'LOW',
  };

  return {
    intention: intention as any,
    explorationPlan: explorationPlan as any,
    softOverrides: ['Using fallback mode - LLM unavailable'],
    rawModelResponse: JSON.stringify({ intention, explorationPlan }),
  };
}
