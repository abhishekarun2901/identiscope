@echo off
echo =============================================
echo  IdentiScope - Backend Startup
echo =============================================
echo.

where go >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo [ERROR] Go is not installed or not in PATH.
  echo.
  echo Please install Go 1.22+ from: https://go.dev/dl/
  echo After installing, restart this terminal and run this script again.
  pause
  exit /b 1
)

echo [OK] Go found:
go version
echo.

echo [INFO] Downloading dependencies...
cd /d "%~dp0backend"
go mod tidy
if %ERRORLEVEL% NEQ 0 (
  echo [ERROR] Failed to download dependencies.
  pause
  exit /b 1
)

echo.
echo [INFO] Starting backend server on http://localhost:8080
go run .
pause
