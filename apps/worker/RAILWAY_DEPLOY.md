# Deploy CityPass Worker to Railway

## Quick Start

1. **Go to Railway Dashboard**
   - Visit https://railway.app/dashboard
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your `CityPass` repository
   - Choose `/apps/worker` as the root directory

2. **Configure Environment Variables**

   Add these environment variables in Railway:

   ```
   DATABASE_URL=postgresql://postgres:JfWnsUut6f7XSEMA@eoabuyvlsakqkuqtkwxo.db.us-west-2.nhost.run:5432/eoabuyvlsakqkuqtkwxo

   OPENAI_API_KEY=<your-openai-api-key>

   # Optional: Typesense (if you want search indexing)
   TYPESENSE_HOST=<your-typesense-host>
   TYPESENSE_PORT=8108
   TYPESENSE_PROTOCOL=https
   TYPESENSE_API_KEY=<your-typesense-api-key>

   # Optional: Firecrawl (for web scraping)
   FIRECRAWL_API_KEY=<your-firecrawl-api-key>

   # Optional: Apify (for additional scraping)
   APIFY_API_TOKEN=<your-apify-token>

   # Worker Configuration
   CITYLENS_SEED_INTERVAL=600000
   CITYLENS_QUEUE_INTERVAL=60000
   CITYLENS_MIN_SEED_EVENTS=12
   ```

3. **Deploy**
   - Railway will automatically detect the `railway.json` and use the `Dockerfile`
   - The build uses a multi-stage Docker build optimized for monorepo structure
   - Click "Deploy" (or trigger redeploy if already deployed)
   - Monitor logs in Railway dashboard

4. **Verify Deployment**
   - Check logs for: `👷 CityPass Worker starting...`
   - Should see: `✅ Worker cycle complete`

## What the Worker Does

The worker runs several cron jobs:

- **seed-events**: Every 10 minutes - Ensures minimum event inventory
- **ingestion-queue**: Every 1 minute - Processes user ingestion requests
- **social-embed-index**: Every 15 minutes - Indexes social media content
- **graph-similarity-refresh**: Every 24 hours - Updates event relationships

## Monitoring

- **Logs**: Railway Dashboard → Logs tab
- **Metrics**: Railway Dashboard → Metrics tab
- **Restart**: Railway Dashboard → Settings → Restart

## Troubleshooting

### Worker not starting
- Check DATABASE_URL is correct
- Verify all required env vars are set
- Check logs for specific error messages

### Database connection errors
- Ensure DATABASE_URL includes SSL mode if required
- Verify database is accessible from Railway's network
- Check firewall rules on Nhost

### Out of memory
- Worker uses ~512MB RAM on average
- Railway free tier provides 512MB, upgrade if needed
- Monitor in Railway Dashboard → Metrics

## Cost

**Railway Free Tier:**
- $5 credit per month
- ~500 hours of execution time
- Worker should fit comfortably in free tier

**If you exceed free tier:**
- Hobby plan: $5/month for additional resources
- Worker typically costs <$2/month on paid plan
