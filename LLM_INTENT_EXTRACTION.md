# LLM Intent Extraction — Complete Guide

## Overview

The system now uses a **3-tier fallback chain** for extracting structured intent from free text:

```
LLM Extraction → Pattern Matching → Defaults
    (Primary)      (Fallback 1)     (Fallback 2)
```

## The Exact Prompt Being Used

### System Prompt (sent to Claude/GPT)

```
You are an expert at understanding natural language queries about events and activities.

Extract structured intent from the user's free text query. Return ONLY valid JSON matching this schema:

{
  "timeWindow": {
    "untilMinutes": number,  // Minutes from now until search window ends
    "humanReadable": string  // e.g., "tonight", "this weekend", "next Tuesday at 7pm"
  },
  "location": {
    "query": string,        // Location name
    "district": string      // Neighborhood/district if mentioned
  },
  "exertion": "low" | "moderate" | "high",  // Physical intensity
  "vibe": "calm" | "social" | "electric" | "artistic" | "grounded",  // Mood/atmosphere
  "companions": string[],   // One or more: "solo", "friends", "date", "family", "coworkers"
  "budget": "free" | "casual" | "splurge",  // Price tier
  "travelMode": "walk" | "bike" | "transit" | "drive"  // Preferred transportation
}

Rules:
1. Only include fields that are EXPLICITLY mentioned or strongly implied
2. For timeWindow: "tonight" = 360 min (6pm-midnight), "this weekend" = 4320 min (72h), "tomorrow" = 1440 min (24h)
3. For exertion: "strenuous/intense/athletic" = high, "active/exercise/dance" = moderate, "relaxing/calm/seated" = low
4. For vibe: match to mood categories based on context
5. For budget: "free" = $0, "under $X" or "affordable" = casual, "splurge/fancy/upscale" = splurge
6. Return empty object {} if no clear intent can be extracted

Examples: [see examples below]
```

### User Message Template

```
Extract intent from this query:

"{freeText}"
```

## LLM Models Used

| Model | Use Case | Cost per Request |
|-------|----------|------------------|
| **Claude 3 Haiku** | Default (if `ANTHROPIC_API_KEY` set) | ~$0.0002 |
| **GPT-3.5 Turbo** | Fallback (if `OPENAI_API_KEY` set) | ~$0.0003 |

**Average cost per query**: $0.0002 (0.02 cents)

## Configuration

### Environment Variables

```bash
# Enable/disable LLM extraction
DISABLE_LLM_INTENT="false"  # Set to "true" to use patterns only

# Choose model
LLM_INTENT_MODEL="auto"  # Options: "claude", "gpt", "auto"
# "auto" = use Claude if available, else GPT, else patterns

# API Keys (at least one required for LLM extraction)
ANTHROPIC_API_KEY="sk-ant-xxx"
OPENAI_API_KEY="sk-proj-xxx"
```

### Cost Control

**Option 1: Disable LLM completely**
```bash
DISABLE_LLM_INTENT="true"
```
Uses pattern matching only (no API costs).

**Option 2: Use Claude Haiku (cheapest)**
```bash
LLM_INTENT_MODEL="claude"
ANTHROPIC_API_KEY="sk-ant-xxx"
```

**Option 3: Cache aggressively** (future enhancement)
Cache extracted intents for 1 hour by query hash.

## Example Queries & Responses

### Example 1: Complex Multi-Intent

**Input:**
```json
{
  "freeText": "looking for electric music events tonight near Brooklyn with friends under $30"
}
```

**LLM Response:**
```json
{
  "timeWindow": {
    "untilMinutes": 360,
    "humanReadable": "tonight"
  },
  "location": {
    "query": "brooklyn",
    "district": "Brooklyn"
  },
  "vibe": "electric",
  "companions": ["friends"],
  "budget": "casual"
}
```

**Mapped to IntentionTokens:**
```json
{
  "mood": "electric",
  "untilMinutes": 360,
  "companions": ["friends"],
  "budget": "casual",
  "distanceKm": 5  // Default for Brooklyn area
}
```

### Example 2: Time-Specific Query

**Input:**
```json
{
  "freeText": "date night this Saturday at 8pm, fancy restaurant"
}
```

**LLM Response:**
```json
{
  "timeWindow": {
    "untilMinutes": 2880,
    "humanReadable": "this Saturday at 8pm"
  },
  "companions": ["date"],
  "budget": "splurge"
}
```

### Example 3: Fitness/Exertion Query

**Input:**
```json
{
  "freeText": "strenuous workout class tomorrow morning"
}
```

**LLM Response:**
```json
{
  "timeWindow": {
    "untilMinutes": 720,
    "humanReadable": "tomorrow morning"
  },
  "exertion": "high",
  "vibe": "grounded"
}
```

### Example 4: Minimal/Vague Query

**Input:**
```json
{
  "freeText": "something fun"
}
```

**LLM Response:**
```json
{}
```

**Fallback:** Uses pattern matching → defaults

## Fallback Chain Details

### Tier 1: LLM Extraction (Primary)

**When it runs:**
- `DISABLE_LLM_INTENT !== "true"`
- At least one API key is set

