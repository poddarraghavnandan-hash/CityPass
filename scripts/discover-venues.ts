/**
 * Automated Venue Discovery using Google Places API
 * Discovers and adds venues at scale across multiple cities
 */

import { prisma, EventCategory, SourceType } from '../packages/db/src/index';

// Google Places API configuration
const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';

interface CityConfig {
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  radius: number; // meters
}

interface PlaceSearchResult {
  place_id: string;
  name: string;
  formatted_address?: string;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
}

interface PlaceDetails {
  name: string;
  website?: string;
  formatted_address?: string;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  url?: string;
}

interface VenueSearchParams {
  city: CityConfig;
  categories: {
    query: string;
    placeTypes: string[];
    eventCategory: EventCategory;
  }[];
  minRating?: number;
  minReviews?: number;
  maxResults?: number;
}

// City configurations
const CITIES: Record<string, CityConfig> = {
  NYC: {
    name: 'New York',
    state: 'NY',
    latitude: 40.7128,
    longitude: -74.0060,
    radius: 20000, // 20km
  },
  LA: {
    name: 'Los Angeles',
    state: 'CA',
    latitude: 34.0522,
    longitude: -118.2437,
    radius: 25000,
  },
  SF: {
    name: 'San Francisco',
    state: 'CA',
    latitude: 37.7749,
    longitude: -122.4194,
    radius: 15000,
  },
  CHICAGO: {
    name: 'Chicago',
    state: 'IL',
    latitude: 41.8781,
    longitude: -87.6298,
    radius: 20000,
  },
  AUSTIN: {
    name: 'Austin',
    state: 'TX',
    latitude: 30.2672,
    longitude: -97.7431,
    radius: 15000,
  },
};

// Category search configurations
const VENUE_CATEGORIES = [
  {
    query: 'live music venue',
    placeTypes: ['night_club', 'bar'],
    eventCategory: EventCategory.MUSIC,
  },
  {
    query: 'concert hall',
    placeTypes: ['concert_hall'],
    eventCategory: EventCategory.MUSIC,
  },
  {
    query: 'comedy club',
    placeTypes: ['comedy_club'],
    eventCategory: EventCategory.COMEDY,
  },
  {
    query: 'theater',
    placeTypes: ['performing_arts_theater'],
    eventCategory: EventCategory.THEATRE,
  },
  {
    query: 'art gallery',
    placeTypes: ['art_gallery', 'museum'],
    eventCategory: EventCategory.ARTS,
  },
  {
    query: 'museum events',
    placeTypes: ['museum'],
    eventCategory: EventCategory.ARTS,
  },
  {
    query: 'food market',
    placeTypes: ['food'],
    eventCategory: EventCategory.FOOD,
  },
  {
    query: 'yoga studio',
    placeTypes: ['gym', 'spa'],
    eventCategory: EventCategory.FITNESS,
  },
  {
    query: 'coworking space events',
    placeTypes: ['coworking_space'],
    eventCategory: EventCategory.NETWORKING,
  },
  {
    query: 'dance studio',
    placeTypes: ['dance_school'],
    eventCategory: EventCategory.DANCE,
  },
];

// Common event URL patterns
const EVENT_URL_PATTERNS = [
  '/events',
  '/calendar',
  '/shows',
  '/whats-on',
  '/schedule',
  '/upcoming',
  '/performances',
  '/exhibitions',
  '/classes',
  '/workshops',
];

/**
 * Search for places using Google Places Text Search API
 */
