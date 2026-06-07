import * as Slider from '@radix-ui/react-slider'
import { Volume2, VolumeX } from 'lucide-react'
import { usePlayerStore } from '@/store/playerStore'
import { cn } from '@/lib/cn'

export function VolumeControl({ compact }: { compact?: boolean }) {
  const volume = usePlayerStore((s) => s.volume)
  const muted = usePlayerStore((s) => s.muted)
  const setVolume = usePlayerStore((s) => s.setVolume)
  const toggleMute = usePlayerStore((s) => s.toggleMute)

  return (
    <div className={cn('flex items-center', compact ? 'gap-1' : 'gap-2')}>
      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted || volume === 0 ? 'Unmute' : 'Mute'}
        className="rounded-lg p-1.5 text-fg-secondary hover:bg-white/10 hover:text-fg"
      >
        {muted || volume === 0 ? <VolumeX size={compact ? 14 : 16} /> : <Volume2 size={compact ? 14 : 16} />}
      </button>
      <Slider.Root
        className={cn(
          'relative flex h-4 touch-none items-center select-none',
          compact ? 'w-16' : 'w-24',
        )}
        value={[muted ? 0 : volume * 100]}
        max={100}
        step={1}
        onValueChange={([v]) => setVolume(v / 100)}
      >
        <Slider.Track className={cn('relative grow rounded-full bg-white/15', compact ? 'h-0.5' : 'h-1')}>
          <Slider.Range className="absolute h-full rounded-full bg-white/60" />
        </Slider.Track>
        <Slider.Thumb className={cn('block rounded-full bg-white shadow', compact ? 'h-2 w-2' : 'h-3 w-3')} />
      </Slider.Root>
    </div>
  )}
