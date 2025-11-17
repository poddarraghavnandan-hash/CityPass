/**
 * Multi-Tier Event Extraction System
 * Tier 1: Llama 3.1 8B (local, free, fast)
 * Tier 2: Claude Haiku (API, $0.25/MTok, medium)
 * Tier 3: Claude Sonnet (API, $3/MTok, highest quality)
 *
 * Strategy: Start with Llama, escalate to Haiku if confidence low, escalate to Sonnet if complex
 */

import { Ollama } from 'ollama';
import Anthropic from '@anthropic-ai/sdk';
import { cacheExtraction } from './cache';

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const USE_CACHE = process.env.USE_EXTRACTION_CACHE !== 'false'; // Default: enabled

// Singleton clients
let ollamaClient: Ollama | null = null;
let anthropicClient: InstanceType<typeof Anthropic> | null = null;

function getOllamaClient(): Ollama {
  if (!ollamaClient) {
    ollamaClient = new Ollama({ host: OLLAMA_HOST });
  }
  return ollamaClient;
}

function getAnthropicClient(): InstanceType<typeof Anthropic> {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

/**
 * Event extraction result with confidence score
 */
export interface ExtractionResult<T> {
  data: T;
  confidence: number; // 0-1
  tier: 'llama' | 'haiku' | 'sonnet';
  retries: number;
  tokens?: {
    input: number;
    output: number;
  };
  cost?: number; // USD
}

/**
 * Event schema for extraction
 */
export interface ExtractedEvent {
  title: string;
  subtitle?: string;
  description?: string;
  startTime: string; // ISO 8601
  endTime?: string;
  venueName?: string;
  address?: string;
  neighborhood?: string;
  city: string;
  category?: string;
  priceMin?: number;
  priceMax?: number;
  currency?: string;
  tags?: string[];
  imageUrl?: string;
  bookingUrl?: string;
  organizer?: string;
  contactInfo?: string;
  ageRestriction?: string;
  capacity?: number;
  accessibility?: string[];
}

/**
 * Extract event information with multi-tier fallback
 */
export async function extractEvent(
  html: string,
  url: string,
  options: {
    startTier?: 'llama' | 'haiku' | 'sonnet';
    maxRetries?: number;
    confidenceThreshold?: number;
    skipCache?: boolean;
  } = {}
): Promise<ExtractionResult<ExtractedEvent>> {
  const {
    startTier = 'llama',
    maxRetries = 2,
    confidenceThreshold = 0.7,
    skipCache = false,
  } = options;

  // Wrapper function for extraction
  const extractFn = async (): Promise<ExtractionResult<ExtractedEvent>> => {
    let currentTier = startTier;
    let retries = 0;
    let lastError: Error | null = null;

    const tiers: ('llama' | 'haiku' | 'sonnet')[] = ['llama', 'haiku', 'sonnet'];
    const startIndex = tiers.indexOf(startTier);

    // Try each tier in sequence
    for (let i = startIndex; i < tiers.length; i++) {
      currentTier = tiers[i];

      try {
        const result = await extractWithTier(html, url, currentTier);

        // Check confidence
        if (result.confidence >= confidenceThreshold) {
          return {
            ...result,
            retries,
          };
        }

        // Low confidence, try next tier
        console.log(`Low confidence (${result.confidence}) from ${currentTier}, escalating...`);
        retries++;

      } catch (error) {
        lastError = error as Error;
        console.error(`Extraction failed with ${currentTier}:`, error);
        retries++;

        // If not the last tier, continue
        if (i < tiers.length - 1) {
          continue;
        }

        // Last tier failed, throw error
        throw new Error(`All extraction tiers failed. Last error: ${lastError.message}`);
      }
    }

    // Should not reach here, but TypeScript needs it
    throw new Error('Extraction failed after all retries');
  };

  // Use cache if enabled
  if (USE_CACHE && !skipCache) {
    return cacheExtraction(html, url, extractFn);
  }

  return extractFn();
}

/**
 * Extract with a specific tier
 */
async function extractWithTier(
  html: string,
  url: string,
  tier: 'llama' | 'haiku' | 'sonnet'
): Promise<ExtractionResult<ExtractedEvent>> {
  // Clean HTML (remove scripts, styles, excessive whitespace)
  const cleanedHtml = cleanHtml(html);

  // Truncate if too long
  const maxLength = tier === 'llama' ? 4000 : tier === 'haiku' ? 8000 : 20000;
  const truncatedHtml = cleanedHtml.slice(0, maxLength);

  const prompt = createExtractionPrompt(truncatedHtml, url);

  let data: ExtractedEvent;
  let tokens = { input: 0, output: 0 };
  let cost = 0;

  if (tier === 'llama') {
    // Tier 1: Llama 3.1 8B (free, local)
    const result = await extractWithLlama(prompt);
    data = result.data;
    tokens = result.tokens;
    cost = 0; // Local model, no cost

  } else if (tier === 'haiku') {
    // Tier 2: Claude Haiku (fast, cheap)
    const result = await extractWithClaude(prompt, 'claude-3-haiku-20240307');
    data = result.data;
    tokens = result.tokens;
    cost = (tokens.input / 1_000_000) * 0.25 + (tokens.output / 1_000_000) * 1.25;

  } else {
    // Tier 3: Claude Sonnet (highest quality)
    const result = await extractWithClaude(prompt, 'claude-3-5-sonnet-20241022');
    data = result.data;
    tokens = result.tokens;
    cost = (tokens.input / 1_000_000) * 3.00 + (tokens.output / 1_000_000) * 15.00;
  }

  // Calculate confidence score
  const confidence = calculateConfidence(data);

  return {
    data,
    confidence,
    tier,
    retries: 0,
    tokens,
    cost,
  };
}

/**
 * Extract using Llama 3.1 8B via Ollama
 */
async function extractWithLlama(prompt: string): Promise<{
  data: ExtractedEvent;
  tokens: { input: number; output: number };
}> {
  const ollama = getOllamaClient();

  const response = await ollama.generate({
    model: 'llama3.1:8b',
    prompt,
    format: 'json', // Request JSON output
  });

  // Parse JSON from response
  let data: ExtractedEvent;
  try {
    // Extract JSON from response (might have extra text)
    const jsonMatch = response.response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Llama response');
    }
    data = JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Failed to parse Llama JSON:', response.response);
    throw new Error('Llama produced invalid JSON');
  }

  // Estimate tokens (Llama doesn't provide token count)
  const tokens = {
    input: Math.ceil(prompt.length / 4),
    output: Math.ceil(response.response.length / 4),
  };

  return { data, tokens };
}

