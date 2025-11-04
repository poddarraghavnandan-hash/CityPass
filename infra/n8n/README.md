# n8n Workflow Setup for CityPass

This directory contains automated workflows for CityPass event scraping.

## Access n8n

1. **Open n8n**: http://localhost:5678
2. **Login Credentials**:
   - Username: `admin` (from `N8N_BASIC_AUTH_USER` in `.env`)
   - Password: `change-me` (from `N8N_BASIC_AUTH_PASSWORD` in `.env`)

## Available Workflows

### 1. CityPass - Scheduled Crawler

**Location**: `workflows/citypass-scheduled-crawler.json`

**What it does:**
- Runs every hour (configurable)
- Fetches all active sources from the API
- Triggers crawl for each source
- Waits 5 seconds between sources to avoid rate limiting

**How to import:**

1. Open n8n at http://localhost:5678
2. Click **"Workflows"** in the left sidebar
3. Click **"Import from File"** button (top right)
4. Select `infra/n8n/workflows/citypass-scheduled-crawler.json`
5. Click **"Save"** after import
6. Click **"Active"** toggle to enable the workflow

## Workflow Configuration

### Schedule Trigger

- **Default**: Runs every 1 hour
- **Customizable**: Edit the "Schedule Trigger" node
  - Click the node
  - Adjust "Hours Interval" or change to daily/weekly

### API Endpoints Used

The workflow calls these CityPass endpoints:

1. **GET /api/admin/sources**
   - Returns list of active sources

2. **POST /api/admin/trigger-crawl**
   - Body: `{ "sourceId": "..." }`
   - Triggers crawl for a specific source

### Docker Network Note

The workflow uses `host.docker.internal:3000` to reach the Next.js app from inside the n8n Docker container. This allows n8n to communicate with your local development server.

## Creating Custom Workflows

### Example: Webhook Handler for Firecrawl

```json
{
  "name": "Firecrawl Webhook Handler",
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "webhookId": "firecrawl-webhook",
      "path": "firecrawl"
    },
    {
      "name": "Forward to API",
      "type": "n8n-nodes-base.httpRequest",
      "url": "http://host.docker.internal:3000/api/webhooks/firecrawl",
      "method": "POST"
    }
  ]
}
```

### Example: Health Monitor

```json
{
  "name": "CityPass Health Check",
  "nodes": [
    {
      "name": "Schedule",
      "type": "n8n-nodes-base.scheduleTrigger",
      "interval": "5m"
    },
    {
      "name": "Ping API",
      "type": "n8n-nodes-base.httpRequest",
      "url": "http://host.docker.internal:3000/api/events?limit=1"
    },
    {
      "name": "Check Response",
      "type": "n8n-nodes-base.if"
    }
  ]
}
```

## Troubleshooting

### Workflow not triggering

- Check if the workflow is **Active** (toggle in top right)
- Verify the schedule interval is set correctly
- Check n8n logs: `docker logs citypass_n8n`

### API calls failing

- Ensure Next.js dev server is running on port 3000
- Check that `host.docker.internal` resolves (Windows/Mac)
  - On Linux, use `172.17.0.1` or `--network=host`

### Authentication issues

- Default credentials are in `.env`:
  - User: `admin`
  - Pass: `change-me`
- Change them in production!

## Advanced Usage

### Adding Error Notifications

Add a **Send Email** or **Slack** node after failed crawls:

1. Add an **Error Trigger** node
2. Connect to **Send Email** or **Slack** node
3. Configure with your credentials

### Monitoring Metrics

Use the **PostHog** node to track:
- Crawl success/failure rates
- Number of events extracted
- Processing times

### Custom Retry Logic

Add a **Loop** node with conditional retry:
- Max 3 retries
- Exponential backoff (5s, 10s, 20s)

## Workflow Best Practices

1. **Always add error handlers** - Workflows should gracefully handle failures
2. **Use wait nodes** - Prevent rate limiting between API calls
3. **Log outputs** - Use **Set** nodes to log important data
4. **Test first** - Use "Execute Workflow" before activating
5. **Monitor executions** - Check "Executions" tab regularly

## Next Steps

1. Import the scheduled crawler workflow
2. Activate it
3. Monitor the first few runs
4. Customize the schedule as needed
5. Add error notifications (optional)

---

**Questions?** Check the n8n docs: https://docs.n8n.io
