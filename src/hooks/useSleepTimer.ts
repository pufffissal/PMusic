import { useEffect } from 'react'
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

export function useSleepTimer() {
  const mode = useSleepTimerStore((s) => s.mode)
  const endsAt = useSleepTimerStore((s) => s.endsAt)
  const endAction = useSleepTimerStore((s) => s.endAction)
  const getRemainingMs = useSleepTimerStore((s) => s.getRemainingMs)

  useEffect(() => {
    if (mode !== 'time' || endsAt == null) return

    const check = () => {
      if (getRemainingMs() <= 0) {
        applySleepTimerEnd(endAction)
      }
    }

    check()
    const id = window.setInterval(check, 500)
    return () => window.clearInterval(id)
  }, [mode, endsAt, endAction, getRemainingMs])
}