/**
 * Extract using Claude via Anthropic API
 */
async function extractWithClaude(
  prompt: string,
  model: string
): Promise<{
  data: ExtractedEvent;
  tokens: { input: number; output: number };
}> {
  const anthropic = getAnthropicClient();

  const message = await anthropic.messages.create({
    model,
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  // Extract text from response
  const responseText = message.content
    .filter((block: any) => block.type === 'text')
    .map((block: any) => block.text)
    .join('\n');

  // Parse JSON
  let data: ExtractedEvent;
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Claude response');
    }
    data = JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Failed to parse Claude JSON:', responseText);
    throw new Error('Claude produced invalid JSON');
  }

  // Get actual token usage from API
  const tokens = {
    input: message.usage.input_tokens,
    output: message.usage.output_tokens,
  };

  return { data, tokens };
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
  "category": "Event category: MUSIC, ARTS, FOOD, SPORTS, THEATRE, NIGHTLIFE, etc (optional)",
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
  // Remove script and style tags
  let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove HTML comments
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

  // Replace multiple whitespace with single space
  cleaned = cleaned.replace(/\s+/g, ' ');

  // Decode HTML entities
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
 * Calculate confidence score for extracted event
 */
function calculateConfidence(event: ExtractedEvent): number {
  let score = 0;
  let maxScore = 0;

  // Required fields (high weight)
  maxScore += 30;
  if (event.title && event.title.length > 5) score += 30;

  maxScore += 20;
  if (event.startTime) {
    try {
      new Date(event.startTime); // Validate date
      score += 20;
    } catch {
      score += 5;
    }
  }

  maxScore += 15;
  if (event.city && event.city.length > 2) score += 15;

  // Important optional fields (medium weight)
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

  // Return normalized score (0-1)
  return score / maxScore;
}

/**
 * Batch extract events with intelligent routing
 */
export async function extractEventsBatch(
  htmlContents: Array<{ html: string; url: string }>,
  options: {
    startTier?: 'llama' | 'haiku' | 'sonnet';
    maxConcurrent?: number;
    confidenceThreshold?: number;
  } = {}
): Promise<ExtractionResult<ExtractedEvent>[]> {
  const {
    startTier = 'llama',
    maxConcurrent = 5,
    confidenceThreshold = 0.7,
  } = options;

  const results: ExtractionResult<ExtractedEvent>[] = [];

  // Process in batches to avoid overwhelming the system
  for (let i = 0; i < htmlContents.length; i += maxConcurrent) {
    const batch = htmlContents.slice(i, i + maxConcurrent);

    const batchPromises = batch.map(({ html, url }) =>
      extractEvent(html, url, { startTier, confidenceThreshold })
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
 * Calculate total cost for extraction results
 */
export function calculateExtractionCost(
  results: ExtractionResult<ExtractedEvent>[]
): {
  totalCost: number;
  breakdown: {
    llama: { count: number; cost: number };
    haiku: { count: number; cost: number };
    sonnet: { count: number; cost: number };
  };
} {
  const breakdown = {
    llama: { count: 0, cost: 0 },
    haiku: { count: 0, cost: 0 },
    sonnet: { count: 0, cost: 0 },
  };

  for (const result of results) {
    breakdown[result.tier].count++;
    breakdown[result.tier].cost += result.cost || 0;
  }

  const totalCost = breakdown.llama.cost + breakdown.haiku.cost + breakdown.sonnet.cost;

  return { totalCost, breakdown };
}
