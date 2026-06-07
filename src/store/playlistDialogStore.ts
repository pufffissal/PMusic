import { create } from 'zustand'
import type { QueueTrack } from './playerStore'

interface PlaylistDialogState {
  addTrack: QueueTrack | null
  createOpen: boolean
  deleteTarget: { id: string; name: string } | null
  openAddToPlaylist: (track: QueueTrack) => void
  closeAddToPlaylist: () => void
  openCreatePlaylist: () => void
  closeCreatePlaylist: () => void
  openDeletePlaylist: (id: string, name: string) => void
  closeDeletePlaylist: () => void
}

export const usePlaylistDialogStore = create<PlaylistDialogState>((set) => ({
  addTrack: null,
  createOpen: false,
  deleteTarget: null,
  openAddToPlaylist: (track) => set({ addTrack: track }),
  closeAddToPlaylist: () => set({ addTrack: null }),
  openCreatePlaylist: () => set({ createOpen: true }),
  closeCreatePlaylist: () => set({ createOpen: false }),
  openDeletePlaylist: (id, name) => set({ deleteTarget: { id, name } }),
  closeDeletePlaylist: () => set({ deleteTarget: null }),
}))
