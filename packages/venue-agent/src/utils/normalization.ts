/**
 * Venue name and address normalization utilities
 */

import type { VenuePriceBand } from '@citypass/db';
import type { PriceBandMapping, CategoryMapping } from '../types';

/**
 * Normalize a venue name for matching
 * - Convert to lowercase
 * - Remove punctuation
 * - Remove common prefixes (The, A, An)
 * - Trim and collapse whitespace
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(the|a|an)\s+/i, '') // Remove leading articles
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim();
}

/**
 * Generate canonical name from raw name
 * - Title case
 * - Clean punctuation
 * - Trim
 */
export function canonicalizeName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ') // Collapse whitespace
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Normalize address for matching
 * - Lowercase
 * - Standardize abbreviations (St -> Street, Ave -> Avenue, etc.)
 * - Remove punctuation
 * - Collapse whitespace
 */
export function normalizeAddress(address: string): string {
  const abbreviations: Record<string, string> = {
    'st': 'street',
    'ave': 'avenue',
    'blvd': 'boulevard',
    'rd': 'road',
    'dr': 'drive',
    'ln': 'lane',
    'ct': 'court',
    'pl': 'place',
    'sq': 'square',
    'pkwy': 'parkway',
    'hwy': 'highway',
    'n': 'north',
    's': 'south',
    'e': 'east',
    'w': 'west',
    'ne': 'northeast',
    'nw': 'northwest',
    'se': 'southeast',
    'sw': 'southwest',
  };

  let normalized = address.toLowerCase();

  // Replace abbreviations
  Object.entries(abbreviations).forEach(([abbr, full]) => {
    const regex = new RegExp(`\\b${abbr}\\b`, 'g');
    normalized = normalized.replace(regex, full);
  });

  // Remove punctuation and collapse whitespace
  normalized = normalized
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return normalized;
}

/**
 * Map source price level to VenuePriceBand
 */
export function mapPriceBand(
  sourcePrice: number | string | undefined
): VenuePriceBand | undefined {
  if (!sourcePrice) return undefined;

  // Handle numeric price levels (1-4 from Foursquare, Yelp)
  if (typeof sourcePrice === 'number') {
    if (sourcePrice === 0) return 'FREE';
    if (sourcePrice === 1) return 'LOW';
    if (sourcePrice === 2) return 'MID';
    if (sourcePrice === 3) return 'HIGH';
    if (sourcePrice >= 4) return 'LUXE';
    return undefined;
  }

  // Handle string price levels ($ symbols from Yelp)
  if (typeof sourcePrice === 'string') {
    const dollarCount = (sourcePrice.match(/\$/g) || []).length;
    if (dollarCount === 0) return 'FREE';
    if (dollarCount === 1) return 'LOW';
    if (dollarCount === 2) return 'MID';
    if (dollarCount === 3) return 'HIGH';
    if (dollarCount >= 4) return 'LUXE';
  }

  return undefined;
}

/**
 * Map source categories to primary category and subcategories
 */
export function mapCategories(sourceCategories: string[]): {
  primaryCategory: string;
  subcategories: string[];
} {
  if (!sourceCategories.length) {
    return {
      primaryCategory: 'OTHER',
      subcategories: [],
    };
  }

  // Category mapping rules (expand this based on your data)
  const categoryMap: Record<string, string> = {
    // Music
    'nightclub': 'MUSIC',
    'music_venue': 'MUSIC',
    'bar': 'MUSIC',
    'lounge': 'MUSIC',
    'jazz_club': 'MUSIC',
    'concert_hall': 'MUSIC',

    // Arts
    'art_gallery': 'ARTS',
    'museum': 'ARTS',
    'cultural_center': 'ARTS',

    // Theatre
    'theatre': 'THEATRE',
    'theater': 'THEATRE',
    'performing_arts_theater': 'THEATRE',

    // Comedy
    'comedy_club': 'COMEDY',

    // Fitness
    'gym': 'FITNESS',
    'fitness_centre': 'FITNESS',
    'yoga_studio': 'FITNESS',
    'dance_studio': 'DANCE',

    // Food
    'restaurant': 'FOOD',
    'cafe': 'FOOD',
    'food': 'FOOD',

    // Networking
    'coworking_space': 'NETWORKING',
    'convention_center': 'NETWORKING',

    // Family
    'zoo': 'FAMILY',
    'aquarium': 'FAMILY',
    'amusement_park': 'FAMILY',

    // Other
    'park': 'OTHER',
    'stadium': 'OTHER',
  };

  // Normalize source categories
  const normalized = sourceCategories.map(cat =>
    cat.toLowerCase().replace(/\s+/g, '_')
  );

  // Find primary category (first match)
  let primaryCategory = 'OTHER';
  for (const cat of normalized) {
    if (categoryMap[cat]) {
      primaryCategory = categoryMap[cat];
      break;
    }
  }

  // All categories become subcategories
  const subcategories = Array.from(new Set(normalized));

  return {
    primaryCategory,
    subcategories,
  };
}

/**
 * Extract neighborhood from tags or address
 */
export function extractNeighborhood(
  tags: Record<string, string> | undefined,
  address: string | undefined,
  city: string
): string | undefined {
  // Try to extract from OSM tags
  if (tags) {
    if (tags['addr:neighbourhood']) return tags['addr:neighbourhood'];
    if (tags['addr:suburb']) return tags['addr:suburb'];
    if (tags['addr:district']) return tags['addr:district'];
  }

  // Try to extract from address (very basic)
  if (address) {
    // This is a stub - you'd want more sophisticated neighborhood extraction
    // Could use a geocoding API or neighborhood polygon database
    return undefined;
  }

  return undefined;
}

/**
 * Clean and validate phone number
 */
export function normalizePhone(phone: string | undefined): string | undefined {
  if (!phone) return undefined;

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Validate US phone number (10 or 11 digits)
  if (digits.length === 10) {
    return `+1${digits}`;
  } else if (digits.length === 11 && digits[0] === '1') {
    return `+${digits}`;
  }

  // Return original if not a valid US number (could be international)
  return phone;
}

/**
 * Clean and validate URL
 */
export function normalizeUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;

  try {
    const parsed = new URL(url);
    return parsed.toString();
  } catch {
    // Try adding protocol
    try {
      const parsed = new URL(`https://${url}`);
      return parsed.toString();
    } catch {
      return undefined;
    }
  }
}

/**
 * Generate aliases for a venue
 */
export function generateAliases(name: string, tags?: Record<string, string>): string[] {
  const aliases: Set<string> = new Set();

  // Add original name
  aliases.add(name);

  // Add variations
  const withoutThe = name.replace(/^(The|A|An)\s+/i, '');
  if (withoutThe !== name) {
    aliases.add(withoutThe);
  }

  // Add alt names from tags
  if (tags) {
    if (tags['alt_name']) aliases.add(tags['alt_name']);
    if (tags['old_name']) aliases.add(tags['old_name']);
    if (tags['short_name']) aliases.add(tags['short_name']);
    if (tags['official_name']) aliases.add(tags['official_name']);
  }

  return Array.from(aliases);
}
