"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractEventEnhanced = extractEventEnhanced;
exports.extractEventsBatchEnhanced = extractEventsBatchEnhanced;
exports.calculateExtractionCostEnhanced = calculateExtractionCostEnhanced;
const tslib_1 = require("tslib");
const ollama_1 = require("ollama");
const sdk_1 = tslib_1.__importDefault(require("@anthropic-ai/sdk"));
const extraction_openai_1 = require("./extraction-openai");
const cache_1 = require("./cache");
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const LLM_PROVIDER = process.env.LLM_PROVIDER || 'auto';
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
const TIER_CONFIGS = {
    'tier1-local': {
        level: 'local',
        provider: 'local',
        model: 'llama3.1:8b',
        maxTokens: 4000,
        costPer1M: { input: 0, output: 0 },
    },
    'tier2-anthropic': {
        level: 'cheap',
        provider: 'anthropic',
        model: 'claude-3-haiku-20240307',
        maxTokens: 8000,
        costPer1M: { input: 0.25, output: 1.25 },
    },
    'tier2-openai': {
        level: 'cheap',
        provider: 'openai',
        model: 'gpt-4o-mini',
        maxTokens: 8000,
        costPer1M: { input: 0.15, output: 0.60 },
    },
    'tier3-anthropic': {
        level: 'balanced',
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        maxTokens: 20000,
        costPer1M: { input: 3.0, output: 15.0 },
    },
    'tier3-openai': {
        level: 'balanced',
        provider: 'openai',
        model: 'gpt-4-turbo',
        maxTokens: 20000,
        costPer1M: { input: 10.0, output: 30.0 },
    },
    'tier4-openai': {
        level: 'flagship',
        provider: 'openai',
        model: 'gpt-4o',
        maxTokens: 30000,
        costPer1M: { input: 2.5, output: 10.0 },
    },
};
function selectTier(level, preferredProvider) {
    if (level === 'local') {
        return TIER_CONFIGS['tier1-local'];
    }
    let provider;
    if (LLM_PROVIDER === 'anthropic' || preferredProvider === 'anthropic') {
        provider = 'anthropic';
    }
    else if (LLM_PROVIDER === 'openai' || preferredProvider === 'openai') {
        provider = 'openai';
    }
    else {
        if (level === 'cheap') {
            provider = 'openai';
        }
        else if (level === 'balanced') {
            provider = 'anthropic';
        }
        else {
            provider = 'openai';
        }
    }
    const tierKey = `tier${level === 'cheap' ? '2' : level === 'balanced' ? '3' : '4'}-${provider}`;
    return TIER_CONFIGS[tierKey];
}
async function extractEventEnhanced(html, url, options = {}) {
    const { startTier = 'local', maxRetries = 3, confidenceThreshold = 0.7, skipCache = false, preferredProvider, } = options;
    const extractFn = async () => {
        const tierLevels = ['local', 'cheap', 'balanced', 'flagship'];
        const startIndex = tierLevels.indexOf(startTier);
        let retries = 0;
        for (let i = startIndex; i < tierLevels.length; i++) {
            const tierLevel = tierLevels[i];
            const tier = selectTier(tierLevel, preferredProvider);
            try {
                console.log(`[Extraction] Attempting ${tier.level} tier (${tier.provider}/${tier.model})...`);
                const result = await extractWithTier(html, url, tier);
                if (result.confidence >= confidenceThreshold) {
                    console.log(`[Extraction] Success with ${tier.model} (confidence: ${result.confidence.toFixed(2)})`);
                    return {
                        ...result,
                        retries,
                    };
                }
                console.log(`[Extraction] Low confidence (${result.confidence.toFixed(2)}) from ${tier.model}, escalating...`);
                retries++;
            }
            catch (error) {
                console.error(`[Extraction] Failed with ${tier.model}:`, error);
                retries++;
                if (LLM_PROVIDER === 'auto' && tierLevel !== 'local' && i < tierLevels.length - 1) {
                    const alternateProvider = tier.provider === 'anthropic' ? 'openai' : 'anthropic';
                    const alternateTier = selectTier(tierLevel, alternateProvider);
                    try {
                        console.log(`[Extraction] Trying alternate provider: ${alternateTier.provider}/${alternateTier.model}`);
                        const result = await extractWithTier(html, url, alternateTier);
                        if (result.confidence >= confidenceThreshold) {
                            return { ...result, retries };
                        }
                    }
                    catch (altError) {
                        console.error(`[Extraction] Alternate provider also failed:`, altError);
                    }
                }
                continue;
            }
        }
        throw new Error('All extraction tiers exhausted without success');
    };
    if (USE_CACHE && !skipCache) {
        return (0, cache_1.cacheExtraction)(html, url, extractFn);
    }
    return extractFn();
}
async function extractWithTier(html, url, tier) {
    const cleanedHtml = cleanHtml(html);
    const truncatedHtml = cleanedHtml.slice(0, tier.maxTokens);
    const prompt = createExtractionPrompt(truncatedHtml, url);
    let data;
    let tokens = { input: 0, output: 0 };
    let cost = 0;
    if (tier.provider === 'local') {
        const ollama = getOllamaClient();
        const response = await ollama.generate({
            model: tier.model,
            prompt,
            format: 'json',
        });
        const jsonMatch = response.response.match(/\{[\s\S]*\}/);
        if (!jsonMatch)
            throw new Error('No JSON in Llama response');
        data = JSON.parse(jsonMatch[0]);
        tokens = {
            input: Math.ceil(prompt.length / 4),
            output: Math.ceil(response.response.length / 4),
        };
        cost = 0;
    }
    else if (tier.provider === 'anthropic') {
        const anthropic = getAnthropicClient();
        const message = await anthropic.messages.create({
            model: tier.model,
            max_tokens: 2048,
            messages: [{ role: 'user', content: prompt }],
        });
        const responseText = message.content
            .filter(block => block.type === 'text')
            .map(block => block.text)
            .join('\n');
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch)
            throw new Error('No JSON in Claude response');
        data = JSON.parse(jsonMatch[0]);
        tokens = {
            input: message.usage.input_tokens,
            output: message.usage.output_tokens,
        };
        cost =
            (tokens.input / 1000000) * tier.costPer1M.input +
                (tokens.output / 1000000) * tier.costPer1M.output;
    }
    else {
        const result = await (0, extraction_openai_1.extractWithOpenAI)(prompt, tier.model);
        data = result.data;
        tokens = result.tokens;
        cost = (0, extraction_openai_1.calculateOpenAICost)(tier.model, tokens);
    }
    const confidence = calculateConfidence(data);
    return {
        data,
        confidence,
        tier: `${tier.provider}-${tier.level}`,
        retries: 0,
        tokens,
        cost,
    };
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
  "category": "MUSIC, ARTS, FOOD, SPORTS, THEATRE, NIGHTLIFE, etc (optional)",
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
async function extractEventsBatchEnhanced(htmlContents, options = {}) {
    const { startTier = 'local', maxConcurrent = 5, confidenceThreshold = 0.7 } = options;
    const results = [];
    for (let i = 0; i < htmlContents.length; i += maxConcurrent) {
        const batch = htmlContents.slice(i, i + maxConcurrent);
        const batchPromises = batch.map(({ html, url }) => extractEventEnhanced(html, url, { startTier, confidenceThreshold }));
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
function calculateExtractionCostEnhanced(results) {
    const breakdown = {};
    let totalCost = 0;
    let totalConfidence = 0;
    for (const result of results) {
        const tierKey = result.tier;
        if (!breakdown[tierKey]) {
            breakdown[tierKey] = { count: 0, cost: 0 };
        }
        breakdown[tierKey].count++;
        breakdown[tierKey].cost += result.cost || 0;
        totalCost += result.cost || 0;
        totalConfidence += result.confidence;
    }
    return {
        totalCost,
        breakdown,
        avgConfidence: results.length > 0 ? totalConfidence / results.length : 0,
    };
}
//# sourceMappingURL=extraction-enhanced.js.map