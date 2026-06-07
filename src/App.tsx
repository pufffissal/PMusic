import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TitleBar } from '@/components/layout/TitleBar'
import { MainContent } from '@/components/layout/MainContent'
import { AmbientBackground } from '@/components/layout/AmbientBackground'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { PlayerBar } from '@/components/player/PlayerBar'
import { PlayerPanels, QueueBackdrop } from '@/components/player/PlayerPanels'
import { MiniPlayer } from '@/components/ui/MiniPlayer'
import { DownloadBanner } from '@/components/ui/DownloadBanner'
import { UpdateDialog } from '@/components/ui/UpdateDialog'
import { ToastHost } from '@/components/ui/ToastHost'
import { PlaybackErrorBanner } from '@/components/player/PlaybackErrorBanner'
import { CatalogDetailPanel } from '@/components/views/CatalogDetailPanel'
import { AnimatePresence } from 'framer-motion'
import { PlaylistDialogs } from '@/components/playlists/PlaylistDialogs'
import { useAppStore, type ViewId } from '@/store/appStore'
import { usePlayerStore } from '@/store/playerStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useAudio } from '@/hooks/useAudio'
import { usePlaybackPersistence } from '@/hooks/usePlaybackPersistence'
import { useSleepTimer } from '@/hooks/useSleepTimer'
import { useNowPlayingPrefetch } from '@/hooks/useNowPlayingPrefetch'
import { useDiscordRPC } from '@/hooks/useDiscordRPC'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 60_000 },
  },
})

const VIEW_SHORTCUTS: Record<string, ViewId> = {
  '1': 'home',
  '2': 'search',
  '3': 'library',
  '4': 'downloads',
  '5': 'artists',
  '6': 'stats',
  '7': 'settings',
}

