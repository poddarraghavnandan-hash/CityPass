-- Venue Knowledge Graph Migration
-- Adds comprehensive venue ingestion, matching, and heat index tracking

-- ====================================
-- 1. CREATE ENUMS
-- ====================================

-- Price band for venues
DO $$ BEGIN
  CREATE TYPE "VenuePriceBand" AS ENUM ('FREE', 'LOW', 'MID', 'HIGH', 'LUXE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Venue source types
DO $$ BEGIN
  CREATE TYPE "VenueSourceType" AS ENUM (
    'OSM',
    'FOURSQUARE',
    'YELP',
    'EVENTBRITE',
    'MEETUP',
    'FEVER',
    'DICE',
    'RA',
    'NYC_DATA',
    'TIKTOK',
    'INSTAGRAM',
    'SNAPCHAT',
    'REDDIT',
    'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Signal types for venue metrics
DO $$ BEGIN
  CREATE TYPE "VenueSignalType" AS ENUM (
    'EVENT_ACTIVITY',
    'SOCIAL_HEAT',
    'USER_TRAFFIC',
    'RATING',
    'RISK'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Signal time windows
DO $$ BEGIN
  CREATE TYPE "SignalWindow" AS ENUM ('HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Ingestion run types
DO $$ BEGIN
  CREATE TYPE "IngestionRunType" AS ENUM ('FULL', 'INCREMENTAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Ingestion run status
DO $$ BEGIN
  CREATE TYPE "IngestionRunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED', 'PARTIAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ====================================
-- 2. UPDATE EXISTING VENUES TABLE
-- ====================================

-- Add new columns to existing venues table if they don't exist
DO $$
BEGIN
  -- Add canonical_name
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='venues' AND column_name='canonical_name') THEN
    ALTER TABLE venues ADD COLUMN canonical_name TEXT;
    -- Populate from existing name column
    UPDATE venues SET canonical_name = name WHERE canonical_name IS NULL;
    ALTER TABLE venues ALTER COLUMN canonical_name SET NOT NULL;
  END IF;

  -- Add normalized_name
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='venues' AND column_name='normalized_name') THEN
    ALTER TABLE venues ADD COLUMN normalized_name TEXT;
    -- Populate with lowercase version
    UPDATE venues SET normalized_name = LOWER(name) WHERE normalized_name IS NULL;
    ALTER TABLE venues ALTER COLUMN normalized_name SET NOT NULL;
  END IF;

  -- Add primary_category
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='venues' AND column_name='primary_category') THEN
    ALTER TABLE venues ADD COLUMN primary_category TEXT DEFAULT 'OTHER';
    ALTER TABLE venues ALTER COLUMN primary_category SET NOT NULL;
  END IF;

  -- Add subcategories
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='venues' AND column_name='subcategories') THEN
    ALTER TABLE venues ADD COLUMN subcategories TEXT[] DEFAULT '{}';
  END IF;

  -- Add price_band
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='venues' AND column_name='price_band') THEN
    ALTER TABLE venues ADD COLUMN price_band "VenuePriceBand";
  END IF;

  -- Add capacity
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='venues' AND column_name='capacity') THEN
    ALTER TABLE venues ADD COLUMN capacity INTEGER;
  END IF;

  -- Add is_active
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='venues' AND column_name='is_active') THEN
    ALTER TABLE venues ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL;
  END IF;

END $$;

-- ====================================
-- 3. CREATE VENUE_SOURCES TABLE
-- ====================================

CREATE TABLE IF NOT EXISTS venue_sources (
  id TEXT PRIMARY KEY,
  venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  source "VenueSourceType" NOT NULL,
  source_external_id TEXT NOT NULL,
  source_url TEXT,
  raw_payload JSONB NOT NULL,
  confidence FLOAT NOT NULL DEFAULT 1.0,
  first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(source, source_external_id)
);

