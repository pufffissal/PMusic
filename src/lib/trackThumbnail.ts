const YOUTUBE_VIDEO_ID = /^[a-zA-Z0-9_-]{11}$/

export type ThumbnailSize = 'small' | 'medium' | 'large'

export function youtubeThumbnail(videoId: string, size: ThumbnailSize = 'medium'): string {
  const file =
    size === 'small'
      ? 'mqdefault.jpg'
      : size === 'large'
        ? 'maxresdefault.jpg'
        : 'hqdefault.jpg'
  return `https://i.ytimg.com/vi/${videoId}/${file}`
}

export function isYoutubeVideoId(id: string): boolean {
  return YOUTUBE_VIDEO_ID.test(id)
}

/** Best-effort artwork URL for history, cards, and media session. */
export function resolveTrackThumbnail(
  id: string,
  thumbnail?: string | null,
  size: ThumbnailSize = 'medium',
): string {
  if (isYoutubeVideoId(id)) return youtubeThumbnail(id, size)

  const trimmed = thumbnail?.trim() ?? ''
  if (trimmed && !trimmed.startsWith('pmusic-local://')) return trimmed
  return trimmed
}
