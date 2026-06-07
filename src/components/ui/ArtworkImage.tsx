import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import {
  isYoutubeVideoId,
  resolveTrackThumbnail,
  youtubeThumbnail,
  type ThumbnailSize,
} from '@/lib/trackThumbnail'

interface ArtworkImageProps {
  videoId: string
  thumbnail?: string | null
  alt?: string
  className?: string
  fallbackClassName?: string
  fallbackLetter?: string
  /** small = list rows; normal = cards; high = now playing (progressive large load) */
  priority?: 'low' | 'normal' | 'high'
  size?: ThumbnailSize
}

function youtubeFallbackChain(videoId: string): string[] {
  return [
    youtubeThumbnail(videoId, 'medium'),
    youtubeThumbnail(videoId, 'small'),
  ]
}

export function ArtworkImage({
  videoId,
  thumbnail,
  alt = '',
  className,
  fallbackClassName,
  fallbackLetter,
  priority = 'normal',
  size,
}: ArtworkImageProps) {
  const resolvedSize: ThumbnailSize =
    size ?? (priority === 'low' ? 'small' : 'medium')

  const imgRef = useRef<HTMLImageElement>(null)
  const [src, setSrc] = useState(() => resolveTrackThumbnail(videoId, thumbnail, resolvedSize))
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setSrc(resolveTrackThumbnail(videoId, thumbnail, resolvedSize))
    setLoaded(false)
    setFailed(false)
  }, [videoId, thumbnail, resolvedSize])

  const markLoadedIfReady = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth > 0) {
      setLoaded(true)
    }
  }, [])

  useLayoutEffect(() => {
    markLoadedIfReady(imgRef.current)
  }, [src, markLoadedIfReady])

  useEffect(() => {
    if (priority !== 'high' || !isYoutubeVideoId(videoId)) return

    const largeUrl = youtubeThumbnail(videoId, 'large')
    const img = new Image()
    img.onload = () => {
      if (img.naturalWidth > 320) setSrc(largeUrl)
    }
    img.onerror = () => {}
    img.src = largeUrl

    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [videoId, priority])

  const onError = () => {
    if (!isYoutubeVideoId(videoId)) {
      setFailed(true)
      return
    }

    const fallbacks = youtubeFallbackChain(videoId)
    const currentIdx = fallbacks.findIndex((url) => url === src)
    if (currentIdx === -1) {
      setSrc(fallbacks[0]!)
      setLoaded(false)
      return
    }
    const next = fallbacks[currentIdx + 1]
    if (next) {
      setSrc(next)
      setLoaded(false)
      return
    }
    setFailed(true)
  }

  if (!src || failed) {
    const letter = fallbackLetter ?? alt.charAt(0) ?? '?'
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-[var(--surface-hover)] text-fg-muted',
          fallbackClassName ?? className,
        )}
      >
        <span className="text-lg font-semibold opacity-50">{letter}</span>
      </div>
    )
  }

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      className={cn(className, 'transition-opacity duration-300', loaded ? 'opacity-100' : 'opacity-0')}
      loading={priority === 'high' ? 'eager' : 'lazy'}
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={onError}
    />
  )
}
