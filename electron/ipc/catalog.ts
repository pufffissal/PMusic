import { ipcMain } from 'electron'
import { CACHE_TTL, readCache, writeCache } from '../utils/appCache'
import { searchYtmusic, type SearchTrack } from './search'
import { getSimilarTracks } from './similar'
import Store from 'electron-store'
import { getYTMusic } from '../services/ytClient'
import { getAlbumTracks, getPlaylistTracks } from '../services/searchService'
import { mapAlbumDetailed, mapSongDetailed, pickThumbnail } from '../services/mappers'
import type { StoredTrack } from './library'

export interface CatalogAlbum {
  id: string
  title: string
  artist: string
  thumbnail: string
  tracks: SearchTrack[]
}

export interface CatalogArtist {
  id: string
  name: string
  thumbnail: string
  topTracks: SearchTrack[]
  albums: SearchTrack[]
  radioSeed?: SearchTrack
}

export interface SmartPlaylist {
  id: string
  name: string
  description: string
  emoji: string
  tracks: StoredTrack[]
}

interface HistoryEntry extends StoredTrack {
  playedAt: number
}

interface LibraryStoreShape {
  history: HistoryEntry[]
  liked: { id: string; title: string; artist: string; thumbnail: string; likedAt: number }[]
}

const libraryStore = new Store<LibraryStoreShape>({ name: 'library' })

async function fetchArtistCatalog(artistId: string, artistName: string): Promise<CatalogArtist> {
  const cacheKey = `catalog:artist:${artistId}`
  const cached = readCache<CatalogArtist>(cacheKey)
  if (cached) return cached

  const ytm = await getYTMusic()
  let topTracks: SearchTrack[] = []
  let albums: SearchTrack[] = []

  try {
    const songs = await ytm.getArtistSongs(artistId)
    topTracks = songs.slice(0, 12).map(mapSongDetailed)
  } catch {
    const songsQuery = await searchYtmusic(artistName)
    topTracks = songsQuery.songs
      .filter((s) => s.artist.toLowerCase().includes(artistName.toLowerCase().slice(0, 8)))
      .slice(0, 12)
  }

  try {
    const artistAlbums = await ytm.getArtistAlbums(artistId)
    albums = artistAlbums.slice(0, 8).map(mapAlbumDetailed)
  } catch {
    const albumsQuery = await searchYtmusic(`${artistName} album`)
    albums = albumsQuery.albums.slice(0, 8)
  }

  let thumbnail = topTracks[0]?.thumbnail || albums[0]?.thumbnail || ''
  try {
    const artist = await ytm.getArtist(artistId)
    thumbnail = pickThumbnail(artist.thumbnails) || thumbnail
  } catch {
    // keep fallback thumbnail
  }

  const result: CatalogArtist = {
    id: artistId,
    name: artistName,
    thumbnail,
    topTracks,
    albums,
    radioSeed: topTracks[0],
  }
  writeCache(cacheKey, result, CACHE_TTL.catalog)
  return result
}

function weekAgo(): number {
  return Date.now() - 7 * 24 * 60 * 60 * 1000
}

export function buildSmartPlaylists(): SmartPlaylist[] {
  const history = libraryStore.get('history', [])
  const liked = libraryStore.get('liked', [])
  const week = weekAgo()

  const recentLiked = [...liked]
    .sort((a, b) => b.likedAt - a.likedAt)
    .slice(0, 25)
    .map((t) => ({ id: t.id, title: t.title, artist: t.artist, thumbnail: t.thumbnail }))

  const playCounts = new Map<string, { track: StoredTrack; count: number }>()
  for (const entry of history) {
    const existing = playCounts.get(entry.id)
    if (existing) existing.count++
    else playCounts.set(entry.id, { track: entry, count: 1 })
  }

  const topThisWeek = history
    .filter((e) => e.playedAt >= week)
    .reduce((acc, e) => {
      acc.set(e.id, (acc.get(e.id) ?? 0) + 1)
      return acc
    }, new Map<string, number>())

  const topWeekTracks = [...topThisWeek.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([id]) => history.find((h) => h.id === id))
    .filter(Boolean)
    .map((t) => ({ id: t!.id, title: t!.title, artist: t!.artist, thumbnail: t!.thumbnail }))

  const heavyRotation = [...playCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)
    .map((x) => x.track)

  const recentPlays = history.slice(0, 25).map((e) => ({
    id: e.id,
    title: e.title,
    artist: e.artist,
    thumbnail: e.thumbnail,
  }))

  return [
    {
      id: 'smart-top-week',
      name: 'Top This Week',
      description: 'Most played in the last 7 days',
      emoji: '🔥',
      tracks: topWeekTracks,
    },
    {
      id: 'smart-recent-liked',
      name: 'Recently Liked',
      description: 'Songs you liked recently',
      emoji: '💜',
      tracks: recentLiked,
    },
    {
      id: 'smart-heavy',
      name: 'Heavy Rotation',
      description: 'Your most played tracks',
      emoji: '🔁',
      tracks: heavyRotation,
    },
    {
      id: 'smart-recent',
      name: 'Recently Played',
      description: 'Pick up where you left off',
      emoji: '🕐',
      tracks: recentPlays,
    },
  ].filter((pl) => pl.tracks.length > 0)
}

export function registerCatalogIpc(): void {
  ipcMain.handle('catalog:getAlbum', async (_, albumId: string): Promise<CatalogAlbum | null> => {
    try {
      const ytm = await getYTMusic()
      const album = await ytm.getAlbum(albumId)
      const tracks = album.songs?.map(mapSongDetailed) ?? []

      return {
        id: albumId,
        title: album.name,
        artist: album.artist?.name ?? tracks[0]?.artist ?? 'Unknown',
        thumbnail: pickThumbnail(album.thumbnails) || tracks[0]?.thumbnail || '',
        tracks,
      }
    } catch {
      try {
        const tracks = await getAlbumTracks(albumId)
        if (!tracks.length) return null
        const search = await searchYtmusic(tracks[0]?.title ?? albumId)
        const albumMeta =
          search.albums.find((a) => a.id === albumId) ??
          (search.topResult?.type === 'album' ? search.topResult : undefined)
        return {
          id: albumId,
          title: albumMeta?.title ?? tracks[0]?.title ?? 'Album',
          artist: albumMeta?.artist ?? tracks[0]?.artist ?? 'Unknown',
          thumbnail: albumMeta?.thumbnail ?? tracks[0]?.thumbnail ?? '',
          tracks,
        }
      } catch {
        return null
      }
    }
  })

  ipcMain.handle(
    'catalog:getArtist',
    async (_, payload: { id: string; name: string }): Promise<CatalogArtist | null> => {
      try {
        return await fetchArtistCatalog(payload.id, payload.name)
      } catch {
        return null
      }
    },
  )

  ipcMain.handle('catalog:getArtistRadio', async (_, payload: { id: string; name: string }) => {
    try {
      const catalog = await fetchArtistCatalog(payload.id, payload.name)
      const seed = catalog.topTracks[0]
      if (!seed) return []
      return getSimilarTracks({
        videoId: seed.id,
        artist: payload.name,
        title: seed.title,
        excludeId: seed.id,
      }).then((t) => t.slice(0, 25))
    } catch {
      return []
    }
  })

  ipcMain.handle('catalog:getPlaylistTracks', async (_, playlistId: string) => {
    return getPlaylistTracks(playlistId, 50)
  })

  ipcMain.handle('catalog:getSmartPlaylists', () => buildSmartPlaylists())
}
