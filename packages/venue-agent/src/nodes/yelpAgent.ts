/**
 * Yelp Fusion API Agent
 * Fetches venue data from Yelp
 */

import type { CityIngestionContext, RawVenue, YelpBusiness } from '../types';
import { getBboxCenter, getBboxRadius } from '../utils/geo';

const YELP_API_KEY = process.env.YELP_API_KEY;
const YELP_API_URL = 'https://api.yelp.com/v3/businesses/search';

/**
 * Fetch venues from Yelp Fusion API
 */
export async function fetchYelpVenues(
  context: CityIngestionContext
): Promise<CityIngestionContext> {
  console.log(`[YelpAgent] Fetching venues for ${context.city.name}...`);

  if (!YELP_API_KEY) {
    console.warn(`[YelpAgent] YELP_API_KEY not configured, running in degraded mode`);
    context.errors.push({
      agentName: 'YelpAgent',
      source: 'YELP',
      message: 'API key not configured',
      timestamp: new Date(),
    });
    context.stats.yelpVenues = 0;
    return context;
  }

  try {
    const center = getBboxCenter(context.city.bbox);
    const radius = Math.min(Math.floor(getBboxRadius(context.city.bbox)), 40000); // Max 40km

    const categories = ['nightlife', 'arts', 'active', 'restaurants', 'eventservices'];
    const rawVenues: RawVenue[] = [];

    for (const category of categories) {
      let offset = 0;
      const limit = 50;
      const maxResults = context.runType === 'FULL' ? 200 : 50;

      while (offset < maxResults) {
        const url = new URL(YELP_API_URL);
        url.searchParams.set('latitude', center.lat.toString());
        url.searchParams.set('longitude', center.lon.toString());
        url.searchParams.set('radius', radius.toString());
        url.searchParams.set('categories', category);
        url.searchParams.set('limit', limit.toString());
        url.searchParams.set('offset', offset.toString());

        const response = await fetch(url.toString(), {
          headers: {
            'Authorization': `Bearer ${YELP_API_KEY}`,
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          console.warn(`[YelpAgent] API error for ${category}: ${response.status}`);
          break;
        }

        const data = await response.json();
        const businesses: YelpBusiness[] = data.businesses || [];

        if (businesses.length === 0) break;

        for (const business of businesses) {
          rawVenues.push(yelpToRawVenue(business, context.city.name));
        }

        offset += limit;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`[YelpAgent] Total: ${rawVenues.length} venues`);

    if (!context.rawVenues) context.rawVenues = [];
    context.rawVenues.push(...rawVenues);

    context.stats.yelpVenues = rawVenues.length;
    context.stats.rawTotal += rawVenues.length;

    return context;
  } catch (error: any) {
    console.error(`[YelpAgent] Error:`, error);
    context.errors.push({
      agentName: 'YelpAgent',
      source: 'YELP',
      message: error.message,
      timestamp: new Date(),
    });
    context.stats.yelpVenues = 0;
    return context;
  }
}

function yelpToRawVenue(business: YelpBusiness, cityName: string): RawVenue {
  const categories = business.categories.map(c => c.alias);
  const address = business.location.display_address?.join(', ');

  return {
    source: 'YELP',
    sourceExternalId: business.id,
    sourceUrl: business.url,
    rawPayload: business,
    confidence: 0.9,

    rawName: business.name,

    lat: business.coordinates.latitude,
    lon: business.coordinates.longitude,

    address,
    city: cityName,

    categories,

    priceLevel: business.price?.length,
    rating: business.rating,
    reviewCount: business.review_count,

    website: business.url,
    phone: business.phone || business.display_phone,
    imageUrl: business.image_url,
  };
}
