.PHONY: dev setup install db-up db-push services-up seed test clean

# One-shot setup
setup:
	@echo "🚀 Setting up CityPass..."
	@cp .env.example .env
	@echo "📦 Installing dependencies..."
	@pnpm install
	@echo "🐳 Starting services..."
	@docker-compose up -d
	@sleep 5
	@echo "🗄️  Setting up database..."
	@pnpm db:push
	@echo "🌱 Seeding initial data..."
	@pnpm --filter @citypass/db seed
	@echo "✅ Setup complete! Run 'make dev' to start"

# Install dependencies
install:
	pnpm install

# Start all services (Typesense, n8n, postgres)
services-up:
	docker-compose up -d

# Start dev servers
dev:
	pnpm dev

# Database commands
db-up:
	docker-compose up -d postgres

db-push:
	pnpm db:push

db-migrate:
	pnpm db:migrate

db-studio:
	pnpm db:studio

# Seed test data
seed:
	pnpm --filter @citypass/db seed

# Run tests
test:
	pnpm test

# Clean everything
clean:
	docker-compose down -v
	rm -rf node_modules apps/*/node_modules packages/*/node_modules
	rm -rf apps/*/.next apps/*/dist packages/*/dist
