import { AnimatePresence, motion } from 'framer-motion'
import { useAppStore } from '@/store/appStore'
import { usePlayerStore } from '@/store/playerStore'
import { useMotion } from '@/hooks/useMotion'
import { NowPlayingView } from '@/components/views/NowPlayingView'
import { QueuePanel } from '@/components/player/QueuePanel'

interface PlayerPanelsProps {
  onSeek: (time: number) => void
}

/** Coordinates enter/exit between Now Playing and Queue with directional transitions. */
export function PlayerPanels({ onSeek }: PlayerPanelsProps) {
  const nowPlayingOpen = useAppStore((s) => s.nowPlayingOpen)
  const queueOpen = usePlayerStore((s) => s.queueOpen)
  const panelTransition = useAppStore((s) => s.panelTransition)
  const { reduceMotion } = useMotion()

  if (reduceMotion) {
    return (
      <>
        {nowPlayingOpen && <NowPlayingView onSeek={onSeek} />}
        {queueOpen && <QueuePanel />}
      </>
    )
  }

  return (
    <AnimatePresence mode="wait">
      {nowPlayingOpen && (
        <NowPlayingView key="now-playing" onSeek={onSeek} panelTransition={panelTransition} />
      )}
      {!nowPlayingOpen && queueOpen && (
        <QueuePanel key="queue" panelTransition={panelTransition} />
      )}
    </AnimatePresence>
  )
}

/** Shared backdrop dimmer for queue panel */
export function QueueBackdrop() {
  const queueOpen = usePlayerStore((s) => s.queueOpen)
  const nowPlayingOpen = useAppStore((s) => s.nowPlayingOpen)
  const setQueueOpen = usePlayerStore((s) => s.setQueueOpen)
  const { reduceMotion } = useMotion()

  const visible = queueOpen && !nowPlayingOpen

  if (reduceMotion) {
    if (!visible) return null
    return (
      <div
        className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
        onClick={() => setQueueOpen(false)}
      />
    )
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
          onClick={() => setQueueOpen(false)}
        />
      )}
    </AnimatePresence>
  )
}
