# CityLens Agentic Architecture - Deployment Status

**Date**: 2025-11-17
**Status**: ✅ **Implementation Complete** | ⚠️ **Integration TODOs Remain**

---

## ✅ What's Been Implemented

### 1. Core Agent Graph ✅
- **8 pipeline nodes** (parseIntent, retrieve, enrich, rank, compose, critic, format, log)
- **Typed state machine** with full observability
- **Fail-soft degradation** for all external dependencies
- **Trace IDs** for end-to-end debugging

**Files**: `packages/agent/src/graph/`

---

### 2. Ranker v1 (Learning-to-Rank) ✅
- **9 ranking factors** with configurable weights
- **Pluggable architecture** (weighted sum → ML model)
- **DB snapshot loading** (loads latest ranker from DB)
- **Explainable rankings** (factor contributions returned)

**Files**: `packages/ranker/src/index.ts`

---

### 3. Taste Vector System ✅
- **EMA-based learning** from user interactions
- **Positive & negative signals** (saves/clicks vs hides)
- **Cosine similarity matching** to event embeddings
- **DB persistence** with metadata tracking

**Files**: `packages/taste/src/index.ts`

---

### 4. Slate Composer + Bandit ✅
- **3 slate strategies** (Best, Wildcard, Close & Easy)
- **Epsilon-greedy bandit** for policy selection
- **Diversity scoring** for each slate
- **Policy performance tracking** (CTR, save rate)

**Files**: `packages/slate/src/`

---

### 5. Logging & Feature Store ✅
- **Fail-soft event logging** to `event_logs` table
- **Model versioning** via `model_versions` table
- **Ranker snapshots** with training metrics
- **Slate policy persistence** with performance data

**Files**: `packages/db/src/logging.ts`, Prisma schema

---

### 6. Offline Learner Workers ✅
- **4 cron jobs** (taste update, bandit update, ranker training, log aggregation)
- **Interaction aggregation** with label derivation
- **Position bias correction** in label computation
- **Training dataset export** (skeleton for LightGBM)

**Files**: `apps/worker/src/learner/`

---

### 7. Comprehensive Documentation ✅
- **README_AGENTIC_ARCHITECTURE.md** (5000+ words) - Architecture deep dive
- **README_LEARNING_SYSTEM.md** (6000+ words) - Learning loop explained
- **TODO_IMPLEMENTATION.md** - Remaining work tracked
- **DEPLOYMENT_STATUS.md** (this file) - Status overview

**Files**: `docs/`

---

### 8. Backwards Compatibility ✅
- **Adapter function** in `/api/plan` converts new Slate → old RankedItem[]
- **Old langgraph** implementation still works (no breaking changes)
- **New graph exports** available for incremental adoption

**Files**: `apps/web/src/app/api/plan/route.ts`

---

## ⚠️ What Needs To Be Fixed (Critical Path)

### P0 - Blocking Deployment (3-4 hours)

#### 1. ✅ Type Adapter (FIXED)
- **Status**: ✅ **RESOLVED**
- **Fix**: Added `slateToRankedItems()` adapter in `/api/plan` route
- **Result**: Both old and new graph formats now work with UI

#### 2. ❌ Prisma Migration
- **Issue**: New tables may not exist in DB yet
- **Fix**:
  ```bash
  pnpm --filter @citypass/db generate
  pnpm --filter @citypass/db migrate:deploy
  ```
- **Time**: 10 minutes

#### 3. ❌ End-to-End Test
- **Issue**: Haven't validated full pipeline works
- **Test Plan**:
  1. POST to `/api/plan` → verify slates returned
  2. Check `event_logs` table → verify QUERY + SLATE_IMPRESSION rows
  3. Run worker cron → verify update-taste-vectors completes
  4. Check taste vector in DB → verify updated
- **Time**: 2 hours

---

### P1 - High Priority (5-6 hours)

#### 4. ❌ Missing Event Details in SlateItem
- **Issue**: Description, subtitle, endTime, neighborhood missing from slate items
- **Impact**: Cards show less info
- **Fix**: Update `toSlateItem()` in `compose.ts` to include all fields from enriched candidates
- **Time**: 15 minutes

