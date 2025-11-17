# CityLens Learning System

## Overview

CityLens is designed as a **self-improving recommendation system** that learns from every user interaction. The system consists of:

1. **Online Agent**: Serves recommendations in real-time (see [Agentic Architecture](./README_AGENTIC_ARCHITECTURE.md))
2. **Event Logger**: Captures all interactions to `event_logs` table
3. **Offline Learner**: Processes logs to update models (cron workers)
4. **Feature Store**: Persists learned parameters (taste vectors, ranker weights, bandit policies)

---

## Learning Loop

```
┌──────────────┐
│ User Interacts│
│ (view, click, │
│  save, hide)  │
└───────┬───────┘
        │
        ▼
┌──────────────────────────────────┐
│  Event Log (DB)                  │
│  ─────────────────────────────── │
│  • QUERY                         │
│  • SLATE_IMPRESSION              │
│  • CARD_VIEW                     │
│  • CLICK_ROUTE / CLICK_BOOK      │
│  • SAVE                          │
│  • HIDE                          │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│  Offline Learner (Cron Workers)  │
│  ─────────────────────────────── │
│  1. Aggregate Logs (15 min)      │
│     → Labels: positive/negative  │
│                                  │
│  2. Update Taste Vectors (15 min)│
│     → EMA of liked events        │
│                                  │
│  3. Update Bandit (1 hour)       │
│     → Policy performance         │
│                                  │
│  4. Train Ranker (24 hours)      │
│     → New model snapshot         │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│  Feature Store (DB Tables)       │
│  ─────────────────────────────── │
│  • taste_vectors                 │
│  • ranker_snapshots              │
│  • slate_policies                │
│  • model_versions                │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│  Online Agent (Next Request)     │
│  → Uses updated models           │
└──────────────────────────────────┘
```

---

## 1. Event Logging

### What Gets Logged

Every user interaction is logged to the `event_logs` table with:

```typescript
{
  userId?: string,      // Authenticated user (null if anon)
  anonId?: string,      // Anonymous session ID
  sessionId: string,    // Browser session
  traceId: string,      // Pipeline trace ID
  eventType: EventLogType,
  payload: object,      // Event-specific data
  createdAt: DateTime   // Timestamp
}
```

### Event Types

| Event Type | Payload | When Logged |
|------------|---------|-------------|
| `QUERY` | `{ freeText, intention, candidateCount, slatePolicy, degradedFlags }` | Every `/api/plan` request |
| `SLATE_IMPRESSION` | `{ slateName, eventIds, scores, positions, strategy }` | For each slate shown (3× per query) |
| `CARD_VIEW` | `{ eventId, position, slateName, viewDuration }` | User expands event card |
| `CLICK_ROUTE` | `{ eventId, position, slateName }` | User clicks directions |
| `CLICK_BOOK` | `{ eventId, position, slateName }` | User clicks booking link |
| `SAVE` | `{ eventId, position, slateName }` | User saves event |
| `HIDE` | `{ eventId, position, slateName, reason? }` | User hides event |
| `REASK` | `{ originalTraceId, refinement }` | User refines query |
| `ERROR` | `{ errorType, message, stack }` | Pipeline failures |

### Implementation

```typescript
import { logEvent } from '@citypass/db/logging';

await logEvent(
  'CARD_VIEW',
  { eventId: 'event_123', position: 2, slateName: 'best' },
  {
    userId: 'user_456',
    sessionId: 'session_789',
    traceId: 'trace_abc',
  }
);
```

**Location**: `packages/agent/src/graph/nodes/log.ts`

---

## 2. Taste Vectors

### What Are Taste Vectors?

A **taste vector** is a dense embedding (768-dim) that represents a user's preferences. It's computed as an **exponential moving average (EMA)** of event embeddings the user has interacted with.

### How It Works

1. **Initialization**: When user first saves/likes an event, their taste vector is initialized to that event's embedding
2. **Updates**: On each new interaction (save/click), the taste vector is updated:
   ```
   new_vector = (1 - α) * current_vector + α * event_embedding
   ```
   where `α` (decay rate) = 0.1

