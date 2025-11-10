import { NextRequest, NextResponse } from 'next/server';
import { prisma, EventCategory } from '@citypass/db';
import { canonicalUrlHash, contentChecksum } from '@citypass/utils';
import { indexEvent, ensureEventsCollection } from '@/lib/typesense';

export async function POST(req: NextRequest) {
  try {
    // Ensure Typesense collection exists
    await ensureEventsCollection();

    // Create a test event directly
    const testEvent = {
      sourceUrl: 'https://test.com/test-concert',
      title: 'Live Music Night at Bowery Ballroom',
      subtitle: 'Featuring Local Artists',
      description: 'Join us for an incredible evening of live music',
      category: 'MUSIC' as EventCategory,
      organizer: 'Bowery Presents',
      venueName: 'Bowery Ballroom',
      address: '6 Delancey St, New York, NY 10002',
      neighborhood: 'Lower East Side',
      city: 'New York',
      lat: 40.7186,
      lon: -73.9936,
      startTime: new Date('2025-11-09T20:00:00-05:00'),
      endTime: new Date('2025-11-09T23:00:00-05:00'),
      timezone: 'America/New_York',
      priceMin: 25,
      priceMax: 35,
      currency: 'USD',
      tags: ['music', 'live', 'concert'],
      imageUrl: null,
      bookingUrl: 'https://test.com/tickets',
      accessibility: ['wheelchair-accessible'],
      sourceDomain: 'test.com',
      canonicalUrlHash: canonicalUrlHash('https://test.com/test-concert'),
      checksum: contentChecksum({
        title: 'Live Music Night at Bowery Ballroom',
        description: 'Join us for an incredible evening of live music',
        start_time: '2025-11-09T20:00:00-05:00',
        venue_name: 'Bowery Ballroom',
        price_min: 25,
        price_max: 35,
      }),
    };

    // Create event in database
    const event = await prisma.event.create({
      data: testEvent,
    });

    console.log('✅ Created test event:', event.id);

    // Index to Typesense
    await indexEvent(event);
    console.log('✅ Indexed to Typesense');

    return NextResponse.json({
      success: true,
      event: {
        id: event.id,
        title: event.title,
        venue: event.venueName,
        date: event.startTime,
      },
    });
  } catch (error: any) {
    console.error('Test event creation error:', error);
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}
