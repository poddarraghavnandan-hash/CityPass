/**
 * Extended city configurations for massive venue ingestion
 * Target: 1,000,000+ venues across 50+ major cities
 */

import type { CityConfig } from '../types';

/**
 * Top 50 US Cities by population and venue density
 * Estimated: ~20,000 venues per major city = 1,000,000 total
 */
export const EXTENDED_CITY_CONFIGS: Record<string, CityConfig> = {
  // Top 10 Metro Areas
  'New York': {
    name: 'New York',
    state: 'NY',
    country: 'US',
    bbox: { north: 40.9176, south: 40.4774, east: -73.7004, west: -74.2591 },
  },
  'Los Angeles': {
    name: 'Los Angeles',
    state: 'CA',
    country: 'US',
    bbox: { north: 34.3373, south: 33.7037, east: -118.1553, west: -118.6682 },
  },
  'Chicago': {
    name: 'Chicago',
    state: 'IL',
    country: 'US',
    bbox: { north: 42.0230, south: 41.6445, east: -87.5240, west: -87.9401 },
  },
  'Houston': {
    name: 'Houston',
    state: 'TX',
    country: 'US',
    bbox: { north: 30.1107, south: 29.5234, east: -95.0145, west: -95.7880 },
  },
  'Phoenix': {
    name: 'Phoenix',
    state: 'AZ',
    country: 'US',
    bbox: { north: 33.9249, south: 33.2943, east: -111.9223, west: -112.3230 },
  },
  'Philadelphia': {
    name: 'Philadelphia',
    state: 'PA',
    country: 'US',
    bbox: { north: 40.1379, south: 39.8670, east: -74.9557, west: -75.2799 },
  },
  'San Antonio': {
    name: 'San Antonio',
    state: 'TX',
    country: 'US',
    bbox: { north: 29.7496, south: 29.2487, east: -98.2940, west: -98.7695 },
  },
  'San Diego': {
    name: 'San Diego',
    state: 'CA',
    country: 'US',
    bbox: { north: 33.1143, south: 32.5343, east: -116.9089, west: -117.2713 },
  },
  'Dallas': {
    name: 'Dallas',
    state: 'TX',
    country: 'US',
    bbox: { north: 33.0237, south: 32.6178, east: -96.4637, west: -96.9991 },
  },
  'San Jose': {
    name: 'San Jose',
    state: 'CA',
    country: 'US',
    bbox: { north: 37.4694, south: 37.1249, east: -121.6509, west: -122.0574 },
  },

  // 11-20
  'Austin': {
    name: 'Austin',
    state: 'TX',
    country: 'US',
    bbox: { north: 30.5168, south: 30.0986, east: -97.5684, west: -97.9383 },
  },
  'Jacksonville': {
    name: 'Jacksonville',
    state: 'FL',
    country: 'US',
    bbox: { north: 30.5968, south: 30.1034, east: -81.3903, west: -81.8759 },
  },
  'Fort Worth': {
    name: 'Fort Worth',
    state: 'TX',
    country: 'US',
    bbox: { north: 33.0389, south: 32.5357, east: -97.0366, west: -97.5264 },
  },
  'Columbus': {
    name: 'Columbus',
    state: 'OH',
    country: 'US',
    bbox: { north: 40.1572, south: 39.8829, east: -82.8860, west: -83.1951 },
  },
  'Charlotte': {
    name: 'Charlotte',
    state: 'NC',
    country: 'US',
    bbox: { north: 35.4338, south: 35.0082, east: -80.5817, west: -81.0234 },
  },
  'San Francisco': {
    name: 'San Francisco',
    state: 'CA',
    country: 'US',
    bbox: { north: 37.8324, south: 37.7081, east: -122.3549, west: -122.5155 },
  },
  'Indianapolis': {
    name: 'Indianapolis',
    state: 'IN',
    country: 'US',
    bbox: { north: 40.0109, south: 39.6369, east: -85.9378, west: -86.3270 },
  },
  'Seattle': {
    name: 'Seattle',
    state: 'WA',
    country: 'US',
    bbox: { north: 47.7341, south: 47.4953, east: -122.2421, west: -122.4362 },
  },
  'Denver': {
    name: 'Denver',
    state: 'CO',
    country: 'US',
    bbox: { north: 39.9142, south: 39.6144, east: -104.6002, west: -105.1099 },
  },
  'Washington': {
    name: 'Washington',
    state: 'DC',
    country: 'US',
    bbox: { north: 38.9958, south: 38.7916, east: -76.9094, west: -77.1197 },
  },

  // 21-30
  'Boston': {
    name: 'Boston',
    state: 'MA',
    country: 'US',
    bbox: { north: 42.3978, south: 42.2279, east: -70.9233, west: -71.1912 },
  },
  'Nashville': {
    name: 'Nashville',
    state: 'TN',
    country: 'US',
    bbox: { north: 36.3876, south: 35.9886, east: -86.5169, west: -87.0467 },
  },
  'Oklahoma City': {
    name: 'Oklahoma City',
    state: 'OK',
    country: 'US',
    bbox: { north: 35.6120, south: 35.3673, east: -97.2395, west: -97.6593 },
  },
  'Portland': {
    name: 'Portland',
    state: 'OR',
    country: 'US',
    bbox: { north: 45.6544, south: 45.4321, east: -122.4728, west: -122.8367 },
  },
  'Las Vegas': {
    name: 'Las Vegas',
    state: 'NV',
    country: 'US',
    bbox: { north: 36.3883, south: 35.9607, east: -114.9819, west: -115.3605 },
  },
  'Detroit': {
    name: 'Detroit',
    state: 'MI',
    country: 'US',
    bbox: { north: 42.4499, south: 42.2552, east: -82.9109, west: -83.2877 },
  },
  'Memphis': {
    name: 'Memphis',
    state: 'TN',
    country: 'US',
    bbox: { north: 35.3004, south: 34.9914, east: -89.6477, west: -90.1104 },
  },
  'Louisville': {
    name: 'Louisville',
    state: 'KY',
    country: 'US',
    bbox: { north: 38.3665, south: 38.0992, east: -85.4093, west: -85.8641 },
  },
  'Baltimore': {
    name: 'Baltimore',
    state: 'MD',
    country: 'US',
    bbox: { north: 39.3723, south: 39.1970, east: -76.5294, west: -76.7114 },
  },
  'Milwaukee': {
    name: 'Milwaukee',
    state: 'WI',
    country: 'US',
    bbox: { north: 43.1939, south: 42.8673, east: -87.8419, west: -88.0703 },
  },

  // 31-40
  'Albuquerque': {
    name: 'Albuquerque',
    state: 'NM',
    country: 'US',
    bbox: { north: 35.2281, south: 34.9487, east: -106.4923, west: -106.7617 },
  },
  'Tucson': {
    name: 'Tucson',
    state: 'AZ',
    country: 'US',
    bbox: { north: 32.3645, south: 32.0733, east: -110.7453, west: -111.1843 },
  },
  'Fresno': {
    name: 'Fresno',
    state: 'CA',
    country: 'US',
    bbox: { north: 36.9449, south: 36.6643, east: -119.5439, west: -119.9559 },
  },
  'Sacramento': {
    name: 'Sacramento',
    state: 'CA',
    country: 'US',
    bbox: { north: 38.6816, south: 38.4415, east: -121.2556, west: -121.5626 },
  },
  'Kansas City': {
    name: 'Kansas City',
    state: 'MO',
    country: 'US',
    bbox: { north: 39.3256, south: 38.8171, east: -94.3490, west: -94.7871 },
  },
  'Mesa': {
    name: 'Mesa',
    state: 'AZ',
    country: 'US',
    bbox: { north: 33.5694, south: 33.2806, east: -111.5836, west: -111.9353 },
  },
  'Atlanta': {
    name: 'Atlanta',
    state: 'GA',
    country: 'US',
    bbox: { north: 33.8869, south: 33.6477, east: -84.2896, west: -84.5509 },
  },
  'Omaha': {
    name: 'Omaha',
    state: 'NE',
    country: 'US',
    bbox: { north: 41.3293, south: 41.1791, east: -95.8650, west: -96.2537 },
  },
  'Colorado Springs': {
    name: 'Colorado Springs',
    state: 'CO',
    country: 'US',
    bbox: { north: 39.0128, south: 38.7021, east: -104.6002, west: -104.9476 },
  },
  'Raleigh': {
    name: 'Raleigh',
    state: 'NC',
    country: 'US',
    bbox: { north: 35.9770, south: 35.6370, east: -78.4766, west: -78.7795 },
  },

  // 41-50
  'Miami': {
    name: 'Miami',
    state: 'FL',
    country: 'US',
    bbox: { north: 25.8555, south: 25.7089, east: -80.1333, west: -80.3191 },
  },
  'Long Beach': {
    name: 'Long Beach',
    state: 'CA',
    country: 'US',
    bbox: { north: 33.8852, south: 33.7074, east: -118.0631, west: -118.2506 },
  },
  'Virginia Beach': {
    name: 'Virginia Beach',
    state: 'VA',
    country: 'US',
    bbox: { north: 36.9293, south: 36.6425, east: -75.9658, west: -76.2173 },
  },
  'Oakland': {
    name: 'Oakland',
    state: 'CA',
    country: 'US',
    bbox: { north: 37.8854, south: 37.6320, east: -122.1148, west: -122.3558 },
  },
  'Minneapolis': {
    name: 'Minneapolis',
    state: 'MN',
    country: 'US',
    bbox: { north: 45.0513, south: 44.8902, east: -93.1934, west: -93.3290 },
  },
  'Tulsa': {
    name: 'Tulsa',
    state: 'OK',
    country: 'US',
    bbox: { north: 36.2395, south: 35.9424, east: -95.7849, west: -96.1338 },
  },
  'Arlington': {
    name: 'Arlington',
    state: 'TX',
    country: 'US',
    bbox: { north: 32.8626, south: 32.5993, east: -97.0003, west: -97.2179 },
  },
  'New Orleans': {
    name: 'New Orleans',
    state: 'LA',
    country: 'US',
    bbox: { north: 30.1990, south: 29.8669, east: -89.6253, west: -90.1403 },
  },
  'Wichita': {
    name: 'Wichita',
    state: 'KS',
    country: 'US',
    bbox: { north: 37.7640, south: 37.5838, east: -97.1465, west: -97.5143 },
  },
  'Cleveland': {
    name: 'Cleveland',
    state: 'OH',
    country: 'US',
    bbox: { north: 41.5912, south: 41.3917, east: -81.5380, west: -81.8786 },
  },
};

/**
 * Get all city names for bulk ingestion
 */
export function getAllCityNames(): string[] {
  return Object.keys(EXTENDED_CITY_CONFIGS);
}

/**
 * Get city batches for parallel processing
 */
export function getCityBatches(batchSize: number = 5): string[][] {
  const cities = getAllCityNames();
  const batches: string[][] = [];

  for (let i = 0; i < cities.length; i += batchSize) {
    batches.push(cities.slice(i, i + batchSize));
  }

  return batches;
}