3. **Negative Signals**: When user hides an event, we move *away* from it:
   ```
   new_vector = current_vector - β * event_embedding
   ```
   where `β` = 0.05 (half the positive decay rate)

4. **Normalization**: After each update, the vector is normalized to unit length

### Usage in Ranking

The taste vector is used to compute `tasteMatchScore`:

```typescript
tasteMatchScore = cosineSimilarity(userTasteVector, eventEmbedding)
```

This score (0-1) is a factor in the overall ranking model.

### Cron Job

**Frequency**: Every 15 minutes

**Worker**: `apps/worker/src/learner/update-taste.ts`

```typescript
import { updateTasteVectors } from '@citypass/learner';

await updateTasteVectors(24); // Process last 24 hours of interactions
```

**Steps**:
1. Fetch recent logs where `eventType IN (SAVE, CLICK_BOOK, HIDE)`
2. Group by `userId`
3. For each user, fetch event embeddings (from Qdrant)
4. Update taste vector using EMA
5. Upsert to `taste_vectors` table

### DB Schema

```prisma
model TasteVector {
  id        String   @id
  userId    String   @unique
  vector    Json     // JSON array: [0.1, 0.2, ...]
  dimension Int      @default(768)
  version   String   @default("bge-m3-v1")
  metadata  Json?    // { updateCount, decayRate, ... }
  updatedAt DateTime @updatedAt
  createdAt DateTime @default(now())
}
```

---

## 3. Ranker Training

### Current Approach (v1): Weighted Sum

The ranker uses a **weighted sum** of hand-tuned factors:

```typescript
score = Σ (weight_i × feature_i)
```

**Weights** (see `packages/ranker/src/index.ts`):
```typescript
{
  textual: 0.20,
  semantic: 0.18,
  moodAlignment: 0.16,
  socialHeatScore: 0.12,
  noveltyScore: 0.10,
  // ... 9 factors total
}
```

### Offline Training Loop

**Frequency**: Every 24 hours (daily)

**Worker**: `apps/worker/src/learner/train-ranker.ts`

**Steps**:

1. **Aggregate Logs** (last 30 days):
   - Compute per-event stats: impressions, views, clicks, saves, hides
   - Derive relevance labels:
     - `positive`: saves > 0 or clicks ≥ 2
     - `negative`: hides > 0 or (impressions ≥ 3 and views = 0)
     - `neutral`: everything else

2. **Compute Weight Updates** (v1: correlation-based):
   - Analyze feature correlations with positive/negative labels
   - Adjust weights slightly (±0.02) based on correlations
   - Example: If `avgSaveRate` is high, increase `tasteMatchScore` weight

3. **Create Snapshot**:
   ```typescript
   await createRankerSnapshot(
     modelVersionId,
     updatedWeights,
     { ndcg: 0.78, avgCTR: 0.12 }, // Metrics
     { trainedAt, method: 'correlation_based' }
   );
   ```

4. **Deploy**: Next agent request loads latest snapshot from DB

### Future Approach (v2+): LightGBM

For production-grade learning-to-rank:

1. **Export Training Data**:
   ```typescript
   await exportTrainingDataset('/tmp/training_data.jsonl');
   ```

   Format (JSONL):
   ```json
   {
     "eventId": "event_123",
     "features": {
       "textualSimilarity": 0.82,
       "semanticSimilarity": 0.75,
       "timeFit": 0.90,
       // ... all 9+ features
     },
     "label": 1.0  // Relevance score (0-1)
   }
   ```

2. **Train LightGBM**:
   ```python
   import lightgbm as lgb

   train_data = lgb.Dataset(features, label=labels)
   params = {
       'objective': 'lambdarank',
       'metric': 'ndcg',
       'ndcg_eval_at': [3, 5, 10]
   }

   model = lgb.train(params, train_data, num_boost_round=100)
   model.save_model('ranker_v2.txt')
   ```

3. **Serialize & Upload**: Save model artifact to S3 or local filesystem

