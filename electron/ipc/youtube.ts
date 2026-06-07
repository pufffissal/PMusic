import { ipcMain } from 'electron'
import { getYTMusic } from '../services/ytClient'
import { pickThumbnail } from '../services/mappers'
import {
  fetchFeaturedPlaylists,
  fetchPlaylistTracks,
} from '../services/youtubeLibrary'
import { parseYoutubePlaylistId } from '../utils/youtubePlaylist.js'
import { createPlaylistFromTracks } from './library.js'
import type { StoredTrack } from './library'

export interface YtmPlaylist {
  id: string
  title: string
  artist: string
  thumbnail: string
  trackCount: number
}

export interface YtmTrack {
  id: string
  title: string
  artist: string
  duration: number
  thumbnail: string
}

/** Public YouTube Music playlists — no account sign-in required. */
export function registerYoutubeIpc(): void {
  ipcMain.handle('youtube:getStatus', () => ({
    enabled: true,
    browserProfile: null,
    browser: null,
    cookiesFile: null,
    accountLabel: 'Public playlists',
  }))

  ipcMain.handle('youtube:getPlaylists', async (): Promise<YtmPlaylist[]> => {
    try {
      return await fetchFeaturedPlaylists()
    } catch {
      return []
    }
  })

  ipcMain.handle('youtube:getPlaylistTracks', async (_, playlistId: string): Promise<YtmTrack[]> => {
    try {
      return await fetchPlaylistTracks(playlistId)
    } catch {
      return []
    }
  })

  ipcMain.handle('youtube:parsePlaylistId', (_, input: string) => parseYoutubePlaylistId(input))

  ipcMain.handle('youtube:searchPlaylists', async (_, query: string): Promise<YtmPlaylist[]> => {
    const q = query.trim()
    if (!q) return []
    try {
      const ytm = await getYTMusic()
      const results = await ytm.searchPlaylists(q)
      return results.slice(0, 16).map((pl) => ({
        id: pl.playlistId,
        title: pl.name,
        artist: pl.artist?.name?.trim() || 'YouTube Music',
        thumbnail: pickThumbnail(pl.thumbnails),
        trackCount: 0,
      }))
    } catch {
      return []
    }
  })

  ipcMain.handle(
    'youtube:importPlaylist',
    async (
      _,
      payload: { playlistId: string; name?: string; emoji?: string; color?: string },
    ) => {
      const tracks = await fetchPlaylistTracks(payload.playlistId)
      if (!tracks.length) return null

      const stored: StoredTrack[] = tracks.map((t) => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        thumbnail: t.thumbnail,
        duration: t.duration,
      }))

      return createPlaylistFromTracks({
        name: payload.name?.trim() || 'Imported playlist',
        emoji: payload.emoji ?? '📥',
        color: payload.color ?? '#0a84ff',
        description: 'Imported from YouTube Music',
        tracks: stored,
      })
    },
  )
}
