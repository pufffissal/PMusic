import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Heart,
  ChevronDown,
  Music2,
  FileText,
  Info,
  ListMusic,
  RefreshCw,
  SkipBack,
  SkipForward,
  Play,
  Pause,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { usePlayerStore } from '@/store/playerStore'
import { useSettingsStore } from '@/store/settingsStore'
import { AuroraBackground } from '@/components/player/AuroraBackground'
import { SyncedLyrics } from '@/components/player/SyncedLyrics'
import { StaticLyrics } from '@/components/player/StaticLyrics'
import { LyricsQuickSettings } from '@/components/player/LyricsQuickSettings'
import { AddToPlaylistButton } from '@/components/playlists/PlaylistDialogs'
import { useVibrant } from '@/hooks/useVibrant'
import { useArtworkGlow } from '@/hooks/useArtworkGlow'
import { useMotion } from '@/hooks/useMotion'
import { ProgressBar } from '@/components/player/ProgressBar'
import { useFormattedDuration } from '@/hooks/useSearch'
import { Appear, Stagger, StaggerItem } from '@/components/ui/motion'
import { EASE_OUT, fadeUp, nowPlayingVariants } from '@/lib/motion'
import { cn } from '@/lib/cn'

type Tab = 'lyrics' | 'about' | 'upnext'

interface NowPlayingViewProps {
  onSeek?: (time: number) => void
  panelTransition?: number
}

