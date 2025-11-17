# Implementation TODOs

This document tracks remaining work to complete the agentic learning system implementation.

## 🔴 CRITICAL - Breaking Changes

### 1. Type Mismatch: SlateItem vs RankedItem

**Issue**: The new agent graph returns `Slate` objects with `SlateItem[]`, but the UI expects `RankedItem[]` directly.

**Current Structure**:
```typescript
// Old system (works with UI)
{
  slates: {
    best: RankedItem[],        // Array directly
    wildcard: RankedItem[],
    closeAndEasy: RankedItem[]
  }
}

// New system (breaking)
{
  slates: {
    best: Slate,               // Object with events property!
    wildcard: Slate,
    closeAndEasy: Slate
  }
}

// Where Slate = { name, label, events: SlateItem[], strategy, diversity }
```

**Field Mismatches**:
- `SlateItem.eventId` ≠ `RankedItem.id`
- `SlateItem.score` ≠ `RankedItem.fitScore`
- Missing in SlateItem: `subtitle`, `description`, `neighborhood`, `moodScore`, `socialHeat`, `fitScore`, `endTime`

**Fix Options**:

**Option A (Recommended)**: Add adapter in `/api/plan` route
```typescript
// apps/web/src/app/api/plan/route.ts
function slateToRankedItems(slate: Slate): RankedItem[] {
  return slate.events.map(item => ({
    id: item.eventId,
    title: item.title,
    venueName: item.venueName,
    city: item.city,
    startTime: item.startTime,
    priceMin: item.priceMin,
    priceMax: item.priceMax,
    imageUrl: item.imageUrl,
    bookingUrl: item.bookingUrl,
    category: item.category,
    fitScore: item.score,
    moodScore: null,
    socialHeat: null,
    reasons: item.reasons,
    sponsored: false,
    // Add missing fields with null/defaults
    subtitle: null,
    description: null,
    neighborhood: null,
    endTime: null,
    distanceKm: null,
  }));
}

// In response:
return NextResponse.json({
  slates: {
    best: slateToRankedItems(result.state.slates.best),
    wildcard: slateToRankedItems(result.state.slates.wildcard),
    closeAndEasy: slateToRankedItems(result.state.slates.closeAndEasy),
  },
  // ... rest
});
```

**Option B**: Update SlateItem type to extend RankedItem
- More invasive
- Would require updating all slate composition logic

**Status**: ❌ Not implemented
**Priority**: P0 - Blocks deployment
**Estimated Time**: 30 minutes

---

### 2. Missing Event Details in SlateItem

**Issue**: SlateItem lacks several fields needed for rich UI rendering:
- `description` (for card previews)
- `subtitle` (event tagline)
- `endTime` (event duration)
- `neighborhood` (for location context)
- `distanceKm` (for "X km away" badge)

**Current Flow**:
```
CandidateEvent (has description)
  → EnrichedEvent (has description, distanceKm)
  → ScoredEvent (loses description!)
  → SlateItem (no description)
```

**Fix**: Update `toSlateItem` in `packages/agent/src/graph/nodes/compose.ts`

```typescript
const enriched = state.enrichedCandidates!.find(e => e.id === scored.eventId)!;

return {
  eventId: scored.eventId,
  // ... existing fields

  // Add missing fields from enriched
  description: enriched.description,
  subtitle: enriched.subtitle || null,
  endTime: enriched.endTime?.toISOString() || null,
  neighborhood: enriched.neighborhood || null,
  distanceKm: enriched.distanceKm,
};
```

**Status**: ❌ Not implemented
**Priority**: P1 - Degrades UX
**Estimated Time**: 15 minutes

---

## 🟡 HIGH PRIORITY - Missing Features

### 3. Event Embedding Fetch for Taste Matching

**Issue**: Taste matching score is always 0.5 (default) because we don't fetch event embeddings.

**Location**: `packages/agent/src/graph/nodes/enrich.ts:60-64`

**Current Code**:
```typescript
// TODO: Fetch event embedding from Qdrant for taste matching
const eventEmbedding = null;
const tasteMatchScore = tasteVector && eventEmbedding
  ? calculateTasteSimilarity(tasteVector, eventEmbedding)
  : 0.5;
```

**Fix**: Integrate with Qdrant client
```typescript
import { qdrant } from '@citypass/rag'; // or wherever Qdrant client lives

// Fetch embeddings for all candidates
const qdrantIds = state.candidates
  .map(c => c.qdrantId) // Assuming candidates have qdrantId
  .filter(Boolean);

const embeddings = await qdrant.retrieve(qdrantIds);
const embeddingMap = new Map(embeddings.map(e => [e.id, e.vector]));

// In candidate mapping:
const eventEmbedding = embeddingMap.get(candidate.qdrantId);
const tasteMatchScore = tasteVector && eventEmbedding
  ? calculateTasteSimilarity(tasteVector, eventEmbedding)
  : 0.5;
```

