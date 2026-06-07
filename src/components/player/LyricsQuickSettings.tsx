import { useEffect, useRef, useState } from 'react'
import { RefreshCw, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useSettingsStore } from '@/store/settingsStore'
import { useAppStore } from '@/store/appStore'

interface LyricsQuickSettingsProps {
  trackId: string | undefined
  hasSynced: boolean
  offsetMs: number
  onOffsetChange: (ms: number) => void
  className?: string
}

export function LyricsQuickSettings({
  trackId,
  hasSynced,
  offsetMs,
  onOffsetChange,
  className,
}: LyricsQuickSettingsProps) {
  const showLyrics = useSettingsStore((s) => s.settings.showLyrics)
  const syncedLyrics = useSettingsStore((s) => s.settings.syncedLyrics)
  const updateSettings = useSettingsStore((s) => s.update)
  const setTrackDetails = useAppStore((s) => s.setTrackDetails)
  const setTrackDetailsLoadingId = useAppStore((s) => s.setTrackDetailsLoadingId)
  const details = useAppStore((s) => s.trackDetails)

  const [menuOpen, setMenuOpen] = useState(false)
  const [savedHint, setSavedHint] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!trackId || !window.electron) return
    void window.electron.lyrics.getOverride(trackId).then((o) => {
      if (o?.offsetMs != null) onOffsetChange(o.offsetMs)
    })
  }, [trackId, onOffsetChange])

  useEffect(() => {
    if (!menuOpen) return
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuOpen])

  const refreshLyrics = async () => {
    if (!trackId || !window.electron) return
    setRefreshing(true)
    setTrackDetailsLoadingId(trackId)
    try {
      const hints =
        details?.id === trackId
          ? { artist: details.artist, title: details.title, duration: details.duration, album: details.album }
          : null
      if (hints) {
        const lyrics = await window.electron.metadata.fetchLyrics({
          videoId: trackId,
          ...hints,
          skipCache: true,
        })
        if (details?.id === trackId) setTrackDetails({ ...details, ...lyrics })
      } else {
        const meta = await window.electron.metadata.refetchLyrics(trackId)
        if (meta.id === trackId) setTrackDetails(meta)
      }
    } finally {
      setRefreshing(false)
      setTrackDetailsLoadingId(null)
    }
  }

  const persistOffset = async (ms: number) => {
    onOffsetChange(ms)
    if (!trackId || !window.electron) return
    await window.electron.lyrics.setOverride(trackId, { offsetMs: ms })
    setSavedHint(true)
    window.setTimeout(() => setSavedHint(false), 1200)
  }

  const nudgeOffset = (delta: number) => {
    void persistOffset(offsetMs + delta)
  }

  return (
    <div className={cn('now-playing__lyrics-opts', className)} ref={menuRef}>
      <MiniOpt
        label="Show"
        active={showLyrics}
        onClick={() => void updateSettings({ showLyrics: !showLyrics })}
        title={showLyrics ? 'Hide lyrics' : 'Show lyrics'}
      />
      <MiniOpt
        label="Sync"
        active={syncedLyrics}
        disabled={!showLyrics || !hasSynced}
        onClick={() => void updateSettings({ syncedLyrics: !syncedLyrics })}
        title={
          !showLyrics
            ? 'Turn on Show first'
            : !hasSynced
              ? 'No synced lyrics for this track'
              : syncedLyrics
                ? 'Use static lyrics'
                : 'Sync lyrics to playback'
        }
      />

      <div className="relative">
        <button
          type="button"
          title="Lyrics options"
          aria-expanded={menuOpen}
          aria-haspopup="true"
          onClick={() => setMenuOpen((o) => !o)}
          className={cn(
            'now-playing__lyrics-opt now-playing__lyrics-opt--icon',
            menuOpen && 'now-playing__lyrics-opt--on',
          )}
        >
          <SlidersHorizontal size={13} strokeWidth={2.25} />
        </button>

        {menuOpen && (
          <div className="now-playing__lyrics-menu" role="menu">
            <button
              type="button"
              role="menuitem"
              disabled={refreshing || !showLyrics}
              className="now-playing__lyrics-menu-chip w-full justify-center"
              onClick={() => void refreshLyrics()}
            >
              <RefreshCw size={12} className={cn(refreshing && 'animate-spin')} />
              {refreshing ? 'Loading…' : 'Refresh lyrics'}
            </button>

            {hasSynced && syncedLyrics && (
              <>
                <p className="now-playing__lyrics-menu-label">Sync offset</p>
                <p className="now-playing__lyrics-menu-hint">
                  Shift lyrics timing for this track only.
                </p>
                <div className="now-playing__lyrics-menu-row now-playing__lyrics-menu-row--offset">
                  <button type="button" className="now-playing__lyrics-menu-chip" onClick={() => nudgeOffset(-100)}>
                    −100
                  </button>
                  <button type="button" className="now-playing__lyrics-menu-chip" onClick={() => nudgeOffset(-50)}>
                    −50
                  </button>
                  <span className="now-playing__lyrics-offset-value">
                    {offsetMs > 0 ? '+' : ''}
                    {offsetMs} ms
                  </span>
                  <button type="button" className="now-playing__lyrics-menu-chip" onClick={() => nudgeOffset(50)}>
                    +50
                  </button>
                  <button type="button" className="now-playing__lyrics-menu-chip" onClick={() => nudgeOffset(100)}>
                    +100
                  </button>
                </div>
                <div className="now-playing__lyrics-menu-footer">
                  {offsetMs !== 0 && (
                    <button
                      type="button"
                      className="now-playing__lyrics-menu-reset"
                      onClick={() => void persistOffset(0)}
                    >
                      Reset
                    </button>
                  )}
                  {savedHint && <span className="now-playing__lyrics-menu-saved">Saved</span>}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function MiniOpt({
  label,
  active,
  disabled,
  onClick,
  title,
}: {
  label: string
  active: boolean
  disabled?: boolean
  onClick: () => void
  title: string
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'now-playing__lyrics-opt',
        active && 'now-playing__lyrics-opt--on',
        disabled && 'now-playing__lyrics-opt--disabled',
      )}
    >
      {label}
    </button>
  )
}
