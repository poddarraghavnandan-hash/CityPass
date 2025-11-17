import { prisma } from '@citypass/db';

async function main() {
  const upcoming = await prisma.event.findMany({
    where: { city: 'New York' },
    select: { title: true, startTime: true, category: true },
    take: 10,
    orderBy: { startTime: 'asc' },
  });

  console.log('Upcoming NYC events:');
  upcoming.forEach(e => {
    const date = e.startTime.toISOString().split('T')[0];
    console.log(`  - ${e.title} (${date}, ${e.category})`);
  });

  // Test query with broader date range
  const next30Days = await prisma.event.count({
    where: {
      city: 'New York',
      startTime: {
        gte: new Date(),
        lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    },
  });

  console.log(`\nEvents in next 30 days: ${next30Days}`);
}

main().finally(() => prisma.$disconnect());
