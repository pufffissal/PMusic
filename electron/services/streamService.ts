import play from 'play-dl'
import { initPlayDl } from './playDlInit'
import { fetchInnertubeStreamFormats, type InnertubeFormat } from './innertubePlayer'
import { CACHE_TTL, readJsonFile, writeJsonFile, deleteJsonFile } from '../utils/appCache'
import type { AppSettings } from '../ipc/settings'

export type StreamQuality = AppSettings['streamQuality']

export interface StreamResult {
  url: string
  mimeType: string
  bitrate: number
  durationSeconds: number
  expiresAt: number
}

type RawFormat = InnertubeFormat

const STREAMS_FILE = 'streams.json'
const MEMORY_MAX = 80
const STREAM_TTL_MS = 4 * 60 * 60 * 1000
const PROGRESSIVE_AUDIO_ITAGS = new Set([18, 22])
const PREFERRED_AUDIO_ITAGS = new Set([251, 140, 250, 249, 139])

const memoryCache = new Map<string, StreamResult>()
const inflight = new Map<string, Promise<string>>()

interface PersistedEntry {
  url: string
  expiresAt: number
  mimeType?: string
  bitrate?: number
  durationSeconds?: number
  lastUsedAt: number
}

interface StreamStore {
  entries: Record<string, PersistedEntry>
}

function cacheKey(videoId: string, quality: StreamQuality): string {
  return `${videoId}:${quality}`
}

export function expiresAtFromStreamUrl(url: string, fallbackTtlMs: number): number {
  try {
    const raw = new URL(url).searchParams.get('expire')
    if (raw) {
      const sec = Number.parseInt(raw, 10)
      if (Number.isFinite(sec) && sec > 0) return sec * 1000 - 60_000
    }
  } catch {
    // ignore
  }
  return Date.now() + fallbackTtlMs
}

function loadDiskCache(): void {
  const store = readJsonFile<StreamStore>(STREAMS_FILE, { entries: {} })
  const now = Date.now()
  const grace = CACHE_TTL.staleGrace
  for (const [key, entry] of Object.entries(store.entries)) {
    if (entry.expiresAt + grace <= now) continue
    memoryCache.set(key, {
      url: entry.url,
      mimeType: entry.mimeType ?? 'audio/webm',
      bitrate: entry.bitrate ?? 0,
      durationSeconds: entry.durationSeconds ?? 0,
      expiresAt: entry.expiresAt,
    })
  }
}

let persistTimer: ReturnType<typeof setTimeout> | null = null

function schedulePersist(): void {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    persistTimer = null
    const entries: Record<string, PersistedEntry> = {}
    const now = Date.now()
    for (const [key, val] of memoryCache) {
      entries[key] = {
        url: val.url,
        expiresAt: val.expiresAt,
        mimeType: val.mimeType,
        bitrate: val.bitrate,
        durationSeconds: val.durationSeconds,
        lastUsedAt: now,
      }
    }
    writeJsonFile(STREAMS_FILE, { entries })
  }, 400)
}

function evictMemory(): void {
  while (memoryCache.size > MEMORY_MAX) {
    const first = memoryCache.keys().next().value
    if (first) memoryCache.delete(first)
  }
}

function formatBitrate(f: RawFormat): number {
  return f.bitrate ?? f.averageBitrate ?? 0
}

function isPlayableAudioFormat(f: RawFormat): boolean {
  if (!f.url) return false
  const mime = f.mimeType ?? ''

  if (mime.startsWith('audio/')) return true
  if (/opus|mp4a|vorbis/i.test(mime)) return true
  if (f.itag != null && PROGRESSIVE_AUDIO_ITAGS.has(f.itag)) return true
  if (f.itag != null && PREFERRED_AUDIO_ITAGS.has(f.itag)) return true
  if ((f.audioChannels ?? 0) > 0 && !f.height && !f.width) return true
  if (f.audioQuality && (!f.height || f.height === 0)) return true

  return false
}

function formatScore(f: RawFormat): number {
  const mime = f.mimeType ?? ''
  let score = formatBitrate(f)
  if (f.itag != null && PREFERRED_AUDIO_ITAGS.has(f.itag)) score += 80_000
  if (mime.startsWith('audio/')) score += 50_000
  if (mime.includes('opus')) score += 10_000
  if (mime.includes('mp4a')) score += 5_000
  if (f.itag != null && PROGRESSIVE_AUDIO_ITAGS.has(f.itag)) score -= 20_000
  return score
}

