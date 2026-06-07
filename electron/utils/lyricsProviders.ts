import { CACHE_TTL, readCache, writeCache } from './appCache'
import { normalizeLyricsQuery, type NormalizedLyricsQuery } from './lyricsQuery'

export type LyricsSource = 'lrclib' | 'none'

export interface LyricsResult {
  plainLyrics?: string
  syncedLyrics?: string
  source: LyricsSource
}

export interface LyricsQuery {
  artist: string
  title: string
  duration?: number
  album?: string
}

interface LrclibRow {
  plainLyrics?: string
  syncedLyrics?: string
  duration?: number
}

const LRCLIB = 'https://lrclib.net/api'
const USER_AGENT = 'PMusic/1.0 (https://github.com/pufffissal/PMusic)'
const LRCLIB_TIMEOUT_MS = 8_000

async function lrclibFetch(path: string): Promise<Response | null> {
  try {
    return await fetch(`${LRCLIB}${path}`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(LRCLIB_TIMEOUT_MS),
    })
  } catch (err) {
    console.warn('[lrclib] request failed:', path, err instanceof Error ? err.message : err)
    return null
  }
}

async function fetchLrclibGet(norm: NormalizedLyricsQuery): Promise<LrclibRow | null> {
  if (norm.skipDirectGet || !norm.artist) return null

  const params = new URLSearchParams({
    artist_name: norm.artist,
    track_name: norm.title,
  })
  if (norm.album) params.set('album_name', norm.album)
  if (norm.duration && norm.duration > 0) params.set('duration', String(Math.round(norm.duration)))

  const res = await lrclibFetch(`/get?${params}`)
  if (!res?.ok) return null
  try {
    return (await res.json()) as LrclibRow
  } catch {
    return null
  }
}

async function fetchLrclibSearch(norm: NormalizedLyricsQuery, limit = 10): Promise<LrclibRow[]> {
  const q = norm.searchQ.trim()
  if (!q) return []

  const res = await lrclibFetch(`/search?q=${encodeURIComponent(q)}`)
  if (!res?.ok) return []
  try {
    const data = (await res.json()) as LrclibRow[]
    return Array.isArray(data) ? data.slice(0, limit) : []
  } catch {
    return []
  }
}

function durationScore(candidate: number | undefined, target: number | undefined): number {
  if (!target || !candidate) return 0
  const diff = Math.abs(candidate - target)
  if (diff <= 2) return 10
  if (diff <= 5) return 5
  if (diff <= 15) return 2
  return 0
}

function pickBest(rows: LrclibRow[], norm: NormalizedLyricsQuery): LrclibRow | null {
  if (!rows.length) return null
  const scored = rows
    .map((row) => ({
      row,
      score: (row.syncedLyrics ? 20 : 0) + (row.plainLyrics ? 5 : 0) + durationScore(row.duration, norm.duration),
    }))
    .sort((a, b) => b.score - a.score)
  return scored[0]?.row ?? null
}

function toResult(row: LrclibRow | null): LyricsResult {
  if (!row) return { source: 'none' }
  const synced = row.syncedLyrics?.trim()
  const plain = row.plainLyrics?.trim()
  return {
    plainLyrics: plain || undefined,
    syncedLyrics: synced || undefined,
    source: synced || plain ? 'lrclib' : 'none',
  }
}

/** LRCLIB only: parallel /get + /search, pick best match. */
export async function fetchLyrics(query: LyricsQuery): Promise<LyricsResult> {
  try {
    const norm = normalizeLyricsQuery(query)
    const [direct, search] = await Promise.all([fetchLrclibGet(norm), fetchLrclibSearch(norm)])
    if (direct?.syncedLyrics || direct?.plainLyrics) return toResult(direct)
    return toResult(pickBest(search, norm))
  } catch (err) {
    console.warn('[lyrics] fetch failed:', err instanceof Error ? err.message : err)
    return { source: 'none' }
  }
}

export function lyricsCacheKey(videoId: string): string {
  return `lyrics:${videoId}`
}

export function readLyricsCache(videoId: string): LyricsResult | null {
  return readCache<LyricsResult>(lyricsCacheKey(videoId))
}

export function writeLyricsCache(videoId: string, result: LyricsResult): void {
  writeCache(lyricsCacheKey(videoId), result, CACHE_TTL.metadata)
}
