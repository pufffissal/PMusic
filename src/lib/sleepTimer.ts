import { useSleepTimerStore } from '@/store/sleepTimerStore'
import { usePlayerStore } from '@/store/playerStore'

function applySleepTimerEnd(action: 'pause' | 'stop') {
  const player = usePlayerStore.getState()
  player.setPlaying(false)
  if (action === 'stop') {
    player.clearQueue()
  }
  useSleepTimerStore.getState().cancel()
}

/**
 * Called when the current track finishes. Returns true if sleep timer consumed the event
 * (caller should not auto-advance / autoplay similar).
 */
export function handlePlaybackEndedForSleepTimer(): boolean {
  const { mode, endAction } = useSleepTimerStore.getState()
  const state = usePlayerStore.getState()
  const hasNext = state.currentIndex < state.queue.length - 1
  const willLoop = state.repeat === 'all' || state.repeat === 'one'

  if (mode === 'end-of-track') {
    applySleepTimerEnd(endAction)
    return true
  }

  if (mode === 'end-of-queue' && !hasNext && !willLoop) {
    applySleepTimerEnd(endAction)
    return true
  }

  return false
}
