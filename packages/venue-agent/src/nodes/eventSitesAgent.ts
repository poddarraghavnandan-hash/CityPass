/**
 * Event Sites Agent
 * Extracts venue data from event platforms (Eventbrite, Meetup, etc.)
 */

import type { CityIngestionContext, RawVenue, EventSiteVenue } from '../types';
import { prisma } from '@citypass/db';

/**
 * Fetch venue data from event platforms
 * Uses existing events in the database to extract venue information
 */
export async function fetchEventSiteVenues(
  context: CityIngestionContext
): Promise<CityIngestionContext> {
  console.log(`[EventSitesAgent] Extracting venues from event platforms...`);

  try {
    // Query events from the database that have venue information
    const events = await prisma.event.findMany({
      where: {
        city: context.city.name,
        venueName: { not: null },
        startTime: { gte: new Date() }, // Only future events
      },
      select: {
        venueName: true,
        address: true,
        lat: true,
        lon: true,
        sourceUrl: true,
        sourceDomain: true,
      },
    });

    console.log(`[EventSitesAgent] Found ${events.length} events with venue info`);

    // Group by venue name to get event counts
    const venueMap = new Map<string, EventSiteVenue>();

    for (const event of events) {
      if (!event.venueName) continue;

      const key = event.venueName.toLowerCase();

      if (venueMap.has(key)) {
        const venue = venueMap.get(key)!;
        venue.eventCount++;
      } else {
        // Determine source from domain
        let source: 'EVENTBRITE' | 'MEETUP' | 'FEVER' | 'DICE' | 'RA' | 'OTHER' = 'OTHER';
        if (event.sourceDomain?.includes('eventbrite')) source = 'EVENTBRITE';
        else if (event.sourceDomain?.includes('meetup')) source = 'MEETUP';
        else if (event.sourceDomain?.includes('fever')) source = 'FEVER';
        else if (event.sourceDomain?.includes('dice')) source = 'DICE';
        else if (event.sourceDomain?.includes('residentadvisor')) source = 'RA';

        if (source === 'OTHER') continue; // Skip non-event-platform sources

        venueMap.set(key, {
          source,
          venueName: event.venueName,
          venueUrl: event.sourceUrl || undefined,
          address: event.address || undefined,
          lat: event.lat || undefined,
          lon: event.lon || undefined,
          city: context.city.name,
          eventCount: 1,
        });
      }
    }

    // Convert to RawVenues
    const rawVenues: RawVenue[] = [];

    for (const eventVenue of venueMap.values()) {
      // Only include venues with multiple events (higher confidence)
      if (eventVenue.eventCount < 2) continue;

      rawVenues.push({
        source: eventVenue.source as any,
        sourceExternalId: `venue:${eventVenue.venueName}`,
        sourceUrl: eventVenue.venueUrl,
        rawPayload: eventVenue,
        confidence: Math.min(0.7 + eventVenue.eventCount * 0.05, 0.95),

        rawName: eventVenue.venueName,

        lat: eventVenue.lat,
        lon: eventVenue.lon,
        address: eventVenue.address,
        city: eventVenue.city,

        categories: ['event_venue'],
      });
    }

    console.log(`[EventSitesAgent] Extracted ${rawVenues.length} unique venues`);

    if (!context.rawVenues) context.rawVenues = [];
    context.rawVenues.push(...rawVenues);

    context.stats.eventSiteVenues = rawVenues.length;
    context.stats.rawTotal += rawVenues.length;

    return context;
  } catch (error: any) {
    console.error(`[EventSitesAgent] Error:`, error);
    context.errors.push({
      agentName: 'EventSitesAgent',
      source: 'EVENT_PLATFORMS',
      message: error.message,
      timestamp: new Date(),
    });
    context.stats.eventSiteVenues = 0;
    return context;
  }
}
