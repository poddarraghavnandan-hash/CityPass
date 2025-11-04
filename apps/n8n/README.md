# n8n Workflows for CityPass

This directory contains n8n workflow automation configurations for CityPass.

## Workflows

### 1. Scheduled Crawl Workflow

This workflow runs on a schedule to trigger crawls of all active sources.

**Schedule**: Every hour
**Actions**:
1. Fetch active sources from database
2. For each source:
   - Trigger Firecrawl or Apify based on source config
   - Set webhook URL to receive results
   - Log job start in database

### 2. Webhook Handler Workflow

Receives webhooks from Firecrawl and Apify, forwards to ingestion API.

**Triggers**:
- `/webhooks/firecrawl`
- `/webhooks/apify`

**Actions**:
1. Validate webhook payload
2. Forward to Next.js API ingestion endpoint
3. Log results
4. Send alerts on failures

## Setup

1. Start n8n:
   ```bash
   docker-compose up -d n8n
   ```

2. Access n8n UI:
   ```
   http://localhost:5678
   ```

3. Login with credentials from `.env`:
   - Username: admin (or N8N_BASIC_AUTH_USER)
   - Password: change-me (or N8N_BASIC_AUTH_PASSWORD)

4. Import workflows:
   - Click "Import from File"
   - Select workflow JSON files from this directory

5. Configure webhook URLs:
   - Set Firecrawl webhook: `http://localhost:3000/api/webhooks/firecrawl`
   - Set Apify webhook: `http://localhost:3000/api/webhooks/apify`

## Workflow Files

Create these workflows in n8n UI:

### Scheduled Crawler
- **Trigger**: Cron (every hour)
- **Node 1**: HTTP Request to `/api/sources` to get active sources
- **Node 2**: Loop over sources
- **Node 3**: For each source, trigger appropriate crawler with webhook

### Health Check
- **Trigger**: Cron (every 5 minutes)
- **Node 1**: HTTP Request to `/api/health`
- **Node 2**: If fails, send alert (email/Slack/etc)

## Manual Trigger

To manually trigger a crawl for a specific source:

```bash
curl -X POST http://localhost:5678/webhook/manual-crawl \
  -H "Content-Type: application/json" \
  -d '{"sourceId": "SOURCE_ID_HERE"}'
```
