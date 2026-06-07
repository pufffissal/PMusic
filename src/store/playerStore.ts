import { create } from 'zustand'
import { useAppStore } from './appStore'
import { useSettingsStore } from './settingsStore'

export interface QueueTrack {
  id: string
  title: string
  artist: string
  thumbnail: string
  duration?: number
  localPath?: string
  source?: 'stream' | 'local'
}

export type PlaybackErrorKind = 'auth' | 'network' | 'generic' | null

export type RepeatMode = 'off' | 'one' | 'all'

interface PlayerState {
  queue: QueueTrack[]
  currentIndex: number
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  muted: boolean
  shuffle: boolean
  repeat: RepeatMode
  queueOpen: boolean
  streamUrl: string | null
  loading: boolean
  error: string | null
  errorKind: PlaybackErrorKind
  /** Seek target when the next stream loads (app resume only) */
  seekOnLoad: number | null

  setQueue: (tracks: QueueTrack[], startIndex?: number) => void
  playTrack: (track: QueueTrack) => void
  /** Replace queue with a list and play from startIndex (playlist / album playback) */
  playQueue: (tracks: QueueTrack[], startIndex?: number) => void
  playLocalFile: (track: QueueTrack & { localPath: string }) => void
  /** Restore a saved session without resetting playback position */
  restorePlayback: (
    tracks: QueueTrack[],
    startIndex: number,
    currentTime: number,
    isPlaying: boolean,
  ) => void
  addToQueue: (track: QueueTrack) => void
  addToQueueNext: (track: QueueTrack) => void
  removeFromQueue: (index: number) => void
  clearQueue: () => void
  reorderQueue: (from: number, to: number) => void
  setCurrentIndex: (index: number) => void
  setPlaying: (playing: boolean) => void
  togglePlay: () => void
  next: () => void
  previous: () => void
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setVolume: (volume: number) => void
  toggleMute: () => void
  toggleShuffle: () => void
  cycleRepeat: () => void
  setQueueOpen: (open: boolean) => void
  setStreamUrl: (url: string | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null, kind?: PlaybackErrorKind) => void
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  queue: [],
  currentIndex: 0,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  muted: false,
  shuffle: false,
  repeat: 'off',
  queueOpen: false,
  streamUrl: null,
  loading: false,
  error: null,
  errorKind: null,
  seekOnLoad: null,

  setQueue: (tracks, startIndex = 0) =>
    set({
      queue: tracks,
      currentIndex: startIndex,
      currentTime: 0,
      seekOnLoad: null,
      isPlaying: true,
      error: null,
    }),

  playQueue: (tracks, startIndex = 0) => {
    if (tracks.length === 0) return
    set({
      queue: tracks,
      currentIndex: Math.min(startIndex, tracks.length - 1),
      currentTime: 0,
      seekOnLoad: null,
      isPlaying: true,
      error: null,
      shuffle: false,
    })
    if (useSettingsStore.getState().settings.openNowPlayingOnPlay) {
      useAppStore.getState().setNowPlayingOpen(true)
    }
  },

  playTrack: (track) => {
    set({
      queue: [{ ...track, source: track.localPath ? 'local' : 'stream' }],
      currentIndex: 0,
      isPlaying: true,
      currentTime: 0,
      seekOnLoad: null,
      error: null,
      errorKind: null,
    })
    if (useSettingsStore.getState().settings.openNowPlayingOnPlay) {
      useAppStore.getState().setNowPlayingOpen(true)
    }
  },

  playLocalFile: (track) => {
    set({
      queue: [{ ...track, source: 'local' }],
      currentIndex: 0,
      isPlaying: true,
      currentTime: 0,
      seekOnLoad: null,
      error: null,
      errorKind: null,
      streamUrl: track.localPath ?? null,
    })
    if (useSettingsStore.getState().settings.openNowPlayingOnPlay) {
      useAppStore.getState().setNowPlayingOpen(true)
    }
  },

