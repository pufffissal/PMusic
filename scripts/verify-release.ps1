# Verify release folder has assets required for in-app auto-update
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$releaseDir = Join-Path $root "release"
$version = (Get-Content (Join-Path $root "package.json") -Raw | ConvertFrom-Json).version

Write-Host "==> Verifying PMusic v$version release assets" -ForegroundColor Cyan

if (-not (Test-Path $releaseDir)) {
  Write-Host "FAIL: release/ folder not found. Run npm run publish:win first." -ForegroundColor Red
  exit 1
}

$latestYml = Join-Path $releaseDir "latest.yml"
$nsisExe = Join-Path $releaseDir "PMusic-Setup-$version.exe"
$msi = Join-Path $releaseDir "PMusic-$version.msi"

$ok = $true

if (-not (Test-Path $latestYml)) {
  Write-Host "FAIL: missing latest.yml (required for auto-update)" -ForegroundColor Red
  $ok = $false
} else {
  Write-Host "OK: latest.yml" -ForegroundColor Green
  $yml = Get-Content $latestYml -Raw
  if ($yml -notmatch "PMusic-Setup-$version\.exe") {
    Write-Host "WARN: latest.yml may not reference PMusic-Setup-$version.exe" -ForegroundColor Yellow
  }
}

if (-not (Test-Path $nsisExe)) {
  Write-Host "FAIL: missing PMusic-Setup-$version.exe (NSIS installer for auto-update)" -ForegroundColor Red
  $ok = $false
} else {
  $sizeMb = [math]::Round((Get-Item $nsisExe).Length / 1MB, 1)
  Write-Host "OK: PMusic-Setup-$version.exe ($sizeMb MB)" -ForegroundColor Green
}

if (Test-Path $msi) {
  Write-Host "OK: PMusic-$version.msi (optional)" -ForegroundColor Green
} else {
  Write-Host "INFO: PMusic-$version.msi not found (optional)" -ForegroundColor DarkGray
}

if (-not $ok) {
  Write-Host ""
  Write-Host "Upload both latest.yml and the NSIS .exe to GitHub Releases for in-app updates." -ForegroundColor Yellow
  exit 1
}

Write-Host ""
Write-Host "Release assets look good for auto-update." -ForegroundColor Green
exit 0
