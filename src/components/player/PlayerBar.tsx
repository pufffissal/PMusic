import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  ListMusic,
  PictureInPicture2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSettingsStore } from '@/store/settingsStore'
import { usePlayerStore } from '@/store/playerStore'
import { useAppStore } from '@/store/appStore'
import { ProgressBar } from './ProgressBar'
import { VolumeControl } from './VolumeControl'
import { cn } from '@/lib/cn'
import { useVibrant } from '@/hooks/useVibrant'
import { useArtworkGlow } from '@/hooks/useArtworkGlow'
import { useMotion } from '@/hooks/useMotion'
import { fadeUp } from '@/lib/motion'
import { motion } from 'framer-motion'
import { GlassContextMenu } from '@/components/ui/GlassContextMenu'
import { SleepTimerControl } from '@/components/player/SleepTimerControl'
import { useTrackContextMenu } from '@/hooks/useTrackContextMenu'

interface PlayerBarProps {
  onSeek: (time: number) => void
  thumbnail?: string
  title?: string
  artist?: string
}

export function PlayerBar({ onSeek, thumbnail, title, artist }: PlayerBarProps) {
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const togglePlay = usePlayerStore((s) => s.togglePlay)
  const next = usePlayerStore((s) => s.next)
  const previous = usePlayerStore((s) => s.previous)
  const shuffle = usePlayerStore((s) => s.shuffle)
  const repeat = usePlayerStore((s) => s.repeat)
  const loading = usePlayerStore((s) => s.loading)
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle)
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat)
  const setQueueOpen = usePlayerStore((s) => s.setQueueOpen)
  const setMiniMode = useAppStore((s) => s.setMiniMode)
  const setNowPlayingOpen = useAppStore((s) => s.setNowPlayingOpen)
  const error = usePlayerStore((s) => s.error)

  const [liked, setLiked] = useState(false)
  const trackId = usePlayerStore((s) => s.queue[s.currentIndex]?.id)
  const currentTrack = usePlayerStore((s) => s.queue[s.currentIndex])
  const ctx = useTrackContextMenu()
  const { reduceMotion, transition } = useMotion()
  const showArtworkGlow = useSettingsStore((s) => s.settings.showPlayerArtworkGlow)

  useVibrant(thumbnail)
  const artworkGlowStyle = useArtworkGlow(thumbnail, showArtworkGlow)

  useEffect(() => {
    if (!trackId) return
    void window.electron?.library.isLiked(trackId).then(setLiked)
  }, [trackId])

  const openNowPlaying = () => {
    if (!trackId) return
    setNowPlayingOpen(true)
  }

  const toggleLike = async () => {
    if (!trackId || !thumbnail || !title || !artist) return
    await window.electron?.library.toggleLike({
      id: trackId,
      title,
      artist,
      thumbnail,
      likedAt: Date.now(),
    })
    setLiked((v) => !v)
  }

  return (
    <>
    <footer
      className="glass-player flex shrink-0 flex-col justify-center rounded-2xl px-6"
      style={{ height: 'var(--player-height)' }}
      onContextMenu={(e) => {
        if (currentTrack) ctx.openMenu(e, currentTrack)
      }}
    >
      {error && (
        <p className="absolute top-0 left-1/2 -translate-x-1/2 text-[10px] text-red-400">{error}</p>
      )}
      <div className="mb-1.5">
        <ProgressBar onSeek={onSeek} />
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={openNowPlaying}
          disabled={!trackId}
          aria-label="Open Now Playing"
          className="flex w-[280px] min-w-0 items-center gap-3 rounded-xl px-1 py-1 text-left transition-colors hover:bg-white/6 disabled:opacity-50"
        >
          {thumbnail ? (
            <div
              className={cn('player-art-glow shrink-0 rounded-xl', showArtworkGlow && 'player-art-glow--enabled')}
              style={artworkGlowStyle}
            >
              <motion.img
                key={thumbnail}
                src={thumbnail}
                alt=""
                className="player-art relative h-14 w-14 rounded-xl object-cover shadow-lg ring-1 ring-white/10"
                initial={reduceMotion ? false : { opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={transition(0.32)}
              />
            </div>
          ) : (
            <div className="h-14 w-14 rounded-xl bg-white/10" />
          )}
          <div className="min-w-0 flex-1 overflow-hidden">
            <motion.div
              key={`${trackId}-${title}`}
              initial={reduceMotion ? false : fadeUp.hidden}
              animate={fadeUp.show}
              transition={transition(0.28)}
            >
              <p className="truncate text-sm font-semibold text-fg">{title ?? 'Not playing'}</p>
              <p className="truncate text-xs text-fg-secondary">{artist ?? 'Select a song'}</p>
            </motion.div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => void toggleLike()}
          className={cn('rounded-lg p-2', liked ? 'text-[var(--accent)]' : 'text-fg-muted hover:text-fg')}
        >
          <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
        </button>

        <div className="flex flex-1 items-center justify-center gap-1">
          <button
            type="button"
            onClick={toggleShuffle}
            className={cn('rounded-full p-2.5', shuffle ? 'text-[var(--accent)]' : 'text-fg-muted hover:bg-white/10')}
          >
            <Shuffle size={17} />
          </button>
          <button
            type="button"
            onClick={previous}
            className="rounded-full p-2.5 text-fg hover:bg-white/10"
          >
            <SkipBack size={22} fill="currentColor" />
          </button>
          <button
            type="button"
            onClick={togglePlay}
            disabled={loading}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="mx-1 flex h-11 w-11 items-center justify-center rounded-full bg-white text-black shadow-lg hover:scale-105 disabled:opacity-50"
          >
            {isPlaying ? (
              <Pause size={22} fill="currentColor" />
            ) : (
              <Play size={22} fill="currentColor" className="ml-0.5" />
            )}
          </button>
          <button
            type="button"
            onClick={next}
            className="rounded-full p-2.5 text-fg hover:bg-white/10"
          >
            <SkipForward size={22} fill="currentColor" />
          </button>
          <button
            type="button"
            onClick={cycleRepeat}
            className={cn('rounded-full p-2.5', repeat !== 'off' ? 'text-[var(--accent)]' : 'text-fg-muted hover:bg-white/10')}
          >
            {repeat === 'one' ? <Repeat1 size={17} /> : <Repeat size={17} />}
          </button>
        </div>

        <div className="flex w-[240px] items-center justify-end gap-1">
          <SleepTimerControl />
          <button
            type="button"
            onClick={() => setQueueOpen(true)}
            className="rounded-full p-2.5 text-fg-muted hover:bg-white/10 hover:text-fg"
          >
            <ListMusic size={17} />
          </button>
          <button
            type="button"
            onClick={() => void window.electron?.window.toggleMini().then(setMiniMode)}
            className="rounded-full p-2.5 text-fg-muted hover:bg-white/10 hover:text-fg"
            title="Mini player"
          >
            <PictureInPicture2 size={17} />
          </button>
          <VolumeControl />
        </div>
      </div>
    </footer>
    <GlassContextMenu
      open={!!ctx.menu}
      x={ctx.position.x}
      y={ctx.position.y}
      onClose={ctx.closeMenu}
      items={ctx.items}
    />
    </>
  )
}
