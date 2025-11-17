/**
 * Event Normalization and Deduplication
 * Normalizes scraped events and detects duplicates before persisting
 */

import { prisma } from '@citypass/db';
import type { RawEvent, ScraperStats } from './types';
import {
  canonicalUrlHash,
  contentChecksum,
  canonicalVenueName,
  normalizeCategory,
} from '@citypass/utils';

interface NormalizedEvent {
  id: string;
  canonicalUrlHash: string;
  contentHash: string;
  sourceId: string;
  sourceUrl: string;
  sourceUpdatedAt?: Date;
  title: string;
  description?: string;
  venueName?: string;
  address?: string;
  city: string;
  lat?: number;
  lon?: number;
  startTime: Date;
  endTime?: Date;
  category?: string;
  tags?: string[];
  priceMin?: number;
  priceMax?: number;
  imageUrl?: string;
  bookingUrl?: string;
  organizerName?: string;
  organizerId?: string;
}

/**
 * Normalize a raw event
 * Handles timezone conversion, canonicalization, and validation
 */
export function normalizeEvent(raw: RawEvent): NormalizedEvent | null {
  try {
    // Validate required fields
    if (!raw.title || !raw.sourceUrl || !raw.startTime || !raw.city) {
      console.warn('⚠️ Skipping event: missing required fields', {
        title: raw.title,
        sourceUrl: raw.sourceUrl,
      });
      return null;
    }

    // Ensure startTime is in future
    const now = new Date();
    if (raw.startTime < now) {
      return null;
    }

    // Ensure startTime is valid
    if (isNaN(raw.startTime.getTime())) {
      console.warn('⚠️ Skipping event: invalid startTime', {
        title: raw.title,
        startTime: raw.startTime,
      });
      return null;
    }

    // Convert to UTC if needed
    const startTime = ensureUTC(raw.startTime);
    const endTime = raw.endTime ? ensureUTC(raw.endTime) : undefined;

    // Canonicalize venue name
    const venueName = raw.venueName
      ? canonicalVenueName(raw.venueName)
      : undefined;

    // Normalize category
    const category = normalizeCategory(raw.category);

    // Deduplicate tags
    const tags = raw.tags
      ? Array.from(new Set(raw.tags.map(t => t.toLowerCase().trim())))
      : undefined;

    // Generate hashes for deduplication
    const canonicalUrlHash = canonicalUrlHash(raw.sourceUrl);
    const contentHash = contentChecksum({
      title: raw.title,
      description: raw.description,
      start_time: startTime.toISOString(),
      end_time: endTime?.toISOString(),
      venue_name: venueName,
      price_min: raw.priceMin,
      price_max: raw.priceMax,
    });

    return {
      id: `${raw.sourceId}-${canonicalUrlHash}`.substring(0, 255),
      canonicalUrlHash,
      contentHash,
      sourceId: raw.sourceId,
      sourceUrl: raw.sourceUrl,
      sourceUpdatedAt: raw.sourceUpdatedAt,
      title: raw.title.trim(),
      description: raw.description?.trim(),
      venueName,
      address: raw.address?.trim(),
      city: raw.city.trim(),
      lat: raw.lat,
      lon: raw.lon,
      startTime,
      endTime,
      category,
      tags,
      priceMin: raw.priceMin,
      priceMax: raw.priceMax,
      imageUrl: raw.imageUrl,
      bookingUrl: raw.bookingUrl || raw.sourceUrl,
      organizerName: raw.organizerName,
      organizerId: raw.organizerId,
    };
  } catch (error: any) {
    console.error('❌ Error normalizing event:', error.message, raw);
    return null;
  }
}

/**
 * Ensure date is in UTC
 * Handles timezone-naive dates by treating them as local time
 */
function ensureUTC(date: Date): Date {
  // If date already has timezone info, return as-is
  if (date.toISOString().endsWith('Z') || date.getTimezoneOffset() === 0) {
    return date;
  }

  // Otherwise, treat as local time and convert to UTC
  return new Date(date.toISOString());
}

/**
 * Persist normalized events to database with deduplication
 */
