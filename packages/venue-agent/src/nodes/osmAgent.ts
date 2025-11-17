/**
 * OSM (OpenStreetMap) Agent
 * Fetches venues from OpenStreetMap using Overpass API
 */

import type {
  CityIngestionContext,
  RawVenue,
  OverpassResponse,
  OverpassElement,
} from '../types';
import { bboxToOverpassString } from '../utils/geo';

const OVERPASS_URL =
  process.env.OVERPASS_URL || 'https://overpass-api.de/api/interpreter';

/**
 * Build Overpass QL query for venues in a city
 */
function buildOverpassQuery(bbox: string): string {
  return `
    [out:json][timeout:90];
    (
      // Music & Nightlife
      node["amenity"="bar"](${bbox});
      node["amenity"="nightclub"](${bbox});
      node["amenity"="pub"](${bbox});
      node["amenity"="music_venue"](${bbox});
      way["amenity"="bar"](${bbox});
      way["amenity"="nightclub"](${bbox});
      way["amenity"="pub"](${bbox});
      way["amenity"="music_venue"](${bbox});

      // Arts & Culture
      node["amenity"="theatre"](${bbox});
      node["tourism"="museum"](${bbox});
      node["tourism"="gallery"](${bbox});
      node["amenity"="arts_centre"](${bbox});
      way["amenity"="theatre"](${bbox});
      way["tourism"="museum"](${bbox});
      way["tourism"="gallery"](${bbox});
      way["amenity"="arts_centre"](${bbox});

      // Fitness & Dance
      node["leisure"="fitness_centre"](${bbox});
      node["leisure"="sports_centre"](${bbox});
      node["amenity"="studio"]["studio"="dance"](${bbox});
      way["leisure"="fitness_centre"](${bbox});
      way["leisure"="sports_centre"](${bbox});
      way["amenity"="studio"]["studio"="dance"](${bbox});

      // Food & Markets
      node["amenity"="marketplace"](${bbox});
      node["shop"="marketplace"](${bbox});
      way["amenity"="marketplace"](${bbox});
      way["shop"="marketplace"](${bbox});

      // Community & Coworking
      node["amenity"="coworking_space"](${bbox});
      node["amenity"="community_centre"](${bbox});
      node["amenity"="conference_centre"](${bbox});
      way["amenity"="coworking_space"](${bbox});
      way["amenity"="community_centre"](${bbox});
      way["amenity"="conference_centre"](${bbox});

      // Parks & Recreation
      node["leisure"="park"](${bbox});
      way["leisure"="park"](${bbox});
    );
    out center;
  `;
}

/**
 * Extract categories from OSM tags
 */
function extractCategories(tags: Record<string, string>): string[] {
  const categories: string[] = [];

  if (tags.amenity) categories.push(tags.amenity);
  if (tags.leisure) categories.push(tags.leisure);
  if (tags.tourism) categories.push(tags.tourism);
  if (tags.shop) categories.push(tags.shop);
  if (tags.studio) categories.push(`${tags.amenity || 'studio'}_${tags.studio}`);

  // Add cuisine as subcategory for bars/pubs/restaurants
  if (tags.cuisine) {
    categories.push(`cuisine_${tags.cuisine}`);
  }

  return categories;
}

/**
 * Convert OSM element to RawVenue
 */
function osmElementToRawVenue(
  element: OverpassElement,
  cityName: string
): RawVenue | null {
  if (!element.tags) return null;

  const tags = element.tags;
  const name = tags.name;
  if (!name) return null; // Skip venues without names

  // Get coordinates
  let lat: number | undefined;
  let lon: number | undefined;

  if (element.type === 'node') {
    lat = element.lat;
    lon = element.lon;
  } else if (element.center) {
    lat = element.center.lat;
    lon = element.center.lon;
  }

  // Build address
  const addressParts: string[] = [];
  if (tags['addr:housenumber']) addressParts.push(tags['addr:housenumber']);
  if (tags['addr:street']) addressParts.push(tags['addr:street']);
  const address = addressParts.length > 0 ? addressParts.join(' ') : undefined;

  // Neighborhood
  const neighborhood =
    tags['addr:neighbourhood'] ||
    tags['addr:suburb'] ||
    tags['addr:district'] ||
    undefined;

  // Extract categories
  const categories = extractCategories(tags);

  // Build raw venue
  const rawVenue: RawVenue = {
    source: 'OSM',
    sourceExternalId: `${element.type}/${element.id}`,
    sourceUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
    rawPayload: element,
    confidence: 0.9, // OSM data is generally reliable

    rawName: name,
    aliases: tags.alt_name ? [tags.alt_name] : undefined,

    lat,
    lon,
    address,
    neighborhood,
    city: cityName,

    categories,
    tags: Object.keys(tags),

    website: tags.website || tags['contact:website'],
    phone: tags.phone || tags['contact:phone'],
    description: tags.description,

    // OSM doesn't have capacity or price data typically
    capacity: tags.capacity ? parseInt(tags.capacity, 10) : undefined,

    hours: tags.opening_hours ? { default: tags.opening_hours } : undefined,

    accessibility: tags.wheelchair === 'yes' ? ['wheelchair'] : undefined,
  };

  return rawVenue;
}

/**
 * Fetch venues from OSM Overpass API
 */
export async function fetchOSMVenues(
  context: CityIngestionContext
): Promise<CityIngestionContext> {
  console.log(`[OSMAgent] Fetching venues for ${context.city.name}...`);

  try {
    const bboxString = bboxToOverpassString(context.city.bbox);
    const query = buildOverpassQuery(bboxString);

    console.log(`[OSMAgent] Querying Overpass API...`);

    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
    }

    const data: OverpassResponse = await response.json();

    console.log(`[OSMAgent] Received ${data.elements.length} elements from OSM`);

    // Convert OSM elements to RawVenues
    const rawVenues: RawVenue[] = [];
    for (const element of data.elements) {
      const venue = osmElementToRawVenue(element, context.city.name);
      if (venue) {
        rawVenues.push(venue);
      }
    }

    console.log(`[OSMAgent] Converted ${rawVenues.length} OSM elements to venues`);

    // Add to context
    if (!context.rawVenues) {
      context.rawVenues = [];
    }
    context.rawVenues.push(...rawVenues);

    // Update stats
    context.stats.osmVenues = rawVenues.length;
    context.stats.rawTotal += rawVenues.length;

    return context;
  } catch (error: any) {
    console.error(`[OSMAgent] Error fetching OSM venues:`, error);

    context.errors.push({
      agentName: 'OSMAgent',
      source: 'OSM',
      message: error.message || 'Unknown error',
      payload: { error: String(error) },
      timestamp: new Date(),
    });

    // Continue with empty results
    context.stats.osmVenues = 0;
    return context;
  }
}
