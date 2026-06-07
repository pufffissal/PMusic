import { create } from 'zustand'

export type CatalogDetail =
  | { kind: 'album'; id: string; title: string; artist: string; thumbnail: string }
  | { kind: 'artist'; id: string; name: string; thumbnail: string }
  | { kind: 'playlist'; id: string; title: string; artist: string; thumbnail: string }
  | {
      kind: 'tracklist'
      title: string
      subtitle?: string
      thumbnail?: string
      tracks: { id: string; title: string; artist: string; thumbnail: string; duration?: number }[]
    }

interface AppState {
  catalogDetail: CatalogDetail | null
  setCatalogDetail: (detail: CatalogDetail | null) => void
}

export const useCatalogStore = create<AppState>((set) => ({
  catalogDetail: null,
  setCatalogDetail: (detail) => set({ catalogDetail: detail }),
}))
