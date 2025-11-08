/**
 * ClassPass/Mindbody API Integration
 * Fetches fitness classes, yoga sessions, wellness events
 */

interface MindbodyClass {
  Id: number;
  Name: string;
  Description: string;
  StartDateTime: string;
  EndDateTime: string;
  Location: {
    Id: number;
    Name: string;
    Address: string;
    City: string;
    StateProvCode: string;
    PostalCode: string;
    Latitude: number;
    Longitude: number;
  };
  Staff?: {
    Id: number;
    Name: string;
  };
  ClassScheduleId: number;
  MaxCapacity: number;
  TotalBooked: number;
  WebCapacity: number;
  BookingUrl?: string;
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
  organizer: string | null;
}

export async function searchClassPass(
  query: string,
  city: string,
  category?: string | null
): Promise<NormalizedEvent[]> {
  const apiKey = process.env.MINDBODY_API_KEY;
  const siteId = process.env.MINDBODY_SITE_ID;

  if (!apiKey || !siteId) {
    console.warn('⚠️ MINDBODY_API_KEY or MINDBODY_SITE_ID not configured');
    return [];
  }

  try {
    // Get classes for the next 7 days
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);

    const params = new URLSearchParams({
      'StartDateTime': startDate.toISOString(),
      'EndDateTime': endDate.toISOString(),
      'LocationIds': '', // All locations for the site
    });

    const response = await fetch(
      `https://api.mindbodyonline.com/public/v6/class/classes?${params}`,
      {
        headers: {
          'Api-Key': apiKey,
          'SiteId': siteId,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error(`Mindbody API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const classes: MindbodyClass[] = data.Classes || [];

    // Filter by query and city
    const filteredClasses = classes.filter((cls) => {
      const matchesQuery = query
        ? cls.Name.toLowerCase().includes(query.toLowerCase()) ||
          cls.Description?.toLowerCase().includes(query.toLowerCase())
        : true;

      const matchesCity = cls.Location.City.toLowerCase() === city.toLowerCase();

      return matchesQuery && matchesCity;
    });

    return filteredClasses.map((cls) => normalizeMindbodyClass(cls));
  } catch (error: any) {
    console.error('ClassPass/Mindbody search failed:', error.message);
    return [];
  }
}

function normalizeMindbodyClass(cls: MindbodyClass): NormalizedEvent {
  const bookingUrl = cls.BookingUrl || `https://clients.mindbodyonline.com/classic/ws?studioid=${cls.Location.Id}`;

  return {
    sourceUrl: bookingUrl,
    title: cls.Name,
    description: cls.Description || '',
    startTime: new Date(cls.StartDateTime),
    endTime: new Date(cls.EndDateTime),
    venueName: cls.Location.Name,
    address: `${cls.Location.Address}, ${cls.Location.City}, ${cls.Location.StateProvCode} ${cls.Location.PostalCode}`,
    city: cls.Location.City,
    lat: cls.Location.Latitude,
    lon: cls.Location.Longitude,
    priceMin: null, // Pricing requires separate API call
    priceMax: null,
    currency: 'USD',
    category: determineClassCategory(cls.Name, cls.Description),
    imageUrl: null,
    bookingUrl,
    timezone: 'America/New_York', // Would need location-based timezone lookup
    organizer: cls.Staff?.Name || null,
  };
}

function determineClassCategory(name: string, description?: string): string {
  const text = `${name} ${description || ''}`.toLowerCase();

  if (text.match(/yoga|meditation|mindfulness|pilates/)) {
    return 'WELLNESS';
  }
  if (text.match(/spin|cycling|cardio|hiit|boot camp|crossfit|boxing|kickboxing/)) {
    return 'FITNESS';
  }
  if (text.match(/dance|zumba|barre/)) {
    return 'FITNESS';
  }
  if (text.match(/strength|weight|lifting|muscle/)) {
    return 'FITNESS';
  }
  if (text.match(/swim|aqua/)) {
    return 'SPORTS';
  }

  return 'WELLNESS';
}

/**
 * Alternative: Use ClassPass's partner API if available
 */
export async function searchClassPassDirect(
  query: string,
  city: string,
  category?: string | null
): Promise<NormalizedEvent[]> {
  // ClassPass doesn't have a public API yet
  // This is a placeholder for when they release their partner API
  console.warn('⚠️ ClassPass direct API not yet available - using Mindbody integration');
  return searchClassPass(query, city, category);
}
