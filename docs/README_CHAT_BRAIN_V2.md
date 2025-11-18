# Chat Brain V2 - Multi-Layer, Learning-Aware Chat System

## Overview

Chat Brain V2 is a sophisticated, multi-layer chat system that replaces the previous simple intent extraction with a comprehensive pipeline that:

1. **Assembles rich context** from user requests, profiles, learner states, search results, and chat history
2. **Uses two distinct LLM roles** for specialized tasks:
   - **Analyst**: Interprets context into structured IntentionV2 + ExplorationPlan
   - **Stylist**: Converts structured recommendations into natural language replies
3. **Runs deterministic planner** that integrates with existing Ranker and Bandit systems
4. **Persists complete chat turns** including LLM decisions, context snapshots, and slate decisions
5. **Feeds back into recommendation system** via UserContextSnapshot for cross-system personalization

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Chat Turn Request                           │
│                  { freeText, userId, cityHint }                      │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR (runChatTurn)                        │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 1: CONTEXT ASSEMBLER                                           │
│ ┌─────────────────────────────────────────────────────────────┐    │
│ │ buildChatContextSnapshot()                                   │    │
│ │  • Load user profile (moods, budget, social style)           │    │
│ │  • Load learner state (exploration level, bandit policy)     │    │
│ │  • Build chat history summary (last 5 messages)              │    │
│ │  • Build recent picks summary (saves, clicks, hides)         │    │
│ │  • Determine search window from freeText                     │    │
│ │  • Query candidate events from DB (50 max)                   │    │
│ └─────────────────────────────────────────────────────────────┘    │
│                                                                       │
│ Output: ChatContextSnapshot (complete state of world)                │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 2: ANALYST LLM (gpt-4o-mini, temp=0.3)                         │
│ ┌─────────────────────────────────────────────────────────────┐    │
│ │ runAnalystLLM(context)                                       │    │
│ │  • System prompt: "You are CityLens Analyst"                 │    │
│ │  • User prompt: Context + Profile + History + Events        │    │
│ │  • Response format: Strict JSON with Zod validation         │    │
│ │  • Fallback: Heuristic intention if LLM unavailable          │    │
│ └─────────────────────────────────────────────────────────────┘    │
│                                                                       │
│ Output: { intention: IntentionV2, explorationPlan, softOverrides }   │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 3: PLANNER (Deterministic)                                     │
│ ┌─────────────────────────────────────────────────────────────┐    │
│ │ runPlanner(context, analystOutput)                           │    │
│ │  • Initialize Ranker (@citypass/ranker)                      │    │
│ │  • Score each event:                                         │    │
│ │     - timeFit, recencyScore, distanceComfort                 │    │
│ │     - priceComfort, moodAlignment, socialHeat                │    │
│ │     - noveltyScore, tasteMatchScore                          │    │
│ │  • Select bandit policy (@citypass/slate/bandit)             │    │
│ │  • Build 3 slates:                                           │    │
│ │     1. Best: Top 5 by overall score                          │    │
│ │     2. Wildcard: Top 5 high-novelty (if exploration allows)  │    │
│ │     3. Close & Easy: Top 5 by distance + time convenience    │    │
│ │  • Compile human-friendly reasons from factor scores         │    │
│ └─────────────────────────────────────────────────────────────┘    │
│                                                                       │
│ Output: PlannerDecision { intention, slates[], meta }                │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 4: STYLIST LLM (gpt-4o-mini, temp=0.7)                         │
│ ┌─────────────────────────────────────────────────────────────┐    │
│ │ runStylistLLM(context, plannerDecision)                      │    │
│ │  • System prompt: "You are CityLens Stylist"                 │    │
│ │  • User prompt: Request + Intention + Slates summary         │    │
│ │  • Response: 1-3 sentences, warm and personalized            │    │
│ │  • Fallback: Template-based reply if LLM unavailable         │    │
│ └─────────────────────────────────────────────────────────────┘    │
│                                                                       │
│ Output: StylistLLMOutput { reply, rawModelResponse }                 │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 5: PERSISTENCE                                                 │
│ ┌─────────────────────────────────────────────────────────────┐    │
│ │ persistChatTurn()                                            │    │
│ │  1. Upsert ChatThread (find or create)                       │    │
│ │  2. Insert user ChatMessage (freeText + contextSnapshot)     │    │
│ │  3. Insert assistant ChatMessage (reply + decision payload)  │    │
│ │  4. Insert SlateDecision (for training data)                 │    │
│ │  5. Upsert UserContextSnapshot (for feed integration)        │    │
│ └─────────────────────────────────────────────────────────────┘    │
│                                                                       │
│ Returns: threadId                                                    │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Return to Client                                 │
│  { threadId, plannerDecision, reply }                                │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Type Definitions

