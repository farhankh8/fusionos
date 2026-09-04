@echo off
title FusionOS - Starting...
echo.
echo  ========================================
echo   FusionOS - Starting Application
echo  ========================================
echo.

:: Check PostgreSQL
echo  [1/4] Checking PostgreSQL...
netstat -an | findstr ":5432 " | findstr "LISTENING" >nul
if %errorlevel% neq 0 (
    echo  ERROR: PostgreSQL not running on port 5432
    echo  Please start PostgreSQL from Services or pgAdmin
    pause
    exit /b 1
)
echo  OK - PostgreSQL running on port 5432

:: Build API if needed
echo  [2/4] Building API...
cd /d "%~dp0apps\api"
if not exist "dist\main.js" (
    call npx nest build
    echo  Built.
) else (
    echo  OK - Already built
)

:: Start API
echo  [3/4] Starting API on port 3001...
start "FusionOS API" cmd /c "node dist\main.js"
timeout /t 3 /nobreak >nul

:: Start Web
echo  [4/4] Starting Web on port 3000...
cd /d "%~dp0apps\web"
start "FusionOS Web" cmd /c "npm run dev"
timeout /t 5 /nobreak >nul

:: Open browser
echo.
echo  Opening browser...
start http://localhost:3000

echo.
echo  ========================================
echo   FusionOS is running!
echo  ========================================
echo   Web:  http://localhost:3000
echo   API:  http://localhost:3001
echo   Login: admin@fusionos.dev / Admin@123
echo  ========================================
echo.
echo  Press any key to stop both servers...
pause >nul

:: Cleanup
taskkill /fi "WINDOWTITLE eq FusionOS API" /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq FusionOS Web" /f >nul 2>&1
echo  Servers stopped.
