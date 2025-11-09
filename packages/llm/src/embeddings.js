"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODEL_CONFIG = void 0;
exports.selectModelForUseCase = selectModelForUseCase;
exports.generateEmbedding = generateEmbedding;
exports.generateEmbeddingsBatch = generateEmbeddingsBatch;
exports.normalizeVector = normalizeVector;
exports.cosineSimilarity = cosineSimilarity;
exports.findMostSimilar = findMostSimilar;
exports.prepareEventTextForEmbedding = prepareEventTextForEmbedding;
exports.prepareQueryForEmbedding = prepareQueryForEmbedding;
const tslib_1 = require("tslib");
const ollama_1 = require("ollama");
const sdk_1 = tslib_1.__importDefault(require("@anthropic-ai/sdk"));
const cache_1 = require("./cache");
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const USE_CACHE = process.env.USE_EMBEDDING_CACHE !== 'false';
let ollamaClient = null;
let anthropicClient = null;
function getOllamaClient() {
    if (!ollamaClient) {
        ollamaClient = new ollama_1.Ollama({ host: OLLAMA_HOST });
    }
    return ollamaClient;
}
function getAnthropicClient() {
    if (!anthropicClient) {
        anthropicClient = new sdk_1.default({ apiKey: ANTHROPIC_API_KEY });
    }
    return anthropicClient;
}
exports.MODEL_CONFIG = {
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
};
function selectModelForUseCase(useCase, preferLocal = true) {
    const useCasePreferences = {
        'event-indexing': ['bge-m3', 'e5-base-v2', 'voyage-2'],
        'query-search': ['gte-small', 'minilm-l6-v2', 'e5-base-v2'],
        'event-similarity': ['e5-base-v2', 'bge-m3', 'gte-small'],
        'reranking': ['bge-m3', 'e5-base-v2'],
        'user-preference': ['e5-base-v2', 'gte-small', 'bge-m3'],
        'category-matching': ['gte-small', 'minilm-l6-v2'],
        'domain-specific': ['e5-base-v2', 'bge-m3'],
    };
    const preferences = useCasePreferences[useCase];
    for (const model of preferences) {
        const config = exports.MODEL_CONFIG[model];
        if (preferLocal && config.provider === 'ollama') {
            return model;
        }
        if (!preferLocal) {
            return model;
        }
    }
    return preferences[0];
}
async function generateEmbedding(text, options = {}) {
    const { useCase = 'event-similarity', model = selectModelForUseCase(useCase, true), normalize = true, skipCache = false, } = options;
    const config = exports.MODEL_CONFIG[model];
    const generateFn = async () => {
        let embedding;
        if (config.provider === 'ollama') {
            embedding = await generateOllamaEmbedding(text, model);
        }
        else {
            throw new Error(`API-based embedding model ${model} not yet implemented`);
        }
        if (normalize) {
            return normalizeVector(embedding);
        }
        return embedding;
    };
    if (USE_CACHE && !skipCache) {
        return (0, cache_1.cacheEmbedding)(text, model, generateFn);
    }
    return generateFn();
}
async function generateEmbeddingsBatch(texts, options = {}) {
    const { useCase = 'event-indexing', model = selectModelForUseCase(useCase, true), batchSize = 10, normalize = true, skipCache = false, } = options;
    const generateAllFn = async () => {
        const embeddings = [];
        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            const batchPromises = batch.map(text => generateEmbedding(text, { model, useCase, normalize, skipCache: true }));
            const batchEmbeddings = await Promise.all(batchPromises);
            embeddings.push(...batchEmbeddings);
        }
        return embeddings;
    };
    if (USE_CACHE && !skipCache) {
        return (0, cache_1.cacheEmbeddingsBatch)(texts, model, generateAllFn);
    }
    return generateAllFn();
}
async function generateOllamaEmbedding(text, model) {
    const ollama = getOllamaClient();
    try {
        const response = await ollama.embeddings({
            model: getOllamaModelName(model),
            prompt: text,
        });
        return response.embedding;
    }
    catch (error) {
        console.error(`Ollama embedding failed for model ${model}:`, error);
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
function getOllamaModelName(model) {
    const modelNames = {
        'bge-m3': 'bge-m3',
        'e5-base-v2': 'nomic-embed-text',
        'gte-small': 'nomic-embed-text',
        'minilm-l6-v2': 'all-minilm',
    };
    return modelNames[model] || model;
}
function normalizeVector(vector) {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude === 0) {
        return vector;
    }
    return vector.map(val => val / magnitude);
}
function cosineSimilarity(a, b) {
    if (a.length !== b.length) {
        throw new Error('Vectors must have same dimensions');
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
function findMostSimilar(queryEmbedding, candidateEmbeddings) {
    const similarities = candidateEmbeddings.map((embedding, index) => ({
        index,
        similarity: cosineSimilarity(queryEmbedding, embedding),
    }));
    return similarities.sort((a, b) => b.similarity - a.similarity);
}
function prepareEventTextForEmbedding(event) {
    const parts = [];
    parts.push(event.title);
    if (event.category) {
        parts.push(`Category: ${event.category}`);
    }
    if (event.venueName) {
        parts.push(`Venue: ${event.venueName}`);
    }
    if (event.neighborhood) {
        parts.push(`Location: ${event.neighborhood}`);
    }
    if (event.description) {
        const desc = event.description.slice(0, 500);
        parts.push(desc);
    }
    if (event.tags && event.tags.length > 0) {
        parts.push(`Tags: ${event.tags.join(', ')}`);
    }
    parts.push(event.title);
    return parts.join('\n\n');
}
function prepareQueryForEmbedding(query, context) {
    const parts = [query];
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
//# sourceMappingURL=embeddings.js.map