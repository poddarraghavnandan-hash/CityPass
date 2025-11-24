import { prisma } from '@citypass/db';
import {
    recallStage,
    fineRanking,
    type RankableEvent,
    type RankingContext,
    generateEmbedding
} from '@citypass/llm';

async function main() {
    console.log('--- Debugging Ranking Pipeline (Relevance) ---');
    console.log(`LLM_PROVIDER: ${process.env.LLM_PROVIDER} `);
    console.log(`EMBEDDING_PROVIDER: ${process.env.EMBEDDING_PROVIDER} `);

    // 1. Check DB Connection & Event Counts
    try {
        const totalEvents = await prisma.event.count();
        const yogaEvents = await prisma.event.count({
            where: {
                OR: [
                    { title: { contains: 'yoga', mode: 'insensitive' } },
                    { description: { contains: 'yoga', mode: 'insensitive' } },
                    { category: { contains: 'yoga', mode: 'insensitive' } }
                ]
            }
        });
        console.log(`[DB] Total events: ${totalEvents} `);
        console.log(`[DB] "Yoga" events: ${yogaEvents} `);

        if (yogaEvents === 0) {
            console.warn('[WARN] No "yoga" events found in DB via text search. Semantic search might still find related concepts, but direct matches are missing.');
        }
    } catch (error) {
        console.error('[DB] Failed to connect to DB:', error);
        return;
    }

    // 2. Test Ranking Pipeline
    const testQuery = "yoga this evening";
    const testCity = "New York";

    console.log(`\n[Test] Query: "${testQuery}", City: "${testCity}"`);

    // Generate embedding for query
    let queryEmbedding: number[] | undefined;
    try {
        console.log('[Embedding] Generating query embedding...');
        queryEmbedding = await generateEmbedding(testQuery);
        console.log(`[Embedding] Success(Length: ${queryEmbedding.length})`);
    } catch (error) {
        console.error('[Embedding] Failed:', error);
    }

    const context: RankingContext = {
        query: testQuery,
        city: testCity,
        timeOfDay: 'evening',
        queryEmbedding
    };

    // 3. Recall Stage
    console.log('\n[Stage 1] Recall...');
    let candidateIds: string[] = [];
    try {
        candidateIds = await recallStage(context, undefined, { maxCandidates: 50 });
        console.log(`[Recall] Found ${candidateIds.length} candidates`);
    } catch (error) {
        console.error('[Recall] Failed:', error);
    }

    if (candidateIds.length === 0) return;

    // 4. Fetch Events
    console.log('\n[Fetch] Fetching event details...');
    const events = await prisma.event.findMany({
        where: { id: { in: candidateIds } },
        include: { vector: true }
    });
    console.log(`[Fetch] Retrieved ${events.length} events from DB`);

    // Map to RankableEvent
    const rankableEvents: RankableEvent[] = events.map(e => ({
        id: e.id,
        title: e.title,
        description: e.description || undefined,
        category: e.category || 'OTHER',
        city: e.city,
        startTime: e.startTime.toISOString(),
        priceMin: e.priceMin || undefined,
        priceMax: e.priceMax || undefined,
        venueName: e.venueName || undefined,
        neighborhood: e.neighborhood || undefined,
        tags: e.tags,
        viewCount: e.viewCount,
        saveCount: e.saveCount,
        shareCount: e.shareCount,
        clickCount: e.clickCount,
        viewCount24h: e.viewCount24h,
        saveCount24h: e.saveCount24h,
        imageUrl: e.imageUrl || undefined,
        hasDescription: !!e.description,
        hasVenue: !!e.venueName,
        hasPrice: e.priceMin !== null,
        embedding: undefined
    }));

    // 5. Fine Ranking
    console.log('\n[Stage 3] Fine Ranking...');
    try {
        const ranked = await fineRanking(rankableEvents, context);
        console.log(`[Ranking] Ranked ${ranked.length} events`);

        console.log('\n--- Top 5 Results ---');
        ranked.slice(0, 5).forEach((r, i) => {
            console.log(`${i + 1}. ${r.event.title} (Score: ${r.score.toFixed(4)})`);
            console.log(`   Reason: ${r.reason} `);
            console.log(`   Features: cat = ${r.features.categoryMatch.toFixed(2)} sem = ${r.features.semanticSimilarity.toFixed(2)} pop = ${r.features.popularity.toFixed(2)} `);
        });
    } catch (error) {
        console.error('[Ranking] Failed:', error);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
