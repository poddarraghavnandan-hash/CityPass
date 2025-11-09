"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureEventsCollection = ensureEventsCollection;
exports.indexEventVector = indexEventVector;
exports.searchEvents = searchEvents;
exports.hybridSearch = hybridSearch;
exports.deleteEventVector = deleteEventVector;
exports.updateEventVector = updateEventVector;
const js_client_rest_1 = require("@qdrant/js-client-rest");
const ollama_1 = require("./ollama");
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const EVENTS_COLLECTION = 'events';
const VECTOR_SIZE = 1024;
let qdrantClient = null;
function getQdrantClient() {
    if (!qdrantClient) {
        qdrantClient = new js_client_rest_1.QdrantClient({ url: QDRANT_URL });
    }
    return qdrantClient;
}
async function ensureEventsCollection() {
    const client = getQdrantClient();
    try {
        await client.getCollection(EVENTS_COLLECTION);
        console.log(`✓ Qdrant collection '${EVENTS_COLLECTION}' exists`);
    }
    catch (error) {
        console.log(`Creating Qdrant collection '${EVENTS_COLLECTION}'...`);
        await client.createCollection(EVENTS_COLLECTION, {
            vectors: {
                size: VECTOR_SIZE,
                distance: 'Cosine',
            },
        });
        await client.createPayloadIndex(EVENTS_COLLECTION, {
            field_name: 'city',
            field_schema: 'keyword',
        });
        await client.createPayloadIndex(EVENTS_COLLECTION, {
            field_name: 'category',
            field_schema: 'keyword',
        });
        await client.createPayloadIndex(EVENTS_COLLECTION, {
            field_name: 'startTime',
            field_schema: 'datetime',
        });
        console.log(`✓ Created Qdrant collection '${EVENTS_COLLECTION}'`);
    }
}
async function indexEventVector(event) {
    const client = getQdrantClient();
    const searchableText = [
        event.title,
        event.description || '',
        event.category || '',
        event.venueName || '',
        event.neighborhood || '',
        event.tags.join(' '),
    ]
        .filter(Boolean)
        .join(' ');
    const embedding = await (0, ollama_1.generateEmbedding)(searchableText);
    const qdrantId = crypto.randomUUID();
    await client.upsert(EVENTS_COLLECTION, {
        wait: true,
        points: [
            {
                id: qdrantId,
                vector: embedding,
                payload: {
                    eventId: event.id,
                    title: event.title,
                    description: event.description,
                    category: event.category,
                    venueName: event.venueName,
                    neighborhood: event.neighborhood,
                    city: event.city,
                    startTime: event.startTime.toISOString(),
                    priceMin: event.priceMin,
                    priceMax: event.priceMax,
                    tags: event.tags,
                },
            },
        ],
    });
    return qdrantId;
}
async function searchEvents(query, city, limit = 20) {
    const client = getQdrantClient();
    const queryEmbedding = await (0, ollama_1.generateEmbedding)(query);
    const filter = {};
    if (city) {
        filter.must = [
            {
                key: 'city',
                match: { value: city },
            },
        ];
    }
    const results = await client.search(EVENTS_COLLECTION, {
        vector: queryEmbedding,
        limit,
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        with_payload: true,
    });
    return results.map((result) => ({
        eventId: result.payload?.eventId,
        score: result.score,
        title: result.payload?.title,
        description: result.payload?.description,
        category: result.payload?.category,
        venueName: result.payload?.venueName,
    }));
}
async function hybridSearch(query, keywordResults, city, limit = 20) {
    const semanticResults = await searchEvents(query, city, limit);
    const combinedScores = new Map();
    keywordResults.forEach((eventId, index) => {
        const keywordScore = 1 - index / keywordResults.length;
        combinedScores.set(eventId, keywordScore * 0.6);
    });
    semanticResults.forEach((result) => {
        const existing = combinedScores.get(result.eventId) || 0;
        combinedScores.set(result.eventId, existing + result.score * 0.4);
    });
    const sorted = Array.from(combinedScores.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit);
    const resultMap = new Map(semanticResults.map((r) => [r.eventId, r]));
    return sorted.map(([eventId, score]) => {
        const result = resultMap.get(eventId);
        return {
            eventId,
            score,
            title: result?.title || '',
            description: result?.description,
        };
    });
}
async function deleteEventVector(qdrantId) {
    const client = getQdrantClient();
    await client.delete(EVENTS_COLLECTION, {
        wait: true,
        points: [qdrantId],
    });
}
async function updateEventVector(qdrantId, event) {
    await deleteEventVector(qdrantId);
    const searchableText = [
        event.title,
        event.description || '',
        event.category || '',
        event.venueName || '',
        event.neighborhood || '',
        event.tags.join(' '),
    ]
        .filter(Boolean)
        .join(' ');
    const embedding = await (0, ollama_1.generateEmbedding)(searchableText);
    const client = getQdrantClient();
    await client.upsert(EVENTS_COLLECTION, {
        wait: true,
        points: [
            {
                id: qdrantId,
                vector: embedding,
                payload: {
                    eventId: event.id,
                    title: event.title,
                    description: event.description,
                    category: event.category,
                    venueName: event.venueName,
                    neighborhood: event.neighborhood,
                    city: event.city,
                    startTime: event.startTime.toISOString(),
                    priceMin: event.priceMin,
                    priceMax: event.priceMax,
                    tags: event.tags,
                },
            },
        ],
    });
}
//# sourceMappingURL=qdrant.js.map