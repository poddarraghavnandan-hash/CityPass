# Venue Knowledge Graph - Agentic Ingestion System

## Overview

The **Venue Knowledge Graph** is a production-ready, agentic data ingestion pipeline that builds and maintains a canonical database of venues across multiple cities. Unlike the existing Google Places-based venue discovery system, this pipeline aggregates data from multiple authoritative sources and creates a unified, deduplicated knowledge graph.

### Key Features

- **Multi-Source Ingestion**: OSM (OpenStreetMap), Foursquare, Yelp, Event Platforms, Social Signals
- **Agent Graph Architecture**: Composable, orchestrated pipeline of specialized agents
- **Automatic Deduplication**: Fuzzy matching prevents duplicate venue entries
- **Knowledge Graph**: Neo4j-backed graph with venue-neighborhood-category relationships
- **Heat Index**: Dynamic venue popularity scoring based on events, social signals, and user traffic
- **Production-Ready**: Graceful degradation, error tracking, quality checks, idempotent runs

---

## Architecture

### Agent Graph Pipeline

The ingestion system is structured as a **directed acyclic graph (DAG)** of agent nodes:

```
┌─────────────────────────────────────────────────────┐
│                  Venue Ingestion DAG                │
└─────────────────────────────────────────────────────┘

1. createIngestionRun ──────────────────┐
                                        │
2. Source Agents (parallel conceptually)│
   ├── fetchOSMVenues                   │
   ├── fetchFoursquareVenues            │
   ├── fetchYelpVenues                  │
   ├── fetchEventSiteVenues             │
   └── fetchSocialSignals (stub)        │
                                        │
3. normalizeRawVenues                   │
                                        │
4. matchAndDeduplicateVenues            │
                                        │
5. writeVenueGraph                      │
   (Postgres + Neo4j)                   │
                                        │
6. computeVenueHeatIndex                │
                                        │
7. qualityCheck                         │
                                        │
8. finalizeIngestionRun ────────────────┘
```

### Data Flow

1. **Raw Venues**: Each source agent produces `RawVenue[]` with source-specific data
2. **Normalization**: Raw venues are grouped and normalized to `NormalizedVenueCandidate[]`
3. **Matching**: Candidates are matched against existing DB venues using fuzzy matching
4. **Write**: New/updated venues written to Postgres + Neo4j knowledge graph
5. **Signals**: Heat index computed from event activity, social signals, user traffic

---

## Data Model

### Core Tables (Prisma Schema)

#### `Venue`
Canonical venue entity.

```prisma
model Venue {
  id              String  @id
  name            String
  canonicalName   String  // Title-cased canonical name
  normalizedName  String  // Lowercase, no punctuation (for matching)

  lat             Float?
  lon             Float?
  address         String?
  neighborhood    String?
  city            String

  primaryCategory String  // MUSIC, COMEDY, ARTS, etc.
  subcategories   String[]

  priceBand       VenuePriceBand?  // FREE, LOW, MID, HIGH, LUXE
  capacity        Int?

  website         String?
  phone           String?
  description     String?
  imageUrl        String?

  isActive        Boolean

  // Relations
  sources         VenueSource[]
  aliases         VenueAlias[]
  signals         VenueSignal[]
  heatIndex       VenueHeatIndex?
  events          Event[]
}
```

#### `VenueSource`
Links venues to external source systems (OSM, Foursquare, Yelp, etc.).

```prisma
model VenueSource {
  venue            Venue
  source           VenueSourceType  // OSM, FOURSQUARE, YELP, etc.
  sourceExternalId String
  sourceUrl        String?
  rawPayload       Json             // Full source data
  confidence       Float            // 0.0 - 1.0
}
```

#### `VenueAlias`
Alternative names for venues (aliases, old names, etc.).

#### `VenueSignal`
Time-series signals for venue activity.

```prisma
model VenueSignal {
  venue      Venue
  signalType VenueSignalType  // EVENT_ACTIVITY, SOCIAL_HEAT, USER_TRAFFIC, RATING
  value      Float
  window     SignalWindow     // HOURLY, DAILY, WEEKLY, MONTHLY
  meta       Json?
}
```

