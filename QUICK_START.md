# CityPass - Quick Start Guide

## Starting the Application

### Prerequisites
- Docker Desktop must be installed and running
- Node.js 18+ and pnpm installed

### Every Time You Start the App

#### Option 1: Automated Script (Recommended)
```bash
# Run the startup script
scripts/start-app.bat
```

#### Option 2: Manual Steps

1. **Start Docker Desktop**
   - Press Windows key
   - Search for "Docker Desktop"
   - Click to launch
   - Wait for the whale icon in system tray to stabilize

2. **Start Database Services**
   ```bash
   cd infra
   docker-compose up -d
   ```

3. **Wait 30 seconds** for services to initialize

4. **Generate Prisma Client** (if not already done)
   ```bash
   pnpm db:generate
   ```

5. **Start the Web Application**
   ```bash
   pnpm dev:web
   ```

6. **Access the App**
   - Open browser to: http://localhost:3001

### Database Services

The following services run in Docker:

| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL | 5432 | Main database |
| Typesense | 8108 | Search engine |
| Qdrant | 6333 | Vector database |
| Redis | 6379 | Cache |
| Ollama | 11434 | Local LLM (Llama 3.1 8B) |
| n8n | 5678 | Automation workflows |

### Troubleshooting

#### "Failed to connect to database"
- Docker Desktop is not running
- Run: `docker ps` to verify Docker is accessible
- If not, start Docker Desktop manually

#### "Port 3000 is in use"
- App will automatically use port 3001
- Or kill the process on port 3000:
  ```bash
  netstat -ano | findstr :3000
  taskkill /F /PID [process_id]
  ```

#### "Prisma Client not found"
- Run: `pnpm db:generate`
- Then restart the dev server

#### "Lock file error"
- Remove lock: `rm -rf apps/web/.next/dev/lock`
- Restart dev server

### Environment Variables

Required in `.env`:

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/citypass"

# AI/LLM
ANTHROPIC_API_KEY="sk-ant-..."
OPENAI_API_KEY="sk-..."
LLM_PROVIDER="auto"

# Ollama (Local)
OLLAMA_BASE_URL="http://localhost:11434"

# Search
TYPESENSE_API_KEY="xyz"
TYPESENSE_HOST="localhost"

# Vector DB
QDRANT_URL="http://localhost:6333"

# Cache
REDIS_URL="redis://localhost:6379"
```

### First Time Setup

If this is your first time running the app:

1. Copy environment file:
   ```bash
   cp .env.example .env
   ```

2. Add your API keys to `.env`:
   - ANTHROPIC_API_KEY
   - OPENAI_API_KEY (optional, for cost optimization)

3. Start Docker services:
   ```bash
   cd infra
   docker-compose up -d
   ```

4. Initialize database:
   ```bash
   pnpm db:generate
   pnpm db:push
   ```

5. (Optional) Seed with sample data:
   ```bash
   pnpm db:seed
   ```

6. Start the app:
   ```bash
   pnpm dev:web
   ```

### Development Workflow

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm db:generate

# Run database migrations
pnpm db:push

# Seed database
pnpm db:seed

# Start web app (port 3001)
pnpm dev:web

# Start worker (port 3002)
pnpm dev:worker

# Run both in parallel
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test
```

### Stopping the App

1. Stop Next.js dev server: `Ctrl+C`

2. Stop Docker services:
   ```bash
   cd infra
   docker-compose down
   ```

3. (Optional) Stop and remove volumes:
   ```bash
   docker-compose down -v
   ```

### Current Status

- ✅ App running on http://localhost:3001
- ⚠️ Database services need Docker Desktop to be started
- ⚠️ Privacy preferences, search, and authentication require database