async function searchPlaces(
  query: string,
  city: CityConfig,
  maxResults: number = 20
): Promise<PlaceSearchResult[]> {
  const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
  url.searchParams.set('query', `${query} in ${city.name}, ${city.state}`);
  url.searchParams.set('location', `${city.latitude},${city.longitude}`);
  url.searchParams.set('radius', city.radius.toString());
  url.searchParams.set('key', GOOGLE_API_KEY);

  console.log(`  → Searching: "${query}" in ${city.name}`);

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places API error: ${data.status} - ${data.error_message || ''}`);
  }

  const results = data.results || [];
  console.log(`  ✓ Found ${results.length} places`);

  return results.slice(0, maxResults);
}

/**
 * Get detailed information about a place
 */
async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  url.searchParams.set('place_id', placeId);
  url.searchParams.set('fields', 'name,website,formatted_address,rating,user_ratings_total,types,url');
  url.searchParams.set('key', GOOGLE_API_KEY);

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.status !== 'OK') {
    console.warn(`  ⚠ Failed to get details for ${placeId}: ${data.status}`);
    return null;
  }

  return data.result;
}

/**
 * Try to find an events page URL from a website
 */
async function findEventUrl(website: string): Promise<string | null> {
  try {
    // Remove trailing slash
    const baseUrl = website.replace(/\/$/, '');

    // Try common event URL patterns
    for (const pattern of EVENT_URL_PATTERNS) {
      const eventUrl = baseUrl + pattern;

      try {
        const response = await fetch(eventUrl, {
          method: 'HEAD',
          redirect: 'follow',
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          console.log(`    ✓ Found event page: ${pattern}`);
          return eventUrl;
        }
      } catch {
        // Continue to next pattern
      }
    }

    // If no event page found, use main website
    console.log(`    ⊘ No event page found, using main website`);
    return website;
  } catch (error) {
    console.warn(`    ⚠ Error checking URLs: ${error}`);
    return null;
  }
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return '';
  }
}

/**
 * Discover venues for a city and category
 */
async function discoverVenuesForCategory(
  city: CityConfig,
  category: { query: string; placeTypes: string[]; eventCategory: EventCategory },
  params: { minRating?: number; minReviews?: number; maxResults?: number }
): Promise<any[]> {
  const venues: any[] = [];

  // Search for places
  const places = await searchPlaces(category.query, city, params.maxResults);

  for (const place of places) {
    try {
      console.log(`  → Processing: ${place.name}`);

      // Get detailed info
      const details = await getPlaceDetails(place.place_id);
      if (!details) continue;

      // Quality filters
      if (params.minRating && (details.rating || 0) < params.minRating) {
        console.log(`    ⊘ Low rating: ${details.rating}`);
        continue;
      }

      if (params.minReviews && (details.user_ratings_total || 0) < params.minReviews) {
        console.log(`    ⊘ Not enough reviews: ${details.user_ratings_total}`);
        continue;
      }

      if (!details.website) {
        console.log(`    ⊘ No website`);
        continue;
      }

      // Find event URL
      const eventUrl = await findEventUrl(details.website);
      if (!eventUrl) {
        console.log(`    ⊘ No accessible URL`);
        continue;
      }

      // Check if venue already exists
      const existing = await prisma.source.findFirst({
        where: {
          OR: [
            { url: eventUrl },
            { name: details.name, city: city.name },
          ],
        },
      });

      if (existing) {
        console.log(`    ⊘ Already exists`);
        continue;
      }

      // Add to results
      venues.push({
        name: details.name,
        url: eventUrl,
        domain: extractDomain(eventUrl),
        city: city.name,
        sourceType: SourceType.VENUE,
        category: category.eventCategory,
        active: true,
        metadata: {
          googleRating: details.rating,
          googleReviews: details.user_ratings_total,
          address: details.formatted_address,
        },
      });

      console.log(`    ✓ Added to queue`);

      // Rate limiting: wait 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error: any) {
      console.error(`    ✗ Error processing ${place.name}:`, error.message);
    }
  }

  return venues;
}

/**
 * Discover venues for a city
 */
export async function discoverVenues(params: VenueSearchParams): Promise<{
  discovered: number;
  added: number;
  skipped: number;
}> {
  console.log(`\n🔍 Discovering venues in ${params.city.name}...\n`);

  const allVenues: any[] = [];

  // Search each category
  for (const category of params.categories) {
    console.log(`\n📂 Category: ${category.eventCategory} (${category.query})`);

    const venues = await discoverVenuesForCategory(params.city, category, {
      minRating: params.minRating || 3.5,
      minReviews: params.minReviews || 10,
      maxResults: params.maxResults || 20,
    });

    allVenues.push(...venues);
  }

  console.log(`\n\n💾 Saving ${allVenues.length} venues to database...\n`);

  let added = 0;
  let skipped = 0;

  for (const venue of allVenues) {
    try {
      // Extract metadata before creating
      const { metadata, ...venueData } = venue;

      await prisma.source.create({
        data: venueData,
      });

      console.log(`✓ Added: ${venue.name}`);
      console.log(`  Category: ${venue.category}`);
      console.log(`  URL: ${venue.url}`);
      console.log(`  Rating: ${metadata.googleRating} (${metadata.googleReviews} reviews)`);
      console.log();

      added++;
    } catch (error: any) {
      console.error(`✗ Failed to add ${venue.name}:`, error.message);
      skipped++;
    }
  }

  console.log(`\n✅ Discovery complete!`);
  console.log(`   Discovered: ${allVenues.length} venues`);
  console.log(`   Added: ${added} venues`);
  console.log(`   Skipped: ${skipped} venues\n`);

  return {
    discovered: allVenues.length,
    added,
    skipped,
  };
}

/**
 * Run venue discovery for a city
 */
async function main() {
  const cityArg = process.argv[2]?.toUpperCase() || 'NYC';
  const maxResultsPerCategory = parseInt(process.argv[3] || '10', 10);

  if (!GOOGLE_API_KEY) {
    console.error('❌ Error: GOOGLE_PLACES_API_KEY environment variable not set');
    console.error('\nTo get a Google Places API key:');
    console.error('1. Go to https://console.cloud.google.com/');
    console.error('2. Enable Places API');
    console.error('3. Create an API key');
    console.error('4. Add to .env: GOOGLE_PLACES_API_KEY=your-key-here\n');
    process.exit(1);
  }

  const city = CITIES[cityArg];
  if (!city) {
    console.error(`❌ Error: Unknown city "${cityArg}"`);
    console.error(`Available cities: ${Object.keys(CITIES).join(', ')}\n`);
    process.exit(1);
  }

  console.log('🚀 Venue Discovery Tool\n');
  console.log(`City: ${city.name}, ${city.state}`);
  console.log(`Max results per category: ${maxResultsPerCategory}`);
  console.log(`Categories: ${VENUE_CATEGORIES.length}`);
  console.log(`Estimated API calls: ${VENUE_CATEGORIES.length * 2} (within free tier)\n`);

  const result = await discoverVenues({
    city,
    categories: VENUE_CATEGORIES,
    minRating: 3.5,
    minReviews: 10,
    maxResults: maxResultsPerCategory,
  });

  await prisma.$disconnect();

  console.log(`\n📊 Summary:`);
  console.log(`   City: ${city.name}`);
  console.log(`   Discovered: ${result.discovered}`);
  console.log(`   Added: ${result.added}`);
  console.log(`   Skipped: ${result.skipped}`);
  console.log(`\n✨ Next: Run the worker to extract events from new venues!\n`);
}

if (require.main === module) {
  main().catch(console.error);
}
