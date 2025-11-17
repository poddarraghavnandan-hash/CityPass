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

  // V3: Create sample events for testing
  const now = new Date();
  const events = [
    {
      sourceUrl: 'https://www.boweryballroom.com/event/indie-rock-night',
      title: 'Indie Rock Night with The Strokes Tribute',
      city: 'New York',
      startTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      category: EventCategory.MUSIC,
      venueName: 'The Bowery Ballroom',
      neighborhood: 'Lower East Side',
      priceMin: 25.0,
      priceMax: 35.0,
      sourceDomain: 'boweryballroom.com',
      checksum: 'checksum_indie_rock',
      canonicalUrlHash: 'hash_indie_rock',
      imageUrl: 'https://images.unsplash.com/photo-1501612780327-45045538702b?w=800',
    },
    {
      sourceUrl: 'https://www.comedycellar.com/shows/open-mic',
      title: 'Stand-Up Comedy Open Mic',
      city: 'New York',
      startTime: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
      category: EventCategory.COMEDY,
      venueName: 'Comedy Cellar',
      neighborhood: 'Greenwich Village',
      priceMin: 15.0,
      priceMax: 25.0,
      sourceDomain: 'comedycellar.com',
      checksum: 'checksum_comedy',
      canonicalUrlHash: 'hash_comedy',
      imageUrl: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800',
    },
    {
      sourceUrl: 'https://www.brooklynbowl.com/events/electronic-fest',
      title: 'Electronic Music Festival',
      city: 'New York',
      startTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      category: EventCategory.MUSIC,
      venueName: 'Brooklyn Bowl',
      neighborhood: 'Williamsburg',
      priceMin: 40.0,
      priceMax: 80.0,
      sourceDomain: 'brooklynbowl.com',
      checksum: 'checksum_electronic',
      canonicalUrlHash: 'hash_electronic',
      imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800',
    },
    {
      sourceUrl: 'https://www.houseofyes.org/events/sunset-salsa',
      title: 'Sunset Salsa on the Pier',
      city: 'New York',
      startTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      category: EventCategory.DANCE,
      venueName: 'Pier 15',
      neighborhood: 'Seaport District',
      priceMin: 0,
      priceMax: 15,
      sourceDomain: 'houseofyes.org',
      checksum: 'checksum_salsa_evening',
      canonicalUrlHash: 'hash_salsa_evening',
      imageUrl: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=800',
    },
    {
      sourceUrl: 'https://www.broadway.com/shows/hadestown/tickets',
      title: 'Broadway Matinee: Hadestown',
      city: 'New York',
      startTime: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
      category: EventCategory.THEATRE,
      venueName: 'Walter Kerr Theatre',
      neighborhood: 'Midtown',
      priceMin: 129,
      priceMax: 289,
      sourceDomain: 'broadway.com',
      checksum: 'checksum_hadestown',
      canonicalUrlHash: 'hash_hadestown',
      imageUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800',
    },
    {
      sourceUrl: 'https://www.nycliberty.com/tickets/playoffs',
      title: 'NY Liberty Playoff Game',
      city: 'New York',
      startTime: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      category: EventCategory.OTHER,
      venueName: 'Barclays Center',
      neighborhood: 'Prospect Heights',
      priceMin: 45,
      priceMax: 160,
      sourceDomain: 'nycliberty.com',
      checksum: 'checksum_liberty_playoffs',
      canonicalUrlHash: 'hash_liberty_playoffs',
      imageUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800',
    },
    {
      sourceUrl: 'https://www.timeout.com/newyork/things-to-do/queens-night-market',
      title: 'Queens Night Market',
      city: 'New York',
      startTime: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000),
      category: EventCategory.FOOD,
      venueName: 'Flushing Meadows Park',
      neighborhood: 'Corona',
      priceMin: 5,
      priceMax: 25,
      sourceDomain: 'timeout.com',
      checksum: 'checksum_queens_night_market',
      canonicalUrlHash: 'hash_queens_night_market',
      imageUrl: 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=800',
    },
    {
      sourceUrl: 'https://www.nycgovparks.org/events/sunrise-rooftop-yoga',
      title: 'Sunrise Rooftop Yoga Flow',
      city: 'New York',
      startTime: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000 + 7 * 60 * 60 * 1000),
      category: EventCategory.FITNESS,
      venueName: 'The William Vale Rooftop',
      neighborhood: 'Williamsburg',
      priceMin: 20,
      priceMax: 35,
      sourceDomain: 'nycgovparks.org',
      checksum: 'checksum_rooftop_yoga',
      canonicalUrlHash: 'hash_rooftop_yoga',
      imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800',
    },
    {
      sourceUrl: 'https://www.eventbrite.com/e/soho-sketch-walk-tickets',
      title: 'SoHo Sketch Walk + Gallery Hopping',
      city: 'New York',
      startTime: new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000),
      category: EventCategory.ARTS,
      venueName: 'SoHo Broadway',
      neighborhood: 'SoHo',
      priceMin: 35,
      priceMax: 35,
      sourceDomain: 'eventbrite.com',
      checksum: 'checksum_soho_sketch',
      canonicalUrlHash: 'hash_soho_sketch',
      imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800',
    },
    {
      sourceUrl: 'https://www.meetup.com/nyc-tech-creators/events/123456789',
      title: 'NYC Tech Creators Lightning Talks',
      city: 'New York',
      startTime: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
      category: EventCategory.NETWORKING,
      venueName: 'company: FastForward Labs',
      neighborhood: 'Flatiron',
      priceMin: 0,
      priceMax: 0,
      sourceDomain: 'meetup.com',
      checksum: 'checksum_tech_creators',
      canonicalUrlHash: 'hash_tech_creators',
      imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800',
    },
    {
      sourceUrl: 'https://www.amnh.org/calendar/family-science-day',
      title: 'Family Science Day at AMNH',
      city: 'New York',
      startTime: new Date(now.getTime() + 11 * 24 * 60 * 60 * 1000),
      category: EventCategory.FAMILY,
      venueName: 'American Museum of Natural History',
      neighborhood: 'Upper West Side',
      priceMin: 0,
      priceMax: 25,
      sourceDomain: 'amnh.org',
      checksum: 'checksum_family_science',
      canonicalUrlHash: 'hash_family_science',
      imageUrl: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=800',
    },
    {
      sourceUrl: 'https://www.nycparks.gov/events/central-park-twilight-run',
      title: 'Central Park Twilight 5K',
      city: 'New York',
      startTime: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000 + 19 * 60 * 60 * 1000),
      category: EventCategory.FITNESS,
      venueName: 'Central Park Bandshell',
      neighborhood: 'Central Park',
      priceMin: 30,
      priceMax: 45,
      sourceDomain: 'nycparks.gov',
      checksum: 'checksum_central_park_twilight',
      canonicalUrlHash: 'hash_central_park_twilight',
      imageUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800',
    },
    {
      sourceUrl: 'https://ra.co/events/1765435',
      title: 'Midnight Warehouse Rave',
      city: 'Brooklyn',
      startTime: new Date(now.getTime() + 13 * 24 * 60 * 60 * 1000 + 23 * 60 * 60 * 1000),
      category: EventCategory.MUSIC,
      venueName: 'Knockdown Center',
      neighborhood: 'Maspeth',
      priceMin: 65,
      priceMax: 95,
      sourceDomain: 'ra.co',
      checksum: 'checksum_midnight_warehouse',
      canonicalUrlHash: 'hash_midnight_warehouse',
      imageUrl: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=800',
    },
  ];

  const createdEvents = [];
  for (const event of events) {
    const created = await prisma.event.upsert({
      where: {
        unique_event: {
          canonicalUrlHash: event.canonicalUrlHash,
          startTime: event.startTime,
        },
      },
      update: {},
      create: event,
    });
    createdEvents.push(created);
  }

  console.log(`✅ Seeded ${events.length} events`);

  // V3: Create ranking weights (default version)
  await prisma.rankingWeights.upsert({
    where: { version: 1 },
    update: {},
    create: {
      version: 1,
      weights: {
        textualSimilarity: 0.25,
        semanticSimilarity: 0.20,
        hoursUntilEvent: 0.05,
        isDuringPreferredTime: 0.15,
        isDuringWeekend: 0.03,
        distanceKm: -0.02,
        isInPreferredNeighborhood: 0.08,
        isPreferredCategory: 0.18,
        priceLevel: -0.03,
        isInPriceBudget: 0.10,
        viewCount24h: 0.08,
        saveCount24h: 0.12,
        friendSaveCount: 0.20,
        venueQualityScore: 0.07,
        isNewVenue: 0.05,
        hasBeenSeen: -0.15,
        categoryDiversity: 0.10,
      },
      metrics: {
        accuracy: 0.75,
        eCTR: 0.03,
        trainingDate: new Date().toISOString(),
      },
    },
  });

  console.log('✅ Seeded ranking weights');

  // V3: Create sample ad campaigns
  const campaigns = [
    {
      name: 'Summer Music Series 2025',
      advertiser: 'Brooklyn Bowl',
      status: 'ACTIVE' as const,
      dailyBudget: 100.0,
      totalBudget: 3000.0,
      pacing: 'EVEN' as const,
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      qualityScore: 1.2,
    },
    {
      name: 'Comedy Cellar Happy Hour',
      advertiser: 'Comedy Cellar',
      status: 'ACTIVE' as const,
      dailyBudget: 50.0,
      totalBudget: 1500.0,
      pacing: 'EVEN' as const,
      startDate: new Date(),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      qualityScore: 1.1,
    },
  ];

  const createdCampaigns = [];
  for (const campaign of campaigns) {
    const created = await prisma.adCampaign.create({
      data: campaign,
    });
    createdCampaigns.push(created);
  }

  console.log(`✅ Seeded ${campaigns.length} ad campaigns`);

  // V3: Create ad creatives for each campaign
  const creatives = [
    {
      campaignId: createdCampaigns[0].id,
      kind: 'NATIVE' as const,
      eventId: createdEvents[2].id, // Electronic Music Festival
      headline: 'Electronic Music Festival at Brooklyn Bowl',
      body: 'Experience the best electronic artists this summer. Limited tickets available.',
      imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800',
      cta: 'Get Tickets',
      status: 'APPROVED' as const,
    },
    {
      campaignId: createdCampaigns[1].id,
      kind: 'NATIVE' as const,
      eventId: createdEvents[1].id, // Stand-Up Comedy
      headline: 'Comedy Cellar Open Mic Night',
      body: 'Discover the next big comedy star. Every Thursday at 8pm.',
      imageUrl: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800',
      cta: 'Reserve Seats',
      status: 'APPROVED' as const,
    },
  ];

  for (const creative of creatives) {
    await prisma.adCreative.create({
      data: creative,
    });
  }

  console.log(`✅ Seeded ${creatives.length} ad creatives`);

  // V3: Create ad targeting for campaigns
  const targetings = [
    {
      campaignId: createdCampaigns[0].id,
      cities: ['New York'],
      neighborhoods: ['Williamsburg', 'Bushwick', 'Greenpoint'],
      categories: [EventCategory.MUSIC, EventCategory.DANCE],
      keywords: ['electronic', 'techno', 'house music', 'dj'],
      timesOfDay: ['evening', 'late'],
      daysOfWeek: ['fri', 'sat'],
      priceMin: 20.0,
      priceMax: 100.0,
      minAge: 21,
    },
    {
      campaignId: createdCampaigns[1].id,
      cities: ['New York'],
      neighborhoods: ['Greenwich Village', 'West Village', 'SoHo'],
      categories: [EventCategory.COMEDY],
      keywords: ['comedy', 'stand-up', 'open mic', 'improv'],
      timesOfDay: ['evening'],
      daysOfWeek: ['thu', 'fri', 'sat'],
      priceMin: 10.0,
      priceMax: 50.0,
      minAge: 18,
    },
  ];

  for (const targeting of targetings) {
    await prisma.adTargeting.create({
      data: targeting,
    });
  }

  console.log(`✅ Seeded ${targetings.length} ad targetings`);

  // V3: Initialize ad budgets
  for (const campaign of createdCampaigns) {
    await prisma.adBudget.create({
      data: {
        campaignId: campaign.id,
        spent: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        viewable: 0,
        todaySpent: 0,
        todayDate: new Date(),
      },
    });
  }

  console.log('✅ Seeded ad budgets');

  // V3: Create sample user sessions and consent
  const sessionIds = [
    'sess_demo_user_1',
    'sess_demo_user_2',
    'sess_demo_user_3',
  ];

  for (const sessionId of sessionIds) {
    await prisma.userConsent.upsert({
      where: { sessionId },
      update: {},
      create: {
        sessionId,
        analytics: true,
        personalization: true,
        advertising: true,
        grantedAt: new Date(),
      },
    });
  }

  console.log(`✅ Seeded ${sessionIds.length} user consent records`);

  // V3: Create sample analytics events
  const analyticsEvents = [];

  for (let i = 0; i < 3; i++) {
    const sessionId = sessionIds[i % sessionIds.length];
    const event = createdEvents[i % createdEvents.length];

    // View events
    analyticsEvents.push({
      sessionId,
      eventId: event.id,
      type: 'VIEW' as const,
      props: { source: 'feed', position: i },
      city: 'New York',
      deviceType: 'mobile',
      occurredAt: new Date(Date.now() - (24 - i * 2) * 60 * 60 * 1000),
    });

    // Some saves
    if (i % 2 === 0) {
      analyticsEvents.push({
        sessionId,
        eventId: event.id,
        type: 'SAVE' as const,
        props: { source: 'feed' },
        city: 'New York',
        deviceType: 'mobile',
        occurredAt: new Date(Date.now() - (23 - i * 2) * 60 * 60 * 1000),
      });
    }
  }

  await prisma.analyticsEvent.createMany({
    data: analyticsEvents,
    skipDuplicates: true,
  });

  console.log(`✅ Seeded ${analyticsEvents.length} analytics events`);

  // V3: Create user interactions (saves)
  for (let i = 0; i < createdEvents.length; i++) {
    if (i % 2 === 0) {
      await prisma.userInteraction.upsert({
        where: {
          sessionId_eventId: {
            sessionId: sessionIds[i % sessionIds.length],
            eventId: createdEvents[i].id,
          },
        },
        update: {},
        create: {
          sessionId: sessionIds[i % sessionIds.length],
          eventId: createdEvents[i].id,
          saved: true,
          savedAt: new Date(),
        },
      });
    }
  }

  console.log('✅ Seeded user interactions');

  console.log('\n🎉 Database seeding complete!');
  console.log('\n📊 Summary:');
  console.log(`   - ${sources.length} event sources`);
  console.log(`   - ${venues.length} venues`);
  console.log(`   - ${events.length} sample events`);
  console.log(`   - ${campaigns.length} ad campaigns`);
  console.log(`   - ${creatives.length} ad creatives`);
  console.log(`   - ${targetings.length} ad targetings`);
  console.log(`   - ${sessionIds.length} user sessions with consent`);
  console.log(`   - ${analyticsEvents.length} analytics events`);
  console.log('\n✨ Ready to test v3 features!');
}

main()
  .catch((e) => {
    console.error('Error seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
