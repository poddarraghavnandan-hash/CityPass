# Vercel Deployment - Quick Start

## Current Status

### ✅ Configured Services (Production-Ready)
- **Supabase** - PostgreSQL database
- **Qdrant Cloud** - Vector search
- **Neo4j Aura** - Graph database
- **OpenAI** - LLM for extraction

### ⚠️ Needs Cloud Setup
- **Typesense Cloud** - Currently using localhost:8108
  - Sign up at: https://cloud.typesense.org/
  - Free tier available

### 📋 Optional (Can skip for MVP)
- Redis Cloud (caching - currently using local)
- Ollama (LLM - not needed for production, using OpenAI)

## Quick Deploy (5 Steps)

### Step 1: Install Vercel CLI
```bash
npm i -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```

### Step 3: Set Up Typesense Cloud
1. Go to https://cloud.typesense.org/
2. Create free account
3. Create a cluster
4. Note down:
   - Host (e.g., `xxx.a1.typesense.net`)
   - Port (usually `443`)
   - Protocol (`https`)
   - API Key

### Step 4: Configure Environment Variables

Option A - **Automated** (Recommended):
```bash
# Update .env with Typesense Cloud credentials first
pnpm deploy:setup
```

Option B - **Manual via CLI**:
```bash
# See DEPLOYMENT.md for full list of commands
vercel env add TYPESENSE_HOST production
# ... repeat for all variables
```

Option C - **Via Dashboard**:
1. Go to your project on vercel.com
2. Settings → Environment Variables
3. Add all variables from `.env.production.example`

### Step 5: Deploy!
```bash
# Preview deployment
pnpm deploy:preview

# Production deployment
pnpm deploy:prod
```

## Post-Deployment

### Run Database Migrations
```bash
# Point to production database
DATABASE_URL="your-production-db-url" pnpm db:push
```

### Verify Deployment
- ✅ Visit your Vercel URL
- ✅ Test search functionality
- ✅ Check logs: `vercel logs`

## Environment Variables Checklist

### Critical (Must Have)
- [ ] `DATABASE_URL` - Supabase PostgreSQL
- [ ] `TYPESENSE_HOST` - Typesense Cloud
- [ ] `TYPESENSE_API_KEY` - Typesense Cloud
- [ ] `OPENAI_API_KEY` - OpenAI
- [ ] `QDRANT_URL` - Qdrant Cloud
- [ ] `QDRANT_API_KEY` - Qdrant Cloud
- [ ] `NEO4J_URI` - Neo4j Aura
- [ ] `NEO4J_PASSWORD` - Neo4j Aura
- [ ] `NEXTAUTH_URL` - Your Vercel URL
- [ ] `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`

### Important
- [ ] `MAPBOX_API_KEY` - For maps
- [ ] `SUPABASE_ANON_KEY` - Client-side queries
- [ ] `NEXT_PUBLIC_API_URL` - Your Vercel URL

### Optional
- [ ] `ANTHROPIC_API_KEY` - Alternative LLM
- [ ] `NEXT_PUBLIC_POSTHOG_KEY` - Analytics
- [ ] `SENTRY_DSN` - Error tracking

## NPM Scripts Reference

```bash
# Development
pnpm dev                  # Start all services
pnpm build               # Build for production

# Deployment
pnpm deploy:setup        # Auto-configure Vercel env vars
pnpm deploy:preview      # Deploy preview
pnpm deploy:prod         # Deploy to production
pnpm deploy:env          # Pull env vars from Vercel

# Database
pnpm db:push             # Push schema changes
pnpm db:migrate          # Run migrations
pnpm db:studio           # Open Prisma Studio
```

## Troubleshooting

### Build Fails
```bash
# Check logs
vercel logs --follow

# Common issues:
# 1. Missing environment variables
# 2. TypeScript errors
# 3. Build timeout (increase in vercel.json)
```

### Runtime Errors
```bash
# Check function logs
vercel logs <deployment-url> --follow

# Common issues:
# 1. Database connection (check DATABASE_URL)
# 2. API keys invalid/missing
# 3. Service timeouts (check cloud service status)
```

### Typesense Issues
```bash
# Test connection
curl -H "X-TYPESENSE-API-KEY: your-key" \
  https://your-host.a1.typesense.net:443/health

# Should return: {"ok":true}
```

## Cost Estimate (Free Tiers)

| Service | Free Tier | Sufficient For |
|---------|-----------|----------------|
| Vercel | 100GB bandwidth, 100K function invocations | MVP + small traffic |
| Supabase | 500MB database, 2GB bandwidth | 10K+ events |
| Typesense Cloud | 0.5GB RAM | 100K+ searches/month |
| Qdrant Cloud | 1GB storage | 1M+ vectors |
| Neo4j Aura | 200K nodes, 400K relationships | Complex graphs |
| OpenAI | Pay-as-you-go | Variable (watch usage) |

**Total Monthly Cost (MVP)**: $0-20 (most free, OpenAI usage-based)

## Next Steps After Deployment

1. **Set up monitoring**
   - Enable Vercel Analytics
   - Configure Sentry (optional)
   - Set up PostHog (optional)

2. **Configure domain**
   - Add custom domain in Vercel dashboard
   - Update `NEXTAUTH_URL` with custom domain

3. **Set up CI/CD**
   - Connect GitHub repository
   - Auto-deploy on push to main

4. **Optimize**
   - Enable caching (Redis Cloud if needed)
   - Monitor OpenAI usage
   - Optimize database queries

## Support

- **Vercel**: https://vercel.com/docs
- **Deployment Guide**: See `DEPLOYMENT.md` for detailed instructions
- **Environment Template**: See `.env.production.example`

## Emergency Rollback

```bash
# List deployments
vercel ls

# Rollback to previous
vercel rollback <deployment-url>
```