**Blocker**: Need to expose Qdrant client or add retrieval method to RAG package.

**Status**: ❌ Not implemented
**Priority**: P1 - Personalization doesn't work
**Estimated Time**: 1 hour

---

### 4. Distance Calculation (Geocoding)

**Issue**: Distance is random (mock data) because we don't calculate actual distance.

**Location**: `packages/agent/src/graph/nodes/enrich.ts:57-58`

**Current Code**:
```typescript
// TODO: Calculate actual distance using geocoding
const distanceKm = candidate.lat && candidate.lon ? Math.random() * 10 : null;
```

**Fix**: Use geocoding service or calculate haversine distance
```typescript
import { calculateDistance } from '@citypass/utils'; // Haversine function

const userLocation = await getUserLocation(state.userId, state.sessionId);

const distanceKm = candidate.lat && candidate.lon && userLocation
  ? calculateDistance(
      userLocation.lat, userLocation.lon,
      candidate.lat, candidate.lon
    )
  : null;
```

**Dependencies**:
- Need to store/infer user location (IP lookup, saved preference, or explicit input)
- Add haversine distance calculation utility

**Status**: ❌ Not implemented
**Priority**: P1 - "Close & Easy" slate is inaccurate
**Estimated Time**: 2 hours (including location inference)

---

### 5. LLM-Generated AI Summary

**Issue**: AI summary uses template, not actual LLM generation.

**Location**: `packages/agent/src/graph/nodes/format.ts:59-92`

**Current Code**:
```typescript
// TODO: Generate AI summary using LLM (optional, for chat responses)
let aiSummary: string | undefined;

if (state.freeText && !state.degradedFlags?.noLLM) {
  // This would call an LLM to generate a natural language summary
  // For now, generate a simple template-based summary
  aiSummary = generateTemplateSummary(state);
}
```

**Fix**: Call LLM (Claude/GPT) with slate context
```typescript
import { generateSummary } from '@citypass/llm';

if (state.freeText && !state.degradedFlags?.noLLM) {
  aiSummary = await generateSummary({
    query: state.freeText,
    slates: state.slates,
    intention: state.intention,
  });
}
```

**Status**: ❌ Not implemented
**Priority**: P2 - Nice-to-have for chat UX
**Estimated Time**: 1 hour

---

## 🟢 MEDIUM PRIORITY - Production Readiness

### 6. Event Embedding Fetch in Taste Vector Updates

**Issue**: Worker can't update taste vectors because it can't fetch embeddings.

**Location**: `apps/worker/src/learner/update-taste.ts:110-125`

**Current Code**:
```typescript
async function fetchEventEmbeddings(eventIds: string[]): Promise<number[][]> {
  if (eventIds.length === 0) return [];

  try {
    // TODO: Fetch from Qdrant or cached embeddings
    console.log(`[fetch-embeddings] Would fetch ${eventIds.length} embeddings from Qdrant`);
    return [];
  } catch (error) {
    console.error('[fetch-embeddings] Failed to fetch embeddings:', error);
    return [];
  }
}
```

**Fix**: Query EventVector table + Qdrant
```typescript
async function fetchEventEmbeddings(eventIds: string[]): Promise<number[][]> {
  if (eventIds.length === 0) return [];

  try {
    // 1. Get qdrantIds from EventVector table
    const eventVectors = await prisma.eventVector.findMany({
      where: { eventId: { in: eventIds } },
      select: { qdrantId: true, eventId: true },
    });

    // 2. Fetch vectors from Qdrant
    const qdrantIds = eventVectors.map(ev => ev.qdrantId);
    const vectors = await qdrant.retrieve(qdrantIds);

    return vectors.map(v => v.vector);
  } catch (error) {
    console.error('[fetch-embeddings] Failed:', error);
    return [];
  }
}
```

**Status**: ❌ Not implemented
**Priority**: P1 - Taste learning doesn't work
**Estimated Time**: 1 hour

---

### 7. Training Dataset Export

**Issue**: Training data export is not implemented (needed for LightGBM training).

**Location**: `apps/worker/src/learner/train-ranker.ts:148-156`

**Current Code**:
```typescript
export async function exportTrainingDataset(outputPath: string): Promise<void> {
  try {
    console.log('📝 [export-dataset] Exporting training dataset...');

    // TODO: For production
    // 1. Join aggregated with Event table to get features
    // 2. Compute ranking features for each event
    // 3. Write JSONL with schema: { eventId, features: {...}, label: 0-1 }
    // 4. Upload to S3 or local filesystem
  } catch (error) {
    console.error('[export-dataset] Export failed:', error);
  }
}
```

