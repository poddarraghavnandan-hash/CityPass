import { NextResponse } from 'next/server';
import { prisma, EventCategory } from '@citypass/db';
import { canonicalUrlHash, contentChecksum } from '@citypass/utils';
import { ensureEventsCollection, indexEvent } from '@citypass/search';

/**
 * Temporary admin endpoint to manually seed the database with events
 * This is needed until the worker is deployed to a long-running service
 */

interface SeedEventDefinition {
  sourceUrl: string;
  title: string;
  subtitle?: string;
  description: string;
  category: string;
  organizer?: string;
  venueName?: string;
  address?: string;
  neighborhood?: string;
  city: string;
  lat?: number;
  lon?: number;
  startTime: string;
  endTime?: string;
  timezone: string;
  priceMin?: number | null;
  priceMax?: number | null;
  currency?: string;
  minAge?: number;
  tags?: string[];
  imageUrl?: string | null;
  bookingUrl?: string | null;
  accessibility?: string[];
  sourceDomain: string;
}

const SEED_EVENTS_BY_CITY: Record<string, SeedEventDefinition[]> = {
  'New York': [
    {
      sourceUrl: 'https://test.com/comedy-night',
      title: 'Comedy Night at Comedy Cellar',
      subtitle: 'Live Stand-Up Comedy',
      description: 'An unforgettable night of laughter with top NYC comedians',
      category: 'COMEDY',
      organizer: 'Comedy Cellar',
      venueName: 'Comedy Cellar',
      address: '117 MacDougal St, New York, NY 10012',
      neighborhood: 'Greenwich Village',
      city: 'New York',
      lat: 40.7298,
      lon: -74.001,
      startTime: '2025-12-08T21:00:00-05:00',
      endTime: '2025-12-08T23:30:00-05:00',
      timezone: 'America/New_York',
      priceMin: 20,
      priceMax: 30,
      currency: 'USD',
      tags: ['comedy', 'stand-up', 'entertainment'],
      imageUrl: null,
      bookingUrl: 'https://test.com/comedy-tickets',
      accessibility: ['wheelchair-accessible'],
      sourceDomain: 'test.com',
    },
    {
      sourceUrl: 'https://test.com/brooklyn-brewery-tour',
      title: 'Brooklyn Brewery Tour',
      subtitle: 'Craft Beer Tasting',
      description: 'Tour the brewery and sample Brooklyn\'s finest craft beers',
      category: 'FOOD',
      organizer: 'Brooklyn Brewery',
      venueName: 'Brooklyn Brewery',
      address: '79 N 11th St, Brooklyn, NY 11249',
      neighborhood: 'Williamsburg',
      city: 'New York',
      lat: 40.7218,
      lon: -73.9585,
      startTime: '2025-11-20T15:00:00-05:00',
      endTime: '2025-11-20T17:00:00-05:00',
      timezone: 'America/New_York',
      priceMin: 15,
      priceMax: 15,
      currency: 'USD',
      minAge: 21,
      tags: ['brewery', 'beer', 'tour'],
      imageUrl: null,
      bookingUrl: 'https://test.com/brewery-tickets',
      accessibility: ['21+'],
      sourceDomain: 'test.com',
    },
    {
      sourceUrl: 'https://test.com/central-park-yoga',
      title: 'Sunrise Yoga in Central Park',
      subtitle: 'Free Outdoor Yoga Session',
      description: 'Start your day with a peaceful yoga class in Central Park',
      category: 'FITNESS',
      organizer: 'NYC Parks',
      venueName: 'Central Park Great Lawn',
      address: 'Central Park, New York, NY 10024',
      neighborhood: 'Upper West Side',
      city: 'New York',
      lat: 40.7794,
      lon: -73.9632,
      startTime: '2025-11-16T07:00:00-05:00',
      endTime: '2025-11-16T08:00:00-05:00',
      timezone: 'America/New_York',
      priceMin: 0,
      priceMax: 0,
      currency: 'USD',
      tags: ['yoga', 'fitness', 'free', 'outdoor'],
      imageUrl: null,
      bookingUrl: null,
      accessibility: ['outdoor', 'free'],
      sourceDomain: 'test.com',
    },
    {
      sourceUrl: 'https://test.com/met-museum-night',
      title: 'The Met After Hours',
      subtitle: 'Evening Museum Tour',
      description: 'Explore The Metropolitan Museum of Art with fewer crowds',
      category: 'ARTS',
      organizer: 'The Met',
      venueName: 'The Metropolitan Museum of Art',
      address: '1000 5th Ave, New York, NY 10028',
      neighborhood: 'Upper East Side',
      city: 'New York',
      lat: 40.7794,
      lon: -73.9632,
      startTime: '2025-11-18T18:00:00-05:00',
      endTime: '2025-11-18T21:00:00-05:00',
      timezone: 'America/New_York',
      priceMin: 30,
      priceMax: 30,
      currency: 'USD',
      tags: ['museum', 'art', 'culture'],
      imageUrl: null,
      bookingUrl: 'https://test.com/met-tickets',
      accessibility: ['wheelchair-accessible'],
      sourceDomain: 'test.com',
    },
    {
      sourceUrl: 'https://test.com/jazz-at-lincoln-center',
      title: 'Jazz at Lincoln Center',
      subtitle: 'Live Jazz Performance',
      description: 'World-class jazz in the heart of Manhattan',
      category: 'MUSIC',
      organizer: 'Jazz at Lincoln Center',
      venueName: 'Dizzy\'s Club',
      address: '10 Columbus Circle, New York, NY 10019',
      neighborhood: 'Midtown',
      city: 'New York',
      lat: 40.7681,
      lon: -73.9819,
      startTime: '2025-11-22T20:00:00-05:00',
      endTime: '2025-11-22T22:30:00-05:00',
      timezone: 'America/New_York',
      priceMin: 35,
      priceMax: 65,
      currency: 'USD',
      minAge: 21,
      tags: ['jazz', 'music', 'live'],
      imageUrl: null,
      bookingUrl: 'https://test.com/jazz-tickets',
      accessibility: ['21+', 'wheelchair-accessible'],
      sourceDomain: 'test.com',
    },
    {
      sourceUrl: 'https://test.com/brooklyn-flea',
      title: 'Brooklyn Flea Market',
      subtitle: 'Vintage Shopping & Food',
      description: 'Browse vintage finds and enjoy local food vendors',
      category: 'OTHER',
      organizer: 'Brooklyn Flea',
      venueName: 'Brooklyn Flea Dumbo',
      address: 'Manhattan Bridge Archway, Brooklyn, NY 11201',
      neighborhood: 'DUMBO',
      city: 'New York',
      lat: 40.7033,
      lon: -73.9875,
      startTime: '2025-11-17T10:00:00-05:00',
      endTime: '2025-11-17T17:00:00-05:00',
      timezone: 'America/New_York',
      priceMin: 0,
      priceMax: 0,
      currency: 'USD',
      tags: ['market', 'vintage', 'shopping', 'free'],
      imageUrl: null,
      bookingUrl: null,
      accessibility: ['outdoor', 'free'],
      sourceDomain: 'test.com',
    },
    {
      sourceUrl: 'https://test.com/broadway-show',
      title: 'Hamilton on Broadway',
      subtitle: 'Award-Winning Musical',
      description: 'Experience the revolutionary story of Alexander Hamilton',
      category: 'THEATRE',
      organizer: 'Broadway',
      venueName: 'Richard Rodgers Theatre',
      address: '226 W 46th St, New York, NY 10036',
      neighborhood: 'Theater District',
      city: 'New York',
      lat: 40.7590,
      lon: -73.9845,
      startTime: '2025-11-19T20:00:00-05:00',
      endTime: '2025-11-19T22:45:00-05:00',
      timezone: 'America/New_York',
      priceMin: 79,
      priceMax: 299,
      currency: 'USD',
      tags: ['theater', 'musical', 'broadway'],
      imageUrl: null,
      bookingUrl: 'https://test.com/hamilton-tickets',
      accessibility: ['wheelchair-accessible'],
      sourceDomain: 'test.com',
    },
    {
      sourceUrl: 'https://test.com/queens-night-market',
      title: 'Queens Night Market',
      subtitle: 'International Street Food',
      description: 'Sample dishes from over 80 countries at this outdoor night market',
      category: 'FOOD',
      organizer: 'Queens Night Market',
      venueName: 'Flushing Meadows Corona Park',
      address: 'Corona, NY 11368',
      neighborhood: 'Flushing',
      city: 'New York',
      lat: 40.7498,
      lon: -73.8456,
      startTime: '2025-11-16T18:00:00-05:00',
      endTime: '2025-11-16T23:00:00-05:00',
      timezone: 'America/New_York',
      priceMin: 0,
      priceMax: 0,
      currency: 'USD',
      tags: ['food', 'market', 'international', 'free'],
      imageUrl: null,
      bookingUrl: null,
      accessibility: ['outdoor', 'free'],
      sourceDomain: 'test.com',
    },
    {
      sourceUrl: 'https://test.com/chelsea-art-galleries',
      title: 'Chelsea Gallery Crawl',
      subtitle: 'Contemporary Art Tour',
      description: 'Explore dozens of contemporary art galleries in Chelsea',
      category: 'ARTS',
      organizer: 'Chelsea Art Galleries',
      venueName: 'Chelsea Arts District',
      address: 'W 24th St, New York, NY 10011',
      neighborhood: 'Chelsea',
      city: 'New York',
      lat: 40.7465,
      lon: -74.0034,
      startTime: '2025-11-21T14:00:00-05:00',
      endTime: '2025-11-21T18:00:00-05:00',
      timezone: 'America/New_York',
      priceMin: 0,
      priceMax: 0,
      currency: 'USD',
      tags: ['art', 'galleries', 'culture', 'free'],
      imageUrl: null,
      bookingUrl: null,
      accessibility: ['free'],
      sourceDomain: 'test.com',
    },
    {
      sourceUrl: 'https://test.com/rockaway-surf',
      title: 'Surf Lesson at Rockaway Beach',
      subtitle: 'Beginner Surfing Class',
      description: 'Learn to surf with experienced instructors at NYC\'s best beach',
      category: 'FITNESS',
      organizer: 'Rockaway Surf School',
      venueName: 'Rockaway Beach',
      address: 'Beach 87th St, Queens, NY 11693',
      neighborhood: 'Rockaway',
      city: 'New York',
      lat: 40.5850,
      lon: -73.8166,
      startTime: '2025-11-15T10:00:00-05:00',
      endTime: '2025-11-15T12:00:00-05:00',
      timezone: 'America/New_York',
      priceMin: 65,
      priceMax: 65,
      currency: 'USD',
      tags: ['surfing', 'beach', 'fitness', 'outdoor'],
      imageUrl: null,
      bookingUrl: 'https://test.com/surf-lesson',
      accessibility: ['outdoor'],
      sourceDomain: 'test.com',
    },
    {
      sourceUrl: 'https://test.com/smorgasburg',
      title: 'Smorgasburg Brooklyn',
      subtitle: 'Open-Air Food Market',
      description: 'America\'s largest weekly open-air food market',
      category: 'FOOD',
      organizer: 'Smorgasburg',
      venueName: 'East River State Park',
      address: '90 Kent Ave, Brooklyn, NY 11249',
      neighborhood: 'Williamsburg',
      city: 'New York',
      lat: 40.7218,
      lon: -73.9626,
      startTime: '2025-11-16T11:00:00-05:00',
      endTime: '2025-11-16T18:00:00-05:00',
      timezone: 'America/New_York',
      priceMin: 0,
      priceMax: 0,
      currency: 'USD',
      tags: ['food', 'market', 'outdoor', 'free'],
      imageUrl: null,
      bookingUrl: null,
      accessibility: ['outdoor', 'free'],
      sourceDomain: 'test.com',
    },
    {
      sourceUrl: 'https://test.com/rooftop-cinema',
      title: 'Rooftop Cinema Club',
      subtitle: 'Outdoor Movie Screening',
      description: 'Watch classic films under the stars with Manhattan skyline views',
      category: 'OTHER',
      organizer: 'Rooftop Cinema Club',
      venueName: 'Industry City Rooftop',
      address: '220 36th St, Brooklyn, NY 11232',
      neighborhood: 'Sunset Park',
      city: 'New York',
      lat: 40.6563,
      lon: -74.0093,
      startTime: '2025-11-20T19:30:00-05:00',
      endTime: '2025-11-20T22:00:00-05:00',
      timezone: 'America/New_York',
      priceMin: 18,
      priceMax: 25,
      currency: 'USD',
      tags: ['movies', 'outdoor', 'rooftop'],
      imageUrl: null,
      bookingUrl: 'https://test.com/rooftop-tickets',
      accessibility: ['outdoor'],
      sourceDomain: 'test.com',
    },
  ],
};

