/**
 * Geographic utilities for venue ingestion
 */

import type { BoundingBox, CityConfig } from '../types';

/**
 * Pre-configured city bounding boxes
 */
export const CITY_CONFIGS: Record<string, CityConfig> = {
  'New York': {
    name: 'New York',
    state: 'NY',
    country: 'US',
    bbox: {
      north: 40.9176,
      south: 40.4774,
      east: -73.7004,
      west: -74.2591,
    },
    defaultNeighborhoods: [
      'Manhattan',
      'Brooklyn',
      'Queens',
      'The Bronx',
      'Staten Island',
      'Williamsburg',
      'DUMBO',
      'East Village',
      'West Village',
      'SoHo',
      'Chelsea',
      'Midtown',
      'Upper East Side',
      'Upper West Side',
      'Harlem',
    ],
  },
  'Los Angeles': {
    name: 'Los Angeles',
    state: 'CA',
    country: 'US',
    bbox: {
      north: 34.3373,
      south: 33.7037,
      east: -118.1553,
      west: -118.6682,
    },
    defaultNeighborhoods: [
      'Downtown',
      'Hollywood',
      'West Hollywood',
      'Santa Monica',
      'Venice',
      'Beverly Hills',
      'Silver Lake',
      'Echo Park',
    ],
  },
  'San Francisco': {
    name: 'San Francisco',
    state: 'CA',
    country: 'US',
    bbox: {
      north: 37.8324,
      south: 37.7081,
      east: -122.3549,
      west: -122.5155,
    },
    defaultNeighborhoods: [
      'Financial District',
      'SoMa',
      'Mission',
      'Castro',
      'Haight-Ashbury',
      'North Beach',
      'Chinatown',
      'Pac Heights',
    ],
  },
  'Chicago': {
    name: 'Chicago',
    state: 'IL',
    country: 'US',
    bbox: {
      north: 42.0230,
      south: 41.6445,
      east: -87.5240,
      west: -87.9401,
    },
    defaultNeighborhoods: [
      'Loop',
      'River North',
      'Wicker Park',
      'Lincoln Park',
      'Lakeview',
      'Logan Square',
      'Pilsen',
      'Hyde Park',
    ],
  },
  'Austin': {
    name: 'Austin',
    state: 'TX',
    country: 'US',
    bbox: {
      north: 30.5168,
      south: 30.0986,
      east: -97.5684,
      west: -97.9383,
    },
    defaultNeighborhoods: [
      'Downtown',
      'East Austin',
      'South Congress',
      'West Campus',
      'Hyde Park',
      'Mueller',
      'Rainey Street',
    ],
  },
};

/**
 * Get city config by name
 */
export function getCityConfig(cityName: string): CityConfig | undefined {
  return CITY_CONFIGS[cityName];
}

/**
 * Convert bounding box to Overpass API bbox string
 * Format: south,west,north,east
 */
export function bboxToOverpassString(bbox: BoundingBox): string {
  return `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
}

/**
 * Check if a point is within a bounding box
 */
export function isPointInBbox(
  lat: number,
  lon: number,
  bbox: BoundingBox
): boolean {
  return (
    lat >= bbox.south &&
    lat <= bbox.north &&
    lon >= bbox.west &&
    lon <= bbox.east
  );
}

/**
 * Calculate the center point of a bounding box
 */
export function getBboxCenter(bbox: BoundingBox): { lat: number; lon: number } {
  return {
    lat: (bbox.north + bbox.south) / 2,
    lon: (bbox.east + bbox.west) / 2,
  };
}

/**
 * Calculate approximate radius of bounding box in meters
 * Returns the distance from center to corner
 */
export function getBboxRadius(bbox: BoundingBox): number {
  const center = getBboxCenter(bbox);

  // Distance to northeast corner
  const R = 6371000; // Earth's radius in meters
  const φ1 = (center.lat * Math.PI) / 180;
  const φ2 = (bbox.north * Math.PI) / 180;
  const Δφ = ((bbox.north - center.lat) * Math.PI) / 180;
  const Δλ = ((bbox.east - center.lon) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Expand bounding box by a margin (in degrees)
 */
export function expandBbox(bbox: BoundingBox, marginDegrees: number): BoundingBox {
  return {
    north: bbox.north + marginDegrees,
    south: bbox.south - marginDegrees,
    east: bbox.east + marginDegrees,
    west: bbox.west - marginDegrees,
  };
}

/**
 * Determine neighborhood from coordinates
 * This is a stub - in production, you'd use a proper geocoding service
 * or neighborhood polygon database
 */
export function getNeighborhoodFromCoords(
  lat: number,
  lon: number,
  cityName: string
): string | undefined {
  // TODO: Implement proper neighborhood detection
  // Options:
  // 1. Use Google Geocoding API
  // 2. Use Nominatim (OSM geocoding)
  // 3. Use pre-computed neighborhood polygons
  // 4. Use ML-based boundary detection

  // For now, return undefined and let other sources provide neighborhood
  return undefined;
}
