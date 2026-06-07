import { useCallback, useEffect, useState } from 'react'
import { Download, FolderOpen, RefreshCw, ExternalLink, Music2, Play } from 'lucide-react'
import { Appear, Stagger, StaggerItem } from '@/components/ui/motion'
import { useDownloadStore, subscribeDownloadProgress } from '@/store/downloadStore'
import { usePlayerStore } from '@/store/playerStore'
import { cn } from '@/lib/cn'
import { resolveTrackThumbnail } from '@/lib/trackThumbnail'
import type { DownloadedFile } from '../../../electron/preload'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function DownloadsView() {
  const playLocalFile = usePlayerStore((s) => s.playLocalFile)
  const [folder, setFolder] = useState('')
  const [files, setFiles] = useState<DownloadedFile[]>([])
  const [totalBytes, setTotalBytes] = useState(0)
  const [loading, setLoading] = useState(true)
  const downloadStatus = useDownloadStore((s) => s.download.status)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await window.electron?.download.listFiles()
      if (result) {
        setFolder(result.folder)
        setFiles(result.files)
        setTotalBytes(result.totalBytes)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    return subscribeDownloadProgress()
  }, [load])

  useEffect(() => {
    if (downloadStatus === 'done') void load()
  }, [downloadStatus, load])

  const folders = [...new Set(files.map((f) => f.folder).filter(Boolean))]

  const playFile = async (file: DownloadedFile) => {
    const url = await window.electron?.download.getLocalUrl(file.path)
    if (!url) return
    const meta = await window.electron?.download.metaForPath(file.path)
    const base = file.name.replace(/\.(mp3|m4a|opus|flac)$/i, '')
    const dash = base.indexOf(' - ')
    const artist = dash > 0 ? base.slice(0, dash) : 'Downloaded'
    const title = dash > 0 ? base.slice(dash + 3) : base
    const id = meta?.id ?? `local:${file.path}`
    const thumbnail = resolveTrackThumbnail(id, meta?.thumbnail)
    playLocalFile({
      id,
      title,
      artist,
      thumbnail,
      localPath: url,
      source: 'local',
    })
  }

  return (
    <div className="h-full overflow-y-auto">
      <Appear className="am-view-header px-8 pb-6 pt-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="section-title">Downloads</h1>
            <p className="section-subtitle">
              Offline MP3 files saved from PMusic
              {!loading && files.length > 0 && (
                <span className="ml-2 text-fg-muted">
                  · {files.length} files · {formatBytes(totalBytes)}
                </span>
              )}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl bg-[var(--surface-hover)] px-3 py-2 text-sm font-medium text-fg-secondary hover:bg-[var(--surface-active)] hover:text-fg"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => void window.electron?.download.openFolder()}
              className="flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              <FolderOpen size={15} />
              Open folder
            </button>
          </div>
        </div>
        {folder && (
          <p className="mt-2 truncate text-xs text-fg-muted" title={folder}>
            {folder}
          </p>
        )}
      </Appear>

      <div className="px-8 pb-8">
        {loading && files.length === 0 && (
          <Appear delay={0.06}>
            <p className="text-fg-muted">Scanning download folder…</p>
          </Appear>
        )}

        {!loading && files.length === 0 && (
          <Appear delay={0.06}>
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <Download size={48} className="text-fg-muted opacity-40" />
              <div>
                <p className="font-medium text-fg">No downloads yet</p>
                <p className="mt-1 max-w-sm text-sm text-fg-muted">
                  Right-click any track and choose Download, or download a full playlist from Library.
                </p>
              </div>
            </div>
          </Appear>
        )}

        {folders.length > 0 && (
          <Appear className="mb-6" delay={0.04}>
            <p className="mb-2 text-xs font-semibold tracking-wider text-fg-muted uppercase">Playlist folders</p>
            <div className="flex flex-wrap gap-2">
              {folders.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => void window.electron?.download.openFolder(f)}
                  className="rounded-full bg-[var(--surface-hover)] px-3 py-1.5 text-xs font-medium text-fg-secondary hover:bg-[var(--surface-active)] hover:text-fg"
                >
                  {f}
                </button>
              ))}
            </div>
          </Appear>
        )}

        {files.length > 0 && (
          <Stagger className="flex flex-col gap-1">
            {files.map((file) => (
              <StaggerItem key={file.path}>
                <div className="group flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-[var(--surface-hover)]">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-active)] text-[var(--accent)]">
                    <Music2 size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-fg">{file.name.replace(/\.(mp3|m4a|opus|flac)$/i, '')}</p>
                    <p className="truncate text-xs text-fg-muted">
                      {file.folder && <span>{file.folder} · </span>}
                      {formatBytes(file.sizeBytes)} · {formatDate(file.modifiedAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void playFile(file)}
                    className="shrink-0 rounded-lg p-2 text-[var(--accent)] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[var(--surface-active)]"
                    title="Play"
                  >
                    <Play size={16} fill="currentColor" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void window.electron?.download.revealFile(file.path)}
                    className={cn(
                      'shrink-0 rounded-lg p-2 text-fg-muted opacity-0 transition-opacity',
                      'group-hover:opacity-100 hover:bg-[var(--surface-active)] hover:text-fg-secondary',
                    )}
                    title="Show in folder"
                  >
                    <ExternalLink size={16} />
                  </button>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>
    </div>
  )
}
