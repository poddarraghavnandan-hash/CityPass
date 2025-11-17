# Worker Integration - Ollama Event Extraction

## What Changed

Added the new Firecrawl + Ollama extraction system to the worker cron scheduler.

### New Cron Job: `extract-venue-events`

**Schedule:** Every 60 minutes (configurable via `EXTRACT_INTERVAL` env var)

**What it does:**
1. Scrapes all 14 active NYC venue websites using Firecrawl
2. Extracts events using LLM fallback chain:
   - OpenAI GPT-4o-mini (primary)
   - Claude 3.5 Haiku (backup 1)
   - **Ollama Cloud gpt-oss:20b** (backup 2) ✅ **Active**
   - HuggingFace (backup 3)
3. Saves events to Nhost PostgreSQL database
4. Handles deduplication automatically

### Configuration

**Environment Variables Required:**
```bash
# Ollama Cloud (Active)
OLLAMA_HOST=https://ollama.com
OLLAMA_API_KEY=21b584ba741b4dab9d9a0637daa28a21.tfTzoi8hPjkzVQhrB7GZIKzg

# Firecrawl (Scraping)
FIRECRAWL_API_KEY=fc-43ab4b031dd048639763061c8c739a22

# Optional - for fallback
OPENAI_API_KEY=sk-... (no credits currently)
ANTHROPIC_API_KEY=sk-ant-... (no credits currently)
HUGGINGFACE_API_KEY=hf_... (optional)

# Interval Configuration
EXTRACT_INTERVAL=3600000  # 60 minutes in milliseconds (default)
SCRAPE_INTERVAL=3600000   # 60 minutes for legacy scrapers (default)
```

### File Changes

**Modified:** `apps/worker/src/cron.ts`
- Added import for `processAllSources` from event-crawler
- Added new job: `extract-venue-events`
- Runs hourly alongside existing scrapers

## How to Start the Worker

### Development
```bash
# Start worker in development mode
pnpm --filter @citypass/worker dev
```

### Production
```bash
# Build and start worker
pnpm --filter @citypass/worker build
pnpm --filter @citypass/worker start
```

### Docker (if configured)
```bash
docker-compose up worker
```

## Current Venues (14 total)

### Music Venues (5)
1. Bowery Ballroom ✅ **Working** (17 events extracted)
2. Brooklyn Bowl
3. Music Hall of Williamsburg
4. Blue Note Jazz Club
5. Rough Trade NYC

### Comedy Venues (2)
6. Comedy Cellar
7. Gotham Comedy Club

### Arts & Culture (3)
8. MoMA Events
9. Brooklyn Museum
10. The Met Museum

### Parks & Outdoor (2)
11. Prospect Park Events
12. Central Park Conservancy

### Food & Markets (2)
13. Smorgasburg ✅ **Working** (3 events extracted)
14. Brooklyn Flea

## Job Status Monitoring

The worker exposes job status via:
```typescript
import { getJobStatus } from './apps/worker/src/cron';

// Get current job status
const status = getJobStatus();
console.log(status);
```

Or via API endpoint (if health endpoint configured):
```bash
curl http://localhost:3001/health
```

## Performance

**With Ollama Cloud:**
- ~8-10 seconds per source
- ~2-3 minutes for all 14 sources
- Successfully extracted 20 events in initial run

**Cost:**
- Ollama Cloud: Free tier or paid depending on your plan
- Firecrawl: API usage-based pricing
- Total estimated: ~$0.10-0.20 per full cycle

## Logs

Worker logs show:
- `🔍 Scraping: [venue name]`
- `✓ Scraped X characters`
- `→ Trying OpenAI extraction...`
- `→ OpenAI failed, trying Claude...`
- `→ Claude failed, trying Ollama (local/cloud LLM)...`
- `✓ Ollama extracted X events`
- `✓ Created: [event name]`
- `✅ Completed: [venue] - Created X events`

## Next Steps

1. **Start the worker** to enable automatic hourly extraction
2. **Monitor logs** to ensure Ollama Cloud is working consistently
3. **Add more venues** to the source table in the database
4. **Scale up** by adding more cities or venue types

## Troubleshooting

### "Event crawler module not available"
- The worker can't find the event-crawler module
- Check that apps/web/src/lib/event-crawler.ts exists
- May need to rebuild the worker: `pnpm --filter @citypass/worker build`

### "Ollama extraction failing"
- Check OLLAMA_API_KEY is set in environment
- Check OLLAMA_HOST=https://ollama.com
- Verify API key is valid: `curl https://ollama.com/api/tags -H "Authorization: Bearer YOUR_KEY"`

### "No events extracted"
- Check scraping succeeded (should see "Scraped X characters")
- Check LLM extraction logs for errors
- Some venues may have minimal content or require different scraping strategies

---

**Last Updated:** January 17, 2025
**Status:** ✅ Integrated and ready for deployment
