import { ipcMain } from 'electron'
import Store from 'electron-store'
import { clearStreamCache } from './stream'

export type AppTheme = 'glass' | 'dark' | 'white'

export interface AppSettings {
  uiScale: number
  theme: AppTheme
  accentColor: string | null
  useDynamicAccent: boolean
  glassIntensity: 'normal' | 'high'
  autoplaySimilar: boolean
  defaultVolume: number
  openNowPlayingOnPlay: boolean
  showLyrics: boolean
  syncedLyrics: boolean
  /** line = full line; clause = phrase groups (estimated); word = per-word (experimental estimate) */
  lyricsSyncMode: 'line' | 'clause' | 'word'
  scrollStaticLyrics: boolean
  reduceMotion: boolean
  compactPlayer: boolean
  showTrackNumbers: boolean
  searchDebounceMs: number
  enhancedSearch: boolean
  showDurationInLists: boolean
  prebufferNextTrack: boolean
  lyricsFontSize: 'small' | 'medium' | 'large'
  showAuroraEffects: boolean
  showPlayerArtworkGlow: boolean
  pauseOnFocusLoss: boolean
  resumePlayback: boolean
  crossfadeEnabled: boolean
  crossfadeDuration: number
  gaplessEnabled: boolean
  streamQuality: 'best' | 'high' | 'medium' | 'low'
  downloadFolder: string | null
  downloadQuality: 'best' | '320' | '192' | '128'
  downloadEmbedThumbnail: boolean
  downloadEmbedMetadata: boolean
  discordEnabled: boolean
  discordShowProgress: boolean
}

const defaults: AppSettings = {
  uiScale: 1.1,
  theme: 'dark',
  accentColor: null,
  useDynamicAccent: true,
  glassIntensity: 'high',
  autoplaySimilar: true,
  defaultVolume: 0.8,
  openNowPlayingOnPlay: false,
  showLyrics: true,
  syncedLyrics: true,
  lyricsSyncMode: 'line',
  scrollStaticLyrics: true,
  reduceMotion: false,
  compactPlayer: false,
  showTrackNumbers: true,
  searchDebounceMs: 120,
  enhancedSearch: false,
  showDurationInLists: true,
  prebufferNextTrack: true,
  lyricsFontSize: 'medium',
  showAuroraEffects: true,
  showPlayerArtworkGlow: true,
  pauseOnFocusLoss: false,
  resumePlayback: true,
  crossfadeEnabled: false,
  crossfadeDuration: 4,
  gaplessEnabled: true,
  streamQuality: 'high',
  downloadFolder: null,
  downloadQuality: '192',
  downloadEmbedThumbnail: true,
  downloadEmbedMetadata: true,
  discordEnabled: false,
  discordShowProgress: true,
}

const store = new Store<{ settings: AppSettings }>({
  name: 'settings',
  defaults: { settings: defaults },
})

export function getAppSettings(): AppSettings {
  const saved = store.get('settings') as Partial<AppSettings> & { wordSyncedLyrics?: boolean }
  const merged = { ...defaults, ...saved }
  if (!saved.lyricsSyncMode && saved.wordSyncedLyrics) {
    merged.lyricsSyncMode = 'word'
  }
  if (merged.lyricsSyncMode !== 'line' && merged.lyricsSyncMode !== 'clause' && merged.lyricsSyncMode !== 'word') {
    merged.lyricsSyncMode = 'line'
  }
  return merged
}

export function registerSettingsIpc(): void {
  ipcMain.handle('settings:get', () => getAppSettings())

  ipcMain.handle('settings:set', (_, partial: Partial<AppSettings>) => {
    const current = store.get('settings')
    const next = { ...defaults, ...current, ...partial }
    if (partial.streamQuality !== undefined && partial.streamQuality !== current.streamQuality) {
      clearStreamCache()
    }
    store.set('settings', next)
    return next
  })

  ipcMain.handle('settings:reset', () => {
    store.set('settings', defaults)
    return defaults
  })
}
