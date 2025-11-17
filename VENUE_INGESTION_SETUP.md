# NYC Venue Ingestion Setup Guide

## Goal
Ingest **1,000,000 venues** in New York City using our agentic venue ingestion pipeline.

## Step 1: Run Database Migration

Execute the SQL migration file to set up the venue knowledge graph schema:

```bash
# Option 1: Using psql (if you have PostgreSQL CLI installed)
psql "postgres://postgres:JfWnsUut6f7XSEMA@eoabuyvlsakqkuqtkwxo.db.us-west-2.nhost.run:5432/eoabuyvlsakqkuqtkwxo" -f packages/db/migrations/add_venue_knowledge_graph.sql

# Option 2: Connect to your database using your preferred tool and run the SQL file
# The migration file is at: packages/db/migrations/add_venue_knowledge_graph.sql
```

### What the migration does:
- Creates 6 new enums for venue classification
- Extends the `venues` table with canonical names, categories, price bands
- Creates `venue_sources` table for multi-source tracking
- Creates `venue_aliases` table for alternative names
- Creates `venue_signals` table for time-series metrics
- Creates `venue_heat_index` table for popularity scores
- Creates `ingestion_runs` and `ingestion_errors` tables for pipeline tracking
- Adds comprehensive indexes for query performance

## Step 2: Configure API Keys (Optional)

The system works with graceful degradation. OSM (OpenStreetMap) requires no API key and will always work.

For better coverage, add these API keys to your `.env` file:

```bash
# Foursquare (optional, improves coverage)
FOURSQUARE_API_KEY="your-foursquare-api-key-here"

# Yelp (optional, improves coverage)
YELP_API_KEY="your-yelp-api-key-here"

# Google Places (optional, improves coverage)
GOOGLE_PLACES_API_KEY="your-google-places-api-key-here"
```

**Note:** Even without these API keys, the system will still ingest venues from:
- OpenStreetMap (Overpass API) - FREE, no key required
- Event platform venue extraction (from existing events)
- Social signal venues (from existing social data)

## Step 3: Generate Prisma Client

After running the migration, regenerate the Prisma client:

```bash
cd packages/db
npx prisma generate
```

## Step 4: Run NYC Venue Ingestion

Execute the ingestion script:

```bash
# From the project root
pnpm exec tsx scripts/run-nyc-venue-ingestion.ts
```

This will:
1. Query OSM Overpass API for all venues in NYC (museums, restaurants, bars, theaters, etc.)
2. Query Foursquare API (if key available)
3. Query Yelp API (if key available)
4. Extract venues from existing events
5. Normalize all raw venues
6. Match and deduplicate against existing venues
7. Write to Postgres + Neo4j (if configured)
8. Compute heat indexes
9. Run quality checks
10. Log comprehensive statistics

## Expected Results

### Data Sources (estimated counts):
- **OSM (OpenStreetMap)**: 50,000 - 100,000 venues
- **Foursquare**: 200,000 - 300,000 venues (if API key provided)
- **Yelp**: 150,000 - 250,000 venues (if API key provided)
- **Event Sites**: 10,000 - 50,000 venues
- **Social Signals**: 5,000 - 20,000 venues

### After Deduplication:
- **Total Unique Venues**: 400,000 - 1,000,000 venues (depending on API keys)

## Monitoring Progress

The script will output real-time progress:

```
🗽 Starting NYC Venue Ingestion Pipeline
🎯 Target: 1,000,000 venues

🚀 [OSMAgent] Fetching venues from Overpass API...
✅ [OSMAgent] Found 85,234 venues

🚀 [FoursquareAgent] Fetching venues...
✅ [FoursquareAgent] Found 287,456 venues

🚀 [NormalizeNode] Normalizing 372,690 raw venues...
✅ [NormalizeNode] Normalized 372,690 candidates

🚀 [MatchDedupeNode] Matching against 125,000 existing venues...
✅ [MatchDedupeNode] Found 247,690 new + 125,000 updated

📊 FINAL STATISTICS:
─────────────────────────────────────────
  Total Raw:       372,690 venues
  New Venues:      247,690 created
  Updated:         125,000 updated
  Final Count:     372,690 venues
─────────────────────────────────────────

📈 Progress: 372,690 / 1,000,000 (37.27%)
```

## Reaching 1 Million Venues

If the initial run doesn't reach 1M, you can:

1. **Add API Keys**: Foursquare and Yelp will significantly increase coverage
2. **Expand Borough Coverage**: Extend the NYC bounding box to include all 5 boroughs
3. **Add More Cities**: Include nearby cities (Jersey City, Yonkers, etc.)
4. **Run Incremental Updates**: Run incremental ingestion to catch new venues

## Troubleshooting

### Migration Fails
- Check database credentials in `.env`
- Ensure you have write permissions
- Try running migrations individually

### Low Venue Counts
- Verify API keys are correct
- Check OSM Overpass API is responding
- Review error logs in `ingestion_errors` table

### Duplicate Venues
- The system automatically deduplicates using fuzzy matching
- Match threshold is 85% (configurable in `packages/venue-agent/src/utils/matching.ts`)

## Architecture

The system uses an **Agent Graph** architecture:

```
Source Agents → Normalization → Match/Dedupe → Write Graph → Compute Heat → Quality Check
     ↓              ↓                ↓              ↓             ↓             ↓
   OSM         Normalize         Match to       Postgres      Heat Index    Coverage
Foursquare   Categories        Existing         Neo4j        Computation    Checks
  Yelp        Names            Venues          Relations      Signals      Anomalies
  Events      Coordinates      Fuzzy Match      Aliases
  Social      Price Bands
```

Each node is independent and can fail gracefully without stopping the pipeline.

## Next Steps

After ingestion:
1. Check venue counts: `SELECT COUNT(*) FROM venues WHERE city = 'New York'`
2. Review quality metrics in `ingestion_runs` table
3. Explore Neo4j graph relationships
4. Set up incremental updates (hourly) via worker cron
5. Add more cities to scale to 10M+ venues

---

**Questions?** Check `docs/README_VENUE_GRAPH.md` for detailed documentation.