### ChatContextSnapshot

Complete snapshot of the world at chat turn time:

```typescript
interface ChatContextSnapshot {
  // Identity
  userId?: string;
  anonId?: string;
  sessionId: string;
  traceId: string;

  // Request
  freeText: string;
  nowISO: string;
  city: string;
  locationApprox?: { lat: number; lon: number } | null;

  // Personalization
  profile: Profile;
  learnerState: LearnerState;

  // History
  chatHistorySummary: string;
  recentPicksSummary: string;

  // Candidate events
  searchWindow: { fromISO: string; toISO: string };
  candidateEvents: CandidateEvent[];
}
```

### IntentionV2

Structured interpretation of user's goal:

```typescript
interface IntentionV2 {
  primaryGoal: string;
  timeWindow: { fromISO: string; toISO: string };
  city: string;
  neighborhoodPreference?: string | null;
  exertionLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  socialContext?: 'SOLO' | 'WITH_FRIENDS' | 'DATE' | 'FAMILY' | null;
  budgetBand?: 'LOW' | 'MID' | 'HIGH' | 'LUXE' | null;
  vibeDescriptors: string[]; // ["chill", "artsy", "outdoorsy"]
  constraints: string[]; // ["must be wheelchair accessible"]
  notes: string;
}
```

### ExplorationPlan

How adventurous the recommendations should be:

```typescript
interface ExplorationPlan {
  explorationLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  noveltyTarget: number; // 0.0 to 1.0
  allowWildcardSlate: boolean;
}
```

### PlannerDecision

Output from deterministic planner:

```typescript
interface PlannerDecision {
  intention: IntentionV2;
  slates: SlateDecision[];
  meta: {
    traceId: string;
    banditPolicyName: string | null;
    usedProfile: boolean;
    usedLearnerState: boolean;
  };
}

interface SlateDecision {
  label: 'Best' | 'Wildcard' | 'Close & Easy';
  items: SlateItemDecision[];
}

interface SlateItemDecision {
  eventId: string;
  priority: number;
  reasons: string[]; // ["Perfect timing", "Matches your vibe"]
  factorScores?: Record<string, number>;
}
```

## Database Schema

### ChatThread

Stores conversation threads:

```prisma
model ChatThread {
  id        String   @id @default(cuid())
  userId    String?
  anonId    String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  messages       ChatMessage[]
  slateDecisions SlateDecision[]
}
```

### ChatMessage

Individual messages in thread:

```prisma
model ChatMessage {
  id          String   @id @default(cuid())
  threadId    String
  role        String   // "user" | "assistant" | "system"
  freeText    String?  // For user messages
  modelReply  String?  // For assistant messages
  rawPayload  Json?    // Full context/decision data
  createdAt   DateTime @default(now())
}
```

### SlateDecision

**Training data** for future model improvements:

```prisma
model SlateDecision {
  id                String   @id @default(cuid())
  traceId           String   @unique
  threadId          String
  userId            String?
  intentionJson     Json     // Full IntentionV2
  slatesJson        Json     // Full slates array
  banditPolicyName  String?
  usedProfile       Boolean
  usedLearnerState  Boolean
  createdAt         DateTime @default(now())
}
```

This table captures:
- **What we showed** (slatesJson)
- **Why we showed it** (intentionJson, banditPolicyName)
- **What we knew** (usedProfile, usedLearnerState)

Combined with EventLog (clicks, saves), we can:
- Train reward models
- Tune bandit policies
- Evaluate slate quality
- A/B test planner strategies

### UserContextSnapshot

**Feed integration** - latest chat state for personalized feed:

```prisma
model UserContextSnapshot {
  id                String   @id @default(cuid())
  userId            String   @unique
  lastTraceId       String
  lastIntentionJson Json     // Latest IntentionV2
  lastTasteVectorId String?
  lastUpdatedAt     DateTime
}
```

## How Chat History Works

### Storage

Chat history is stored across two tables:

1. **ChatThread**: Container for a conversation
   - Identified by `threadId` (returned to client)
   - Can be associated with `userId` (logged in) or `anonId` (anonymous)

2. **ChatMessage**: Individual messages
   - `role`: "user" or "assistant"
   - `freeText`: Original user input (user messages)
   - `modelReply`: Stylist's natural language reply (assistant messages)
   - `rawPayload`: Complete decision data (JSON)

### Retrieval

```typescript
const history = await getChatHistory(threadId);
// Returns array of ChatTurnRecord objects
```

### Integration into Context

Context assembler loads last 5 messages and builds a summary:

```typescript
const chatHistorySummary = await buildChatHistorySummary(threadId);
// "User asked: 'events tonight...' Assistant replied with recommendations."
```

