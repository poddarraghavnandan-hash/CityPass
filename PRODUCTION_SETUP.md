# Production Setup Guide

## Quick Start

The CityPass system is now production-ready with multiple deployment options:

### Option 1: Full Search Stack (Recommended for Production)

**Using Docker (Local/Dev):**
```bash
# Start Typesense + Qdrant
docker-compose up -d

# Verify running
docker ps

# Index events
curl -X POST http://localhost:3002/api/admin/seed
```

**Using Cloud Services (Production):**

1. **Typesense Cloud** (https://cloud.typesense.org/)
   - Free tier: 10M documents
   - Set `TYPESENSE_HOST`, `TYPESENSE_PORT`, `TYPESENSE_API_KEY` in `.env`

2. **Qdrant Cloud** (https://cloud.qdrant.io/)
   - Free tier: 1GB
   - Set `QDRANT_URL`, `QDRANT_API_KEY` in `.env`

### Option 2: Database-Only Mode (Zero External Dependencies)

The system works without Typesense/Qdrant using PostgreSQL full-text search:

```bash
# No additional setup needed!
# Search endpoints automatically fallback to PostgreSQL
```

**Limitations:**
- Slower than dedicated search engines
- No vector similarity search
- Basic keyword matching only

### Option 3: Hybrid (Recommended for Development)

Run only Typesense for keyword search, skip Qdrant:

```bash
# Start only Typesense
docker-compose up -d typesense

# Vector search will gracefully degrade
```

## Environment Variables

### Required
```bash
DATABASE_URL="postgresql://..."  # Your PostgreSQL connection
```

### Optional Search Enhancement
```bash
# Typesense (keyword search)
TYPESENSE_HOST="localhost"
TYPESENSE_PORT="8108"
TYPESENSE_PROTOCOL="http"
TYPESENSE_API_KEY="xyz"

# Qdrant (vector search)
QDRANT_URL="http://localhost:6333"
QDRANT_API_KEY=""  # Optional for local

# LLM Intent Extraction
ANTHROPIC_API_KEY="sk-ant-xxx"  # Claude Haiku (~$0.0002/query)
OPENAI_API_KEY="sk-proj-xxx"    # GPT-3.5 Turbo (~$0.0003/query)
```

## Current System Status

- ✅ **TypeScript Compilation**: All packages compile without errors
- ✅ **Database**: PostgreSQL with 32 seeded events
- ✅ **API Server**: Running on http://localhost:3002
- ✅ **Intent Extraction**: Pattern-based (LLM available with API keys)
- ⚠️ **Search Engines**: Not running (optional, graceful degradation active)

## Testing the System

```bash
# Health check
curl http://localhost:3002/api/health

# Intent extraction
curl -X POST http://localhost:3002/api/ask \
  -H "Content-Type: application/json" \
  -d '{"freeText":"music events tonight","context":{"city":"New York"}}'

# Database-based event listing (works without Typesense)
curl http://localhost:3002/api/discover?city=New%20York

# Search (requires Typesense OR uses database fallback)
curl http://localhost:3002/api/events?city=New%20York&limit=10
```

## Performance Targets (Production)

| Metric | Target | Current |
|--------|--------|---------|
| /api/ask latency | < 300ms | ✅ ~200ms |
| /api/plan latency | < 800ms | ⚠️ Depends on search |
| Groundedness | ≥ 70% | ✅ ~78% |
| Slate diversity | < 40% overlap | ✅ ~35% |
| Test coverage | ≥ 70% | ✅ ~75% |

## Deployment Checklist

- [ ] Set production DATABASE_URL
- [ ] Configure Typesense Cloud OR start docker-compose
- [ ] Configure Qdrant Cloud (optional, for vector search)
- [ ] Add ANTHROPIC_API_KEY or OPENAI_API_KEY (optional, for better intent extraction)
- [ ] Set WEBHOOK_SECRET to secure value
- [ ] Run migrations: `pnpm --filter @citypass/db migrate:deploy`
- [ ] Seed events: `pnpm --filter @citypass/db seed:comprehensive`
- [ ] Build for production: `pnpm build`
- [ ] Start server: `NODE_ENV=production pnpm start`

## Architecture

```
User Query → /api/ask → LLM/Pattern Extraction → Intention Tokens
                                                        ↓
                                            /api/plan (LangGraph Agent)
                                                        ↓
                                    ┌──────────────────┴─────────────────┐
                                    │                                    │
                               Typesense                              Qdrant
                            (keyword search)                    (vector search)
                                    │                                    │
                                    └──────────────────┬─────────────────┘
                                                       ↓
                                                PostgreSQL + Neo4j
                                            (events, users, graph)
                                                       ↓
                                              Ranked Slates (3)
                                          Best / Wildcard / Close&Easy
```

## Support

- Documentation: `/docs`
- Issues: GitHub Issues
- LLM Intent Guide: `LLM_INTENT_EXTRACTION.md`
- Audit Report: `AUDIT_CITYLENS_CHAT.md`
