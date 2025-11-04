import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@citypass/db';
import { IngestRequestSchema } from '@citypass/types';
import { canonicalUrlHash, contentChecksum, extractDomain, normalizeCategory } from '@citypass/utils';
import { extractEventsFromContent } from '@/lib/extraction';
import { geocodeAddress } from '@/lib/geocoding';
import { indexEvent } from '@/lib/typesense';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('📥 Ingest request received');

    const validated = IngestRequestSchema.parse(body);
    const { sourceId, url, html, markdown, city } = validated;

    // Use markdown if available, otherwise HTML
    const content = markdown || html || '';
    if (!content) {
      return NextResponse.json({ error: 'No content provided' }, { status: 400 });
    }

    // Extract events using LLM
    const extractedEvents = await extractEventsFromContent(content, url, city);

    if (extractedEvents.length === 0) {
      console.log('ℹ️  No events found in content');
      return NextResponse.json({
        success: true,
        eventsCreated: 0,
        eventsUpdated: 0,
      });
    }

    let eventsCreated = 0;
    let eventsUpdated = 0;

    // Process each event
    for (const eventData of extractedEvents) {
      try {
        const domain = extractDomain(eventData.source_url);
        const urlHash = canonicalUrlHash(eventData.source_url);
        const checksum = contentChecksum(eventData);

        // Geocode if needed
        let lat = eventData.lat;
        let lon = eventData.lon;

        if (!lat && !lon && eventData.address) {
          const geo = await geocodeAddress(eventData.address, eventData.city);
          lat = geo.lat;
          lon = geo.lon;
        }

        // Normalize category
        const category = normalizeCategory(eventData.category);

        // Check if event exists
        const existing = await prisma.event.findUnique({
          where: {
            unique_event: {
              canonicalUrlHash: urlHash,
              startTime: new Date(eventData.start_time),
            },
          },
        });

        if (existing) {
          // Check if content changed
          if (existing.checksum === checksum) {
            console.log(`⏭️  Event unchanged: ${eventData.title}`);
            continue;
          }

          // Update event
          const updated = await prisma.event.update({
            where: { id: existing.id },
            data: {
              title: eventData.title,
              subtitle: eventData.subtitle,
              description: eventData.description,
              category,
              organizer: eventData.organizer,
              venueName: eventData.venue_name,
              address: eventData.address,
              neighborhood: eventData.neighborhood,
              city: eventData.city,
              lat,
              lon,
              endTime: eventData.end_time ? new Date(eventData.end_time) : null,
              timezone: eventData.timezone,
              priceMin: eventData.price_min,
              priceMax: eventData.price_max,
              currency: eventData.currency,
              minAge: eventData.min_age,
              tags: eventData.tags || [],
              imageUrl: eventData.image_url,
              bookingUrl: eventData.booking_url,
              accessibility: eventData.accessibility || [],
              checksum,
            },
          });

          // Re-index
          await indexEvent(updated);
          eventsUpdated++;
          console.log(`✏️  Updated event: ${eventData.title}`);
        } else {
          // Create new event
          const created = await prisma.event.create({
            data: {
              sourceUrl: eventData.source_url,
              title: eventData.title,
              subtitle: eventData.subtitle,
              description: eventData.description,
              category,
              organizer: eventData.organizer,
              venueName: eventData.venue_name,
              address: eventData.address,
              neighborhood: eventData.neighborhood,
              city: eventData.city,
              lat,
              lon,
              startTime: new Date(eventData.start_time),
              endTime: eventData.end_time ? new Date(eventData.end_time) : null,
              timezone: eventData.timezone,
              priceMin: eventData.price_min,
              priceMax: eventData.price_max,
              currency: eventData.currency,
              minAge: eventData.min_age,
              tags: eventData.tags || [],
              imageUrl: eventData.image_url,
              bookingUrl: eventData.booking_url,
              accessibility: eventData.accessibility || [],
              sourceDomain: domain,
              canonicalUrlHash: urlHash,
              checksum,
              sourceId,
            },
          });

          // Index to Typesense
          await indexEvent(created);
          eventsCreated++;
          console.log(`✨ Created event: ${eventData.title}`);
        }
      } catch (err) {
        console.error('Error processing event:', err);
        console.error('Event data:', eventData);
      }
    }

    console.log(`✅ Ingest complete: ${eventsCreated} created, ${eventsUpdated} updated`);

    return NextResponse.json({
      success: true,
      eventsCreated,
      eventsUpdated,
      totalProcessed: extractedEvents.length,
    });
  } catch (error: any) {
    console.error('Ingest error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
