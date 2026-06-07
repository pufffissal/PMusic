# Copies src/assets/icon.png into resources/ + public/ for Electron, taskbar, and MSI
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$srcIcon = Join-Path $root "src\assets\icon.png"
$iconPath = Join-Path $root "resources\icon.png"
$publicIcon = Join-Path $root "public\icon.png"
$res = Join-Path $root "resources"

if (-not (Test-Path $res)) { New-Item -ItemType Directory -Path $res | Out-Null }
$publicDir = Join-Path $root "public"
if (-not (Test-Path $publicDir)) { New-Item -ItemType Directory -Path $publicDir | Out-Null }

if (-not (Test-Path $srcIcon)) {
    Write-Warning "src/assets/icon.png not found - generating placeholder"
    Add-Type -AssemblyName System.Drawing
    $bmp = New-Object System.Drawing.Bitmap 256, 256
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::FromArgb(255, 10, 10, 12))
    $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 250, 45, 72))
    $g.FillEllipse($brush, 28, 28, 200, 200)
    $font = New-Object System.Drawing.Font ([System.Drawing.FontFamily]::new('Segoe UI'), 96, [System.Drawing.FontStyle]::Bold)
    $g.DrawString('P', $font, [System.Drawing.Brushes]::White, 78, 58)
    $bmp.Save($iconPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $srcIcon = $iconPath
}

Copy-Item $srcIcon $iconPath -Force
Copy-Item $srcIcon $publicIcon -Force
Write-Host "App icon ready from src/assets/icon.png -> resources/ and public/"
