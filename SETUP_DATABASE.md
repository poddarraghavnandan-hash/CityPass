# Nhost Database Setup Instructions

## Issue Identified

The database connection is failing with **SASL authentication failed** error. This means:
- ✅ The database server IS reachable at `eoabuyvlsakqkuqtkwxo.db.us-west-2.nhost.run:5432`
- ❌ The authentication is failing (likely incorrect password in the connection string)

## Solution: Run Migration SQL Directly in Nhost Dashboard

Since we cannot connect via Prisma due to authentication issues, we'll use Nhost's SQL Editor to set up the database schema directly.

### Steps:

1. **Open Nhost Dashboard**
   - Go to https://app.nhost.io/
   - Navigate to your project: `eoabuyvlsakqkuqtkwxo`

2. **Access SQL Editor**
   - Click on "Database" in the left sidebar
   - Click on "SQL Editor" or "Run SQL"

3. **Run the Migration**
   - Open the file: `packages/db/migration.sql`
   - Copy the entire contents
   - Paste into the Nhost SQL Editor
   - Click "Run" or "Execute"

4. **Verify Success**
   - After running, you should see all tables created
   - Check the "Tables" section in the Nhost dashboard to confirm

### Alternative: Fix Database Password

If you want to fix the direct connection:

1. In Nhost Dashboard, go to Database settings
2. Find or reset the PostgreSQL password
3. Update the `.env` file with the correct password:
   ```bash
   DATABASE_URL="postgresql://postgres:YOUR_ACTUAL_PASSWORD@eoabuyvlsakqkuqtkwxo.db.us-west-2.nhost.run:5432/eoabuyvlsakqkuqtkwxo"
   ```
4. Also update `packages/db/.env` with the same URL
5. Run migrations: `pnpm --filter @citypass/db migrate deploy`

## Tables That Will Be Created

The migration will create:
- **Event Management**: events, venues, sources, ingest_jobs, ingestion_requests
- **Search**: search_cache, event_vectors, discovery_logs
- **Authentication**: users, sessions, accounts, verification_tokens
- **User Data**: user_profiles, search_sessions, user_interactions, user_consents, user_blocklists
- **Analytics**: analytics_events, ranking_weights
- **Advertising**: ad_campaigns, ad_creatives, ad_targetings, ad_budgets, ad_impressions, ad_clicks, ad_conversions, ad_frequency_caps, ad_policies

## After Setup

Once the database schema is created, the Nhost authentication system will work with the magic link login at `/auth/login`.
