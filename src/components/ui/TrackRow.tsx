import { Play, Plus, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useFormattedDuration } from '@/hooks/useSearch'
import { useSettingsStore } from '@/store/settingsStore'
import { ArtworkImage } from '@/components/ui/ArtworkImage'
import type { QueueTrack } from '@/store/playerStore'

interface TrackRowProps {
  track: QueueTrack & { duration?: number }
  index?: number
  onPlay: () => void
  onQueue?: () => void
  onContextMenu?: (e: React.MouseEvent, track: QueueTrack) => void
  active?: boolean
  className?: string
}

export function TrackRow({
  track,
  index,
  onPlay,
  onQueue,
  onContextMenu,
  active,
  className,
}: TrackRowProps) {
  const duration = useFormattedDuration(track.duration ?? 0)
  const showNumbers = useSettingsStore((s) => s.settings.showTrackNumbers)
  const showDuration = useSettingsStore((s) => s.settings.showDurationInLists)

  return (
    <div
      onContextMenu={(e) => onContextMenu?.(e, track)}
      className={cn(
        'group flex items-center gap-2 rounded-xl px-2 py-2 sm:gap-3 sm:px-3 sm:py-2.5',
        'hover:bg-[var(--surface-hover)] focus-within:bg-[var(--surface-hover)]',
        active && 'bg-[var(--accent-muted)] ring-1 ring-white/8',
        className,
      )}
    >
      {index !== undefined && showNumbers && (
        <span className="hidden w-6 shrink-0 text-center text-xs text-fg-muted tabular-nums sm:block group-hover:hidden group-focus-within:hidden">
          {index}
        </span>
      )}
      <button
        type="button"
        onClick={onPlay}
        aria-label={`Play ${track.title} by ${track.artist}`}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <ArtworkImage
          videoId={track.id}
          thumbnail={track.thumbnail}
          alt={track.title}
          priority="low"
          className="h-11 w-11 shrink-0 rounded-xl object-cover ring-1 ring-white/10"
          fallbackClassName="h-11 w-11 shrink-0 rounded-xl ring-1 ring-white/10"
          fallbackLetter={track.title.charAt(0)}
        />
        <div className="min-w-0 flex-1">
          <p className={cn('truncate text-[14px] font-medium text-fg', active && 'text-[var(--accent)]')}>
            {track.title}
          </p>
          <p className="truncate text-xs text-fg-secondary">{track.artist}</p>
        </div>
      </button>
      {showDuration && (
        <span className="hidden shrink-0 text-xs text-fg-muted tabular-nums md:block">
          {track.duration ? duration : ''}
        </span>
      )}
      <div className="flex shrink-0 gap-0.5 opacity-70 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <button
          type="button"
          onClick={onPlay}
          aria-label="Play"
          className="interactive-scale rounded-lg p-2.5 text-fg-secondary hover:bg-white/10 hover:text-fg"
        >
          <Play size={16} fill="currentColor" />
        </button>
        {onQueue && (
          <button
            type="button"
            onClick={onQueue}
            aria-label="Add to queue"
            className="interactive-scale rounded-lg p-2.5 text-fg-secondary hover:bg-white/10 hover:text-fg"
          >
            <Plus size={16} />
          </button>
        )}
        {onContextMenu && (
          <button
            type="button"
            onClick={(e) => onContextMenu(e, track)}
            aria-label="More actions"
            className="interactive-scale rounded-lg p-2.5 text-fg-secondary hover:bg-white/10 hover:text-fg"
          >
            <MoreHorizontal size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
