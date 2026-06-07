import { ipcMain } from 'electron'
import Store from 'electron-store'

export interface PlaybackTrack {
  id: string
  title: string
  artist: string
  thumbnail: string
  duration?: number
}

export interface PlaybackSession {
  queue: PlaybackTrack[]
  currentIndex: number
  currentTime: number
  isPlaying: boolean
  savedAt: number
}

interface PlaybackData {
  session: PlaybackSession | null
}

const store = new Store<PlaybackData>({
  name: 'playback',
  defaults: { session: null },
})

export function registerPlaybackIpc(): void {
  ipcMain.handle('playback:getSession', () => store.get('session'))

  ipcMain.handle('playback:saveSession', (_, session: Omit<PlaybackSession, 'savedAt'>) => {
    if (!session.queue?.length) {
      store.set('session', null)
      return null
    }
    const saved: PlaybackSession = { ...session, savedAt: Date.now() }
    store.set('session', saved)
    return saved
  })

  ipcMain.handle('playback:clearSession', () => {
    store.set('session', null)
    return null
  })
}
