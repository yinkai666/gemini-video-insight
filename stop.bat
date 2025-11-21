@echo off
echo =========================================
echo  Stop All Services
echo =========================================
echo.

set BACKEND_STOPPED=0
set FRONTEND_STOPPED=0

REM Stop backend server on port 8000
echo [*] Stopping backend server on port 8000...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8000" ^| find "LISTENING" 2^>nul') do (
    taskkill /PID %%a /F /T >nul 2>&1
    set BACKEND_STOPPED=1
)

if %BACKEND_STOPPED%==1 (
    echo [OK] Backend server stopped
) else (
    echo [--] No backend server found on port 8000
)

echo.

REM Stop frontend server on port 3000
echo [*] Stopping frontend server on port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING" 2^>nul') do (
    taskkill /PID %%a /F /T >nul 2>&1
    set FRONTEND_STOPPED=1
)

if %FRONTEND_STOPPED%==1 (
    echo [OK] Frontend server stopped
) else (
    echo [--] No frontend server found on port 3000
)

echo.

REM Fallback: Kill any remaining Python processes from this project
echo [*] Cleaning up Python processes...
for /f "tokens=2" %%a in ('tasklist /FI "IMAGENAME eq python.exe" /FO LIST ^| find "PID:" 2^>nul') do (
    REM Only kill if it's running main.py (check window title)
    wmic process where "ProcessId=%%a" get CommandLine 2>nul | find "main.py" >nul 2>&1
    if not errorlevel 1 (
        taskkill /PID %%a /F >nul 2>&1
        echo [OK] Killed Python process %%a
    )
)

echo.

REM Verify ports are free
timeout /t 1 /nobreak >nul
set PORTS_FREE=1

netstat -aon 2>nul | find ":8000" | find "LISTENING" >nul 2>&1
if not errorlevel 1 set PORTS_FREE=0

netstat -aon 2>nul | find ":3000" | find "LISTENING" >nul 2>&1
if not errorlevel 1 set PORTS_FREE=0

echo =========================================
if %PORTS_FREE%==1 (
    echo  All Services Stopped Successfully
) else (
    echo  WARNING: Some ports may still be in use
    echo  Try running this script again or restart
)
echo =========================================
echo.
