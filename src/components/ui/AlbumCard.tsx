import { Play } from 'lucide-react'
import { cn } from '@/lib/cn'
import { HoverLift } from '@/components/ui/motion'
import { ArtworkImage } from '@/components/ui/ArtworkImage'
import type { QueueTrack } from '@/store/playerStore'
interface AlbumCardProps {
  track: QueueTrack
  onPlay: () => void
  onContextMenu?: (e: React.MouseEvent, track: QueueTrack) => void
  className?: string
  size?: 'md' | 'lg'
}

export function AlbumCard({ track, onPlay, onContextMenu, className, size = 'md' }: AlbumCardProps) {
  const isLg = size === 'lg'

  return (
    <HoverLift>
    <button
      type="button"
      onClick={onPlay}
      onContextMenu={(e) => onContextMenu?.(e, track)}
      className={cn('group w-full text-left', className)}
    >      <div
        className={cn(
          'relative mb-3 aspect-square overflow-hidden rounded-2xl bg-white/5 shadow-lg ring-1 ring-white/5',
          isLg && 'rounded-[20px]',
        )}
      >
        <ArtworkImage
          videoId={track.id}
          thumbnail={track.thumbnail}
          alt={track.title}
          size="medium"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          fallbackClassName="h-full w-full"
          fallbackLetter={track.title.charAt(0) || '?'}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
          <div
            className={cn(
              'flex items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-xl',
              isLg ? 'h-14 w-14' : 'h-11 w-11',
            )}
          >
            <Play size={isLg ? 24 : 18} fill="currentColor" className="ml-0.5" />
          </div>
        </div>
      </div>
      <p className={cn('truncate font-semibold text-fg', isLg ? 'text-base' : 'text-sm')}>{track.title}</p>
      <p className={cn('truncate text-fg-secondary', isLg ? 'text-sm' : 'text-xs')}>{track.artist}</p>
    </button>
    </HoverLift>
  )
}