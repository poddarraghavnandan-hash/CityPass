/**
 * Event Platform APIs
 * Free tier integrations with Eventbrite and Ticketmaster for event discovery
 */

import type { DiscoveredEvent } from './eventDiscoverer';

const EVENTBRITE_API_KEY = process.env.EVENTBRITE_API_KEY;
const TICKETMASTER_API_KEY = process.env.TICKETMASTER_API_KEY;

interface EventbriteEvent {
  id: string;
  name: { text: string };
  description: { text: string };
  start: { local: string; timezone: string };
  end?: { local: string };
  url: string;
  venue?: {
    name: string;
    address: { city: string; region: string; address_1: string };
    latitude: string;
    longitude: string;
  };
  ticket_availability?: { minimum_ticket_price?: { major_value: number; currency: string } };
  category?: { name: string };
}

interface TicketmasterEvent {
  id: string;
  name: string;
  info?: string;
  url: string;
  dates: {
    start: { localDate: string; localTime?: string };
  };
  priceRanges?: Array<{ min: number; max: number; currency: string }>;
  _embedded?: {
    venues?: Array<{
      name: string;
      city: { name: string };
      state: { stateCode: string };
      address: { line1: string };
      location?: { latitude: string; longitude: string };
    }>;
  };
  classifications?: Array<{
    segment: { name: string };
    genre: { name: string };
  }>;
}

/**
 * Search Eventbrite for events
 */
