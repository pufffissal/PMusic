import { ipcMain, BrowserWindow, dialog, app, shell, protocol } from 'electron'
import { spawn, type ChildProcess } from 'child_process'
import path from 'path'
import fs from 'fs'
import Store from 'electron-store'
import { getAppSettings, type AppSettings } from './settings'
import { requireFfmpegLocation } from '../utils/ffmpeg'
import { lookupYoutubeIdByFilePath, youtubeThumbnail } from '../utils/trackThumbnail.js'
import { getStreamUrl } from '../services/streamService'

export interface DownloadTrackPayload {
  id: string
  title: string
  artist: string
}

export interface DownloadPlaylistPayload {
  name: string
  tracks: DownloadTrackPayload[]
}

export interface DownloadProgressEvent {
  jobId: string
  trackId: string
  title: string
  percent: number
  status: 'starting' | 'downloading' | 'converting' | 'done' | 'error'
  message?: string
}

let activeProc: ChildProcess | null = null
let cancelRequested = false

interface DownloadIndex {
  byTrackId: Record<string, string>
}

const downloadIndexStore = new Store<{ index: DownloadIndex }>({
  name: 'downloads-index',
  defaults: { index: { byTrackId: {} } },
})

function registerTrackDownload(trackId: string, filePath: string): void {
  const index = downloadIndexStore.get('index')
  index.byTrackId[trackId] = filePath
  downloadIndexStore.set('index', index)
}

function findFileForTrack(track: DownloadTrackPayload, files: DownloadedFile[]): string | null {
  const indexed = downloadIndexStore.get('index').byTrackId[track.id]
  if (indexed && fs.existsSync(indexed)) return indexed

  const needle = `${track.artist} - ${track.title}`.toLowerCase().replace(/[^\w\s-]/g, '')
  for (const file of files) {
    const normalized = file.name.toLowerCase().replace(/[^\w\s-]/g, '')
    if (normalized.includes(needle.slice(0, 20)) || needle.includes(normalized.replace('.mp3', '').slice(0, 20))) {
      return file.path
    }
  }
  return null
}

function sendProgress(event: DownloadProgressEvent): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('download:progress', event)
  }
}

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim() || 'untitled'
}

function resolveDownloadFolder(settings: AppSettings, subfolder?: string): string {
  const base =
    settings.downloadFolder?.trim() ||
    path.join(app.getPath('downloads'), 'PMusic')
  const target = subfolder ? path.join(base, sanitizeFilename(subfolder)) : base
  fs.mkdirSync(target, { recursive: true })
  return target
}

function ffmpegBitrateArgs(quality: AppSettings['downloadQuality']): string[] {
  switch (quality) {
    case '320':
      return ['-b:a', '320k']
    case '192':
      return ['-b:a', '192k']
    case '128':
      return ['-b:a', '128k']
    default:
      return ['-q:a', '0']
  }
}

