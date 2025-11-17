const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function checkDatabase() {
  try {
    console.log('Checking database connection...');
    console.log('Using DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 50) + '...');

    // Test connection
    await prisma.$connect();
    console.log('✓ Database connected successfully\n');

    // Count events
    const eventCount = await prisma.event.count();
    console.log(`Total events in database: ${eventCount}\n`);

    if (eventCount > 0) {
      // Get sample events
      const sampleEvents = await prisma.event.findMany({
        take: 5,
        orderBy: {
          createdAt: 'desc'
        },
        select: {
          id: true,
          title: true,
          startDate: true,
          city: true,
          createdAt: true
        }
      });

      console.log('Sample events:');
      sampleEvents.forEach(event => {
        console.log(`- ${event.title} (${event.city}) - ${event.startDate}`);
      });
    } else {
      console.log('⚠ No events found in database!');
    }

  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
