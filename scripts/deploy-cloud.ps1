# Deploy worker + renderer to Render (cloud — no PC needed)

Write-Host ""
Write-Host "=== AI Content Studio — Cloud Pipeline Deploy ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your web + API are on Vercel. Video generation needs ONE more service on Render." -ForegroundColor Gray
Write-Host "After this, you can close your PC — everything runs in the cloud." -ForegroundColor Gray
Write-Host ""

$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root ".env"

if (-not (Test-Path $envFile)) {
  Write-Host "ERROR: .env not found at $envFile" -ForegroundColor Red
  exit 1
}

Write-Host "Step 1: Push code to GitHub (if not already)" -ForegroundColor Yellow
Write-Host "  git push origin main" -ForegroundColor White
Write-Host ""

Write-Host "Step 2: Open Render Blueprint" -ForegroundColor Yellow
Write-Host "  https://dashboard.render.com/blueprints" -ForegroundColor White
Write-Host "  -> New Blueprint Instance -> Connect GitHub repo YumnaHammad/AiStudio" -ForegroundColor White
Write-Host ""

Write-Host "Step 3: When Render asks for env vars, paste from your .env:" -ForegroundColor Yellow
$keys = @(
  'DATABASE_URL', 'REDIS_URL', 'ENCRYPTION_KEY',
  'OPENAI_API_KEY', 'PEXELS_API_KEY', 'PIXABAY_API_KEY',
  'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_PUBLIC_URL'
)
foreach ($k in $keys) {
  $line = Get-Content $envFile | Where-Object { $_ -match "^$k=" } | Select-Object -First 1
  if ($line) {
    Write-Host "  [OK] $k" -ForegroundColor Green
  } else {
    Write-Host "  [MISSING] $k  <- fill this in .env first" -ForegroundColor Red
  }
}
Write-Host ""

Write-Host "Step 4: Click Apply. Render builds Docker image and starts worker+renderer." -ForegroundColor Yellow
Write-Host ""

Write-Host "Step 5: Add R2 vars to Vercel API project too (same R2_* values)" -ForegroundColor Yellow
Write-Host "  cd apps\api; vercel env add R2_ACCOUNT_ID production" -ForegroundColor White
Write-Host ""

Write-Host "Live URLs after deploy:" -ForegroundColor Cyan
Write-Host "  Web:  https://ai-studio-web-five.vercel.app"
Write-Host "  API:  https://ai-studio-api-ten.vercel.app"
Write-Host "  Pipeline: Render dashboard -> ai-studio-pipeline (logs)"
Write-Host ""

$r2missing = $keys | Where-Object { $_ -like 'R2_*' -or $_ -eq 'R2_ACCOUNT_ID' }
$hasR2 = (Get-Content $envFile | Select-String '^R2_ACCOUNT_ID=.+' -Quiet)
if (-not $hasR2) {
  Write-Host "R2 NOT CONFIGURED — videos cannot play on Vercel without this." -ForegroundColor Red
  Write-Host "Free setup: https://dash.cloudflare.com -> R2 -> Create bucket -> API token" -ForegroundColor Yellow
  Write-Host "Add R2_* to .env, Vercel API env, and Render blueprint." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Stop local pipeline if running (no longer needed after Render deploy):" -ForegroundColor Gray
Write-Host "  Close the start-pipeline-prod.ps1 terminal window" -ForegroundColor Gray
Write-Host ""
