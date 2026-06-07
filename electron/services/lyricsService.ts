import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'
import type { LyricsQuery, LyricsResult } from '../utils/lyricsProviders'
import { fetchLyrics, readLyricsCache, writeLyricsCache } from '../utils/lyricsProviders'
import { normalizeLyricsQuery } from '../utils/lyricsQuery'

const LYRICS_TTL_MS = 30 * 24 * 60 * 60 * 1000
const NEGATIVE_TTL_MS = 7 * 24 * 60 * 60 * 1000

let db: Database.Database | null = null
const inflight = new Map<string, Promise<LyricsResult>>()

function getDb(): Database.Database {
  if (!db) {
    const dbPath = path.join(app.getPath('userData'), 'lyrics-cache.db')
    db = new Database(dbPath)
    db.exec(`
      CREATE TABLE IF NOT EXISTS lyrics (
        id TEXT PRIMARY KEY,
        synced TEXT,
        plain TEXT,
        source TEXT,
        fetched_at INTEGER
      )
    `)
  }
  return db
}

export function makeLyricsCacheKey(artist: string, title: string): string {
  return `${artist.toLowerCase().trim()}__${title.toLowerCase().trim()}`
}

function queryCacheKey(query: LyricsQuery): string {
  const n = normalizeLyricsQuery(query)
  return makeLyricsCacheKey(n.artist || n.searchQ, n.title)
}

function rowToResult(row: { synced: string | null; plain: string | null; source: string | null }): LyricsResult {
  return {
    syncedLyrics: row.synced ?? undefined,
    plainLyrics: row.plain ?? undefined,
    source: (row.source as LyricsResult['source']) ?? (row.synced || row.plain ? 'lrclib' : 'none'),
  }
}

export function readLyricsFromSqlite(query: LyricsQuery): LyricsResult | null {
  const key = queryCacheKey(query)
  const row = getDb()
    .prepare('SELECT synced, plain, source, fetched_at FROM lyrics WHERE id = ?')
    .get(key) as { synced: string | null; plain: string | null; source: string | null; fetched_at: number } | undefined

  if (!row) return null

  const age = Date.now() - row.fetched_at
  const ttl = row.synced || row.plain ? LYRICS_TTL_MS : NEGATIVE_TTL_MS
  if (age > ttl) return null

  if (!row.synced && !row.plain) return { source: 'none' }
  return rowToResult(row)
}

export function writeLyricsToSqlite(query: LyricsQuery, result: LyricsResult): void {
  const key = queryCacheKey(query)
  getDb()
    .prepare(`INSERT OR REPLACE INTO lyrics (id, synced, plain, source, fetched_at) VALUES (?, ?, ?, ?, ?)`)
    .run(key, result.syncedLyrics ?? null, result.plainLyrics ?? null, result.source, Date.now())
}

export async function getLyricsCached(query: LyricsQuery, videoId?: string): Promise<LyricsResult> {
  if (videoId) {
    const disk = readLyricsCache(videoId)
    if (disk) return disk
  }

  const cached = readLyricsFromSqlite(query)
  if (cached) {
    if (videoId && (cached.syncedLyrics || cached.plainLyrics)) {
      writeLyricsCache(videoId, cached)
    }
    return cached
  }

  const inflightKey = videoId ?? queryCacheKey(query)
  const pending = inflight.get(inflightKey)
  if (pending) return pending

  const work = (async () => {
    const result = await fetchLyrics(query)
    writeLyricsToSqlite(query, result)
    if (videoId) writeLyricsCache(videoId, result)
    return result
  })()

  inflight.set(inflightKey, work)
  try {
    return await work
  } finally {
    inflight.delete(inflightKey)
  }
}
