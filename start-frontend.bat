@echo off
echo =============================================
echo  IdentiScope - Frontend Startup
echo =============================================
echo.
cd /d "%~dp0frontend"

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo [ERROR] Node.js is not installed or not in PATH.
  echo Please install Node.js 18+ from: https://nodejs.org/
  pause
  exit /b 1
)

echo [OK] Node found:
node --version
echo.

if not exist "node_modules" (
  echo [INFO] Installing dependencies...
  npm install
)

echo.
echo [INFO] Starting frontend dev server on http://localhost:5173
npm run dev
pause
