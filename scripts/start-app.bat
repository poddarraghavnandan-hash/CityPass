@echo off
REM CityPass Application Startup Script
REM This script starts all required services for the CityPass application

echo ========================================
echo CityPass Application Startup
echo ========================================
echo.

REM Check if Docker Desktop is running
echo [1/4] Checking Docker Desktop status...
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker Desktop is not running!
    echo.
    echo Please start Docker Desktop manually:
    echo 1. Press Windows key
    echo 2. Search for "Docker Desktop"
    echo 3. Click to launch Docker Desktop
    echo 4. Wait for the whale icon in system tray to become stable
    echo 5. Run this script again
    echo.
    pause
    exit /b 1
)
echo Docker Desktop is running ✓
echo.

REM Start database services
echo [2/4] Starting database services...
cd /d "%~dp0\..\infra"
docker-compose -f docker-compose.yaml up -d
if %errorlevel% neq 0 (
    echo ERROR: Failed to start database services
    pause
    exit /b 1
)
echo Database services started ✓
echo.

REM Wait for services to be ready
echo [3/4] Waiting for services to initialize (30 seconds)...
timeout /t 30 /nobreak >nul
echo Services initialized ✓
echo.

REM Generate Prisma client and run migrations
echo [4/4] Setting up database schema...
cd /d "%~dp0\.."
call pnpm db:generate
call pnpm db:push
echo Database schema ready ✓
echo.

echo ========================================
echo All services started successfully!
echo ========================================
echo.
echo You can now start the application with:
echo   pnpm dev:web
echo.
echo Application will be available at:
echo   http://localhost:3001
echo.
pause
