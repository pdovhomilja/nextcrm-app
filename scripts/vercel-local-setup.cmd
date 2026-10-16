@echo off
REM Works when PowerShell blocks npx.ps1 (execution policy). Run from repo root.
cd /d "%~dp0.."

where fnm >nul 2>&1
if %ERRORLEVEL%==0 (
  for /f "delims=" %%i in ('fnm env --use-on-cd') do %%i
  call fnm use default >nul 2>&1
)

echo Node:
node -v
if %ERRORLEVEL% neq 0 (
  echo Install Node or run fnm first.
  pause
  exit /b 1
)

echo.
echo 1/3 Vercel login (browser opens)...
call npx.cmd --yes vercel@latest login

echo.
echo 2/3 Link project...
call npx.cmd --yes vercel@latest link --yes

echo.
echo 3/3 Pull env to .env.local...
call npx.cmd --yes vercel@latest env pull .env.local --environment=production --yes

echo.
echo Done. Run local app with: npx.cmd vercel dev
pause
