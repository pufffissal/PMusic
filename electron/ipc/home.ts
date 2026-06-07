import { ipcMain } from 'electron'
import crypto from 'crypto'
import { CACHE_TTL, readCache, writeCache } from '../utils/appCache'
import { searchYtmusic, type SearchTrack } from './search'
import { getSimilarTracks } from './similar'
import { getHiddenTrackIds } from './library'
import { getPlaylistTracks } from '../services/searchService'
import { buildSmartPlaylists, type SmartPlaylist } from './catalog'
import type { StoredTrack } from './library'

export interface HomeSeedTrack {
  id: string
  artist: string
  title: string
}

export interface HomeSuggestions {
  playlists: SearchTrack[]
  songs: SearchTrack[]
}

function cleanArtist(name: string): string {
  return name.replace(/\s*[-–—]\s*topic$/i, '').trim()
}

function suggestionsCacheKey(seeds: { artists: string[]; tracks: HomeSeedTrack[] }): string {
  const payload = JSON.stringify({
    artists: seeds.artists.slice(0, 5),
    tracks: seeds.tracks.slice(0, 8).map((t) => t.id),
  })
  return `home:suggestions:${crypto.createHash('sha256').update(payload).digest('hex').slice(0, 16)}`
}

export async function getPersonalizedSuggestions(seeds: {
  artists: string[]
  tracks: HomeSeedTrack[]
}): Promise<HomeSuggestions> {
  const artists = seeds.artists.map(cleanArtist).filter(Boolean).slice(0, 4)
  const seedTracks = seeds.tracks.slice(0, 6)

  const playlists: SearchTrack[] = []
  const songs: SearchTrack[] = []
  const seenPlaylistIds = new Set<string>()
  const seenSongIds = new Set<string>(seedTracks.map((t) => t.id))

  const pushPlaylist = (pl: SearchTrack) => {
    if (pl.type !== 'playlist' || seenPlaylistIds.has(pl.id)) return
    seenPlaylistIds.add(pl.id)
    playlists.push(pl)
  }

  const pushSong = (song: SearchTrack) => {
    if (song.type !== 'song' || seenSongIds.has(song.id)) return
    seenSongIds.add(song.id)
    songs.push(song)
  }

  for (const track of seedTracks.slice(0, 2)) {
    if (!track.id) continue
    try {
      const similar = await getSimilarTracks({
        videoId: track.id,
        artist: track.artist,
        title: track.title,
      })
      for (const s of similar.slice(0, 6)) pushSong(s)
    } catch {
      // skip
    }
  }

  for (const artist of artists) {
    try {
      const result = await searchYtmusic(`${artist} playlist`)
      for (const pl of result.playlists) pushPlaylist(pl)
      for (const s of result.songs.slice(0, 3)) pushSong(s)
    } catch {
      // skip
    }
  }

  if (playlists.length < 3 && artists[0]) {
    try {
      const mix = await searchYtmusic(`${artists[0]} mix`)
      for (const pl of mix.playlists) pushPlaylist(pl)
    } catch {
      // skip
    }
  }

  if (songs.length < 6 && artists[0]) {
    try {
      const fallback = await searchYtmusic(artists[0])
      for (const s of fallback.songs) pushSong(s)
    } catch {
      // skip
    }
  }

  const hidden = new Set(getHiddenTrackIds())
  return {
    playlists: playlists.slice(0, 8),
    songs: songs.filter((s) => !hidden.has(s.id)).slice(0, 12),
  }
}

function smartPlaylistsCacheKey(seeds: { artists: string[]; tracks: HomeSeedTrack[] }): string {
  const payload = JSON.stringify({
    artists: seeds.artists.slice(0, 5),
    tracks: seeds.tracks.slice(0, 8).map((t) => t.id),
  })
  return `home:smart-pl:${crypto.createHash('sha256').update(payload).digest('hex').slice(0, 16)}`
}

function toStoredTrack(song: SearchTrack): StoredTrack {
  return { id: song.id, title: song.title, artist: song.artist, thumbnail: song.thumbnail }
}