**Fix**: Implement full export pipeline
```typescript
export async function exportTrainingDataset(outputPath: string): Promise<void> {
  const aggregated = await aggregateEventLogs(/* last 30 days */);

  // Join with events and compute features
  const trainingExamples = [];
  for (const agg of aggregated) {
    const event = await prisma.event.findUnique({ where: { id: agg.eventId } });
    if (!event) continue;

    const features = {
      textualSimilarity: 0, // Would need to recompute from query
      semanticSimilarity: 0,
      // ... compute all 9+ features
    };

    trainingExamples.push({
      eventId: agg.eventId,
      features,
      label: agg.relevanceScore,
      impressions: agg.impressions,
      clicks: agg.clicks,
      saves: agg.saves,
    });
  }

  // Write JSONL
  const jsonl = trainingExamples.map(e => JSON.stringify(e)).join('\n');
  await fs.writeFile(outputPath, jsonl);
}
```

**Status**: ❌ Not implemented
**Priority**: P2 - Needed for Phase 2 (LightGBM)
**Estimated Time**: 3 hours

---

### 8. Logging Failure Fallback Queue

**Issue**: If logging fails, events are lost (no retry mechanism).

**Location**: `packages/db/src/logging.ts:50`

**Current Code**:
```typescript
} catch (error) {
  console.error('[logEvent] Failed to log event to DB:', error);
  console.log('[logEvent] Event details:', { eventType, traceId, payload });
  // TODO: Consider implementing a fallback queue or retry mechanism
}
```

**Fix**: Add in-memory queue with periodic flush
```typescript
const failedLogs: LogEventOptions[] = [];

async function logEvent(...) {
  try {
    await prisma.eventLog.create({ ... });
  } catch (error) {
    console.error('[logEvent] Failed, queueing for retry');
    failedLogs.push({ eventType, payload, context });

    // Retry queue later
    if (failedLogs.length >= 100) {
      retryFailedLogs();
    }
  }
}

async function retryFailedLogs() {
  const batch = failedLogs.splice(0, 100);
  try {
    await batchLogEvents(batch);
  } catch (error) {
    // Re-queue or drop
  }
}
```

**Status**: ❌ Not implemented
**Priority**: P2 - Data loss risk
**Estimated Time**: 2 hours

---

## 🔵 LOW PRIORITY - Enhancements

### 9. User Feature Derivation from Interactions

**Issue**: `getUserFeatures` doesn't actually derive features from interaction history.

**Location**: `packages/taste/src/index.ts:251-252`

**Current Code**:
```typescript
// TODO: Derive features from interactions
// This would involve joining with Event table to get prices, categories, etc.
```

**Fix**: Query user interactions and compute behavioral features
```typescript
// Fetch user interactions with event details
const interactions = await prisma.userInteraction.findMany({
  where: { userId, saved: true },
  include: { event: true },
  orderBy: { createdAt: 'desc' },
  take: 50,
});

// Derive features
const prices = interactions.map(i => i.event.priceMin).filter(Boolean);
const categories = interactions.map(i => i.event.category).filter(Boolean);

features.averageBudget = prices.reduce((a, b) => a + b, 0) / prices.length;
features.favoriteCategories = [...new Set(categories)].slice(0, 3);
```

**Status**: ❌ Not implemented
**Priority**: P3 - Improved personalization
**Estimated Time**: 2 hours

---

### 10. ML Model Scoring (LightGBM/XGBoost)

**Issue**: Ranker only supports weighted sum, not ML models.

**Location**: `packages/ranker/src/index.ts:143-145`

**Current Code**:
```typescript
if (this.config.modelType === 'weighted_sum') {
  return this.scoreWithWeightedSum(features);
} else {
  // TODO: Implement ML model scoring
  throw new Error(`Model type ${this.config.modelType} not yet implemented`);
}
```

**Fix**: Load and execute LightGBM model
```typescript
import * as lgb from 'lightgbm';

if (this.config.modelType === 'ml_model') {
  const model = await lgb.loadModel(this.config.modelPath!);
  const featureVector = this.featuresToVector(features);
  const score = model.predict(featureVector);

  return {
    eventId: features.eventId,
    score,
    factorContributions: {}, // Can extract from SHAP values
    features,
  };
}
```

**Blocker**: Need Node.js LightGBM bindings (or Python subprocess).

**Status**: ❌ Not implemented
**Priority**: P3 - Phase 2 feature
**Estimated Time**: 1 day (including model serialization pipeline)

---

## 📋 Testing & Validation TODOs

### 11. End-to-End Integration Test

**Task**: Verify full pipeline from API → Graph → DB → Response