#### `VenueHeatIndex`
Composite popularity score (0-100).

```prisma
model VenueHeatIndex {
  venue          Venue
  compositeScore Float  // 0-100
  lastComputedAt DateTime
}
```

#### `IngestionRun`
Tracks ingestion pipeline executions.

```prisma
model IngestionRun {
  runType    IngestionRunType  // FULL | INCREMENTAL
  city       String
  status     IngestionRunStatus  // RUNNING | SUCCESS | FAILED | PARTIAL
  statsJson  Json?  // Per-source counts, quality metrics
  errors     IngestionError[]
}
```

---

## Agent Nodes

### Source Agents

#### 1. OSMAgent (`fetchOSMVenues`)
**Source**: OpenStreetMap Overpass API

**What it does**:
- Queries OSM for venues in city bounding box
- Searches for: bars, nightclubs, theaters, museums, fitness centers, parks, markets
- Extracts: name, coordinates, address, tags, opening hours
- No API key required (free, public)

**Configuration**:
```bash
OVERPASS_URL="https://overpass-api.de/api/interpreter"
```

**Graceful degradation**: Continues if API unavailable, logs error

---

#### 2. FoursquareAgent (`fetchFoursquareVenues`)
**Source**: Foursquare Places API

**What it does**:
- Searches for venues by category within city radius
- Categories: Nightlife, Live Music, Arts, Fitness, Restaurants, Coworking
- Extracts: name, coordinates, categories, rating, price, reviews

**Configuration**:
```bash
FOURSQUARE_API_KEY="your-api-key"
```

**Graceful degradation**: If API key missing, skips source and logs warning

---

#### 3. YelpAgent (`fetchYelpVenues`)
**Source**: Yelp Fusion API

**What it does**:
- Searches for businesses by category
- Categories: nightlife, arts, active, restaurants, eventservices
- Extracts: name, coordinates, categories, rating, price ($-$$$$), reviews, phone

**Configuration**:
```bash
YELP_API_KEY="your-api-key"
```

**Graceful degradation**: If API key missing, skips source and logs warning

---

#### 4. EventSitesAgent (`fetchEventSiteVenues`)
**Source**: Internal event database

**What it does**:
- Queries existing events to extract venue data
- Groups events by venue name
- Only includes venues with 2+ events (higher confidence)
- Sources: Eventbrite, Meetup, Fever, Dice, Resident Advisor

**No configuration required** (uses existing event data)

---

#### 5. SocialSignalsAgent (`fetchSocialSignals`) - **STUB**
**Source**: TikTok, Instagram, Snapchat, Reddit APIs

**Current state**: Stub implementation (returns no data)

**Future implementation**:
- Query TikTok for location-tagged videos
- Query Instagram for location-tagged posts
- Query Snapchat Snap Map for heat data
- Query Reddit for venue mentions in city subreddits
- Compute composite "social heat" score (0-100)

**Why it's a stub**:
- Requires social media API access (complex approval processes)
- Privacy considerations
- Rate limiting challenges

**How to extend**:
1. Implement API clients in `socialSignalsAgent.ts`
2. Update `getSocialHeatForVenue()` function
3. Store results as `VenueSignal` entries with `signalType=SOCIAL_HEAT`

---

### Processing Nodes

#### 6. NormalizeAgent (`normalizeRawVenues`)
**What it does**:
- Groups raw venues by normalized name + approximate location (100m grid)
- Merges data from multiple sources for same venue
- Canonicalizes names (Title Case)
- Normalizes addresses (St → Street, Ave → Avenue)
- Maps categories to primary + subcategories
- Maps price levels to price bands (FREE, LOW, MID, HIGH, LUXE)

**Output**: `NormalizedVenueCandidate[]`

---

#### 7. MatchDedupeAgent (`matchAndDeduplicateVenues`)
**What it does**:
- Fetches existing venues in city from database
- For each candidate:
  - Computes similarity score vs existing venues (name + location + category)
  - Uses Levenshtein distance for fuzzy name matching
  - Uses Haversine formula for geo distance
  - Threshold: 0.85 similarity
