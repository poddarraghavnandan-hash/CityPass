#!/usr/bin/env tsx
/**
 * NYC Venue Ingestion Script
 * Target: 1,000,000 venues in New York City
 *
 * This script runs the venue ingestion pipeline for NYC
 * using all available sources: OSM, Foursquare, Yelp, Event Sites, and Social Signals
 *
 * Usage:
 *   pnpm exec tsx scripts/run-nyc-venue-ingestion.ts
 */

import { runCityIngestion } from '../packages/venue-agent/src/index';

async function main() {
  console.log('🗽 Starting NYC Venue Ingestion Pipeline');
  console.log('🎯 Target: 1,000,000 venues\n');

  const startTime = Date.now();

  try {
    // Run FULL ingestion for NYC
    const result = await runCityIngestion('New York', 'FULL');

    const durationMinutes = Math.round((Date.now() - startTime) / 1000 / 60);

    console.log('\n✅ NYC VENUE INGESTION COMPLETE\n');
    console.log('📊 FINAL STATISTICS:');
    console.log('─────────────────────────────────────────');
    console.log(`  City:              ${result.city.name}`);
    console.log(`  Run Type:          ${result.runType}`);
    console.log(`  Duration:          ${durationMinutes} minutes`);
    console.log('');
    console.log('  SOURCE BREAKDOWN:');
    console.log(`    OSM:             ${result.stats.osmVenues.toLocaleString()} venues`);
    console.log(`    Foursquare:      ${result.stats.foursquareVenues.toLocaleString()} venues`);
    console.log(`    Yelp:            ${result.stats.yelpVenues.toLocaleString()} venues`);
    console.log(`    Event Sites:     ${result.stats.eventSiteVenues.toLocaleString()} venues`);
    console.log(`    Social Signals:  ${result.stats.socialVenues.toLocaleString()} venues`);
    console.log(`    ─────────────────`);
    console.log(`    Total Raw:       ${result.stats.rawTotal.toLocaleString()} venues`);
    console.log('');
    console.log('  DEDUPLICATION:');
    console.log(`    Normalized:      ${result.stats.normalized.toLocaleString()} candidates`);
    console.log(`    New Venues:      ${result.stats.newVenues.toLocaleString()} created`);
    console.log(`    Updated:         ${result.stats.updatedVenues.toLocaleString()} updated`);
    console.log(`    ─────────────────`);
    console.log(`    Final Count:     ${(result.stats.newVenues + result.stats.updatedVenues).toLocaleString()} venues`);
    console.log('');
    console.log('  QUALITY:');
    console.log(`    With Coordinates:  ${result.stats.withCoordinates.toLocaleString()}`);
    console.log(`    With Categories:   ${result.stats.withCategories.toLocaleString()}`);
    console.log(`    With Addresses:    ${result.stats.withAddresses.toLocaleString()}`);
    console.log(`    Completeness:      ${result.stats.avgCompleteness.toFixed(1)}%`);
    console.log('');
    console.log('  ERRORS:');
    console.log(`    Count:           ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.log('\n⚠️  ERROR DETAILS (first 10):');
      result.errors.slice(0, 10).forEach((err, i) => {
        console.log(`  ${i + 1}. [${err.agentName}] ${err.message}`);
      });
      if (result.errors.length > 10) {
        console.log(`  ... and ${result.errors.length - 10} more errors`);
      }
    }

    console.log('─────────────────────────────────────────\n');

    // Progress towards 1M goal
    const totalVenues = result.stats.newVenues + result.stats.updatedVenues;
    const progressPct = ((totalVenues / 1_000_000) * 100).toFixed(2);
    console.log(`📈 Progress: ${totalVenues.toLocaleString()} / 1,000,000 (${progressPct}%)`);

    if (totalVenues >= 1_000_000) {
      console.log('🎉 🎉 🎉 TARGET ACHIEVED! 1 MILLION VENUES! 🎉 🎉 🎉\n');
    } else {
      console.log(`💡 Note: To reach 1M, consider expanding to more boroughs or running incremental updates\n`);
    }

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ INGESTION FAILED\n');
    console.error('Error:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
  }
}

main();
