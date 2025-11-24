/**
 * Advanced Embedding Router with Multi-Model Support
 * Supports: BGE-M3, E5-Base-v2, GTE-Small, all-MiniLM-L6-v2, OpenAI
 * Use-case based model selection for optimal performance and cost
 */

import { Ollama } from 'ollama';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { cacheEmbedding, cacheEmbeddingsBatch } from './cache';

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const USE_CACHE = process.env.USE_EMBEDDING_CACHE !== 'false'; // Default: enabled
const EMBEDDING_PROVIDER = process.env.EMBEDDING_PROVIDER || (process.env.NODE_ENV === 'production' ? 'openai' : 'ollama');

// Singleton clients
let ollamaClient: Ollama | null = null;
let anthropicClient: InstanceType<typeof Anthropic> | null = null;
let openaiClient: OpenAI | null = null;

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

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: OPENAI_API_KEY });
  }
  return openaiClient;
}

/**
 * Embedding models available in the system
 */
export type EmbeddingModel =
  | 'bge-m3'           // 1024-dim, best overall quality
  | 'e5-base-v2'       // 768-dim, balanced accuracy/performance
  | 'gte-small'        // 384-dim, fastest for realtime queries
  | 'minilm-l6-v2'     // 384-dim, lightweight fallback
  | 'voyage-2'         // API-based, highest quality (costs $)
  | 'claude-embeddings' // Claude's embedding (if available)
  | 'text-embedding-3-small' // OpenAI, 1536-dim, fast & cheap
  | 'text-embedding-3-large'; // OpenAI, 3072-dim, high precision

/**
 * Use case for embedding to determine optimal model
 */
export type EmbeddingUseCase =
  | 'event-indexing'      // Batch processing, use best quality (BGE-M3)
  | 'query-search'        // Real-time, use fast model (GTE-Small)
  | 'event-similarity'    // Event matching, use balanced (E5-Base-v2)
  | 'reranking'          // Post-search ranking, use specialized
  | 'user-preference'    // User profile matching, use balanced
  | 'category-matching'  // Category classification, use fast
  | 'domain-specific';   // Fine-tuned for events (E5-Base-v2)

/**
 * Model configuration with dimensions and use-case recommendations
 */
export const MODEL_CONFIG: Record<EmbeddingModel, {
  dimensions: number;
  maxTokens: number;
  provider: 'ollama' | 'api' | 'openai';
  costPer1MTokens?: number; // USD
  avgLatency?: number; // ms
  useCases: EmbeddingUseCase[];
}> = {
  'bge-m3': {
    dimensions: 1024,
    maxTokens: 8192,
    provider: 'ollama',
    avgLatency: 200,
    useCases: ['event-indexing', 'domain-specific'],
  },
  'e5-base-v2': {
    dimensions: 768,
    maxTokens: 512,
    provider: 'ollama',
    avgLatency: 120,
    useCases: ['event-similarity', 'user-preference', 'domain-specific'],
  },
  'gte-small': {
    dimensions: 384,
    maxTokens: 512,
    provider: 'ollama',
    avgLatency: 50,
    useCases: ['query-search', 'category-matching'],
  },
  'minilm-l6-v2': {
    dimensions: 384,
    maxTokens: 256,
    provider: 'ollama',
    avgLatency: 40,
    useCases: ['query-search', 'category-matching'],
  },
  'voyage-2': {
    dimensions: 1024,
    maxTokens: 16000,
    provider: 'api',
    costPer1MTokens: 0.12,
    avgLatency: 150,
    useCases: ['event-indexing', 'event-similarity'],
  },
  'claude-embeddings': {
    dimensions: 768,
    maxTokens: 8000,
    provider: 'api',
    costPer1MTokens: 0.25,
    avgLatency: 200,
    useCases: ['event-indexing', 'reranking'],
  },
  'text-embedding-3-small': {
    dimensions: 1536,
    maxTokens: 8191,
    provider: 'openai',
    costPer1MTokens: 0.02,
    avgLatency: 100,
    useCases: ['query-search', 'event-similarity', 'user-preference', 'category-matching'],
  },
  'text-embedding-3-large': {
    dimensions: 3072,
    maxTokens: 8191,
    provider: 'openai',
    costPer1MTokens: 0.13,
    avgLatency: 150,
    useCases: ['event-indexing', 'domain-specific'],
  },
};

