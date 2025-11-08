/**
 * Eventbrite API Integration
 * Fetches ticketed events from Eventbrite
 */

interface EventbriteEvent {
  id: string;
  name: { text: string };
  description: { text: string };
  start: { local: string; timezone: string };
  end: { local: string };
  url: string;
  logo?: { url: string };
  venue?: {
    name: string;
    address: {
      address_1: string;
      city: string;
      region: string;
      postal_code: string;
      latitude: string;
      longitude: string;
    };
  };
  ticket_availability?: {
    minimum_ticket_price?: { major_value: number; currency: string };
    maximum_ticket_price?: { major_value: number; currency: string };
  };
  category?: { name: string };
}

interface NormalizedEvent {
  sourceUrl: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date | null;
  venueName: string | null;
  address: string | null;
  city: string;
  lat: number | null;
  lon: number | null;
  priceMin: number | null;
  priceMax: number | null;
  currency: string;
  category: string;
  imageUrl: string | null;
  bookingUrl: string;
  timezone: string;
}

export async function searchEventbrite(
  query: string,
  city: string,
  category?: string | null
): Promise<NormalizedEvent[]> {
  const apiKey = process.env.EVENTBRITE_API_KEY;

  if (!apiKey) {
    console.warn('⚠️ EVENTBRITE_API_KEY not configured');
    return [];
  }

  try {
    // Build search parameters
    const params = new URLSearchParams({
      'q': query,
      'location.address': city,
      'location.within': '25mi',
      'expand': 'venue,ticket_availability,category',
      'sort_by': 'date',
    });

    const response = await fetch(
      `https://www.eventbriteapi.com/v3/events/search/?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      console.error(`Eventbrite API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const events: EventbriteEvent[] = data.events || [];

    return events.map((event) => normalizeEventbriteEvent(event, city));
  } catch (error: any) {
    console.error('Eventbrite search failed:', error.message);
    return [];
  }
}

function normalizeEventbriteEvent(event: EventbriteEvent, city: string): NormalizedEvent {
  const venue = event.venue;
  const pricing = event.ticket_availability;

  return {
    sourceUrl: event.url,
    title: event.name.text,
    description: event.description?.text || '',
    startTime: new Date(event.start.local),
    endTime: event.end ? new Date(event.end.local) : null,
    venueName: venue?.name || null,
    address: venue ? `${venue.address.address_1}, ${venue.address.city}, ${venue.address.region}` : null,
    city: venue?.address.city || city,
    lat: venue?.address.latitude ? parseFloat(venue.address.latitude) : null,
    lon: venue?.address.longitude ? parseFloat(venue.address.longitude) : null,
    priceMin: pricing?.minimum_ticket_price?.major_value || null,
    priceMax: pricing?.maximum_ticket_price?.major_value || null,
    currency: pricing?.minimum_ticket_price?.currency || 'USD',
    category: mapEventbriteCategory(event.category?.name),
    imageUrl: event.logo?.url || null,
    bookingUrl: event.url,
    timezone: event.start.timezone,
  };
}

function mapEventbriteCategory(ebCategory?: string): string {
  if (!ebCategory) return 'OTHER';

  const categoryMap: Record<string, string> = {
    'Music': 'MUSIC',
    'Food & Drink': 'FOOD_DRINK',
    'Performing & Visual Arts': 'ARTS',
    'Health & Wellness': 'WELLNESS',
    'Sports & Fitness': 'SPORTS',
    'Business & Professional': 'NETWORKING',
    'Film, Media & Entertainment': 'ARTS',
    'Fashion & Beauty': 'OTHER',
    'Community & Culture': 'ARTS',
    'Family & Education': 'FAMILY',
  };

  return categoryMap[ebCategory] || 'OTHER';
}
