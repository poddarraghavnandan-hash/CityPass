# CityPass 🎭

**Discover everything happening in your city** — A ClassPass-style event aggregator powered by agentic web scraping.

CityPass automatically discovers, extracts, and indexes events from venues, promoters, and ticketing sites across the web. Built with modern infrastructure and AI-powered extraction.

---

## 🌟 Features

- **Agentic Web Scraping**: LangGraph-powered pipeline that intelligently chooses between Firecrawl and Apify
- **AI Event Extraction**: Anthropic Claude extracts structured event data from any HTML/text
- **Smart Deduplication**: Content hashing and canonical URL matching prevent duplicates
- **Fast Search**: Typesense provides instant filtering by date, category, price, and location
- **Change Detection**: Only re-index when event details actually change
- **Multi-City Ready**: Built to scale from NYC to any city
- **Automated Workflows**: n8n orchestrates scheduled crawls and webhook routing

### CityLens Chat (`/chat`)

- Voice or text prompts that stream grounded answers from `/api/plan`
- Inline slate tabs (Best, Wildcard, Close & Easy) with “Why this?” reasons
- Actions for save/route/calendar plus deep links back to the `/feed` experience
- Mic button uses Web Speech API and falls back to typing automatically

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          CityPass Stack                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐     ┌──────────┐     ┌──────────────────────┐   │
│  │  Next.js │────▶│  Prisma  │────▶│  PostgreSQL          │   │
│  │  Web App │     │  (ORM)   │     │  (Supabase optional) │   │
│  └──────────┘     └──────────┘     └──────────────────────┘   │
│       │                                                          │
│       │                                                          │
│       ▼                                                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Typesense Search                                         │  │
│  │  • Full-text search                                       │  │
│  │  • Faceted filtering (category, date, price)             │  │
│  │  • Geo search (lat/lon)                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  LangGraph Worker (Agentic Pipeline)                     │  │
│  │                                                            │  │
│  │  Discover → Crawl → Extract → Validate → Geocode →       │  │
│  │            Upsert → Index                                  │  │
│  │                                                            │  │
│  │  • Firecrawl (clean markdown)                             │  │
│  │  • Apify (fallback for complex sites)                     │  │
│  │  • Anthropic (LLM extraction to JSON)                     │  │
│  │  • Mapbox (geocoding)                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  n8n Orchestrator                                         │  │
│  │  • Scheduled crawls (hourly)                              │  │
│  │  • Webhook routing (Firecrawl/Apify → API)               │  │
│  │  • Health checks & alerts                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Monorepo Structure

```
citypass/
├── apps/
│   ├── web/              # Next.js app (UI + API routes)
│   ├── worker/           # LangGraph agentic pipeline
│   └── n8n/              # n8n workflow configs
├── packages/
│   ├── db/               # Prisma schema + client
│   ├── types/            # Zod schemas + TypeScript types
│   └── utils/            # Shared utilities (hashing, retry, etc.)
├── infra/
│   └── docker-compose.yaml
├── .env.example
├── Makefile
├── package.json          # pnpm workspace root
└── README.md
```

---

## 🚀 One-Shot Setup

### Prerequisites

- **Node.js** 18+ and **pnpm** 8+
- **Docker** & Docker Compose
- **API Keys**:
  - Anthropic (for LLM extraction)
  - Firecrawl (for clean scraping)
  - Apify (for fallback scraping)
  - Mapbox (for geocoding)
  - (Optional) PostHog (for analytics)

### Quick Start

```bash
# Clone the repo
git clone <your-repo-url>
cd citypass

# Copy environment template
cp .env.example .env

# Edit .env with your API keys
# At minimum, set:
#   - DATABASE_URL
#   - ANTHROPIC_API_KEY
#   - FIRECRAWL_API_KEY
#   - APIFY_API_KEY
#   - MAPBOX_API_KEY
#   - TYPESENSE_API_KEY

# One-shot setup (installs deps, starts services, runs migrations, seeds DB)
make setup

# Start dev servers
make dev
```

**That's it!** Open:
- Web app: http://localhost:3000
- n8n: http://localhost:5678
- Typesense: http://localhost:8108

---

## 🔧 Manual Setup

If you prefer step-by-step:

```bash
# 1. Install dependencies
pnpm install

# 2. Start infrastructure services
docker-compose up -d

# 3. Push database schema
pnpm db:push

# 4. Seed initial sources
pnpm --filter @citypass/db seed

# 5. Initialize Typesense collection (auto-created on first API call)

# 6. Start dev servers
pnpm dev
```

---

## 🧪 Running Tests

The acceptance tests validate the full pipeline: HTML → LLM extraction → DB upsert → Typesense index → search.

```bash
# Run all tests (requires services running)
pnpm --filter @citypass/web test

# Run with verbose output
pnpm --filter @citypass/web test -- --verbose
```

**Test fixtures**:
- `apps/web/__tests__/fixtures/bowery-ballroom.html` (music events)
- `apps/web/__tests__/fixtures/comedy-cellar.html` (comedy events)
- `apps/web/__tests__/fixtures/free-yoga.html` (free fitness event)