async function maybeCreateSeedEvent(seed: SeedEventDefinition): Promise<boolean> {
  const startTime = new Date(seed.startTime);
  const endTime = seed.endTime ? new Date(seed.endTime) : null;
  const urlHash = canonicalUrlHash(seed.sourceUrl);

  const existing = await prisma.event.findFirst({
    where: {
      canonicalUrlHash: urlHash,
      startTime,
    },
  });

  if (existing) {
    return false;
  }

  const checksum = contentChecksum({
    title: seed.title,
    description: seed.description,
    start_time: startTime.toISOString(),
    venue_name: seed.venueName,
    price_min: seed.priceMin ?? null,
    price_max: seed.priceMax ?? null,
  });

  const event = await prisma.event.create({
    data: {
      sourceUrl: seed.sourceUrl,
      title: seed.title,
      subtitle: seed.subtitle,
      description: seed.description,
      category: seed.category as EventCategory,
      organizer: seed.organizer,
      venueName: seed.venueName,
      address: seed.address,
      neighborhood: seed.neighborhood,
      city: seed.city,
      lat: seed.lat,
      lon: seed.lon,
      startTime,
      endTime,
      timezone: seed.timezone,
      priceMin: seed.priceMin ?? null,
      priceMax: seed.priceMax ?? null,
      currency: seed.currency ?? 'USD',
      minAge: seed.minAge ?? null,
      tags: seed.tags ?? [],
      imageUrl: seed.imageUrl ?? null,
      bookingUrl: seed.bookingUrl ?? null,
      accessibility: seed.accessibility ?? [],
      sourceDomain: seed.sourceDomain,
      canonicalUrlHash: urlHash,
      checksum,
    },
  });

  // Index to Typesense (optional - skip if not configured)
  try {
    await indexEvent(event);
  } catch (error) {
    console.warn('Typesense indexing failed, event saved to DB:', error);
  }
  return true;
}

export async function POST(request: Request) {
  try {
    // Ensure Typesense collection exists (optional - skip if not configured)
    try {
      await ensureEventsCollection();
    } catch (error) {
      console.warn('Typesense not configured, skipping collection setup:', error);
    }

    let created = 0;
    const now = new Date();

    for (const [city, seeds] of Object.entries(SEED_EVENTS_BY_CITY)) {
      for (const seed of seeds) {
        const inserted = await maybeCreateSeedEvent(seed);
        if (inserted) {
          created += 1;
        }
      }
    }

    return NextResponse.json({
      success: true,
      created,
      message: `Successfully seeded ${created} events`,
    });
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
