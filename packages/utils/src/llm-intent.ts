/**
 * LLM-based Intent Extraction
 * Uses Claude/OpenAI to extract structured intent from free text
 * Falls back to pattern-based extraction on failure
 */

import type { IntentionTokens } from '@citypass/types';
import { extractIntentTokens, mapToIntentionTokens } from './intent';

// LLM client detection
const hasOpenAI = typeof process !== 'undefined' && Boolean(process.env.OPENAI_API_KEY);
const hasAnthropic = typeof process !== 'undefined' && Boolean(process.env.ANTHROPIC_API_KEY);
const hasOllama = typeof process !== 'undefined' && process.env.USE_OLLAMA !== 'false'; // Default to true for free local LLM

let openai: any = null;
let anthropic: any = null;
let ollama: any = null;

// Lazy load clients
async function getOpenAI() {
  if (!openai && hasOpenAI) {
    const { OpenAI } = await import('openai');
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

async function getAnthropic() {
  if (!anthropic && hasAnthropic) {
    const { Anthropic } = await import('@anthropic-ai/sdk');
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropic;
}

async function getOllama() {
  if (!ollama && hasOllama) {
    const { Ollama } = await import('ollama');
    ollama = new Ollama({
      host: process.env.OLLAMA_HOST || 'http://localhost:11434'
    });
  }
  return ollama;
}

/**
 * System prompt for intent extraction
 */
const SYSTEM_PROMPT = `You are an expert at understanding natural language queries about events and activities.

Extract structured intent from the user's free text query. Return ONLY valid JSON matching this schema:

{
  "timeWindow": {
    "untilMinutes": number,  // Minutes from now until search window ends
    "humanReadable": string  // e.g., "tonight", "this weekend", "next Tuesday at 7pm"
  },
  "location": {
    "query": string,        // Location name
    "district": string      // Neighborhood/district if mentioned
  },
  "exertion": "low" | "moderate" | "high",  // Physical intensity
  "vibe": "calm" | "social" | "electric" | "artistic" | "grounded",  // Mood/atmosphere
  "companions": string[],   // One or more: "solo", "friends", "date", "family", "coworkers"
  "budget": "free" | "casual" | "splurge",  // Price tier
  "travelMode": "walk" | "bike" | "transit" | "drive"  // Preferred transportation
}

Rules:
1. Only include fields that are EXPLICITLY mentioned or strongly implied
2. For timeWindow: "tonight" = 360 min (6pm-midnight), "this weekend" = 4320 min (72h), "tomorrow" = 1440 min (24h)
3. For exertion: "strenuous/intense/athletic" = high, "active/exercise/dance" = moderate, "relaxing/calm/seated" = low
4. For vibe: match to mood categories based on context
5. For budget: "free" = $0, "under $X" or "affordable" = casual, "splurge/fancy/upscale" = splurge
6. Return empty object {} if no clear intent can be extracted

Examples:

Input: "looking for electric music events tonight near Brooklyn with friends under $30"
Output: {
  "timeWindow": {"untilMinutes": 360, "humanReadable": "tonight"},
  "location": {"query": "brooklyn", "district": "Brooklyn"},
  "vibe": "electric",
  "companions": ["friends"],
  "budget": "casual"
}

Input: "relaxing yoga class tomorrow morning"
Output: {
  "timeWindow": {"untilMinutes": 720, "humanReadable": "tomorrow morning"},
  "exertion": "moderate",
  "vibe": "calm"
}

Input: "date night this weekend, fancy restaurant"
Output: {
  "timeWindow": {"untilMinutes": 4320, "humanReadable": "this weekend"},
  "companions": ["date"],
  "budget": "splurge"
}`;

/**
 * Extract intent using LLM
 */
export async function extractIntentWithLLM(
  freeText: string,
  options: {
    model?: 'claude' | 'gpt' | 'ollama' | 'auto';
    maxTokens?: number;
    temperature?: number;
  } = {}
): Promise<Partial<IntentionTokens> | null> {
  const { model = 'auto', maxTokens = 300, temperature = 0.1 } = options;

  try {
    // Determine which model to use
    // Priority: Claude/OpenAI (fast, reliable) → Ollama (free backup) → null
    let useModel: 'claude' | 'gpt' | 'ollama' | null;
    if (model === 'auto') {
      // Try cloud APIs first (faster, more reliable), then Ollama as free backup
      useModel = hasAnthropic ? 'claude' : hasOpenAI ? 'gpt' : hasOllama ? 'ollama' : null;
    } else {
      useModel = model;
    }

    if (!useModel) {
      console.warn('⚠️ No LLM configured, falling back to pattern extraction');
      return null;
    }

    let extractedJSON: string;

    // Call appropriate LLM
    if (useModel === 'claude') {
      const client = await getAnthropic();
      if (!client) return null;

      const response = await client.messages.create({
        model: 'claude-3-haiku-20240307', // Fast + cheap
        max_tokens: maxTokens,
        temperature,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Extract intent from this query:\n\n"${freeText}"`,
          },
        ],
      });

      extractedJSON = response.content[0].text;
    } else if (useModel === 'gpt') {
      // GPT
      const client = await getOpenAI();
      if (!client) return null;

      const response = await client.chat.completions.create({
        model: 'gpt-3.5-turbo', // Fast + cheap
        max_tokens: maxTokens,
        temperature,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Extract intent from this query:\n\n"${freeText}"`,
          },
        ],
      });

      extractedJSON = response.choices[0].message.content || '{}';
    } else {
      // Ollama (free local LLM)
      const client = await getOllama();
      if (!client) return null;

      // Use smaller/faster model for intent extraction (default: qwen2.5:7b)
      // For planning/reasoning, use OLLAMA_PLANNING_MODEL (qwen2.5:72b or llama3:70b)
      const intentModel = process.env.OLLAMA_INTENT_MODEL || process.env.OLLAMA_MODEL || 'qwen2.5:7b';

      const response = await client.chat({
        model: intentModel,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Extract intent from this query:\n\n"${freeText}"`,
          },
        ],
        format: 'json', // Structured JSON output
        options: {
          temperature,
          num_predict: maxTokens,
        },
      });

      extractedJSON = response.message.content;
    }

    // Parse JSON response
    const cleaned = extractedJSON.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
    const extracted = JSON.parse(cleaned);

    // Convert to IntentionTokens format
    const mapped: Partial<IntentionTokens> = {};

    if (extracted.timeWindow?.untilMinutes) {
      mapped.untilMinutes = extracted.timeWindow.untilMinutes;
    }

    if (extracted.vibe) {
      mapped.mood = extracted.vibe as IntentionTokens['mood'];
    }

    if (extracted.companions) {
      mapped.companions = extracted.companions as IntentionTokens['companions'];
    }

    if (extracted.budget) {
      mapped.budget = extracted.budget as IntentionTokens['budget'];
    }

    if (extracted.travelMode) {
      const distanceMap: Record<string, number> = {
        walk: 2,
        bike: 5,
        transit: 10,
        drive: 20,
      };
      mapped.distanceKm = distanceMap[extracted.travelMode];
    }

    return mapped;
  } catch (error: any) {
    console.error('❌ LLM intent extraction failed:', error.message);
    return null;
  }
}

/**
 * Extract intent with fallback chain: LLM → Pattern → Defaults
 */
export async function extractIntentWithFallback(
  freeText: string,
  options: {
    useLLM?: boolean;
    llmModel?: 'claude' | 'gpt' | 'ollama' | 'auto';
    baseTokens?: Partial<IntentionTokens>;
  } = {}
): Promise<{
  tokens: Partial<IntentionTokens>;
  method: 'llm' | 'pattern' | 'defaults';
  metadata?: {
    llmModel?: string;
    patternMatches?: string[];
  };
}> {
  const { useLLM = true, llmModel = 'auto', baseTokens = {} } = options;

  // Try LLM first if enabled
  if (useLLM) {
    try {
      const llmTokens = await extractIntentWithLLM(freeText, { model: llmModel });

      if (llmTokens && Object.keys(llmTokens).length > 0) {
        return {
          tokens: { ...baseTokens, ...llmTokens },
          method: 'llm',
          metadata: { llmModel },
        };
      }
    } catch (error: any) {
      console.warn('⚠️ LLM extraction failed, falling back to patterns:', error.message);
    }
  }

  // Fallback to pattern-based extraction
  try {
    const extracted = extractIntentTokens(freeText);
    const mapped = mapToIntentionTokens(extracted, baseTokens);

    if (Object.keys(mapped).length > Object.keys(baseTokens).length) {
      return {
        tokens: mapped,
        method: 'pattern',
        metadata: {
          patternMatches: Object.keys(extracted),
        },
      };
    }
  } catch (error: any) {
    console.warn('⚠️ Pattern extraction failed, using defaults:', error.message);
  }

  // Final fallback: just return base tokens
  return {
    tokens: baseTokens,
    method: 'defaults',
  };
}

/**
 * Generate planning/reasoning response using larger Ollama model
 * Uses Qwen2.5:72b or LLaMA-3:70b for high-quality reasoning
 */
export async function generatePlanningWithOllama(
  systemPrompt: string,
  userPrompt: string,
  options: {
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<string | null> {
  const { temperature = 0.3, maxTokens = 1000 } = options;

  try {
    if (!hasOllama) {
      console.warn('⚠️ Ollama not available for planning');
      return null;
    }

    const client = await getOllama();
    if (!client) return null;

    // Use larger model for planning/reasoning (default: qwen2.5:72b)
    const planningModel = process.env.OLLAMA_PLANNING_MODEL || 'qwen2.5:72b';

    console.log(`🧠 Planning with Ollama model: ${planningModel}`);

    const response = await client.chat({
      model: planningModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      options: {
        temperature,
        num_predict: maxTokens,
      },
    });

    return response.message.content;
  } catch (error: any) {
    console.error('❌ Ollama planning failed:', error.message);
    return null;
  }
}

/**
 * Cost estimate for LLM extraction
 * Based on Claude Haiku pricing: $0.25/1M input tokens, $1.25/1M output tokens
 */
export function estimateCost(freeTextLength: number): {
  inputTokens: number;
  outputTokens: number;
  estimatedCostUSD: number;
} {
  // Rough estimate: 1 token ≈ 4 characters
  const systemPromptTokens = Math.ceil(SYSTEM_PROMPT.length / 4);
  const userPromptTokens = Math.ceil((freeTextLength + 30) / 4); // +30 for wrapper
  const inputTokens = systemPromptTokens + userPromptTokens;
  const outputTokens = 100; // Average JSON response

  // Claude Haiku pricing
  const inputCost = (inputTokens / 1_000_000) * 0.25;
  const outputCost = (outputTokens / 1_000_000) * 1.25;

  return {
    inputTokens,
    outputTokens,
    estimatedCostUSD: inputCost + outputCost,
  };
}
