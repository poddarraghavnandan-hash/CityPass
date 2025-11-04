import { CrawlState } from '@citypass/types';

/**
 * Geocode events (handled by ingest API)
 */
export async function geocodeEvents(state: CrawlState): Promise<Partial<CrawlState>> {
  console.log(`📍 Geocoding handled by ingest pipeline`);
  return {};
}
