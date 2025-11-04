import { PrismaClient, SourceType, CrawlMethod, EventCategory } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // NYC Event Sources
  const sources = [
    {
      name: 'The Bowery Ballroom',
      url: 'https://www.boweryballroom.com/calendar',
      domain: 'boweryballroom.com',
      city: 'New York',
      sourceType: SourceType.VENUE,
      category: EventCategory.MUSIC,
      crawlMethod: CrawlMethod.FIRECRAWL,
    },
    {
      name: 'Brooklyn Bowl',
      url: 'https://www.brooklynbowl.com/events/',
      domain: 'brooklynbowl.com',
      city: 'New York',
      sourceType: SourceType.VENUE,
      category: EventCategory.MUSIC,
      crawlMethod: CrawlMethod.FIRECRAWL,
    },
    {
      name: 'Comedy Cellar',
      url: 'https://www.comedycellar.com/shows/',
      domain: 'comedycellar.com',
      city: 'New York',
      sourceType: SourceType.VENUE,
      category: EventCategory.COMEDY,
      crawlMethod: CrawlMethod.FIRECRAWL,
    },
    {
      name: 'UCB Theatre',
      url: 'https://ucbtheatre.com/shows',
      domain: 'ucbtheatre.com',
      city: 'New York',
      sourceType: SourceType.VENUE,
      category: EventCategory.COMEDY,
      crawlMethod: CrawlMethod.FIRECRAWL,
    },
    {
      name: 'Brooklyn Academy of Music',
      url: 'https://www.bam.org/whats-on',
      domain: 'bam.org',
      city: 'New York',
      sourceType: SourceType.VENUE,
      category: EventCategory.THEATRE,
      crawlMethod: CrawlMethod.FIRECRAWL,
    },
    {
      name: 'The Shed',
      url: 'https://theshed.org/program',
      domain: 'theshed.org',
      city: 'New York',
      sourceType: SourceType.VENUE,
      category: EventCategory.ARTS,
      crawlMethod: CrawlMethod.FIRECRAWL,
    },
    {
      name: 'House of Yes',
      url: 'https://www.houseofyes.org/events',
      domain: 'houseofyes.org',
      city: 'New York',
      sourceType: SourceType.VENUE,
      category: EventCategory.DANCE,
      crawlMethod: CrawlMethod.FIRECRAWL,
    },
    {
      name: 'Elsewhere Brooklyn',
      url: 'https://www.elsewherebrooklyn.com/events/',
      domain: 'elsewherebrooklyn.com',
      city: 'New York',
      sourceType: SourceType.VENUE,
      category: EventCategory.MUSIC,
      crawlMethod: CrawlMethod.FIRECRAWL,
    },
    {
      name: 'Time Out New York',
      url: 'https://www.timeout.com/newyork/things-to-do/things-to-do-in-nyc-this-week',
      domain: 'timeout.com',
      city: 'New York',
      sourceType: SourceType.MEDIA,
      crawlMethod: CrawlMethod.APIFY,
    },
    {
      name: 'The Skint NYC',
      url: 'https://theskint.com/events/',
      domain: 'theskint.com',
      city: 'New York',
      sourceType: SourceType.BLOG,
      crawlMethod: CrawlMethod.FIRECRAWL,
    },
    {
      name: 'Resident Advisor NYC',
      url: 'https://ra.co/events/us/newyork',
      domain: 'ra.co',
      city: 'New York',
      sourceType: SourceType.AGGREGATOR,
      category: EventCategory.MUSIC,
      crawlMethod: CrawlMethod.APIFY,
    },
    {
      name: 'Eventbrite NYC',
      url: 'https://www.eventbrite.com/d/ny--new-york/all-events/',
      domain: 'eventbrite.com',
      city: 'New York',
      sourceType: SourceType.AGGREGATOR,
      crawlMethod: CrawlMethod.APIFY,
    },
    {
      name: 'Dice NYC',
      url: 'https://dice.fm/city/new-york',
      domain: 'dice.fm',
      city: 'New York',
      sourceType: SourceType.TICKETING,
      crawlMethod: CrawlMethod.APIFY,
    },
    {
      name: 'Sofar Sounds NYC',
      url: 'https://www.sofarsounds.com/cities/new-york',
      domain: 'sofarsounds.com',
      city: 'New York',
      sourceType: SourceType.AGGREGATOR,
      category: EventCategory.MUSIC,
      crawlMethod: CrawlMethod.FIRECRAWL,
    },
    {
      name: 'Meetup NYC Tech',
      url: 'https://www.meetup.com/find/?location=us--ny--new-york&source=EVENTS',
      domain: 'meetup.com',
      city: 'New York',
      sourceType: SourceType.AGGREGATOR,
      category: EventCategory.NETWORKING,
      crawlMethod: CrawlMethod.APIFY,
    },
  ];

  for (const source of sources) {
    await prisma.source.upsert({
      where: { url: source.url },
      update: {},
      create: source,
    });
  }

  console.log(`✅ Seeded ${sources.length} sources`);

  // Create a few sample venues
  const venues = [
    {
      name: 'The Bowery Ballroom',
      canonicalName: 'bowery-ballroom',
      address: '6 Delancey St, New York, NY 10002',
      neighborhood: 'Lower East Side',
      city: 'New York',
      lat: 40.7186,
      lon: -73.9936,
    },
    {
      name: 'Brooklyn Bowl',
      canonicalName: 'brooklyn-bowl',
      address: '61 Wythe Ave, Brooklyn, NY 11249',
      neighborhood: 'Williamsburg',
      city: 'New York',
      lat: 40.7217,
      lon: -73.9576,
    },
    {
      name: 'Comedy Cellar',
      canonicalName: 'comedy-cellar',
      address: '117 MacDougal St, New York, NY 10012',
      neighborhood: 'Greenwich Village',
      city: 'New York',
      lat: 40.7298,
      lon: -74.0010,
    },
  ];

  for (const venue of venues) {
    await prisma.venue.upsert({
      where: {
        canonicalName_city: {
          canonicalName: venue.canonicalName,
          city: venue.city,
        },
      },
      update: {},
      create: venue,
    });
  }

  console.log(`✅ Seeded ${venues.length} venues`);
}

main()
  .catch((e) => {
    console.error('Error seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
