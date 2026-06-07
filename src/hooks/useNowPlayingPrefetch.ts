import { useEffect, useRef } from 'react'
import { usePlayerStore } from '@/store/playerStore'
import { useAppStore } from '@/store/appStore'
import { useSettingsStore } from '@/store/settingsStore'
import type { TrackMetadata } from '../../electron/preload'
import type { QueueTrack } from '@/store/playerStore'

function stubMetadataFromTrack(track: QueueTrack): TrackMetadata {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    thumbnail: track.thumbnail,
    duration: track.duration ?? 0,
  }
}

function lyricsHints(track: QueueTrack) {
  return {
    artist: track.artist,
    title: track.title,
    duration: track.duration,
  }
}

/**
 * Prefetch Now Playing metadata and lyrics (LRCLIB) in parallel.
 */
export function useNowPlayingPrefetch() {
  const queue = usePlayerStore((s) => s.queue)
  const currentIndex = usePlayerStore((s) => s.currentIndex)
  const track = queue[currentIndex]

  const setDetails = useAppStore((s) => s.setTrackDetails)
  const setTrackDetailsLoadingId = useAppStore((s) => s.setTrackDetailsLoadingId)
  const showLyrics = useSettingsStore((s) => s.settings.showLyrics)

  const requestGen = useRef(0)

  useEffect(() => {
    if (!track?.id || !window.electron) {
      setDetails(null)
      setTrackDetailsLoadingId(null)
      return
    }

    const trackId = track.id
    const gen = ++requestGen.current
    const hints = lyricsHints(track)

    setDetails(stubMetadataFromTrack(track))
    setTrackDetailsLoadingId(trackId)

    const mergeLyrics = (lyrics: {
      plainLyrics?: string
      syncedLyrics?: string
      lyricsSource?: TrackMetadata['lyricsSource']
    }) => {
      if (requestGen.current !== gen) return
      const prev = useAppStore.getState().trackDetails
      if (!prev || prev.id !== trackId) return
      setDetails({ ...prev, ...lyrics })
    }

    const lyricsPromise = showLyrics
      ? window.electron.metadata
          .fetchLyrics({ videoId: trackId, ...hints })
          .then((lyrics) => mergeLyrics(lyrics))
          .catch(() => {})
      : Promise.resolve()

    const corePromise = window.electron.metadata
      .get(trackId, { includeLyrics: false, hints })
      .then((full) => {
        if (requestGen.current !== gen) return
        if (full?.id !== trackId) return
        const prev = useAppStore.getState().trackDetails
        if (prev?.id === trackId) {
          setDetails({
            ...full,
            plainLyrics: prev.plainLyrics ?? full.plainLyrics,
            syncedLyrics: prev.syncedLyrics ?? full.syncedLyrics,
            lyricsSource: prev.lyricsSource ?? full.lyricsSource,
          })
        } else {
          setDetails(full)
        }
      })

    void Promise.allSettled([corePromise, lyricsPromise]).then(() => {
      if (requestGen.current === gen) setTrackDetailsLoadingId(null)
    })

    const next = queue[currentIndex + 1]
    if (showLyrics && next?.id && next.artist && next.artist !== 'Unknown artist') {
      void window.electron.metadata.prefetchLyrics([{ videoId: next.id, ...lyricsHints(next) }])
    }
  }, [
    track?.id,
    track?.title,
    track?.artist,
    track?.thumbnail,
    track?.duration,
    currentIndex,
    queue,
    showLyrics,
    setDetails,
    setTrackDetailsLoadingId,
  ])
}
