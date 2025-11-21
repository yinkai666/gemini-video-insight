@echo off
echo =========================================
echo  Backend Server Startup Script
echo =========================================
echo.

if not exist "venv\Scripts\activate.bat" (
    echo [ERROR] Virtual environment not found!
    echo [ERROR] Please run start.bat first
    pause
    exit /b 1
)

echo [*] Starting backend server...
echo.
call venv\Scripts\activate.bat
python main.py

pause
