import { QdrantClient } from '@qdrant/js-client-rest';
import Typesense from 'typesense';
const qdrantClient = new QdrantClient({
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY,
});
const typesenseClient = new Typesense.Client({
    nodes: [
        {
            host: process.env.TYPESENSE_HOST || 'localhost',
            port: parseInt(process.env.TYPESENSE_PORT || '8108'),
            protocol: process.env.TYPESENSE_PROTOCOL || 'http',
        },
    ],
    apiKey: process.env.TYPESENSE_API_KEY || 'xyz',
    connectionTimeoutSeconds: 2,
});
const QDRANT_COLLECTION = 'events_e5';
const TYPESENSE_COLLECTION = 'events';
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'e5-base-v2';
const cache = new Map();
function getCached(key) {
    const entry = cache.get(key);
    if (!entry)
        return null;
    if (Date.now() > entry.expires) {
        cache.delete(key);
        return null;
    }
    return entry.data;
}
function setCache(key, data, ttlMs = 60000) {
    cache.set(key, { data, expires: Date.now() + ttlMs });
}
async function generateEmbedding(text) {
    console.warn('⚠️ Using mock embeddings. Configure EMBEDDING_SERVICE_URL for production.');
    const embeddingUrl = process.env.EMBEDDING_SERVICE_URL;
    if (!embeddingUrl) {
        return Array.from({ length: 768 }, () => Math.random() - 0.5);
    }
    try {
        const response = await fetchWithTimeout(embeddingUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, model: EMBEDDING_MODEL }),
        }, 3000);
        if (!response.ok) {
            throw new Error(`Embedding service error: ${response.status}`);
        }
        const data = await response.json();
        return data.embedding;
    }
    catch (error) {
        console.error('Embedding generation failed:', error.message);
        return Array.from({ length: 768 }, () => 0);
    }
}
async function searchQdrant(queryText, intention, topK = 100) {
    try {
        const embedding = await generateEmbedding(queryText);
        const filter = {
            must: [
                { key: 'city', match: { value: intention.city } },
            ],
        };
        const searchResult = await qdrantClient.search(QDRANT_COLLECTION, {
            vector: embedding,
            filter,
            limit: topK,
            with_payload: true,
        });
        return searchResult.map((hit) => ({
            id: hit.id.toString(),
            title: hit.payload.title,
            description: hit.payload.description || null,
            category: hit.payload.category || null,
            startTime: new Date(hit.payload.startTime),
            priceMin: hit.payload.priceMin ?? null,
            priceMax: hit.payload.priceMax ?? null,
            venueName: hit.payload.venueName || null,
            city: hit.payload.city,
            lat: hit.payload.lat ?? null,
            lon: hit.payload.lon ?? null,
            tags: hit.payload.tags || null,
            bookingUrl: hit.payload.bookingUrl || null,
            imageUrl: hit.payload.imageUrl || null,
            score: hit.score,
            source: 'vector',
        }));
    }
    catch (error) {
        console.error('Qdrant search failed:', error.message);
        return [];
    }
}
async function searchTypesense(queryText, intention, topK = 100) {
    try {
        const now = new Date(intention.nowISO);
        const untilTimestamp = Math.floor((now.getTime() + intention.tokens.untilMinutes * 60000) / 1000);
        const nowTimestamp = Math.floor(now.getTime() / 1000);
        const filterBy = [
            `city:=${intention.city}`,
            `start_time:>=${nowTimestamp}`,
            `start_time:<=${untilTimestamp}`,
        ];
        const searchParams = {
            q: queryText || '*',
            query_by: 'title,description,venue_name,neighborhood,tags',
            filter_by: filterBy.join(' && '),
            sort_by: '_text_match:desc,start_time:asc',
            per_page: topK,
        };
        const searchResult = await typesenseClient
            .collections(TYPESENSE_COLLECTION)
            .documents()
            .search(searchParams);
        return (searchResult.hits || []).map((hit) => {
            const doc = hit.document;
            return {
                id: doc.id,
                title: doc.title,
                description: doc.description || null,
                category: doc.category || null,
                startTime: new Date(doc.start_time * 1000),
                priceMin: doc.price_min ?? null,
                priceMax: doc.price_max ?? null,
                venueName: doc.venue_name || null,
                city: doc.city,
                lat: doc.lat ?? null,
                lon: doc.lon ?? null,
                tags: doc.tags || null,
                bookingUrl: doc.booking_url || null,
                imageUrl: doc.image_url || null,
                score: hit.text_match_info?.score || 0,
                source: 'keyword',
            };
        });
    }
    catch (error) {
        console.error('Typesense search failed:', error.message);
        return [];
    }
}
function unionCandidates(vectorCandidates, keywordCandidates) {
    const seen = new Set();
    const unioned = [];
    for (const candidate of vectorCandidates) {
        if (!seen.has(candidate.id)) {
            seen.add(candidate.id);
            unioned.push(candidate);
        }
    }
    for (const candidate of keywordCandidates) {
        if (!seen.has(candidate.id)) {
            seen.add(candidate.id);
            unioned.push({ ...candidate, source: 'hybrid' });
        }
    }
    return unioned;
}
async function rerankCandidates(queryText, candidates, topN = 20) {
    const rerankerUrl = process.env.RERANKER_ENDPOINT_URL;
    if (!rerankerUrl) {
        console.warn('⚠️ RERANKER_ENDPOINT_URL not configured. Skipping rerank.');
        return candidates.slice(0, topN);
    }
    try {
        const passages = candidates.map(c => `${c.title}. ${c.description || ''}`);
        const response = await fetchWithTimeout(rerankerUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: queryText, passages }),
        }, 5000);
        if (!response.ok) {
            throw new Error(`Reranker service error: ${response.status}`);
        }
        const data = await response.json();
        const scores = (data.scores || []);
        const reranked = candidates.map((candidate, index) => ({
            ...candidate,
            score: scores[index] ?? candidate.score,
        }));
        reranked.sort((a, b) => b.score - a.score);
        return reranked.slice(0, topN);
    }
    catch (error) {
        console.error('Reranker failed:', error.message);
        return candidates.slice(0, topN);
    }
}
async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        return response;
    }
    finally {
        clearTimeout(timeout);
    }
}
export async function retrieve(queryText, intention, options = {}) {
    const { topK = 100, rerankTop = 20, useReranker = true, timeout = 7000, cacheKey, } = options;
    const startTime = Date.now();
    if (cacheKey) {
        const cached = getCached(cacheKey);
        if (cached) {
            console.log('✅ Cache hit:', cacheKey);
            return cached;
        }
    }
    const searchPromise = Promise.all([
        searchQdrant(queryText, intention, topK),
        searchTypesense(queryText, intention, topK),
    ]);
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Retrieval timeout')), timeout));
    let vectorCandidates = [];
    let keywordCandidates = [];
    try {
        [vectorCandidates, keywordCandidates] = await Promise.race([
            searchPromise,
            timeoutPromise,
        ]);
    }
    catch (error) {
        console.error('Retrieval error:', error.message);
    }
    let candidates = unionCandidates(vectorCandidates, keywordCandidates);
    let rerankApplied = false;
    if (useReranker && process.env.RERANKER_ENDPOINT_URL) {
        try {
            candidates = await rerankCandidates(queryText, candidates, rerankTop);
            rerankApplied = true;
        }
        catch (error) {
            console.error('Rerank failed:', error.message);
            candidates = candidates.slice(0, rerankTop);
        }
    }
    else {
        candidates = candidates.slice(0, rerankTop);
    }
    const latencyMs = Date.now() - startTime;
    const result = {
        candidates,
        vectorCount: vectorCandidates.length,
        keywordCount: keywordCandidates.length,
        rerankApplied,
        latencyMs,
    };
    if (cacheKey) {
        setCache(cacheKey, result);
    }
    console.log(`📊 Retrieved ${candidates.length} candidates (vector: ${vectorCandidates.length}, keyword: ${keywordCandidates.length}) in ${latencyMs}ms`);
    return result;
}
export async function healthCheck() {
    let qdrantHealthy = false;
    let typesenseHealthy = false;
    let rerankerHealthy = false;
    try {
        await qdrantClient.getCollections();
        qdrantHealthy = true;
    }
    catch (error) {
        console.error('Qdrant health check failed');
    }
    try {
        await typesenseClient.collections().retrieve();
        typesenseHealthy = true;
    }
    catch (error) {
        console.error('Typesense health check failed');
    }
    if (process.env.RERANKER_ENDPOINT_URL) {
        try {
            const response = await fetchWithTimeout(`${process.env.RERANKER_ENDPOINT_URL}/health`, { method: 'GET' }, 2000);
            rerankerHealthy = response.ok;
        }
        catch (error) {
            console.error('Reranker health check failed');
        }
    }
    return { qdrant: qdrantHealthy, typesense: typesenseHealthy, reranker: rerankerHealthy };
}
//# sourceMappingURL=retriever.js.map