@echo off
cd /d "%~dp0.."

where fnm >nul 2>&1
if %ERRORLEVEL%==0 (
  echo Activating Node via fnm...
  for /f "delims=" %%i in ('fnm env --use-on-cd') do %%i
  call fnm use default >nul 2>&1
)

where pnpm >nul 2>&1
if %ERRORLEVEL%==0 (
  set RUN=pnpm dlx
) else (
  set RUN=npx --yes
)

where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
  echo.
  echo ERROR: node not found. Run in PowerShell:
  echo   fnm env --use-on-cd ^| Out-String ^| Invoke-Expression
  echo   fnm use default
  echo Or install Node from https://nodejs.org
  pause
  exit /b 1
)

echo Linking Vercel project...
call %RUN% vercel@latest link --yes
echo Pulling production env into .env.local...
call %RUN% vercel@latest env pull .env.local --environment=production --yes
echo.
echo Done. Local dev: pnpm dlx vercel dev  or  npx vercel dev
pause
