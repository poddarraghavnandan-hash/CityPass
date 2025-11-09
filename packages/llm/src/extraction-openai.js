"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OPENAI_PRICING = void 0;
exports.extractWithOpenAI = extractWithOpenAI;
exports.calculateOpenAICost = calculateOpenAICost;
exports.tierToOpenAIModel = tierToOpenAIModel;
exports.extractWithOpenAIFunctions = extractWithOpenAIFunctions;
const tslib_1 = require("tslib");
const openai_1 = tslib_1.__importDefault(require("openai"));
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
let openaiClient = null;
function getOpenAIClient() {
    if (!openaiClient) {
        openaiClient = new openai_1.default({ apiKey: OPENAI_API_KEY });
    }
    return openaiClient;
}
exports.OPENAI_PRICING = {
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4-turbo': { input: 10.0, output: 30.0 },
    'gpt-4o': { input: 2.50, output: 10.0 },
};
async function extractWithOpenAI(prompt, model) {
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
        response_format: { type: 'json_object' },
        max_tokens: 2048,
        temperature: 0.1,
    });
    const responseText = completion.choices[0]?.message?.content || '{}';
    let data;
    try {
        const parsed = JSON.parse(responseText);
        data = parsed.event || parsed;
    }
    catch (error) {
        console.error('Failed to parse OpenAI JSON:', responseText);
        throw new Error('OpenAI produced invalid JSON');
    }
    const tokens = {
        input: completion.usage?.prompt_tokens || 0,
        output: completion.usage?.completion_tokens || 0,
    };
    return { data, tokens };
}
function calculateOpenAICost(model, tokens) {
    const pricing = exports.OPENAI_PRICING[model];
    return ((tokens.input / 1000000) * pricing.input +
        (tokens.output / 1000000) * pricing.output);
}
function tierToOpenAIModel(tier) {
    const mapping = {
        mini: 'gpt-4o-mini',
        turbo: 'gpt-4-turbo',
        flagship: 'gpt-4o',
    };
    return mapping[tier];
}
async function extractWithOpenAIFunctions(prompt, model) {
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
    const data = JSON.parse(functionCall.arguments);
    const tokens = {
        input: completion.usage?.prompt_tokens || 0,
        output: completion.usage?.completion_tokens || 0,
    };
    return { data, tokens };
}
//# sourceMappingURL=extraction-openai.js.map