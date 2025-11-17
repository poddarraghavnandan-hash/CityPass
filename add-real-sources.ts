import { PrismaClient, SourceType, EventCategory, CrawlMethod } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Adding real NYC event sources...\n');

  const sources = [
    // Music Venues
    {
      name: 'Bowery Ballroom',
      url: 'https://www.boweryballroom.com/events',
      domain: 'boweryballroom.com',
      city: 'New York',
      sourceType: SourceType.VENUE_CALENDAR,
      category: EventCategory.MUSIC,
      crawlMethod: CrawlMethod.FIRECRAWL,
      active: true,
    },
    {
      name: 'Brooklyn Bowl',
      url: 'https://www.brooklynbowl.com/brooklyn/events',
      domain: 'brooklynbowl.com',
      city: 'New York',
      sourceType: SourceType.VENUE_CALENDAR,
      category: EventCategory.MUSIC,
      crawlMethod: CrawlMethod.FIRECRAWL,
      active: true,
    },
    {
      name: 'Music Hall of Williamsburg',
      url: 'https://www.musichallofwilliamsburg.com/events',
      domain: 'musichallofwilliamsburg.com',
      city: 'New York',
      sourceType: SourceType.VENUE_CALENDAR,
      category: EventCategory.MUSIC,
      crawlMethod: CrawlMethod.FIRECRAWL,
      active: true,
    },
    {
      name: 'Blue Note Jazz Club',
      url: 'https://www.bluenotejazz.com/newyork/',
      domain: 'bluenotejazz.com',
      city: 'New York',
      sourceType: SourceType.VENUE_CALENDAR,
      category: EventCategory.MUSIC,
      crawlMethod: CrawlMethod.FIRECRAWL,
      active: true,
    },
    // Arts & Culture
    {
      name: 'MoMA Events',
      url: 'https://www.moma.org/calendar/events',
      domain: 'moma.org',
      city: 'New York',
      sourceType: SourceType.VENUE_CALENDAR,
      category: EventCategory.ARTS,
      crawlMethod: CrawlMethod.FIRECRAWL,
      active: true,
    },
    {
      name: 'Brooklyn Museum',
      url: 'https://www.brooklynmuseum.org/calendar',
      domain: 'brooklynmuseum.org',
      city: 'New York',
      sourceType: SourceType.VENUE_CALENDAR,
      category: EventCategory.ARTS,
      crawlMethod: CrawlMethod.FIRECRAWL,
      active: true,
    },
    // Comedy
    {
      name: 'Comedy Cellar',
      url: 'https://www.comedycellar.com/shows',
      domain: 'comedycellar.com',
      city: 'New York',
      sourceType: SourceType.VENUE_CALENDAR,
      category: EventCategory.COMEDY,
      crawlMethod: CrawlMethod.FIRECRAWL,
      active: true,
    },
    // Outdoor/Sports
    {
      name: 'Prospect Park Events',
      url: 'https://www.prospectpark.org/events/',
      domain: 'prospectpark.org',
      city: 'New York',
      sourceType: SourceType.VENUE_CALENDAR,
      category: EventCategory.OTHER,
      crawlMethod: CrawlMethod.FIRECRAWL,
      active: true,
    },
    // Food Markets
    {
      name: 'Smorgasburg',
      url: 'https://www.smorgasburg.com/',
      domain: 'smorgasburg.com',
      city: 'New York',
      sourceType: SourceType.VENUE_CALENDAR,
      category: EventCategory.FOOD,
      crawlMethod: CrawlMethod.FIRECRAWL,
      active: true,
    },
  ];

  for (const source of sources) {
    try {
      const created = await prisma.source.upsert({
        where: { url: source.url },
        update: source,
        create: source,
      });
      console.log(`✓ Added: ${created.name}`);
    } catch (error) {
      console.error(`✗ Failed to add ${source.name}:`, error);
    }
  }

  console.log(`\n✅ Added ${sources.length} event sources`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
