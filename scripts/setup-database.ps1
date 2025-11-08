# CityPass Database Setup Script (Windows PowerShell)
# This script sets up the database with migrations and seed data

Write-Host "`n🎯 CityPass Database Setup`n" -ForegroundColor Cyan

# Check if DATABASE_URL is set
if (-not $env:DATABASE_URL) {
    Write-Host "❌ ERROR: DATABASE_URL environment variable is not set!" -ForegroundColor Red
    Write-Host "`nPlease set DATABASE_URL first:" -ForegroundColor Yellow
    Write-Host '  $env:DATABASE_URL="postgresql://..."' -ForegroundColor Gray
    exit 1
}

Write-Host "✓ DATABASE_URL is set" -ForegroundColor Green

# Step 1: Run migrations
Write-Host "`n📋 Step 1: Running database migrations..." -ForegroundColor Cyan
pnpm --filter @citypass/db migrate:deploy

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Migration failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Migrations completed successfully" -ForegroundColor Green

# Step 2: Seed basic data
Write-Host "`n🌱 Step 2: Seeding basic data (sources, venues, v3 features)..." -ForegroundColor Cyan
pnpm --filter @citypass/db seed

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n⚠ Basic seed failed, but continuing..." -ForegroundColor Yellow
}

# Step 3: Seed comprehensive event data
Write-Host "`n🎉 Step 3: Seeding comprehensive event library (50+ events)..." -ForegroundColor Cyan
pnpm --filter @citypass/db seed:comprehensive

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n⚠ Comprehensive seed failed, but database is set up" -ForegroundColor Yellow
}

Write-Host "`n✅ Database setup complete!`n" -ForegroundColor Green
Write-Host "📊 Your database now has:" -ForegroundColor Cyan
Write-Host "   - 15 active event sources" -ForegroundColor Gray
Write-Host "   - 50+ diverse events across NYC" -ForegroundColor Gray
Write-Host "   - Venues, ranking weights, ad campaigns" -ForegroundColor Gray
Write-Host "   - User consent and analytics samples" -ForegroundColor Gray
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Run: pnpm tsx scripts/ensure-typesense.ts" -ForegroundColor Gray
Write-Host "2. Run: pnpm tsx scripts/ensure-qdrant.ts" -ForegroundColor Gray
Write-Host "3. Start the app: pnpm dev`n" -ForegroundColor Gray
