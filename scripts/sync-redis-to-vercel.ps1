# Push REDIS_URL from .env to Vercel API (run after creating a new Upstash database)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root ".env"

if (-not (Test-Path $envFile)) {
  Write-Host "ERROR: .env not found" -ForegroundColor Red
  exit 1
}

$redisLine = Get-Content $envFile | Where-Object { $_ -match '^REDIS_URL=' } | Select-Object -First 1
if (-not $redisLine) {
  Write-Host "ERROR: REDIS_URL not set in .env" -ForegroundColor Red
  exit 1
}

$redisUrl = ($redisLine -split '=', 2)[1].Trim().Trim('"')
if ($redisUrl -match 'tight-possum-40159') {
  Write-Host "WARNING: Still using the exhausted Upstash database." -ForegroundColor Yellow
  Write-Host "Create a NEW free Redis at https://console.upstash.com/redis" -ForegroundColor Yellow
  Write-Host "Copy the rediss:// URL into .env REDIS_URL, then run this script again." -ForegroundColor Yellow
  exit 1
}

Write-Host "Updating REDIS_URL on Vercel (ai-studio-api)..." -ForegroundColor Cyan
Push-Location (Join-Path $root "apps\api")
try {
  $redisUrl | vercel env rm REDIS_URL production --yes 2>$null
  $redisUrl | vercel env add REDIS_URL production
  Write-Host "Redeploying API..." -ForegroundColor Cyan
  vercel --prod --yes
  Write-Host ""
  Write-Host "Done. Restart local pipeline: .\scripts\start-pipeline-prod.ps1" -ForegroundColor Green
} finally {
  Pop-Location
}
