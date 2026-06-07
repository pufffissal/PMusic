import { ipcMain } from 'electron'
import { randomUUID } from 'node:crypto'
import Store from 'electron-store'
import { resolveTrackThumbnail } from '../utils/trackThumbnail.js'
export interface LikedTrack {
  id: string
  title: string
  artist: string
  thumbnail: string
  likedAt: number
}

export interface Playlist {
  id: string
  name: string
  trackIds: string[]
  createdAt: number
  color?: string
  emoji?: string
  description?: string
  /** Primary cover — first track artwork */
  cover?: string
  /** Up to 4 unique track thumbnails for mosaic art */
  covers?: string[]
}

export interface StoredTrack {
  id: string
  title: string
  artist: string
  thumbnail: string
  duration?: number
}

interface HistoryEntry {
  id: string
  title: string
  artist: string
  thumbnail: string
  playedAt: number
}

interface LibraryData {
  liked: LikedTrack[]
  playlists: Playlist[]
  history: HistoryEntry[]
  tracks: Record<string, StoredTrack>
  hiddenTrackIds: string[]
}

const store = new Store<LibraryData>({
  name: 'library',
  defaults: {
    liked: [],
    playlists: [],
    history: [],
    tracks: {},
    hiddenTrackIds: [],
  },
})

export function getHiddenTrackIds(): string[] {
  return store.get('hiddenTrackIds') ?? []
}

export function registerLibraryIpc(): void {
  ipcMain.handle('library:getLiked', () => store.get('liked'))

  ipcMain.handle('library:toggleLike', (_, track: LikedTrack) => {
    const liked = store.get('liked')
    const idx = liked.findIndex((t) => t.id === track.id)
    if (idx >= 0) liked.splice(idx, 1)
    else liked.unshift({ ...track, likedAt: Date.now() })
    store.set('liked', liked)
    saveTrack({ id: track.id, title: track.title, artist: track.artist, thumbnail: track.thumbnail })
    return liked
  })

  ipcMain.handle('library:isLiked', (_, id: string) => store.get('liked').some((t) => t.id === id))

  ipcMain.handle('library:addHistory', (_, entry: HistoryEntry) => {
    const thumbnail = resolveTrackThumbnail(entry.id, entry.thumbnail)
    const history = store.get('history').filter((h) => h.id !== entry.id)
    history.unshift({ ...entry, thumbnail, playedAt: Date.now() })
    store.set('history', history.slice(0, 50))
    return history
  })

  ipcMain.handle('library:getHistory', () => store.get('history'))

  ipcMain.handle('library:clearHistory', () => {
    store.set('history', [])
    return []
  })

  ipcMain.handle('library:removeFromHistory', (_, trackId: string) => {
    const history = store.get('history').filter((h) => h.id !== trackId)
    store.set('history', history)
    return history
  })

  ipcMain.handle('library:hideTrack', (_, trackId: string) => {
    const hidden = store.get('hiddenTrackIds')
    if (!hidden.includes(trackId)) hidden.push(trackId)
    store.set('hiddenTrackIds', hidden)
    return hidden
  })

  ipcMain.handle('library:getHiddenTrackIds', () => getHiddenTrackIds())

  ipcMain.handle('library:clearHiddenTracks', () => {
    store.set('hiddenTrackIds', [])
    return []
  })

  ipcMain.handle('library:getPlaylists', () => {
    syncAllPlaylistCovers()
    return store.get('playlists')
  })

  ipcMain.handle('library:createPlaylist', (_, payload: { name: string; color?: string; emoji?: string }) => {
    const playlists = store.get('playlists')
    const playlist: Playlist = {
      id: randomUUID(),
      name: payload.name,
      trackIds: [],
      createdAt: Date.now(),
      color: payload.color ?? '#fa2d48',
      emoji: payload.emoji ?? '🎵',
      description: '',
    }
    playlists.push(playlist)
    store.set('playlists', playlists)
    return playlist
  })

  ipcMain.handle(
    'library:createPlaylistFromTracks',
    (
      _,
      payload: {
        name: string
        emoji?: string
        color?: string
        description?: string
        tracks: StoredTrack[]
      },
    ) => createPlaylistFromTracks(payload),
  )

  ipcMain.handle('library:updatePlaylist', (_, playlist: Playlist) => {
    const playlists = store.get('playlists')
    const idx = playlists.findIndex((p) => p.id === playlist.id)
    if (idx >= 0) playlists[idx] = playlist
    store.set('playlists', playlists)
    return playlist
  })

  ipcMain.handle('library:deletePlaylist', (_, id: string) => {
    const playlists = store.get('playlists').filter((p) => p.id !== id)
    store.set('playlists', playlists)
    return playlists
  })

  ipcMain.handle('library:addTrackToPlaylist', (_, { playlistId, track }: { playlistId: string; track: StoredTrack }) => {
    const playlists = store.get('playlists')
    const pl = playlists.find((p) => p.id === playlistId)
    if (!pl) return null
    saveTrack(track)
    if (!pl.trackIds.includes(track.id)) pl.trackIds.push(track.id)
    syncPlaylistCovers(pl)
    store.set('playlists', playlists)
    return pl
  })

  ipcMain.handle('library:getPlaylistTracks', (_, playlistId: string) => {
    const pl = store.get('playlists').find((p) => p.id === playlistId)
    if (!pl) return []
    const tracks = store.get('tracks')
    return pl.trackIds.map((id) => tracks[id]).filter(Boolean)
  })

  ipcMain.handle('library:removeTrackFromPlaylist', (_, { playlistId, trackId }: { playlistId: string; trackId: string }) => {
    const playlists = store.get('playlists')
    const pl = playlists.find((p) => p.id === playlistId)
    if (!pl) return null
    pl.trackIds = pl.trackIds.filter((id) => id !== trackId)
    syncPlaylistCovers(pl)
    store.set('playlists', playlists)
    return pl
  })

  ipcMain.handle('library:getArtists', () => buildArtistSummaries())

  ipcMain.handle('library:getStats', () => buildListeningStats())
}

