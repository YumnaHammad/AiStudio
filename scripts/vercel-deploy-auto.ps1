# Non-interactive Vercel deploy for AI Content Studio
$ErrorActionPreference = "Continue"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ApiDir = Join-Path $Root "apps\api"
$WebDir = Join-Path $Root "apps\web"
$EnvFile = Join-Path $Root ".env"

function Read-DotEnv($path) {
  $vars = @{}
  if (-not (Test-Path $path)) { throw ".env not found at $path" }
  Get-Content $path | ForEach-Object {
    if ($_ -match '^\s*#') { return }
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

function Set-VercelEnv($dir, $name, $value) {
  if ([string]::IsNullOrWhiteSpace($value)) { return }
  Push-Location $dir
  try {
    vercel env add $name production --value $value --yes --force 2>&1 | Out-Null
    Write-Host "  env: $name"
  } finally {
    Pop-Location
  }
}

function Deploy-Prod($dir) {
  Push-Location $dir
  try {
    $out = vercel deploy --prod --yes 2>&1 | Out-String
    Write-Host $out
    if ($out -match 'https://[^\s]+\.vercel\.app') {
      return $Matches[0].TrimEnd('/')
    }
    throw "Could not parse deployment URL"
  } finally {
    Pop-Location
  }
}

Write-Host "=== AI Content Studio - Auto Deploy ===" -ForegroundColor Cyan
$envVars = Read-DotEnv $EnvFile

if ($envVars["JWT_ACCESS_SECRET"] -match 'change-me') {
  $envVars["JWT_ACCESS_SECRET"] = New-RandomSecret 32
}
if ($envVars["JWT_REFRESH_SECRET"] -match 'change-me') {
  $envVars["JWT_REFRESH_SECRET"] = New-RandomSecret 32
}
if ($envVars["ENCRYPTION_KEY"] -match 'change-me') {
  $envVars["ENCRYPTION_KEY"] = New-RandomSecret 32
}

Write-Host "`n[1] Link and deploy API (apps/api)..." -ForegroundColor Yellow
Push-Location $ApiDir
vercel project add ai-studio-api 2>&1 | Out-Null
vercel link --yes --project ai-studio-api 2>&1 | Out-String | Write-Host
Pop-Location

Write-Host "  Setting API env vars..."
Set-VercelEnv $ApiDir "NODE_ENV" "production"
Set-VercelEnv $ApiDir "DATABASE_URL" $envVars["DATABASE_URL"]
Set-VercelEnv $ApiDir "REDIS_URL" $envVars["REDIS_URL"]
Set-VercelEnv $ApiDir "JWT_ACCESS_SECRET" $envVars["JWT_ACCESS_SECRET"]
Set-VercelEnv $ApiDir "JWT_REFRESH_SECRET" $envVars["JWT_REFRESH_SECRET"]
Set-VercelEnv $ApiDir "JWT_ACCESS_EXPIRES_IN" "15m"
Set-VercelEnv $ApiDir "JWT_REFRESH_EXPIRES_IN" "7d"
Set-VercelEnv $ApiDir "ENCRYPTION_KEY" $envVars["ENCRYPTION_KEY"]
Set-VercelEnv $ApiDir "OPENAI_API_KEY" $envVars["OPENAI_API_KEY"]
Set-VercelEnv $ApiDir "PEXELS_API_KEY" $envVars["PEXELS_API_KEY"]
Set-VercelEnv $ApiDir "PIXABAY_API_KEY" $envVars["PIXABAY_API_KEY"]
Set-VercelEnv $ApiDir "COST_SAVER_MODE" "true"
Set-VercelEnv $ApiDir "COST_SAVER_AUTO_APPROVE" "true"

Write-Host "  Building API (3-5 min)..."
$apiUrl = Deploy-Prod $ApiDir
Write-Host "  API URL: $apiUrl" -ForegroundColor Green

Set-VercelEnv $ApiDir "API_URL" $apiUrl

Write-Host "`n[2] Link and deploy Web (apps/web)..." -ForegroundColor Yellow
Push-Location $WebDir
vercel project add ai-studio-web 2>&1 | Out-Null
vercel link --yes --project ai-studio-web 2>&1 | Out-String | Write-Host
Pop-Location

$apiBase = "$apiUrl/api/v1"
Set-VercelEnv $WebDir "NEXT_PUBLIC_API_URL" $apiBase

Write-Host "  Building Web (3-5 min)..."
$webUrl = Deploy-Prod $WebDir
Write-Host "  Web URL: $webUrl" -ForegroundColor Green

Write-Host "`n[3] Wire CORS on API..."
Set-VercelEnv $ApiDir "APP_URL" $webUrl
Set-VercelEnv $ApiDir "CORS_ORIGINS" $webUrl
Write-Host "  Redeploying API with CORS..."
Deploy-Prod $ApiDir | Out-Null

Write-Host "`n=== DONE ===" -ForegroundColor Green
Write-Host "  Web:    $webUrl"
Write-Host "  API:    $apiUrl/api/v1"
Write-Host "  Health: $apiUrl/api/v1/health/live"
Write-Host "  Login:  admin@aicontentstudio.local / Admin123!"
