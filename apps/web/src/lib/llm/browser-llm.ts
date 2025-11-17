/**
 * Browser-based LLM Intent Extraction using WebLLM
 * Runs locally on-device using WebGPU for low-latency NLU
 */

import type { IntentionTokens } from '@citypass/types';

// Lazy load WebLLM to avoid SSR issues
let CreateMLCEngine: any = null;
let engineInstance: any = null;
let isInitializing = false;
let initializationError: string | null = null;

// Check WebGPU availability
export function hasWebGPUSupport(): boolean {
  if (typeof window === 'undefined') return false;
  return 'gpu' in navigator;
}

/**
 * Initialize the WebLLM engine with Phi-3 Mini or Mistral 1B
 */
async function initializeEngine() {
  if (engineInstance) return engineInstance;
  if (isInitializing) {
    // Wait for initialization to complete
    await new Promise((resolve) => setTimeout(resolve, 100));
    return initializeEngine();
  }
  if (initializationError) throw new Error(initializationError);

  try {
    isInitializing = true;

    // Lazy load WebLLM
    if (!CreateMLCEngine) {
      const webllm = await import('@mlc-ai/web-llm');
      CreateMLCEngine = webllm.CreateMLCEngine;
    }

    // Initialize with Phi-3 Mini (faster, smaller) or Mistral 1B
    // Model selection: Phi-3-mini-4k-instruct-q4f16_1-MLC (1.8GB)
    const selectedModel =
      process.env.NEXT_PUBLIC_BROWSER_LLM_MODEL || 'Phi-3-mini-4k-instruct-q4f16_1-MLC';

    console.log(`🧠 Initializing browser LLM: ${selectedModel}`);

    engineInstance = await CreateMLCEngine(selectedModel, {
      initProgressCallback: (progress: any) => {
        console.log(`📥 Loading model: ${progress.text}`);
      },
    });

    console.log('✅ Browser LLM ready');
    return engineInstance;
  } catch (error: any) {
    initializationError = error.message;
    console.error('❌ Failed to initialize browser LLM:', error.message);
    throw error;
  } finally {
    isInitializing = false;
  }
}

/**
 * System prompt for intent extraction (same as backend)
 */
const INTENT_SYSTEM_PROMPT = `You are an expert at understanding natural language queries about events and activities.

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
  "exertion": "low" | "moderate" | "high",
  "vibe": "calm" | "social" | "electric" | "artistic" | "grounded",
  "companions": string[],   // One or more: "solo", "friends", "date", "family", "coworkers"
  "budget": "free" | "casual" | "splurge",
  "travelMode": "walk" | "bike" | "transit" | "drive"
}

Rules:
1. Only include fields that are EXPLICITLY mentioned or strongly implied
2. For timeWindow: "tonight" = 360 min (6pm-midnight), "this weekend" = 4320 min (72h), "tomorrow" = 1440 min (24h)
3. For exertion: "strenuous/intense/athletic" = high, "active/exercise/dance" = moderate, "relaxing/calm/seated" = low
4. For vibe: match to mood categories based on context
5. For budget: "free" = $0, "under $X" or "affordable" = casual, "splurge/fancy/upscale" = splurge
6. Return empty object {} if no clear intent can be extracted`;

/**
 * Extract intent using browser-based WebLLM
 */
export async function extractIntentInBrowser(
  freeText: string,
  options: {
    maxTokens?: number;
    temperature?: number;
  } = {}
): Promise<Partial<IntentionTokens> | null> {
  const { maxTokens = 300, temperature = 0.1 } = options;

  try {
    // Check WebGPU support
    if (!hasWebGPUSupport()) {
      console.warn('⚠️ WebGPU not supported, falling back to server');
      return null;
    }

    // Initialize engine
    const engine = await initializeEngine();

    // Call WebLLM (OpenAI-compatible API)
    const response = await engine.chat.completions.create({
      messages: [
        { role: 'system', content: INTENT_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Extract intent from this query:\n\n"${freeText}"`,
        },
      ],
      temperature,
      max_tokens: maxTokens,
    });

    const extractedJSON = response.choices[0].message.content || '{}';

    // Parse and map to IntentionTokens
    const cleaned = extractedJSON.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '');
    const extracted = JSON.parse(cleaned);

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

    console.log('🧠 Browser LLM extracted intent:', mapped);
    return mapped;
  } catch (error: any) {
    console.error('❌ Browser LLM intent extraction failed:', error.message);
    return null;
  }
}

/**
 * Preload the model in the background (optional optimization)
 */
export async function preloadBrowserLLM() {
  if (!hasWebGPUSupport()) return;

  try {
    await initializeEngine();
  } catch (error) {
    // Silent fail - not critical
  }
}
