# CityPass - Production Deployment Guide

**Complete step-by-step guide for deploying CityPass to production on Windows**

---

## 📋 Prerequisites

### Accounts & Services (Create Once)
- [ ] GitHub account with repo access
- [ ] [Vercel](https://vercel.com) account (Next.js web/API)
- [ ] [Supabase](https://supabase.com) project (Postgres database)
- [ ] [Typesense Cloud](https://cloud.typesense.org) cluster (search)
- [ ] [Qdrant Cloud](https://cloud.qdrant.io) cluster (vectors)
- [ ] [Railway](https://railway.app) account (worker deployment)
- [ ] [n8n Cloud](https://n8n.io) OR Railway for self-hosted n8n
- [ ] [Mapbox](https://mapbox.com) account (maps)
- [ ] [Anthropic](https://console.anthropic.com) account (Claude API)
- [ ] Google Cloud Console (OAuth)
- [ ] Domain registrar (optional, can add later)

### Local Tools (Windows)
```powershell
# Set execution policy
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser

# Install pnpm globally
npm install -g pnpm@8

# Install Railway CLI
npm install -g @railway/cli

# Verify installations
node --version  # Should be v20+
pnpm --version  # Should be 8.x
railway --version
```

---

## 🗂️ Step 1: Repository Setup

### 1.1 Create GitHub Repository
```powershell
# Navigate to project
cd C:\Users\ragha\citypass

# Initialize git (if not done)
git init
git add .
git commit -m "Initial commit: CityPass v3 production-ready"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/citypass.git
git branch -M main
git push -u origin main
```

### 1.2 Branch Strategy
```powershell
# Create dev branch for staging
git checkout -b dev
git push -u origin dev

# Set main as protected
# Go to GitHub → Settings → Branches → Add rule for main
# Enable: Require pull request reviews, Require status checks
```

---

## 🗄️ Step 2: Database Setup (Supabase)

### 2.1 Create Supabase Project
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New project"
3. Choose organization, name: `citypass-prod`, region: closest to users
4. Generate strong password, save it
5. Wait for project provisioning (~2 minutes)

### 2.2 Get Connection Strings
```
Project Settings → Database

Copy these:
- Connection string (Transaction mode - for migrations)
  postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres

- Connection pooling (Session mode - for app)
  postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

Save as:
- `DATABASE_URL` = Pooled connection (session mode)
- `DIRECT_URL` = Direct connection (transaction mode)

### 2.3 Run Migrations
```powershell
# Set environment variable temporarily
$env:DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"

# Install dependencies
pnpm install

# Generate Prisma client
pnpm --filter @citypass/db generate

# Run migrations
pnpm --filter @citypass/db prisma migrate deploy

# Verify
pnpm --filter @citypass/db prisma studio
# Opens browser, check tables exist
```

### 2.4 Seed Data (Optional)
```powershell
# Run seed script
pnpm --filter @citypass/db prisma db seed
# Or: pnpm tsx packages/db/src/seed.ts
```

---

## 🔍 Step 3: Typesense Setup

### 3.1 Create Cluster
1. Go to [https://cloud.typesense.org](https://cloud.typesense.org)
2. Create new cluster
   - Name: `citypass-prod`
   - Region: Same as your users
   - Plan: Start with Development ($0.03/hr)
3. Wait for provisioning

### 3.2 Get Credentials
```
Cluster → Overview

Save:
- Host: xxx-1.a1.typesense.net
- Port: 443
- Protocol: https
- Admin API Key: [shown once, save it!]
```

### 3.3 Initialize Collections
```powershell
# Set environment variables
$env:TYPESENSE_HOST="xxx-1.a1.typesense.net"
$env:TYPESENSE_PORT="443"
$env:TYPESENSE_PROTOCOL="https"
$env:TYPESENSE_API_KEY="your_api_key_here"

# Run setup script
pnpm tsx scripts/ensure-typesense.ts

# Expected output:
# ✅ Connected to Typesense (healthy)
# ✅ Collection 'events' created successfully
```

---

## 🎯 Step 4: Qdrant Setup

### 4.1 Create Cluster
1. Go to [https://cloud.qdrant.io](https://cloud.qdrant.io)
2. Create new cluster
   - Name: `citypass-prod`
   - Cloud: AWS (same region as Supabase)
   - Plan: Free tier (1GB)
3. Wait for provisioning

### 4.2 Get Credentials
```
Cluster → Overview

Save:
- URL: https://xxx-xxx.aws.cloud.qdrant.io
- API Key: [generate in Settings]
```

### 4.3 Initialize Collection
```powershell
# Set environment variables
$env:QDRANT_URL="https://xxx-xxx.aws.cloud.qdrant.io"
$env:QDRANT_API_KEY="your_api_key_here"

# Run setup script
pnpm tsx scripts/ensure-qdrant.ts

# Expected output:
# ✅ Connected to Qdrant (status: enabled)
# ✅ Collection 'events' created
# ✅ Payload indexes created
```

---

## 🚀 Step 5: Deploy Web App (Vercel)

### 5.1 Import Project
1. Go to [https://vercel.com/new](https://vercel.com/new)
2. Import from GitHub
3. Select repository: `YOUR_USERNAME/citypass`
4. Framework Preset: Next.js (auto-detected)
5. Root Directory: `./` (leave default)
6. Build Command: `pnpm build`
7. Output Directory: `.next` (auto)
8. Install Command: `pnpm install --frozen-lockfile`

### 5.2 Configure Build Settings
```
Build & Development Settings:

Framework Preset: Next.js
Build Command: pnpm build
Output Directory: (leave default)
Install Command: pnpm install --frozen-lockfile
Development Command: pnpm dev
```

### 5.3 Add Environment Variables
Go to Project Settings → Environment Variables

**Add all these for Production environment:**

```bash
# Database
DATABASE_URL=postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres

# Typesense
TYPESENSE_HOST=xxx-1.a1.typesense.net
TYPESENSE_PORT=443
TYPESENSE_PROTOCOL=https
TYPESENSE_API_KEY=your_api_key_here

# Qdrant
QDRANT_URL=https://xxx-xxx.aws.cloud.qdrant.io
QDRANT_API_KEY=your_api_key_here

# Mapbox
MAPBOX_TOKEN=pk.eyJ1Ijoi...

# NextAuth (generate secret: openssl rand -base64 32)
NEXTAUTH_SECRET=[RANDOM_32_CHARS]
NEXTAUTH_URL=https://your-app.vercel.app
GOOGLE_CLIENT_ID=123456789.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...

# App
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

### 5.4 Deploy
Click "Deploy"

Wait for build (~3-5 minutes)

### 5.5 Add Custom Domain (Optional)
1. Go to Project Settings → Domains
2. Add your domain: `citypass.com`
3. Follow DNS configuration wizard
4. Update `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` to use custom domain
5. Redeploy

---

## 🤖 Step 6: Deploy Worker (Railway)

### 6.1 Login to Railway
```powershell
railway login
```

### 6.2 Create New Project
```powershell
# Create project
railway init

# Link to GitHub
railway link

# Or create from scratch
cd C:\Users\ragha\citypass
railway init --name citypass-worker
```

### 6.3 Add Environment Variables
```powershell
# Go to Railway dashboard or use CLI
railway variables set DATABASE_URL="postgresql://..."
railway variables set DIRECT_URL="postgresql://..."
railway variables set TYPESENSE_HOST="xxx-1.a1.typesense.net"
railway variables set TYPESENSE_PORT="443"
railway variables set TYPESENSE_PROTOCOL="https"
railway variables set TYPESENSE_API_KEY="your_key"
railway variables set QDRANT_URL="https://..."
railway variables set QDRANT_API_KEY="your_key"
railway variables set ANTHROPIC_API_KEY="sk-ant-..."
railway variables set FIRECRAWL_API_KEY="fc-..."
railway variables set APIFY_TOKEN="apify_api_..."
railway variables set MAPBOX_TOKEN="pk.eyJ..."
railway variables set NODE_ENV="production"
railway variables set PORT="3003"
```

Or use Railway Dashboard:
1. Go to project → Variables
2. Add all variables from `infra/env.sample.matrix.md`
3. Mark as "Production"

### 6.4 Configure Service
```powershell
# Create railway.json in root (already created at infra/railway.worker.json)

# Deploy using Dockerfile
railway up --service worker

# Or let Railway auto-detect
railway up
```

### 6.5 Set Start Command
In Railway Dashboard:
- Service → Settings → Start Command
- Set: `pnpm --filter @citypass/worker start`

### 6.6 Enable Health Checks
- Service → Settings → Healthcheck Path
- Set: `/health`
- Timeout: 30s

### 6.7 Deploy
```powershell
railway up
```

Get deployment URL:
```powershell
railway domain
```

Save this URL for GitHub Actions secrets as `WORKER_URL`

---

## 🔄 Step 7: Setup n8n (Orchestration)

### Option A: n8n Cloud (Easiest)
1. Go to [https://n8n.io](https://n8n.io)
2. Sign up for cloud plan
3. Import workflows from `infra/n8n/` (to be created)
4. Update webhook URLs to production domain

### Option B: Self-hosted on Railway
```powershell
# Create new Railway service
railway service create --name n8n

# Add variables
railway variables set N8N_BASIC_AUTH_ACTIVE=true
railway variables set N8N_BASIC_AUTH_USER=admin
railway variables set N8N_BASIC_AUTH_PASSWORD=[STRONG_PASSWORD]
railway variables set WEBHOOK_URL=https://your-app.vercel.app
railway variables set N8N_HOST=your-n8n.railway.app
railway variables set N8N_PORT=5678
railway variables set NODE_ENV=production

# Deploy n8n image
railway service deploy --image n8nio/n8n:latest
```

### 7.1 Import Workflows
1. Download workflows from `infra/n8n/`
2. Go to n8n → Workflows → Import
3. Upload each JSON file
4. Update webhook URLs in each workflow:
   - Replace `http://localhost:3001` with `https://your-app.vercel.app`

### 7.2 Configure Schedules
1. **Hourly Crawl**: Set cron to `0 * * * *` (every hour)
2. **Weekly Discovery**: Set cron to `0 2 * * 0` (2 AM every Sunday)

---

## ✅ Step 8: Configure OAuth (Google)

### 8.1 Create OAuth Application
1. Go to [https://console.cloud.google.com](https://console.cloud.google.com)
2. Create new project: `CityPass`
3. Enable APIs: Google+ API, People API
4. Go to Credentials → Create OAuth 2.0 Client ID
5. Application type: Web application
6. Authorized JavaScript origins:
   ```
   https://your-app.vercel.app
   https://citypass.com
   ```
7. Authorized redirect URIs:
   ```
   https://your-app.vercel.app/api/auth/callback/google
   https://citypass.com/api/auth/callback/google
   ```
8. Save Client ID and Client Secret

### 8.2 Update Vercel Variables
Add to Vercel:
```
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
```

Redeploy web app

---

## 🔐 Step 9: Setup GitHub Secrets (CI/CD)

Go to GitHub repo → Settings → Secrets and variables → Actions

Add these secrets:
```
DATABASE_URL = [Supabase connection string]
RAILWAY_TOKEN = [Get from: railway whoami]
WORKER_URL = [Railway worker URL with /health]
```

---

## 🧪 Step 10: Post-Deployment Validation

### 10.1 Run Health Checks
```powershell
# Set environment variables
$env:WEB_URL="https://your-app.vercel.app"
$env:WORKER_URL="https://your-worker.railway.app"
$env:TYPESENSE_HOST="xxx-1.a1.typesense.net"
$env:TYPESENSE_PORT="443"
$env:TYPESENSE_PROTOCOL="https"
$env:TYPESENSE_API_KEY="your_key"
$env:QDRANT_URL="https://..."

# Run post-deploy check
pnpm tsx scripts/post-deploy-check.ts

# Expected output:
# ✅ Web App (123ms)
# ✅ Worker (234ms)
# ✅ Typesense (45ms)
# ✅ Qdrant (67ms)
# 🎉 All systems operational!
```

### 10.2 Smoke Test Checklist
- [ ] Homepage loads: `https://your-app.vercel.app`
- [ ] Map renders correctly
- [ ] Search returns results
- [ ] "Ask AI" works
- [ ] Login with Google works
- [ ] Consent banner appears
- [ ] Admin dashboard accessible: `/admin`
- [ ] Analytics dashboard shows data: `/admin/analytics`
- [ ] Health endpoints return 200:
  - `https://your-app.vercel.app/api/health`
  - `https://your-worker.railway.app/health`

### 10.3 Test Core Features
```powershell
# Test recommendation API
curl -X POST https://your-app.vercel.app/api/recommend \
  -H "Content-Type: application/json" \
  -d '{\"sessionId\": \"test\", \"city\": \"New York\", \"limit\": 10}'

# Test ad serving
curl -X POST https://your-app.vercel.app/api/ads/serve \
  -H "Content-Type: application/json" \
  -d '{\"sessionId\": \"test\", \"city\": \"New York\", \"slot\": \"FEED_P3\"}'

# Test analytics tracking
curl -X POST https://your-app.vercel.app/api/track \
  -H "Content-Type: application/json" \
  -d '{\"sessionId\": \"test\", \"events\": [{\"type\": \"VIEW\", \"city\": \"New York\", \"occurredAt\": \"2025-11-05T12:00:00Z\"}]}'
```

---

## 🔄 Step 11: Continuous Deployment

### 11.1 Verify CI/CD
```powershell
# Create feature branch
git checkout -b feature/test-deploy

# Make a small change
echo "# Test" >> README.md
git add README.md
git commit -m "test: CI/CD pipeline"
git push origin feature/test-deploy

# Create PR on GitHub
# Check that CI runs:
# - Lint & Typecheck
# - Test
# - Build
```

### 11.2 Deploy to Production
```powershell
# Merge to main (via GitHub PR)
# Vercel auto-deploys web
# Railway auto-deploys worker (via GitHub Action)

# Monitor deployments:
# - Vercel: https://vercel.com/dashboard
# - Railway: https://railway.app/dashboard
```

---

## 🚨 Step 12: Rollback Plan

### Vercel Rollback
1. Go to Vercel Dashboard → Deployments
2. Find previous working deployment
3. Click "..." → "Promote to Production"

### Railway Rollback
```powershell
# List recent deployments
railway status

# Rollback to previous deployment
railway rollback
```

### Database Rollback
```powershell
# If migration failed, resolve and retry
pnpm --filter @citypass/db prisma migrate resolve --rolled-back "migration_name"

# Then redeploy
pnpm --filter @citypass/db prisma migrate deploy
```

---

## 🐛 Troubleshooting

### Build Fails on Vercel
**Error**: `Module not found: Can't resolve '@citypass/db'`

**Fix**:
```powershell
# Ensure prisma generate runs before build
# Add to package.json in apps/web:
{
  "scripts": {
    "prebuild": "pnpm --filter @citypass/db generate"
  }
}
```

### Worker Won't Start
**Error**: `Database connection failed`

**Fix**:
```powershell
# Check Railway environment variables
railway variables

# Ensure DATABASE_URL is set
# Test locally:
$env:DATABASE_URL="postgresql://..."
pnpm --filter @citypass/worker start
```

### Typesense Connection Timeout
**Error**: `ETIMEDOUT` or `ECONNREFUSED`

**Fix**:
```powershell
# 1. Check firewall rules in Typesense Cloud
# 2. Verify API key is correct
# 3. Test connection:
curl https://xxx-1.a1.typesense.net:443/health \
  -H "X-TYPESENSE-API-KEY: your_key"
```

### OAuth Redirect Mismatch
**Error**: `redirect_uri_mismatch`

**Fix**:
1. Go to Google Cloud Console
2. Check authorized redirect URIs match exactly
3. Include both Vercel URL and custom domain
4. No trailing slashes

### PowerShell Execution Policy Error
**Error**: `cannot be loaded because running scripts is disabled`

**Fix**:
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## 📊 Monitoring & Maintenance

### Set Up Monitoring
1. **Vercel**: Automatic monitoring included
2. **Railway**: Check Metrics tab
3. **Supabase**: Check Reports tab
4. **Optional**: Add [Sentry](https://sentry.io) for error tracking

### Regular Maintenance
- [ ] Check Supabase database size (upgrade plan if needed)
- [ ] Monitor Typesense query credits
- [ ] Review Qdrant storage usage
- [ ] Check Railway resource usage
- [ ] Review Vercel bandwidth usage
- [ ] Rotate API keys quarterly

### Backup Strategy
- **Database**: Supabase automatic daily backups
- **Code**: GitHub repository
- **Secrets**: Store in password manager (1Password, Bitwarden)

---

## 🎉 Deployment Complete!

Your CityPass platform is now live in production!

### Next Steps
1. [ ] Monitor error logs for first 24 hours
2. [ ] Run smoke tests daily for first week
3. [ ] Set up alerts for health check failures
4. [ ] Document any custom configurations
5. [ ] Share production URL with stakeholders

### Support Resources
- Vercel Docs: https://vercel.com/docs
- Railway Docs: https://docs.railway.app
- Supabase Docs: https://supabase.com/docs
- Typesense Docs: https://typesense.org/docs
- Qdrant Docs: https://qdrant.tech/documentation
- n8n Docs: https://docs.n8n.io

---

**Questions or issues?** Check troubleshooting section or create an issue on GitHub.