- Marks candidates as new or matched to existing

**Output**: `MatchCandidate[]`

**Idempotency**: Running ingestion multiple times will not create duplicates

---

#### 8. WriteGraphAgent (`writeVenueGraph`)
**What it does**:
- Creates new venues in Postgres
- Updates existing venues (merge data, prefer non-null values)
- Creates `VenueSource` entries for each source
- Creates `VenueAlias` entries for alternate names
- Writes to Neo4j knowledge graph:
  - Nodes: `Venue`, `Neighborhood`, `Category`
  - Edges: `(Venue)-[:IN_NEIGHBORHOOD]->(Neighborhood)`, `(Venue)-[:HAS_CATEGORY]->(Category)`

**Graceful degradation**: If Neo4j unavailable, logs warning but continues (Postgres writes still succeed)

---

#### 9. HeatIndexAgent (`computeVenueHeatIndex`)
**What it does**:
- For each venue in city:
  - Event activity score (40% weight): based on number of events
  - Social heat score (30% weight): from `VenueSignal.SOCIAL_HEAT`
  - Rating score (20% weight): from `VenueSignal.RATING`
  - User traffic score (10% weight): from `VenueSignal.USER_TRAFFIC`
- Composite score (0-100)
- Upserts `VenueHeatIndex` table

---

#### 10. QualityCheckAgent (`qualityCheck`)
**What it does**:
- Checks for anomalies:
  - Zero venues from normally working sources
  - Low coordinate coverage (<50%)
  - Too many uncategorized venues (<70%)
  - Significant drop vs previous runs (>50% fewer venues)
- Computes quality scores:
  - Coverage score: % with coordinates
  - Quality score: weighted average of category, coords, website
  - Completeness score: % of sources that returned data

**Output**: Warnings and anomalies logged to `IngestionError`

---

#### 11. LogRunAgent (`createIngestionRun` + `finalizeIngestionRun`)
**What it does**:
- **Start**: Creates `IngestionRun` record with status=RUNNING
- **End**: Updates run with final status, stats, errors

**Status**:
- `SUCCESS`: No errors
- `PARTIAL`: Some errors but pipeline completed
- `FAILED`: Pipeline crashed

---

## Running Ingestion

### Manual Execution

```typescript
import { runCityIngestion } from '@citypass/venue-agent';

// Full ingestion (all sources, all venues)
const result = await runCityIngestion('New York', 'FULL');

// Incremental ingestion (lighter, faster)
const result = await runCityIngestion('New York', 'INCREMENTAL');

console.log(`Created ${result.stats.newVenues} venues`);
console.log(`Updated ${result.stats.updatedVenues} venues`);
```

### Worker Cron Jobs

The worker automatically runs ingestion on a schedule:

**FULL Ingestion** (Weekly):
```typescript
{
  name: 'venue-ingestion-full',
  intervalMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  handler: () => runVenueIngestionForAllCities('FULL'),
}
```

**INCREMENTAL Ingestion** (Hourly):
```typescript
{
  name: 'venue-ingestion-incremental',
  intervalMs: 60 * 60 * 1000, // 1 hour
  handler: () => runVenueIngestionForAllCities('INCREMENTAL'),
}
```

**Configuration**:
```bash
VENUE_INGESTION_CITIES="New York,Los Angeles,San Francisco"
VENUE_INGESTION_FULL_INTERVAL="604800000"  # Weekly
VENUE_INGESTION_INCREMENTAL_INTERVAL="3600000"  # Hourly
```

---

## Adding a New Source Agent

To add a new data source (e.g., Google Places, TripAdvisor, etc.):

### 1. Add Source Type to Schema

```prisma
enum VenueSourceType {
  OSM
  FOURSQUARE
  YELP
  // ... existing types
  GOOGLE_PLACES  // Add new type
}
```

### 2. Create Agent Node

