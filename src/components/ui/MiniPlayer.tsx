import { Play, Pause, SkipBack, SkipForward, Maximize2, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { usePlayerStore } from '@/store/playerStore'
import { useAppStore } from '@/store/appStore'
import { useMotion } from '@/hooks/useMotion'
import { fadeUp } from '@/lib/motion'
import { cn } from '@/lib/cn'
interface MiniPlayerProps {
  title?: string
  artist?: string
  thumbnail?: string
}

export function MiniPlayer({ title, artist, thumbnail }: MiniPlayerProps) {
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const loading = usePlayerStore((s) => s.loading)
  const currentTime = usePlayerStore((s) => s.currentTime)
  const duration = usePlayerStore((s) => s.duration)
  const togglePlay = usePlayerStore((s) => s.togglePlay)
  const next = usePlayerStore((s) => s.next)
  const previous = usePlayerStore((s) => s.previous)
  const trackId = usePlayerStore((s) => s.queue[s.currentIndex]?.id)
  const setMiniMode = useAppStore((s) => s.setMiniMode)
  const { reduceMotion, transition } = useMotion()
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const expand = () => {
    void window.electron?.window.toggleMini().then(setMiniMode)
  }

  return (
    <motion.div
      initial={reduceMotion ? false : fadeUp.hidden}
      animate={fadeUp.show}
      transition={transition(0.35)}
      className="mini-player relative flex h-full w-full items-center gap-2.5 px-2.5"
    >      <div className="drag-region flex min-w-0 flex-1 items-center gap-2.5">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt=""
            className="no-drag h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-white/10"
          />
        ) : (
          <div className="no-drag h-10 w-10 shrink-0 rounded-lg bg-white/8" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-medium leading-tight text-fg">
            {title ?? 'Not playing'}
          </p>
          <p className="truncate text-[10px] text-fg-muted">{artist ?? '—'}</p>
        </div>
      </div>

      <div className="no-drag flex shrink-0 items-center gap-0.5">
        <MiniButton label="Previous" onClick={previous} disabled={!trackId}>
          <SkipBack size={15} fill="currentColor" />
        </MiniButton>

        <button
          type="button"
          onClick={togglePlay}
          disabled={loading || !trackId}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black disabled:opacity-40"
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin text-black/70" />
          ) : isPlaying ? (
            <Pause size={14} fill="currentColor" />
          ) : (
            <Play size={14} fill="currentColor" className="ml-0.5" />
          )}
        </button>

        <MiniButton label="Next" onClick={next} disabled={!trackId}>
          <SkipForward size={15} fill="currentColor" />
        </MiniButton>

        <MiniButton label="Expand" onClick={expand} className="ml-0.5 text-fg-secondary">
          <Maximize2 size={14} strokeWidth={2} />
        </MiniButton>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/8" aria-hidden>
        <div
          className="h-full bg-[var(--accent)] transition-[width] duration-500 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </motion.div>
  )
}
function MiniButton({
  children,
  onClick,
  label,
  disabled,
  className,
}: {
  children: React.ReactNode
  onClick: () => void
  label: string
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        'rounded-full p-1.5 text-fg-secondary hover:bg-white/10 hover:text-fg disabled:opacity-30',
        className,
      )}
    >
      {children}
    </button>
  )
}