function saveTrack(track: StoredTrack) {
  const tracks = store.get('tracks')
  tracks[track.id] = track
  store.set('tracks', tracks)
}

function syncPlaylistCovers(pl: Playlist): void {
  const tracks = store.get('tracks')
  const thumbs: string[] = []
  const seen = new Set<string>()

  for (const id of pl.trackIds) {
    const thumb = tracks[id]?.thumbnail
    if (!thumb || seen.has(thumb)) continue
    seen.add(thumb)
    thumbs.push(thumb)
  }

  pl.covers = thumbs.slice(0, 4)
  pl.cover = pl.covers[0]
}

function syncAllPlaylistCovers(): void {
  const playlists = store.get('playlists')
  for (const pl of playlists) syncPlaylistCovers(pl)
  store.set('playlists', playlists)
}

export function createPlaylistFromTracks(payload: {
  name: string
  emoji?: string
  color?: string
  description?: string
  tracks: StoredTrack[]
}): Playlist {
  for (const track of payload.tracks) saveTrack(track)

  const playlists = store.get('playlists')
  const playlist: Playlist = {
    id: randomUUID(),
    name: payload.name,
    trackIds: payload.tracks.map((t) => t.id),
    createdAt: Date.now(),
    color: payload.color ?? '#fa2d48',
    emoji: payload.emoji ?? '🎵',
    description: payload.description ?? '',
  }
  syncPlaylistCovers(playlist)
  playlists.push(playlist)
  store.set('playlists', playlists)
  return playlist
}

function normalizeArtist(name: string): string {
  return name
    .replace(/\s*[-–—]\s*topic$/i, '')
    .replace(/\s*·\s*youtube music$/i, '')
    .trim()
    .toLowerCase()
}

export interface ArtistSummary {
  name: string
  trackCount: number
  playCount: number
  thumbnail: string
  tracks: StoredTrack[]
}

export interface ListeningStats {
  totalPlays: number
  uniqueTracks: number
  likedCount: number
  playlistCount: number
  playsThisWeek: number
  topArtists: { name: string; count: number }[]
  topTracks: { id: string; title: string; artist: string; thumbnail: string; count: number }[]
  activityByDay: { label: string; count: number }[]
}

function collectAllTracks(): StoredTrack[] {
  const history = store.get('history')
  const liked = store.get('liked')
  const stored = Object.values(store.get('tracks'))
  const byId = new Map<string, StoredTrack>()

  for (const t of [...history, ...liked, ...stored]) {
    if (!byId.has(t.id)) {
      byId.set(t.id, {
        id: t.id,
        title: t.title,
        artist: t.artist,
        thumbnail: t.thumbnail,
      })
    }
  }

  return [...byId.values()]
}

function buildArtistSummaries(): ArtistSummary[] {
  const history = store.get('history')
  const allTracks = collectAllTracks()
  const groups = new Map<string, ArtistSummary>()

  for (const track of allTracks) {
    const key = normalizeArtist(track.artist)
    if (!key) continue
    const displayName = track.artist.replace(/\s*[-–—]\s*topic$/i, '').trim() || track.artist
    const existing = groups.get(key)
    if (existing) {
      if (!existing.tracks.some((t) => t.id === track.id)) {
        existing.tracks.push(track)
        existing.trackCount++
      }
      if (!existing.thumbnail && track.thumbnail) existing.thumbnail = track.thumbnail
    } else {
      groups.set(key, {
        name: displayName,
        trackCount: 1,
        playCount: 0,
        thumbnail: track.thumbnail,
        tracks: [track],
      })
    }
  }

  for (const entry of history) {
    const key = normalizeArtist(entry.artist)
    const group = groups.get(key)
    if (group) group.playCount++
  }

  return [...groups.values()]
    .sort((a, b) => b.playCount - a.playCount || b.trackCount - a.trackCount || a.name.localeCompare(b.name))
}

function buildListeningStats(): ListeningStats {
  const history = store.get('history')
  const liked = store.get('liked')
  const playlists = store.get('playlists')
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

  const artistCounts = new Map<string, number>()
  const trackCounts = new Map<string, { count: number; entry: HistoryEntry }>()
  const dayCounts = new Map<string, number>()

  for (const entry of history) {
    const artist = entry.artist.replace(/\s*[-–—]\s*topic$/i, '').trim() || entry.artist
    artistCounts.set(artist, (artistCounts.get(artist) ?? 0) + 1)

    const existing = trackCounts.get(entry.id)
    if (existing) existing.count++
    else trackCounts.set(entry.id, { count: 1, entry })

    const day = new Date(entry.playedAt).toLocaleDateString(undefined, { weekday: 'short' })
    dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1)
  }

  const topArtists = [...artistCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }))

  const topTracks = [...trackCounts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([id, { count, entry }]) => ({
      id,
      title: entry.title,
      artist: entry.artist,
      thumbnail: entry.thumbnail,
      count,
    }))

  const activityByDay = [...dayCounts.entries()].map(([label, count]) => ({ label, count }))

  return {
    totalPlays: history.length,
    uniqueTracks: new Set(history.map((h) => h.id)).size,
    likedCount: liked.length,
    playlistCount: playlists.length,
    playsThisWeek: history.filter((h) => h.playedAt >= weekAgo).length,
    topArtists,
    topTracks,
    activityByDay,
  }
}
