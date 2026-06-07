import { ipcMain } from 'electron'
import play from 'play-dl'
import { CACHE_TTL, readCache, writeCache, deleteCacheKey } from '../utils/appCache'
import { getAppSettings } from './settings'
import {
  fetchLyrics,
  readLyricsCache,
  writeLyricsCache,
  lyricsCacheKey,
  type LyricsSource,
} from '../utils/lyricsProviders'
import { getLyricsCached, writeLyricsToSqlite } from '../services/lyricsService'
import {
  cleanTrackTitle,
  isUnknownArtist,
  parseArtistFromTitle,
} from '../utils/lyricsQuery'
import { getYTMusic } from '../services/ytClient'
import { pickThumbnail, youtubeThumbnail } from '../services/mappers'
import { initPlayDl } from '../services/playDlInit'
import { getThumbnailUrl } from '../services/thumbnailService'

export interface TrackMetadata {
  id: string
  title: string
  artist: string
  album?: string
  duration: number
  thumbnail: string
  description?: string
  genres?: string[]
  releaseYear?: number
  viewCount?: number
  channel?: string
  plainLyrics?: string
  syncedLyrics?: string
  lyricsSource?: LyricsSource
}

export interface LyricsFetchHints {
  artist: string
  title: string
  duration?: number
  album?: string
}

export interface LyricsFetchResult {
  plainLyrics?: string
  syncedLyrics?: string
  lyricsSource: LyricsSource
}

export interface LyricsPrefetchTrack extends LyricsFetchHints {
  videoId: string
}

const YOUTUBE_VIDEO_ID = /^[a-zA-Z0-9_-]{11}$/

function trackMetaCacheKey(videoId: string): string {
  return `trackmeta:${videoId}`
}

function lyricsQueryFromHints(hints: LyricsFetchHints) {
  return {
    artist: hints.artist,
    title: cleanTrackTitle(hints.title),
    duration: hints.duration,
    album: hints.album,
  }
}

type TrackCore = Omit<TrackMetadata, 'plainLyrics' | 'syncedLyrics' | 'lyricsSource'>

async function enrichLyricsHints(videoId: string, hints: LyricsFetchHints): Promise<LyricsFetchHints> {
  if (!isUnknownArtist(hints.artist)) {
    return { ...hints, title: cleanTrackTitle(hints.title) }
  }

  const parsed = parseArtistFromTitle(hints.title.trim())
  if (parsed) {
    return { ...hints, artist: parsed.artist, title: parsed.title, duration: hints.duration }
  }

  const cached = readCache<TrackCore>(trackMetaCacheKey(videoId))
  if (cached && !isUnknownArtist(cached.artist)) {
    return {
      artist: cached.artist,
      title: cached.title,
      duration: hints.duration ?? cached.duration,
      album: hints.album,
    }
  }

  const ytm = await fetchTrackCoreFromYtmusic(videoId)
  if (ytm && !isUnknownArtist(ytm.artist)) {
    return {
      artist: ytm.artist,
      title: ytm.title,
      duration: hints.duration ?? ytm.duration,
      album: hints.album,
    }
  }

  return { ...hints, title: cleanTrackTitle(hints.title) }
}

async function fetchTrackCoreFromYtmusic(videoId: string): Promise<TrackCore | null> {
  try {
    const song = await (await getYTMusic()).getSong(videoId)
    return {
      id: videoId,
      title: song.name,
      artist: song.artist?.name?.trim() || 'Unknown artist',
      duration: song.duration ?? 0,
      thumbnail: pickThumbnail(song.thumbnails, song.videoId),
    }
  } catch {
    return null
  }
}

async function fetchTrackCoreFromPlayDl(videoId: string): Promise<TrackCore> {
  await initPlayDl()
  const info = await play.video_info(`https://www.youtube.com/watch?v=${videoId}`)
  const details = info.video_details
  return {
    id: videoId,
    title: details?.title ?? 'Unknown',
    artist: details?.channel?.name?.trim() || 'Unknown artist',
    duration: details?.durationInSec ?? 0,
    thumbnail: details?.thumbnails?.[details.thumbnails.length - 1]?.url ?? youtubeThumbnail(videoId),
    channel: details?.channel?.name,
    viewCount: details?.views,
  }
}

async function fetchTrackCore(videoId: string): Promise<TrackCore> {
  const fromYtm = await fetchTrackCoreFromYtmusic(videoId)
  if (fromYtm) return fromYtm
  return fetchTrackCoreFromPlayDl(videoId)
}

async function getTrackCoreCached(videoId: string, skipCache = false): Promise<TrackCore> {
  const metaKey = trackMetaCacheKey(videoId)
  if (!skipCache) {
    const cached = readCache<TrackCore>(metaKey)
    if (cached) return cached
  }
  const core = await fetchTrackCore(videoId)
  writeCache(metaKey, core, CACHE_TTL.metadata)
  return core
}

function withThumbnail(core: TrackCore): TrackCore {
  if (!core.thumbnail.startsWith('data:')) {
    core.thumbnail = getThumbnailUrl(core.id)
  }
  return core
}

function lyricsToResult(lyrics: { plainLyrics?: string; syncedLyrics?: string; source: LyricsSource }): LyricsFetchResult {
  return {
    plainLyrics: lyrics.plainLyrics,
    syncedLyrics: lyrics.syncedLyrics,
    lyricsSource: lyrics.source,
  }
}

