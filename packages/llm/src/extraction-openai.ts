/**
 * OpenAI Integration for Event Extraction
 * Supports GPT-4o, GPT-4 Turbo, and GPT-4o-mini models
 */

import OpenAI from 'openai';
import type { ExtractedEvent } from './extraction';

// Singleton client
let openaiClient: OpenAI | null = null;

export function resetOpenAIClient(): void {
  console.log('[OpenAI Client] Resetting client singleton');
  openaiClient = null;
}

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    // Read API key lazily to ensure dotenv has loaded
    const apiKey = process.env.OPENAI_API_KEY || '';
    console.log(`[OpenAI Client] Creating new client - API key present: ${!!apiKey}, length: ${apiKey.length}`);
    if (!apiKey) {
      console.error('[OpenAI Client] WARNING: No API key found in process.env.OPENAI_API_KEY');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

/**
 * OpenAI model pricing (per 1M tokens)
 */
export const OPENAI_PRICING = {
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4-turbo': { input: 10.0, output: 30.0 },
  'gpt-4o': { input: 2.50, output: 10.0 },
} as const;

export type OpenAIModel = keyof typeof OPENAI_PRICING;

/**
 * Extract events using OpenAI with structured output
 */
export async function extractWithOpenAI(
  prompt: string,
  model: OpenAIModel
): Promise<{
  data: ExtractedEvent;
  tokens: { input: number; output: number };
}> {
  const openai = getOpenAIClient();

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `You are an expert event data extraction assistant. Extract event information from HTML content and return ONLY valid JSON matching the schema. Be accurate with dates, prices, and venue information.`,
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: { type: 'json_object' }, // Force JSON output
    max_tokens: 2048,
    temperature: 0.1, // Low temperature for consistency
  });

  const responseText = completion.choices[0]?.message?.content || '{}';

  // Parse JSON
  let data: ExtractedEvent;
  try {
    const parsed = JSON.parse(responseText);
    // OpenAI might wrap in an object, extract the event data
    data = parsed.event || parsed;
  } catch (error) {
    console.error('Failed to parse OpenAI JSON:', responseText);
    throw new Error('OpenAI produced invalid JSON');
  }

  // Get token usage
  const tokens = {
    input: completion.usage?.prompt_tokens || 0,
    output: completion.usage?.completion_tokens || 0,
  };

  return { data, tokens };
}

/**
 * Calculate cost for OpenAI extraction
 */
export function calculateOpenAICost(
  model: OpenAIModel,
  tokens: { input: number; output: number }
): number {
  const pricing = OPENAI_PRICING[model];
  return (
    (tokens.input / 1_000_000) * pricing.input +
    (tokens.output / 1_000_000) * pricing.output
  );
}

/**
 * Map tier to OpenAI model
 */
export function tierToOpenAIModel(tier: 'mini' | 'turbo' | 'flagship'): OpenAIModel {
  const mapping = {
    mini: 'gpt-4o-mini',
    turbo: 'gpt-4-turbo',
    flagship: 'gpt-4o',
  } as const;
  return mapping[tier];
}

/**
 * Extract events with OpenAI using function calling (alternative approach)
 */
export async function extractWithOpenAIFunctions(
  prompt: string,
  model: OpenAIModel
): Promise<{
  data: ExtractedEvent;
  tokens: { input: number; output: number };
}> {
  const openai = getOpenAIClient();

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: 'You extract structured event data from HTML.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    functions: [
      {
        name: 'extract_event',
        description: 'Extract event information from content',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Event title' },
            subtitle: { type: 'string', description: 'Event subtitle' },
            description: { type: 'string', description: 'Full description' },
            startTime: { type: 'string', description: 'ISO 8601 datetime' },
            endTime: { type: 'string', description: 'ISO 8601 datetime' },
            venueName: { type: 'string', description: 'Venue name' },
            address: { type: 'string', description: 'Full address' },
            neighborhood: { type: 'string', description: 'Neighborhood/area' },
            city: { type: 'string', description: 'City name' },
            category: {
              type: 'string',
              enum: ['MUSIC', 'ARTS', 'FOOD', 'SPORTS', 'THEATRE', 'NIGHTLIFE', 'NETWORKING', 'FAMILY', 'MARKETS', 'EDUCATION'],
            },
            priceMin: { type: 'number', description: 'Minimum price' },
            priceMax: { type: 'number', description: 'Maximum price' },
            currency: { type: 'string', description: 'Currency code' },
            tags: { type: 'array', items: { type: 'string' } },
            imageUrl: { type: 'string', description: 'Image URL' },
            bookingUrl: { type: 'string', description: 'Ticket URL' },
            organizer: { type: 'string', description: 'Organizer name' },
            contactInfo: { type: 'string', description: 'Contact info' },
            ageRestriction: { type: 'string', description: 'Age restriction' },
            capacity: { type: 'number', description: 'Venue capacity' },
            accessibility: { type: 'array', items: { type: 'string' } },
          },
          required: ['title', 'startTime', 'city'],
        },
      },
    ],
    function_call: { name: 'extract_event' },
    max_tokens: 2048,
    temperature: 0.1,
  });

  const functionCall = completion.choices[0]?.message?.function_call;
  if (!functionCall || !functionCall.arguments) {
    throw new Error('OpenAI did not return function call');
  }

  const data: ExtractedEvent = JSON.parse(functionCall.arguments);

  const tokens = {
    input: completion.usage?.prompt_tokens || 0,
    output: completion.usage?.completion_tokens || 0,
  };

  return { data, tokens };
}
