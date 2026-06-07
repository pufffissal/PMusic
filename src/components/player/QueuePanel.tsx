import { motion, Reorder } from 'framer-motion'
import { X } from 'lucide-react'
import { usePlayerStore } from '@/store/playerStore'
import { TrackRow } from '@/components/ui/TrackRow'
import { useMotion } from '@/hooks/useMotion'
import { Appear } from '@/components/ui/motion'
import { EASE_OUT, fadeUp, queuePanelVariants } from '@/lib/motion'

interface QueuePanelProps {
  panelTransition?: number
}

export function QueuePanel({ panelTransition = 0 }: QueuePanelProps) {
  const setQueueOpen = usePlayerStore((s) => s.setQueueOpen)
  const queue = usePlayerStore((s) => s.queue)
  const currentIndex = usePlayerStore((s) => s.currentIndex)
  const reorderQueue = usePlayerStore((s) => s.reorderQueue)
  const clearQueue = usePlayerStore((s) => s.clearQueue)
  const setCurrentIndex = usePlayerStore((s) => s.setCurrentIndex)
  const setPlaying = usePlayerStore((s) => s.setPlaying)
  const { reduceMotion, transition } = useMotion()

  const playAt = (index: number) => {
    setCurrentIndex(index)
    setPlaying(true)
  }

  return (
    <motion.aside
      custom={panelTransition}
      variants={reduceMotion ? undefined : queuePanelVariants}
      initial={reduceMotion ? false : 'enter'}
      animate="center"
      exit="exit"
      transition={{ duration: 0.36, ease: EASE_OUT }}
      className="glass fixed right-3 z-[95] flex w-[380px] flex-col shadow-2xl"
      style={{
        top: 'calc(var(--titlebar-height) + 12px)',
        height: 'calc(100% - var(--player-height) - var(--titlebar-height) - 28px)',
      }}
    >
      <Appear className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <h2 className="font-semibold">Queue</h2>
        <div className="flex items-center gap-1">
          {queue.length > 1 && (
            <button
              type="button"
              onClick={() => clearQueue()}
              className="rounded-lg px-2 py-1 text-xs text-fg-muted hover:bg-white/10 hover:text-fg-secondary"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={() => setQueueOpen(false)}
            className="rounded-lg p-1.5 hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>
      </Appear>
      <div className="flex-1 overflow-y-auto p-2">
        {queue.length === 0 ? (
          <Appear>
            <p className="p-4 text-center text-sm text-fg-muted">Queue is empty</p>
          </Appear>
        ) : (
          <Reorder.Group
            axis="y"
            values={queue}
            onReorder={(newOrder) => {
              const from = queue.findIndex((t, i) => t.id !== newOrder[i]?.id)
              const to = newOrder.findIndex((t) => t.id === queue[from]?.id)
              if (from >= 0 && to >= 0 && from !== to) reorderQueue(from, to)
            }}
            className="flex flex-col gap-0.5"
          >
            {queue.map((track, i) => (
              <Reorder.Item key={track.id} value={track} className="cursor-grab active:cursor-grabbing">
                <motion.div
                  initial={reduceMotion ? false : fadeUp.hidden}
                  animate={fadeUp.show}
                  transition={{ ...transition(0.3), delay: Math.min(i * 0.04, 0.32) }}
                >
                  <TrackRow
                    track={track}
                    index={i + 1}
                    active={i === currentIndex}
                    onPlay={() => playAt(i)}
                  />
                </motion.div>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}
      </div>
    </motion.aside>
  )
}