function selectAudioFormat(
  formats: RawFormat[],
  quality: StreamQuality,
): { url: string; mimeType: string; bitrate: number } | null {
  const candidates = formats.filter(isPlayableAudioFormat)
  if (!candidates.length) return null

  const minBitrate =
    quality === 'low' ? 48_000 : quality === 'medium' ? 96_000 : quality === 'high' ? 128_000 : 0

  const sorted = [...candidates].sort((a, b) => formatScore(b) - formatScore(a))
  const filtered =
    minBitrate > 0 ? sorted.filter((f) => formatBitrate(f) >= minBitrate) : sorted
  const pool = filtered.length ? filtered : sorted

  const pick = pool[0]
  if (!pick?.url) return null

  return {
    url: pick.url,
    mimeType: pick.mimeType ?? 'audio/webm',
    bitrate: formatBitrate(pick),
  }
}

async function fetchPlayDlFormats(
  videoId: string,
): Promise<{ formats: RawFormat[]; durationSeconds: number }> {
  await initPlayDl()

  const url = `https://www.youtube.com/watch?v=${videoId}`
  const info = await play.video_info(url)
  const durationSeconds = info.video_details?.durationInSec ?? 0

  let formats = (await play.decipher_info(info, true)).format ?? []

  if (!formats.some(isPlayableAudioFormat)) {
    const fresh = JSON.parse(JSON.stringify(info)) as typeof info
    formats = (await play.decipher_info(fresh, false)).format ?? []
  }

  return { formats, durationSeconds }
}

async function fetchAllFormats(
  videoId: string,
): Promise<{ formats: RawFormat[]; durationSeconds: number }> {
  const innertube = await fetchInnertubeStreamFormats(videoId)
  if (innertube?.formats.some(isPlayableAudioFormat)) {
    return innertube
  }

  try {
    const playDl = await fetchPlayDlFormats(videoId)
    if (playDl.formats.some(isPlayableAudioFormat)) {
      return {
        formats: [...(innertube?.formats ?? []), ...playDl.formats],
        durationSeconds: playDl.durationSeconds || innertube?.durationSeconds || 0,
      }
    }
  } catch (err) {
    console.warn('[stream] play-dl failed:', videoId, err instanceof Error ? err.message : err)
  }

  if (innertube) return innertube

  throw new Error('Could not load stream formats for this track')
}

export async function resolveStream(videoId: string, quality: StreamQuality = 'best'): Promise<StreamResult> {
  const { formats, durationSeconds } = await fetchAllFormats(videoId)
  const chosen = selectAudioFormat(formats, quality)
  if (!chosen) {
    console.warn(
      '[stream] no playable format',
      videoId,
      'candidates',
      formats.length,
      'withUrl',
      formats.filter((f) => f.url).length,
    )
    throw new Error('No audio format available')
  }

  const expiresAt = expiresAtFromStreamUrl(chosen.url, STREAM_TTL_MS)

  return {
    url: chosen.url,
    mimeType: chosen.mimeType,
    bitrate: chosen.bitrate,
    durationSeconds,
    expiresAt,
  }
}

export async function getStreamUrl(
  videoId: string,
  quality: StreamQuality = 'best',
  skipCache = false,
): Promise<string> {
  const key = cacheKey(videoId, quality)

  if (!skipCache) {
    const cached = memoryCache.get(key)
    if (cached && cached.expiresAt > Date.now()) {
      evictMemory()
      memoryCache.delete(key)
      memoryCache.set(key, cached)
      schedulePersist()
      return cached.url
    }
  } else {
    memoryCache.delete(key)
  }

  const existing = inflight.get(key)
  if (existing) return existing

  const promise = (async () => {
    const result = await resolveStream(videoId, quality)
    memoryCache.set(key, result)
    evictMemory()
    schedulePersist()
    return result.url
  })()

  inflight.set(key, promise)
  try {
    return await promise
  } finally {
    inflight.delete(key)
  }
}

export function prefetchStreams(videoIds: string[], quality: StreamQuality = 'best'): void {
  const unique = [...new Set(videoIds.filter(Boolean))].slice(0, 12)
  for (const id of unique) {
    const key = cacheKey(id, quality)
    const cached = memoryCache.get(key)
    if (cached && cached.expiresAt > Date.now()) continue
    void getStreamUrl(id, quality).catch(() => {})
  }
}

export function clearStreamCache(): void {
  memoryCache.clear()
  deleteJsonFile(STREAMS_FILE)
  if (persistTimer) {
    clearTimeout(persistTimer)
    persistTimer = null
  }
}

export function invalidateStream(videoId: string): void {
  for (const key of [...memoryCache.keys()]) {
    if (key.startsWith(`${videoId}:`)) memoryCache.delete(key)
  }
  schedulePersist()
}

export function initStreamService(): void {
  loadDiskCache()
}