4. **Update Ranker**: Modify `packages/ranker/src/index.ts` to load LightGBM model

### DB Schema

```prisma
model RankerSnapshot {
  id             String       @id
  modelVersionId String
  modelVersion   ModelVersion @relation(...)
  weights        Json         // For weighted_sum models
  metricsJson    Json?        // { ndcg, ctr, saveRate, ... }
  trainingStats  Json?        // { trainedAt, method, ... }
  createdAt      DateTime     @default(now())
}

model ModelVersion {
  id        String   @id
  name      String   // "ranker_v1", "ranker_v2_lightgbm"
  type      ModelType // RANKER, BANDIT, LLM, etc.
  version   String   // "1.0.0", "2.0.1"
  config    Json?
  createdAt DateTime @default(now())
}
```

---

## 4. Slate Bandit

### What Is the Slate Bandit?

A **multi-armed bandit** that selects which slate composition policy to use for each user:

- **Policy A** (Balanced): 50/50 safe vs. novel
- **Policy B** (Exploration): 80/20 safe vs. novel
- **Policy C** (Conservative): 90/10 safe vs. novel

The bandit learns which policy performs best by tracking rewards (clicks, saves).

### Algorithm: Epsilon-Greedy

```
With probability ε:
  Explore → Select random policy

With probability 1-ε:
  Exploit → Select policy with highest average reward
```

**Default ε**:
- New users: 0.25 (more exploration)
- Existing users: 0.15

### Reward Function

```typescript
reward = 0.3 * ctr + 0.5 * saveRate - 0.3 * hideRate + 0.2
```

- **CTR** (click-through rate): clicks / impressions
- **Save Rate**: saves / impressions
- **Hide Rate**: hides / impressions

Reward is clamped to [0, 1].

### Cron Job

**Frequency**: Every 1 hour

**Worker**: `apps/worker/src/learner/update-bandit.ts`

**Steps**:

1. **Fetch Logs** (last 24 hours):
   - Group `SLATE_IMPRESSION` events by `slatePolicy.name`
   - Join with `CLICK_*`, `SAVE`, `HIDE` events via `traceId`

2. **Compute Performance**:
   ```typescript
   {
     policyName: "balanced",
     impressions: 1250,
     clicks: 142,
     saves: 48,
     hides: 12,
     ctr: 0.114,
     saveRate: 0.038,
     hideRate: 0.010,
     rewardScore: 0.612
   }
   ```

3. **Update Policies**:
   - Best policy (highest reward) → Set `isActive = true`
   - Other policies → Set `isActive = false`
   - Store performance metrics in `slate_policy.params.performance`

### DB Schema

```prisma
model SlatePolicy {
  id        String   @id
  name      String   @unique
  params    Json     // { explorationBonus, performance: {...} }
  isActive  Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Usage

```typescript
import { choosePolicyForUser } from '@citypass/slate/bandit';

const { policy, policyName, wasExploration } = await choosePolicyForUser(
  userId,
  { sessionId, isNewUser: !userId }
);

// Use `policy` to compose slates
```

---

## 5. Feature Store

### Overview

The **feature store** is a set of DB tables that persist learned parameters:

| Table | Purpose | Update Frequency |
|-------|---------|------------------|
| `taste_vectors` | User preference embeddings | 15 minutes |
| `ranker_snapshots` | Ranker model weights | 24 hours |
| `slate_policies` | Bandit policy params | 1 hour |
| `model_versions` | Model version metadata | On deploy |
| `event_logs` | Raw interaction logs | Real-time |

### Why Not Redis/KV?

We use **Postgres (Supabase)** as the feature store for simplicity:
- Atomic ACID transactions
- JSON columns for flexible schema
- Easy to query for analytics
- Supports pgvector for embeddings (future)

For higher throughput, we could migrate to:
- **Redis** for taste vectors (low-latency reads)
- **S3** for ranker model artifacts
- **BigQuery** for event logs (analytics warehouse)

---

## 6. Aggregation & Labeling

### Labeling Strategy

**Explicit Signals**:
- `SAVE` → **Strong positive** (label = 1.0)
- `CLICK_BOOK` → **Positive** (label = 0.8)
- `HIDE` → **Strong negative** (label = 0.0)

**Implicit Signals**:
- `CARD_VIEW` (> 5s) → **Weak positive** (label = 0.6)
- Impression but no view → **Weak negative** (label = 0.3)
- Multiple impressions, no interaction → **Negative** (label = 0.2)

### Position Bias Correction

Users are more likely to click top-ranked items. We adjust labels:

```typescript
adjustedLabel = rawLabel / (1 + 0.1 * position)
```

Example:
- Event at position 0 (top): label unchanged
- Event at position 5: label reduced by ~33%

### Pairwise Labels

For LightGBM LambdaRank, we need **pairwise preferences**:

```
If event A was saved and event B was hidden:
  → A > B (pairwise label)