/**
 * Automatically select the best embedding model for a given use case
 */
export function selectModelForUseCase(
  useCase: EmbeddingUseCase,
  preferLocal: boolean = EMBEDDING_PROVIDER === 'ollama'
): EmbeddingModel {
  // If OpenAI is preferred (e.g. production), return OpenAI models
  if (!preferLocal) {
    if (useCase === 'event-indexing' || useCase === 'domain-specific') {
      return 'text-embedding-3-large';
    }
    return 'text-embedding-3-small';
  }

  // Priority order based on use case for local models
  const useCasePreferences: Record<EmbeddingUseCase, EmbeddingModel[]> = {
    'event-indexing': ['bge-m3', 'e5-base-v2', 'voyage-2'],
    'query-search': ['gte-small', 'minilm-l6-v2', 'e5-base-v2'],
    'event-similarity': ['e5-base-v2', 'bge-m3', 'gte-small'],
    'reranking': ['bge-m3', 'e5-base-v2'],
    'user-preference': ['e5-base-v2', 'gte-small', 'bge-m3'],
    'category-matching': ['gte-small', 'minilm-l6-v2'],
    'domain-specific': ['e5-base-v2', 'bge-m3'],
  };

  const preferences = useCasePreferences[useCase];

  // Filter by local/API preference
  for (const model of preferences) {
    const config = MODEL_CONFIG[model];
    if (preferLocal && config.provider === 'ollama') {
      return model;
    }
    if (!preferLocal) {
      return model;
    }
  }

  // Fallback to first preference
  return preferences[0];
}

/**
 * Generate embedding with automatic model selection
 */
export async function generateEmbedding(
  text: string,
  options: {
    useCase?: EmbeddingUseCase;
    model?: EmbeddingModel;
    normalize?: boolean;
    skipCache?: boolean;
  } = {}
): Promise<number[]> {
  const {
    useCase = 'event-similarity',
    model = selectModelForUseCase(useCase),
    normalize = true,
    skipCache = false,
  } = options;

  const config = MODEL_CONFIG[model];

  // Wrapper function for generating embedding
  const generateFn = async (): Promise<number[]> => {
    let embedding: number[];

    if (config.provider === 'ollama') {
      embedding = await generateOllamaEmbedding(text, model);
    } else if (config.provider === 'openai') {
      embedding = await generateOpenAIEmbedding(text, model);
    } else {
      throw new Error(`API-based embedding model ${model} not yet implemented`);
    }

    // Normalize vector if requested (L2 normalization for cosine similarity)
    if (normalize) {
      return normalizeVector(embedding);
    }

    return embedding;
  };

  // Use cache if enabled
  if (USE_CACHE && !skipCache) {
    return cacheEmbedding(text, model, generateFn);
  }

  return generateFn();
}

/**
 * Generate embeddings for multiple texts in batch with optimized throughput
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  options: {
    useCase?: EmbeddingUseCase;
    model?: EmbeddingModel;
    batchSize?: number;
    normalize?: boolean;
    skipCache?: boolean;
  } = {}
): Promise<number[][]> {
  const {
    useCase = 'event-indexing',
    model = selectModelForUseCase(useCase),
    batchSize = 10,
    normalize = true,
    skipCache = false,
  } = options;

  // Wrapper function for generating all embeddings
  const generateAllFn = async (): Promise<number[][]> => {
    const embeddings: number[][] = [];

    // Process in batches to avoid overwhelming the service
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      // Process batch in parallel (with cache checks per item)
      const batchPromises = batch.map(text =>
        generateEmbedding(text, { model, useCase, normalize, skipCache: true }) // Skip cache in individual calls
      );

      const batchEmbeddings = await Promise.all(batchPromises);
      embeddings.push(...batchEmbeddings);
    }

    return embeddings;
  };

  // Use batch cache if enabled
  if (USE_CACHE && !skipCache) {
    return cacheEmbeddingsBatch(texts, model, generateAllFn);
  }

  return generateAllFn();
}

/**
 * Generate embedding using Ollama
 */