export async function persistEvents(
  events: RawEvent[],
  options: {
    batchSize?: number;
    skipDuplicates?: boolean;
  } = {}
): Promise<ScraperStats> {
  const { batchSize = 100, skipDuplicates = true } = options;
  const startTime = Date.now();

  let totalScraped = events.length;
  let newEvents = 0;
  let updatedEvents = 0;
  let skippedEvents = 0;
  let errors = 0;

  // Normalize all events
  const normalized = events
    .map(e => normalizeEvent(e))
    .filter((e): e is NormalizedEvent => e !== null);

  console.log(
    `📊 Normalized ${normalized.length}/${events.length} events`
  );

  if (skipDuplicates) {
    // Check for existing events by URL hash
    const canonicalUrlHashes = normalized.map(e => e.canonicalUrlHash);
    const existing = await prisma.event.findMany({
      where: { canonicalUrlHash: { in: canonicalUrlHashes } },
      select: { id: true, canonicalUrlHash: true, contentHash: true },
    });

    const existingMap = new Map(
      existing.map(e => [e.canonicalUrlHash, e])
    );

    // Separate new events from updates
    const toCreate: NormalizedEvent[] = [];
    const toUpdate: NormalizedEvent[] = [];

    for (const event of normalized) {
      const existingEvent = existingMap.get(event.canonicalUrlHash);

      if (!existingEvent) {
        toCreate.push(event);
      } else if (existingEvent.contentHash !== event.contentHash) {
        toUpdate.push(event);
      } else {
        skippedEvents++;
      }
    }

    console.log(
      `📈 Plan: Create ${toCreate.length}, Update ${toUpdate.length}, Skip ${skippedEvents}`
    );

    // Create new events in batches
    for (let i = 0; i < toCreate.length; i += batchSize) {
      const batch = toCreate.slice(i, i + batchSize);

      try {
        await prisma.event.createMany({
          data: batch.map(e => ({
            id: e.id,
            canonicalUrlHash: e.canonicalUrlHash,
            contentHash: e.contentHash,
            sourceId: e.sourceId,
            sourceUrl: e.sourceUrl,
            sourceUpdatedAt: e.sourceUpdatedAt,
            title: e.title,
            description: e.description,
            venueName: e.venueName,
            address: e.address,
            city: e.city,
            lat: e.lat,
            lon: e.lon,
            startTime: e.startTime,
            endTime: e.endTime,
            category: e.category,
            tags: e.tags,
            priceMin: e.priceMin,
            priceMax: e.priceMax,
            imageUrl: e.imageUrl,
            bookingUrl: e.bookingUrl,
            organizerName: e.organizerName,
            organizerId: e.organizerId,
          })),
          skipDuplicates: true,
        });

        newEvents += batch.length;
      } catch (error: any) {
        console.error(`❌ Error creating batch:`, error.message);
        errors += batch.length;
      }
    }

    // Update existing events in batches
    for (let i = 0; i < toUpdate.length; i += batchSize) {
      const batch = toUpdate.slice(i, i + batchSize);

      for (const event of batch) {
        try {
          const existingId = existingMap.get(event.canonicalUrlHash)!.id;

          await prisma.event.update({
            where: { id: existingId },
            data: {
              contentHash: event.contentHash,
              title: event.title,
              description: event.description,
              venueName: event.venueName,
              address: event.address,
              lat: event.lat,
              lon: event.lon,
              startTime: event.startTime,
              endTime: event.endTime,
              category: event.category,
              tags: event.tags,
              priceMin: event.priceMin,
              priceMax: event.priceMax,
              imageUrl: event.imageUrl,
              bookingUrl: event.bookingUrl,
              sourceUpdatedAt: new Date(),
            },
          });

          updatedEvents++;
        } catch (error: any) {
          console.error(`❌ Error updating event:`, error.message);
          errors++;
        }
      }
    }
  } else {
    // Create all events without deduplication
    for (let i = 0; i < normalized.length; i += batchSize) {
      const batch = normalized.slice(i, i + batchSize);

      try {
        await prisma.event.createMany({
          data: batch.map(e => ({
            id: e.id,
            canonicalUrlHash: e.canonicalUrlHash,
            contentHash: e.contentHash,
            sourceId: e.sourceId,
            sourceUrl: e.sourceUrl,
            title: e.title,
            description: e.description,
            venueName: e.venueName,
            address: e.address,
            city: e.city,
            lat: e.lat,
            lon: e.lon,
            startTime: e.startTime,
            endTime: e.endTime,
            category: e.category,
            tags: e.tags,
            priceMin: e.priceMin,
            priceMax: e.priceMax,
            imageUrl: e.imageUrl,
            bookingUrl: e.bookingUrl,
          })),
          skipDuplicates: true,
        });

        newEvents += batch.length;
      } catch (error: any) {
        console.error(`❌ Error creating batch:`, error.message);
        errors += batch.length;
      }
    }
  }

  const durationMs = Date.now() - startTime;

  const stats: ScraperStats = {
    totalScraped,
    newEvents,
    updatedEvents,
    skippedEvents,
    errors,
    durationMs,
  };

  console.log(`✅ Persist stats:`, stats);

  return stats;
}

/**
 * Clean up old events
 * Removes events that are in the past and haven't been updated recently
 */
export async function cleanupOldEvents(
  daysOld: number = 7
): Promise<number> {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

  const result = await prisma.event.deleteMany({
    where: {
      AND: [
        { startTime: { lt: new Date() } },
        { updatedAt: { lt: cutoffDate } },
      ],
    },
  });

  console.log(`🗑️ Deleted ${result.count} old events`);

  return result.count;
}
