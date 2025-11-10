# CityPass Vercel Deployment Guide

## Prerequisites

Before deploying to Vercel, ensure you have cloud services set up for production:

### Required Cloud Services

1. **Database: Supabase** ✅ (Already configured)
   - URL: https://nuxkckkkovqhcrgypzin.supabase.co
   - Provides PostgreSQL database

2. **Vector Database: Qdrant Cloud** ✅ (Already configured)
   - URL: https://4c1e3a42-7861-4e97-845a-30bbe4f1780f.eu-west-1-0.aws.cloud.qdrant.io:6333

3. **Graph Database: Neo4j Aura** ✅ (Already configured)
   - URI: neo4j+s://62808db2.databases.neo4j.io

4. **Search: Typesense Cloud** ⚠️ (Needs setup)
   - Current: localhost:8108
   - Sign up at: https://cloud.typesense.org/
   - After setup, get:
     - TYPESENSE_HOST
     - TYPESENSE_PORT (usually 443)
     - TYPESENSE_PROTOCOL (https)
     - TYPESENSE_API_KEY

## Deployment Steps

### 1. Set Up Typesense Cloud

```bash
# Sign up at https://cloud.typesense.org/
# Create a cluster
# Note down the credentials
```

### 2. Install Vercel CLI

```bash
npm i -g vercel
```

### 3. Login to Vercel

```bash
vercel login
```

### 4. Link Project

```bash
vercel link
```

### 5. Set Environment Variables

Set all required environment variables in Vercel dashboard or via CLI:

```bash
# Database
vercel env add DATABASE_URL production
# Paste: postgresql://postgres:postgres@db.nuxkckkkovqhcrgypzin.supabase.co:5432/postgres

# Supabase
vercel env add SUPABASE_URL production
# Paste: https://nuxkckkkovqhcrgypzin.supabase.co

vercel env add SUPABASE_ANON_KEY production
# Paste your Supabase anon key

vercel env add SUPABASE_SERVICE_ROLE_KEY production
# Paste your Supabase service role key

# Typesense (Update with cloud values)
vercel env add TYPESENSE_HOST production
# Example: xxx.a1.typesense.net

vercel env add TYPESENSE_PORT production
# Usually: 443

vercel env add TYPESENSE_PROTOCOL production
# Usually: https

vercel env add TYPESENSE_API_KEY production
# Your Typesense cloud API key

# AI/LLM
vercel env add ANTHROPIC_API_KEY production
# Your Anthropic API key

vercel env add OPENAI_API_KEY production
# Your OpenAI API key

vercel env add LLM_PROVIDER production
# auto

# Qdrant
vercel env add QDRANT_URL production
# Paste: https://4c1e3a42-7861-4e97-845a-30bbe4f1780f.eu-west-1-0.aws.cloud.qdrant.io:6333

vercel env add QDRANT_API_KEY production
# Your Qdrant API key

# Neo4j
vercel env add NEO4J_URI production
# Paste: neo4j+s://62808db2.databases.neo4j.io

vercel env add NEO4J_USERNAME production
# neo4j

vercel env add NEO4J_PASSWORD production
# Your Neo4j password

vercel env add NEO4J_DATABASE production
# neo4j

# NextAuth
vercel env add NEXTAUTH_URL production
# Your production URL (e.g., https://citypass.vercel.app)

vercel env add NEXTAUTH_SECRET production
# Generate with: openssl rand -base64 32

# Mapbox
vercel env add MAPBOX_API_KEY production
# Your Mapbox API key

# Public variables
vercel env add NEXT_PUBLIC_API_URL production
# Your production URL

vercel env add NEXT_PUBLIC_POSTHOG_KEY production
# Your PostHog key

vercel env add NEXT_PUBLIC_POSTHOG_HOST production
# https://app.posthog.com
```

### 6. Deploy

```bash
# Deploy to production
vercel --prod

# Or push to main branch (if auto-deployment is enabled)
git push origin main
```

