"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEmbedding = generateEmbedding;
exports.generateEmbeddings = generateEmbeddings;
exports.rerank = rerank;
exports.generateResponse = generateResponse;
exports.generateStreamingResponse = generateStreamingResponse;
exports.extractStructured = extractStructured;
exports.summarize = summarize;
const ollama_1 = require("ollama");
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
let ollamaClient = null;
function getOllamaClient() {
    if (!ollamaClient) {
        ollamaClient = new ollama_1.Ollama({ host: OLLAMA_HOST });
    }
    return ollamaClient;
}
async function generateEmbedding(text) {
    const ollama = getOllamaClient();
    const response = await ollama.embeddings({
        model: 'bge-m3',
        prompt: text,
    });
    return response.embedding;
}
async function generateEmbeddings(texts) {
    const embeddings = [];
    for (const text of texts) {
        const embedding = await generateEmbedding(text);
        embeddings.push(embedding);
    }
    return embeddings;
}
async function rerank(query, documents) {
    const ollama = getOllamaClient();
    const results = [];
    for (const doc of documents) {
        const response = await ollama.embeddings({
            model: 'bge-reranker-v2-m3',
            prompt: `Query: ${query}\nDocument: ${doc.text}`,
        });
        const score = response.embedding[0];
        results.push({
            ...doc,
            score,
        });
    }
    return results.sort((a, b) => b.score - a.score);
}
async function generateResponse(prompt, systemPrompt) {
    const ollama = getOllamaClient();
    const response = await ollama.generate({
        model: 'llama3.1:8b',
        prompt,
        system: systemPrompt,
    });
    return response.response;
}
async function generateStreamingResponse(prompt, systemPrompt, onChunk) {
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
async function extractStructured(text, schema) {
    const systemPrompt = `Extract information from the text according to this JSON schema: ${JSON.stringify(schema)}. Return ONLY valid JSON, no explanations.`;
    const response = await generateResponse(text, systemPrompt);
    try {
        return JSON.parse(response);
    }
    catch (error) {
        throw new Error(`Failed to parse LLM response as JSON: ${response}`);
    }
}
async function summarize(text, maxLength = 200) {
    const systemPrompt = `Summarize the following text in no more than ${maxLength} characters. Be concise and capture key information.`;
    return await generateResponse(text, systemPrompt);
}
//# sourceMappingURL=ollama.js.map