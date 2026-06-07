import { Play, ListMusic, BookmarkPlus } from 'lucide-react'
import { cn } from '@/lib/cn'
import { HoverLift } from '@/components/ui/motion'
import { PlaylistArt } from '@/components/ui/PlaylistArt'

export interface HomePlaylistItem {
  id: string
  name: string
  subtitle: string
  kind: 'liked' | 'local' | 'discover' | 'smart'
  emoji?: string
  color?: string
  thumbnail?: string
  covers?: string[]
  trackCount: number
}

interface PlaylistCardProps {
  playlist: HomePlaylistItem
  onPlay: () => void
  onBrowse?: () => void
  onSave?: () => void
  className?: string
}

export function PlaylistCard({ playlist, onPlay, onBrowse, onSave, className }: PlaylistCardProps) {
  const { name, subtitle, emoji, color, thumbnail, covers, trackCount } = playlist
  const hasActions = !!(onBrowse || onSave)

  return (
    <HoverLift>
      <div className={cn('group w-full text-left', className)}>
        <div className="relative mb-3 overflow-hidden shadow-lg">
          <button type="button" onClick={onPlay} className="block w-full">
            <PlaylistArt
              cover={thumbnail}
              covers={covers}
              emoji={emoji}
              color={color}
              size="md"
              className="transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-xl">
                <Play size={20} fill="currentColor" className="ml-0.5" />
              </div>
            </div>
          </button>
          {hasActions && (
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              {onBrowse && (
                <button
                  type="button"
                  title="Browse tracks"
                  onClick={(e) => {
                    e.stopPropagation()
                    onBrowse()
                  }}
                  className="rounded-lg bg-black/55 p-1.5 text-white backdrop-blur hover:bg-black/70"
                >
                  <ListMusic size={14} />
                </button>
              )}
              {onSave && (
                <button
                  type="button"
                  title="Save to library"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSave()
                  }}
                  className="rounded-lg bg-black/55 p-1.5 text-white backdrop-blur hover:bg-black/70"
                >
                  <BookmarkPlus size={14} />
                </button>
              )}
            </div>
          )}
        </div>
        <button type="button" onClick={onPlay} className="w-full text-left">
          <p className="truncate text-sm font-semibold text-fg">{name}</p>
          <p className="truncate text-xs text-fg-secondary">
            {subtitle}
            {trackCount > 0 && ` · ${trackCount} ${trackCount === 1 ? 'song' : 'songs'}`}
          </p>
        </button>
      </div>
    </HoverLift>
  )
}
