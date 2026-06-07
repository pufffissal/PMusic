import { ipcMain } from 'electron'
import Store from 'electron-store'

export interface LyricsTrackOverride {
  offsetMs: number
  updatedAt: number
}

interface OverridesStore {
  byTrackId: Record<string, LyricsTrackOverride>
}

const store = new Store<{ overrides: OverridesStore }>({
  name: 'lyrics-overrides',
  defaults: { overrides: { byTrackId: {} } },
})

export function getLyricsOverride(trackId: string): LyricsTrackOverride | null {
  return store.get('overrides').byTrackId[trackId] ?? null
}

export function registerLyricsOverridesIpc(): void {
  ipcMain.handle('lyrics:getOverride', (_, trackId: string) => {
    if (!trackId) return null
    return getLyricsOverride(trackId)
  })

  ipcMain.handle(
    'lyrics:setOverride',
    (_, trackId: string, patch: { offsetMs?: number }) => {
      if (!trackId) return null
      const prev = getLyricsOverride(trackId)
      const next: LyricsTrackOverride = {
        offsetMs: patch.offsetMs ?? prev?.offsetMs ?? 0,
        updatedAt: Date.now(),
      }
      const all = store.get('overrides')
      all.byTrackId[trackId] = next
      store.set('overrides', all)
      return next
    },
  )

  ipcMain.handle('lyrics:clearOverride', (_, trackId: string) => {
    if (!trackId) return
    const all = store.get('overrides')
    delete all.byTrackId[trackId]
    store.set('overrides', all)
  })
}
