import { prisma } from '@citypass/db';

async function checkDanceEvents() {
  console.log('=== Checking DANCE Events ===\n');

  try {
    // Get all DANCE category events
    const danceEvents = await prisma.event.findMany({
      where: {
        category: 'DANCE',
      },
      select: {
        id: true,
        title: true,
        category: true,
        startTime: true,
        venueName: true,
        city: true,
        description: true,
        sourceUrl: true,
        tags: true,
        createdAt: true,
      },
      orderBy: { startTime: 'asc' },
    });

    console.log(`Found ${danceEvents.length} DANCE events:\n`);

    danceEvents.forEach((e, idx) => {
      console.log(`${idx + 1}. ${e.title}`);
      console.log(`   Venue: ${e.venueName || 'N/A'}`);
      console.log(`   City: ${e.city}`);
      console.log(`   When: ${e.startTime.toLocaleString()}`);
      console.log(`   Tags: ${e.tags.join(', ') || 'none'}`);
      console.log(`   Source: ${e.sourceUrl}`);
      console.log(`   Created: ${e.createdAt.toLocaleString()}`);
      console.log(`   Description: ${e.description?.substring(0, 150) || 'none'}...`);
      console.log('');
    });

    // Also check events with "dance" in title or tags (might not be categorized as DANCE)
    const now = new Date();
    const danceRelatedEvents = await prisma.event.findMany({
      where: {
        OR: [
          { title: { contains: 'dance', mode: 'insensitive' } },
          { title: { contains: 'dancing', mode: 'insensitive' } },
        ],
        startTime: { gte: now },
      },
      select: {
        id: true,
        title: true,
        category: true,
        startTime: true,
        venueName: true,
        city: true,
      },
      orderBy: { startTime: 'asc' },
      take: 10,
    });

    console.log(`\n=== Events with "dance" in title (upcoming) ===`);
    console.log(`Found ${danceRelatedEvents.length} events:\n`);

    danceRelatedEvents.forEach((e, idx) => {
      console.log(`${idx + 1}. ${e.title}`);
      console.log(`   Category: ${e.category || 'N/A'}`);
      console.log(`   Venue: ${e.venueName || 'N/A'}`);
      console.log(`   When: ${e.startTime.toLocaleString()}`);
      console.log('');
    });

    // Check a random sample of 10 events to see what they look like
    const randomSample = await prisma.$queryRaw`
      SELECT id, title, category, venue_name, city, start_time, created_at
      FROM events
      ORDER BY RANDOM()
      LIMIT 10
    `;

    console.log(`\n=== Random Sample of 10 Events ===\n`);
    console.log(JSON.stringify(randomSample, null, 2));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDanceEvents().catch(console.error);
