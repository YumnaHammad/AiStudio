# Run full stack locally (Docker Postgres + Redis, no Upstash/Neon needed)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

if (-not (Test-Path "$root\.env")) {
  Write-Host "Missing .env — run: npm run setup" -ForegroundColor Red
  exit 1
}

# Ensure Docker infra is up
$postgres = docker ps --filter "name=acs-postgres" --format "{{.Names}}" 2>$null
$redis = docker ps --filter "name=acs-redis" --format "{{.Names}}" 2>$null
if (-not $postgres -or -not $redis) {
  Write-Host "Starting Docker Postgres + Redis..." -ForegroundColor Yellow
  Push-Location $root
  npm run docker:infra
  Pop-Location
  Start-Sleep -Seconds 3
}

New-Item -ItemType Directory -Force -Path "$root\data\media" | Out-Null

# Free renderer port if stale
foreach ($port in @(3001)) {
  Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
    ForEach-Object {
      Write-Host "Freeing port $port (PID $($_.OwningProcess))..." -ForegroundColor Yellow
      Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
}

# Local overrides (session only — keeps cloud URLs in .env for deploy)
$env:DATABASE_URL = "postgresql://acs:acs_secret@localhost:5432/ai_content_studio?schema=public"
$env:REDIS_URL = "redis://localhost:6379"
$env:APP_URL = "http://localhost:3000"
$env:API_URL = "http://localhost:4000"
$env:NODE_ENV = "development"

Write-Host ""
Write-Host "=== AI Content Studio — Local Dev ===" -ForegroundColor Cyan
Write-Host "  Web:      http://localhost:3000" -ForegroundColor White
Write-Host "  API:      http://localhost:4000/api/v1" -ForegroundColor White
Write-Host "  Swagger:  http://localhost:4000/docs" -ForegroundColor White
Write-Host "  Login:    admin@aicontentstudio.local / Admin123!" -ForegroundColor Gray
Write-Host ""
Write-Host "Press Ctrl+C to stop all services.`n" -ForegroundColor Gray

Push-Location $root
try {
  npm run dev
} finally {
  Pop-Location
}
