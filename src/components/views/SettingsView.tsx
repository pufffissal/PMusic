import { useCallback, useEffect, useRef, useState } from 'react'
import { useSettingsStore, UI_SCALE_PRESETS } from '@/store/settingsStore'
import type { AppSettings } from '@/store/settingsStore'
import {
  SettingSection,
  SettingRow,
  SettingGroupLabel,
  SettingNote,
  SettingButton,
  Toggle,
} from '@/components/settings/SettingRow'
import { useAppUpdate } from '@/hooks/useAppUpdate'
import { Appear, Stagger, StaggerItem } from '@/components/ui/motion'
import { cn } from '@/lib/cn'

const ACCENT_PRESETS = ['#fa2d48', '#fc3c44', '#1db954', '#0a84ff', '#bf5af2', '#ff9f0a', '#64d2ff']

const THEMES = [
  { id: 'dark' as const, label: 'Dark' },
  { id: 'glass' as const, label: 'Glass' },
  { id: 'white' as const, label: 'White' },
]

const SHORTCUTS = [
  { keys: '1', action: 'Home' },
  { keys: '2', action: 'Search' },
  { keys: '3', action: 'Library' },
  { keys: '4', action: 'Downloads' },
  { keys: '5', action: 'Artists' },
  { keys: '6', action: 'Stats' },
  { keys: '7', action: 'Settings' },
  { keys: 'Space', action: 'Play / Pause' },
  { keys: 'Ctrl+F', action: 'Focus search' },
  { keys: 'Ctrl+N', action: 'Now Playing' },
  { keys: 'Ctrl+L', action: 'Open queue' },
  { keys: 'Ctrl+,', action: 'Open settings' },
  { keys: 'Ctrl+← / →', action: 'Previous / Next track' },
  { keys: 'Esc', action: 'Close panels' },
]

function chipClass(active: boolean) {
  return cn(
    'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
    active
      ? 'bg-[var(--accent)] text-white'
      : 'bg-[var(--surface-hover)] text-fg-secondary hover:bg-[var(--surface-active)]',
  )
}

function useDebouncedSettingSave(delayMs = 400) {
  const update = useSettingsStore((s) => s.update)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const schedule = useCallback(
    (partial: Partial<AppSettings>) => {
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => void update(partial), delayMs)
    },
    [update, delayMs],
  )

  const flush = useCallback(
    (partial: Partial<AppSettings>) => {
      clearTimeout(timerRef.current)
      void update(partial)
    },
    [update],
  )

  return { schedule, flush }
}

function DiscordSettingsSection({
  discordEnabled,
  discordShowProgress,
  onUpdate,
}: {
  discordEnabled: boolean
  discordShowProgress: boolean
  onUpdate: (partial: Partial<AppSettings>) => Promise<void>
}) {
  const [rpcStatus, setRpcStatus] = useState<'connected' | 'disconnected' | 'no-discord'>('disconnected')
  const [pendingEnabled, setPendingEnabled] = useState<boolean | null>(null)
  const displayEnabled = pendingEnabled ?? discordEnabled

  useEffect(() => {
    if (!window.electron?.discord) return
    const refresh = () => {
      void window.electron.discord.status().then(setRpcStatus)
    }
    refresh()
    const interval = setInterval(refresh, 3000)
    return () => clearInterval(interval)
  }, [discordEnabled, pendingEnabled])

  const statusLabel =
    rpcStatus === 'connected'
      ? 'Connected'
      : rpcStatus === 'no-discord'
        ? 'Discord not running'
        : displayEnabled
          ? 'Not connected'
          : 'Off'

  const handleEnabledChange = (enabled: boolean) => {
    setPendingEnabled(enabled)
    void onUpdate({ discordEnabled: enabled }).finally(() => setPendingEnabled(null))
  }

  return (
    <SettingSection title="Discord" description="Show the song you're playing on your Discord profile">
      <SettingRow
        label="Show current song on Discord"
        description={`${statusLabel}. Requires Discord desktop to be open.`}
      >
        <Toggle
          checked={displayEnabled}
          onChange={handleEnabledChange}
        />
      </SettingRow>

      <SettingRow
        label="Show playback progress"
        description="Time remaining on the Rich Presence card while playing"
        className={displayEnabled ? undefined : 'pointer-events-none opacity-40'}
      >
        <Toggle
          checked={discordShowProgress}
          disabled={!displayEnabled}
          onChange={(v) => void onUpdate({ discordShowProgress: v })}
        />
      </SettingRow>
    </SettingSection>
  )
}

