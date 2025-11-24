import { Ollama } from 'ollama';
import OpenAI from 'openai';

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const LLM_PROVIDER = process.env.LLM_PROVIDER || (process.env.NODE_ENV === 'production' ? 'openai' : 'ollama');

// Singleton clients
let ollamaClient: Ollama | null = null;
let openaiClient: OpenAI | null = null;

function getOllamaClient(): Ollama {
  if (!ollamaClient) {
    ollamaClient = new Ollama({ host: OLLAMA_HOST });
  }
  return ollamaClient;
}

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: OPENAI_API_KEY });
  }
  return openaiClient;
}

/**
 * Generate embeddings using BGE-M3 model
 * @param text Text to embed
 * @returns 1024-dimensional embedding vector
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // Note: For embeddings, prefer using the dedicated embeddings.ts module
  // This function is kept for backward compatibility but delegates to Ollama only for now
  const ollama = getOllamaClient();

  const response = await ollama.embeddings({
    model: 'bge-m3',
    prompt: text,
  });

  return response.embedding;
}

/**
 * Generate embeddings for multiple texts in batch
 * @param texts Array of texts to embed
 * @returns Array of embedding vectors
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];

  for (const text of texts) {
    const embedding = await generateEmbedding(text);
    embeddings.push(embedding);
  }

  return embeddings;
}

/**
 * Rerank documents using BGE reranker model
 * @param query Search query
 * @param documents Array of documents to rerank
 * @returns Documents with relevance scores, sorted by score descending
 */
export async function rerank(
  query: string,
  documents: { id: string; text: string }[]
): Promise<{ id: string; text: string; score: number }[]> {
  // Reranking is currently only supported via Ollama/Local models
  // For production/OpenAI, we might skip reranking or use a different strategy
  if (LLM_PROVIDER === 'openai') {
    // Skip reranking in production for now, just return original order
    // TODO: Implement Cohere or other reranking API
    return documents.map(d => ({ ...d, score: 0 }));
  }

  const ollama = getOllamaClient();

  const results: { id: string; text: string; score: number }[] = [];

  for (const doc of documents) {
    // Use the reranker model to score query-document relevance
    const response = await ollama.embeddings({
      model: 'bge-reranker-v2-m3',
      prompt: `Query: ${query}\nDocument: ${doc.text}`,
    });

    // BGE reranker returns a single score (use first embedding value as score)
    const score = response.embedding[0];

    results.push({
      ...doc,
      score,
    });
  }

  // Sort by score descending
  return results.sort((a, b) => b.score - a.score);
}

/**
 * Generate natural language response using Llama 3.1 or OpenAI
 * @param prompt User prompt
 * @param systemPrompt Optional system prompt
 * @returns Generated text response
 */
export async function generateResponse(
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  if (LLM_PROVIDER === 'openai') {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
        { role: 'user', content: prompt },
      ],
    });
    return completion.choices[0]?.message?.content || '';
  }

  const ollama = getOllamaClient();

  const response = await ollama.generate({
    model: 'llama3.1:8b',
    prompt,
    system: systemPrompt,
  });

  return response.response;
}

/**
 * Generate streaming response for real-time UI updates
 * @param prompt User prompt
 * @param systemPrompt Optional system prompt
 * @param onChunk Callback for each chunk of text
 */
export async function generateStreamingResponse(
  prompt: string,
  systemPrompt: string | undefined,
  onChunk: (chunk: string) => void
): Promise<void> {
  if (LLM_PROVIDER === 'openai') {
    const openai = getOpenAIClient();
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
        { role: 'user', content: prompt },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        onChunk(content);
      }
    }
    return;
  }

  const ollama = getOllamaClient();

  const stream = await ollama.generate({
    model: 'llama3.1:8b',
    prompt,
    system: systemPrompt,
    stream: true,
  });

  for await (const chunk of stream) {
    onChunk(chunk.response);
  }
}

/**
 * Extract structured information from text using Llama 3.1 or OpenAI
 * @param text Input text
 * @param schema JSON schema describing the desired output structure
 * @returns Extracted data matching the schema
 */
export async function extractStructured<T>(
  text: string,
  schema: Record<string, any>
): Promise<T> {
  const systemPrompt = `Extract information from the text according to this JSON schema: ${JSON.stringify(schema)}. Return ONLY valid JSON, no explanations.`;

  const response = await generateResponse(text, systemPrompt);

  try {
    // Clean up response if it contains markdown code blocks
    const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanResponse) as T;
  } catch (error) {
    throw new Error(`Failed to parse LLM response as JSON: ${response}`);
  }
}

/**
 * Summarize a long text
 * @param text Text to summarize
 * @param maxLength Maximum length of summary in characters
 * @returns Summarized text
 */
export async function summarize(
  text: string,
  maxLength: number = 200
): Promise<string> {
  const systemPrompt = `Summarize the following text in no more than ${maxLength} characters. Be concise and capture key information.`;

  return await generateResponse(text, systemPrompt);
}

