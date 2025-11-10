@echo off
echo.
echo ========================================
echo   CityPass - Vercel Deployment
echo ========================================
echo.

set VERCEL_TOKEN=NV6pRCdM96cCoorOUPXrd56G

echo [1/4] Deploying to Vercel...
vercel --token=%VERCEL_TOKEN% --prod --yes

echo.
echo ========================================
echo   Deployment Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Check deployment URL above
echo 2. Set environment variables in Vercel dashboard
echo 3. Redeploy after setting env vars
echo.