async function buildDiscoverMix(seedTracks: HomeSeedTrack[]): Promise<SmartPlaylist | null> {
  const tracks: StoredTrack[] = []
  const seen = new Set<string>()

  for (const seed of seedTracks.slice(0, 3)) {
    if (!seed.id) continue
    try {
      const similar = await getSimilarTracks({
        videoId: seed.id,
        artist: seed.artist,
        title: seed.title,
        excludeId: seed.id,
      })
      for (const song of similar.slice(0, 6)) {
        if (seen.has(song.id)) continue
        seen.add(song.id)
        tracks.push(toStoredTrack(song))
      }
    } catch {
      // skip seed
    }
  }

  if (tracks.length < 5) return null

  return {
    id: 'smart-discover-mix',
    name: 'Discover Mix',
    description: 'A fresh blend from your recent listens',
    emoji: '✨',
    tracks: tracks.slice(0, 20),
  }
}

async function buildArtistMixPlaylists(
  artists: string[],
  seedTracks: HomeSeedTrack[],
): Promise<SmartPlaylist[]> {
  const mixes: SmartPlaylist[] = []
  const used = new Set<string>()

  for (const artist of artists.slice(0, 3)) {
    const seed =
      seedTracks.find((t) => cleanArtist(t.artist).toLowerCase() === artist.toLowerCase()) ??
      seedTracks.find((t) => cleanArtist(t.artist).toLowerCase().includes(artist.toLowerCase().slice(0, 6)))

    if (!seed?.id) continue

    try {
      const similar = await getSimilarTracks({
        videoId: seed.id,
        artist: seed.artist,
        title: seed.title,
        excludeId: seed.id,
      })
      const tracks: StoredTrack[] = []
      const seen = new Set<string>()

      for (const song of similar.slice(0, 20)) {
        if (seen.has(song.id)) continue
        seen.add(song.id)
        tracks.push(toStoredTrack(song))
      }

      if (tracks.length < 5) continue

      const slug = artist.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 32)
      const id = `smart-mix-${slug}`
      if (used.has(id)) continue
      used.add(id)

      mixes.push({
        id,
        name: `${artist} Mix`,
        description: `Made for you based on ${artist}`,
        emoji: '🎧',
        tracks: tracks.slice(0, 20),
      })
    } catch {
      // skip artist
    }
  }

  return mixes
}

export async function getHomeSmartPlaylists(seeds: {
  artists: string[]
  tracks: HomeSeedTrack[]
}): Promise<SmartPlaylist[]> {
  const artists = seeds.artists.map(cleanArtist).filter(Boolean).slice(0, 4)
  const seedTracks = seeds.tracks.slice(0, 8)
  const hidden = new Set(getHiddenTrackIds())

  const [discoverMix, artistMixes, libraryPlaylists] = await Promise.all([
    buildDiscoverMix(seedTracks),
    buildArtistMixPlaylists(artists, seedTracks),
    Promise.resolve(buildSmartPlaylists()),
  ])

  const seenIds = new Set<string>()
  const result: SmartPlaylist[] = []

  const add = (pl: SmartPlaylist) => {
    const tracks = pl.tracks.filter((t) => !hidden.has(t.id))
    if (tracks.length < 3 || seenIds.has(pl.id)) return
    seenIds.add(pl.id)
    result.push({ ...pl, tracks })
  }

  if (discoverMix) add(discoverMix)
  for (const pl of artistMixes) add(pl)
  for (const pl of libraryPlaylists) add(pl)

  return result.slice(0, 10)
}

export function registerHomeIpc(): void {
  ipcMain.handle('home:getSuggestions', async (_, seeds: { artists: string[]; tracks: HomeSeedTrack[] }) => {
    const cacheKey = suggestionsCacheKey(seeds)
    const cached = readCache<HomeSuggestions>(cacheKey)
    if (cached) return { suggestions: cached, fromCache: true }

    const suggestions = await getPersonalizedSuggestions(seeds)
    writeCache(cacheKey, suggestions, CACHE_TTL.home)
    return { suggestions, fromCache: false }
  })

  ipcMain.handle('home:getPlaylistTracks', async (_, playlistId: string) => {
    return getPlaylistTracks(playlistId)
  })

  ipcMain.handle('home:getSmartPlaylists', async (_, seeds: { artists: string[]; tracks: HomeSeedTrack[] }) => {
    const cacheKey = smartPlaylistsCacheKey(seeds)
    const cached = readCache<SmartPlaylist[]>(cacheKey)
    if (cached) return { playlists: cached, fromCache: true }

    const playlists = await getHomeSmartPlaylists(seeds)
    writeCache(cacheKey, playlists, CACHE_TTL.home)
    return { playlists, fromCache: false }
  })
}
