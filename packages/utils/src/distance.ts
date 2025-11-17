/**
 * Distance Calculation Utilities
 * Haversine formula for calculating distance between coordinates
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // Round to 1 decimal
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Estimate travel time based on distance
 * Assumes average urban speed of 5 km/h (walking/transit)
 */
export function estimateTravelTime(distanceKm: number): number {
  const urbanSpeedKmh = 5; // Walking + wait time
  const minutes = (distanceKm / urbanSpeedKmh) * 60;
  return Math.round(minutes);
}

/**
 * Infer user location from various sources
 * Priority: explicit location > saved preference > IP lookup > city center
 */
export async function getUserLocation(
  userId?: string,
  sessionId?: string
): Promise<{ lat: number; lon: number } | null> {
  // TODO: Implement location inference
  // 1. Check if user has saved location in profile
  // 2. Check if session has location from IP lookup
  // 3. Fall back to city center coordinates

  // For now, return null (will use default behavior)
  return null;
}

/**
 * City center coordinates (fallback defaults)
 */
export const CITY_CENTERS: Record<string, { lat: number; lon: number }> = {
  'new york': { lat: 40.7128, lon: -74.0060 },
  'brooklyn': { lat: 40.6782, lon: -73.9442 },
  'manhattan': { lat: 40.7831, lon: -73.9712 },
  'queens': { lat: 40.7282, lon: -73.7949 },
  'los angeles': { lat: 34.0522, lon: -118.2437 },
  'san francisco': { lat: 37.7749, lon: -122.4194 },
  'chicago': { lat: 41.8781, lon: -87.6298 },
  'boston': { lat: 42.3601, lon: -71.0589 },
  'seattle': { lat: 47.6062, lon: -122.3321 },
  'austin': { lat: 30.2672, lon: -97.7431 },
  'portland': { lat: 45.5152, lon: -122.6784 },
  'denver': { lat: 39.7392, lon: -104.9903 },
  'miami': { lat: 25.7617, lon: -80.1918 },
};

/**
 * Get city center coordinates
 */
export function getCityCenter(city: string): { lat: number; lon: number } | null {
  const normalized = city.toLowerCase().trim();
  return CITY_CENTERS[normalized] || null;
}
