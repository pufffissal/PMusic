import { cn } from '@/lib/cn'

interface PlaylistArtProps {
  cover?: string
  covers?: string[]
  emoji?: string
  color?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeStyles = {
  sm: 'h-10 w-10 rounded-lg text-lg',
  md: 'aspect-square w-full rounded-2xl text-4xl',
  lg: 'h-32 w-32 rounded-2xl text-5xl',
} as const

export function PlaylistArt({
  cover,
  covers,
  emoji,
  color,
  className,
  size = 'md',
}: PlaylistArtProps) {
  const tiles = (covers?.length ? covers : cover ? [cover] : []).slice(0, 4)

  if (tiles.length === 0) {
    return (
      <div
        className={cn(
          'flex shrink-0 items-center justify-center bg-white/5 ring-1 ring-white/10',
          sizeStyles[size],
          className,
        )}
        style={{ background: color ? `${color}44` : undefined }}
      >
        {emoji ?? '🎵'}
      </div>
    )
  }

  if (tiles.length === 1) {
    return (
      <img
        src={tiles[0]}
        alt=""
        className={cn('shrink-0 object-cover ring-1 ring-white/10', sizeStyles[size], className)}
        loading="lazy"
      />
    )
  }

  const gridClass =
    size === 'sm'
      ? 'h-10 w-10 grid-cols-2 grid-rows-2 gap-px rounded-lg'
      : size === 'lg'
        ? 'h-32 w-32 grid-cols-2 grid-rows-2 gap-0.5 rounded-2xl'
        : 'aspect-square w-full grid-cols-2 grid-rows-2 gap-0.5 rounded-2xl'

  return (
    <div
      className={cn(
        'grid shrink-0 overflow-hidden bg-black/20 ring-1 ring-white/10',
        gridClass,
        className,
      )}
    >
      {tiles.map((src, i) => (
        <img key={`${src}-${i}`} src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
      ))}
    </div>
  )
}
