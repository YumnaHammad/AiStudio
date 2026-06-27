# Deploy AI Content Studio to Vercel (API + Web)
# Usage: npm run deploy:vercel
#        npm run deploy:vercel -- -DatabaseUrl "postgresql://..." -RedisUrl "rediss://..."

param(
  [string]$DatabaseUrl = "",
  [string]$RedisUrl = "",
  [switch]$SkipEnv,
  [switch]$ApiOnly,
  [switch]$WebOnly
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ApiDir = Join-Path $Root "apps\api"
$WebDir = Join-Path $Root "apps\web"
$EnvFile = Join-Path $Root ".env"

function Write-Step($n, $msg) { Write-Host "`n[$n] $msg" -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host "  OK  $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  !!  $msg" -ForegroundColor Yellow }

function Read-DotEnv($path) {
  $vars = @{}
  if (-not (Test-Path $path)) { return $vars }
  Get-Content $path | ForEach-Object {
    if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
      $vars[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'")
    }
  }
  return $vars
}

function New-RandomSecret([int]$bytes = 32) {
  $buf = New-Object byte[] $bytes
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($buf)
  return ([BitConverter]::ToString($buf) -replace '-', '').ToLower()
}

function Set-VercelEnvVar($dir, $name, $value) {
  if ([string]::IsNullOrWhiteSpace($value)) { return }
  Push-Location $dir
  try {
    vercel env add $name production --value $value --yes --force 2>&1 | Out-Null
    Write-Ok "Set $name"
  } finally {
    Pop-Location
  }
}

function Ensure-VercelLinked($dir, $projectHint) {
  Push-Location $dir
  try {
    if (-not (Test-Path ".vercel\project.json")) {
      Write-Host "  Linking Vercel project in $dir ($projectHint)..." -ForegroundColor Gray
      Write-Host "  (Pick 'Create new project' or link an existing one when prompted)" -ForegroundColor Gray
      vercel link
    }
  } finally {
    Pop-Location
  }
}

function Get-DeployUrl($dir) {
  Push-Location $dir
  try {
    $out = vercel deploy --prod --yes 2>&1 | Out-String
    if ($out -match 'https://[^\s]+\.vercel\.app') {
      return $Matches[0].TrimEnd('/')
    }
    throw "Could not parse deploy URL. Output:`n$out"
  } finally {
    Pop-Location
  }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  AI Content Studio - Vercel Deploy" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta

# --- Prerequisites ---
Write-Step 1 "Checking prerequisites"

try {
  $whoami = vercel whoami 2>&1
  if ($LASTEXITCODE -ne 0) { throw "not logged in" }
  Write-Ok "Vercel CLI ready ($whoami)"
} catch {
  Write-Warn "Not logged in to Vercel. Running: vercel login"
  vercel login
}

if (-not (Test-Path $EnvFile)) {
  Write-Warn ".env not found — running npm run setup"
  Push-Location $Root; npm run setup; Pop-Location
}

$envVars = Read-DotEnv $EnvFile

# --- Cloud database (required for Vercel) ---
Write-Step 2 "Production database & Redis"

if (-not $DatabaseUrl) {
  $current = $envVars["DATABASE_URL"]
  if ($current -match 'localhost|127\.0\.0\.1') {
    Write-Warn "Local DATABASE_URL detected. Vercel needs a cloud Postgres URL."
    Write-Host "  Create free DB at https://neon.tech → copy connection string" -ForegroundColor Gray
    $DatabaseUrl = Read-Host "  Paste Neon DATABASE_URL"
  } else {
    $DatabaseUrl = $current
  }
}

if (-not $RedisUrl) {
  $current = $envVars["REDIS_URL"]
  if ($current -match 'localhost|127\.0\.0\.1|^redis://(?!.*@)') {
    Write-Warn "Local REDIS_URL detected. Vercel needs Upstash Redis."
    Write-Host "  Create free Redis at https://upstash.com → copy rediss:// URL" -ForegroundColor Gray
    $RedisUrl = Read-Host "  Paste Upstash REDIS_URL"
  } else {
    $RedisUrl = $current
  }
}

if (-not $envVars["JWT_ACCESS_SECRET"] -or $envVars["JWT_ACCESS_SECRET"] -match 'change-me') {
  $envVars["JWT_ACCESS_SECRET"] = New-RandomSecret 32
  Write-Ok "Generated JWT_ACCESS_SECRET"
}
if (-not $envVars["JWT_REFRESH_SECRET"] -or $envVars["JWT_REFRESH_SECRET"] -match 'change-me') {
  $envVars["JWT_REFRESH_SECRET"] = New-RandomSecret 32
  Write-Ok "Generated JWT_REFRESH_SECRET"
}
if (-not $envVars["ENCRYPTION_KEY"] -or $envVars["ENCRYPTION_KEY"] -match 'change-me') {
  $envVars["ENCRYPTION_KEY"] = New-RandomSecret 32
  Write-Ok "Generated ENCRYPTION_KEY"
}

# --- Deploy API ---
$apiUrl = $envVars["API_URL"]
if (-not $WebOnly) {
  Write-Step 3 "Deploy API (apps/api)"

  Ensure-VercelLinked $ApiDir "acs-api or ai-studio-api"

  if (-not $SkipEnv) {
    Write-Host "  Pushing environment variables to Vercel API project..." -ForegroundColor Gray
    Set-VercelEnvVar $ApiDir "NODE_ENV" "production"
    Set-VercelEnvVar $ApiDir "DATABASE_URL" $DatabaseUrl
    Set-VercelEnvVar $ApiDir "REDIS_URL" $RedisUrl
    Set-VercelEnvVar $ApiDir "JWT_ACCESS_SECRET" $envVars["JWT_ACCESS_SECRET"]
    Set-VercelEnvVar $ApiDir "JWT_REFRESH_SECRET" $envVars["JWT_REFRESH_SECRET"]
    Set-VercelEnvVar $ApiDir "JWT_ACCESS_EXPIRES_IN" $(if ($envVars["JWT_ACCESS_EXPIRES_IN"]) { $envVars["JWT_ACCESS_EXPIRES_IN"] } else { "15m" })
    Set-VercelEnvVar $ApiDir "JWT_REFRESH_EXPIRES_IN" $(if ($envVars["JWT_REFRESH_EXPIRES_IN"]) { $envVars["JWT_REFRESH_EXPIRES_IN"] } else { "7d" })
    Set-VercelEnvVar $ApiDir "ENCRYPTION_KEY" $envVars["ENCRYPTION_KEY"]
    Set-VercelEnvVar $ApiDir "OPENAI_API_KEY" $envVars["OPENAI_API_KEY"]
    Set-VercelEnvVar $ApiDir "PEXELS_API_KEY" $envVars["PEXELS_API_KEY"]
    Set-VercelEnvVar $ApiDir "PIXABAY_API_KEY" $envVars["PIXABAY_API_KEY"]
    Set-VercelEnvVar $ApiDir "COST_SAVER_MODE" $(if ($envVars["COST_SAVER_MODE"]) { $envVars["COST_SAVER_MODE"] } else { "true" })
    Set-VercelEnvVar $ApiDir "COST_SAVER_AUTO_APPROVE" $(if ($envVars["COST_SAVER_AUTO_APPROVE"]) { $envVars["COST_SAVER_AUTO_APPROVE"] } else { "true" })
  }

  Write-Host "  Building & deploying API (may take 2-3 min)..." -ForegroundColor Gray
  $apiUrl = Get-DeployUrl $ApiDir
  Write-Ok "API live at $apiUrl"

  Set-VercelEnvVar $ApiDir "API_URL" $apiUrl
  Push-Location $ApiDir
  vercel deploy --prod --yes 2>&1 | Out-Null
  Pop-Location
}

if ($ApiOnly) {
  Write-Step 4 "Run database migrations"
  Write-Host "  DATABASE_URL=`"$DatabaseUrl`" npm run db:migrate:deploy" -ForegroundColor White
  Write-Host ""
  Write-Host "Done. API: $apiUrl" -ForegroundColor Green
  exit 0
}

# --- Deploy Web ---
Write-Step 4 "Deploy Web (apps/web)"

if (-not $apiUrl) {
  $apiUrl = Read-Host "  Enter your API URL (e.g. https://ai-studio-api.vercel.app)"
}

Ensure-VercelLinked $WebDir "acs-web or ai-studio-web"

$apiBase = "$apiUrl/api/v1"
Set-VercelEnvVar $WebDir "NEXT_PUBLIC_API_URL" $apiBase

Write-Host "  Building & deploying frontend..." -ForegroundColor Gray
$webUrl = Get-DeployUrl $WebDir
Write-Ok "Web live at $webUrl"

# --- Wire CORS / APP_URL on API ---
if (-not $WebOnly -and $apiUrl) {
  Write-Step 5 "Connecting frontend ↔ API"
  Set-VercelEnvVar $ApiDir "APP_URL" $webUrl
  Set-VercelEnvVar $ApiDir "CORS_ORIGINS" $webUrl
  Write-Host "  Redeploying API with CORS..." -ForegroundColor Gray
  Push-Location $ApiDir
  vercel deploy --prod --yes 2>&1 | Out-Null
  Pop-Location
  Write-Ok "CORS configured for $webUrl"
}

# --- Migrations ---
Write-Step 6 "Database migrations (one-time)"
Write-Host "  Run this once against your Neon database:" -ForegroundColor Gray
Write-Host ""
Write-Host "  `$env:DATABASE_URL=`"$DatabaseUrl`"" -ForegroundColor White
Write-Host "  npm run db:migrate:deploy" -ForegroundColor White
Write-Host "  npm run db:seed" -ForegroundColor White
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "  Deploy complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Frontend:  $webUrl" -ForegroundColor White
Write-Host "  API:       $apiUrl/api/v1" -ForegroundColor White
Write-Host "  Health:    $apiUrl/api/v1/health" -ForegroundColor White
Write-Host ""
Write-Host "  Note: Video generation needs worker + renderer" -ForegroundColor Yellow
Write-Host "  on Render/Railway (not Vercel). Dashboard & login work now." -ForegroundColor Yellow
Write-Host ""