**Success criteria:**
- Returns valid JSON
- Contains at least one extracted field

**Failure handling:**
- Network error → falls back to patterns
- Invalid JSON → falls back to patterns
- Empty object `{}` → falls back to patterns

### Tier 2: Pattern Matching (Fallback 1)

**When it runs:**
- LLM disabled OR
- LLM failed OR
- No API keys configured

**Patterns matched:**
- Time: "tonight", "tomorrow", "this weekend", "at 7pm", "in 2 hours"
- Location: "near X", "in X", "at X", "downtown", "brooklyn"
- Exertion: "strenuous", "relaxing", "active", "intense"
- Vibe: "electric", "calm", "social", "artistic"
- Companions: "with friends", "date night", "family"
- Budget: "free", "under $X", "splurge"
- Travel: "walking distance", "subway accessible", "bike friendly"

**Success criteria:**
- At least one pattern matched

### Tier 3: Defaults (Fallback 2)

**When it runs:**
- Both LLM and patterns fail/disabled

**Returns:**
```json
{
  "mood": "calm",
  "untilMinutes": 180,
  "distanceKm": 5,
  "budget": "casual",
  "companions": ["solo"]
}
```

## API Response Format

### `/api/ask` Response

```json
{
  "tokens": {
    "mood": "electric",
    "untilMinutes": 360,
    "companions": ["friends"],
    "budget": "casual",
    "distanceKm": 5
  },
  "intention": {
    "city": "New York",
    "nowISO": "2025-01-16T14:00:00Z",
    "tokens": { /* same as above */ },
    "source": "inline"
  },
  "traceId": "abc-123-def",
  "success": true,
  "meta": {
    "extractionMethod": "llm",  // or "pattern" or "defaults"
    "extractionMetadata": {
      "llmModel": "claude"  // if LLM was used
    }
  }
}
```

## Testing

### Manual Test

```bash
# Test with LLM enabled
curl -X POST http://localhost:3001/api/ask \
  -H "Content-Type: application/json" \
  -d '{
    "freeText": "electric music events tonight near Brooklyn with friends under $30",
    "context": { "city": "New York" }
  }'

# Expected: extractionMethod: "llm" or "pattern"
```

### Disable LLM and Test Patterns

```bash
# In .env
DISABLE_LLM_INTENT="true"

# Test
curl -X POST http://localhost:3001/api/ask \
  -H "Content-Type: application/json" \
  -d '{
    "freeText": "relaxing yoga class tomorrow",
    "context": { "city": "New York" }
  }'

# Expected: extractionMethod: "pattern"
```

### Unit Tests

```bash
pnpm --filter @citypass/utils test llm-intent
```

## Performance Benchmarks

| Scenario | Method | Latency | Cost |
|----------|--------|---------|------|
| LLM (Claude) | LLM | 200-400ms | $0.0002 |
| LLM (GPT) | LLM | 300-500ms | $0.0003 |
| Pattern-only | Pattern | <5ms | $0 |
| Empty query | Defaults | <1ms | $0 |

## Debugging

### Enable Debug Logging

Check server logs for:
```
✨ [abc-123] Intent extracted via llm
✨ Intent extracted via llm: { mood: 'electric', untilMinutes: 360, ... }
```

### Common Issues

**Issue: Always falls back to patterns despite API key**

**Solution:** Check API key validity:
```bash
# Test Anthropic
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-3-haiku-20240307","max_tokens":10,"messages":[{"role":"user","content":"hi"}]}'

# Test OpenAI
curl https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-3.5-turbo","messages":[{"role":"user","content":"hi"}],"max_tokens":10}'
```

**Issue: LLM returns empty object `{}`**

**Cause:** Query is too vague (e.g., "something fun")

**Solution:** This is expected behavior. System falls back to patterns/defaults.

## Cost Analysis

### Monthly Cost Estimates

**Scenario: 10,000 queries/month**
- 100% LLM (Claude): 10,000 × $0.0002 = **$2/month**
- 50% LLM, 50% pattern: **$1/month**
- 100% pattern: **$0/month**

**Recommendation:** Use LLM for production (negligible cost, much better accuracy)

## Migration Guide

### From Old System (No Extraction)

**Before:**
```typescript
// Free text was ignored
POST /api/ask { freeText: "..." }
→ Returns defaults only
```

**After:**
```typescript
// Free text is parsed
POST /api/ask { freeText: "electric music tonight" }
→ Returns { mood: "electric", untilMinutes: 360, ... }
```

**Breaking Changes:** None (API contract unchanged)

### Rollback Plan

If LLM extraction causes issues:

```bash
# Instant rollback to patterns only
DISABLE_LLM_INTENT="true"
```

No code changes needed.

---

## Summary

You now have **two methods** for intent extraction:

1. **LLM-based** (Claude/GPT) — Accurate, handles complex queries, tiny cost (~$0.0002/query)
2. **Pattern-based** — Fast, free, handles common patterns

Both are production-ready. The system automatically falls back if LLM fails.

**Recommended Configuration:**
```bash
LLM_INTENT_MODEL="auto"
DISABLE_LLM_INTENT="false"
```

This gives you best accuracy with cost safety nets.