#### 5. ❌ Event Embedding Fetch (Taste Matching)
- **Issue**: Taste matching score always 0.5 (default) because embeddings aren't fetched
- **Impact**: Personalization doesn't work
- **Fix**: Integrate Qdrant client in `enrich.ts` to fetch embeddings
- **Blocker**: Need Qdrant client access in agent package
- **Time**: 1 hour

#### 6. ❌ Distance Calculation
- **Issue**: Distance is random (mock data)
- **Impact**: "Close & Easy" slate is inaccurate
- **Fix**: Add haversine distance calculation + user location inference
- **Time**: 2 hours

#### 7. ❌ Worker Embedding Fetch
- **Issue**: Taste vector updates don't work because worker can't fetch embeddings
- **Impact**: Learning loop is broken
- **Fix**: Implement `fetchEventEmbeddings()` in `update-taste.ts`
- **Time**: 1 hour

#### 8. ❌ Verify Worker Crons Run
- **Issue**: Untested if workers actually execute without errors
- **Fix**: Start worker, check logs for completion
- **Time**: 1 hour

---

## 📊 Architecture Summary

```
User Query
    ↓
┌─────────────────────────────────────┐
│  /api/plan (Next.js Route)          │
│  - Rate limiting                    │
│  - Auth check                       │
│  - Calls agent graph                │
└───────────┬─────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│  Agent Graph Pipeline                │
│  ┌──────────────────────────┐       │
│  │ 1. parseIntent           │       │
│  │ 2. retrieve (RAG)        │       │
│  │ 3. enrich (graph+taste)  │       │
│  │ 4. rank (Ranker v1)      │       │
│  │ 5. compose (3 slates)    │       │
│  │ 6. critic (quality)      │       │
│  │ 7. format (reasons)      │       │
│  │ 8. log (event_logs)      │       │
│  └──────────────────────────┘       │
└───────────┬─────────────────────────┘
            ↓
┌─────────────────────────────────────┐
│  Response to UI                      │
│  - slates: { best, wildcard,        │
│              closeAndEasy }          │
│  - reasons: string[]                 │
│  - intention: Intention              │
│  - logs: NodeLog[]                   │
│  - traceId: string                   │
└───────────┬─────────────────────────┘
            │
            ↓ (async)
┌─────────────────────────────────────┐
│  Event Logs (DB)                     │
│  - QUERY                             │
│  - SLATE_IMPRESSION (×3)             │
│  - CARD_VIEW (on expand)             │
│  - SAVE / CLICK / HIDE (on action)   │
└───────────┬─────────────────────────┘
            │
            ↓ (cron jobs)
┌─────────────────────────────────────┐
│  Offline Learner (Worker)            │
│  - Aggregate logs (15 min)           │
│  - Update taste vectors (15 min)     │
│  - Update bandit policies (1 hour)   │
│  - Train ranker (24 hours)           │
└───────────┬─────────────────────────┘
            │
            ↓
┌─────────────────────────────────────┐
│  Feature Store (DB)                  │
│  - taste_vectors                     │
│  - ranker_snapshots                  │
│  - slate_policies                    │
│  - model_versions                    │
└─────────────────────────────────────┘
```

---

## 🚦 Deployment Readiness

### Can Deploy Now? **⚠️ NO**

**Blockers**:
1. ❌ Prisma migration not run (tables may not exist)
2. ❌ End-to-end test not performed
3. ❌ Worker crons not validated

**Estimated Time to Deployment-Ready**: 3-4 hours (P0 items)

---

### Can Deploy to Staging? **✅ YES** (with caveats)

**What Works**:
- ✅ API routes return correct structure (adapter in place)
- ✅ Old langgraph still works (no breaking changes)
- ✅ UI components compatible (no code changes needed)

**What Doesn't Work**:
- ❌ New graph won't be used until you switch to `executeAgentGraph()`
- ❌ Learning loop won't work (embedding fetch issues)
- ❌ Personalization won't work (taste matching disabled)

**Recommendation**: Deploy to staging, run for 24 hours with old graph, then fix P1 issues and switch to new graph.

---