**Test Cases**:
- ✅ `/api/plan` returns slates
- ❌ Slates have correct RankedItem structure (blocked by TODO #1)
- ❌ event_logs table receives entries
- ❌ Taste vector updates after save
- ❌ Ranker loads weights from DB
- ❌ Bandit selects policy

**Priority**: P0 - Must validate before deploy
**Estimated Time**: 2 hours

---

### 12. Run Prisma Migration

**Task**: Ensure all new tables exist in DB

**Commands**:
```bash
# Generate Prisma client
pnpm --filter @citypass/db generate

# Apply migrations (if schema changed)
pnpm --filter @citypass/db migrate:deploy

# Or create new migration
pnpm --filter @citypass/db migrate:dev --name add_learning_system
```

**Status**: ❓ Unknown if schema was already migrated
**Priority**: P0 - Blocks all DB operations
**Estimated Time**: 10 minutes

---

### 13. Worker Cron Job Verification

**Task**: Ensure workers run without errors

**Steps**:
1. Start worker: `pnpm --filter @citypass/worker start`
2. Check logs for:
   - ✅ Cron jobs scheduled
   - ❌ update-taste-vectors completes (blocked by TODO #6)
   - ❌ update-bandit-policies runs
   - ❌ train-ranker runs

**Priority**: P1 - Learning loop doesn't work
**Estimated Time**: 1 hour

---

## 📊 Monitoring & Observability TODOs

### 14. Add Metrics Dashboard

**Task**: Create admin page to view:
- Event log counts by type
- Ranker model performance (NDCG, CTR)
- Slate policy performance
- Taste vector update stats

**Location**: Create `apps/web/src/app/admin/learning/page.tsx`

**Priority**: P2 - Needed to monitor learning
**Estimated Time**: 4 hours

---

### 15. Alert on Degraded Services

**Task**: Send alerts when `degradedFlags` are set

**Example**:
```typescript
if (state.degradedFlags?.noQdrant) {
  await sendAlert('Qdrant is down - vector search degraded');
}
```

**Priority**: P2 - Ops visibility
**Estimated Time**: 2 hours

---

## 🔧 Refactoring TODOs

### 16. Deduplicate Old LangGraph Implementation

**Issue**: Two agent implementations exist:
- `packages/agent/src/langgraph/index.ts` (old)
- `packages/agent/src/graph/index.ts` (new)

**Decision Needed**:
- Keep both for backwards compatibility?
- Deprecate old and migrate all callers?

**Recommended**: Keep both short-term, add deprecation warning, migrate in Q1 2026.

**Priority**: P3 - Tech debt
**Estimated Time**: 1 day (if migrating all callers)

---

## 📝 Documentation TODOs

### 17. Add Package-Level READMEs

**Missing READMEs**:
- `packages/ranker/README.md` - Ranking model deep dive
- `packages/slate/README.md` - Slate composition & bandit
- `packages/taste/README.md` - Taste vector details
- `apps/worker/README.md` - Cron job details

**Priority**: P3 - Developer onboarding
**Estimated Time**: 3 hours

---

### 18. Add Runbook for Common Operations

**Topics**:
- How to manually trigger ranker training
- How to roll back to previous ranker snapshot
- How to debug why an event ranked low
- How to A/B test a new ranker

**Location**: `docs/RUNBOOK.md`

**Priority**: P3 - Ops documentation
**Estimated Time**: 2 hours

---

## 🎯 Summary

### P0 - Blocking Deployment (Must Fix Now)
1. ❌ Type mismatch: SlateItem vs RankedItem (30 min)
2. ❌ Run Prisma migration (10 min)
3. ❌ End-to-end integration test (2 hours)

**Total Estimate: 3-4 hours**

### P1 - High Priority (Fix This Week)
4. ❌ Missing event details in SlateItem (15 min)
5. ❌ Event embedding fetch for taste matching (1 hour)
6. ❌ Distance calculation (2 hours)
7. ❌ Worker embedding fetch (1 hour)
8. ❌ Worker cron verification (1 hour)

**Total Estimate: 5-6 hours**

### P2 - Medium Priority (Fix This Month)
9. ❌ LLM-generated AI summary (1 hour)
10. ❌ Training dataset export (3 hours)
11. ❌ Logging failure queue (2 hours)
12. ❌ Metrics dashboard (4 hours)
13. ❌ Degraded service alerts (2 hours)

**Total Estimate: 12 hours**

### P3 - Low Priority (Nice to Have)
14. ❌ User feature derivation (2 hours)
15. ❌ ML model scoring (1 day)
16. ❌ Deduplicate LangGraph (1 day)
17. ❌ Package READMEs (3 hours)
18. ❌ Operations runbook (2 hours)

**Total Estimate: 3-4 days**

---

**Grand Total**: ~1-2 weeks to production-ready state (P0 + P1 + P2)

**Next Steps**:
1. Fix P0 issues (type adapter)
2. Run integration test
3. Deploy to staging
4. Monitor for 24 hours
5. Fix P1 issues based on real usage
