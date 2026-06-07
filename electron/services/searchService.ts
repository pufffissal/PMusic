import { CACHE_TTL, readCache, writeCache } from '../utils/appCache'
import type { SearchMode, SearchResults, SearchTrack } from '../ipc/search'
import { getYTMusic } from './ytClient'
import {
  mapAlbumDetailed,
  mapArtistDetailed,
  mapPlaylistDetailed,
  mapSongDetailed,
  mapUpNext,
  mapVideoDetailed,
} from './mappers'
import { prefetchThumbnails } from './thumbnailService'

const SEARCH_TTL_MS = CACHE_TTL.search
const YOUTUBE_VIDEO_ID = /^[a-zA-Z0-9_-]{11}$/

function collectVideoIds(...tracks: (SearchTrack | undefined)[]): string[] {
  const ids = new Set<string>()
  for (const t of tracks) {
    if (t?.id && YOUTUBE_VIDEO_ID.test(t.id)) ids.add(t.id)
  }
  return [...ids]
}

function prefetchSearchArtwork(results: SearchResults): void {
  const ids = collectVideoIds(
    results.topResult,
    ...results.songs,
    ...results.podcasts,
    ...results.artists,
    ...results.albums,
    ...results.playlists,
    ...results.podcastShows,
  )
  if (ids.length) void prefetchThumbnails(ids.slice(0, 24))
}

const EMPTY_RESULTS: SearchResults = {
  songs: [],
  albums: [],
  artists: [],
  playlists: [],
  podcasts: [],
  podcastShows: [],
}

function searchCacheKey(query: string, mode: SearchMode): string {
  return `search:v2:${mode}:${query.toLowerCase().trim()}`
}

export async function searchMusic(query: string, useCache = true): Promise<SearchResults> {
  const normalized = query.trim()
  if (!normalized) return { ...EMPTY_RESULTS }

  const cacheKey = searchCacheKey(normalized, 'music')
  if (useCache) {
    const cached = readCache<SearchResults>(cacheKey)
    if (cached) return cached
  }

  const ytm = await getYTMusic()
  const [songs, albums, artists, playlists] = await Promise.all([
    ytm.searchSongs(normalized).catch(() => []),
    ytm.searchAlbums(normalized).catch(() => []),
    ytm.searchArtists(normalized).catch(() => []),
    ytm.searchPlaylists(normalized).catch(() => []),
  ])

  const mappedSongs = songs.slice(0, 20).map(mapSongDetailed)
  const results: SearchResults = {
    topResult: mappedSongs[0],
    songs: mappedSongs,
    albums: albums.slice(0, 10).map(mapAlbumDetailed),
    artists: artists.slice(0, 10).map(mapArtistDetailed),
    playlists: playlists.slice(0, 10).map(mapPlaylistDetailed),
    podcasts: [],
    podcastShows: [],
  }

  writeCache(cacheKey, results, SEARCH_TTL_MS)
  prefetchSearchArtwork(results)
  return results
}

export async function searchPodcasts(query: string, useCache = true): Promise<Pick<SearchResults, 'podcasts' | 'podcastShows' | 'topResult'>> {
  const normalized = query.trim()
  if (!normalized) return { podcasts: [], podcastShows: [] }

  const cacheKey = searchCacheKey(normalized, 'podcasts')
  if (useCache) {
    const cached = readCache<Pick<SearchResults, 'podcasts' | 'podcastShows' | 'topResult'>>(cacheKey)
    if (cached) return cached
  }

  const ytm = await getYTMusic()
  const [videos, playlists] = await Promise.all([
    ytm.searchVideos(`${normalized} podcast`).catch(() => ytm.searchVideos(normalized).catch(() => [])),
    ytm.searchPlaylists(`${normalized} podcast`).catch(() => []),
  ])

  const podcasts: SearchTrack[] = videos.slice(0, 15).map((v) => mapVideoDetailed(v, 'podcast'))
  const podcastShows: SearchTrack[] = playlists.slice(0, 8).map((p) => mapPlaylistDetailed(p, 'playlist'))

  const results = {
    topResult: podcasts[0],
    podcasts,
    podcastShows,
  }

  writeCache(cacheKey, results, SEARCH_TTL_MS)
  prefetchSearchArtwork({ ...EMPTY_RESULTS, topResult: results.topResult, podcasts, podcastShows })
  return results
}

export async function searchAll(query: string, useCache = true): Promise<SearchResults> {
  const normalized = query.trim()
  if (!normalized) return { ...EMPTY_RESULTS }

  const cacheKey = searchCacheKey(normalized, 'all')
  if (useCache) {
    const cached = readCache<SearchResults>(cacheKey)
    if (cached) return cached
  }

  const [music, podcasts] = await Promise.all([
    searchMusic(normalized, true),
    searchPodcasts(normalized, true),
  ])

  const results: SearchResults = {
    topResult: music.topResult ?? podcasts.topResult,
    songs: music.songs,
    albums: music.albums,
    artists: music.artists,
    playlists: music.playlists,
    podcasts: podcasts.podcasts,
    podcastShows: podcasts.podcastShows,
  }

  writeCache(cacheKey, results, SEARCH_TTL_MS)
  prefetchSearchArtwork(results)
  return results
}

export async function getPlaylistTracks(playlistId: string, limit = 50): Promise<SearchTrack[]> {
  const cacheKey = `playlist:tracks:${playlistId}`
  const cached = readCache<SearchTrack[]>(cacheKey)
  if (cached) return cached

  const ytm = await getYTMusic()
  const videos = await ytm.getPlaylistVideos(playlistId)
  const tracks = videos.slice(0, limit).map((v) => mapVideoDetailed(v, 'song'))
  writeCache(cacheKey, tracks, CACHE_TTL.catalog)
  return tracks
}

export async function getAlbumTracks(albumId: string): Promise<SearchTrack[]> {
  const cacheKey = `album:tracks:${albumId}`
  const cached = readCache<SearchTrack[]>(cacheKey)
  if (cached) return cached

  const ytm = await getYTMusic()
  const album = await ytm.getAlbum(albumId)
  const tracks = album.songs?.map(mapSongDetailed) ?? []
  writeCache(cacheKey, tracks, CACHE_TTL.catalog)
  return tracks
}

export async function getSimilarFromUpNext(videoId: string, excludeIds: Set<string>, limit = 25): Promise<SearchTrack[]> {
  const ytm = await getYTMusic()
  const upNext = await ytm.getUpNexts(videoId)
  const tracks: SearchTrack[] = []
  for (const item of upNext) {
    if (excludeIds.has(item.videoId)) continue
    tracks.push(mapUpNext(item))
    if (tracks.length >= limit) break
  }
  return tracks
}