CREATE INDEX IF NOT EXISTS idx_venue_sources_venue_id ON venue_sources(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_sources_source ON venue_sources(source);

-- ====================================
-- 4. CREATE VENUE_ALIASES TABLE
-- ====================================

CREATE TABLE IF NOT EXISTS venue_aliases (
  id TEXT PRIMARY KEY,
  venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  alias_normalized TEXT NOT NULL,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_venue_aliases_venue_id ON venue_aliases(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_aliases_normalized ON venue_aliases(alias_normalized);

-- ====================================
-- 5. CREATE VENUE_SIGNALS TABLE
-- ====================================

CREATE TABLE IF NOT EXISTS venue_signals (
  id TEXT PRIMARY KEY,
  venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  signal_type "VenueSignalType" NOT NULL,
  value FLOAT NOT NULL,
  window "SignalWindow" NOT NULL,
  meta JSONB,
  computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_venue_signals_venue_type_window ON venue_signals(venue_id, signal_type, window);
CREATE INDEX IF NOT EXISTS idx_venue_signals_computed_at ON venue_signals(computed_at);

-- ====================================
-- 6. CREATE VENUE_HEAT_INDEX TABLE
-- ====================================

CREATE TABLE IF NOT EXISTS venue_heat_index (
  venue_id TEXT PRIMARY KEY REFERENCES venues(id) ON DELETE CASCADE,
  composite_score FLOAT NOT NULL,
  last_computed_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_venue_heat_index_score ON venue_heat_index(composite_score);

-- ====================================
-- 7. CREATE INGESTION_RUNS TABLE
-- ====================================

CREATE TABLE IF NOT EXISTS ingestion_runs (
  id TEXT PRIMARY KEY,
  run_type "IngestionRunType" NOT NULL,
  city TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  finished_at TIMESTAMP WITH TIME ZONE,
  status "IngestionRunStatus" NOT NULL,
  stats_json JSONB
);

CREATE INDEX IF NOT EXISTS idx_ingestion_runs_city_started ON ingestion_runs(city, started_at);
CREATE INDEX IF NOT EXISTS idx_ingestion_runs_status_started ON ingestion_runs(status, started_at);

-- ====================================
-- 8. CREATE INGESTION_ERRORS TABLE
-- ====================================

CREATE TABLE IF NOT EXISTS ingestion_errors (
  id TEXT PRIMARY KEY,
  ingestion_run_id TEXT NOT NULL REFERENCES ingestion_runs(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  source TEXT NOT NULL,
  message TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ingestion_errors_run_id ON ingestion_errors(ingestion_run_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_errors_agent ON ingestion_errors(agent_name);

-- ====================================
-- 9. ADD VENUE INDEXES
-- ====================================

-- Add indexes for the new columns
CREATE UNIQUE INDEX IF NOT EXISTS idx_venues_canonical_city ON venues(canonical_name, city);
CREATE INDEX IF NOT EXISTS idx_venues_city ON venues(city);
CREATE INDEX IF NOT EXISTS idx_venues_normalized_city ON venues(normalized_name, city);
CREATE INDEX IF NOT EXISTS idx_venues_primary_category_city ON venues(primary_category, city);
CREATE INDEX IF NOT EXISTS idx_venues_is_active_city ON venues(is_active, city);

-- ====================================
-- 10. ADD VENUE_ID FOREIGN KEY TO EVENTS
-- ====================================

-- Ensure events.venue_id references venues(id) if not already set
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'events_venue_id_fkey'
  ) THEN
    ALTER TABLE events
    ADD CONSTRAINT events_venue_id_fkey
    FOREIGN KEY (venue_id) REFERENCES venues(id);
  END IF;
END $$;

-- ====================================
-- MIGRATION COMPLETE
-- ====================================

-- Summary of changes:
-- ✓ Created 6 new enums for venue classification and tracking
-- ✓ Extended venues table with canonical names, categories, price bands, and status
-- ✓ Created venue_sources table for multi-source tracking
-- ✓ Created venue_aliases table for alternative names
-- ✓ Created venue_signals table for time-series metrics
-- ✓ Created venue_heat_index table for composite popularity scores
-- ✓ Created ingestion_runs table for pipeline tracking
-- ✓ Created ingestion_errors table for error logging
-- ✓ Added comprehensive indexes for query performance
-- ✓ Established foreign key relationships

-- This schema supports:
-- 1. Multi-source venue ingestion (OSM, Foursquare, Yelp, etc.)
-- 2. Fuzzy matching and deduplication
-- 3. Heat index computation
-- 4. Quality tracking
-- 5. Graceful error handling
-- 6. Incremental and full refresh runs
