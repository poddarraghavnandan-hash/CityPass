
import { prisma } from '@citypass/db';
import { indexEventVector } from '@citypass/llm';

async function main() {
    console.log('--- Generating Embeddings for All Events ---');
    console.log(`LLM_PROVIDER: ${process.env.LLM_PROVIDER}`);
    console.log(`EMBEDDING_PROVIDER: ${process.env.EMBEDDING_PROVIDER}`);

    // 1. Fetch all events
    console.log('\n[Fetch] Fetching all events from DB...');
    const events = await prisma.event.findMany({
        include: { vector: true }
    });
    console.log(`[Fetch] Found ${events.length} events.`);

    let successCount = 0;
    let failCount = 0;

    // 2. Process each event
    for (const event of events) {
        try {
            console.log(`[Processing] "${event.title}" (${event.id})...`);

            // Index in Qdrant (generates embedding + upserts)
            const qdrantId = await indexEventVector({
                id: event.id,
                title: event.title,
                description: event.description,
                category: event.category,
                venueName: event.venueName,
                neighborhood: event.neighborhood,
                city: event.city,
                startTime: event.startTime,
                priceMin: event.priceMin,
                priceMax: event.priceMax,
                tags: event.tags
            });

            // Update Postgres reference
            await prisma.eventVector.upsert({
                where: { eventId: event.id },
                create: {
                    eventId: event.id,
                    qdrantId: qdrantId,
                    embeddingVersion: process.env.EMBEDDING_PROVIDER === 'openai' ? 'text-embedding-3-small' : 'bge-m3',
                    lastEmbeddedAt: new Date()
                },
                update: {
                    qdrantId: qdrantId,
                    embeddingVersion: process.env.EMBEDDING_PROVIDER === 'openai' ? 'text-embedding-3-small' : 'bge-m3',
                    lastEmbeddedAt: new Date()
                }
            });

            console.log(`   ✓ Indexed (Qdrant ID: ${qdrantId})`);
            successCount++;
        } catch (error) {
            console.error(`   ✗ Failed: ${error}`);
            failCount++;
        }
    }

    console.log(`\n--- Summary ---`);
    console.log(`Total: ${events.length}`);
    console.log(`Success: ${successCount}`);
    console.log(`Failed: ${failCount}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
