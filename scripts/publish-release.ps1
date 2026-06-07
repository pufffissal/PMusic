# Build PMusic MSI + NSIS and publish to GitHub Releases (NSIS produces latest.yml for auto-update)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

$version = (Get-Content package.json -Raw | ConvertFrom-Json).version
Write-Host "==> PMusic v$version release publish" -ForegroundColor Cyan

Write-Host "==> Creating app icon..." -ForegroundColor Cyan
& (Join-Path $root "scripts\create-icon.ps1")

Write-Host "==> Preparing resources (yt-dlp, ffmpeg)..." -ForegroundColor Cyan
& (Join-Path $root "scripts\prepare-resources.ps1")

Write-Host "==> Building application..." -ForegroundColor Cyan
npm run build:app
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not $env:GH_TOKEN) {
  $ghToken = gh auth token 2>$null
  if ($ghToken) {
    $env:GH_TOKEN = $ghToken.Trim()
    Write-Host "Using GH_TOKEN from gh auth" -ForegroundColor DarkGray
  }
}

if (-not $env:GH_TOKEN) {
  Write-Host ""
  Write-Host "GitHub auth required for publish." -ForegroundColor Yellow
  Write-Host "  Option A: gh auth login" -ForegroundColor Yellow
  Write-Host "  Option B: set GH_TOKEN to a token with repo scope" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Building installers locally only (no upload)..." -ForegroundColor Cyan
  npx electron-builder --win msi nsis
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  Write-Host ""
  Write-Host "Installers built. Upload to GitHub Releases (include latest.yml for in-app updates):" -ForegroundColor Green
  Get-ChildItem (Join-Path $root "release") -Include "*.msi","*.exe","latest.yml" -Recurse | ForEach-Object { Write-Host "  $($_.FullName)" }
  exit 0
}

Write-Host "==> Publishing to GitHub (pufffissal/PMusic)..." -ForegroundColor Cyan
npx electron-builder --win msi nsis --publish always
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Published v$version to GitHub Releases." -ForegroundColor Green
Get-ChildItem (Join-Path $root "release") -Include "*.msi","*.exe","latest.yml" | ForEach-Object { Write-Host "  $($_.FullName)" }
