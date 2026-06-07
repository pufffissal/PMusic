import * as Slider from '@radix-ui/react-slider'
import { usePlayerStore } from '@/store/playerStore'
import { useFormattedDuration } from '@/hooks/useSearch'
import { cn } from '@/lib/cn'
interface ProgressBarProps {
  onSeek: (time: number) => void
  compact?: boolean
}

export function ProgressBar({ onSeek, compact }: ProgressBarProps) {
  const currentTime = usePlayerStore((s) => s.currentTime)
  const duration = usePlayerStore((s) => s.duration)

  const current = useFormattedDuration(currentTime)
  const total = useFormattedDuration(duration || 0)

  return (
    <div className={cn('flex items-center', compact ? 'gap-1.5' : 'gap-2')}>
      <span
        className={cn(
          'text-right tabular-nums text-fg-muted',
          compact ? 'w-8 text-[9px]' : 'w-10 text-[10px]',
        )}
      >
        {current}
      </span>
      <Slider.Root
        className="relative flex h-4 flex-1 touch-none items-center select-none"
        value={[duration ? (currentTime / duration) * 100 : 0]}
        max={100}
        step={0.1}
        onValueChange={([v]) => {
          if (duration) onSeek((v / 100) * duration)
        }}
      >
        <Slider.Track className={cn('relative grow rounded-full bg-white/15', compact ? 'h-0.5' : 'h-1')}>
          <Slider.Range className="absolute h-full rounded-full bg-[var(--accent)]" />
        </Slider.Track>
        <Slider.Thumb
          className={cn(
            'block rounded-full bg-white shadow transition-opacity',
            compact ? 'h-2.5 w-2.5 opacity-80 hover:opacity-100' : 'h-3 w-3 opacity-0 hover:opacity-100 focus:opacity-100 data-[dragging]:opacity-100',
          )}
        />
      </Slider.Root>
      <span
        className={cn(
          'tabular-nums text-fg-muted',
          compact ? 'w-8 text-[9px]' : 'w-10 text-[10px]',
        )}
      >
        {total}
      </span>
    </div>
  )
}