```typescript
// packages/venue-agent/src/nodes/googlePlacesAgent.ts

import type { CityIngestionContext, RawVenue } from '../types';

export async function fetchGooglePlacesVenues(
  context: CityIngestionContext
): Promise<CityIngestionContext> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    console.warn('[GooglePlacesAgent] API key not configured');
    context.stats.googlePlacesVenues = 0;
    return context;
  }

  try {
    // 1. Query Google Places API
    const venues = await fetchFromGooglePlaces(context.city);

    // 2. Convert to RawVenue[]
    const rawVenues: RawVenue[] = venues.map(v => ({
      source: 'GOOGLE_PLACES',
      sourceExternalId: v.place_id,
      sourceUrl: v.url,
      rawPayload: v,
      confidence: 0.95,
      rawName: v.name,
      lat: v.geometry.location.lat,
      lon: v.geometry.location.lng,
      address: v.formatted_address,
      city: context.city.name,
      categories: v.types,
      // ... other fields
    }));

    // 3. Add to context
    if (!context.rawVenues) context.rawVenues = [];
    context.rawVenues.push(...rawVenues);
    context.stats.googlePlacesVenues = rawVenues.length;

    return context;
  } catch (error: any) {
    context.errors.push({
      agentName: 'GooglePlacesAgent',
      source: 'GOOGLE_PLACES',
      message: error.message,
      timestamp: new Date(),
    });
    context.stats.googlePlacesVenues = 0;
    return context;
  }
}
```

### 3. Add to Agent Graph

```typescript
// packages/venue-agent/src/graph.ts

import { fetchGooglePlacesVenues } from './nodes/googlePlacesAgent';

const AGENT_GRAPH: AgentNode[] = [
  createIngestionRun,
  fetchOSMVenues,
  fetchFoursquareVenues,
  fetchYelpVenues,
  fetchEventSiteVenues,
  fetchGooglePlacesVenues,  // Add here
  fetchSocialSignals,
  normalizeRawVenues,
  // ... rest
];
```

### 4. Add Stats Field

```typescript
// packages/venue-agent/src/types.ts

export interface IngestionStats {
  osmVenues: number;
  foursquareVenues: number;
  yelpVenues: number;
  eventSiteVenues: number;
  googlePlacesVenues: number;  // Add here
  // ... rest
}
```

### 5. Update Docs

Add section to this README describing the new agent.

---

## Future Enhancements

### 1. Venue Embeddings & Similarity Search

**Goal**: Enable "find venues like this one" queries

**Approach**:
- Generate embeddings for each venue using:
  - Venue name + description
  - Categories + tags
  - Event history
  - User interaction patterns
- Store in Qdrant vector database
- Use cosine similarity for nearest-neighbor search

**Implementation**:
```typescript
// New agent node
export async function computeVenueEmbeddings(context: CityIngestionContext) {
  for (const venue of venues) {
    const text = `${venue.name} ${venue.description} ${venue.categories.join(' ')}`;
    const embedding = await generateEmbedding(text);  // BGE-M3 or similar

    await qdrant.upsert({
      collection: 'venues',
      points: [{
        id: venue.id,
        vector: embedding,
        payload: { venueId: venue.id, city: venue.city },
      }],
    });
  }
}
```

---

### 2. Better Heat Index with ML

**Goal**: Predict venue popularity more accurately

**Approach**:
- Train ML model on historical data:
  - Features: event count, social signals, category, neighborhood, price, rating
  - Labels: user traffic, event attendance, booking rates
- Use LightGBM or XGBoost for ranking
- Store model in `ModelVersion` table

---

### 3. Social Signal Integration

**Goal**: Real-time venue trending from social media

**Approach**:
- Implement TikTok, Instagram, Snapchat API clients
- Run hourly jobs to fetch location-tagged content
- Store as `VenueSignal` with `signalType=SOCIAL_HEAT`
- Feed into heat index computation

**Challenges**:
- API access and approval
- Rate limits
- Privacy compliance

---

### 4. User Taste Mapping

**Goal**: Personalize recommendations based on venue graph

**Approach**:
- User likes venue → update user taste vector
- Compute similarity between user vector and venue embeddings
- Recommendation query:
  1. Find venues similar to user's liked venues
  2. Boost by heat index
  3. Filter by user preferences (price, category, neighborhood)

