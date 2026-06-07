import type { LyricsQuery } from './lyricsProviders'

const UNKNOWN_ARTIST = /^(unknown(\s+artist)?|n\/a|—|-)$/i

export function isUnknownArtist(artist: string | undefined | null): boolean {
  const a = artist?.trim()
  if (!a) return true
  return UNKNOWN_ARTIST.test(a)
}

/** Parse common YouTube / tag patterns: "Artist - Title", "Title by Artist". */
export function parseArtistFromTitle(title: string): { artist: string; title: string } | null {
  const t = title.trim()
  if (!t) return null

  const dash = t.match(/^(.{2,80}?)\s*[-–—]\s+(.+)$/)
  if (dash) {
    const artist = dash[1].trim()
    const track = dash[2].trim()
    if (artist && track && !isUnknownArtist(artist)) {
      return { artist, title: track }
    }
  }

  const by = t.match(/^(.+?)\s+by\s+(.+)$/i)
  if (by) {
    const artist = by[2].trim()
    const track = by[1].trim()
    if (artist && track) return { artist, title: track }
  }

  return null
}

export function cleanTrackTitle(title: string): string {
  return title.replace(/\(.*?\)|\[.*?\]/g, '').trim()
}

export type NormalizedLyricsQuery = LyricsQuery & {
  /** Skip LRCLIB /get (needs reliable artist_name). */
  skipDirectGet: boolean
  /** Search string for /search. */
  searchQ: string
}

export function normalizeLyricsQuery(raw: LyricsQuery): NormalizedLyricsQuery {
  let artist = raw.artist?.trim() ?? ''
  let title = cleanTrackTitle(raw.title)

  if (isUnknownArtist(artist)) {
    const parsed = parseArtistFromTitle(raw.title.trim()) ?? parseArtistFromTitle(title)
    if (parsed) {
      artist = parsed.artist
      title = cleanTrackTitle(parsed.title)
    }
  }

  const skipDirectGet = isUnknownArtist(artist)
  const searchQ = skipDirectGet ? title : `${artist} ${title}`.trim()

  return {
    artist: skipDirectGet ? '' : artist,
    title,
    duration: raw.duration,
    album: raw.album,
    skipDirectGet,
    searchQ,
  }
}
