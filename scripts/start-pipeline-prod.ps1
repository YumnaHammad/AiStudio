# Start worker + renderer against production Neon/Upstash (from .env)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

if (-not (Test-Path "$root\.env")) {
  Write-Host "Missing .env at repo root" -ForegroundColor Red
  exit 1
}

New-Item -ItemType Directory -Force -Path "$root\data\media" | Out-Null

Write-Host "Starting production pipeline (worker + renderer)..." -ForegroundColor Cyan
Write-Host "Uses DATABASE_URL and REDIS_URL from .env" -ForegroundColor Gray
Write-Host "Press Ctrl+C to stop.`n" -ForegroundColor Gray

Push-Location $root
try {
  npm run pipeline:prod
}
finally {
  Pop-Location
}
