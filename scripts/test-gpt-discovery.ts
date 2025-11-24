import 'dotenv/config';
import { fetchEventsFromGPT } from '@citypass/llm';
import { prisma } from '@citypass/db';

async function main() {
    console.log('--- Testing GPT Event Discovery ---');

    const query = 'live jazz music tonight';
    console.log(`Query: "${query}"`);

    console.log('Fetching events from GPT...');
    const events = await fetchEventsFromGPT(query, 'New York');

    console.log(`Found ${events.length} events:`);
    events.forEach(e => {
        console.log(`- ${e.title} @ ${e.venueName} (${e.startTime})`);
        console.log(`  URL: ${e.url}`);
    });

    if (events.length > 0) {
        console.log('\nVerifying source capture in DB...');
        // Wait a bit for async capture
        await new Promise(resolve => setTimeout(resolve, 2000));

        const url = events[0].url;
        const source = await prisma.source.findUnique({
            where: { url: url }
        });

        if (source) {
            console.log(`✅ PASS: Source captured for URL: ${url}`);
            console.log(`  Name: ${source.name}, Type: ${source.sourceType}, Method: ${source.crawlMethod}`);
        } else {
            console.log(`❌ FAIL: Source NOT found for URL: ${url}`);
        }
    } else {
        console.log('⚠️ No events found, cannot verify source capture.');
    }
}

main().catch(console.error);