This summary is passed to **Analyst LLM** to:
- Understand conversation flow
- Reference previous searches
- Detect follow-up questions
- Maintain conversational context

## SlateDecision as Training Data

Every chat turn creates a `SlateDecision` record with:

```json
{
  "traceId": "abc-123",
  "intentionJson": {
    "primaryGoal": "live music tonight",
    "timeWindow": { "fromISO": "2025-01-17T20:00:00Z", "toISO": "2025-01-17T23:00:00Z" },
    "city": "New York",
    "vibeDescriptors": ["energetic", "indie"],
    "budgetBand": "MID"
  },
  "slatesJson": [
    {
      "label": "Best",
      "items": [
        {
          "eventId": "evt-456",
          "priority": 1,
          "reasons": ["Perfect timing", "Matches your vibe"],
          "factorScores": {
            "timeFit": 1.0,
            "moodAlignment": 0.85,
            "priceComfort": 0.9
          }
        }
      ]
    }
  ],
  "banditPolicyName": "epsilon-greedy-0.1",
  "usedProfile": true,
  "usedLearnerState": true
}
```

### Training Use Cases

1. **Reward Model Training**
   - Join `SlateDecision` with `EventLog` (clicks, saves)
   - Learn: Which factor score combinations → user engagement?
   - Improve: Ranker weights, bandit policies

2. **Intention Quality Evaluation**
   - Compare Analyst LLM output with user behavior
   - Metrics: Did user pick events matching intention.vibeDescriptors?
   - Improve: Analyst prompt, training data

3. **Slate Diversity Experiments**
   - A/B test different slate composition strategies
   - Track: Which slate users engage with most?
   - Improve: Planner logic

4. **Bandit Policy Tuning**
   - Measure: Does higher noveltyTarget → more discovery?
   - Optimize: Exploration/exploitation tradeoff per user segment

## UserContextSnapshot → Feed Integration

### How It Works

1. **Chat updates snapshot** (every chat turn):
   ```typescript
   await prisma.userContextSnapshot.upsert({
     where: { userId },
     update: {
       lastTraceId: traceId,
       lastIntentionJson: plannerDecision.intention,
       lastTasteVectorId: context.profile.tasteVectorId,
       lastUpdatedAt: new Date()
     }
   });
   ```

2. **Feed reads snapshot**:
   ```typescript
   import { getFeedContextForUser } from '@citypass/feed/context';

   const feedContext = await getFeedContextForUser(userId);
   // {
   //   lastIntention: IntentionV2,
   //   tasteVectorId: "vec-123",
   //   explorationLevel: "MEDIUM"
   // }
   ```

3. **Feed uses context**:
   - Boost events matching `lastIntention.vibeDescriptors`
   - Boost events in `lastIntention.timeWindow`
   - Boost events matching `lastIntention.budgetBand`
   - Adjust novelty based on `explorationLevel`

### Example

User searches: "chill jazz tonight in Brooklyn"

Chat Brain extracts:
```json
{
  "vibeDescriptors": ["chill", "jazz"],
  "timeWindow": { "fromISO": "2025-01-17T18:00:00Z", "toISO": "2025-01-17T23:00:00Z" },
  "city": "New York",
  "neighborhoodPreference": "Brooklyn"
}
```

Feed ranking (next time user opens app):
- Jazz events get +0.2 boost
- Events tonight in Brooklyn get +0.3 boost
- Chill vibe events get +0.15 boost

Result: **Seamless transition from chat → feed**, maintaining user's expressed preferences.

## API Integration

### Endpoint: `/api/chat` (POST)

Updated to use Chat Brain V2 orchestrator:

```typescript
import { runChatTurn } from '@citypass/chat/orchestrator';

const result = await runChatTurn({
  userId,
  anonId,
  freeText,
  cityHint,
  threadId, // Optional: continue conversation
});

// Returns: { threadId, plannerDecision, reply }
```

Response maintains backward compatibility with existing UI:
- Streams via Server-Sent Events (SSE)
- Returns slates in legacy `RankedItem[]` format
- Includes `summary` (Stylist reply) and `reasons`

## Future Evolution

### Phase 1 (Current): Foundation
- ✅ Multi-layer pipeline (Context → Analyst → Planner → Stylist)
- ✅ Full persistence (threads, messages, decisions)
- ✅ Feed integration via UserContextSnapshot
- ✅ Training data collection (SlateDecision)

### Phase 2: Learning Loop
- Train reward model from SlateDecision + EventLog
- Fine-tune Analyst LLM on chat history + click data
- Implement automated bandit policy optimization
- Add reinforcement learning for slate composition

