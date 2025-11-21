@echo off
echo =========================================
echo  Frontend Server Startup Script
echo =========================================
echo.

if not exist "node_modules" (
    echo [ERROR] node_modules not found!
    echo [ERROR] Please run start.bat first
    pause
    exit /b 1
)

echo [*] Starting frontend dev server...
echo.
npm run dev

pause