async function generateOllamaEmbedding(
  text: string,
  model: EmbeddingModel
): Promise<number[]> {
  const ollama = getOllamaClient();

  try {
    const response = await ollama.embeddings({
      model: getOllamaModelName(model),
      prompt: text,
    });

    return response.embedding;
  } catch (error) {
    console.error(`Ollama embedding failed for model ${model}:`, error);

    // Fallback to BGE-M3 if specific model fails
    if (model !== 'bge-m3') {
      console.log('Falling back to BGE-M3...');
      const response = await ollama.embeddings({
        model: 'bge-m3',
        prompt: text,
      });
      return response.embedding;
    }

    throw error;
  }
}

/**
 * Generate embedding using OpenAI
 */
async function generateOpenAIEmbedding(
  text: string,
  model: EmbeddingModel
): Promise<number[]> {
  const openai = getOpenAIClient();

  try {
    const response = await openai.embeddings.create({
      model: model,
      input: text,
      encoding_format: 'float',
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error(`OpenAI embedding failed for model ${model}:`, error);
    throw error;
  }
}

/**
 * Map our model enum to Ollama model names
 */
function getOllamaModelName(model: EmbeddingModel): string {
  const modelNames: Record<string, string> = {
    'bge-m3': 'bge-m3',
    'e5-base-v2': 'nomic-embed-text', // Substitute until E5-Base-v2 is available in Ollama
    'gte-small': 'nomic-embed-text',  // Substitute until GTE-Small is available
    'minilm-l6-v2': 'all-minilm',
  };

  return modelNames[model] || model;
}

/**
 * Normalize vector to unit length (L2 normalization)
 */
export function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));

  if (magnitude === 0) {
    return vector;
  }

  return vector.map(val => val / magnitude);
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    // throw new Error('Vectors must have same dimensions');
    // Soft fail for dimension mismatch (e.g. mixed models)
    return 0;
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Compare embeddings and find most similar
 */
export function findMostSimilar(
  queryEmbedding: number[],
  candidateEmbeddings: number[][]
): { index: number; similarity: number }[] {
  const similarities = candidateEmbeddings.map((embedding, index) => ({
    index,
    similarity: cosineSimilarity(queryEmbedding, embedding),
  }));

  return similarities.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Prepare event text for embedding
 * Optimized for event discovery use case
 */
export function prepareEventTextForEmbedding(event: {
  title: string;
  description?: string;
  category?: string;
  venueName?: string;
  neighborhood?: string;
  tags?: string[];
}): string {
  const parts: string[] = [];

  // Title is most important (repeat for emphasis)
  parts.push(event.title);

  // Category and venue
  if (event.category) {
    parts.push(`Category: ${event.category}`);
  }
  if (event.venueName) {
    parts.push(`Venue: ${event.venueName}`);
  }
  if (event.neighborhood) {
    parts.push(`Location: ${event.neighborhood}`);
  }

  // Description (truncate if too long)
  if (event.description) {
    const desc = event.description.slice(0, 500);
    parts.push(desc);
  }

  // Tags
  if (event.tags && event.tags.length > 0) {
    parts.push(`Tags: ${event.tags.join(', ')}`);
  }

  // Title again for emphasis
  parts.push(event.title);

  return parts.join('\n\n');
}

/**
 * Prepare search query for embedding
 * Optimized for user search queries
 */
export function prepareQueryForEmbedding(
  query: string,
  context?: {
    category?: string;
    city?: string;
    timePreference?: string;
  }
): string {
  const parts: string[] = [query];

  if (context?.category) {
    parts.push(`Category: ${context.category}`);
  }
  if (context?.city) {
    parts.push(`City: ${context.city}`);
  }
  if (context?.timePreference) {
    parts.push(`Time: ${context.timePreference}`);
  }

  return parts.join(' ');
}