---

## 📚 Key Components

### 1. Event Schema (Zod + Prisma)

Events follow this JSON schema (see spec in [packages/types/src/index.ts](packages/types/src/index.ts)):

```typescript
{
  source_url: string,      // Required
  title: string,           // Required
  city: string,            // Required
  start_time: string,      // ISO 8601, required
  category: "music" | "comedy" | "theatre" | ...,
  venue_name?: string,
  address?: string,
  lat?: number,
  lon?: number,
  price_min?: number,
  price_max?: number,
  ...
}
```

### 2. Extraction (Anthropic Tool Calling)

See [apps/web/src/lib/extraction.ts](apps/web/src/lib/extraction.ts):

```typescript
import { extractEventsFromContent } from '@/lib/extraction';

const events = await extractEventsFromContent(
  html,
  'https://venue.com/events',
  'New York'
);
// Returns: EventData[]
```

Claude Sonnet 4.5 extracts structured JSON using tool calling.

### 3. Deduplication

Two mechanisms:
1. **Canonical URL hash + start_time** unique constraint in DB
2. **Content checksum** (MD5 of relevant fields) for change detection

See [packages/utils/src/index.ts](packages/utils/src/index.ts).

### 4. LangGraph Agentic Pipeline

See [apps/worker/src/graph.ts](apps/worker/src/graph.ts):

```
Discover → Crawl (Firecrawl or Apify) → Extract → Validate →
Geocode → Upsert → Index
```

**Decision nodes**:
- If Firecrawl rate-limited → switch to Apify
- If extraction fails → retry up to 3 times
- If content unchanged (checksum match) → skip re-index

### 5. API Routes

| Endpoint | Description |
|----------|-------------|
| `GET /api/events` | Search events (supports filters: city, category, date, price) |
| `GET /api/events/[id]` | Get single event |
| `POST /api/ingest` | Ingest HTML/markdown and extract events |
| `POST /api/webhooks/firecrawl` | Firecrawl webhook handler |
| `POST /api/webhooks/apify` | Apify webhook handler |
| `GET /api/admin/sources` | List all sources |
| `POST /api/admin/trigger-crawl` | Manually trigger crawl |

---

## 🔄 Workflow: Adding a New Source

1. **Add to database** (via seed or admin UI):

```typescript
await prisma.source.create({
  data: {
    name: 'Brooklyn Steel',
    url: 'https://www.brooklynsteel.com/events',
    domain: 'brooklynsteel.com',
    city: 'New York',
    sourceType: 'VENUE',
    category: 'MUSIC',
    crawlMethod: 'FIRECRAWL',
    active: true,
  },
});
```

2. **Trigger crawl** (via admin or n8n schedule):

```bash
curl -X POST http://localhost:3000/api/admin/trigger-crawl \
  -H "Content-Type: application/json" \
  -d '{"sourceId": "SOURCE_ID"}'
```

3. **LangGraph worker** runs the pipeline:
   - Discovers URLs
   - Crawls with Firecrawl
   - Extracts events with Claude
   - Geocodes addresses
   - Upserts to Postgres
   - Indexes to Typesense

4. **Events appear** in search results instantly!

---

## 🌐 Web App Features

### Search & Filters

- **Text search** across title, description, venue
- **Category filter**: Music, Comedy, Theatre, Dance, etc.
- **Price filter**: Free, <$20, <$50, <$100
- **Date range** (future: calendar picker)
- **Neighborhood** faceting

### Event Cards

- Image, title, subtitle
- Venue + neighborhood
- Date + time
- Price range
- "Book Tickets" CTA (if `booking_url` available)

### Admin Dashboard

- **Sources page** (`/admin/sources`): View all sources, trigger manual crawls
- **Jobs page** (TODO): View crawl history, success rates, errors

---

## 🛠️ Development

### Database Migrations

```bash
# Generate Prisma client after schema changes
pnpm db:generate

# Push schema to dev DB (no migrations)
pnpm db:push

# Create migration for production
pnpm db:migrate

# Open Prisma Studio (DB GUI)
pnpm db:studio
```

### Environment Variables

See [.env.example](.env.example) for all required keys.

**Critical for production**:
- `WEBHOOK_SECRET`: Verify webhook authenticity
- `N8N_ENCRYPTION_KEY`: Secure n8n credentials
- `DATABASE_URL`: Use Supabase or managed Postgres

### n8n Workflows

Access n8n at http://localhost:5678.

**Recommended workflows**:
1. **Scheduled Crawler**: Runs every hour, triggers all active sources
2. **Webhook Router**: Receives Firecrawl/Apify webhooks, forwards to API
3. **Health Monitor**: Pings API every 5 min, alerts on failures

Import/export workflows via n8n UI.

---

## 🧩 Extending CityPass

### Add a New City

1. Update seed sources with new city URLs
2. Modify geocoding to handle new city's timezone
3. (Optional) Add city-specific filters in UI

### Add a New Category

1. Add to `EventCategory` enum in [packages/db/prisma/schema.prisma](packages/db/prisma/schema.prisma)
2. Update Zod schema in [packages/types/src/index.ts](packages/types/src/index.ts)
3. Re-generate Prisma client: `pnpm db:generate`

