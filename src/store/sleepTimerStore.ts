import { create } from 'zustand'

export type SleepTimerMode = 'off' | 'time' | 'end-of-track' | 'end-of-queue'
export type SleepTimerEndAction = 'pause' | 'stop'

interface SleepTimerState {
  mode: SleepTimerMode
  endsAt: number | null
  endAction: SleepTimerEndAction
  startTimer: (totalSeconds: number, action?: SleepTimerEndAction) => void
  startEndOfTrack: (action?: SleepTimerEndAction) => void
  startEndOfQueue: (action?: SleepTimerEndAction) => void
  cancel: () => void
  getRemainingMs: () => number
}

export const useSleepTimerStore = create<SleepTimerState>((set, get) => ({
  mode: 'off',
  endsAt: null,
  endAction: 'pause',

  startTimer: (totalSeconds, action = 'pause') => {
    const sec = Math.max(1, Math.floor(totalSeconds))
    set({
      mode: 'time',
      endsAt: Date.now() + sec * 1000,
      endAction: action,
    })
  },

  startEndOfTrack: (action = 'pause') => {
    set({ mode: 'end-of-track', endsAt: null, endAction: action })
  },

  startEndOfQueue: (action = 'pause') => {
    set({ mode: 'end-of-queue', endsAt: null, endAction: action })
  },

  cancel: () => {
    set({ mode: 'off', endsAt: null })
  },

  getRemainingMs: () => {
    const { mode, endsAt } = get()
    if (mode !== 'time' || endsAt == null) return 0
    return Math.max(0, endsAt - Date.now())
  },
}))

export function formatSleepTimerRemaining(ms: number): string {
  if (ms <= 0) return '0:00'
  const totalSec = Math.ceil(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}
