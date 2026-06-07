import type { Transition } from 'framer-motion'

export const EASE_OUT = [0.22, 1, 0.36, 1] as const

export const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
}

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.9, y: 8 },
  show: { opacity: 1, scale: 1, y: 0 },
}

export const slideInRight = {
  hidden: { opacity: 0, x: 24 },
  show: { opacity: 1, x: 0 },
}

export const slideInUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0 },
}

export const pageEnter = {
  hidden: { opacity: 0, y: 22, scale: 0.985, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
}

export const staggerContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
}

export const staggerContainerFast = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.035,
      delayChildren: 0.02,
    },
  },
}

export const staggerItem = fadeUp

/** Horizontal slide for sidebar views (home ↔ settings, etc.) */
export const viewSlideVariants = {
  enter: (dir: number) =>
    dir === 0
      ? pageEnter.hidden
      : {
          x: dir > 0 ? 64 : -64,
          opacity: 0,
          filter: 'blur(5px)',
        },
  center: {
    x: 0,
    opacity: 1,
    filter: 'blur(0px)',
  },
  exit: (dir: number) =>
    dir === 0
      ? { opacity: 0, y: -12, filter: 'blur(4px)', pointerEvents: 'none' as const }
      : {
          x: dir > 0 ? -64 : 64,
          opacity: 0,
          filter: 'blur(5px)',
          pointerEvents: 'none' as const,
        },
}

/** Full-screen Now Playing overlay */
export const nowPlayingVariants = {
  enter: (dir: number) =>
    dir === -1
      ? { opacity: 0, scale: 0.96, y: 28, filter: 'blur(8px)' }
      : { opacity: 0, y: '10%', scale: 0.985, filter: 'blur(10px)' },
  center: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
  exit: (dir: number) =>
    dir === 1
      ? { opacity: 0, x: -72, y: 20, scale: 0.96, filter: 'blur(8px)' }
      : { opacity: 0, y: '8%', scale: 0.985, filter: 'blur(8px)' },
}

/** Queue side panel */
export const queuePanelVariants = {
  enter: () => ({ x: '100%', opacity: 0.6 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) =>
    dir === -1
      ? { x: '100%', opacity: 0, scale: 0.97 }
      : { x: '100%', opacity: 0 },
}

export const VIEW_ORDER = ['home', 'search', 'library', 'downloads', 'artists', 'stats', 'settings'] as const

export function motionTransition(reduceMotion: boolean, duration = 0.38): Transition {
  if (reduceMotion) return { duration: 0 }
  return { duration, ease: EASE_OUT }
}

export function springTransition(reduceMotion: boolean): Transition {
  if (reduceMotion) return { duration: 0 }
  return { type: 'spring', stiffness: 380, damping: 30, mass: 0.85 }
}

/** Snappy sidebar active pill — single glide, no stepped view loads */
export function navHighlightTransition(reduceMotion: boolean): Transition {
  if (reduceMotion) return { duration: 0 }
  return { type: 'spring', stiffness: 720, damping: 42, mass: 0.55 }
}
