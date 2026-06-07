import { create } from 'zustand'

export interface DownloadState {
  active: boolean
  title: string
  percent: number
  status: 'starting' | 'downloading' | 'converting' | 'done' | 'error' | 'idle'
  message?: string
}

interface DownloadStore {
  download: DownloadState
  setDownload: (partial: Partial<DownloadState>) => void
  resetDownload: () => void
}

const idle: DownloadState = {
  active: false,
  title: '',
  percent: 0,
  status: 'idle',
}

export const useDownloadStore = create<DownloadStore>((set) => ({
  download: idle,
  setDownload: (partial) => set((s) => ({ download: { ...s.download, ...partial } })),
  resetDownload: () => set({ download: idle }),
}))

export async function downloadTrack(track: { id: string; title: string; artist: string }) {
  if (!window.electron?.download) return

  const { setDownload } = useDownloadStore.getState()
  setDownload({ active: true, title: track.title, percent: 0, status: 'starting', message: undefined })

  const result = await window.electron.download.track(track)
  if (result.ok) {
    setDownload({ percent: 100, status: 'done' })
    setTimeout(() => useDownloadStore.getState().resetDownload(), 4000)
  } else {
    setDownload({ status: 'error', message: result.error })
  }
}

export async function downloadPlaylist(name: string, tracks: { id: string; title: string; artist: string }[]) {
  if (!window.electron?.download || tracks.length === 0) return

  const { setDownload } = useDownloadStore.getState()
  setDownload({
    active: true,
    title: name,
    percent: 0,
    status: 'starting',
    message: `0 / ${tracks.length} tracks`,
  })

  const result = await window.electron.download.playlist({ name, tracks })
  if (result.ok) {
    setDownload({
      percent: 100,
      status: 'done',
      message: `${result.completed} tracks saved`,
    })
    setTimeout(() => useDownloadStore.getState().resetDownload(), 5000)
  } else if (result.cancelled) {
    useDownloadStore.getState().resetDownload()
  } else {
    setDownload({
      status: 'error',
      message: result.error || `${result.failed} of ${tracks.length} failed`,
    })
  }
}

export function subscribeDownloadProgress() {
  if (!window.electron?.download) return () => {}

  return window.electron.download.onProgress((event) => {
    const { setDownload } = useDownloadStore.getState()
    setDownload({
      active: true,
      title: event.title,
      percent: event.percent,
      status: event.status === 'error' ? 'error' : event.status,
      message: event.message,
    })
  })
}