### Phase 3: Advanced Features
- Multi-turn conversation memory (vector similarity search on history)
- Collaborative filtering (users with similar intentions)
- Real-time intent refinement (clarifying questions)
- Proactive suggestions ("Based on your recent searches...")

### Phase 4: Scale
- Distributed planner (parallelize slate generation)
- Caching layer (frequently asked intentions)
- Multi-city support with city-specific models
- International expansion (i18n intentions)

## Observability

All components log extensively:

```
[ContextAssembler] Loading context for user: user-123
[Analyst] Interpreting context for trace: abc-123
[Analyst] ✓ Successfully parsed intention
[Planner] Building slates for trace: abc-123
[Ranker] Scored 50 events in 45ms
[Stylist] Generating reply for trace: abc-123
[Stylist] ✓ Generated reply
[Orchestrator] Step 5: Persisting to database
[Orchestrator] ✓ Chat turn complete: abc-123
```

Tracing:
- Every chat turn gets unique `traceId`
- Stored in SlateDecision, ChatMessage, UserContextSnapshot
- Enables full audit trail for debugging

## Configuration

### Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-...          # For Analyst & Stylist LLMs
DATABASE_URL=postgresql://...   # For persistence

# Optional
NEXT_PUBLIC_DEFAULT_CITY=New York  # Default if no city hint
```

### Model Selection

Current: `gpt-4o-mini` (cost-effective, fast)

To upgrade to GPT-4:
```typescript
// analyst.ts & stylist.ts
model: 'gpt-4o-mini' → 'gpt-4o'
```

### Ranker Configuration

Managed in `@citypass/ranker`:
- Factor weights (timeFit, moodAlignment, etc.)
- Scoring algorithms
- See `packages/ranker/src/index.ts`

### Bandit Configuration

Managed in `@citypass/slate/bandit`:
- Policy selection (epsilon-greedy, Thompson sampling, etc.)
- Exploration levels
- See `packages/slate/src/bandit.ts`

## Testing

### Local Testing

```bash
# Run database migration
pnpm --filter @citypass/db prisma migrate dev --name chat_brain_v2

# Start dev server
cd apps/web && pnpm dev

# Test chat endpoint
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "live music tonight in Brooklyn"}'
```

### Manual Testing Scenarios

1. **New user (no profile)**
   - Should use fallback preferences
   - Should create new ChatThread
   - Should generate generic intentions

2. **Returning user (with profile)**
   - Should load moodsPreferred, budgetBand
   - Should use learner state for exploration level
   - Should reference chat history if threadId provided

3. **Follow-up question**
   - Provide threadId from previous response
   - Should build on previous context
   - Should understand references ("show me cheaper options")

4. **LLM fallback**
   - Set OPENAI_API_KEY to invalid value
   - Should use heuristic intention extraction
   - Should use template-based stylist reply
   - Should still work end-to-end

## Troubleshooting

### "OpenAI API error"
- Check OPENAI_API_KEY is set
- Verify API key has sufficient credits
- Check rate limits

### "No events found"
- Verify events exist in DB for specified city + time window
- Check search window extraction logic
- Inspect candidateEvents in context snapshot

### "Prisma error: relation not found"
- Run database migration: `pnpm --filter @citypass/db prisma migrate dev`
- Verify DATABASE_URL is correct

### "Type errors in TypeScript"
- Run: `pnpm install` (ensure all workspace dependencies resolved)
- Check `packages/chat/types.ts` exports are correct

## Performance

Expected latencies (P50):

| Component | Latency |
|-----------|---------|
| Context Assembly | 50-100ms |
| Analyst LLM | 800-1500ms |
| Planner (50 events) | 40-80ms |
| Stylist LLM | 500-800ms |
| Persistence | 30-50ms |
| **Total** | **1.5-2.5s** |

Optimization opportunities:
- Cache user profiles (reduce DB hits)
- Parallelize Analyst + event fetching
- Use streaming for LLM responses
- Add Redis cache for frequent intentions

## Migration from V1

If you have existing chat/intention code, migration path:

1. **Keep existing endpoints** (`/api/ask`, `/api/plan`) - they still work
2. **Gradually migrate clients** to use `/api/chat`
3. **Dual-run mode**: Run both systems, compare outputs
4. **Switch cutover**: After validation, deprecate V1

No breaking changes to frontend - `/api/chat` maintains same response shape.

## Summary

Chat Brain V2 transforms CityLens from a simple search tool into a learning-aware conversation system:

- **Richer context** = better understanding of user needs
- **Separate LLM roles** = specialized, focused outputs
- **Deterministic planner** = predictable, debuggable recommendations
- **Full persistence** = training data + conversational memory
- **Feed integration** = personalization across features

This foundation enables future ML improvements while maintaining system reliability and debuggability.