  restorePlayback: (tracks, startIndex, currentTime, isPlaying) => {
    if (tracks.length === 0) return
    const time = Math.max(0, currentTime)
    set({
      queue: tracks,
      currentIndex: Math.min(Math.max(0, startIndex), tracks.length - 1),
      currentTime: time,
      seekOnLoad: time > 0.5 ? time : null,
      isPlaying,
      error: null,
      streamUrl: null,
    })
  },

  addToQueue: (track) =>
    set((s) => {
      if (s.queue.some((t) => t.id === track.id)) return s
      return { queue: [...s.queue, track] }
    }),

  addToQueueNext: (track) =>
    set((s) => {
      if (s.queue.some((t) => t.id === track.id)) return s
      const queue = [...s.queue]
      queue.splice(Math.min(s.currentIndex + 1, queue.length), 0, track)
      return { queue }
    }),

  clearQueue: () =>
    set((s) => ({
      queue: s.queue[s.currentIndex] ? [s.queue[s.currentIndex]] : [],
      currentIndex: 0,
    })),

  removeFromQueue: (index) =>
    set((s) => {
      const queue = s.queue.filter((_, i) => i !== index)
      let currentIndex = s.currentIndex
      if (index < currentIndex) currentIndex--
      if (currentIndex >= queue.length) currentIndex = Math.max(0, queue.length - 1)
      return { queue, currentIndex }
    }),

  reorderQueue: (from, to) =>
    set((s) => {
      const queue = [...s.queue]
      const [item] = queue.splice(from, 1)
      queue.splice(to, 0, item)
      let currentIndex = s.currentIndex
      if (from === currentIndex) currentIndex = to
      else if (from < currentIndex && to >= currentIndex) currentIndex--
      else if (from > currentIndex && to <= currentIndex) currentIndex++
      return { queue, currentIndex }
    }),

  setCurrentIndex: (index) =>
    set({
      currentIndex: index,
      currentTime: 0,
      seekOnLoad: null,
      isPlaying: true,
      error: null,
      errorKind: null,
    }),
  setPlaying: (playing) => set({ isPlaying: playing }),
  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),

  next: () => {
    const { queue, currentIndex, shuffle, repeat } = get()
    if (queue.length === 0) return

    if (repeat === 'one') {
      set({ currentTime: 0, seekOnLoad: null, isPlaying: true })
      return
    }

    let nextIndex = currentIndex + 1
    if (nextIndex >= queue.length) {
      if (repeat === 'all') nextIndex = 0
      else return set({ isPlaying: false })
    }

    if (shuffle && queue.length > 1) {
      const others = queue.map((_, i) => i).filter((i) => i !== currentIndex)
      nextIndex = others[Math.floor(Math.random() * others.length)] ?? nextIndex
    }

    set({ currentIndex: nextIndex, currentTime: 0, seekOnLoad: null, isPlaying: true })
  },

  previous: () => {
    const { currentTime, currentIndex } = get()
    if (currentTime > 3) {
      set({ currentTime: 0, seekOnLoad: null })
      return
    }
    const prev = Math.max(0, currentIndex - 1)
    set({ currentIndex: prev, currentTime: 0, seekOnLoad: null, isPlaying: true })
  },

  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume, muted: volume === 0 }),
  toggleMute: () => set((s) => ({ muted: !s.muted })),
  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
  cycleRepeat: () =>
    set((s) => {
      const order: RepeatMode[] = ['off', 'all', 'one']
      const idx = order.indexOf(s.repeat)
      return { repeat: order[(idx + 1) % order.length] }
    }),
  setQueueOpen: (open) => {
    if (open) {
      const wasNowPlaying = useAppStore.getState().nowPlayingOpen
      if (wasNowPlaying) {
        useAppStore.setState({ nowPlayingOpen: false, panelTransition: 1 })
      } else {
        useAppStore.setState({ panelTransition: 0 })
      }
    }
    set({ queueOpen: open })
  },
  setStreamUrl: (url) => set({ streamUrl: url }),
  setLoading: (loading) => set({ loading }),
  setError: (error, kind = null) => set({ error, errorKind: kind, loading: false }),
}))

export function getCurrentTrack(state: PlayerState): QueueTrack | null {
  return state.queue[state.currentIndex] ?? null
}
