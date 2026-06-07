import { execSync } from 'child_process'
import path from 'path'
import { app } from 'electron'
import fs from 'fs'

function binaryNames(): { ffmpeg: string; ffprobe: string } {
  const isWin = process.platform === 'win32'
  return {
    ffmpeg: isWin ? 'ffmpeg.exe' : 'ffmpeg',
    ffprobe: isWin ? 'ffprobe.exe' : 'ffprobe',
  }
}

function dirHasFfmpeg(dir: string): boolean {
  const { ffmpeg, ffprobe } = binaryNames()
  return fs.existsSync(path.join(dir, ffmpeg)) && fs.existsSync(path.join(dir, ffprobe))
}

function findOnPath(): string | null {
  try {
    const cmd = process.platform === 'win32' ? 'where ffmpeg' : 'which ffmpeg'
    const result = execSync(cmd, { encoding: 'utf8', windowsHide: true }).trim().split(/\r?\n/)[0]
    if (result && fs.existsSync(result)) {
      const dir = path.dirname(result)
      return dirHasFfmpeg(dir) ? dir : null
    }
  } catch {
    // not on PATH
  }
  return null
}

/** Directory containing ffmpeg + ffprobe, for yt-dlp --ffmpeg-location */
export function getFfmpegLocation(): string | null {
  const { ffmpeg, ffprobe } = binaryNames()

  const dirCandidates = [
    process.resourcesPath,
    path.join(process.resourcesPath, 'resources'),
    path.join(app.getAppPath(), 'resources'),
    path.join(process.cwd(), 'resources'),
  ]

  for (const dir of dirCandidates) {
    if (dirHasFfmpeg(dir)) return dir
  }

  for (const dir of dirCandidates) {
    for (const sub of ['bin', 'ffmpeg', '.']) {
      const candidate = sub === '.' ? dir : path.join(dir, sub)
      if (dirHasFfmpeg(candidate)) return candidate
    }
  }

  return findOnPath()
}

export function requireFfmpegLocation(): string {
  const loc = getFfmpegLocation()
  if (loc) return loc

  const hint =
    process.platform === 'win32'
      ? 'Run: powershell -ExecutionPolicy Bypass -File scripts/prepare-resources.ps1'
      : 'Install ffmpeg and add it to PATH, or place binaries in resources/'

  throw new Error(`ffmpeg not found. ${hint}`)
}

export function getFfmpegArgs(): string[] {
  const loc = getFfmpegLocation()
  return loc ? ['--ffmpeg-location', loc] : []
}
