@echo off
title FusionOS - Starting...
echo.
echo  ========================================
echo   FusionOS - Starting (Docker)
echo  ========================================
echo.

echo  [1/2] Starting Docker stack...
cd /d "%~dp0"
docker compose up -d
echo.
echo  [1/2] Waiting for health checks...
timeout /t 15 /nobreak >nul
docker ps

echo.
echo  [2/2] Opening browser...
start http://localhost:3000

echo.
echo  ========================================
echo   FusionOS is running!
echo  ========================================
echo   Web:     http://localhost:3000
echo   API:     http://localhost:3001
echo   DB:      postgresql://fusionos:postgres123@localhost:5432/fusionos
echo   Login:   admin@fusionos.dev / Admin@123
echo  ========================================
echo.
echo  Press any key to open status...
pause >nul
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo.
pause
