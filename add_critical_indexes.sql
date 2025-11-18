-- ============================================================================
-- CityPass/CityLens - Phase 1 Critical Indexes Migration
-- Created: 2025-01-18
--
-- INSTRUCTIONS FOR NHOST SQL EDITOR:
-- 1. Copy this entire file
-- 2. Go to Nhost Dashboard → SQL Editor
-- 3. Paste and click "Run"
-- 4. All 3 indexes will be created
-- 5. Run the verification queries at the bottom to confirm
-- ============================================================================

-- Index 1: Event.venue_id (for faster venue-based event queries)
CREATE INDEX IF NOT EXISTS "events_venue_id_idx" ON "events"("venue_id");

-- Index 2: Event.source_id (for faster source-based event queries)
CREATE INDEX IF NOT EXISTS "events_source_id_idx" ON "events"("source_id");

-- Index 3: SearchCache.expires_at (for efficient cache cleanup)
CREATE INDEX IF NOT EXISTS "search_cache_expires_at_idx" ON "search_cache"("expires_at");

-- ============================================================================
-- VERIFICATION (Run these separately after the above succeeds)
-- ============================================================================

-- Verify Event table indexes
SELECT
    indexname,
    tablename,
    indexdef
FROM pg_indexes
WHERE tablename = 'events'
    AND (indexname LIKE '%venue_id%' OR indexname LIKE '%source_id%')
ORDER BY indexname;

-- Verify SearchCache table indexes
SELECT
    indexname,
    tablename,
    indexdef
FROM pg_indexes
WHERE tablename = 'search_cache'
    AND indexname LIKE '%expires_at%'
ORDER BY indexname;
