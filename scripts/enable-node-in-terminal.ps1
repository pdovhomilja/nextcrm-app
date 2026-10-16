# Run once per terminal session when fnm is installed but `node` / `npx` are missing:
#   powershell -ExecutionPolicy Bypass -File .\scripts\enable-node-in-terminal.ps1

if (-not (Get-Command fnm -ErrorAction SilentlyContinue)) {
  Write-Host "fnm not found. Install Node from https://nodejs.org or: winget install Schniz.fnm"
  exit 1
}

fnm env --use-on-cd | Out-String | Invoke-Expression
fnm use default 2>$null | Out-Null

Write-Host "Node: $(node -v)"
Write-Host "npm:  $(npm -v)"
if (Get-Command pnpm -ErrorAction SilentlyContinue) { Write-Host "pnpm: $(pnpm -v)" }
