# PMusic

A minimalist, glass-style desktop music app for **YouTube Music** — inspired by Apple Music and Cider.

> For personal use only. Streaming may violate YouTube Music Terms of Service.

## Install (Windows — no terminal needed)

1. **Build the installer** (developers, one time):
   ```powershell
   cd pmusic
   npm install
   npm run dist
   ```
2. Open `release\PMusic-Setup-1.5.0.msi` (or the latest `.exe` from [Releases](https://github.com/pufffissal/PMusic/releases))
3. Follow the installer — choose your install folder when prompted
4. Launch **PMusic** from the Start Menu or desktop shortcut

The MSI bundles the app and **yt-dlp** (if found on your PATH during build). No Command Prompt required to run PMusic after install.

### Requirements

- Windows 10/11 (64-bit)
- Internet connection for streaming

## Development

```powershell
npm install
npm run dev
```

Optional DevTools: `$env:OPEN_DEVTOOLS="1"; npm run dev`

## Features

- Apple Glass theme with blur, depth, and fluid navigation
- Search-as-you-type, home playlists, library with custom playlist colors
- Now Playing sheet with lyrics (LRCLIB)
- Autoplay similar tracks when a song ends
- Settings: UI scale, theme, accent, appearance preset

## Build commands

| Command | Output |
|---------|--------|
| `npm run dist` | Full MSI in `release/` |
| `npm run dist:msi` | MSI only (after `build:app`) |
| `npm run build:app` | Compile app without installer |

## Project structure

- `electron/` — main process, IPC, yt-dlp
- `src/` — React UI
- `resources/` — bundled `yt-dlp.exe` for releases
- `scripts/build-installer.ps1` — one-click MSI build
