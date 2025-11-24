import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
    try {
        console.log('🔍 Checking database connection...');

        // Check if we can connect
        await prisma.$connect();
        console.log('✅ Database connected');

        // Count events
        const eventCount = await prisma.event.count();
        console.log(`📊 Total events in database: ${eventCount}`);

        // Get a few sample events
        const sampleEvents = await prisma.event.findMany({
            take: 3,
            select: {
                id: true,
                title: true,
                city: true,
                startTime: true,
                category: true,
            },
        });

        console.log('\n📝 Sample events:');
        sampleEvents.forEach((event, i) => {
            console.log(`  ${i + 1}. ${event.title} (${event.city}) - ${event.startTime.toISOString()}`);
        });

        // Check for events in the future
        const futureEvents = await prisma.event.count({
            where: {
                startTime: {
                    gte: new Date(),
                },
            },
        });
        console.log(`\n🔮 Future events: ${futureEvents}`);

        // Check sources
        const sourceCount = await prisma.source.count();
        console.log(`📡 Total sources: ${sourceCount}`);

        // Check venues
        const venueCount = await prisma.venue.count();
        console.log(`🏛️  Total venues: ${venueCount}`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkDatabase();
