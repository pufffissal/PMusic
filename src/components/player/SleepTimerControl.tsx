import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Moon, X, PlayCircle, ListEnd } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  useSleepTimerStore,
  formatSleepTimerRemaining,
  type SleepTimerEndAction,
} from '@/store/sleepTimerStore'
import { cn } from '@/lib/cn'
import { useMotion } from '@/hooks/useMotion'
import { EASE_OUT } from '@/lib/motion'

const PRESETS_MINUTES = [5, 10, 15, 30, 45, 60, 90, 120]

function chipClass(active: boolean) {
  return cn(
    'rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
    active
      ? 'bg-[var(--accent)] text-white'
      : 'bg-[var(--surface-hover)] text-fg-secondary hover:bg-[var(--surface-active)] hover:text-fg',
  )
}

export function SleepTimerControl() {
  const [open, setOpen] = useState(false)
  const [hours, setHours] = useState('0')
  const [minutes, setMinutes] = useState('30')
  const [seconds, setSeconds] = useState('0')
  const [endAction, setEndAction] = useState<SleepTimerEndAction>('pause')
  const [remainingLabel, setRemainingLabel] = useState('')

  const anchorRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const mode = useSleepTimerStore((s) => s.mode)
  const startTimer = useSleepTimerStore((s) => s.startTimer)
  const startEndOfTrack = useSleepTimerStore((s) => s.startEndOfTrack)
  const startEndOfQueue = useSleepTimerStore((s) => s.startEndOfQueue)
  const cancel = useSleepTimerStore((s) => s.cancel)
  const getRemainingMs = useSleepTimerStore((s) => s.getRemainingMs)

  const { reduceMotion } = useMotion()
  const active = mode !== 'off'

  useEffect(() => {
    if (!active) {
      setRemainingLabel('')
      return
    }
    const tick = () => {
      if (mode === 'time') {
        setRemainingLabel(formatSleepTimerRemaining(getRemainingMs()))
      } else if (mode === 'end-of-track') {
        setRemainingLabel('End of track')
      } else if (mode === 'end-of-queue') {
        setRemainingLabel('End of queue')
      }
    }
    tick()
    const id = window.setInterval(tick, 500)
    return () => window.clearInterval(id)
  }, [active, mode, getRemainingMs])

  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent) => {
      const t = e.target as Node
      if (panelRef.current?.contains(t) || anchorRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const parseCustomSeconds = () => {
    const h = Math.max(0, parseInt(hours, 10) || 0)
    const m = Math.max(0, parseInt(minutes, 10) || 0)
    const s = Math.max(0, parseInt(seconds, 10) || 0)
    return h * 3600 + m * 60 + s
  }

  const startCustom = () => {
    const total = parseCustomSeconds()
    if (total < 1) return
    startTimer(total, endAction)
    setOpen(false)
  }

  const startPreset = (min: number) => {
    startTimer(min * 60, endAction)
    setOpen(false)
  }

  const rect = anchorRef.current?.getBoundingClientRect()
  const panelStyle: React.CSSProperties | undefined = rect
    ? {
        position: 'fixed',
        right: Math.max(12, window.innerWidth - rect.right),
        bottom: window.innerHeight - rect.top + 10,
        zIndex: 200,
      }
    : undefined

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={active ? `Sleep timer: ${remainingLabel}` : 'Sleep timer'}
        className={cn(
          'relative rounded-full p-2.5 transition-colors',
          active
            ? 'text-[var(--accent)] ring-1 ring-[var(--accent)]/40 bg-[var(--accent-muted)]'
            : 'text-fg-muted hover:bg-white/10 hover:text-fg',
        )}
      >
        <Moon size={17} />
        {active && (
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[var(--accent)] ring-2 ring-[var(--surface-base)]" />
        )}
      </button>

      {createPortal(
        <AnimatePresence>
          {open && panelStyle && (
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-label="Sleep timer"
              initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: 6, scale: 0.99 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.16, ease: EASE_OUT }}
              className="context-menu-glass w-[min(320px,calc(100vw-24px))] overflow-hidden rounded-2xl p-4 shadow-2xl"
              style={panelStyle}
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-fg">Sleep timer</h3>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1.5 text-fg-muted hover:bg-white/10 hover:text-fg"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {active && (
                <div className="mb-3 flex items-center justify-between rounded-xl bg-[var(--accent-muted)] px-3 py-2 ring-1 ring-[var(--accent)]/25">
                  <span className="text-xs font-medium text-fg-secondary">Active</span>
                  <span className="text-sm font-semibold tabular-nums text-[var(--accent)]">{remainingLabel}</span>
                </div>
              )}

              <div className="mb-3 grid grid-cols-3 gap-2">
                {(
                  [
                    ['hours', hours, setHours, 'Hr'],
                    ['minutes', minutes, setMinutes, 'Min'],
                    ['seconds', seconds, setSeconds, 'Sec'],
                  ] as const
                ).map(([id, val, setVal, label]) => (
                  <label key={id} className="flex flex-col gap-1">
                    <span className="text-[10px] text-fg-muted">{label}</span>
                    <input
                      type="number"
                      min={0}
                      max={id === 'hours' ? 23 : 59}
                      value={val}
                      onChange={(e) => setVal(e.target.value)}
                      className="glass-inset w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-center text-sm text-fg outline-none focus:border-[var(--accent)]/50"
                    />
                  </label>
                ))}
              </div>

              <button
                type="button"
                onClick={startCustom}
                className="mb-4 w-full rounded-xl bg-[var(--accent)] py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Start {parseCustomSeconds() >= 60 ? formatSleepTimerRemaining(parseCustomSeconds() * 1000) : `${parseCustomSeconds()}s`}
              </button>

              <div className="mb-4 flex flex-wrap gap-1.5">
                {PRESETS_MINUTES.map((min) => (
                  <button key={min} type="button" className={chipClass(false)} onClick={() => startPreset(min)}>
                    {min < 60 ? `${min}m` : `${min / 60}h`}
                  </button>
                ))}
              </div>

              <div className="mb-4 flex gap-2">
                <button
                  type="button"
                  className={chipClass(endAction === 'pause')}
                  onClick={() => setEndAction('pause')}
                >
                  Pause
                </button>
                <button
                  type="button"
                  className={chipClass(endAction === 'stop')}
                  onClick={() => setEndAction('stop')}
                >
                  Stop
                </button>
              </div>

              <div className="mb-3 flex flex-col gap-1.5">
                <button
                  type="button"
                  className="context-menu__item w-full justify-start rounded-xl"
                  onClick={() => {
                    startEndOfTrack(endAction)
                    setOpen(false)
                  }}
                >
                  <PlayCircle size={16} className="shrink-0 opacity-80" />
                  <span>Current track ends</span>
                </button>
                <button
                  type="button"
                  className="context-menu__item w-full justify-start rounded-xl"
                  onClick={() => {
                    startEndOfQueue(endAction)
                    setOpen(false)
                  }}
                >
                  <ListEnd size={16} className="shrink-0 opacity-80" />
                  <span>Queue ends</span>
                </button>
              </div>

              {active && (
                <button
                  type="button"
                  onClick={() => {
                    cancel()
                    setOpen(false)
                  }}
                  className="w-full rounded-xl border border-white/10 py-2 text-sm font-medium text-fg-secondary hover:bg-white/6 hover:text-fg"
                >
                  Cancel timer
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}