export function NowPlayingView({ onSeek, panelTransition = 0 }: NowPlayingViewProps) {
  const setOpen = useAppStore((s) => s.setNowPlayingOpen)
  const setQueueOpen = usePlayerStore((s) => s.setQueueOpen)
  const details = useAppStore((s) => s.trackDetails)
  const trackDetailsLoadingId = useAppStore((s) => s.trackDetailsLoadingId)

  const queue = usePlayerStore((s) => s.queue)
  const currentIndex = usePlayerStore((s) => s.currentIndex)
  const currentTrack = queue[currentIndex]
  const currentTime = usePlayerStore((s) => s.currentTime)
  const duration = usePlayerStore((s) => s.duration)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const togglePlay = usePlayerStore((s) => s.togglePlay)
  const next = usePlayerStore((s) => s.next)
  const previous = usePlayerStore((s) => s.previous)
  const setCurrentIndex = usePlayerStore((s) => s.setCurrentIndex)
  const setPlaying = usePlayerStore((s) => s.setPlaying)
  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime)

  const showLyrics = useSettingsStore((s) => s.settings.showLyrics)
  const preferSynced = useSettingsStore((s) => s.settings.syncedLyrics)
  const scrollStaticLyrics = useSettingsStore((s) => s.settings.scrollStaticLyrics)
  const theme = useSettingsStore((s) => s.settings.theme)
  const showAurora = useSettingsStore((s) => s.settings.showAuroraEffects)
  const showArtworkGlow = useSettingsStore((s) => s.settings.showPlayerArtworkGlow)

  const { reduceMotion, transition, spring } = useMotion()

  const [liked, setLiked] = useState(false)
  const [tab, setTab] = useState<Tab>('lyrics')
  const [lyricsOffsetMs, setLyricsOffsetMs] = useState(0)

  useEffect(() => {
    setLyricsOffsetMs(0)
  }, [currentTrack?.id])

  const elapsed = useFormattedDuration(currentTime)
  const total = useFormattedDuration(duration || details?.duration || 0)

  const detailsMatchTrack = details?.id === currentTrack?.id
  const hasSynced = detailsMatchTrack && Boolean(details?.syncedLyrics)
  const hasPlain = detailsMatchTrack && Boolean(details?.plainLyrics)
  const hasLyricsContent = hasSynced || hasPlain
  const showLyricsContent = showLyrics && hasLyricsContent
  const metadataRefreshing = trackDetailsLoadingId === currentTrack?.id
  const [showSyncIndicator, setShowSyncIndicator] = useState(false)
  const upNext = queue.slice(currentIndex + 1, currentIndex + 8)
  const isGlassTheme = theme === 'glass'

  useEffect(() => {
    if (!currentTrack) return
    const trackId = currentTrack.id

    let active = true
    void window.electron?.library.isLiked(trackId).then((likedNow) => {
      if (active) setLiked(likedNow)
    })

    return () => {
      active = false
    }
  }, [currentTrack?.id])

  useEffect(() => {
    if (!metadataRefreshing) {
      setShowSyncIndicator(false)
      return
    }
    const timer = window.setTimeout(() => setShowSyncIndicator(true), 250)
    return () => window.clearTimeout(timer)
  }, [metadataRefreshing])

  const seek = (time: number) => {
    setCurrentTime(time)
    onSeek?.(time)
  }

  const playAt = (index: number) => {
    setCurrentIndex(index)
    setPlaying(true)
  }

  const banner = currentTrack
    ? (detailsMatchTrack && details?.thumbnail) || currentTrack.thumbnail
    : undefined
  useVibrant(banner)
  const artworkGlowStyle = useArtworkGlow(banner, showArtworkGlow)

  if (!currentTrack) return null

  return (
    <motion.div
      custom={panelTransition}
      variants={reduceMotion ? undefined : nowPlayingVariants}
      initial={reduceMotion ? false : 'enter'}
      animate="center"
      exit="exit"
      transition={{ duration: 0.42, ease: EASE_OUT }}
      className="now-playing fixed inset-0 z-[100] flex flex-col"
      style={{ paddingTop: 'var(--titlebar-height)' }}
    >
      <motion.div
        className="now-playing__backdrop"
        initial={reduceMotion ? false : { scale: 1.08, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={transition(0.55)}
      >
        <motion.img
          key={banner}
          src={banner}
          alt=""
          className="now-playing__art-bg"
          initial={reduceMotion ? false : { scale: 1.12 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.8, ease: EASE_OUT }}
        />
        {isGlassTheme && showAurora && <AuroraBackground />}
        <div className="now-playing__scrim" />
        <div className="now-playing__ambient" aria-hidden />
      </motion.div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <Appear className="flex shrink-0 items-center justify-between px-8 py-4" delay={0.05}>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="now-playing__header-btn interactive-scale"
          >
            <ChevronDown size={18} />
            Collapse
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQueueOpen(true)}
              className="now-playing__header-btn interactive-scale"
              title="Open queue"
            >
              <ListMusic size={18} />
              Queue
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="now-playing__icon-btn interactive-scale"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </Appear>

        <div className="now-playing__body flex min-h-0 flex-1 flex-col gap-6 overflow-hidden px-6 pb-6 lg:grid lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] lg:grid-rows-1 lg:gap-12 lg:px-12 lg:pb-8">
          <div className="now-playing__meta flex min-h-0 flex-col gap-5 overflow-y-auto overscroll-contain py-1 lg:justify-center lg:gap-6">
            <section className="now-playing__art-section shrink-0">
              <div
                className={cn(
                  'now-playing__artwork-wrap mx-auto w-full max-w-[260px] lg:max-w-[300px]',
                  showArtworkGlow && 'player-art-glow player-art-glow--enabled',
                )}
                style={artworkGlowStyle}
              >
                <motion.img
                  key={currentTrack.id}
                  initial={reduceMotion ? false : { scale: 0.92, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ ...spring, duration: 0.5 }}
                  src={currentTrack.thumbnail}
                  alt=""
                  className="now-playing__artwork"
                />
              </div>
            </section>

            <section className="now-playing__info shrink-0 text-center lg:text-left">
              <AnimatePresence>
                {showSyncIndicator && (
                  <motion.div
                    initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={transition(0.22)}
                    className="now-playing__sync-badge mx-auto mb-3 lg:mx-0"
                    title="Fetching track details and lyrics"
                  >
                    <RefreshCw
                      size={14}
                      className={cn('shrink-0', !reduceMotion && 'animate-spin')}
                      aria-hidden
                    />
                    <span>Updating track info…</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                key={`meta-${currentTrack.id}`}
                initial={reduceMotion ? false : fadeUp.hidden}
                animate={fadeUp.show}
                transition={transition(0.38)}
              >
                <h1 className="now-playing__title line-clamp-2">
                  {detailsMatchTrack ? details?.title : currentTrack.title}
                </h1>
                <p className="now-playing__artist mt-1.5 line-clamp-1">
                  {detailsMatchTrack ? details?.artist : currentTrack.artist}
                </p>
                {detailsMatchTrack && details?.album && (
                  <p className="mt-1 line-clamp-1 text-sm text-fg-muted">{details.album}</p>
                )}
              </motion.div>
            </section>

            <section className="now-playing__controls-card shrink-0">
              <div className="now-playing__progress-block">
                <ProgressBar onSeek={seek} />
                <div className="now-playing__times">
                  <span>{elapsed}</span>
                  <span>{total}</span>
                </div>
              </div>

              <div className="now-playing__transport">
                <button
                  type="button"
                  onClick={previous}
                  className="now-playing__nav-btn"
                  aria-label="Previous track"
                >
                  <SkipBack size={18} fill="currentColor" />
                </button>
                <button
                  type="button"
                  onClick={() => void togglePlay()}
                  className="now-playing__nav-btn now-playing__nav-btn--primary"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause size={20} fill="currentColor" />
                  ) : (
                    <Play size={20} fill="currentColor" className="ml-0.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={next}
                  className="now-playing__nav-btn"
                  aria-label="Next track"
                >
                  <SkipForward size={18} fill="currentColor" />
                </button>
              </div>

              <div className="now-playing__actions">
                <button
                  type="button"
                  onClick={async () => {
                    await window.electron?.library.toggleLike({
                      id: currentTrack.id,
                      title: currentTrack.title,
                      artist: currentTrack.artist,
                      thumbnail: currentTrack.thumbnail,
                      likedAt: Date.now(),
                    })
                    setLiked((v) => !v)
                  }}
                  className={cn('now-playing__action-btn', liked && 'now-playing__action-btn--active')}
                  title={liked ? 'Unlike' : 'Like'}
                  aria-label={liked ? 'Unlike' : 'Like'}
                >
                  <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
                </button>
                <AddToPlaylistButton
                  track={currentTrack}
                  className="now-playing__action-btn"
                  iconOnly
                />
              </div>
            </section>
          </div>

          <SlideUpPanel className="now-playing__panel-col min-h-0 flex-1 lg:flex-none" delay={0.08}>
            <div className="now-playing__panel h-full">
              <div className="now-playing__panel-art">
                <img src={banner} alt="" />
              </div>

              <header className="now-playing__panel-header">
                <div className="now-playing__panel-header-row">
                  <div className="now-playing__tabs" role="tablist" aria-label="Now playing sections">
                    <TabButton
                      active={tab === 'lyrics'}
                      onClick={() => setTab('lyrics')}
                      icon={Music2}
                      label="Lyrics"
                    />
                    <TabButton
                      active={tab === 'about'}
                      onClick={() => setTab('about')}
                      icon={Info}
                      label="About"
                    />
                    <TabButton
                      active={tab === 'upnext'}
                      onClick={() => setTab('upnext')}
                      icon={ListMusic}
                      label="Up Next"
                    />
                  </div>
                  {tab === 'lyrics' && (
                    <LyricsQuickSettings
                      trackId={currentTrack?.id}
                      hasSynced={hasSynced}
                      offsetMs={lyricsOffsetMs}
                      onOffsetChange={setLyricsOffsetMs}
                    />
                  )}
                </div>
              </header>

              <div
                className={cn(
                  'now-playing__content',
                  tab === 'lyrics' && showLyricsContent ? 'overflow-hidden' : 'overflow-y-auto',
                )}
              >
                <AnimatePresence mode="wait">
                  {tab === 'lyrics' && showLyricsContent && (
                    <TabPanel key="lyrics">
                      <div className="now-playing__panel-body">
                        {preferSynced && hasSynced && details?.syncedLyrics ? (
                          <SyncedLyrics
                            syncedLyrics={details.syncedLyrics}
                            plainLyrics={details.plainLyrics}
                            currentTime={currentTime}
                            offsetMs={lyricsOffsetMs}
                            onSeek={seek}
                            centered
                            className="flex-1"
                          />
                        ) : (
                          <StaticLyrics
                            text={
                              detailsMatchTrack
                                ? details?.plainLyrics ||
                                  details?.syncedLyrics?.replace(/\[\d+:\d{2}.*?\]/g, '').trim() ||
                                  'No lyrics found.'
                                : ''
                            }
                            scrollable={scrollStaticLyrics}
                            centered
                          />
                        )}
                      </div>
                    </TabPanel>
                  )}

                  {tab === 'about' && (
                    <TabPanel key="about">
                      <div className="now-playing__panel-body now-playing__panel-body--scroll">
                        <div className="mx-auto w-full max-w-lg space-y-6">
                        <Stagger>
                          {detailsMatchTrack && details?.genres && details.genres.length > 0 && (
                            <StaggerItem>
                              <AboutBlock title="Genres" value={details.genres.join(' · ')} />
                            </StaggerItem>
                          )}
                          {detailsMatchTrack && details?.releaseYear && (
                            <StaggerItem>
                              <AboutBlock title="Released" value={String(details.releaseYear)} />
                            </StaggerItem>
                          )}
                          {detailsMatchTrack && details?.channel && (
                            <StaggerItem>
                              <AboutBlock title="Channel" value={details.channel} />
                            </StaggerItem>
                          )}
                          {detailsMatchTrack && details?.viewCount != null && (
                            <StaggerItem>
                              <AboutBlock
                                title="Plays"
                                value={details.viewCount.toLocaleString()}
                              />
                            </StaggerItem>
                          )}
                          {detailsMatchTrack && details?.description && (
                            <StaggerItem>
                              <div>
                                <h3 className="mb-2 text-xs font-semibold tracking-wider text-fg-muted uppercase">
                                  Description
                                </h3>
                                <p className="text-sm leading-relaxed text-fg-secondary">
                                  {details.description}
                                </p>
                              </div>
                            </StaggerItem>
                          )}
                          {detailsMatchTrack && !details?.description && !details?.genres && (
                            <StaggerItem>
                              <p className="text-center text-fg-muted">No additional info for this track.</p>
                            </StaggerItem>
                          )}
                        </Stagger>
                        </div>
                      </div>
                    </TabPanel>
                  )}

                  {tab === 'lyrics' && !showLyricsContent && (
                    <TabPanel key="no-lyrics">
                      <EmptyLyricsHint
                        showLyrics={showLyrics}
                        hasLyricsContent={hasLyricsContent}
                        onShowUpNext={() => setTab('upnext')}
                      />
                    </TabPanel>
                  )}

                  {tab === 'upnext' && (
                    <TabPanel key="upnext">
                      <div className="now-playing__panel-body now-playing__panel-body--scroll">
                        <p className="now-playing__panel-label">Playing next</p>
                        {upNext.length === 0 ? (
                          <p className="px-2 py-12 text-center text-sm text-fg-muted">
                            Nothing else in the queue. Play something or enable autoplay similar for artist radio.
                          </p>
                        ) : (
                          <Stagger className="space-y-1">
                            {upNext.map((track, i) => {
                              const index = currentIndex + 1 + i
                              return (
                                <StaggerItem key={`${track.id}-${index}`}>
                                  <button
                                    type="button"
                                    onClick={() => playAt(index)}
                                    className="now-playing__queue-row"
                                  >
                                    <img src={track.thumbnail} alt="" />
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate font-medium text-fg">{track.title}</p>
                                      <p className="truncate text-sm text-fg-secondary">{track.artist}</p>
                                    </div>
                                  </button>
                                </StaggerItem>
                              )
                            })}
                          </Stagger>
                        )}
                      </div>
                    </TabPanel>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </SlideUpPanel>
        </div>
      </div>
    </motion.div>
  )
}

function SlideUpPanel({
  children,
  className,
  delay,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const { reduceMotion, transition } = useMotion()
  if (reduceMotion) return <div className={className}>{children}</div>

  return (
    <motion.div
      className={className}
      initial={fadeUp.hidden}
      animate={fadeUp.show}
      transition={{ ...transition(0.45), delay }}
    >
      {children}
    </motion.div>
  )
}

function TabPanel({ children }: { children: React.ReactNode }) {
  const { reduceMotion, transition } = useMotion()
  if (reduceMotion) return <div className="flex min-h-0 flex-1 flex-col">{children}</div>

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={transition(0.28)}
      className="flex min-h-0 flex-1 flex-col"
    >
      {children}
    </motion.div>
  )
}

function EmptyLyricsHint({
  showLyrics,
  hasLyricsContent,
  onShowUpNext,
}: {
  showLyrics: boolean
  hasLyricsContent: boolean
  onShowUpNext: () => void
}) {
  const message = !showLyrics
    ? 'Lyrics are hidden.'
    : !hasLyricsContent
      ? 'No lyrics available for this track.'
      : 'No lyrics to show.'

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 py-12 text-center text-fg-muted">
      <FileText size={36} className="opacity-35" strokeWidth={1.5} />
      <p className="text-sm">{message}</p>
      {!showLyrics && (
        <p className="text-xs text-fg-muted/80">Use Show above to enable lyrics.</p>
      )}
      <button type="button" onClick={onShowUpNext} className="now-playing__empty-btn mt-1">
        View Up Next
      </button>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: typeof Music2
  label: string
}) {
  const { reduceMotion, spring } = useMotion()

  return (
    <motion.button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn('now-playing__tab', active && 'now-playing__tab--active')}
      whileTap={reduceMotion ? undefined : { scale: 0.97 }}
      layout={!reduceMotion}
      transition={spring}
    >
      <Icon size={15} />
      {label}
    </motion.button>
  )
}

function AboutBlock({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <h3 className="mb-1 text-xs font-semibold tracking-wider text-fg-muted uppercase">{title}</h3>
      <p className="text-base text-fg">{value}</p>
    </div>
  )
}