```

**Worker**: `apps/worker/src/learner/aggregate-logs.ts`

---

## 7. Cron Schedule

**File**: `apps/worker/src/cron.ts`

| Job Name | Interval | Function | Description |
|----------|----------|----------|-------------|
| `update-taste-vectors` | 15 min | `updateTasteVectors(24)` | Process last 24h of interactions |
| `update-bandit-policies` | 1 hour | `updateBanditPolicies(24)` | Analyze slate policy performance |
| `train-ranker` | 24 hours | `trainRanker()` | Train ranker on last 30 days |

### Deployment

Cron jobs run in the **worker app** (`apps/worker`):

```bash
# Start worker with cron scheduler
pnpm --filter @citypass/worker start
```

To run a job manually:

```typescript
import { runJobByName } from '@citypass/worker/cron';

await runJobByName('train-ranker');
```

---

## 8. Metrics & Evaluation

### Online Metrics (Real-Time)

Tracked via `event_logs`:

| Metric | Formula | Target |
|--------|---------|--------|
| **CTR** (Click-Through Rate) | clicks / impressions | > 10% |
| **Save Rate** | saves / impressions | > 5% |
| **Hide Rate** | hides / impressions | < 2% |
| **Engagement Rate** | (clicks + saves) / impressions | > 12% |

### Offline Metrics (Training)

Evaluated during ranker training:

| Metric | Description | Target |
|--------|-------------|--------|
| **NDCG@10** | Normalized Discounted Cumulative Gain | > 0.75 |
| **MAP** (Mean Average Precision) | Average precision across queries | > 0.65 |
| **MRR** (Mean Reciprocal Rank) | Rank of first relevant item | > 0.70 |

### A/B Testing

To A/B test a new ranker:

1. **Create new model version**:
   ```typescript
   await logModelVersionIfNeeded('ranker_v2', 'RANKER', '2.0.0', {
     method: 'lightgbm',
     modelPath: '/models/ranker_v2.txt',
   });
   ```

2. **Traffic split** (in agent graph):
   ```typescript
   const useV2 = Math.random() < 0.1; // 10% traffic to v2
   const ranker = useV2
     ? await Ranker.fromModelFile('/models/ranker_v2.txt')
     : await Ranker.fromLatestSnapshot();
   ```

3. **Analyze results**:
   ```sql
   SELECT
     payload->>'rankerVersion' AS version,
     COUNT(*) AS queries,
     AVG((clicks + saves * 2.0) / impressions) AS engagement
   FROM event_logs
   WHERE event_type = 'QUERY'
   GROUP BY version;
   ```

---

## 9. Future Roadmap

### Phase 1: Current (Rule-Based + EMA)

- ✅ Taste vectors (EMA)
- ✅ Ranker (weighted sum)
- ✅ Slate bandit (epsilon-greedy)
- ✅ Event logging
- ✅ Cron workers

### Phase 2: Learning-to-Rank (Q1 2026)

- [ ] LightGBM ranker training
- [ ] Position bias correction
- [ ] Pairwise labels (LambdaRank)
- [ ] Offline evaluation (NDCG, MAP)
- [ ] A/B testing framework

### Phase 3: Contextual Bandits (Q2 2026)

- [ ] Thompson Sampling bandit
- [ ] Contextual features (time of day, weather, etc.)
- [ ] Policy gradient methods (reinforcement learning)

### Phase 4: LLM Distillation (Q3 2026)

- [ ] Train small LM (Llama-3-8B) on Claude/GPT outputs
- [ ] Distill intent extraction: GPT-4 → In-house LM
- [ ] Distill answer formatting: Claude → In-house LM
- [ ] Deploy on-prem (cost reduction)

### Phase 5: Real-Time Learning (Q4 2026)

- [ ] Online gradient updates (no batch training)
- [ ] Real-time feature store (Redis)
- [ ] Stream processing (Kafka + Flink)
- [ ] Sub-100ms model updates

---

## 10. Implementation Checklist

### For a New Engineer

If you want to improve the learning system, here's a checklist:

#### Ranker Improvements

- [ ] Add new ranking feature (e.g., `priceVsQualityScore`)
  - Update `RankingFeatures` type
  - Add feature engineering function
  - Add weight to `DEFAULT_WEIGHTS`
  - Update `scoreWithWeightedSum`

- [ ] Train LightGBM model
  - Export training dataset (`exportTrainingDataset`)
  - Train model (Python script)
  - Update `Ranker` to load LightGBM artifact
  - A/B test against weighted sum

#### Taste Vector Improvements

- [ ] Add decay by recency (older interactions matter less)
- [ ] Add category-specific taste vectors (music taste ≠ food taste)
- [ ] Use collaborative filtering (similar users' tastes)

#### Bandit Improvements

- [ ] Implement Thompson Sampling (better exploration)
- [ ] Add contextual features (time of day, device type)
- [ ] Increase policy diversity (5+ policies instead of 2)

#### Logging Improvements

- [ ] Add `SHARE` event type
- [ ] Track view duration (dwell time)
- [ ] Log user location (for distance calculations)
- [ ] Add `REASK` logging (query refinement)

---

## 11. Common Pitfalls

### ❌ Don't: Train on all interactions equally

Not all interactions are equal:
- A save is worth more than a view
- A hide is a strong negative signal
- Position bias matters (top items get more clicks)

**Solution**: Use weighted labels and position bias correction.

---

### ❌ Don't: Update models too frequently

Updating every minute causes:
- Model instability (weights oscillate)
- Overfitting to recent noise
- High compute cost

**Solution**: Update taste vectors every 15 min, ranker every 24 hours.

---

### ❌ Don't: Ignore cold start

New users have no taste vector, no interaction history.

**Solution**:
- Use global popularity as fallback
- Higher exploration rate (ε = 0.25)
- Collaborative filtering (similar users)

---

### ❌ Don't: Log everything synchronously

Logging to DB on every request adds latency.

**Solution**:
- Async logging (fire-and-forget)
- Batch writes (log node uses `batchLogEvents`)
- Fail-soft (don't block response if log fails)

---

## 12. Questions?

- **"How long until the ranker learns my preferences?"**
  → Taste vector updates every 15 minutes. Ranker retrains daily. So ~24 hours for full personalization.

- **"Can I manually adjust ranking weights?"**
  → Yes, create a new `RankerSnapshot` with custom weights and it will be loaded on next request.

- **"How do I debug why an event ranked low?"**
  → Check `result.state.rankedCandidates[i].factorContributions` to see which factors scored poorly.

- **"How much data is needed for LightGBM training?"**
  → Minimum ~1000 positive examples (saves/clicks). More is better. We recommend 10K+ examples.

- **"Can I use a different embedding model?"**
  → Yes, update `embeddingVersion` in taste vector config. But you'll need to re-embed all events.

---

## Related Docs

- [Agentic Architecture](./README_AGENTIC_ARCHITECTURE.md) – How the agent graph works
- [Ranker Package](../packages/ranker/README.md) – Ranking model details (TODO)
- [Slate Package](../packages/slate/README.md) – Slate composition & bandit (TODO)
- [Worker Jobs](../apps/worker/README.md) – Cron scheduler details (TODO)

---

**Last Updated**: 2025-11-17
