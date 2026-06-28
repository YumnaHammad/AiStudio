# Start worker + renderer against production Neon/Upstash (from .env)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

if (-not (Test-Path "$root\.env")) {
  Write-Host "Missing .env at repo root" -ForegroundColor Red
  exit 1
}

New-Item -ItemType Directory -Force -Path "$root\data\media" | Out-Null

# Renderer media server uses 3001 — kill stale process if port is busy
foreach ($port in @(3001)) {
  Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
    ForEach-Object {
      Write-Host "Freeing port $port (PID $($_.OwningProcess))..." -ForegroundColor Yellow
      Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}
Start-Sleep -Seconds 1

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
