/**
 * Enhanced Multi-Provider Event Extraction System
 * Supports: Llama 3.1 (Ollama), Anthropic Claude, OpenAI GPT
 *
 * Tier Strategy:
 * 1. Llama 3.1 8B (free, local)
 * 2. Claude Haiku OR GPT-4o-mini (cheapest API)
 * 3. Claude Sonnet OR GPT-4 Turbo (balanced)
 * 4. GPT-4o OR Claude Opus (flagship quality)
 */

import { Ollama } from 'ollama';
import Anthropic from '@anthropic-ai/sdk';
import {
  extractWithOpenAI,
  calculateOpenAICost,
  tierToOpenAIModel,
  type OpenAIModel,
} from './extraction-openai';
import { cacheExtraction } from './cache';
import type { ExtractedEvent, ExtractionResult } from './extraction';

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const LLM_PROVIDER = process.env.LLM_PROVIDER || 'auto'; // 'anthropic' | 'openai' | 'auto'
const USE_CACHE = process.env.USE_EXTRACTION_CACHE !== 'false';

// Singleton clients
let ollamaClient: Ollama | null = null;
let anthropicClient: Anthropic | null = null;

function getOllamaClient(): Ollama {
  if (!ollamaClient) {
    ollamaClient = new Ollama({ host: OLLAMA_HOST });
  }
  return ollamaClient;
}

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

/**
 * Provider configuration
 */
type Provider = 'anthropic' | 'openai';
type TierLevel = 'local' | 'cheap' | 'balanced' | 'flagship';

interface TierConfig {
  level: TierLevel;
  provider: Provider | 'local';
  model: string;
  maxTokens: number;
  costPer1M: { input: number; output: number };
}

const TIER_CONFIGS: Record<string, TierConfig> = {
  'tier1-local': {
    level: 'local',
    provider: 'local',
    model: 'llama3.1:8b',
    maxTokens: 4000,
    costPer1M: { input: 0, output: 0 },
  },
  'tier2-anthropic': {
    level: 'cheap',
    provider: 'anthropic',
    model: 'claude-3-haiku-20240307',
    maxTokens: 8000,
    costPer1M: { input: 0.25, output: 1.25 },
  },
  'tier2-openai': {
    level: 'cheap',
    provider: 'openai',
    model: 'gpt-4o-mini',
    maxTokens: 8000,
    costPer1M: { input: 0.15, output: 0.60 },
  },
  'tier3-anthropic': {
    level: 'balanced',
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    maxTokens: 20000,
    costPer1M: { input: 3.0, output: 15.0 },
  },
  'tier3-openai': {
    level: 'balanced',
    provider: 'openai',
    model: 'gpt-4-turbo',
    maxTokens: 20000,
    costPer1M: { input: 10.0, output: 30.0 },
  },
  'tier4-openai': {
    level: 'flagship',
    provider: 'openai',
    model: 'gpt-4o',
    maxTokens: 30000,
    costPer1M: { input: 2.5, output: 10.0 },
  },
};

/**
 * Select optimal tier based on provider preference
 */
function selectTier(level: TierLevel, preferredProvider?: Provider): TierConfig {
  if (level === 'local') {
    return TIER_CONFIGS['tier1-local'];
  }

  // Determine provider
  let provider: Provider;
  if (LLM_PROVIDER === 'anthropic' || preferredProvider === 'anthropic') {
    provider = 'anthropic';
  } else if (LLM_PROVIDER === 'openai' || preferredProvider === 'openai') {
    provider = 'openai';
  } else {
    // Auto mode: choose cheapest for each tier
    if (level === 'cheap') {
      provider = 'openai'; // GPT-4o-mini is cheaper than Haiku
    } else if (level === 'balanced') {
      provider = 'anthropic'; // Sonnet is cheaper than GPT-4 Turbo
    } else {
      provider = 'openai'; // GPT-4o flagship
    }
  }

  const tierKey = `tier${level === 'cheap' ? '2' : level === 'balanced' ? '3' : '4'}-${provider}`;
  return TIER_CONFIGS[tierKey];
}

/**
 * Extract event with automatic tier escalation and provider failover
 */
