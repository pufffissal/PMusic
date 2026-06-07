# Bundled binaries

Place platform binaries here before packaging:

- `ffmpeg` / `ffmpeg.exe` (required for MP3 downloads)
- `icon.png`

**Playback & search** use pure Node.js (`play-dl`, `ytmusic-api`) — no yt-dlp binary.

**Development:** Run `scripts/prepare-resources.ps1` to copy ffmpeg into `resources/`, or install ffmpeg on PATH.

```powershell
powershell -ExecutionPolicy Bypass -File scripts/prepare-resources.ps1
```
