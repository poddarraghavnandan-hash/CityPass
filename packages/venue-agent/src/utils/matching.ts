/**
 * Venue matching and deduplication utilities
 */

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy name matching
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate string similarity (0-1) using Levenshtein distance
 */
export function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (!a || !b) return 0.0;

  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);

  return 1.0 - distance / maxLength;
}

/**
 * Check if two venue names are similar enough to be a match
 * Returns similarity score (0-1)
 */
export function nameMatchScore(name1: string, name2: string): number {
  // Exact match
  if (name1 === name2) return 1.0;

  // Compute similarity
  const similarity = stringSimilarity(name1, name2);

  // Boost score if one name contains the other
  if (name1.includes(name2) || name2.includes(name1)) {
    return Math.max(similarity, 0.85);
  }

  return similarity;
}

/**
 * Calculate geographic distance in meters between two lat/lon points
 * Uses Haversine formula
 */
export function geoDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Check if two venues are geographically close
 * Returns true if within threshold (default 50 meters)
 */
export function isGeographicallyClose(
  lat1: number | undefined,
  lon1: number | undefined,
  lat2: number | undefined,
  lon2: number | undefined,
  thresholdMeters: number = 50
): boolean {
  if (!lat1 || !lon1 || !lat2 || !lon2) {
    return false;
  }

  const distance = geoDistance(lat1, lon1, lat2, lon2);
  return distance <= thresholdMeters;
}

/**
 * Calculate composite match score between two venues
 * Considers name, location, and category
 * Returns score 0-1
 */
export interface VenueMatchInput {
  normalizedName: string;
  lat?: number;
  lon?: number;
  primaryCategory?: string;
  aliases?: string[];
}

export function calculateMatchScore(
  venue1: VenueMatchInput,
  venue2: VenueMatchInput
): number {
  let totalScore = 0;
  let weightSum = 0;

  // Name similarity (weight: 0.5)
  const nameScore = nameMatchScore(venue1.normalizedName, venue2.normalizedName);
  totalScore += nameScore * 0.5;
  weightSum += 0.5;

  // Check aliases
  let aliasMatch = false;
  if (venue1.aliases && venue2.aliases) {
    for (const alias1 of venue1.aliases) {
      for (const alias2 of venue2.aliases) {
        if (nameMatchScore(alias1, alias2) > 0.9) {
          aliasMatch = true;
          break;
        }
      }
      if (aliasMatch) break;
    }
  }

  if (aliasMatch) {
    totalScore += 0.2; // Bonus for alias match
    weightSum += 0.2;
  }

  // Geographic proximity (weight: 0.3)
  if (
    venue1.lat !== undefined &&
    venue1.lon !== undefined &&
    venue2.lat !== undefined &&
    venue2.lon !== undefined
  ) {
    const distance = geoDistance(venue1.lat, venue1.lon, venue2.lat, venue2.lon);

    // Score based on distance (0-1)
    let geoScore = 0;
    if (distance <= 25) {
      geoScore = 1.0; // Same location
    } else if (distance <= 50) {
      geoScore = 0.9; // Very close
    } else if (distance <= 100) {
      geoScore = 0.7; // Close
    } else if (distance <= 500) {
      geoScore = 0.3; // Same area
    } else {
      geoScore = 0.0; // Too far
    }

    totalScore += geoScore * 0.3;
    weightSum += 0.3;
  }

  // Category match (weight: 0.2)
  if (venue1.primaryCategory && venue2.primaryCategory) {
    const categoryScore = venue1.primaryCategory === venue2.primaryCategory ? 1.0 : 0.0;
    totalScore += categoryScore * 0.2;
    weightSum += 0.2;
  }

  // Normalize by actual weight used
  return weightSum > 0 ? totalScore / weightSum : 0;
}

/**
 * Determine if two venues should be considered a match
 * Returns match decision and confidence
 */
export function areVenuesMatch(
  venue1: VenueMatchInput,
  venue2: VenueMatchInput,
  threshold: number = 0.85
): { isMatch: boolean; confidence: number } {
  const score = calculateMatchScore(venue1, venue2);

  return {
    isMatch: score >= threshold,
    confidence: score,
  };
}
