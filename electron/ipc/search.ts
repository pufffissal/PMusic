import { ipcMain } from 'electron'
import { searchAll as searchAllSvc, searchMusic, searchPodcasts as searchPodcastsSvc } from '../services/searchService'

export type SearchTrackType = 'song' | 'album' | 'artist' | 'playlist' | 'podcast'

export interface SearchTrack {
  id: string
  title: string
  artist: string
  duration: number
  thumbnail: string
  type: SearchTrackType
}

export type SearchMode = 'music' | 'podcasts' | 'all'

export interface SearchResults {
  topResult?: SearchTrack
  songs: SearchTrack[]
  albums: SearchTrack[]
  artists: SearchTrack[]
  playlists: SearchTrack[]
  podcasts: SearchTrack[]
  podcastShows: SearchTrack[]
}

export const EMPTY_RESULTS: SearchResults = {
  songs: [],
  albums: [],
  artists: [],
  playlists: [],
  podcasts: [],
  podcastShows: [],
}

export async function searchYtmusic(query: string, useCache = true): Promise<SearchResults> {
  return searchMusic(query, useCache)
}

export async function searchPodcasts(query: string, useCache = true) {
  return searchPodcastsSvc(query, useCache)
}

export async function searchAll(query: string, useCache = true): Promise<SearchResults> {
  return searchAllSvc(query, useCache)
}

export function clearSearchCache(): void {
  // Search entries use hashed keys under app cache; full wipe is cache:clearAll via clearDiskCache
}

export function registerSearchIpc(): void {
  ipcMain.handle('search:query', async (_, query: string, mode: SearchMode = 'music') => {
    if (!query.trim()) {
      return { ...EMPTY_RESULTS } satisfies SearchResults
    }
    try {
      const q = query.trim()
      if (mode === 'podcasts') {
        const podcastResults = await searchPodcasts(q)
        return { ...EMPTY_RESULTS, ...podcastResults } satisfies SearchResults
      }
      if (mode === 'all') {
        return await searchAll(q)
      }
      return await searchYtmusic(q)
    } catch (err) {
      console.error('[search]', err)
      throw err
    }
  })
}
