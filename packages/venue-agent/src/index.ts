/**
 * Venue Agent - Agentic Venue Ingestion & Knowledge Graph
 *
 * This package provides a multi-node agent graph for ingesting venue data
 * from multiple sources (OSM, Foursquare, Yelp, event platforms, social signals)
 * and building a canonical venue knowledge graph.
 *
 * @example
 * ```typescript
 * import { runCityIngestion } from '@citypass/venue-agent';
 *
 * const result = await runCityIngestion('New York', 'FULL');
 * console.log(`Created ${result.stats.newVenues} venues`);
 * ```
 */

// Main graph execution
export { runCityIngestion } from './graph';

// Individual agent nodes (for custom pipelines or testing)
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
} from './graph';

// Types
export type {
  CityConfig,
  CityIngestionContext,
  RawVenue,
  NormalizedVenueCandidate,
  MatchCandidate,
  IngestionStats,
  VenueSignalData,
  QualityCheckResult,
  AgentNode,
} from './types';

// Utilities
export { getCityConfig, CITY_CONFIGS } from './utils/geo';
export {
  normalizeName,
  canonicalizeName,
  normalizeAddress,
  mapPriceBand,
  mapCategories,
} from './utils/normalization';
export {
  calculateMatchScore,
  areVenuesMatch,
  geoDistance,
  isGeographicallyClose,
} from './utils/matching';