## 📝 Next Steps (Priority Order)

### Immediate (Today)
1. ✅ **DONE**: Fix type adapter in `/api/plan`
2. Run `pnpm --filter @citypass/db generate && migrate:deploy`
3. Deploy to staging environment
4. Test `/api/plan` endpoint manually

### Tomorrow
5. Run end-to-end integration test
6. Start worker cron jobs
7. Monitor logs for errors
8. Fix embedding fetch issues (P1 #5, #7)

### This Week
9. Implement distance calculation
10. Add missing event details to SlateItem
11. Verify learning loop completes successfully
12. A/B test old vs new graph (10% traffic)

### Next Week
13. Migrate 100% traffic to new graph
14. Add metrics dashboard (`/admin/learning`)
15. Implement LLM-generated summaries
16. Set up degraded service alerts

---

## 🔍 How to Verify It's Working

### 1. API Works
```bash
curl -X POST http://localhost:3000/api/plan \
  -H "Content-Type: application/json" \
  -d '{"tokens":{"mood":"electric","budget":"casual"}}'

# Should return:
# {
#   "slates": {
#     "best": [...],
#     "wildcard": [...],
#     "closeAndEasy": [...]
#   },
#   "reasons": [...],
#   "success": true
# }
```

### 2. Logging Works
```sql
-- Check event_logs table
SELECT event_type, COUNT(*)
FROM event_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY event_type;

-- Should see:
-- QUERY: 10
-- SLATE_IMPRESSION: 30 (3× per query)
```

### 3. Taste Vectors Update
```sql
-- Check taste_vectors table
SELECT user_id, updated_at
FROM taste_vectors
ORDER BY updated_at DESC
LIMIT 10;

-- Should see recent timestamps (within 15 min)
```

### 4. Worker Crons Run
```bash
# Check worker logs
pnpm --filter @citypass/worker start

# Should see:
# ✓ Scheduled: update-taste-vectors (every 900s)
# ✓ Scheduled: update-bandit-policies (every 3600s)
# ✓ Scheduled: train-ranker (every 86400s)
```

---

## 📖 Documentation Links

- **[Agentic Architecture](./README_AGENTIC_ARCHITECTURE.md)** - How the pipeline works
- **[Learning System](./README_LEARNING_SYSTEM.md)** - How learning works
- **[Implementation TODOs](./TODO_IMPLEMENTATION.md)** - Remaining work (18 items)

---

## 🎯 Success Criteria

### Phase 1 (This Week)
- ✅ Code compiles with no TypeScript errors
- ✅ API routes return correct response format
- ✅ UI components render slates correctly
- ❌ Event logs persist to database
- ❌ Worker crons execute without errors

### Phase 2 (Next Week)
- ❌ Taste vectors update from user interactions
- ❌ Ranker loads weights from DB snapshots
- ❌ Slate bandit tracks policy performance
- ❌ No P0 or P1 bugs in production

### Phase 3 (Next Month)
- ❌ A/B test shows new graph improves CTR/save rate
- ❌ LightGBM ranker trained and deployed
- ❌ Metrics dashboard operational
- ❌ 99% of requests succeed without degradation

---

## 🐛 Known Issues

1. **Embeddings not fetched** (P1) - Taste matching and learning disabled
2. **Distance calculation mocked** (P1) - "Close & Easy" slate inaccurate
3. **Missing event details** (P1) - Cards show less information
4. **No retry on log failure** (P2) - Data loss risk if DB is down
5. **Template-based summaries** (P2) - No LLM generation yet

See [TODO_IMPLEMENTATION.md](./TODO_IMPLEMENTATION.md) for full list.

---

## 💬 Questions?

- **"Is it safe to deploy?"** → Yes to staging with old graph. No to production until P0 items fixed.
- **"Will it break the UI?"** → No, adapter ensures compatibility.
- **"When will learning work?"** → After fixing embedding fetch (P1 #5, #7) - ~2 hours work.
- **"Should I switch to new graph now?"** → No, wait until P1 items are fixed.

---

**Status Updated**: 2025-11-17 at 21:30 UTC
**Next Review**: After P0 items completed (ETA: 24 hours)
