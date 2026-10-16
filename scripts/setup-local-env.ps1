# Pull non-secret Vercel env into .env.local and link the project.
# Secret values show as [SENSITIVE] — use `pnpm dlx vercel dev` for local runs with full env,
# or copy secrets once from Vercel → Project → Settings → Environment Variables.
#
# Usage: .\scripts\setup-local-env.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "Linking to Vercel project (if needed)..."
pnpm dlx vercel@latest link --yes

Write-Host "Pulling Production env names into .env.local..."
pnpm dlx vercel@latest env pull .env.local --environment=production --yes

Write-Host ""
Write-Host "Done. .env.local is gitignored."
Write-Host "For local dev with real secrets, prefer: pnpm dlx vercel dev"
Write-Host "Production deploy uses Vercel dashboard secrets (already set for GROQ/GEMINI/OPENROUTER/DB)."