function UpdatesSettingsSection() {
  const { state, check, download, install } = useAppUpdate()

  const statusText =
    state.message ??
    (state.status === 'checking'
      ? 'Checking…'
      : state.status === 'available'
        ? `Update ${state.version} available`
        : state.status === 'downloading'
          ? 'Downloading…'
          : state.status === 'ready'
            ? `Ready to install ${state.version}`
            : state.status === 'error'
              ? state.error ?? 'Check failed'
              : 'Up to date')

  return (
    <SettingSection title="Updates" description="Keep PMusic up to date from GitHub Releases">
      <SettingRow label="Status" description={statusText}>
        <SettingButton onClick={() => void check()}>Check now</SettingButton>
      </SettingRow>
      {state.status === 'available' && (
        <SettingRow label="Download" description={`Install PMusic ${state.version}`}>
          <SettingButton onClick={() => void download()}>Download</SettingButton>
        </SettingRow>
      )}
      {state.status === 'ready' && (
        <SettingRow label="Install" description="Restart PMusic to finish updating">
          <SettingButton onClick={() => install()}>Restart now</SettingButton>
        </SettingRow>
      )}
    </SettingSection>
  )
}

export function SettingsView() {
  const settings = useSettingsStore((s) => s.settings)
  const update = useSettingsStore((s) => s.update)
  const reset = useSettingsStore((s) => s.reset)
  const { schedule: scheduleSave, flush: flushSave } = useDebouncedSettingSave()
  const [cacheStats, setCacheStats] = useState({ formatted: '…', fileCount: 0 })
  const [clearingCache, setClearingCache] = useState(false)
  const [historyCount, setHistoryCount] = useState(0)
  const [hiddenCount, setHiddenCount] = useState(0)
  const [clearingHistory, setClearingHistory] = useState(false)
  const [clearingStats, setClearingStats] = useState(false)

  const refreshLibraryCounts = useCallback(async () => {
    const [history, hidden] = await Promise.all([
      window.electron?.library.getHistory(),
      window.electron?.library.getHiddenTrackIds(),
    ])
    setHistoryCount(history?.length ?? 0)
    setHiddenCount(hidden?.length ?? 0)
  }, [])

  useEffect(() => {
    void window.electron?.cache.getStats().then(setCacheStats)
    void refreshLibraryCounts()
  }, [refreshLibraryCounts])

  useEffect(() => {
    const onLibraryChanged = () => void refreshLibraryCounts()
    window.addEventListener('pmusic:library-changed', onLibraryChanged)
    return () => window.removeEventListener('pmusic:library-changed', onLibraryChanged)
  }, [refreshLibraryCounts])

  const performClearHistory = async () => {
    await window.electron?.library.clearHistory()
    window.dispatchEvent(new CustomEvent('pmusic:library-changed', { detail: { type: 'history' } }))
    await refreshLibraryCounts()
  }

  return (
    <div className="h-full overflow-y-auto">
      <Appear className="am-view-header px-8 pb-6 pt-8">
        <h1 className="section-title relative z-[1]">Settings</h1>
        <p className="section-subtitle relative z-[1]">Customize how PMusic looks, plays, and connects</p>
      </Appear>

      <Stagger className="mx-auto max-w-2xl space-y-5 px-8 pb-10">
        <StaggerItem>
        <SettingSection title="Appearance" description="Theme, layout, and motion">
          <SettingRow label="Theme" description="Glass, solid dark, or light">
            <div className="flex flex-wrap justify-end gap-1.5">
              {THEMES.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => void update({ theme: id })}
                  className={chipClass(settings.theme === id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </SettingRow>

          {settings.theme === 'glass' && (
            <SettingRow label="Glass intensity" description="More blur and transparency on High">
              <div className="flex gap-1.5">
                {(['normal', 'high'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => void update({ glassIntensity: v })}
                    className={chipClass(settings.glassIntensity === v)}
                  >
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
            </SettingRow>
          )}

          <SettingRow label="UI scale" description="Text and control size across the app">
            <div className="flex flex-wrap justify-end gap-1.5">
              {UI_SCALE_PRESETS.map(({ label, value }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => void update({ uiScale: value })}
                  className={chipClass(settings.uiScale === value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </SettingRow>

          <SettingRow label="Compact player bar" description="Shorter bottom player">
            <Toggle checked={settings.compactPlayer} onChange={(v) => void update({ compactPlayer: v })} />
          </SettingRow>

          <SettingRow
            label="Reduce motion"
            description="Off — full experience with page transitions, staggered lists, aurora blobs, and smooth lyric scrolling. On — instant, static UI if motion feels distracting or uncomfortable."
          >
            <Toggle checked={settings.reduceMotion} onChange={(v) => void update({ reduceMotion: v })} />
          </SettingRow>
        </SettingSection>
        </StaggerItem>

        <StaggerItem>
        <SettingSection title="Colors & effects" description="Accent color and visual flourishes">
          <SettingRow label="Dynamic accent" description="Pull color from album artwork">
            <Toggle
              checked={settings.useDynamicAccent}
              onChange={(v) => void update({ useDynamicAccent: v })}
            />
          </SettingRow>

          {!settings.useDynamicAccent && (
            <>
              <SettingGroupLabel>Accent color</SettingGroupLabel>
              <div className="flex flex-wrap gap-2 px-5 pb-4">
                {ACCENT_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Accent ${color}`}
                    onClick={() => void update({ accentColor: color })}
                    className={cn(
                      'h-8 w-8 rounded-full ring-2 ring-offset-2 ring-offset-transparent transition-transform hover:scale-105',
                      settings.accentColor === color ? 'ring-[var(--text-primary)]' : 'ring-transparent',
                    )}
                    style={{ background: color }}
                  />
                ))}
              </div>
            </>
          )}

          {settings.theme === 'glass' && (
            <SettingRow
              label="Aurora background"
              description="Liquid glass mesh gradients and animated color blobs behind the UI"
            >
              <Toggle
                checked={settings.showAuroraEffects}
                onChange={(v) => void update({ showAuroraEffects: v })}
              />
            </SettingRow>
          )}

          <SettingRow label="Album art glow" description="Accent pulse on artwork while playing">
            <Toggle
              checked={settings.showPlayerArtworkGlow}
              onChange={(v) => void update({ showPlayerArtworkGlow: v })}
            />
          </SettingRow>
        </SettingSection>
        </StaggerItem>

        <StaggerItem>
        <SettingSection title="Playback" description="How music starts, continues, and stops">
          <SettingRow label="Default volume" description={`${Math.round(settings.defaultVolume * 100)}% when the app opens`}>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.defaultVolume}
              onChange={(e) => {
                const value = parseFloat(e.target.value)
                scheduleSave({ defaultVolume: value })
                useSettingsStore.setState((s) => ({
                  settings: { ...s.settings, defaultVolume: value },
                }))
              }}
              onPointerUp={(e) => {
                flushSave({ defaultVolume: parseFloat(e.currentTarget.value) })
              }}
              className="w-28 accent-[var(--accent)]"
            />
          </SettingRow>

          <SettingRow
            label="Autoplay similar"
            description="Continue with artist radio when the queue runs out"
          >
            <Toggle checked={settings.autoplaySimilar} onChange={(v) => void update({ autoplaySimilar: v })} />
          </SettingRow>

          <SettingRow label="Pre-buffer next track" description="Load the next song early">
            <Toggle
              checked={settings.prebufferNextTrack}
              onChange={(v) => void update({ prebufferNextTrack: v })}
            />
          </SettingRow>

          <SettingRow label="Stream quality" description="Audio quality for streaming playback">
            <div className="flex flex-wrap gap-1.5">
              {(['best', 'high', 'medium', 'low'] as const).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => void update({ streamQuality: q })}
                  className={cn(chipClass(settings.streamQuality === q), 'capitalize')}
                >
                  {q}
                </button>
              ))}
            </div>
          </SettingRow>

          <SettingRow label="Crossfade" description="Fade between tracks when skipping or at queue transitions">
            <Toggle
              checked={settings.crossfadeEnabled}
              onChange={(v) => void update({ crossfadeEnabled: v })}
            />
          </SettingRow>

          {settings.crossfadeEnabled && (
            <SettingRow label="Crossfade duration" description={`${settings.crossfadeDuration}s overlap`}>
              <input
                type="range"
                min={1}
                max={12}
                step={1}
                value={settings.crossfadeDuration}
                onChange={(e) => void update({ crossfadeDuration: parseInt(e.target.value, 10) })}
                className="w-28 accent-[var(--accent)]"
              />
            </SettingRow>
          )}

          <SettingRow label="Gapless playback" description="Start the next track before the current one ends">
            <Toggle
              checked={settings.gaplessEnabled}
              onChange={(v) => void update({ gaplessEnabled: v })}
            />
          </SettingRow>

          <SettingRow label="Open Now Playing on play" description="Show the full-screen player automatically">
            <Toggle
              checked={settings.openNowPlayingOnPlay}
              onChange={(v) => void update({ openNowPlayingOnPlay: v })}
            />
          </SettingRow>

          <SettingRow
            label="Pause when unfocused"
            description="Pause when you switch to another app or minimize"
          >
            <Toggle
              checked={settings.pauseOnFocusLoss}
              onChange={(v) => void update({ pauseOnFocusLoss: v })}
            />
          </SettingRow>

          <SettingRow
            label="Resume where you left off"
            description="Restore your last song, queue, and playback position when reopening the app"
          >
            <Toggle
              checked={settings.resumePlayback}
              onChange={(v) => void update({ resumePlayback: v })}
            />
          </SettingRow>
        </SettingSection>
        </StaggerItem>

        <StaggerItem>
        <DiscordSettingsSection
          discordEnabled={settings.discordEnabled}
          discordShowProgress={settings.discordShowProgress}
          onUpdate={update}
        />
        </StaggerItem>

        <StaggerItem>
        <SettingSection title="Lyrics" description="Now Playing lyrics panel">
          <SettingRow label="Show lyrics">
            <Toggle checked={settings.showLyrics} onChange={(v) => void update({ showLyrics: v })} />
          </SettingRow>

          <SettingRow
            label="Synced lyrics"
            description="Highlight the current line in time with the song"
            className={!settings.showLyrics ? 'opacity-50' : undefined}
          >
            <Toggle
              checked={settings.syncedLyrics}
              disabled={!settings.showLyrics}
              onChange={(v) =>
                void update({ syncedLyrics: v, ...(v ? {} : { lyricsSyncMode: 'line' as const }) })
              }
            />
          </SettingRow>

          {settings.showLyrics && (
            <SettingNote>Lyrics are fetched from LRCLIB when available.</SettingNote>
          )}

          <SettingRow
            label="Sync style"
            description="Clause and word modes estimate timing between line markers — not exact karaoke data unless the file includes word tags"
            className={!settings.showLyrics || !settings.syncedLyrics ? 'opacity-50' : undefined}
          >
            <div className="flex flex-wrap justify-end gap-1.5">
              {(
                [
                  { id: 'line', label: 'Line' },
                  { id: 'clause', label: 'Clause' },
                  { id: 'word', label: 'Word' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  disabled={!settings.showLyrics || !settings.syncedLyrics}
                  onClick={() => void update({ lyricsSyncMode: m.id })}
                  className={cn(chipClass(settings.lyricsSyncMode === m.id))}
                  title={
                    m.id === 'line'
                      ? 'Highlight full lines'
                      : m.id === 'clause'
                        ? 'Phrase groups (commas, breaths) — estimated'
                        : 'Each word — experimental estimate'
                  }
                >
                  {m.label}
                </button>
              ))}
            </div>
          </SettingRow>

          <SettingRow
            label="Scroll static lyrics"
            description="Allow scrolling when lyrics aren't synced to the song"
            className={!settings.showLyrics ? 'opacity-50' : undefined}
          >
            <Toggle
              checked={settings.scrollStaticLyrics}
              disabled={!settings.showLyrics}
              onChange={(v) => void update({ scrollStaticLyrics: v })}
            />
          </SettingRow>

          <SettingRow
            label="Lyrics size"
            className={!settings.showLyrics ? 'opacity-50' : undefined}
          >
            <div className="flex gap-1.5">
              {(['small', 'medium', 'large'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  disabled={!settings.showLyrics}
                  onClick={() => void update({ lyricsFontSize: v })}
                  className={cn(chipClass(settings.lyricsFontSize === v), 'capitalize')}
                >
                  {v}
                </button>
              ))}
            </div>
          </SettingRow>
        </SettingSection>
        </StaggerItem>

        <StaggerItem>
        <SettingSection title="Browse & lists" description="Search and track list behavior">
          <SettingRow
            label="Enhanced search"
            description="Polished search tab with filters, recent searches, and a larger search bar"
          >
            <Toggle
              checked={settings.enhancedSearch}
              onChange={(v) => void update({ enhancedSearch: v })}
            />
          </SettingRow>

          <SettingRow
            label="Search delay"
            description={`Wait ${settings.searchDebounceMs}ms after typing`}
          >
            <input
              type="range"
              min={80}
              max={400}
              step={20}
              value={settings.searchDebounceMs}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10)
                scheduleSave({ searchDebounceMs: value })
                useSettingsStore.setState((s) => ({
                  settings: { ...s.settings, searchDebounceMs: value },
                }))
              }}
              onPointerUp={(e) => {
                flushSave({ searchDebounceMs: parseInt(e.currentTarget.value, 10) })
              }}
              className="w-28 accent-[var(--accent)]"
            />
          </SettingRow>

          <SettingRow label="Track numbers in lists">
            <Toggle
              checked={settings.showTrackNumbers}
              onChange={(v) => void update({ showTrackNumbers: v })}
            />
          </SettingRow>

          <SettingRow label="Duration in lists">
            <Toggle
              checked={settings.showDurationInLists}
              onChange={(v) => void update({ showDurationInLists: v })}
            />
          </SettingRow>
        </SettingSection>
        </StaggerItem>

        <StaggerItem>
        <SettingSection title="Downloads" description="MP3 export options">
          <SettingRow
            label="Save folder"
            description={settings.downloadFolder || 'Downloads/PMusic (default)'}
          >
            <SettingButton
              onClick={async () => {
                const folder = await window.electron?.download.pickFolder()
                if (folder) void update({ downloadFolder: folder })
              }}
            >
              Choose…
            </SettingButton>
          </SettingRow>

          {settings.downloadFolder && (
            <div className="px-5 pb-2">
              <SettingButton variant="danger" onClick={() => void update({ downloadFolder: null })}>
                Reset to default folder
              </SettingButton>
            </div>
          )}

          <SettingRow label="MP3 quality">
            <div className="flex flex-wrap justify-end gap-1.5">
              {(['best', '320', '192', '128'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => void update({ downloadQuality: v })}
                  className={chipClass(settings.downloadQuality === v)}
                >
                  {v === 'best' ? 'Best' : `${v}k`}
                </button>
              ))}
            </div>
          </SettingRow>

          <SettingRow label="Embed metadata" description="Title, artist, and album tags">
            <Toggle
              checked={settings.downloadEmbedMetadata}
              onChange={(v) => void update({ downloadEmbedMetadata: v })}
            />
          </SettingRow>

          <SettingRow label="Embed thumbnail" description="Album art inside the MP3 file">
            <Toggle
              checked={settings.downloadEmbedThumbnail}
              onChange={(v) => void update({ downloadEmbedThumbnail: v })}
            />
          </SettingRow>

          <SettingNote>
            Tracks are downloaded as MP3 via play-dl. ffmpeg is bundled with the installer; in dev run{' '}
            <code className="text-fg-secondary">scripts/prepare-resources.ps1</code> if downloads fail.
          </SettingNote>
        </SettingSection>
        </StaggerItem>

        <StaggerItem>
        <SettingSection title="Your data" description="Listening history, stats, and recommendations">
          <SettingRow
            label="Recently played"
            description={
              historyCount > 0
                ? `${historyCount} track${historyCount === 1 ? '' : 's'} on Home`
                : 'No recently played tracks'
            }
          >
            <SettingButton
              disabled={clearingHistory || historyCount === 0}
              onClick={async () => {
                if (
                  !window.confirm('Remove all tracks from Recently played? Stats will also reset.')
                ) {
                  return
                }
                setClearingHistory(true)
                try {
                  await performClearHistory()
                } finally {
                  setClearingHistory(false)
                }
              }}
            >
              {clearingHistory ? 'Clearing…' : 'Clear'}
            </SettingButton>
          </SettingRow>
          <SettingRow
            label="Listening statistics"
            description="Play counts, top artists, and activity on the Stats page"
          >
            <SettingButton
              disabled={clearingStats || historyCount === 0}
              onClick={async () => {
                if (
                  !window.confirm(
                    'Clear all listening statistics? This removes your play history and cannot be undone.',
                  )
                ) {
                  return
                }
                setClearingStats(true)
                try {
                  await performClearHistory()
                } finally {
                  setClearingStats(false)
                }
              }}
            >
              {clearingStats ? 'Clearing…' : 'Clear'}
            </SettingButton>
          </SettingRow>
          <SettingRow
            label="Hidden recommendations"
            description={
              hiddenCount > 0
                ? `${hiddenCount} song${hiddenCount === 1 ? '' : 's'} hidden from Similar songs`
                : 'No hidden songs'
            }
          >
            <SettingButton
              disabled={hiddenCount === 0}
              onClick={async () => {
                if (!window.confirm('Show all hidden songs in recommendations again?')) return
                await window.electron?.library.clearHiddenTracks()
                window.dispatchEvent(
                  new CustomEvent('pmusic:library-changed', { detail: { type: 'hidden' } }),
                )
                await refreshLibraryCounts()
              }}
            >
              Restore all
            </SettingButton>
          </SettingRow>
          <SettingNote>
            Stats and Recently played share the same play history. Right-click a track on Home to remove
            one entry or hide it from recommendations.
          </SettingNote>
        </SettingSection>
        </StaggerItem>

        <StaggerItem>
        <SettingSection title="Storage" description="Cached streams, search, and home data">
          <SettingRow
            label="App cache"
            description={`${cacheStats.formatted} · ${cacheStats.fileCount} files`}
          >
            <SettingButton
              disabled={clearingCache}
              onClick={async () => {
                setClearingCache(true)
                try {
                  const stats = await window.electron?.cache.clearAll()
                  if (stats) setCacheStats(stats)
                } finally {
                  setClearingCache(false)
                }
              }}
            >
              {clearingCache ? 'Clearing…' : 'Clear cache'}
            </SettingButton>
          </SettingRow>
          <SettingNote>
            Caches stream URLs, search, metadata, and more (up to about 512 MB). Clear it if playback or search acts stale.
          </SettingNote>
        </SettingSection>
        </StaggerItem>

        <StaggerItem>
        <UpdatesSettingsSection />
        </StaggerItem>

        <StaggerItem>
        <SettingSection title="Keyboard shortcuts">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 px-5 py-4 text-sm">
            {SHORTCUTS.map(({ keys, action }) => (
              <div key={keys} className="contents">
                <dt>
                  <kbd className="rounded-md bg-[var(--surface-hover)] px-2 py-1 font-mono text-[11px] text-fg-secondary">
                    {keys}
                  </kbd>
                </dt>
                <dd className="text-fg-secondary">{action}</dd>
              </div>
            ))}
          </dl>
        </SettingSection>
        </StaggerItem>

        <StaggerItem>
        <button
          type="button"
          onClick={() => void reset()}
          className="w-full rounded-xl border border-[var(--border-glass)] py-3 text-sm text-fg-secondary transition-colors hover:bg-[var(--surface-hover)]"
        >
          Reset all settings to defaults
        </button>
        </StaggerItem>
      </Stagger>
    </div>
  )
}