function ffmpegBinary(): string {
  const dir = requireFfmpegLocation()
  return path.join(dir, process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg')
}

async function runDownload(
  jobId: string,
  track: DownloadTrackPayload,
  outputDir: string,
  settings: AppSettings,
): Promise<{ ok: true; path?: string } | { ok: false; error: string }> {
  try {
    requireFfmpegLocation()
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }

  const outFile = path.join(outputDir, `${sanitizeFilename(track.artist)} - ${sanitizeFilename(track.title)}.mp3`)
  const tempFile = path.join(outputDir, `.pmusic-${track.id}.tmp`)

  cancelRequested = false

  sendProgress({
    jobId,
    trackId: track.id,
    title: track.title,
    percent: 0,
    status: 'starting',
  })

  try {
    const streamUrl = await getStreamUrl(track.id, settings.streamQuality ?? 'best')
    const res = await fetch(streamUrl, {
      headers: { Referer: 'https://www.youtube.com/', Origin: 'https://www.youtube.com' },
      signal: AbortSignal.timeout(180_000),
    })
    if (!res.ok) throw new Error(`Stream download failed (${res.status})`)

    const total = Number(res.headers.get('content-length') ?? 0)
    const reader = res.body?.getReader()
    if (!reader) throw new Error('No response body')

    const chunks: Buffer[] = []
    let received = 0
    while (true) {
      if (cancelRequested) throw new Error('Download cancelled')
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        chunks.push(Buffer.from(value))
        received += value.length
        if (total > 0) {
          sendProgress({
            jobId,
            trackId: track.id,
            title: track.title,
            percent: Math.min(99, (received / total) * 100),
            status: 'downloading',
          })
        }
      }
    }

    fs.writeFileSync(tempFile, Buffer.concat(chunks))

    sendProgress({
      jobId,
      trackId: track.id,
      title: track.title,
      percent: 100,
      status: 'converting',
    })

    await new Promise<void>((resolve, reject) => {
      const args = ['-y', '-i', tempFile, '-vn', '-codec:a', 'libmp3lame', ...ffmpegBitrateArgs(settings.downloadQuality), outFile]
      const proc = spawn(ffmpegBinary(), args, { windowsHide: true })
      activeProc = proc
      let stderr = ''
      proc.stderr.on('data', (c: Buffer) => {
        stderr += c.toString()
      })
      proc.on('error', (e) => reject(e))
      proc.on('close', (code) => {
        activeProc = null
        if (code === 0) resolve()
        else reject(new Error(stderr.trim() || `ffmpeg exited with code ${code}`))
      })
    })

    try {
      fs.unlinkSync(tempFile)
    } catch {
      // ignore
    }

    if (fs.existsSync(outFile)) registerTrackDownload(track.id, outFile)

    sendProgress({
      jobId,
      trackId: track.id,
      title: track.title,
      percent: 100,
      status: 'done',
    })

    return { ok: true, path: fs.existsSync(outFile) ? outFile : undefined }
  } catch (err) {
    try {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile)
    } catch {
      // ignore
    }
    activeProc = null
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export interface DownloadedFile {
  name: string
  path: string
  sizeBytes: number
  modifiedAt: number
  folder: string
}

function listAudioFiles(dir: string, baseDir: string, results: DownloadedFile[]): void {
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      listAudioFiles(full, baseDir, results)
      continue
    }
    if (!entry.isFile()) continue
    const ext = path.extname(entry.name).toLowerCase()
    if (ext !== '.mp3' && ext !== '.m4a' && ext !== '.opus' && ext !== '.flac') continue
    try {
      const stat = fs.statSync(full)
      const rel = path.relative(baseDir, full)
      const folder = path.dirname(rel)
      results.push({
        name: entry.name,
        path: full,
        sizeBytes: stat.size,
        modifiedAt: stat.mtimeMs,
        folder: folder === '.' ? '' : folder,
      })
    } catch {
      /* skip unreadable files */
    }
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export function registerDownloadIpc(): void {
  ipcMain.handle('download:getDefaultFolder', () => {
    const settings = getAppSettings()
    return resolveDownloadFolder(settings)
  })

  ipcMain.handle('download:pickFolder', async () => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    if (!win) return null
    const settings = getAppSettings()
    const result = await dialog.showOpenDialog(win, {
      title: 'Choose download folder',
      defaultPath: resolveDownloadFolder(settings),
      properties: ['openDirectory', 'createDirectory'],
    })
    return result.canceled || !result.filePaths[0] ? null : result.filePaths[0]
  })

  ipcMain.handle('download:track', async (_, track: DownloadTrackPayload) => {
    const settings = getAppSettings()
    const jobId = `track-${track.id}-${Date.now()}`
    const outputDir = resolveDownloadFolder(settings)

    const result = await runDownload(jobId, track, outputDir, settings)
    if (!result.ok) {
      sendProgress({
        jobId,
        trackId: track.id,
        title: track.title,
        percent: 0,
        status: 'error',
        message: result.error,
      })
    }
    return result
  })

  ipcMain.handle('download:playlist', async (_, payload: DownloadPlaylistPayload) => {
    const settings = getAppSettings()
    const jobId = `playlist-${Date.now()}`
    const outputDir = resolveDownloadFolder(settings, payload.name)

    let completed = 0
    let failed = 0
    const errors: string[] = []

    for (const track of payload.tracks) {
      if (cancelRequested) break

      const result = await runDownload(jobId, track, outputDir, settings)
      if (result.ok) completed++
      else {
        failed++
        if ('error' in result) errors.push(`${track.title}: ${result.error}`)
      }
    }

    return {
      ok: failed === 0 && !cancelRequested,
      completed,
      failed,
      folder: outputDir,
      error: errors[0],
      cancelled: cancelRequested,
    }
  })

  ipcMain.handle('download:cancel', () => {
    cancelRequested = true
    if (activeProc) {
      activeProc.kill()
      activeProc = null
    }
  })

  ipcMain.handle('download:listFiles', () => {
    const settings = getAppSettings()
    const baseDir = resolveDownloadFolder(settings)
    const files: DownloadedFile[] = []
    listAudioFiles(baseDir, baseDir, files)
    files.sort((a, b) => b.modifiedAt - a.modifiedAt)
    const totalBytes = files.reduce((sum, f) => sum + f.sizeBytes, 0)
    return { folder: baseDir, files, totalBytes, formattedSize: formatBytes(totalBytes) }
  })

  ipcMain.handle('download:openFolder', async (_, subfolder?: string) => {
    const settings = getAppSettings()
    const folder = subfolder
      ? path.join(resolveDownloadFolder(settings), sanitizeFilename(subfolder))
      : resolveDownloadFolder(settings)
    fs.mkdirSync(folder, { recursive: true })
    await shell.openPath(folder)
  })

  ipcMain.handle('download:revealFile', async (_, filePath: string) => {
    shell.showItemInFolder(filePath)
  })

  ipcMain.handle('download:getLocalUrl', (_, filePath: string) => {
    if (!filePath || !fs.existsSync(filePath)) return null
    return `pmusic-local://local/${encodeURIComponent(filePath.replace(/\\/g, '/'))}`
  })

  ipcMain.handle('download:metaForPath', (_, filePath: string) => {
    if (!filePath || !fs.existsSync(filePath)) return null
    const index = downloadIndexStore.get('index').byTrackId
    const youtubeId = lookupYoutubeIdByFilePath(filePath, index)
    if (!youtubeId) return null
    return { id: youtubeId, thumbnail: youtubeThumbnail(youtubeId) }
  })

  ipcMain.handle(
    'download:resolveTrack',
    async (_, track: DownloadTrackPayload) => {
      const indexed = downloadIndexStore.get('index').byTrackId[track.id]
      if (indexed && fs.existsSync(indexed)) {
        return `pmusic-local://local/${encodeURIComponent(indexed.replace(/\\/g, '/'))}`
      }
      return null
    },
  )
}

export function registerLocalMediaProtocol(): void {
  protocol.registerFileProtocol('pmusic-local', (request, callback) => {
    try {
      const raw = request.url.replace(/^pmusic-local:\/\/local\//, '')
      const filePath = decodeURIComponent(raw)
      callback({ path: filePath })
    } catch {
      callback({ error: -2 })
    }
  })
}
