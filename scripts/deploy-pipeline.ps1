# Build and optionally run the combined worker+renderer pipeline locally (Docker).
param(
  [switch]$Run,
  [switch]$BuildOnly
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$image = "ai-studio-pipeline:local"

Push-Location $root
try {
  Write-Host "Building pipeline image..." -ForegroundColor Cyan
  docker build -f infrastructure/docker/Dockerfile.pipeline -t $image .

  if ($BuildOnly) { return }

  if (-not $Run) {
    Write-Host ""
    Write-Host "Image built: $image" -ForegroundColor Green
    Write-Host "Run locally:  .\scripts\deploy-pipeline.ps1 -Run"
    Write-Host "Deploy Render: connect GitHub repo and use render.yaml Blueprint"
    return
  }

  if (-not (Test-Path "$root\.env")) {
    Write-Host "Missing .env at repo root" -ForegroundColor Red
    exit 1
  }

  Write-Host "Starting pipeline container..." -ForegroundColor Cyan
  docker run --rm -it `
    --env-file "$root\.env" `
    -e NODE_ENV=production `
    -e LOCAL_MEDIA_DIR=/data/media `
    -e LOCAL_MEDIA_PORT=3001 `
    -v "${root}/data/media:/data/media" `
    $image
}
finally {
  Pop-Location
}
