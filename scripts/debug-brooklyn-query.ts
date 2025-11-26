import 'dotenv/config';
import { fetchEventsFromGPT } from '../packages/llm/src/discovery';

async function main() {
    const query = "An evening where we can walk, eat, and talk in Brooklyn";
    const city = "New York";

    console.log(`Testing query: "${query}" for city: "${city}"`);
    console.log('---------------------------------------------------');

    try {
        console.log('Calling fetchEventsFromGPT...');
        const start = Date.now();
        const events = await fetchEventsFromGPT(query, city);
        const duration = Date.now() - start;

        console.log(`\nGPT Response Time: ${duration}ms`);
        console.log(`Events Found: ${events.length}`);

        if (events.length === 0) {
            console.log('\n❌ NO EVENTS FOUND.');
            console.log('Possible reasons:');
            console.log('1. Prompt constraints (GPT didnt find "specific events" matching the vibe)');
            console.log('2. Strict JSON parsing failure');
            console.log('3. API refusal');
        } else {
            console.log('\n✅ Events Returned:');
            events.forEach((e, i) => {
                console.log(`\n[${i + 1}] ${e.title}`);
                console.log(`    Venue: ${e.venueName}`);
                console.log(`    Neighborhood: ${e.neighborhood}`);
                console.log(`    Time: ${e.startTime}`);
                console.log(`    URL: ${e.url}`);
                console.log(`    Category: ${e.category}`);
            });
        }

    } catch (error) {
        console.error('Error executing fetchEventsFromGPT:', error);
    }
}

main();
