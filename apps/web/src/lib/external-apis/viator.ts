/**
 * Viator (TripAdvisor) API Integration
 * Fetches tours, attractions, and experiences
 */

interface ViatorProduct {
  productCode: string;
  title: string;
  description: string;
  productUrl: string;
  images: Array<{ variants: Array<{ url: string }> }>;
  pricing: {
    summary: {
      fromPrice: number;
      fromPriceBeforeDiscount?: number;
    };
    currency: string;
  };
  location: {
    ref: string;
    name: string;
    address?: {
      street1?: string;
      city: string;
      state?: string;
      postcode?: string;
    };
  };
  reviews?: {
    combinedAverageRating: number;
    totalReviews: number;
  };
  tags: Array<{ tag: string; tagId: number }>;
  duration?: {
    fixedDurationInMinutes?: number;
    variableDurationFromMinutes?: number;
    variableDurationToMinutes?: number;
  };
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

export async function searchViator(
  query: string,
  city: string,
  category?: string | null
): Promise<NormalizedEvent[]> {
  const apiKey = process.env.VIATOR_API_KEY;

  if (!apiKey) {
    console.warn('⚠️ VIATOR_API_KEY not configured');
    return [];
  }

  try {
    // Viator uses destination codes - map major cities
    const destinationCode = getCityDestinationCode(city);

    if (!destinationCode) {
      console.warn(`No Viator destination code for city: ${city}`);
      return [];
    }

    // Search products
    const searchBody = {
      filtering: {
        destination: destinationCode,
        searchTerm: query,
      },
      pagination: {
        offset: 0,
        limit: 20,
      },
      currency: 'USD',
    };

    const response = await fetch(
      'https://api.viator.com/partner/products/search',
      {
        method: 'POST',
        headers: {
          'Accept': 'application/json;version=2.0',
          'Accept-Language': 'en-US',
          'exp-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchBody),
      }
    );

    if (!response.ok) {
      console.error(`Viator API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const products: ViatorProduct[] = data.products || [];

    return products.map((product) => normalizeViatorProduct(product, city));
  } catch (error: any) {
    console.error('Viator search failed:', error.message);
    return [];
  }
}

function normalizeViatorProduct(product: ViatorProduct, city: string): NormalizedEvent {
  // Viator experiences don't have fixed dates, so we use "available today"
  const startTime = new Date();
  startTime.setHours(10, 0, 0, 0); // Default to 10 AM

  let endTime: Date | null = null;
  if (product.duration?.fixedDurationInMinutes) {
    endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + product.duration.fixedDurationInMinutes);
  } else if (product.duration?.variableDurationToMinutes) {
    endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + product.duration.variableDurationToMinutes);
  }

  const address = product.location.address
    ? `${product.location.address.street1 || ''}, ${product.location.address.city}`.trim()
    : product.location.name;

  return {
    sourceUrl: product.productUrl,
    title: product.title,
    description: product.description,
    startTime,
    endTime,
    venueName: product.location.name,
    address,
    city: product.location.address?.city || city,
    lat: null, // Viator doesn't provide coordinates in search results
    lon: null,
    priceMin: product.pricing.summary.fromPrice,
    priceMax: product.pricing.summary.fromPriceBeforeDiscount || null,
    currency: product.pricing.currency,
    category: mapViatorCategory(product.tags),
    imageUrl: product.images[0]?.variants[0]?.url || null,
    bookingUrl: product.productUrl,
    timezone: getCityTimezone(city),
  };
}

function getCityDestinationCode(city: string): string | null {
  const cityMap: Record<string, string> = {
    'New York': '684',
    'Los Angeles': '672',
    'Chicago': '653',
    'San Francisco': '704',
    'Miami': '677',
    'Las Vegas': '671',
    'Washington': '718',
    'Boston': '646',
    'Seattle': '703',
    'Austin': '639',
    'Portland': '695',
    'Denver': '656',
    'San Diego': '702',
    'Philadelphia': '693',
    'Phoenix': '694',
  };

  return cityMap[city] || null;
}

function mapViatorCategory(tags: Array<{ tag: string; tagId: number }>): string {
  if (!tags || tags.length === 0) return 'OTHER';

  // Check for relevant category tags
  const tagText = tags.map(t => t.tag.toLowerCase()).join(' ');

  if (tagText.includes('food') || tagText.includes('culinary') || tagText.includes('wine')) {
    return 'FOOD_DRINK';
  }
  if (tagText.includes('art') || tagText.includes('museum') || tagText.includes('culture')) {
    return 'ARTS';
  }
  if (tagText.includes('music') || tagText.includes('concert') || tagText.includes('show')) {
    return 'MUSIC';
  }
  if (tagText.includes('sport') || tagText.includes('adventure') || tagText.includes('outdoor')) {
    return 'SPORTS';
  }
  if (tagText.includes('wellness') || tagText.includes('spa')) {
    return 'WELLNESS';
  }
  if (tagText.includes('night') || tagText.includes('bar') || tagText.includes('club')) {
    return 'NIGHTLIFE';
  }

  return 'OTHER';
}

function getCityTimezone(city: string): string {
  const timezoneMap: Record<string, string> = {
    'New York': 'America/New_York',
    'Los Angeles': 'America/Los_Angeles',
    'Chicago': 'America/Chicago',
    'Denver': 'America/Denver',
    'Phoenix': 'America/Phoenix',
    'San Francisco': 'America/Los_Angeles',
    'Seattle': 'America/Los_Angeles',
    'Miami': 'America/New_York',
    'Boston': 'America/New_York',
    'Austin': 'America/Chicago',
  };

  return timezoneMap[city] || 'America/New_York';
}
