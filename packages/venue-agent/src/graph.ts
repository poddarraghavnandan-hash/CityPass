/**
 * Venue Ingestion Agent Graph
 * Orchestrates the multi-node venue ingestion pipeline
 */

import type { CityConfig, CityIngestionContext, IngestionStats, AgentNode } from './types';
import { getCityConfig } from './utils/geo';

// Import all agent nodes
import { fetchOSMVenues } from './nodes/osmAgent';
import { fetchFoursquareVenues } from './nodes/foursquareAgent';
import { fetchYelpVenues } from './nodes/yelpAgent';
import { fetchEventSiteVenues } from './nodes/eventSitesAgent';
import { fetchSocialSignals } from './nodes/socialSignalsAgent';
import { normalizeRawVenues } from './nodes/normalize';
import { matchAndDeduplicateVenues } from './nodes/matchDedupe';
import { computeVenueHeatIndex } from './nodes/heatIndex';
import { writeVenueGraph } from './nodes/writeGraph';
import { qualityCheck } from './nodes/qualityCheck';
import { createIngestionRun, finalizeIngestionRun } from './nodes/logRun';

/**
 * Agent graph definition
 * Each node is executed sequentially in this order
 */
const AGENT_GRAPH: AgentNode[] = [
  // Initialize run logging
  createIngestionRun,

  // Source agents (parallel conceptually, but executed sequentially)
  fetchOSMVenues,
  fetchFoursquareVenues,
  fetchYelpVenues,
  fetchEventSiteVenues,
  fetchSocialSignals,

  // Processing pipeline
  normalizeRawVenues,
  matchAndDeduplicateVenues,

  // Write to database and graph
  writeVenueGraph,

  // Post-processing
  computeVenueHeatIndex,
  qualityCheck,

  // Finalize logging
  finalizeIngestionRun,
];

/**
 * Initialize ingestion context
 */
function initializeContext(
  city: CityConfig,
  runType: 'FULL' | 'INCREMENTAL'
): CityIngestionContext {
  const stats: IngestionStats = {
    osmVenues: 0,
    foursquareVenues: 0,
    yelpVenues: 0,
    eventSiteVenues: 0,
    socialSignals: 0,

    rawTotal: 0,
    normalizedTotal: 0,
    matched: 0,
    newVenues: 0,
    updatedVenues: 0,

    venuesWithCoords: 0,
    venuesWithCategory: 0,
    venuesWithWebsite: 0,

    startTime: new Date(),
  };

  return {
    city,
    runType,
    ingestionRunId: '', // Will be set by createIngestionRun
    stats,
    errors: [],
  };
}

/**
 * Run the venue ingestion pipeline for a city
 *
 * @param cityName - Name of the city (e.g., "New York")
 * @param runType - Type of run: FULL or INCREMENTAL
 * @returns Ingestion context with results and stats
 */
export async function runCityIngestion(
  cityName: string,
  runType: 'FULL' | 'INCREMENTAL' = 'FULL'
): Promise<CityIngestionContext> {
  console.log(`\n=== Venue Ingestion: ${cityName} (${runType}) ===\n`);

  // Get city configuration
  const cityConfig = getCityConfig(cityName);
  if (!cityConfig) {
    throw new Error(`City "${cityName}" not configured. Available cities: ${Object.keys(getCityConfig).join(', ')}`);
  }

  // Initialize context
  let context = initializeContext(cityConfig, runType);

  try {
    // Execute agent graph sequentially
    for (const agentNode of AGENT_GRAPH) {
      context = await agentNode(context);
    }

    console.log(`\n=== Ingestion Complete ===`);
    console.log(`Status: ${context.errors.length === 0 ? 'SUCCESS' : 'PARTIAL'}`);
    console.log(`Duration: ${context.stats.durationMs}ms`);
    console.log(`Raw venues: ${context.stats.rawTotal}`);
    console.log(`Normalized: ${context.stats.normalizedTotal}`);
    console.log(`New venues: ${context.stats.newVenues}`);
    console.log(`Updated venues: ${context.stats.updatedVenues}`);
    console.log(`Errors: ${context.errors.length}\n`);

    return context;
  } catch (error: any) {
    console.error(`\n=== Ingestion Failed ===`);
    console.error(`Error:`, error);

    // Try to finalize run with error
    context.errors.push({
      agentName: 'Graph',
      source: 'SYSTEM',
      message: `Pipeline failed: ${error.message}`,
      timestamp: new Date(),
    });

    try {
      await finalizeIngestionRun(context);
    } catch (logError) {
      console.error('Failed to finalize run:', logError);
    }

    throw error;
  }
}

/**
 * Export individual nodes for testing or custom pipelines
 */
export {
  fetchOSMVenues,
  fetchFoursquareVenues,
  fetchYelpVenues,
  fetchEventSiteVenues,
  fetchSocialSignals,
  normalizeRawVenues,
  matchAndDeduplicateVenues,
  computeVenueHeatIndex,
  writeVenueGraph,
  qualityCheck,
  createIngestionRun,
  finalizeIngestionRun,
};
