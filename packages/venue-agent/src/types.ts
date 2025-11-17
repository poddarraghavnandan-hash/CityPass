/**
 * Type definitions for venue ingestion agent graph
 */

import type { VenueSourceType, VenuePriceBand } from '@citypass/db';

/**
 * City configuration for ingestion
 */
export interface CityConfig {
  name: string;
  state?: string;
  country: string;
  bbox: BoundingBox; // Bounding box for the city
  defaultNeighborhoods?: string[];
}

/**
 * Geographic bounding box
 */
export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Raw venue from a source (before normalization)
 */
export interface RawVenue {
  // Source identification
  source: VenueSourceType;
  sourceExternalId: string;
  sourceUrl?: string;
  rawPayload: Record<string, any>;
  confidence: number; // 0.0 to 1.0

  // Core fields
  rawName: string;
  aliases?: string[];

  // Location
  lat?: number;
  lon?: number;
  address?: string;
  neighborhood?: string;
  city: string;

  // Categorization
  categories?: string[];
  tags?: string[];

  // Pricing & Details
  priceLevel?: number; // 1-4 scale
  capacity?: number;

  // Contact
  website?: string;
  phone?: string;
  description?: string;
  imageUrl?: string;

  // Metadata
  rating?: number;
  reviewCount?: number;
  hours?: Record<string, string>;
  accessibility?: string[];
}

/**
 * Normalized venue candidate (post-normalization, pre-matching)
 */
export interface NormalizedVenueCandidate {
  // Normalized identity
  canonicalName: string;
  normalizedName: string;
  aliases: string[];

  // Location
  lat?: number;
  lon?: number;
  address?: string;
  neighborhood?: string;
  city: string;

  // Categorization
  primaryCategory: string;
  subcategories: string[];

  // Pricing
  priceBand?: VenuePriceBand;
  capacity?: number;

  // Contact
  website?: string;
  phone?: string;
  description?: string;
  imageUrl?: string;

  // Status
  isActive: boolean;

  // Source data (for VenueSource table)
  sources: RawVenue[];
}

/**
 * Match candidate (result of deduplication)
 */
export interface MatchCandidate {
  candidate: NormalizedVenueCandidate;
  matchedVenueId?: string; // If matched to existing venue
  matchConfidence?: number; // 0.0 to 1.0
  isNew: boolean;
}

/**
 * City ingestion context (flows through the agent graph)
 */
export interface CityIngestionContext {
  // Input
  city: CityConfig;
  runType: 'FULL' | 'INCREMENTAL';
  ingestionRunId: string;

  // Intermediate state
  rawVenues?: RawVenue[];
  normalizedCandidates?: NormalizedVenueCandidate[];
  matchedCandidates?: MatchCandidate[];

  // Stats
  stats: IngestionStats;

  // Errors
  errors: IngestionErrorEntry[];
}

/**
 * Ingestion statistics
 */
export interface IngestionStats {
  // Per-source counts
  osmVenues: number;
  foursquareVenues: number;
  yelpVenues: number;
  eventSiteVenues: number;
  socialSignals: number;

  // Processing stats
  rawTotal: number;
  normalizedTotal: number;
  matched: number;
  newVenues: number;
  updatedVenues: number;

  // Quality metrics
  venuesWithCoords: number;
  venuesWithCategory: number;
  venuesWithWebsite: number;

  // Timing
  startTime: Date;
  endTime?: Date;
  durationMs?: number;
}

/**
 * Ingestion error entry
 */
export interface IngestionErrorEntry {
  agentName: string;
  source: string;
  message: string;
  payload?: Record<string, any>;
  timestamp: Date;
}

/**
 * Heat computation context
 */
export interface HeatComputationContext {
  venueId: string;
  signals: VenueSignalData[];
  compositeScore: number;
}

/**
 * Venue signal data
 */
export interface VenueSignalData {
  signalType: 'EVENT_ACTIVITY' | 'SOCIAL_HEAT' | 'USER_TRAFFIC' | 'RATING' | 'RISK';
  value: number;
  window: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  meta?: Record<string, any>;
}

/**
 * OSM Overpass API response types
 */
export interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  center?: {
    lat: number;
    lon: number;
  };
}

export interface OverpassResponse {
  version: number;
  generator: string;
  elements: OverpassElement[];
}

/**
 * Foursquare Places API response types
 */
export interface FoursquareVenue {
  fsq_id: string;
  name: string;
  location: {
    address?: string;
    locality?: string;
    region?: string;
    postcode?: string;
    country?: string;
    lat?: number;
    lng?: number;
  };
  categories: Array<{
    id: number;
    name: string;
    icon: {
      prefix: string;
      suffix: string;
    };
  }>;
  geocodes: {
    main: {
      latitude: number;
      longitude: number;
    };
  };
  link?: string;
  rating?: number;
  stats?: {
    total_photos?: number;
    total_ratings?: number;
    total_tips?: number;
  };
  price?: number; // 1-4
}

/**
 * Yelp Fusion API response types
 */
export interface YelpBusiness {
  id: string;
  alias: string;
  name: string;
  image_url?: string;
  url?: string;
  review_count?: number;
  categories: Array<{
    alias: string;
    title: string;
  }>;
  rating?: number;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  location: {
    address1?: string;
    address2?: string;
    address3?: string;
    city?: string;
    zip_code?: string;
    country?: string;
    state?: string;
    display_address?: string[];
  };
  phone?: string;
  display_phone?: string;
  distance?: number;
  price?: string; // $, $$, $$$, $$$$
}

/**
 * Event site venue extraction result
 */
export interface EventSiteVenue {
  source: 'EVENTBRITE' | 'MEETUP' | 'FEVER' | 'DICE' | 'RA';
  venueName: string;
  venueUrl?: string;
  venueId?: string;
  address?: string;
  lat?: number;
  lon?: number;
  city: string;
  eventCount: number; // How many events at this venue
}

/**
 * Social signal result (stub)
 */
export interface SocialSignalResult {
  venueName: string;
  lat?: number;
  lon?: number;
  city: string;
  heatScore: number; // 0-100
  sources: Array<'TIKTOK' | 'INSTAGRAM' | 'SNAPCHAT' | 'REDDIT'>;
  meta: Record<string, any>;
}

/**
 * Agent node function signature
 */
export type AgentNode = (context: CityIngestionContext) => Promise<CityIngestionContext>;

/**
 * Quality check result
 */
export interface QualityCheckResult {
  passed: boolean;
  warnings: string[];
  anomalies: string[];
  metrics: {
    coverageScore: number; // 0-100
    qualityScore: number;  // 0-100
    completenessScore: number; // 0-100
  };
}

/**
 * Category mapping
 */
export interface CategoryMapping {
  sourceCategory: string;
  primaryCategory: string;
  subcategories: string[];
}

/**
 * Price band mapping
 */
export interface PriceBandMapping {
  sourcePrice: number | string;
  priceBand: VenuePriceBand;
}
