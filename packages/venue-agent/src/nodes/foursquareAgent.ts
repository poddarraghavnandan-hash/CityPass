/**
 * Foursquare Places API Agent
 * Fetches venue data from Foursquare
 */

import type { CityIngestionContext, RawVenue, FoursquareVenue } from '../types';
import { getBboxCenter, getBboxRadius } from '../utils/geo';

const FOURSQUARE_API_KEY = process.env.FOURSQUARE_API_KEY;
const FOURSQUARE_API_URL = 'https://api.foursquare.com/v3/places/search';

/**
 * Fetch venues from Foursquare Places API
 */
export async function fetchFoursquareVenues(
  context: CityIngestionContext
): Promise<CityIngestionContext> {
  console.log(`[FoursquareAgent] Fetching venues for ${context.city.name}...`);

  // Check if API key is available
  if (!FOURSQUARE_API_KEY) {
    console.warn(
      `[FoursquareAgent] FOURSQUARE_API_KEY not configured, running in degraded mode`
    );
    context.errors.push({
      agentName: 'FoursquareAgent',
      source: 'FOURSQUARE',
      message: 'API key not configured, skipping Foursquare source',
      timestamp: new Date(),
    });
    context.stats.foursquareVenues = 0;
    return context;
  }

  try {
    const center = getBboxCenter(context.city.bbox);
    const radius = Math.min(getBboxRadius(context.city.bbox), 100000); // Max 100km

    // Foursquare category IDs for venues
    const categories = [
      '10032', // Nightlife (bars, clubs)
      '10040', // Live Music Venue
      '10001', // Arts & Entertainment
      '10003', // Fitness Center
      '10056', // Performing Arts
      '13003', // Restaurant
      '13065', // Food Market
      '13383', // Coworking Space
    ].join(',');

    const rawVenues: RawVenue[] = [];
    const limit = 50;
    let offset = 0;
    const maxResults = context.runType === 'FULL' ? 500 : 100;

    while (offset < maxResults) {
      const url = new URL(FOURSQUARE_API_URL);
      url.searchParams.set('ll', `${center.lat},${center.lon}`);
      url.searchParams.set('radius', radius.toString());
      url.searchParams.set('categories', categories);
      url.searchParams.set('limit', limit.toString());
      url.searchParams.set('offset', offset.toString());

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': FOURSQUARE_API_KEY,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Foursquare API error: ${response.status}`);
      }

      const data = await response.json();
      const results: FoursquareVenue[] = data.results || [];

      console.log(
        `[FoursquareAgent] Fetched ${results.length} venues (offset ${offset})`
      );

      if (results.length === 0) break;

      // Convert to RawVenue
      for (const venue of results) {
        rawVenues.push(foursquareToRawVenue(venue, context.city.name));
      }

      offset += limit;

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`[FoursquareAgent] Total: ${rawVenues.length} venues`);

    // Add to context
    if (!context.rawVenues) {
      context.rawVenues = [];
    }
    context.rawVenues.push(...rawVenues);

    context.stats.foursquareVenues = rawVenues.length;
    context.stats.rawTotal += rawVenues.length;

    return context;
  } catch (error: any) {
    console.error(`[FoursquareAgent] Error:`, error);
    context.errors.push({
      agentName: 'FoursquareAgent',
      source: 'FOURSQUARE',
      message: error.message,
      timestamp: new Date(),
    });
    context.stats.foursquareVenues = 0;
    return context;
  }
}

/**
 * Convert Foursquare venue to RawVenue
 */
function foursquareToRawVenue(venue: FoursquareVenue, cityName: string): RawVenue {
  const categories = venue.categories.map(c => c.name.toLowerCase().replace(/\s+/g, '_'));

  return {
    source: 'FOURSQUARE',
    sourceExternalId: venue.fsq_id,
    sourceUrl: venue.link,
    rawPayload: venue,
    confidence: 0.95,

    rawName: venue.name,

    lat: venue.geocodes.main.latitude,
    lon: venue.geocodes.main.longitude,

    address: venue.location.address,
    neighborhood: venue.location.locality,
    city: cityName,

    categories,

    priceLevel: venue.price,
    rating: venue.rating,
    reviewCount: venue.stats?.total_ratings,

    website: venue.link,
  };
}
