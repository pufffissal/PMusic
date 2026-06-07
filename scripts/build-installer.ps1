# One-click Windows installer build — produces PMusic-Setup-x.x.x.msi in release/
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

Write-Host "==> Creating app icon..." -ForegroundColor Cyan
& (Join-Path $root "scripts\create-icon.ps1")

Write-Host "==> Preparing resources (yt-dlp, ffmpeg)..." -ForegroundColor Cyan
& (Join-Path $root "scripts\prepare-resources.ps1")

Write-Host "==> Building application..." -ForegroundColor Cyan
npm run build:app
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> Creating MSI installer..." -ForegroundColor Cyan
npx electron-builder --win msi
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Done! Installer:" -ForegroundColor Green
Get-ChildItem (Join-Path $root "release") -Filter "*.msi" | ForEach-Object { Write-Host "  $($_.FullName)" }
