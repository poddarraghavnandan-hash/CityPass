import 'dotenv/config';
import { fetchEventsFromGPT } from '../packages/llm/src/discovery';
import { prisma } from '@citypass/db';

async function main() {
    const query = "yoga classes in chelsea";
    const city = "New York";

    console.log(`Testing query: "${query}" for city: "${city}"`);
    console.log('---------------------------------------------------');

    // 1. Check GPT Discovery
    try {
        console.log('\n1. Checking GPT Discovery...');
        const start = Date.now();
        const gptEvents = await fetchEventsFromGPT(query, city);
        const duration = Date.now() - start;

        console.log(`   GPT Response Time: ${duration}ms`);
        console.log(`   Events Found: ${gptEvents.length}`);

        gptEvents.forEach((e, i) => {
            console.log(`   [${i + 1}] ${e.title} (${e.category}) - ${e.neighborhood || 'No Neighborhood'}`);
        });

        if (gptEvents.length === 0) {
            console.log('   ❌ GPT returned 0 events.');
        }
    } catch (error) {
        console.error('   ❌ GPT Discovery Failed:', error);
    }

    // 2. Check Database for Yoga events
    try {
        console.log('\n2. Checking Database for Yoga events...');
        const dbEvents = await prisma.event.findMany({
            where: {
                city: city,
                OR: [
                    { title: { contains: 'yoga', mode: 'insensitive' } },
                    { description: { contains: 'yoga', mode: 'insensitive' } },
                    { category: 'FITNESS' } // Assuming Yoga falls under FITNESS
                ]
            },
            take: 5
        });

        console.log(`   DB Events Found: ${dbEvents.length}`);
        dbEvents.forEach((e, i) => {
            console.log(`   [${i + 1}] ${e.title} (${e.category})`);
        });

        if (dbEvents.length === 0) {
            console.log('   ❌ No Yoga events in DB.');
        }

    } catch (error) {
        console.error('   ❌ DB Check Failed:', error);
    }
}

main();
