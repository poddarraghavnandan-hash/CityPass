// Ollama LLM functions
export {
  generateEmbedding as generateEmbeddingLegacy,
  generateEmbeddings as generateEmbeddingsLegacy,
  rerank,
  generateResponse,
  generateStreamingResponse,
  extractStructured,
  summarize,
} from './ollama';

// Advanced embedding system with multi-model support
export {
  generateEmbedding,
  generateEmbeddingsBatch,
  selectModelForUseCase,
  cosineSimilarity,
  findMostSimilar,
  prepareEventTextForEmbedding,
  prepareQueryForEmbedding,
  type EmbeddingModel,
  type EmbeddingUseCase,
  MODEL_CONFIG,
} from './embeddings';

// Multi-tier extraction system (Llama → Haiku → Sonnet)
export {
  extractEvent,
  extractEventsBatch,
  calculateExtractionCost,
  type ExtractedEvent,
  type ExtractionResult,
} from './extraction';

// Enhanced multi-provider extraction (Llama → Anthropic/OpenAI with auto-routing)
export {
  extractEventEnhanced,
  extractEventsBatchEnhanced,
  calculateExtractionCostEnhanced,
} from './extraction-enhanced';

// OpenAI-specific extraction functions
export {
  extractWithOpenAI,
  extractWithOpenAIFunctions,
  calculateOpenAICost,
  tierToOpenAIModel,
  resetOpenAIClient,
  OPENAI_PRICING,
  type OpenAIModel,
} from './extraction-openai';

// RecAI-inspired personalized ranking
export {
  recallStage,
  coarseRanking,
  fineRanking,
  rankEvents,
  type RankableEvent,
  type RankingContext,
  type UserProfile as RankingUserProfile,
} from './ranking';

// OpenP5-style user modeling
export {
  createUserPersona,
  getOrCreateUserPersona,
  saveUserPersona,
  updatePersonaFromInteraction,
  generatePreferenceEmbedding,
  calculatePersonaEventMatch,
  getTopCategories,
  getPersonalizationInsights,
  type UserPersona,
} from './personalization';

// Qdrant vector database functions
export {
  ensureEventsCollection,
  indexEventVector,
  searchEvents,
  hybridSearch,
  deleteEventVector,
  updateEventVector,
} from './qdrant';

// Redis caching layer
export {
  CacheService,
  cache,
  invalidateCache,
  getCacheStats,
  clearAllCache,
} from './cache';

// Data verification
export {
  verifyEventData,
  type VerificationResult,
} from './verification';

// GPT-based event discovery
export {
  fetchEventsFromGPT,
  type GPTSuggestedEvent,
} from './discovery';