export async function extractEventEnhanced(
  html: string,
  url: string,
  options: {
    startTier?: TierLevel;
    maxRetries?: number;
    confidenceThreshold?: number;
    skipCache?: boolean;
    preferredProvider?: Provider;
  } = {}
): Promise<ExtractionResult<ExtractedEvent>> {
  const {
    startTier = 'local',
    maxRetries = 3,
    confidenceThreshold = 0.7,
    skipCache = false,
    preferredProvider,
  } = options;

  const extractFn = async (): Promise<ExtractionResult<ExtractedEvent>> => {
    const tierLevels: TierLevel[] = ['local', 'cheap', 'balanced', 'flagship'];
    const startIndex = tierLevels.indexOf(startTier);
    let retries = 0;

    for (let i = startIndex; i < tierLevels.length; i++) {
      const tierLevel = tierLevels[i];
      const tier = selectTier(tierLevel, preferredProvider);

      try {
        console.log(`[Extraction] Attempting ${tier.level} tier (${tier.provider}/${tier.model})...`);

        const result = await extractWithTier(html, url, tier);

        if (result.confidence >= confidenceThreshold) {
          console.log(`[Extraction] Success with ${tier.model} (confidence: ${result.confidence.toFixed(2)})`);
          return {
            ...result,
            retries,
          };
        }

        console.log(`[Extraction] Low confidence (${result.confidence.toFixed(2)}) from ${tier.model}, escalating...`);
        retries++;

      } catch (error) {
        console.error(`[Extraction] Failed with ${tier.model}:`, error);
        retries++;

        // Try alternate provider before escalating tier
        if (LLM_PROVIDER === 'auto' && tierLevel !== 'local' && i < tierLevels.length - 1) {
          const alternateProvider = tier.provider === 'anthropic' ? 'openai' : 'anthropic';
          const alternateTier = selectTier(tierLevel, alternateProvider);

          try {
            console.log(`[Extraction] Trying alternate provider: ${alternateTier.provider}/${alternateTier.model}`);
            const result = await extractWithTier(html, url, alternateTier);

            if (result.confidence >= confidenceThreshold) {
              return { ...result, retries };
            }
          } catch (altError) {
            console.error(`[Extraction] Alternate provider also failed:`, altError);
          }
        }

        // Continue to next tier
        continue;
      }
    }

    throw new Error('All extraction tiers exhausted without success');
  };

  if (USE_CACHE && !skipCache) {
    return cacheExtraction(html, url, extractFn);
  }

  return extractFn();
}

/**
 * Extract with specific tier configuration
 */
