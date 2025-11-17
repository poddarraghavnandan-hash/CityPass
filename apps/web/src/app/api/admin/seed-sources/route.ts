import { NextResponse } from 'next/server';
import { prisma, SourceType, EventCategory, CrawlMethod } from '@citypass/db';

const NYC_EVENT_SOURCES = [
  // Music Venues
  {
    name: 'Bowery Ballroom',
    url: 'https://www.boweryballroom.com/events',
    domain: 'boweryballroom.com',
    city: 'New York',
    sourceType: SourceType.VENUE_CALENDAR,
    category: EventCategory.MUSIC,
  },
  {
    name: 'Brooklyn Bowl',
    url: 'https://www.brooklynbowl.com/brooklyn/events',
    domain: 'brooklynbowl.com',
    city: 'New York',
    sourceType: SourceType.VENUE_CALENDAR,
    category: EventCategory.MUSIC,
  },
  {
    name: 'Music Hall of Williamsburg',
    url: 'https://www.musichallofwilliamsburg.com/events',
    domain: 'musichallofwilliamsburg.com',
    city: 'New York',
    sourceType: SourceType.VENUE_CALENDAR,
    category: EventCategory.MUSIC,
  },
  {
    name: 'Blue Note Jazz Club',
    url: 'https://www.bluenotejazz.com/newyork/',
    domain: 'bluenotejazz.com',
    city: 'New York',
    sourceType: SourceType.VENUE_CALENDAR,
    category: EventCategory.MUSIC,
  },
  {
    name: 'Rough Trade NYC',
    url: 'https://www.roughtradenyc.com/events',
    domain: 'roughtradenyc.com',
    city: 'New York',
    sourceType: SourceType.VENUE_CALENDAR,
    category: EventCategory.MUSIC,
  },
  // Comedy Venues
  {
    name: 'Comedy Cellar',
    url: 'https://www.comedycellar.com/shows',
    domain: 'comedycellar.com',
    city: 'New York',
    sourceType: SourceType.VENUE_CALENDAR,
    category: EventCategory.COMEDY,
  },
  {
    name: 'Gotham Comedy Club',
    url: 'https://gothamcomedyclub.com/shows',
    domain: 'gothamcomedyclub.com',
    city: 'New York',
    sourceType: SourceType.VENUE_CALENDAR,
    category: EventCategory.COMEDY,
  },
  // Arts & Culture
  {
    name: 'MoMA Events',
    url: 'https://www.moma.org/calendar/events',
    domain: 'moma.org',
    city: 'New York',
    sourceType: SourceType.VENUE_CALENDAR,
    category: EventCategory.ARTS,
  },
  {
    name: 'Brooklyn Museum',
    url: 'https://www.brooklynmuseum.org/calendar',
    domain: 'brooklynmuseum.org',
    city: 'New York',
    sourceType: SourceType.VENUE_CALENDAR,
    category: EventCategory.ARTS,
  },
  {
    name: 'The Met Museum',
    url: 'https://www.metmuseum.org/events',
    domain: 'metmuseum.org',
    city: 'New York',
    sourceType: SourceType.VENUE_CALENDAR,
    category: EventCategory.ARTS,
  },
  // Outdoor/Parks
  {
    name: 'Prospect Park Events',
    url: 'https://www.prospectpark.org/events/',
    domain: 'prospectpark.org',
    city: 'New York',
    sourceType: SourceType.VENUE_CALENDAR,
    category: EventCategory.OTHER,
  },
  {
    name: 'Central Park Conservancy',
    url: 'https://www.centralparknyc.org/events',
    domain: 'centralparknyc.org',
    city: 'New York',
    sourceType: SourceType.VENUE_CALENDAR,
    category: EventCategory.OTHER,
  },
  // Food & Markets
  {
    name: 'Smorgasburg',
    url: 'https://www.smorgasburg.com/',
    domain: 'smorgasburg.com',
    city: 'New York',
    sourceType: SourceType.VENUE_CALENDAR,
    category: EventCategory.FOOD,
  },
  {
    name: 'Brooklyn Flea',
    url: 'https://brooklynflea.com/markets/',
    domain: 'brooklynflea.com',
    city: 'New York',
    sourceType: SourceType.VENUE_CALENDAR,
    category: EventCategory.OTHER,
  },
];

export async function POST() {
  try {
    let created = 0;
    let skipped = 0;

    for (const sourceData of NYC_EVENT_SOURCES) {
      try {
        await prisma.source.upsert({
          where: { url: sourceData.url },
          update: sourceData,
          create: {
            ...sourceData,
            crawlMethod: CrawlMethod.FIRECRAWL,
            active: true,
          },
        });
        created++;
        console.log(`✓ Added: ${sourceData.name}`);
      } catch (err: any) {
        console.error(`✗ Failed: ${sourceData.name}`, err.message);
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      created,
      skipped,
      total: NYC_EVENT_SOURCES.length,
      message: `Seeded ${created} event sources`,
    });
  } catch (error: any) {
    console.error('Seed sources error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
