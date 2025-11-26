import 'dotenv/config';
import { fetchEventsFromGPT } from '../packages/llm/src/discovery';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface TestCase {
    query: string;
    city: string;
    expectedCategory: string;
    expectedKeywords: string[];
}

const TEST_CASES: TestCase[] = [
    {
        query: "yoga classes in chelsea",
        city: "New York",
        expectedCategory: "FITNESS",
        expectedKeywords: ["yoga", "pilates", "stretch", "chelsea"]
    },
    {
        query: "jazz music in the village",
        city: "New York",
        expectedCategory: "MUSIC",
        expectedKeywords: ["jazz", "blue note", "vanguard", "village"]
    },
    {
        query: "comedy shows for a date night",
        city: "New York",
        expectedCategory: "COMEDY",
        expectedKeywords: ["comedy", "standup", "laugh"]
    },
    {
        query: "art galleries opening tonight",
        city: "New York",
        expectedCategory: "ART",
        expectedKeywords: ["art", "gallery", "exhibition", "opening"]
    }
];

async function evaluateResult(query: string, events: any[]): Promise<{ pass: boolean; reason: string }> {
    if (events.length === 0) return { pass: false, reason: "No events returned" };

    const prompt = `
    Query: "${query}"
    Returned Events:
    ${JSON.stringify(events.map(e => ({ title: e.title, description: e.description, venue: e.venueName, category: e.category })), null, 2)}

    Evaluate if these events are RELEVANT to the query.
    - If the user asked for "yoga", are these yoga classes?
    - If the user asked for "chelsea", are they in/near Chelsea?
    
    Return a JSON object:
    {
      "pass": boolean,
      "reason": "short explanation"
    }
  `;

    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
    });

    return JSON.parse(response.choices[0].message.content || '{"pass": false, "reason": "LLM error"}');
}

async function main() {
    console.log('🧪 Starting Synthetic Test Suite...');
    console.log('===================================');

    let passed = 0;
    let failed = 0;

    for (const test of TEST_CASES) {
        console.log(`\nTesting: "${test.query}"`);

        try {
            const events = await fetchEventsFromGPT(test.query, test.city);
            console.log(`   Found ${events.length} events`);

            const evaluation = await evaluateResult(test.query, events);

            if (evaluation.pass) {
                console.log(`   ✅ PASS: ${evaluation.reason}`);
                passed++;
            } else {
                console.log(`   ❌ FAIL: ${evaluation.reason}`);
                failed++;

                // Log the failed events for inspection
                events.forEach(e => console.log(`      - ${e.title} @ ${e.venueName}`));
            }

        } catch (error) {
            console.error(`   ❌ ERROR: ${error}`);
            failed++;
        }
    }

    console.log('\n===================================');
    console.log(`Summary: ${passed} Passed, ${failed} Failed`);

    if (failed > 0) process.exit(1);
}

main();