async function extractWithTier(
  html: string,
  url: string,
  tier: TierConfig
): Promise<ExtractionResult<ExtractedEvent>> {
  const cleanedHtml = cleanHtml(html);
  const truncatedHtml = cleanedHtml.slice(0, tier.maxTokens);
  const prompt = createExtractionPrompt(truncatedHtml, url);

  let data: ExtractedEvent;
  let tokens = { input: 0, output: 0 };
  let cost = 0;

  if (tier.provider === 'local') {
    // Tier 1: Llama via Ollama
    const ollama = getOllamaClient();
    const response = await ollama.generate({
      model: tier.model,
      prompt,
      format: 'json',
    });

    const jsonMatch = response.response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in Llama response');
    data = JSON.parse(jsonMatch[0]);
    tokens = {
      input: Math.ceil(prompt.length / 4),
      output: Math.ceil(response.response.length / 4),
    };
    cost = 0;

  } else if (tier.provider === 'anthropic') {
    // Anthropic Claude
    const anthropic = getAnthropicClient();
    const message = await anthropic.messages.create({
      model: tier.model,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content
      .filter(block => block.type === 'text')
      .map(block => (block as any).text)
      .join('\n');

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in Claude response');
    data = JSON.parse(jsonMatch[0]);

    tokens = {
      input: message.usage.input_tokens,
      output: message.usage.output_tokens,
    };
    cost =
      (tokens.input / 1_000_000) * tier.costPer1M.input +
      (tokens.output / 1_000_000) * tier.costPer1M.output;

  } else {
    // OpenAI
    const result = await extractWithOpenAI(prompt, tier.model as OpenAIModel);
    data = result.data;
    tokens = result.tokens;
    cost = calculateOpenAICost(tier.model as OpenAIModel, tokens);
  }

  const confidence = calculateConfidence(data);

  return {
    data,
    confidence,
    tier: `${tier.provider}-${tier.level}` as any,
    retries: 0,
    tokens,
    cost,
  };
}

/**
 * Create extraction prompt
 */
function createExtractionPrompt(html: string, url: string): string {
  return `Extract event information from the following HTML content. Return ONLY valid JSON matching this schema, with no additional text:

{
  "title": "Event title (required)",
  "subtitle": "Event subtitle (optional)",
  "description": "Full event description (optional)",
  "startTime": "ISO 8601 datetime (required)",
  "endTime": "ISO 8601 datetime (optional)",
  "venueName": "Venue name (optional)",
  "address": "Full address (optional)",
  "neighborhood": "Neighborhood/area (optional)",
  "city": "City name (required)",
  "category": "MUSIC, ARTS, FOOD, SPORTS, THEATRE, NIGHTLIFE, etc (optional)",
  "priceMin": 0,
  "priceMax": 100,
  "currency": "USD",
  "tags": ["tag1", "tag2"],
  "imageUrl": "Image URL (optional)",
  "bookingUrl": "Ticket/booking URL (optional)",
  "organizer": "Organizer name (optional)",
  "contactInfo": "Contact info (optional)",
  "ageRestriction": "Age restriction (optional)",
  "capacity": 100,
  "accessibility": ["wheelchair", "asl"]
}

Source URL: ${url}

HTML Content:
${html}

Extract the information and return ONLY the JSON object:`;
}

/**
 * Clean HTML for extraction
 */
function cleanHtml(html: string): string {
  let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
  cleaned = cleaned.replace(/\s+/g, ' ');
  cleaned = cleaned
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  return cleaned.trim();
}

/**
 * Calculate confidence score
 */
function calculateConfidence(event: ExtractedEvent): number {
  let score = 0;
  let maxScore = 0;

  maxScore += 30;
  if (event.title && event.title.length > 5) score += 30;

  maxScore += 20;
  if (event.startTime) {
    try {
      new Date(event.startTime);
      score += 20;
    } catch {
      score += 5;
    }
  }

  maxScore += 15;
  if (event.city && event.city.length > 2) score += 15;

  maxScore += 10;
  if (event.description && event.description.length > 20) score += 10;

  maxScore += 8;
  if (event.venueName) score += 8;

  maxScore += 7;
  if (event.category) score += 7;

  maxScore += 5;
  if (event.priceMin !== undefined || event.priceMax !== undefined) score += 5;

  maxScore += 5;
  if (event.bookingUrl) score += 5;

  return score / maxScore;
}

/**
 * Batch extraction with intelligent provider distribution
 */
export async function extractEventsBatchEnhanced(
  htmlContents: Array<{ html: string; url: string }>,
  options: {
    startTier?: TierLevel;
    maxConcurrent?: number;
    confidenceThreshold?: number;
  } = {}
): Promise<ExtractionResult<ExtractedEvent>[]> {
  const { startTier = 'local', maxConcurrent = 5, confidenceThreshold = 0.7 } = options;

  const results: ExtractionResult<ExtractedEvent>[] = [];

  for (let i = 0; i < htmlContents.length; i += maxConcurrent) {
    const batch = htmlContents.slice(i, i + maxConcurrent);
    const batchPromises = batch.map(({ html, url }) =>
      extractEventEnhanced(html, url, { startTier, confidenceThreshold })
    );

    const batchResults = await Promise.allSettled(batchPromises);

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        console.error('Batch extraction failed:', result.reason);
      }
    }
  }

  return results;
}

/**
 * Calculate total cost and provider breakdown
 */
export function calculateExtractionCostEnhanced(
  results: ExtractionResult<ExtractedEvent>[]
): {
  totalCost: number;
  breakdown: Record<string, { count: number; cost: number }>;
  avgConfidence: number;
} {
  const breakdown: Record<string, { count: number; cost: number }> = {};
  let totalCost = 0;
  let totalConfidence = 0;

  for (const result of results) {
    const tierKey = result.tier;
    if (!breakdown[tierKey]) {
      breakdown[tierKey] = { count: 0, cost: 0 };
    }
    breakdown[tierKey].count++;
    breakdown[tierKey].cost += result.cost || 0;
    totalCost += result.cost || 0;
    totalConfidence += result.confidence;
  }

  return {
    totalCost,
    breakdown,
    avgConfidence: results.length > 0 ? totalConfidence / results.length : 0,
  };
}
