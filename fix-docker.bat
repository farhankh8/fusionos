@echo off
echo.
echo  ========================================
echo   Fix Docker Desktop - Run as ADMIN
echo  ========================================
echo.

:: Stop WSL
echo  [1/4] Stopping WSL...
wsl --shutdown
timeout /t 3 /nobreak >nul

:: Restart WSL service
echo  [2/4] Restarting WSL service...
net stop WslService 2>nul
timeout /t 2 /nobreak >nul
net start WslService 2>nul
timeout /t 5 /nobreak >nul

:: Kill Docker Desktop if running
echo  [3/4] Restarting Docker Desktop...
taskkill /f /im "Docker Desktop.exe" 2>nul
timeout /t 3 /nobreak >nul

:: Start Docker Desktop
echo  [4/4] Starting Docker Desktop...
start "" "C:\Users\KHfar\AppData\Local\Programs\DockerDesktop\Docker Desktop.exe"
echo.
echo  Docker Desktop is starting...
echo  Wait 30 seconds, then run: docker ps
echo.
pause
