import { prisma } from '@citypass/db';

async function checkAccuracy() {
  console.log('=== Checking Database Event Quality ===\n');

  // 1. Total events
  const totalEvents = await prisma.event.count();
  console.log(`Total events: ${totalEvents}`);

  // 2. Events by city
  const byCity = await prisma.event.groupBy({
    by: ['city'],
    _count: true,
    orderBy: { _count: { city: 'desc' } },
    take: 5,
  });
  console.log('\nEvents by city:');
  byCity.forEach(c => console.log(`  ${c.city}: ${c._count}`));

  // 3. Events by category
  const byCategory = await prisma.event.groupBy({
    by: ['category'],
    _count: true,
    where: { category: { not: null } },
    orderBy: { _count: { category: 'desc' } },
  });
  console.log('\nEvents by category:');
  byCategory.forEach(c => console.log(`  ${c.category || 'null'}: ${c._count}`));

  // 4. Upcoming events in NYC (next 7 days)
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingNYC = await prisma.event.count({
    where: {
      city: 'New York',
      startTime: { gte: now, lte: nextWeek },
    },
  });
  console.log(`\nUpcoming NYC events (next 7 days): ${upcomingNYC}`);

  // 5. Sample recent events
  const recent = await prisma.event.findMany({
    where: {
      city: 'New York',
      startTime: { gte: now }
    },
    orderBy: { startTime: 'asc' },
    take: 5,
    select: {
      title: true,
      category: true,
      startTime: true,
      venueName: true,
    },
  });
  console.log('\nSample upcoming NYC events:');
  recent.forEach(e => {
    console.log(`  ${e.startTime.toLocaleDateString()} - ${e.title} (${e.category || 'no category'}) @ ${e.venueName || 'no venue'}`);
  });

  await prisma.$disconnect();
}

checkAccuracy().catch(console.error);
