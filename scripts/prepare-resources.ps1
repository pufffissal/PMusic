# Copies ffmpeg into resources/ for bundling with the installer (MP3 downloads)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$resDir = Join-Path $root "resources"

if (-not (Test-Path $resDir)) {
    New-Item -ItemType Directory -Path $resDir | Out-Null
}

$ffmpegExe = Join-Path $resDir "ffmpeg.exe"
$ffprobeExe = Join-Path $resDir "ffprobe.exe"

if ((Test-Path $ffmpegExe) -and (Test-Path $ffprobeExe)) {
    Write-Host "ffmpeg already bundled in resources/"
    exit 0
}

$bundled = $false

$ffmpegCmd = Get-Command ffmpeg -ErrorAction SilentlyContinue
if ($ffmpegCmd) {
    $binDir = Split-Path $ffmpegCmd.Source -Parent
    $srcFfmpeg = Join-Path $binDir "ffmpeg.exe"
    $srcFfprobe = Join-Path $binDir "ffprobe.exe"
    if ((Test-Path $srcFfmpeg) -and (Test-Path $srcFfprobe)) {
        Copy-Item $srcFfmpeg $ffmpegExe -Force
        Copy-Item $srcFfprobe $ffprobeExe -Force
        Write-Host "Bundled ffmpeg from PATH ($binDir)"
        $bundled = $true
    }
}

if (-not $bundled) {
    Write-Host "Downloading ffmpeg (this may take a minute)..." -ForegroundColor Cyan
    $zipUrl = "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"
    $zipPath = Join-Path $env:TEMP "pmusic-ffmpeg.zip"
    $extractDir = Join-Path $env:TEMP "pmusic-ffmpeg-extract"

    try {
        Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing
        if (Test-Path $extractDir) { Remove-Item $extractDir -Recurse -Force }
        Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force

        $binFfmpeg = Get-ChildItem -Path $extractDir -Recurse -Filter "ffmpeg.exe" | Select-Object -First 1
        if ($binFfmpeg) {
            Copy-Item $binFfmpeg.FullName $ffmpegExe -Force
            $binFfprobe = Join-Path $binFfmpeg.DirectoryName "ffprobe.exe"
            if (Test-Path $binFfprobe) {
                Copy-Item $binFfprobe $ffprobeExe -Force
                Write-Host "Downloaded and bundled ffmpeg.exe + ffprobe.exe" -ForegroundColor Green
                $bundled = $true
            }
        }
    } finally {
        Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
        Remove-Item $extractDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

if (-not $bundled) {
    Write-Warning "Could not bundle ffmpeg. MP3 downloads will fail until ffmpeg is installed."
    Write-Warning "Install with: winget install Gyan.FFmpeg"
}
