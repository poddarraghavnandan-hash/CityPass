# CityLens Agentic Architecture

## Overview

CityLens uses an **agentic graph pipeline** to transform user queries into personalized event recommendations. The system is designed to be modular, observable, and self-improving.

### Key Principles

1. **Typed State Machine**: Each node in the pipeline receives and returns typed state updates
2. **Fail-Soft Design**: Nodes can degrade gracefully when dependencies (LLM, Qdrant, Neo4j) are unavailable
3. **Observable Execution**: Every pipeline run logs node execution times, success/failure, and trace IDs
4. **Learning Loop**: All interactions are logged to `event_logs` for offline learning

---

## Pipeline Overview

```
┌─────────────┐
│  Free Text  │ or │ Tokens │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ parseIntent     │ Extract intention from text
│                 │ (LLM → Pattern → Defaults)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ retrieve        │ Hybrid RAG (keyword + vector)
│                 │ Typesense + Qdrant
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ enrich          │ Add context:
│                 │ - Graph signals (novelty, social)
│                 │ - Taste matching
│                 │ - Geo/time features
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ rank            │ Score events using Ranker v1
│                 │ (weighted sum → ML model)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ compose         │ Create 3 slates:
│                 │ - Best (top scores)
│                 │ - Wildcard (high novelty)
│                 │ - Close & Easy (accessible)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ critic          │ Quality checks & warnings
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ format          │ Generate reasons & AI summary
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ log             │ Persist to event_log
│                 │ (query + slate impressions)
└─────────────────┘
```

---

## Nodes Reference

### 1. parseIntent

**Location**: `packages/agent/src/graph/nodes/parseIntent.ts`

**Purpose**: Extract structured intention from free text or token overrides

**Dependencies**:
- `@citypass/utils` → `extractIntentWithFallback` (LLM/pattern extraction)
- `@citypass/utils` → `buildIntention` (merge tokens into Intention)

**Inputs**:
- `state.freeText?: string` – User's natural language query
- `state.tokens?: Partial<IntentionTokens>` – Optional token overrides

**Outputs**:
- `intention: Intention` – Fully-formed intention with city, time window, budget, mood, etc.
- `tokens: IntentionTokens` – Extracted/merged tokens

**Degraded Mode**:
- If LLM fails, falls back to pattern matching
- If both fail, uses sensible defaults

**Example**:
```typescript
// Input:
{ freeText: "live music tonight in Brooklyn under $30" }

// Output:
{
  intention: {
    city: "brooklyn",
    nowISO: "2025-11-17T20:00:00Z",
    tokens: {
      mood: "electric",
      untilMinutes: 1440,
      budget: "casual",
      category: "MUSIC",
      // ... more tokens
    }
  }
}
```

---

### 2. retrieve

**Location**: `packages/agent/src/graph/nodes/retrieve.ts`

**Purpose**: Hybrid retrieval using keyword + vector search

**Dependencies**:
- `@citypass/rag` → `retrieve` (Typesense + Qdrant)

**Inputs**:
- `state.intention: Intention` – User intention
- `state.freeText?: string` – Optional query text for semantic search

**Outputs**:
- `candidates: CandidateEvent[]` – Raw events from search (50-100 events)

**Degraded Mode**:
- If Qdrant is down, falls back to keyword-only search (sets `degradedFlags.noQdrant`)

**Configuration**:
- `topK: 100` – Total candidates to retrieve
- `rerankTop: 50` – Number of events to rerank
- `useReranker: true` – Enable cross-encoder reranking

---

### 3. enrich

**Location**: `packages/agent/src/graph/nodes/enrich.ts`

**Purpose**: Augment candidates with graph signals and user context

**Dependencies**:
- `@citypass/cag` → Novelty, friend overlap, social heat
- `@citypass/taste` → User taste vector, taste similarity

**Inputs**:
- `state.candidates: CandidateEvent[]` – Retrieved events
- `state.userId?: string` – User ID for personalization

