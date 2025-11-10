import { NextRequest, NextResponse } from 'next/server';
import { prisma, EventCategory } from '@citypass/db';
import { canonicalUrlHash, contentChecksum } from '@citypass/utils';
import { indexEvent, ensureEventsCollection } from '@/lib/typesense';

const TEST_EVENTS = [
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
    lon: -74.0010,
    startTime: new Date('2025-11-08T21:00:00-05:00'),
    endTime: new Date('2025-11-08T23:30:00-05:00'),
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
    sourceUrl: 'https://test.com/yoga-class',
    title: 'Free Morning Yoga in Central Park',
    subtitle: 'All Levels Welcome',
    description: 'Start your day with a rejuvenating yoga session in beautiful Central Park',
    category: 'FITNESS',
    organizer: 'NYC Parks & Recreation',
    venueName: 'Central Park - Sheep Meadow',
    address: 'Central Park, New York, NY 10024',
    neighborhood: 'Upper West Side',
    city: 'New York',
    lat: 40.7749,
    lon: -73.9732,
    startTime: new Date('2025-11-10T08:00:00-05:00'),
    endTime: new Date('2025-11-10T09:00:00-05:00'),
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
    sourceUrl: 'https://test.com/jazz-night',
    title: 'Jazz Night at Blue Note',
    subtitle: 'Featuring Grammy Award Winners',
    description: 'Experience world-class jazz in an intimate setting',
    category: 'MUSIC',
    organizer: 'Blue Note Jazz Club',
    venueName: 'Blue Note Jazz Club',
    address: '131 W 3rd St, New York, NY 10012',
    neighborhood: 'Greenwich Village',
    city: 'New York',
    lat: 40.7305,
    lon: -74.0001,
    startTime: new Date('2025-11-12T20:00:00-05:00'),
    endTime: new Date('2025-11-12T22:30:00-05:00'),
    timezone: 'America/New_York',
    priceMin: 45,
    priceMax: 75,
    currency: 'USD',
    minAge: 21,
    tags: ['jazz', 'music', 'live'],
    imageUrl: null,
    bookingUrl: 'https://test.com/jazz-tickets',
    accessibility: ['wheelchair-accessible', '21+'],
    sourceDomain: 'test.com',
  },
  {
    sourceUrl: 'https://test.com/food-festival',
    title: 'Brooklyn Food & Wine Festival',
    subtitle: 'Taste the Best of Brooklyn',
    description: 'Sample dishes from 50+ local restaurants and food vendors',
    category: 'FOOD',
    organizer: 'Brooklyn Tourism',
    venueName: 'Brooklyn Bridge Park',
    address: 'Brooklyn Bridge Park, Brooklyn, NY 11201',
    neighborhood: 'DUMBO',
    city: 'New York',
    lat: 40.7024,
    lon: -73.9875,
    startTime: new Date('2025-11-15T12:00:00-05:00'),
    endTime: new Date('2025-11-15T19:00:00-05:00'),
    timezone: 'America/New_York',
    priceMin: 35,
    priceMax: 35,
    currency: 'USD',
    tags: ['food', 'wine', 'festival', 'outdoor'],
    imageUrl: null,
    bookingUrl: 'https://test.com/food-festival-tickets',
    accessibility: ['outdoor', 'family-friendly'],
    sourceDomain: 'test.com',
  },
  {
    sourceUrl: 'https://test.com/broadway-show',
    title: 'Hamilton on Broadway',
    subtitle: 'The Award-Winning Musical',
    description: 'The story of American founding father Alexander Hamilton',
    category: 'THEATRE',
    organizer: 'Broadway LLC',
    venueName: 'Richard Rodgers Theatre',
    address: '226 W 46th St, New York, NY 10036',
    neighborhood: 'Theater District',
    city: 'New York',
    lat: 40.7590,
    lon: -73.9872,
    startTime: new Date('2025-11-14T20:00:00-05:00'),
    endTime: new Date('2025-11-14T22:45:00-05:00'),
    timezone: 'America/New_York',
    priceMin: 99,
    priceMax: 399,
    currency: 'USD',
    tags: ['broadway', 'musical', 'theatre'],
    imageUrl: null,
    bookingUrl: 'https://test.com/hamilton-tickets',
    accessibility: ['wheelchair-accessible'],
    sourceDomain: 'test.com',
  },
  {
    sourceUrl: 'https://test.com/art-exhibition',
    title: 'Modern Art Exhibition at MoMA',
    subtitle: 'Contemporary Masters Collection',
    description: 'Explore groundbreaking works from modern artists',
    category: 'ARTS',
    organizer: 'Museum of Modern Art',
    venueName: 'MoMA',
    address: '11 W 53rd St, New York, NY 10019',
    neighborhood: 'Midtown',
    city: 'New York',
    lat: 40.7614,
    lon: -73.9776,
    startTime: new Date('2025-11-11T10:00:00-05:00'),
    endTime: new Date('2025-11-11T17:30:00-05:00'),
    timezone: 'America/New_York',
    priceMin: 25,
    priceMax: 25,
    currency: 'USD',
    tags: ['art', 'museum', 'exhibition'],
    imageUrl: null,
    bookingUrl: 'https://test.com/moma-tickets',
    accessibility: ['wheelchair-accessible', 'indoor'],
    sourceDomain: 'test.com',
  },
];

export async function POST(req: NextRequest) {
  try {
    // Ensure Typesense collection exists
    await ensureEventsCollection();

    const createdEvents = [];

    for (const eventData of TEST_EVENTS) {
      const event = await prisma.event.create({
        data: {
          ...eventData,
          category: eventData.category as EventCategory,
          canonicalUrlHash: canonicalUrlHash(eventData.sourceUrl),
          checksum: contentChecksum({
            title: eventData.title,
            description: eventData.description,
            start_time: eventData.startTime.toISOString(),
            venue_name: eventData.venueName,
            price_min: eventData.priceMin,
            price_max: eventData.priceMax,
          }),
        },
      });

      // Index to Typesense
      await indexEvent(event);
      createdEvents.push(event);
      console.log(`✅ Created and indexed: ${event.title}`);
    }

    return NextResponse.json({
      success: true,
      count: createdEvents.length,
      events: createdEvents.map(e => ({
        id: e.id,
        title: e.title,
        category: e.category,
        date: e.startTime,
      })),
    });
  } catch (error: any) {
    console.error('Seed events error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
