# Environment Variables Matrix

## Required Variables by Service

| Variable | Vercel Web | Railway Worker | n8n | Notes |
|----------|:----------:|:--------------:|:---:|-------|
| **Database** |
| `DATABASE_URL` | ✅ | ✅ | ✅ | Supabase Postgres connection string |
| `DIRECT_URL` | ✅ | ✅ | | Direct connection (non-pooled) for migrations |
| **Search & Vectors** |
| `TYPESENSE_HOST` | ✅ | ✅ | | e.g., `xxx.a1.typesense.net` |
| `TYPESENSE_PORT` | ✅ | ✅ | | Usually `443` for cloud |
| `TYPESENSE_PROTOCOL` | ✅ | ✅ | | `https` for production |
| `TYPESENSE_API_KEY` | ✅ | ✅ | | Admin API key |
| `QDRANT_URL` | ✅ | ✅ | | e.g., `https://xxx.qdrant.tech` |
| `QDRANT_API_KEY` | ✅ | ✅ | | API key from Qdrant Cloud |
| **AI & LLM** |
| `ANTHROPIC_API_KEY` | | ✅ | | Claude API for event extraction |
| `OLLAMA_HOST` | | ✅ | | Optional: self-hosted LLM |
| **Scraping** |
| `FIRECRAWL_API_KEY` | | ✅ | ✅ | Firecrawl API key |
| `APIFY_TOKEN` | | ✅ | ✅ | Apify API token |
| `SERPAPI_KEY` | | ✅ | | Optional: web search |
| **Maps & Geo** |
| `MAPBOX_TOKEN` | ✅ | ✅ | | Mapbox API token |
| **Authentication** |
| `NEXTAUTH_SECRET` | ✅ | | | Random 32-char string |
| `NEXTAUTH_URL` | ✅ | | | Your production URL |
| `GOOGLE_CLIENT_ID` | ✅ | | | OAuth app client ID |
| `GOOGLE_CLIENT_SECRET` | ✅ | | | OAuth app secret |
| **Email (Optional)** |
| `EMAIL_SERVER` | ✅ | | | SMTP connection string |
| `EMAIL_FROM` | ✅ | | | From address for magic links |
| **Analytics (Optional)** |
| `POSTHOG_KEY` | ✅ | ✅ | | PostHog project API key |
| `POSTHOG_HOST` | ✅ | ✅ | | Usually `https://app.posthog.com` |
| **App Config** |
| `NEXT_PUBLIC_APP_URL` | ✅ | | | Public facing URL |
| `PORT` | | ✅ | | Health check port (default: 3003) |
| `NODE_ENV` | ✅ | ✅ | ✅ | `production` |

## Production Example Values

```bash
# DATABASE (Supabase)
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"

# SEARCH (Typesense Cloud)
TYPESENSE_HOST="xxx-1.a1.typesense.net"
TYPESENSE_PORT="443"
TYPESENSE_PROTOCOL="https"
TYPESENSE_API_KEY="xyz123..."

# VECTORS (Qdrant Cloud)
QDRANT_URL="https://xxx-xxx.aws.cloud.qdrant.io"
QDRANT_API_KEY="xyz123..."

# AI
ANTHROPIC_API_KEY="sk-ant-api03-..."

# SCRAPING
FIRECRAWL_API_KEY="fc-..."
APIFY_TOKEN="apify_api_..."

# MAPS
MAPBOX_TOKEN="pk.eyJ1Ijoi..."

# AUTH (NextAuth.js)
NEXTAUTH_SECRET="[RANDOM 32 CHARS - use: openssl rand -base64 32]"
NEXTAUTH_URL="https://citypass.com"
GOOGLE_CLIENT_ID="123456789.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-..."

# EMAIL (Optional - for magic links)
EMAIL_SERVER="smtp://user:pass@smtp.sendgrid.net:587"
EMAIL_FROM="noreply@citypass.com"

# ANALYTICS (Optional)
POSTHOG_KEY="phc_..."
POSTHOG_HOST="https://app.posthog.com"

# APP
NEXT_PUBLIC_APP_URL="https://citypass.com"
NODE_ENV="production"
```

## Setting Variables

### Vercel (Web/API)
1. Go to project settings → Environment Variables
2. Add all variables marked ✅ for "Vercel Web"
3. Select "Production" environment
4. Save

### Railway (Worker)
1. Go to service → Variables
2. Add all variables marked ✅ for "Railway Worker"
3. Redeploy after adding

### n8n (if self-hosted)
1. Set environment variables in Railway/Docker
2. Or use n8n's built-in credential management

## Security Notes

- ❌ **Never commit** `.env` files to Git
- ✅ **Use** different keys for production vs staging
- ✅ **Rotate** API keys regularly
- ✅ **Use** Vercel/Railway's secret management
- ✅ **Limit** API key permissions to minimum required
- ✅ **Enable** IP allowlisting where possible (Supabase, Typesense, Qdrant)
