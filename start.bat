@echo off
echo =========================================
echo  Gemini Video Insight - Startup Script
echo =========================================
echo.

REM Check if virtual environment exists
if not exist "venv\Scripts\activate.bat" (
    echo [*] Virtual environment not found!
    echo [*] Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment!
        pause
        exit /b 1
    )
    echo [OK] Virtual environment created
    echo.
    echo [*] Installing Python dependencies...
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies!
        pause
        exit /b 1
    )
    echo [OK] Python dependencies installed
) else (
    echo [OK] Virtual environment found
)

echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo [*] node_modules not found!
    echo [*] Installing frontend dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install frontend dependencies!
        pause
        exit /b 1
    )
    echo [OK] Frontend dependencies installed
) else (
    echo [OK] Frontend dependencies found
)

echo.
echo =========================================
echo  Starting Services...
echo =========================================
echo.

REM Start backend server using VBScript (hidden window)
echo [*] Starting backend server (hidden)...
echo Set ws = CreateObject("WScript.Shell") > "%TEMP%\start-backend.vbs"
echo ws.Run "cmd /c cd /d ""%CD%"" && venv\Scripts\activate.bat && python main.py", 0, False >> "%TEMP%\start-backend.vbs"
cscript //nologo "%TEMP%\start-backend.vbs" >nul
del "%TEMP%\start-backend.vbs"

REM Wait for backend to start
echo [*] Waiting for backend to start...
timeout /t 3 /nobreak >nul

REM Health check loop
:CHECK_BACKEND
curl -s http://localhost:8000/api/health >nul 2>&1
if errorlevel 1 (
    timeout /t 1 /nobreak >nul
    goto CHECK_BACKEND
)
echo [OK] Backend is ready

echo.
echo [*] Starting frontend server...

REM Wait a bit more for frontend to initialize
timeout /t 2 /nobreak >nul

REM Open browsers
echo [*] Opening browsers...
start http://localhost:3000
timeout /t 1 /nobreak >nul
start http://localhost:8000/status

echo.
echo =========================================
echo  Services Started Successfully!
echo =========================================
echo.
echo Frontend: http://localhost:3000
echo Status:   http://localhost:8000/status
echo Backend:  http://localhost:8000/docs
echo.
echo =========================================
echo  Frontend Server Running Below
echo =========================================
echo.
echo TIP: Press Ctrl+C to stop all services
echo.

REM Run frontend in current window
call npm run dev

REM If frontend exits, cleanup backend
echo.
echo [*] Stopping backend server...
call stop.bat

pause
