import { ipcMain } from 'electron'
import crypto from 'crypto'
import { CACHE_TTL, readCache, writeCache } from '../utils/appCache'
import type { SearchTrack } from './search'
import { getHiddenTrackIds } from './library'
import { getSimilarFromUpNext } from '../services/searchService'
import { searchMusic } from '../services/searchService'

function normalizeArtistKey(name: string): string {
  return name.toLowerCase().replace(/\s*[-–—]\s*topic$/i, '').replace(/\s+/g, ' ').trim()
}

function artistsMatch(trackArtist: string, targetArtist: string): boolean {
  const a = normalizeArtistKey(trackArtist)
  const b = normalizeArtistKey(targetArtist)
  if (!a || !b) return false
  if (a === b) return true
  if (a.includes(b) || b.includes(a)) return true
  return false
}

function trackMentionsArtist(title: string, artist: string): boolean {
  const key = normalizeArtistKey(artist)
  if (!key || key.length < 2) return false
  return normalizeArtistKey(title).includes(key)
}

function rankAutoplayTracks(tracks: SearchTrack[], artist: string): SearchTrack[] {
  if (!artist || artist === 'Unknown artist' || artist === 'Unknown') return tracks

  const sameArtist: SearchTrack[] = []
  const related: SearchTrack[] = []

  for (const track of tracks) {
    if (artistsMatch(track.artist, artist) || trackMentionsArtist(track.title, artist)) {
      sameArtist.push(track)
    } else {
      related.push(track)
    }
  }

  return [...sameArtist, ...related]
}

function mergeUnique(primary: SearchTrack[], secondary: SearchTrack[], limit: number): SearchTrack[] {
  const out: SearchTrack[] = []
  const seen = new Set<string>()

  for (const track of [...primary, ...secondary]) {
    if (seen.has(track.id)) continue
    seen.add(track.id)
    out.push(track)
    if (out.length >= limit) break
  }

  return out
}

function similarCacheKey(videoId: string, artist: string): string {
  const artistHash = crypto.createHash('sha256').update(artist.trim().toLowerCase()).digest('hex').slice(0, 12)
  return `similar:${videoId}:${artistHash}`
}

export async function getSimilarTracks(params: {
  videoId: string
  artist: string
  title: string
  excludeId?: string
}): Promise<SearchTrack[]> {
  const cacheKey = similarCacheKey(params.videoId, params.artist)
  const cached = readCache<SearchTrack[]>(cacheKey)
  if (cached) return cached

  const excludeIds = new Set<string>([params.videoId, params.excludeId].filter(Boolean) as string[])
  for (const id of getHiddenTrackIds()) excludeIds.add(id)
  const targetArtist = params.artist?.trim() || ''

  let tracks: SearchTrack[] = []

  try {
    tracks = await getSimilarFromUpNext(params.videoId, excludeIds, 30)
  } catch (err) {
    console.warn('[similar] up next failed:', err)
  }

  tracks = rankAutoplayTracks(tracks, targetArtist)

  if (tracks.length < 10 && targetArtist && targetArtist !== 'Unknown artist') {
    try {
      const search = await searchMusic(targetArtist, true)
      const filtered = search.songs.filter(
        (t) =>
          !excludeIds.has(t.id) &&
          (artistsMatch(t.artist, targetArtist) || trackMentionsArtist(t.title, targetArtist)),
      )
      tracks = mergeUnique(tracks, rankAutoplayTracks(filtered, targetArtist), 25)
    } catch (err) {
      console.warn('[similar] artist search failed:', err)
    }
  }

  if (tracks.length < 4) {
    const query = targetArtist || params.title
    try {
      const fallback = await searchMusic(query, true)
      const songs = fallback.songs.filter((t) => !excludeIds.has(t.id))
      tracks = mergeUnique(tracks, songs, 20)
    } catch (err) {
      console.warn('[similar] fallback search failed:', err)
    }
  }

  const result = tracks.slice(0, 20)
  writeCache(cacheKey, result, CACHE_TTL.similar)
  return result
}

export function registerSimilarIpc(): void {
  ipcMain.handle(
    'similar:get',
    async (
      _,
      params: { videoId: string; artist: string; title: string; excludeId?: string },
    ) => {
      if (!params.videoId?.trim()) return []
      return getSimilarTracks(params)
    },
  )
}