export async function searchEventbrite(params: {
  query: string;
  city: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  category?: string;
}): Promise<DiscoveredEvent[]> {
  if (!EVENTBRITE_API_KEY) {
    console.log('[EventbriteAPI] API key not configured');
    return [];
  }

  try {
    console.log(`[EventbriteAPI] Searching: ${params.query} in ${params.city}`);

    const url = new URL('https://www.eventbriteapi.com/v3/events/search/');
    url.searchParams.set('q', params.query);
    url.searchParams.set('location.address', params.city);
    url.searchParams.set('start_date.range_start', `${params.startDate}T00:00:00`);
    url.searchParams.set('start_date.range_end', `${params.endDate}T23:59:59`);
    url.searchParams.set('expand', 'venue,ticket_availability,category');
    url.searchParams.set('page_size', '50');

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${EVENTBRITE_API_KEY}`,
      },
    });

    if (!response.ok) {
      console.error(`[EventbriteAPI] API error: ${response.status}`);
      return [];
    }

    const data = await response.json() as { events: EventbriteEvent[] };
    const events = data.events || [];

    console.log(`[EventbriteAPI] Found ${events.length} events`);

    return events.map((event) => mapEventbriteEvent(event, params.city));
  } catch (error) {
    console.error('[EventbriteAPI] Search failed:', error);
    return [];
  }
}

/**
 * Search Ticketmaster for events
 */
export async function searchTicketmaster(params: {
  query: string;
  city: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  category?: string;
}): Promise<DiscoveredEvent[]> {
  if (!TICKETMASTER_API_KEY) {
    console.log('[TicketmasterAPI] API key not configured');
    return [];
  }

  try {
    console.log(`[TicketmasterAPI] Searching: ${params.query} in ${params.city}`);

    const url = new URL('https://app.ticketmaster.com/discovery/v2/events.json');
    url.searchParams.set('keyword', params.query);
    url.searchParams.set('city', params.city);
    url.searchParams.set('startDateTime', `${params.startDate}T00:00:00Z`);
    url.searchParams.set('endDateTime', `${params.endDate}T23:59:59Z`);
    url.searchParams.set('size', '50');
    url.searchParams.set('apikey', TICKETMASTER_API_KEY);

    if (params.category) {
      // Map our categories to Ticketmaster classifications
      const categoryMap: Record<string, string> = {
        MUSIC: 'Music',
        THEATRE: 'Arts & Theatre',
        DANCE: 'Arts & Theatre',
        ARTS: 'Arts & Theatre',
        COMEDY: 'Arts & Theatre',
      };
      const tmCategory = categoryMap[params.category];
      if (tmCategory) {
        url.searchParams.set('classificationName', tmCategory);
      }
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      console.error(`[TicketmasterAPI] API error: ${response.status}`);
      return [];
    }

    const data = await response.json() as { _embedded?: { events: TicketmasterEvent[] } };
    const events = data._embedded?.events || [];

    console.log(`[TicketmasterAPI] Found ${events.length} events`);

    return events.map((event) => mapTicketmasterEvent(event, params.city));
  } catch (error) {
    console.error('[TicketmasterAPI] Search failed:', error);
    return [];
  }
}

/**
 * Map Eventbrite event to DiscoveredEvent
 */
function mapEventbriteEvent(event: EventbriteEvent, city: string): DiscoveredEvent {
  const venue = event.venue;
  const category = mapCategoryToEnum(event.category?.name || '');

  return {
    title: event.name.text,
    venueName: venue?.name || null,
    address: venue?.address.address_1 || null,
    city: venue?.address.city || city,
    category,
    startTime: event.start.local,
    endTime: event.end?.local || null,
    priceMin: event.ticket_availability?.minimum_ticket_price?.major_value || null,
    priceMax: null,
    description: event.description.text?.slice(0, 500) || null,
    sourceUrl: event.url,
    imageUrl: null,
    lat: venue?.latitude ? parseFloat(venue.latitude) : null,
    lon: venue?.longitude ? parseFloat(venue.longitude) : null,
  };
}

/**
 * Map Ticketmaster event to DiscoveredEvent
 */
function mapTicketmasterEvent(event: TicketmasterEvent, city: string): DiscoveredEvent {
  const venue = event._embedded?.venues?.[0];
  const priceRange = event.priceRanges?.[0];
  const classification = event.classifications?.[0];
  const category = mapCategoryToEnum(classification?.segment.name || classification?.genre.name || '');

  // Construct full datetime
  const date = event.dates.start.localDate;
  const time = event.dates.start.localTime || '19:00:00';
  const startTime = `${date}T${time}`;

  return {
    title: event.name,
    venueName: venue?.name || null,
    address: venue?.address.line1 || null,
    city: venue?.city.name || city,
    category,
    startTime,
    endTime: null,
    priceMin: priceRange?.min || null,
    priceMax: priceRange?.max || null,
    description: event.info?.slice(0, 500) || null,
    sourceUrl: event.url,
    imageUrl: null,
    lat: venue?.location?.latitude ? parseFloat(venue.location.latitude) : null,
    lon: venue?.location?.longitude ? parseFloat(venue.location.longitude) : null,
  };
}

/**
 * Map platform categories to our EventCategory enum
 */
function mapCategoryToEnum(categoryName: string): string {
  const lower = categoryName.toLowerCase();

  if (lower.includes('music') || lower.includes('concert')) return 'MUSIC';
  if (lower.includes('comedy')) return 'COMEDY';
  if (lower.includes('theatre') || lower.includes('theater') || lower.includes('play')) return 'THEATRE';
  if (lower.includes('dance') || lower.includes('ballet')) return 'DANCE';
  if (lower.includes('art') || lower.includes('museum') || lower.includes('gallery')) return 'ARTS';
  if (lower.includes('food') || lower.includes('dining')) return 'FOOD';
  if (lower.includes('fitness') || lower.includes('sport') || lower.includes('yoga')) return 'FITNESS';
  if (lower.includes('network')) return 'NETWORKING';
  if (lower.includes('family') || lower.includes('kids')) return 'FAMILY';

  return 'OTHER';
}

/**
 * Search all platforms and merge results
 */
export async function searchAllPlatforms(params: {
  query: string;
  city: string;
  startDate: string;
  endDate: string;
  category?: string;
}): Promise<DiscoveredEvent[]> {
  console.log('[EventAPIs] Searching all platforms...');

  // Search both platforms in parallel
  const [eventbriteResults, ticketmasterResults] = await Promise.all([
    searchEventbrite(params),
    searchTicketmaster(params),
  ]);

  // Merge and deduplicate by title + startTime
  const allEvents = [...eventbriteResults, ...ticketmasterResults];
  const uniqueEvents = deduplicateEvents(allEvents);

  console.log(`[EventAPIs] Found ${uniqueEvents.length} unique events across platforms`);

  return uniqueEvents;
}

/**
 * Deduplicate events by title similarity and start time
 */
function deduplicateEvents(events: DiscoveredEvent[]): DiscoveredEvent[] {
  const seen = new Set<string>();
  const unique: DiscoveredEvent[] = [];

  for (const event of events) {
    // Create a key from normalized title + date
    const titleKey = event.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    const dateKey = event.startTime.slice(0, 10); // YYYY-MM-DD
    const key = `${titleKey}-${dateKey}`;

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(event);
    }
  }

  return unique;
}