---

### 5. Neighborhood Detection

**Goal**: Automatically detect neighborhood from coordinates

**Current**: Stub implementation (returns undefined)

**Options**:
1. Google Geocoding API (commercial)
2. Nominatim (OSM geocoding, free)
3. Pre-computed neighborhood polygons (GeoJSON)
4. ML-based boundary detection

**Implementation**:
```typescript
// packages/venue-agent/src/utils/geo.ts

export async function getNeighborhoodFromCoords(
  lat: number,
  lon: number,
  cityName: string
): Promise<string | undefined> {
  // Option 1: Nominatim
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
  );
  const data = await response.json();
  return data.address.neighbourhood || data.address.suburb;
}
```

---

## Troubleshooting

### "Venue already exists" on repeated runs

**Expected behavior**: Ingestion is idempotent. Running multiple times should not create duplicates.

**Solution**: Check logs for `[MatchDedupeAgent] Matched: X` - this shows deduplication is working.

---

### "OSM returned 0 venues"

**Possible causes**:
1. Overpass API is down (check https://overpass-api.de/)
2. Bounding box is incorrect
3. Query syntax error

**Solution**: Check `IngestionError` table for detailed error message.

---

### "Neo4j write failed"

**Cause**: Neo4j unavailable or credentials incorrect

**Solution**: System gracefully degrades - Postgres writes still succeed. Check:
```bash
NEO4J_URI="neo4j+s://your-aura-instance.neo4j.io"
NEO4J_PASSWORD="your-password"
```

---

### "Foursquare API error: 401"

**Cause**: Invalid API key

**Solution**:
1. Get API key from https://foursquare.com/developers/
2. Set `FOURSQUARE_API_KEY` in `.env`

---

### "Quality check failed: Only 30% of venues have coordinates"

**Cause**: Many venues missing lat/lon

**Solution**: This is a warning. Some sources (e.g., event platforms) may not provide coordinates. Consider:
- Using geocoding API to resolve addresses to coordinates
- Filtering out venues without coordinates in normalization

---

## API Reference

### Main Entry Point

```typescript
runCityIngestion(cityName: string, runType: 'FULL' | 'INCREMENTAL'): Promise<CityIngestionContext>
```

**Parameters**:
- `cityName`: City to ingest (must be in `CITY_CONFIGS`)
- `runType`:
  - `FULL`: Fetch all venues from all sources
  - `INCREMENTAL`: Lighter, faster (fewer results per source)

**Returns**: `CityIngestionContext` with stats and errors

---

### Worker Functions

```typescript
runVenueIngestionForCity(city: string, runType: 'FULL' | 'INCREMENTAL'): Promise<void>
runVenueIngestionForAllCities(runType: 'FULL' | 'INCREMENTAL'): Promise<void>
```

---

### Utility Functions

```typescript
// Name normalization
normalizeName(name: string): string
canonicalizeName(name: string): string

// Matching
calculateMatchScore(venue1: VenueMatchInput, venue2: VenueMatchInput): number
areVenuesMatch(venue1, venue2, threshold = 0.85): { isMatch: boolean; confidence: number }

// Geo
geoDistance(lat1, lon1, lat2, lon2): number  // meters
isGeographicallyClose(lat1, lon1, lat2, lon2, thresholdMeters = 50): boolean
```

---

## Summary

The Venue Knowledge Graph is a **production-ready, agentic ingestion pipeline** that:

✅ Aggregates venues from multiple sources (OSM, Foursquare, Yelp, Events)
✅ Deduplicates intelligently using fuzzy matching
✅ Builds a canonical venue database with rich metadata
✅ Writes to Neo4j knowledge graph for relationship queries
✅ Computes dynamic heat index for venue popularity
✅ Runs automatically on worker cron (weekly FULL, hourly INCREMENTAL)
✅ Degrades gracefully when sources unavailable
✅ Tracks quality metrics and anomalies
✅ Is extensible (easy to add new sources)

**Next steps**: Add social signals, venue embeddings, and integrate with recommendation engine.
