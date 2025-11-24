import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testEventQuery() {
    try {
        console.log('🔍 Testing event query with production-like parameters...\n');

        const city = 'New York';
        const now = new Date();
        const searchWindow = {
            fromISO: now.toISOString(),
            toISO: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        };

        console.log(`City: ${city}`);
        console.log(`From: ${searchWindow.fromISO}`);
        console.log(`To: ${searchWindow.toISO}\n`);

        // Test the exact query used in contextAssembler
        const whereClause = {
            city,
            startTime: {
                gte: new Date(searchWindow.fromISO),
                lte: new Date(searchWindow.toISO),
            },
        };

        const events = await prisma.event.findMany({
            where: whereClause,
            take: 100,
            orderBy: { startTime: 'asc' },
            select: {
                id: true,
                title: true,
                startTime: true,
                city: true,
                category: true,
                venueName: true,
                priceMin: true,
                priceMax: true,
            },
        });

        console.log(`✅ Found ${events.length} events\n`);

        if (events.length > 0) {
            console.log('📝 First 5 events:');
            events.slice(0, 5).forEach((event, i) => {
                console.log(`  ${i + 1}. ${event.title}`);
                console.log(`     ${event.venueName || 'No venue'} | ${event.category || 'No category'}`);
                console.log(`     ${event.startTime.toISOString()}`);
                console.log(`     Price: $${event.priceMin || 0}-$${event.priceMax || 0}\n`);
            });
        } else {
            console.log('❌ No events found!');
            console.log('\nTrying broader query...\n');

            // Try without time constraint
            const allEvents = await prisma.event.findMany({
                where: { city },
                take: 10,
                orderBy: { startTime: 'desc' },
                select: {
                    id: true,
                    title: true,
                    startTime: true,
                    city: true,
                },
            });

            console.log(`Found ${allEvents.length} total events in ${city}`);
            if (allEvents.length > 0) {
                console.log('\nSample events (any time):');
                allEvents.forEach((e, i) => {
                    console.log(`  ${i + 1}. ${e.title} - ${e.startTime.toISOString()}`);
                });
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testEventQuery();
