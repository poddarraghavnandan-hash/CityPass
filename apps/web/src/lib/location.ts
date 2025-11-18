/**
 * Location extraction utility
 * Extracts user location from various sources
 */

import { cookies } from 'next/headers';

export interface LocationData {
  lat: number;
  lon: number;
  city?: string;
  country?: string;
  accuracy?: number;
}

const LOCATION_COOKIE_KEY = 'citylens_location';
const LOCATION_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

/**
 * Get user location from cookies or headers
 */
export async function getUserLocation(): Promise<LocationData | null> {
  try {
    // 1. Try to get from cookie first (most reliable for returning users)
    const cookieStore = await cookies();
    const locationCookie = cookieStore.get(LOCATION_COOKIE_KEY)?.value;

    if (locationCookie) {
      try {
        const parsed = JSON.parse(locationCookie);
        if (isValidLocation(parsed)) {
          return parsed;
        }
      } catch (error) {
        console.warn('[Location] Failed to parse location cookie:', error);
      }
    }

    // 2. TODO: Could add Vercel geolocation headers support
    // const vercelGeo = req.headers.get('x-vercel-ip-city');
    // const vercelLat = req.headers.get('x-vercel-ip-latitude');
    // const vercelLon = req.headers.get('x-vercel-ip-longitude');

    return null;
  } catch (error) {
    console.error('[Location] Failed to get user location:', error);
    return null;
  }
}

/**
 * Save user location to cookie
 */
export async function saveUserLocation(location: LocationData): Promise<void> {
  try {
    if (!isValidLocation(location)) {
      throw new Error('Invalid location data');
    }

    const cookieStore = await cookies();
    cookieStore.set(LOCATION_COOKIE_KEY, JSON.stringify(location), {
      httpOnly: false, // Allow client-side access for geolocation API
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: LOCATION_COOKIE_MAX_AGE,
      path: '/',
    });
  } catch (error) {
    console.error('[Location] Failed to save user location:', error);
  }
}

/**
 * Validate location data structure
 */
function isValidLocation(data: any): data is LocationData {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.lat === 'number' &&
    typeof data.lon === 'number' &&
    data.lat >= -90 &&
    data.lat <= 90 &&
    data.lon >= -180 &&
    data.lon <= 180
  );
}

/**
 * Calculate distance between two coordinates in km
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