### Custom Crawl Logic

Override discover/crawl nodes in worker for specific domains:

```typescript
// apps/worker/src/nodes/discover.ts
if (state.sourceDomain === 'eventbrite.com') {
  // Custom logic: paginate through all pages
}
```

---

## 🐛 Troubleshooting

### "No events found"

- Check if sources are active: `SELECT * FROM sources WHERE active = true;`
- Run manual crawl: `/admin/sources` → "Trigger Crawl"
- Check logs for extraction errors

### Typesense connection errors

```bash
docker-compose ps
# Ensure typesense is running

curl http://localhost:8108/health
# Should return {"ok":true}
```

### LLM extraction fails

- Verify `ANTHROPIC_API_KEY` in `.env`
- Check API quota/rate limits
- Review extraction logs for malformed HTML

### Database issues

```bash
# Reset database (DESTRUCTIVE)
docker-compose down -v
docker-compose up -d postgres
pnpm db:push
pnpm --filter @citypass/db seed
```

---

## 📊 Performance & Scaling

### Current Capacity

- **Events**: Millions (Postgres + Typesense can handle it)
- **Concurrent crawls**: Limited by Firecrawl/Apify rate limits
- **Search latency**: <50ms (Typesense is blazing fast)

### Scaling Strategies

1. **Horizontal worker scaling**: Run multiple worker instances with job queue (BullMQ, etc.)
2. **Caching**: Add Redis for API responses
3. **CDN**: Cache event images via Cloudflare
4. **Database sharding**: Partition by city for multi-region

---

## CityLens Windows Runbook

```powershell
# Prereqs
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
npm i -g pnpm

# 1) Install deps
pnpm i

# 2) Set env (staging or prod)
# Example (PowerShell):
setx CITYLENS_ENABLED true
setx DATABASE_URL "<YOUR_PROD_OR_STAGING_DB_URL>"
setx DIRECT_URL "<YOUR_PROD_OR_STAGING_DB_URL>"
setx TYPESENSE_HOST "<host>"
setx TYPESENSE_API_KEY "<key>"
setx TYPESENSE_PROTOCOL "https"
setx TYPESENSE_PORT "443"
setx QDRANT_URL "<url>"
setx QDRANT_API_KEY "<key>"
setx SOCIAL_OEMBED_CACHE_TTL "3600"
# (plus existing NextAuth/Supabase/Mapbox, etc.)

# 3) Dev (uses live/staging data)
pnpm --filter @citypass/web dev
# open http://localhost:3000/feed

# 4) Run tests (read-only staging)
setx FREEZE_TIME_ISO "2025-11-09T21:00:00Z"
pnpm --filter @citypass/web test

# 5) Build & start
pnpm --filter @citypass/web build
pnpm --filter @citypass/web start
```

### Deterministic CityLens tests

1. Export the staging read-only envs (see `.env.example`) plus `CITYLENS_TEST_BASE_URL` pointing to a running `@citypass/web` instance.
2. Provide `STAGING_STABLE_EVENT_IDS` (comma separated) so the tests and `/feed` query can lock to deterministic cards.
3. Install the Playwright browser once locally: `pnpm --filter @citypass/web exec playwright install chromium`.
4. To refresh the committed visual baselines, run `CITYLENS_UPDATE_SNAPSHOTS=true pnpm --filter @citypass/web test -- citylens.spec.ts`.

Budgets enforced:

- `/tests/api/lens.recommend.spec.ts` → validates ranked payloads, sponsorship gating, and reasons.
- `/tests/visual/citylens.spec.ts` → screenshots Home Feed, mood shift, and context modal (≤2% diff).
- `/tests/perf/citylens.lighthouse.spec.ts` → Lighthouse mobile budget (LCP ≤2.5s, CLS ≤0.05, TBT ≤350 ms).

## 🤝 Contributing

We welcome contributions! Areas for improvement:

- [ ] Map view (integrate Mapbox GL)
- [ ] User accounts & saved events (Supabase Auth)
- [ ] Email digest subscriptions
- [ ] More cities (SF, LA, Chicago, etc.)
- [ ] Mobile app (React Native)
- [ ] Advanced deduplication (fuzzy matching venues)

---

## 📄 License

MIT License - see LICENSE file

---

## 🙏 Acknowledgments

Built with:
- [Next.js](https://nextjs.org/) - Web framework
- [Prisma](https://www.prisma.io/) - Database ORM
- [Typesense](https://typesense.org/) - Search engine
- [LangGraph](https://github.com/langchain-ai/langgraph) - Agentic workflows
- [Anthropic Claude](https://www.anthropic.com/) - LLM extraction
- [Firecrawl](https://firecrawl.dev/) - Web scraping
- [Apify](https://apify.com/) - Backup scraping
- [n8n](https://n8n.io/) - Workflow automation
- [shadcn/ui](https://ui.shadcn.com/) - UI components

---

## 📬 Contact

Questions? Open an issue or reach out to the team.

**Happy event discovering!** 🎉
