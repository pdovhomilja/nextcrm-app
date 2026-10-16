# Pull non-secret Vercel env into .env.local and link the project.
# Requires Node on PATH — if you use fnm, this script activates it first.
#
# Usage: powershell -ExecutionPolicy Bypass -File .\scripts\setup-local-env.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

if (Get-Command fnm -ErrorAction SilentlyContinue) {
  Write-Host "Activating Node via fnm..."
  fnm env --use-on-cd | Out-String | Invoke-Expression
  fnm use default 2>$null | Out-Null
}

function Invoke-VercelCli {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$CliArgs)
  if (Get-Command pnpm -ErrorAction SilentlyContinue) {
    & pnpm dlx @CliArgs
    return
  }
  $npx = Get-Command npx.cmd -ErrorAction SilentlyContinue
  if (-not $npx) { $npx = Get-Command npx -ErrorAction SilentlyContinue }
  if ($npx) {
    & $npx.Source --yes @CliArgs
    return
  }
  throw @"
Node/npm not found in PATH.
Install Node (https://nodejs.org) OR enable fnm in this terminal:
  fnm env --use-on-cd | Out-String | Invoke-Expression
  fnm use default
"@
}

Write-Host "Linking to Vercel project (if needed)..."
Invoke-VercelCli vercel@latest link --yes

Write-Host "Pulling Production env names into .env.local..."
Invoke-VercelCli vercel@latest env pull .env.local --environment=production --yes

Write-Host ""
Write-Host "Done. .env.local is gitignored."
Write-Host "Local dev with full secrets: pnpm dlx vercel dev   (or npx vercel dev)"
