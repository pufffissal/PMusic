import { AlertCircle, RefreshCw, Gauge, Trash2 } from 'lucide-react'
import { usePlayerStore } from '@/store/playerStore'

interface PlaybackErrorBannerProps {
  onRetry: () => void
  onLowerQuality?: () => void
  onClearCache?: () => void
}

export function PlaybackErrorBanner({ onRetry, onLowerQuality, onClearCache }: PlaybackErrorBannerProps) {
  const error = usePlayerStore((s) => s.error)
  const currentTrack = usePlayerStore((s) => s.queue[s.currentIndex])

  if (!error) return null

  const isStreamTrack = currentTrack?.source !== 'local'

  return (
    <div className="fixed bottom-[calc(var(--player-height)+0.75rem)] left-1/2 z-[90] w-[min(560px,calc(100vw-2rem))] -translate-x-1/2">
      <div className="glass flex flex-col gap-3 rounded-xl border border-red-400/25 px-4 py-3 shadow-xl sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-400" />
          <p className="min-w-0 text-sm text-fg">{error}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5">
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-medium hover:bg-white/15"
          >
            <RefreshCw size={13} />
            Retry
          </button>
          {isStreamTrack && onLowerQuality && (
            <button
              type="button"
              onClick={onLowerQuality}
              className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-medium hover:bg-white/15"
            >
              <Gauge size={13} />
              Lower quality
            </button>
          )}
          {isStreamTrack && onClearCache && (
            <button
              type="button"
              onClick={onClearCache}
              className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-medium hover:bg-white/15"
            >
              <Trash2 size={13} />
              Clear cache
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
