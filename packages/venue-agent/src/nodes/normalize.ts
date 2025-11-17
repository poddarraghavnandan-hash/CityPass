/**
 * Normalization Node
 * Converts RawVenues to NormalizedVenueCandidates
 */

import type { CityIngestionContext, RawVenue, NormalizedVenueCandidate } from '../types';
import {
  normalizeName,
  canonicalizeName,
  normalizeAddress,
  mapPriceBand,
  mapCategories,
  normalizeUrl,
  normalizePhone,
  generateAliases,
} from '../utils/normalization';

/**
 * Normalize all raw venues
 */
export async function normalizeRawVenues(
  context: CityIngestionContext
): Promise<CityIngestionContext> {
  console.log(`[NormalizeAgent] Normalizing ${context.rawVenues?.length || 0} raw venues...`);

  if (!context.rawVenues || context.rawVenues.length === 0) {
    context.normalizedCandidates = [];
    context.stats.normalizedTotal = 0;
    return context;
  }

  // Group raw venues by normalized name + approximate location
  const venueGroups = new Map<string, RawVenue[]>();

  for (const rawVenue of context.rawVenues) {
    const normalizedName = normalizeName(rawVenue.rawName);

    // Create grouping key: normalized_name + lat/lon grid (100m precision)
    const latGrid = rawVenue.lat ? Math.floor(rawVenue.lat * 1000) / 1000 : 'no_lat';
    const lonGrid = rawVenue.lon ? Math.floor(rawVenue.lon * 1000) / 1000 : 'no_lon';
    const key = `${normalizedName}:${latGrid}:${lonGrid}`;

    if (!venueGroups.has(key)) {
      venueGroups.set(key, []);
    }
    venueGroups.get(key)!.push(rawVenue);
  }

  console.log(`[NormalizeAgent] Grouped into ${venueGroups.size} candidate venues`);

  // Normalize each group into a single candidate
  const normalized: NormalizedVenueCandidate[] = [];

  for (const rawVenues of venueGroups.values()) {
    const candidate = normalizeVenueGroup(rawVenues, context.city.name);
    normalized.push(candidate);
  }

  context.normalizedCandidates = normalized;
  context.stats.normalizedTotal = normalized.length;

  // Calculate quality stats
  context.stats.venuesWithCoords = normalized.filter(v => v.lat && v.lon).length;
  context.stats.venuesWithCategory = normalized.filter(v => v.primaryCategory !== 'OTHER').length;
  context.stats.venuesWithWebsite = normalized.filter(v => v.website).length;

  console.log(`[NormalizeAgent] Normalized to ${normalized.length} candidates`);
  console.log(`[NormalizeAgent]   With coords: ${context.stats.venuesWithCoords}`);
  console.log(`[NormalizeAgent]   With category: ${context.stats.venuesWithCategory}`);
  console.log(`[NormalizeAgent]   With website: ${context.stats.venuesWithWebsite}`);

  return context;
}

/**
 * Normalize a group of raw venues (from same or similar sources) into one candidate
 */
function normalizeVenueGroup(
  rawVenues: RawVenue[],
  cityName: string
): NormalizedVenueCandidate {
  // Pick the "best" raw venue as the base (highest confidence)
  rawVenues.sort((a, b) => b.confidence - a.confidence);
  const base = rawVenues[0];

  // Canonical name (prefer most common form)
  const canonicalName = canonicalizeName(base.rawName);
  const normalizedName = normalizeName(base.rawName);

  // Collect all aliases
  const aliasSet = new Set<string>();
  for (const rv of rawVenues) {
    aliasSet.add(rv.rawName);
    if (rv.aliases) {
      rv.aliases.forEach(a => aliasSet.add(a));
    }
  }
  const aliases = Array.from(aliasSet);

  // Aggregate coordinates (average if multiple)
  const lats = rawVenues.filter(rv => rv.lat).map(rv => rv.lat!);
  const lons = rawVenues.filter(rv => rv.lon).map(rv => rv.lon!);
  const lat = lats.length > 0 ? lats.reduce((a, b) => a + b, 0) / lats.length : undefined;
  const lon = lons.length > 0 ? lons.reduce((a, b) => a + b, 0) / lons.length : undefined;

  // Pick best address
  const address = rawVenues.find(rv => rv.address)?.address;

  // Pick best neighborhood
  const neighborhood = rawVenues.find(rv => rv.neighborhood)?.neighborhood;

  // Aggregate categories
  const allCategories: string[] = [];
  for (const rv of rawVenues) {
    if (rv.categories) {
      allCategories.push(...rv.categories);
    }
  }
  const { primaryCategory, subcategories } = mapCategories(allCategories);

  // Price band (most common)
  const priceLevels = rawVenues.filter(rv => rv.priceLevel).map(rv => rv.priceLevel!);
  const avgPriceLevel = priceLevels.length > 0
    ? Math.round(priceLevels.reduce((a, b) => a + b, 0) / priceLevels.length)
    : undefined;
  const priceBand = mapPriceBand(avgPriceLevel);

  // Capacity (max)
  const capacities = rawVenues.filter(rv => rv.capacity).map(rv => rv.capacity!);
  const capacity = capacities.length > 0 ? Math.max(...capacities) : undefined;

  // Website (first available)
  const website = normalizeUrl(rawVenues.find(rv => rv.website)?.website);

  // Phone (first available)
  const phone = normalizePhone(rawVenues.find(rv => rv.phone)?.phone);

  // Description (longest)
  const descriptions = rawVenues.filter(rv => rv.description).map(rv => rv.description!);
  const description = descriptions.length > 0
    ? descriptions.reduce((a, b) => (a.length > b.length ? a : b))
    : undefined;

  // Image (first available)
  const imageUrl = rawVenues.find(rv => rv.imageUrl)?.imageUrl;

  // All venues are active by default
  const isActive = true;

  return {
    canonicalName,
    normalizedName,
    aliases,

    lat,
    lon,
    address,
    neighborhood,
    city: cityName,

    primaryCategory,
    subcategories,

    priceBand,
    capacity,

    website,
    phone,
    description,
    imageUrl,

    isActive,

    sources: rawVenues,
  };
}