export async function fetchLyricsForTrack(
  videoId: string,
  hints: LyricsFetchHints,
  options?: { skipCache?: boolean },
): Promise<LyricsFetchResult> {
  if (!getAppSettings().showLyrics) {
    return { lyricsSource: 'none' }
  }

  if (!options?.skipCache) {
    const cached = readLyricsCache(videoId)
    if (cached) return lyricsToResult(cached)
  }

  const resolved = await enrichLyricsHints(videoId, hints)
  const query = lyricsQueryFromHints(resolved)

  try {
    const lyrics = options?.skipCache
      ? await fetchLyrics(query).then((r) => {
          writeLyricsToSqlite(query, r)
          writeLyricsCache(videoId, r)
          return r
        })
      : await getLyricsCached(query, videoId)
    return lyricsToResult(lyrics)
  } catch (err) {
    console.warn('[metadata] lyrics failed for', videoId, err)
    return { lyricsSource: 'none' }
  }
}

function mergeLyricsIntoMeta(core: TrackCore, lyrics: LyricsFetchResult): TrackMetadata {
  return {
    ...withThumbnail(core),
    plainLyrics: lyrics.plainLyrics,
    syncedLyrics: lyrics.syncedLyrics,
    lyricsSource: lyrics.lyricsSource,
  }
}

async function loadMetadata(
  videoId: string,
  options?: { skipCache?: boolean; includeLyrics?: boolean; hints?: LyricsFetchHints },
): Promise<TrackMetadata> {
  const includeLyrics = options?.includeLyrics !== false
  const corePromise = getTrackCoreCached(videoId, options?.skipCache)
  const lyricsPromise =
    includeLyrics && options?.hints ? fetchLyricsForTrack(videoId, options.hints, options) : null

  const core = await corePromise

  if (!includeLyrics || !getAppSettings().showLyrics) {
    return { ...withThumbnail(core), lyricsSource: 'none' }
  }

  if (lyricsPromise) {
    return mergeLyricsIntoMeta(core, await lyricsPromise)
  }

  let lyrics = options?.skipCache ? null : readLyricsCache(videoId)
  if (!lyrics) {
    try {
      lyrics = await getLyricsCached(
        {
          artist: core.artist,
          title: cleanTrackTitle(core.title),
          duration: core.duration,
          album: core.album,
        },
        videoId,
      )
    } catch (err) {
      console.warn('[metadata] lyrics failed for', videoId, err)
      lyrics = { source: 'none' }
    }
  }

  return mergeLyricsIntoMeta(core, lyricsToResult(lyrics))
}

export function clearMetadataCache(): void {
  // Cleared with cache:clearAll
}

export function registerMetadataIpc(): void {
  ipcMain.handle(
    'metadata:get',
    async (
      _,
      videoId: string,
      options?: { skipCache?: boolean; includeLyrics?: boolean; hints?: LyricsFetchHints },
    ): Promise<TrackMetadata> => {
      try {
        return await loadMetadata(videoId, options)
      } catch (err) {
        console.error('[metadata:get]', videoId, err)
        const cached = readCache<TrackCore>(trackMetaCacheKey(videoId))
        if (cached) return { ...cached, lyricsSource: 'none' }
        throw err
      }
    },
  )

  ipcMain.handle(
    'metadata:fetchLyrics',
    async (
      _,
      params: { videoId: string } & LyricsFetchHints & { skipCache?: boolean },
    ): Promise<LyricsFetchResult> => {
      const { videoId, skipCache, ...hints } = params
      return fetchLyricsForTrack(videoId, hints, { skipCache })
    },
  )

  ipcMain.handle('metadata:refetchLyrics', async (_, videoId: string) => {
    deleteCacheKey(lyricsCacheKey(videoId))
    const core =
      readCache<TrackCore>(trackMetaCacheKey(videoId)) ?? (await getTrackCoreCached(videoId))
    const lyrics = await fetchLyricsForTrack(
      videoId,
      { artist: core.artist, title: core.title, duration: core.duration, album: core.album },
      { skipCache: true },
    )
    return mergeLyricsIntoMeta(core, lyrics)
  })

  ipcMain.handle('metadata:prefetch', (_, videoIds: string[]) => {
    const unique = [...new Set(videoIds.filter((id) => YOUTUBE_VIDEO_ID.test(id)))].slice(0, 5)
    for (const videoId of unique) {
      if (readLyricsCache(videoId)) continue
      const core = readCache<TrackCore>(trackMetaCacheKey(videoId))
      if (!core) continue
      void fetchLyricsForTrack(videoId, {
        artist: core.artist,
        title: core.title,
        duration: core.duration,
        album: core.album,
      }).catch(() => {})
    }
  })

  ipcMain.handle('metadata:prefetchLyrics', (_, tracks: LyricsPrefetchTrack[]) => {
    if (!getAppSettings().showLyrics) return
    const unique = tracks.filter((t) => YOUTUBE_VIDEO_ID.test(t.videoId)).slice(0, 6)
    for (const t of unique) {
      if (readLyricsCache(t.videoId)) continue
      void fetchLyricsForTrack(t.videoId, {
        artist: t.artist,
        title: t.title,
        duration: t.duration,
        album: t.album,
      }).catch(() => {})
    }
  })
}