## Environment Variables Reference

### Required for Web App

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJ...` |
| `TYPESENSE_HOST` | Typesense server host | `xxx.a1.typesense.net` |
| `TYPESENSE_PORT` | Typesense server port | `443` |
| `TYPESENSE_PROTOCOL` | HTTP protocol | `https` |
| `TYPESENSE_API_KEY` | Typesense API key | `xyz123` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-proj-...` |
| `QDRANT_URL` | Qdrant cloud URL | `https://xxx.cloud.qdrant.io:6333` |
| `QDRANT_API_KEY` | Qdrant API key | `eyJ...` |
| `NEO4J_URI` | Neo4j Aura connection URI | `neo4j+s://xxx.databases.neo4j.io` |
| `NEO4J_USERNAME` | Neo4j username | `neo4j` |
| `NEO4J_PASSWORD` | Neo4j password | `xxx` |
| `NEXTAUTH_URL` | NextAuth base URL | `https://citypass.vercel.app` |
| `NEXTAUTH_SECRET` | NextAuth secret | Generated random string |
| `MAPBOX_API_KEY` | Mapbox API key | `pk.eyJ...` |

### Public Variables (Client-side)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Public API URL | `https://citypass.vercel.app` |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog project key | `phc_...` |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog host | `https://app.posthog.com` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Anthropic API key (alternative LLM) | - |
| `LLM_PROVIDER` | LLM provider selection | `auto` |
| `OLLAMA_HOST` | Ollama host (not used in production) | - |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry error tracking | - |

## Post-Deployment Tasks

### 1. Run Database Migrations

```bash
# Set DATABASE_URL locally to production database
pnpm db:push
```

### 2. Initialize Typesense Collection

The collection will be auto-created on first use, or you can create it manually via the API.

### 3. Run Data Seeding (Optional)

```bash
# Only if you want to populate with initial data
pnpm --filter @citypass/db seed:comprehensive
```

### 4. Test the Deployment

- Visit your production URL
- Test search functionality
- Test authentication
- Check error tracking in Sentry (if configured)
- Monitor in PostHog (if configured)

## Continuous Deployment

Vercel automatically deploys when you push to your repository:

- **Production**: Push to `main` branch
- **Preview**: Push to any other branch

## Monitoring

- **Logs**: `vercel logs <deployment-url>`
- **Analytics**: Vercel Analytics (enable in dashboard)
- **Error Tracking**: Sentry (if configured)
- **User Analytics**: PostHog (if configured)

## Troubleshooting

### Build Fails

1. Check build logs: `vercel logs <deployment-url> --follow`
2. Ensure all environment variables are set
3. Check that monorepo structure is correct in `vercel.json`

### Runtime Errors

1. Check function logs in Vercel dashboard
2. Verify all cloud services are accessible
3. Check API keys are valid

### Database Connection Issues

1. Verify `DATABASE_URL` is correct
2. Check Supabase connection pooling settings
3. Ensure Vercel IP is allowlisted in Supabase (usually allowed by default)

## Scaling Considerations

- **Database**: Supabase auto-scales, monitor usage in dashboard
- **Qdrant**: Cloud plan supports auto-scaling
- **Neo4j**: Aura has different tiers, upgrade as needed
- **Typesense**: Cloud plan scales with usage
- **Vercel Functions**: Have 10s timeout on Hobby, 60s on Pro (configured in vercel.json)

## Cost Optimization

1. **Development**: Use local services (Docker) for dev
2. **Preview**: Use smaller cloud tiers for preview deployments
3. **Production**: Monitor usage and optimize as needed

## Security Checklist

- [ ] All environment variables are set as secrets in Vercel
- [ ] `NEXTAUTH_SECRET` is a strong random string
- [ ] Database credentials are not exposed in client-side code
- [ ] API keys are properly scoped (minimum required permissions)
- [ ] CORS is properly configured for your domain
- [ ] Rate limiting is enabled on API routes
- [ ] Sentry is configured for error monitoring
