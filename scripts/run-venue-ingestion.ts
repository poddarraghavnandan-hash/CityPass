import 'dotenv/config';
import { runVenueIngestionForCity } from '../apps/worker/src/venueIngestion';

async function main() {
    console.log('🚀 Starting FULL venue ingestion for New York City');
    console.log('This will discover venues and their events...\n');

    const startTime = Date.now();

    try {
        await runVenueIngestionForCity('New York', 'FULL');

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n✅ Venue ingestion completed in ${duration}s`);

        // Check event count after ingestion
        const { prisma } = await import('@citypass/db');
        const now = new Date();
        const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

        const count = await prisma.event.count({
            where: {
                city: 'New York',
                startTime: {
                    gte: now,
                    lte: threeDaysFromNow
                }
            }
        });

        console.log(`\n📊 NYC Events in next 3 days: ${count.toLocaleString()}`);
        console.log(`Target: 100,000`);
        console.log(`Progress: ${((count / 100000) * 100).toFixed(2)}%`);

    } catch (error: any) {
        console.error('\n❌ Venue ingestion failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

main().catch(console.error).finally(() => process.exit(0));
