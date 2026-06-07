import { create } from 'zustand'
import { usePlayerStore } from './playerStore'
import { useThemeStore } from './themeStore'
import { applyAccentGradients, applyAccentPalette, clearAmbientInlineStyles, isGlassTheme } from '@/lib/gradient'
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

interface SettingsState {
  settings: AppSettings
  loaded: boolean
  load: () => Promise<void>
  update: (partial: Partial<AppSettings>) => Promise<void>
  reset: () => Promise<void>
}

export const UI_SCALE_PRESETS = [
  { id: 'small', label: 'Small', value: 0.95 },
  { id: 'medium', label: 'Medium', value: 1.05 },
  { id: 'large', label: 'Large', value: 1.1 },
  { id: 'huge', label: 'Huge', value: 1.25 },
] as const

export function snapUiScale(value: number): number {
  return UI_SCALE_PRESETS.reduce((nearest, preset) =>
    Math.abs(preset.value - value) < Math.abs(nearest.value - value) ? preset : nearest,
  ).value
}

export const defaults: AppSettings = {
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

export function applyUiScale(scale: number) {
  document.documentElement.style.setProperty('--ui-scale', String(scale))
}

function shouldReapplyAccent(changed?: Partial<AppSettings>): boolean {
  if (!changed) return true
  return 'accentColor' in changed || 'useDynamicAccent' in changed || 'theme' in changed
}

function normalizeSettings(settings: AppSettings): AppSettings {
  return { ...settings, uiScale: snapUiScale(settings.uiScale) }
}

export function applySettingsToDom(
  settings: AppSettings,
  options?: { applyVolume?: boolean; changed?: Partial<AppSettings> },
) {
  const root = document.documentElement
  applyUiScale(settings.uiScale)

  root.dataset.theme = settings.theme
  root.dataset.glass = settings.glassIntensity
  root.dataset.reduceMotion = settings.reduceMotion ? 'true' : 'false'
  root.dataset.compactPlayer = settings.compactPlayer ? 'true' : 'false'
  root.dataset.showTrackNumbers = settings.showTrackNumbers ? 'true' : 'false'
  root.dataset.aurora = settings.showAuroraEffects ? 'true' : 'false'
  root.dataset.lyricsSize = settings.lyricsFontSize
  root.dataset.artworkGlow = settings.showPlayerArtworkGlow ? 'true' : 'false'
  root.dataset.enhancedSearch = settings.enhancedSearch ? 'true' : 'false'

  if (shouldReapplyAccent(options?.changed)) {
    if (!isGlassTheme()) {
      clearAmbientInlineStyles()
    }

    if (settings.accentColor && !settings.useDynamicAccent) {
      applyAccentGradients(settings.accentColor)
    } else if (settings.useDynamicAccent && isGlassTheme()) {
      applyAccentPalette(useThemeStore.getState().accentColors)
    } else if (settings.useDynamicAccent) {
      applyAccentGradients('#fa2d48')
    }
  }

  if (options?.applyVolume) {
    usePlayerStore.getState().setVolume(settings.defaultVolume)
  }
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: defaults,
  loaded: false,

  load: async () => {
    if (!window.electron) {
      const settings = normalizeSettings(defaults)
      applySettingsToDom(settings, { applyVolume: true })
      set({ settings, loaded: true })
      return
    }
    const raw = await window.electron.settings.get()
    const settings = normalizeSettings(raw)
    applySettingsToDom(settings, { applyVolume: true })
    if (settings.uiScale !== raw.uiScale) {
      void window.electron.settings.set({ uiScale: settings.uiScale })
    }
    set({ settings, loaded: true })
  },

  update: async (partial) => {
    if (!window.electron) return
    const nextPartial =
      partial.uiScale !== undefined
        ? { ...partial, uiScale: snapUiScale(partial.uiScale) }
        : partial
    const settings = normalizeSettings(await window.electron.settings.set(nextPartial))
    applySettingsToDom(settings, { changed: nextPartial })
    set({ settings })
  },

  reset: async () => {
    if (!window.electron) return
    const settings = await window.electron.settings.reset()
    applySettingsToDom(settings)
    set({ settings })
  },
}))
