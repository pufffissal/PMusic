const YOUTUBE_VIDEO_ID = /^[a-zA-Z0-9_-]{11}$/

export function youtubeThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
}

export function isYoutubeVideoId(id: string): boolean {
  return YOUTUBE_VIDEO_ID.test(id)
}

export function resolveTrackThumbnail(id: string, thumbnail?: string | null): string {
  const trimmed = thumbnail?.trim() ?? ''
  if (trimmed && !trimmed.startsWith('pmusic-local://')) return trimmed
  if (isYoutubeVideoId(id)) return youtubeThumbnail(id)
  return trimmed
}

function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').toLowerCase()
}

export function lookupYoutubeIdByFilePath(
  filePath: string,
  byTrackId: Record<string, string>,
): string | null {
  const needle = normalizePath(filePath)
  for (const [trackId, path] of Object.entries(byTrackId)) {
    if (normalizePath(path) === needle) return trackId
  }
  return null
}
