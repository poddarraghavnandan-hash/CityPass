import { prisma, EventCategory } from '@citypass/db';
import { canonicalUrlHash, contentChecksum } from '@citypass/utils';
import { SEED_EVENTS_BY_CITY, SeedEventDefinition } from './seedData';

// Optional Typesense import - gracefully handle if not available
let ensureEventsCollection: (() => Promise<void>) | undefined;
let indexEvent: ((event: any) => Promise<void>) | undefined;
try {
  const typesense = require('@citypass/search/typesense');
  ensureEventsCollection = typesense.ensureEventsCollection;
  indexEvent = typesense.indexEvent;
} catch (e) {
  console.warn('Typesense module not available, search indexing disabled');
}

const MIN_EVENTS_PER_CITY = parseInt(process.env.CITYLENS_MIN_SEED_EVENTS ?? '12', 10);

export async function ensureSeedInventory() {
  if (ensureEventsCollection) {
    try {
      await ensureEventsCollection();
    } catch (e) {
      console.warn('Typesense collection setup failed:', e);
    }
  }

  let created = 0;
  const now = new Date();

  for (const [city, seeds] of Object.entries(SEED_EVENTS_BY_CITY)) {
    const upcomingCount = await prisma.event.count({
      where: {
        city,
        startTime: { gte: now },
      },
    });

    if (upcomingCount >= MIN_EVENTS_PER_CITY) {
      continue;
    }

    for (const seed of seeds) {
      const inserted = await maybeCreateSeedEvent(seed);
      if (inserted) {
        created += 1;
      }
    }
  }

  return {
    created,
    minPerCity: MIN_EVENTS_PER_CITY,
  };
}

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

  if (indexEvent) {
    try {
      await indexEvent(event);
    } catch (e) {
      console.warn('Typesense indexing failed:', e);
    }
  }
  return true;
}
