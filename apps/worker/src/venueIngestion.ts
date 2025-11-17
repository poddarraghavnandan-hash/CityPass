/**
 * Venue Ingestion Worker Entry Point
 * Runs the venue ingestion pipeline for configured cities
 */

import { runCityIngestion } from '@citypass/venue-agent';

/**
 * Run venue ingestion for a specific city
 *
 * @param city - City name (e.g., "New York")
 * @param runType - Type of run: FULL or INCREMENTAL
 */
export async function runVenueIngestionForCity(
  city: string,
  runType: 'FULL' | 'INCREMENTAL' = 'INCREMENTAL'
): Promise<void> {
  console.log(`\n📍 Starting venue ingestion for ${city} (${runType})`);

  try {
    const result = await runCityIngestion(city, runType);

    console.log(`\n✅ Venue ingestion completed for ${city}`);
    console.log(`  - New venues: ${result.stats.newVenues}`);
    console.log(`  - Updated venues: ${result.stats.updatedVenues}`);
    console.log(`  - Total raw venues: ${result.stats.rawTotal}`);
    console.log(`  - Duration: ${result.stats.durationMs}ms`);
    console.log(`  - Errors: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.warn(`\n⚠️  Errors encountered:`);
      result.errors.slice(0, 5).forEach(err => {
        console.warn(`  - [${err.agentName}] ${err.message}`);
      });
      if (result.errors.length > 5) {
        console.warn(`  ... and ${result.errors.length - 5} more`);
      }
    }
  } catch (error: any) {
    console.error(`\n❌ Venue ingestion failed for ${city}:`, error.message);
    throw error;
  }
}

/**
 * Run venue ingestion for all configured cities
 *
 * @param runType - Type of run: FULL or INCREMENTAL
 */
export async function runVenueIngestionForAllCities(
  runType: 'FULL' | 'INCREMENTAL' = 'INCREMENTAL'
): Promise<void> {
  // Cities to process (can be configured via env)
  const cities = (process.env.VENUE_INGESTION_CITIES || 'New York')
    .split(',')
    .map(c => c.trim());

  console.log(`\n🌍 Running venue ingestion for ${cities.length} cities: ${cities.join(', ')}`);

  for (const city of cities) {
    try {
      await runVenueIngestionForCity(city, runType);
    } catch (error: any) {
      console.error(`Failed to ingest venues for ${city}, continuing with next city...`);
    }

    // Delay between cities to avoid rate limiting
    if (cities.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  console.log(`\n✨ All cities processed\n`);
}