function AppShell() {
  const miniMode = useAppStore((s) => s.miniMode)
  const setMiniMode = useAppStore((s) => s.setMiniMode)
  const setView = useAppStore((s) => s.setView)
  const setQueueOpen = usePlayerStore((s) => s.setQueueOpen)
  const setNowPlayingOpen = useAppStore((s) => s.setNowPlayingOpen)
  const togglePlay = usePlayerStore((s) => s.togglePlay)
  const next = usePlayerStore((s) => s.next)
  const previous = usePlayerStore((s) => s.previous)
  const loadSettings = useSettingsStore((s) => s.load)
  const pauseOnFocusLoss = useSettingsStore((s) => s.settings.pauseOnFocusLoss)
  const setPlaying = usePlayerStore((s) => s.setPlaying)
  const hasTrack = usePlayerStore((s) => s.queue.length > 0)

  const {
    audioRef,
    handleTimeUpdate,
    handleLoadedMetadata,
    handleEnded,
    handleError,
    handleStalled,
    seek,
    retryPlayback,
    retryWithLowerQuality,
    clearCacheAndRetry,
    currentTrack,
  } = useAudio()

  usePlaybackPersistence()
  useSleepTimer()
  useNowPlayingPrefetch()
  useDiscordRPC()

  useEffect(() => {
    const syncPlaying = (playing: boolean) => {
      document.documentElement.dataset.playing = playing ? 'true' : 'false'
    }
    syncPlaying(usePlayerStore.getState().isPlaying)
    return usePlayerStore.subscribe((s) => syncPlaying(s.isPlaying))
  }, [])

  useEffect(() => {
    void loadSettings().then(() => {
      if (!useSettingsStore.getState().settings.prebufferNextTrack) return
      void window.electron?.library.getHistory().then((history: { id: string }[]) => {
        const ids = history.slice(0, 4).map((e) => e.id)
        if (ids.length) void window.electron?.stream.prefetch(ids)
      })
    })
    void window.electron?.window.getMiniMode().then(setMiniMode)
  }, [loadSettings, setMiniMode])

  useEffect(() => {
    if (!pauseOnFocusLoss) return

    const pauseIfPlaying = () => {
      if (usePlayerStore.getState().isPlaying) {
        setPlaying(false)
      }
    }

    const onVis = () => {
      if (document.hidden) pauseIfPlaying()
    }

    const unsubBlur = window.electron?.window.onBlur(pauseIfPlaying)
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('blur', pauseIfPlaying)

    return () => {
      unsubBlur?.()
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('blur', pauseIfPlaying)
    }
  }, [pauseOnFocusLoss, setPlaying])

  useEffect(() => {
    const unsubNext = window.electron?.player.onNext(() => next())
    const unsubPrev = window.electron?.player.onPrevious(() => previous())
    const unsubToggle = window.electron?.player.onTogglePlay(() => togglePlay())
    const unsubVolUp = window.electron?.player.onVolumeUp(() => {
      const { volume, setVolume } = usePlayerStore.getState()
      setVolume(Math.min(1, volume + 0.05))
    })
    const unsubVolDown = window.electron?.player.onVolumeDown(() => {
      const { volume, setVolume } = usePlayerStore.getState()
      setVolume(Math.max(0, volume - 0.05))
    })
    const unsubMute = window.electron?.player.onToggleMute(() => usePlayerStore.getState().toggleMute())
    const unsubShuffle = window.electron?.player.onToggleShuffle(() => usePlayerStore.getState().toggleShuffle())
    const unsubRepeat = window.electron?.player.onCycleRepeat(() => usePlayerStore.getState().cycleRepeat())
    return () => {
      unsubNext?.()
      unsubPrev?.()
      unsubToggle?.()
      unsubVolUp?.()
      unsubVolDown?.()
      unsubMute?.()
      unsubShuffle?.()
      unsubRepeat?.()
    }
  }, [next, previous, togglePlay])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const tag = target?.tagName
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable

      if (e.code === 'Space' && !typing) {
        e.preventDefault()
        togglePlay()
      }

      if (e.key === 'Escape') {
        setQueueOpen(false)
        setNowPlayingOpen(false)
      }

      if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const view = VIEW_SHORTCUTS[e.key]
        if (view) {
          e.preventDefault()
          setView(view)
        }
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault()
        setQueueOpen(true)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault()
        setView('search')
        useAppStore.getState().requestSearchFocus()
        requestAnimationFrame(() => {
          document.querySelector<HTMLInputElement>('.search-input')?.focus()
        })
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault()
        setView('settings')
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n' && hasTrack) {
        e.preventDefault()
        setNowPlayingOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [togglePlay, setView, setQueueOpen, setNowPlayingOpen, hasTrack])

  return (
    <div className="relative h-full w-full">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={() => void handleError()}
        onStalled={() => handleStalled()}
        onWaiting={() => handleStalled()}
      />

      {miniMode ? (
        <MiniPlayer
          title={currentTrack?.title}
          artist={currentTrack?.artist}
          thumbnail={currentTrack?.thumbnail}
        />
      ) : (
        <>
          <div className="app-shell accent-transition flex h-full flex-col">
            <AmbientBackground />
            <div className="app-shell__chrome">
              <TitleBar />
              <div className="flex min-h-0 flex-1 gap-0 p-0">
                <Sidebar />
                <main className="surface-panel relative m-3 mr-3 mb-0 min-w-0 flex-1 overflow-hidden">
                  <MainContent />
                </main>
              </div>
              <div className="px-3 pb-3 pt-2">
                <PlayerBar
                  onSeek={seek}
                  thumbnail={currentTrack?.thumbnail}
                  title={currentTrack?.title}
                  artist={currentTrack?.artist}
                />
              </div>
            </div>
          </div>
          <QueueBackdrop />
          <PlayerPanels onSeek={seek} />
          <PlaybackErrorBanner
            onRetry={() => void retryPlayback()}
            onLowerQuality={() => void retryWithLowerQuality()}
            onClearCache={() => void clearCacheAndRetry()}
          />
          <DownloadBanner />
          <UpdateDialog />
          <ToastHost />
          <AnimatePresence>
            <CatalogDetailPanel />
          </AnimatePresence>
          <PlaylistDialogs />
        </>
      )}
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  )
}