**Outputs**:
- `enrichedCandidates: EnrichedEvent[]` – Events with:
  - `noveltyScore: number` – 0-1, how new this event is for the user
  - `friendInterest: number` – Count of friends interested
  - `socialHeat: { views, saves, attends }` – Social proof signals
  - `tasteMatchScore: number` – Cosine similarity to user taste vector
  - `distanceKm?: number` – Distance from user location
  - `travelTimeMinutes?: number` – Estimated travel time

**Degraded Mode**:
- If Neo4j is down, sets default novelty/friend scores
- If Qdrant embeddings unavailable, sets `tasteMatchScore = 0.5`

---

### 4. rank

**Location**: `packages/agent/src/graph/nodes/rank.ts`

**Purpose**: Score events using Ranker v1 (learning-to-rank model)

**Dependencies**:
- `@citypass/ranker` → `Ranker`, feature engineering functions

**Inputs**:
- `state.enrichedCandidates: EnrichedEvent[]`
- `state.intention: Intention`

**Outputs**:
- `rankedCandidates: ScoredEvent[]` – Events with:
  - `score: number` – Overall fit score (0-1)
  - `factorContributions: Record<string, number>` – Per-feature scores
  - `features: RankingFeatures` – All input features

**Ranking Factors** (see `packages/ranker/src/index.ts`):
| Factor | Weight | Description |
|--------|--------|-------------|
| `textual` | 0.20 | Keyword similarity |
| `semantic` | 0.18 | Vector similarity |
| `moodAlignment` | 0.16 | Category/tag match to mood |
| `socialHeatScore` | 0.12 | Social proof (views, saves) |
| `noveltyScore` | 0.10 | Graph-based novelty |
| `timeFit` | 0.08 | Event timing match |
| `priceComfort` | 0.08 | Budget match |
| `distanceComfort` | 0.04 | Location convenience |
| `tasteMatchScore` | 0.04 | Taste vector similarity |

**Model Loading**:
- On startup, loads latest `ranker_snapshot` from DB
- If none exists, uses default weights

---

### 5. compose

**Location**: `packages/agent/src/graph/nodes/compose.ts`

**Purpose**: Create 3 diverse recommendation slates

**Dependencies**:
- `@citypass/slate` → Slate composition logic
- `@citypass/slate/bandit` → Multi-armed bandit for policy selection

**Inputs**:
- `state.rankedCandidates: ScoredEvent[]`
- `state.userId?: string` – For bandit policy selection

**Outputs**:
- `slates`:
  - **Best**: Top 10 by overall score
  - **Wildcard**: Top 10 by novelty score (min score 0.4)
  - **Close & Easy**: Top 10 by price (≤$30) and proximity
- `slatePolicy`:
  - `name: string` – Policy used (e.g., "balanced", "80safe-20novel")
  - `wasExploration: boolean` – Was this an exploration arm?

**Bandit Logic**:
- Epsilon-greedy (ε=0.15 for existing users, ε=0.25 for new users)
- Tracks policy performance (CTR, save rate) in-memory
- Can load active policy from `slate_policy` table

---

### 6. critic

**Location**: `packages/agent/src/graph/nodes/critic.ts`

**Purpose**: Quality checks and user-facing warnings

**Checks**:
1. **Coverage**: Do we have enough recommendations?
2. **Diversity**: Are slates diverse enough?
3. **Degradation**: Were any services unavailable?
4. **Intent Mismatch**: Did we fail to match user constraints?

**Inputs**:
- `state.slates`
- `state.degradedFlags`
- `state.intention`

**Outputs**:
- `warnings: string[]` – E.g., "No free events found - showing low-cost alternatives"
- `reasons: string[]` – Additional contextual reasons

---

### 7. format

**Location**: `packages/agent/src/graph/nodes/format.ts`

**Purpose**: Generate final response with reasons and AI summary

**Inputs**:
- `state.slates`
- `state.intention`
- `state.freeText` (optional, for AI summary generation)

**Outputs**:
- `reasons: string[]` – Top 5 reasons/insights (e.g., "Curated for electric vibes", "Focused on free events")
- `aiSummary?: string` – Natural language summary (template-based for now, LLM-generated in future)

