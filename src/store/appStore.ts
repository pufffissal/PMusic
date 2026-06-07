import { create } from 'zustand'
import type { TrackMetadata } from '../../electron/preload'
import { usePlayerStore } from './playerStore'
import { VIEW_ORDER } from '@/lib/motion'

export type ViewId = 'home' | 'search' | 'library' | 'downloads' | 'artists' | 'stats' | 'settings'

export type SearchMode = 'music' | 'podcasts' | 'all'

interface AppState {
  currentView: ViewId
  viewDirection: number
  panelTransition: number
  searchQuery: string
  searchMode: SearchMode
  searchFocusTick: number
  miniMode: boolean
  nowPlayingOpen: boolean
  trackDetails: TrackMetadata | null
  /** Track id currently loading full metadata (lyrics, about); null when idle or done */
  trackDetailsLoadingId: string | null
  setView: (view: ViewId) => void
  setSearchQuery: (q: string) => void
  setSearchMode: (mode: SearchMode) => void
  requestSearchFocus: () => void
  setMiniMode: (mini: boolean) => void
  setNowPlayingOpen: (open: boolean) => void
  setTrackDetails: (details: TrackMetadata | null) => void
  setTrackDetailsLoadingId: (id: string | null) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  currentView: 'home',
  viewDirection: 0,
  panelTransition: 0,
  searchQuery: '',
  searchMode: 'music',
  searchFocusTick: 0,
  miniMode: false,
  nowPlayingOpen: false,
  trackDetails: null,
  trackDetailsLoadingId: null,
  setView: (view) => {
    const from = VIEW_ORDER.indexOf(get().currentView)
    const to = VIEW_ORDER.indexOf(view)
    if (from === to) return

    const viewDirection = to > from ? 1 : -1
    set({ currentView: view, viewDirection })
  },
  setSearchQuery: (q) => set({ searchQuery: q }),
  setSearchMode: (mode) => set({ searchMode: mode }),
  requestSearchFocus: () => set((s) => ({ searchFocusTick: s.searchFocusTick + 1 })),
  setMiniMode: (mini) => set({ miniMode: mini }),
  setNowPlayingOpen: (open) => {
    if (open) {
      const wasQueue = usePlayerStore.getState().queueOpen
      if (wasQueue) usePlayerStore.setState({ queueOpen: false })
      set({ panelTransition: wasQueue ? -1 : 0, nowPlayingOpen: true })
    } else {
      set({ nowPlayingOpen: false })
    }
  },
  setTrackDetails: (details) => set({ trackDetails: details }),
  setTrackDetailsLoadingId: (id) => set({ trackDetailsLoadingId: id }),
}))
