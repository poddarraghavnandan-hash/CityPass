import { prisma } from '@citypass/db';

async function checkDatabaseEvents() {
  console.log('=== Checking Database Event Quality ===\n');

  try {
    // 1. Total events
    const totalEvents = await prisma.event.count();
    console.log(`📊 Total events: ${totalEvents}`);

    // 2. Events by city
    const byCity = await prisma.event.groupBy({
      by: ['city'],
      _count: true,
      orderBy: { _count: { city: 'desc' } },
      take: 5,
    });
    console.log('\n🌆 Events by city:');
    byCity.forEach((c) => console.log(`  ${c.city}: ${c._count}`));

    // 3. Events by category
    const byCategory = await prisma.event.groupBy({
      by: ['category'],
      _count: true,
      where: { category: { not: null } },
      orderBy: { _count: { category: 'desc' } },
    });
    console.log('\n📁 Events by category:');
    byCategory.forEach((c) => console.log(`  ${c.category || 'null'}: ${c._count}`));

    // 4. Check for "dance" events specifically
    const danceEvents = await prisma.event.count({
      where: {
        OR: [
          { title: { contains: 'dance', mode: 'insensitive' } },
          { category: { contains: 'dance', mode: 'insensitive' } },
          { description: { contains: 'dance', mode: 'insensitive' } },
        ],
      },
    });
    console.log(`\n💃 Dance-related events: ${danceEvents}`);

    // 5. Upcoming events in NYC (next 7 days)
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingNYC = await prisma.event.count({
      where: {
        city: { in: ['New York', 'NYC', 'new york'] },
        startTime: { gte: now, lte: nextWeek },
      },
    });
    console.log(`\n📅 Upcoming NYC events (next 7 days): ${upcomingNYC}`);

    // 6. Sample recent events with full details
    const recent = await prisma.event.findMany({
      where: {
        startTime: { gte: now },
      },
      orderBy: { startTime: 'asc' },
      take: 10,
      select: {
        id: true,
        title: true,
        category: true,
        startTime: true,
        venueName: true,
        city: true,
        description: true,
      },
    });
    console.log('\n🎯 Sample upcoming events:');
    recent.forEach((e, idx) => {
      console.log(`\n  ${idx + 1}. ${e.title}`);
      console.log(`     Category: ${e.category || 'none'}`);
      console.log(`     Venue: ${e.venueName || 'none'}`);
      console.log(`     City: ${e.city}`);
      console.log(`     When: ${e.startTime.toLocaleString()}`);
      console.log(`     Description: ${e.description?.substring(0, 100) || 'none'}...`);
    });

    // 7. Check for dummy/test data patterns
    const possibleDummyPatterns = ['test', 'dummy', 'sample', 'lorem', 'placeholder'];
    let dummyCount = 0;
    for (const pattern of possibleDummyPatterns) {
      const count = await prisma.event.count({
        where: {
          OR: [
            { title: { contains: pattern, mode: 'insensitive' } },
            { description: { contains: pattern, mode: 'insensitive' } },
          ],
        },
      });
      if (count > 0) {
        console.log(`\n⚠️  Found ${count} events with "${pattern}" in title/description`);
        dummyCount += count;
      }
    }

    if (dummyCount > 0) {
      console.log(`\n🚨 WARNING: Found ${dummyCount} potential dummy/test events!`);
    }

    // 8. Check event freshness (when were they created?)
    const oldestEvent = await prisma.event.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { title: true, createdAt: true },
    });
    const newestEvent = await prisma.event.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { title: true, createdAt: true },
    });
    console.log('\n🕐 Event data freshness:');
    console.log(`  Oldest event created: ${oldestEvent?.createdAt.toLocaleString()}`);
    console.log(`  Newest event created: ${newestEvent?.createdAt.toLocaleString()}`);

  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseEvents().catch(console.error);