**Future Enhancement**:
- Call LLM to generate contextual summary based on user query and slates

---

### 8. log

**Location**: `packages/agent/src/graph/nodes/log.ts`

**Purpose**: Persist interaction data for offline learning

**Dependencies**:
- `@citypass/db/logging` → `logEvent`

**Inputs**:
- `state.* (entire state)`

**Outputs**:
- (none, side effect only)

**Logged Events**:
1. **QUERY**: User query with intention, candidate count, degraded flags
2. **SLATE_IMPRESSION** (×3): One for each slate (Best, Wildcard, Close & Easy)

**Fail-Soft**:
- If DB write fails, logs to console and continues (doesn't block response)

---

## Agent State

**Type**: `AgentState` (defined in `packages/agent/src/graph/types.ts`)

**Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `userId?` | `string` | Authenticated user ID |
| `anonId?` | `string` | Anonymous session ID |
| `sessionId` | `string` | Session identifier |
| `traceId` | `string` | Unique trace for this pipeline run |
| `freeText?` | `string` | User's natural language query |
| `tokens?` | `Partial<IntentionTokens>` | Token overrides |
| `intention?` | `Intention` | Parsed intention |
| `candidates?` | `CandidateEvent[]` | Retrieved events |
| `enrichedCandidates?` | `EnrichedEvent[]` | Enriched events |
| `rankedCandidates?` | `ScoredEvent[]` | Scored events |
| `slates?` | `{ best, wildcard, closeAndEasy }` | Final slates |
| `slatePolicy?` | `{ name, wasExploration }` | Bandit policy metadata |
| `reasons?` | `string[]` | User-facing reasons |
| `aiSummary?` | `string` | AI-generated summary |
| `degradedFlags?` | `object` | Flags for degraded services |
| `errors?` | `string[]` | Critical errors |
| `warnings?` | `string[]` | Non-critical warnings |

---

## Usage

### Basic Usage

```typescript
import { executeAgentGraph } from '@citypass/agent';

const result = await executeAgentGraph({
  freeText: "jazz concerts this weekend",
  userId: "user_123",
  sessionId: "session_456",
  traceId: "trace_789",
});

console.log(result.state.slates.best); // Top recommendations
console.log(result.logs); // Node execution logs
console.log(result.totalDurationMs); // Total latency
```

### Convenience Functions

```typescript
import { askAgent, planAgent } from '@citypass/agent';

// For chat-based queries
const result1 = await askAgent({
  freeText: "something fun tonight",
  userId: "user_123",
  city: "brooklyn",
});

// For structured planning
const result2 = await planAgent({
  tokens: {
    mood: "electric",
    budget: "casual",
    category: "MUSIC",
  },
  userId: "user_123",
  city: "brooklyn",
});
```

---

## Extending the Pipeline

### Adding a New Node

1. **Create node file**: `packages/agent/src/graph/nodes/myNode.ts`

```typescript
import type { AgentState } from '../types';

export async function myNode(state: AgentState): Promise<Partial<AgentState>> {
  // Your logic here

  return {
    // State updates
  };
}
```

2. **Add to pipeline**: Update `packages/agent/src/graph/index.ts`

```typescript
const pipeline: Array<{ name: string; node: NodeFn; required: boolean }> = [
  // ... existing nodes
  { name: 'myNode', node: myNode, required: false },
];
```

3. **Update types**: Add any new state fields to `AgentState` in `types.ts`

---

## Model Versioning

Every model (LLM, ranker, bandit policy) logs its version to `model_version` table:

```typescript
import { logModelVersionIfNeeded } from '@citypass/db/logging';

await logModelVersionIfNeeded(
  'ranker_v1',
  'RANKER',
  '1.0.0',
  { method: 'weighted_sum' }
);
```

**Benefits**:
- A/B test different model versions
- Rollback to previous versions
- Track performance across model iterations

---

## Observability

### Trace ID

Every pipeline run has a unique `traceId` that flows through:
1. All node executions
2. All event logs (`event_log.trace_id`)
3. API responses

Use this to debug a specific user query:

```sql
SELECT * FROM event_logs WHERE trace_id = 'trace_789';
```

### Node Logs

Every pipeline run returns `logs: NodeLog[]`:

```json
{
  "logs": [
    {
      "node": "parseIntent",
      "startMs": 1700000000,
      "endMs": 1700000050,
      "durationMs": 50,
      "success": true
    },
    {
      "node": "retrieve",
      "durationMs": 320,
      "success": true
    }
  ],
  "totalDurationMs": 1240
}
```

Use this to identify slow nodes or failures.

---

## Future Evolution

### Phase 1 (Current): Rule-Based + Weighted Sum

- Ranker: Weighted sum of hand-tuned factors
- Slate Composer: Fixed policies (balanced, exploration)
- Taste Vector: Simple EMA of event embeddings

### Phase 2: Learning-to-Rank

- Ranker: LightGBM/XGBoost trained on interaction logs
- Features: All current factors + learned features
- Training: Weekly cron job (`trainRanker`)

### Phase 3: Distillation + In-House LLM

- Train small LM (e.g., Llama-3-8B) on LLM "teacher" outputs
- Distill intent extraction: Claude/GPT → In-house LM
- Distill answer formatting: Claude/GPT → In-house LM

### Phase 4: Full Agentic Loop

- Agent can request additional retrieval (multi-hop reasoning)
- Agent can query external APIs (weather, traffic, ticketing)
- Agent can revise slate based on user feedback in chat

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        User Query                            │
│              (Free Text or Structured Tokens)                │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                    Agent Graph Pipeline                      │
│                                                              │
│  ┌───────────┐   ┌───────────┐   ┌───────────┐             │
│  │  Intent   │ → │  Retrieve │ → │  Enrich   │             │
│  │  Parser   │   │    RAG    │   │   (CAG)   │             │
│  └───────────┘   └───────────┘   └───────────┘             │
│        │               │               │                     │
│        ▼               ▼               ▼                     │
│  ┌───────────┐   ┌───────────┐   ┌───────────┐             │
│  │   Rank    │ → │  Compose  │ → │  Critic   │             │
│  │  (L2R)    │   │  Slates   │   │   Check   │             │
│  └───────────┘   └───────────┘   └───────────┘             │
│        │               │               │                     │
│        └───────────────┴───────────────┘                     │
│                         │                                    │
│                         ▼                                    │
│                  ┌─────────────┐                             │
│                  │   Format    │                             │
│                  │  & Log      │                             │
│                  └─────────────┘                             │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                   3 Slates Returned                          │
│         Best • Wildcard • Close & Easy                       │
└──────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                   Event Logs (DB)                            │
│      QUERY, SLATE_IMPRESSION, CARD_VIEW, SAVE, etc.         │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                 Offline Learner (Worker)                     │
│   • Aggregate Logs                                           │
│   • Train Ranker (LightGBM)                                  │
│   • Update Taste Vectors                                     │
│   • Update Bandit Policies                                   │
└──────────────────────────────────────────────────────────────┘
```

---

## Questions?

- **"How do I add a new ranking factor?"**
  → Update `RankingFeatures` in `packages/ranker/src/index.ts`, add weight to `DEFAULT_WEIGHTS`, and update `scoreWithWeightedSum`.

- **"How do I A/B test a new slate policy?"**
  → Create a new `SlatePolicy` in `packages/slate/src/index.ts`, add it to the bandit's policy list in `packages/slate/src/bandit.ts`.

- **"How do I debug a slow pipeline?"**
  → Check `result.logs` for per-node latency. Common bottlenecks: `retrieve` (Qdrant/Typesense), `enrich` (Neo4j queries).

- **"How do I upgrade the LLM?"**
  → Change `process.env.LLM_INTENT_MODEL` (currently supports `claude`, `gpt`, `auto`). No code changes needed.

---

## Related Docs

- [Learning System](./README_LEARNING_SYSTEM.md) – How the offline learner works
- [Ranker Deep Dive](../packages/ranker/README.md) – Ranking model details (TODO)
- [Slate Bandit](../packages/slate/README.md) – Multi-armed bandit details (TODO)
