"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractEvent = extractEvent;
exports.extractEventsBatch = extractEventsBatch;
exports.calculateExtractionCost = calculateExtractionCost;
const tslib_1 = require("tslib");
const ollama_1 = require("ollama");
const sdk_1 = tslib_1.__importDefault(require("@anthropic-ai/sdk"));
const cache_1 = require("./cache");
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const USE_CACHE = process.env.USE_EXTRACTION_CACHE !== 'false';
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
async function extractEvent(html, url, options = {}) {
    const { startTier = 'llama', maxRetries = 2, confidenceThreshold = 0.7, skipCache = false, } = options;
    const extractFn = async () => {
        let currentTier = startTier;
        let retries = 0;
        let lastError = null;
        const tiers = ['llama', 'haiku', 'sonnet'];
        const startIndex = tiers.indexOf(startTier);
        for (let i = startIndex; i < tiers.length; i++) {
            currentTier = tiers[i];
            try {
                const result = await extractWithTier(html, url, currentTier);
                if (result.confidence >= confidenceThreshold) {
                    return {
                        ...result,
                        retries,
                    };
                }
                console.log(`Low confidence (${result.confidence}) from ${currentTier}, escalating...`);
                retries++;
            }
            catch (error) {
                lastError = error;
                console.error(`Extraction failed with ${currentTier}:`, error);
                retries++;
                if (i < tiers.length - 1) {
                    continue;
                }
                throw new Error(`All extraction tiers failed. Last error: ${lastError.message}`);
            }
        }
        throw new Error('Extraction failed after all retries');
    };
    if (USE_CACHE && !skipCache) {
        return (0, cache_1.cacheExtraction)(html, url, extractFn);
    }
    return extractFn();
}
async function extractWithTier(html, url, tier) {
    const cleanedHtml = cleanHtml(html);
    const maxLength = tier === 'llama' ? 4000 : tier === 'haiku' ? 8000 : 20000;
    const truncatedHtml = cleanedHtml.slice(0, maxLength);
    const prompt = createExtractionPrompt(truncatedHtml, url);
    let data;
    let tokens = { input: 0, output: 0 };
    let cost = 0;
    if (tier === 'llama') {
        const result = await extractWithLlama(prompt);
        data = result.data;
        tokens = result.tokens;
        cost = 0;
    }
    else if (tier === 'haiku') {
        const result = await extractWithClaude(prompt, 'claude-3-haiku-20240307');
        data = result.data;
        tokens = result.tokens;
        cost = (tokens.input / 1000000) * 0.25 + (tokens.output / 1000000) * 1.25;
    }
    else {
        const result = await extractWithClaude(prompt, 'claude-3-5-sonnet-20241022');
        data = result.data;
        tokens = result.tokens;
        cost = (tokens.input / 1000000) * 3.00 + (tokens.output / 1000000) * 15.00;
    }
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
async function extractWithLlama(prompt) {
    const ollama = getOllamaClient();
    const response = await ollama.generate({
        model: 'llama3.1:8b',
        prompt,
        format: 'json',
    });
    let data;
    try {
        const jsonMatch = response.response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in Llama response');
        }
        data = JSON.parse(jsonMatch[0]);
    }
    catch (error) {
        console.error('Failed to parse Llama JSON:', response.response);
        throw new Error('Llama produced invalid JSON');
    }
    const tokens = {
        input: Math.ceil(prompt.length / 4),
        output: Math.ceil(response.response.length / 4),
    };
    return { data, tokens };
}
async function extractWithClaude(prompt, model) {
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
    const responseText = message.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('\n');
    let data;
    try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in Claude response');
        }
        data = JSON.parse(jsonMatch[0]);
    }
    catch (error) {
        console.error('Failed to parse Claude JSON:', responseText);
        throw new Error('Claude produced invalid JSON');
    }
    const tokens = {
        input: message.usage.input_tokens,
        output: message.usage.output_tokens,
    };
    return { data, tokens };
}
function createExtractionPrompt(html, url) {
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
function cleanHtml(html) {
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
function calculateConfidence(event) {
    let score = 0;
    let maxScore = 0;
    maxScore += 30;
    if (event.title && event.title.length > 5)
        score += 30;
    maxScore += 20;
    if (event.startTime) {
        try {
            new Date(event.startTime);
            score += 20;
        }
        catch {
            score += 5;
        }
    }
    maxScore += 15;
    if (event.city && event.city.length > 2)
        score += 15;
    maxScore += 10;
    if (event.description && event.description.length > 20)
        score += 10;
    maxScore += 8;
    if (event.venueName)
        score += 8;
    maxScore += 7;
    if (event.category)
        score += 7;
    maxScore += 5;
    if (event.priceMin !== undefined || event.priceMax !== undefined)
        score += 5;
    maxScore += 5;
    if (event.bookingUrl)
        score += 5;
    return score / maxScore;
}
async function extractEventsBatch(htmlContents, options = {}) {
    const { startTier = 'llama', maxConcurrent = 5, confidenceThreshold = 0.7, } = options;
    const results = [];
    for (let i = 0; i < htmlContents.length; i += maxConcurrent) {
        const batch = htmlContents.slice(i, i + maxConcurrent);
        const batchPromises = batch.map(({ html, url }) => extractEvent(html, url, { startTier, confidenceThreshold }));
        const batchResults = await Promise.allSettled(batchPromises);
        for (const result of batchResults) {
            if (result.status === 'fulfilled') {
                results.push(result.value);
            }
            else {
                console.error('Batch extraction failed:', result.reason);
            }
        }
    }
    return results;
}
function calculateExtractionCost(results) {
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
//# sourceMappingURL=extraction.js.map