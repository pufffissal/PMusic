import { useEffect, useRef, useCallback } from 'react'
import { usePlayerStore, getCurrentTrack, type PlaybackErrorKind } from '@/store/playerStore'
import { useSettingsStore } from '@/store/settingsStore'
import { handlePlaybackEndedForSleepTimer } from '@/lib/sleepTimer'
import { resolveTrackThumbnail } from '@/lib/trackThumbnail'

const PREBUFFER_SECONDS = 60
const QUEUE_PREFETCH_AHEAD = 8
const YOUTUBE_VIDEO_ID = /^[a-zA-Z0-9_-]{11}$/

function classifyError(message: string): PlaybackErrorKind {
  const m = message.toLowerCase()
  if (m.includes('cookie') || m.includes('sign in') || m.includes('403') || m.includes('auth')) {
    return 'auth'
  }
  if (m.includes('network') || m.includes('timed out') || m.includes('fetch')) return 'network'
  return 'generic'
}

export function useAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const nextUrlRef = useRef<string | null>(null)
  const autoplayingRef = useRef(false)
  const loadedStreamRef = useRef<string | null>(null)
  const lastNotifiedTrackRef = useRef<string | null>(null)
  const fadeOutStartedRef = useRef(false)
  const pendingCrossfadeRef = useRef(false)
  const crossfadePhaseRef = useRef<'none' | 'in' | 'out'>('none')
  const volumeAnimRef = useRef<number | null>(null)
  const stallRetryRef = useRef(0)
  const qualityOverrideRef = useRef<'medium' | 'low' | null>(null)
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loadGenRef = useRef(0)
  const activeTrackIdRef = useRef<string | null>(null)
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const historyTrackIdRef = useRef<string | null>(null)
  /** Keep playback intent across stream reload (avoid play() failing → isPlaying false before canplay). */
  const wantsPlaybackRef = useRef(false)

  const volumeRef = useRef(1)
  const mutedRef = useRef(false)

  const {
    queue,
    currentIndex,
    isPlaying,
    volume,
    muted,
    streamUrl,
    loading,
    duration,
    setCurrentTime,
    setDuration,
    setStreamUrl,
    setLoading,
    setError,
    setPlaying,
    next,
    previous,
    setQueue,
  } = usePlayerStore()

  volumeRef.current = volume
  mutedRef.current = muted

  const autoplaySimilar = useSettingsStore((s) => s.settings.autoplaySimilar)
  const prebufferNextTrack = useSettingsStore((s) => s.settings.prebufferNextTrack)
  const crossfadeEnabled = useSettingsStore((s) => s.settings.crossfadeEnabled)
  const crossfadeDuration = useSettingsStore((s) => s.settings.crossfadeDuration)
  const gaplessEnabled = useSettingsStore((s) => s.settings.gaplessEnabled)
  const currentTrack = getCurrentTrack(usePlayerStore.getState())

  const cancelVolumeAnim = useCallback(() => {
    if (volumeAnimRef.current != null) {
      cancelAnimationFrame(volumeAnimRef.current)
      volumeAnimRef.current = null
    }
  }, [])

  const targetVolume = useCallback(() => (mutedRef.current ? 0 : volumeRef.current), [])

  const animateVolume = useCallback(
    (from: number, to: number, ms: number, onDone?: () => void) => {
      cancelVolumeAnim()
      const audio = audioRef.current
      if (!audio) return
      const start = performance.now()
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / ms)
        audio.volume = from + (to - from) * t
        if (t < 1) {
          volumeAnimRef.current = requestAnimationFrame(step)
        } else {
          volumeAnimRef.current = null
          onDone?.()
        }
      }
      volumeAnimRef.current = requestAnimationFrame(step)
    },
    [cancelVolumeAnim],
  )

  const resolvePlaybackUrl = useCallback(
    async (track: NonNullable<ReturnType<typeof getCurrentTrack>>, skipCache = false) => {
      if (track.source === 'local' && track.localPath) {
        return track.localPath
      }
      if (track.localPath) return track.localPath
      if (!window.electron) throw new Error('Electron API unavailable')
      const local = await window.electron.download.resolveTrack({
        id: track.id,
        title: track.title,
        artist: track.artist,
      })
      if (local) return local
      const quality = qualityOverrideRef.current ?? undefined
      return window.electron.stream.getUrl(track.id, { skipCache, quality })
    },
    [],
  )

  const stopAudioElement = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
    loadedStreamRef.current = null
  }, [])

  const loadStream = useCallback(
    async (
      track: NonNullable<ReturnType<typeof getCurrentTrack>>,
      skipCache = false,
      softTransition = false,
    ) => {
      const gen = ++loadGenRef.current
      activeTrackIdRef.current = track.id
      setLoading(true)
      setError(null, null)
      if (!softTransition) {
        setStreamUrl(null)
        stopAudioElement()
      }
      try {
        const url = await resolvePlaybackUrl(track, skipCache)
        if (loadGenRef.current !== gen) return
        if (activeTrackIdRef.current !== track.id) return
        setStreamUrl(url)
      } catch (err) {
        if (loadGenRef.current !== gen) return
        setStreamUrl(null)
        const message = err instanceof Error ? err.message : 'Failed to load stream'
        setError(message, classifyError(message))
        setPlaying(false)
        stopAudioElement()
      } finally {
        if (loadGenRef.current === gen) setLoading(false)
      }
    },
    [resolvePlaybackUrl, setLoading, setError, setStreamUrl, setPlaying, stopAudioElement],
  )

  const playSimilarTracks = useCallback(async () => {
    if (!currentTrack || !window.electron || autoplayingRef.current) return
    autoplayingRef.current = true
    try {
      const similar = await window.electron.similar.get({
        videoId: currentTrack.id,
        artist: currentTrack.artist,
        title: currentTrack.title,
        excludeId: currentTrack.id,
      })
      const playedIds = new Set(usePlayerStore.getState().queue.map((t) => t.id))
      const tracks = similar
        .filter((s) => s.id !== currentTrack.id && !playedIds.has(s.id))
        .slice(0, 15)
        .map((s) => ({
          id: s.id,
          title: s.title,
          artist: s.artist,
          thumbnail: s.thumbnail,
          duration: s.duration,
        }))
      if (tracks.length > 0) {
        setQueue([currentTrack, ...tracks], 1)
        setPlaying(true)
      } else {
        setPlaying(false)
      }
    } catch {
      setPlaying(false)
    } finally {
      autoplayingRef.current = false
    }
  }, [currentTrack, setQueue, setPlaying])

  useEffect(() => {
    const soft = pendingCrossfadeRef.current
    pendingCrossfadeRef.current = false

    cancelVolumeAnim()
    crossfadePhaseRef.current = 'none'

    if (!soft) {
      setStreamUrl(null)
      setCurrentTime(0)
      stopAudioElement()
    }
    nextUrlRef.current = null
    fadeOutStartedRef.current = false
    stallRetryRef.current = 0
    qualityOverrideRef.current = null
    if (stallTimerRef.current) {
      clearTimeout(stallTimerRef.current)
      stallTimerRef.current = null
    }

    if (!currentTrack) {
      activeTrackIdRef.current = null
      if (historyTimerRef.current) {
        clearTimeout(historyTimerRef.current)
        historyTimerRef.current = null
      }
      return
    }

    activeTrackIdRef.current = currentTrack.id
    wantsPlaybackRef.current = usePlayerStore.getState().isPlaying

    if (currentTrack.source === 'local' && currentTrack.localPath) {
      setStreamUrl(currentTrack.localPath)
      setError(null, null)
      setLoading(false)
    } else {
      void loadStream(currentTrack, false, soft)
    }

    if (historyTrackIdRef.current !== currentTrack.id) {
      historyTrackIdRef.current = currentTrack.id
      if (historyTimerRef.current) clearTimeout(historyTimerRef.current)
      historyTimerRef.current = setTimeout(() => {
        historyTimerRef.current = null
        const track = getCurrentTrack(usePlayerStore.getState())
        if (!track || track.id !== historyTrackIdRef.current) return
        void window.electron?.library.addHistory({
          id: track.id,
          title: track.title,
          artist: track.artist,
          thumbnail: resolveTrackThumbnail(track.id, track.thumbnail),
        })
      }, 4_000)
    }

    if (lastNotifiedTrackRef.current !== currentTrack.id) {
      lastNotifiedTrackRef.current = currentTrack.id
      if (usePlayerStore.getState().isPlaying) {
        void window.electron?.notify.show({
          title: currentTrack.title,
          body: currentTrack.artist,
          silent: true,
        })
      }
    }
  }, [
    currentTrack?.id,
    loadStream,
    setStreamUrl,
    setError,
    setCurrentTime,
    setLoading,
    cancelVolumeAnim,
    stopAudioElement,
  ])

  useEffect(() => {
    if (!prebufferNextTrack || !window.electron?.stream.prefetch) return
    const ids = queue
      .slice(currentIndex, currentIndex + QUEUE_PREFETCH_AHEAD)
      .map((t) => t.id)
      .filter((id) => YOUTUBE_VIDEO_ID.test(id))
    const unique = [...new Set(ids)]
    if (unique.length > 0) {
      void window.electron.stream.prefetch(unique.slice(0, 4))
    }
  }, [queue, currentIndex, prebufferNextTrack])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !streamUrl) {
      if (audio && !streamUrl) stopAudioElement()
      return
    }

    const trackId = activeTrackIdRef.current
    let cancelled = false
    const needsLoad = loadedStreamRef.current !== streamUrl

    if (needsLoad) {
      loadedStreamRef.current = streamUrl
      audio.src = streamUrl
      audio.load()
    }

    const playWhenReady = () => {
      if (cancelled) return
      if (trackId && activeTrackIdRef.current !== trackId) return
      if (needsLoad) {
        const { seekOnLoad } = usePlayerStore.getState()
        if (seekOnLoad != null && seekOnLoad > 0.5) {
          audio.currentTime = seekOnLoad
          setCurrentTime(seekOnLoad)
          usePlayerStore.setState({ seekOnLoad: null })
        } else {
          audio.currentTime = 0
          setCurrentTime(0)
        }
      }

      cancelVolumeAnim()
      const vol = targetVolume()

      if (crossfadeEnabled && needsLoad) {
        crossfadePhaseRef.current = 'in'
        audio.volume = 0
        const ms = Math.max(400, crossfadeDuration * 1000)
        animateVolume(0, vol, ms, () => {
          crossfadePhaseRef.current = 'none'
        })
      } else {
        crossfadePhaseRef.current = 'none'
        audio.volume = vol
      }

      const tryPlay = () => {
        const state = usePlayerStore.getState()
        if (!wantsPlaybackRef.current && !state.isPlaying) return
        if (state.loading) return
        if (trackId && activeTrackIdRef.current !== trackId) return
        void audio.play().then(() => {
          wantsPlaybackRef.current = false
          if (!state.isPlaying) setPlaying(true)
        }).catch(() => {
          // Stream may not be ready yet — keep play intent, don't flip UI to paused
        })
      }

      tryPlay()
    }

    if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      playWhenReady()
    } else {
      audio.addEventListener('canplay', playWhenReady, { once: true })
      audio.addEventListener('loadeddata', playWhenReady, { once: true })
    }

    return () => {
      cancelled = true
      audio.removeEventListener('canplay', playWhenReady)
      audio.removeEventListener('loadeddata', playWhenReady)
    }
  }, [
    streamUrl,
    isPlaying,
    setPlaying,
    setCurrentTime,
    crossfadeEnabled,
    crossfadeDuration,
    cancelVolumeAnim,
    animateVolume,
    targetVolume,
    stopAudioElement,
  ])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || crossfadePhaseRef.current !== 'none') return
    audio.volume = targetVolume()
  }, [volume, muted, targetVolume])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (!isPlaying) {
      wantsPlaybackRef.current = false
      audio.pause()
      return
    }
    wantsPlaybackRef.current = true
    // Don't call play() while the new URL is still loading — streamUrl effect handles that.
    if (loading || !streamUrl || loadedStreamRef.current !== streamUrl) return
    if (audio.paused && audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      void audio.play().catch(() => {})
    }
  }, [isPlaying, streamUrl, loading, setPlaying])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return

    const onTime = () => {
      setCurrentTime(audio.currentTime)
      const nextTrack = queue[currentIndex + 1]
      if (!nextTrack || crossfadePhaseRef.current !== 'none' || fadeOutStartedRef.current) return

      const total = duration || audio.duration || 0
      if (!Number.isFinite(total) || total <= 0) return

      const remaining = total - audio.currentTime
      if (remaining <= 0) return

      if (crossfadeEnabled && crossfadeDuration > 0 && remaining <= crossfadeDuration) {
        fadeOutStartedRef.current = true
        const fromVol = targetVolume()
        const fadeSec = Math.min(crossfadeDuration, remaining)
        const ms = Math.max(200, fadeSec * 1000)
        crossfadePhaseRef.current = 'out'
        pendingCrossfadeRef.current = true
        animateVolume(fromVol, 0, ms, () => {
          crossfadePhaseRef.current = 'none'
          next()
        })
        return
      }

      if (gaplessEnabled && !crossfadeEnabled && remaining <= 0.35) {
        fadeOutStartedRef.current = true
        next()
      }
    }

    audio.addEventListener('timeupdate', onTime)
    return () => audio.removeEventListener('timeupdate', onTime)
  }, [
    queue,
    currentIndex,
    duration,
    crossfadeEnabled,
    crossfadeDuration,
    gaplessEnabled,
    setCurrentTime,
    next,
    currentTrack,
    animateVolume,
    targetVolume,
  ])

  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return

    const thumb = resolveTrackThumbnail(currentTrack.id, currentTrack.thumbnail)
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist,
      artwork: thumb
        ? [
            { src: thumb, sizes: '96x96', type: 'image/jpeg' },
            { src: thumb, sizes: '512x512', type: 'image/jpeg' },
          ]
        : [],
    })

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'

    try {
      navigator.mediaSession.setActionHandler('play', () => setPlaying(true))
      navigator.mediaSession.setActionHandler('pause', () => setPlaying(false))
      navigator.mediaSession.setActionHandler('previoustrack', () => previous())
      navigator.mediaSession.setActionHandler('nexttrack', () => next())
    } catch {
      // Some platforms reject handlers
    }

    return () => {
      try {
        navigator.mediaSession.setActionHandler('play', null)
        navigator.mediaSession.setActionHandler('pause', null)
        navigator.mediaSession.setActionHandler('previoustrack', null)
        navigator.mediaSession.setActionHandler('nexttrack', null)
      } catch {
        // ignore
      }
    }
  }, [currentTrack, isPlaying, setPlaying, next, previous])

  useEffect(() => {
    const nextTrack = queue[currentIndex + 1]
    if (!prebufferNextTrack || !nextTrack || !window.electron) return

    const checkPrebuffer = () => {
      const audio = audioRef.current
      if (!audio || !duration) return
      const remaining = duration - audio.currentTime
      if (remaining <= PREBUFFER_SECONDS && !nextUrlRef.current) {
        void resolvePlaybackUrl(nextTrack).then((url) => {
          nextUrlRef.current = url
        })
      }
    }

    const id = setInterval(checkPrebuffer, 2000)
    return () => clearInterval(id)
  }, [queue, currentIndex, duration, prebufferNextTrack, resolvePlaybackUrl])

  useEffect(() => {
    nextUrlRef.current = null
    if (crossfadePhaseRef.current === 'none') loadedStreamRef.current = null
  }, [currentIndex])

  const handleTimeUpdate = () => {
    const audio = audioRef.current
    if (audio) setCurrentTime(audio.currentTime)
  }

  const handleLoadedMetadata = () => {
    const audio = audioRef.current
    if (audio) setDuration(audio.duration)
  }

  const handleEnded = () => {
    if (crossfadePhaseRef.current !== 'none' || fadeOutStartedRef.current) return
    if (handlePlaybackEndedForSleepTimer()) return
    const state = usePlayerStore.getState()
    const hasNext = state.currentIndex < state.queue.length - 1
    const willLoop = state.repeat === 'all' || state.repeat === 'one'

    if (hasNext || willLoop) {
      next()
      return
    }

    if (autoplaySimilar && currentTrack) {
      void playSimilarTracks()
      return
    }

    setPlaying(false)
  }

  const refreshStreamAfterFailure = useCallback(async () => {
    if (!currentTrack || !window.electron) return false
    if (currentTrack.source === 'local') {
      setError('Could not play local file', 'generic')
      setPlaying(false)
      return false
    }
    try {
      await window.electron.stream.invalidate(currentTrack.id)
      loadedStreamRef.current = null
      if (!qualityOverrideRef.current) qualityOverrideRef.current = 'medium'
      else if (qualityOverrideRef.current === 'medium') qualityOverrideRef.current = 'low'
      await loadStream(currentTrack, true)
      return true
    } catch {
      setError('Playback failed — try again or clear the stream cache in Settings', 'network')
      setPlaying(false)
      return false
    }
  }, [currentTrack, loadStream, setError, setPlaying])

  const retryWithLowerQuality = useCallback(async () => {
    if (!currentTrack || !window.electron) return
    setError(null, null)
    if (!qualityOverrideRef.current) qualityOverrideRef.current = 'medium'
    else if (qualityOverrideRef.current === 'medium') qualityOverrideRef.current = 'low'
    await window.electron.stream.invalidate(currentTrack.id)
    loadedStreamRef.current = null
    await loadStream(currentTrack, true)
    setPlaying(true)
  }, [currentTrack, loadStream, setError, setPlaying])

  const clearCacheAndRetry = useCallback(async () => {
    if (!currentTrack || !window.electron) return
    setError(null, null)
    await window.electron.stream.invalidate(currentTrack.id)
    await window.electron.stream.clearCache()
    qualityOverrideRef.current = null
    loadedStreamRef.current = null
    await loadStream(currentTrack, true)
    setPlaying(true)
  }, [currentTrack, loadStream, setError, setPlaying])

  const handleError = async () => {
    stallRetryRef.current = 0
    await refreshStreamAfterFailure()
  }

  const handleStalled = useCallback(() => {
    if (!currentTrack || currentTrack.source === 'local') return
    if (stallRetryRef.current >= 2) return
    if (stallTimerRef.current) return

    stallTimerRef.current = setTimeout(() => {
      stallTimerRef.current = null
      const audio = audioRef.current
      if (!audio || audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) return
      stallRetryRef.current += 1
      void refreshStreamAfterFailure().then((ok) => {
        if (ok && usePlayerStore.getState().isPlaying) {
          void audioRef.current?.play().catch(() => setPlaying(false))
        }
      })
    }, 2500)
  }, [currentTrack, refreshStreamAfterFailure, setPlaying])

  const retryPlayback = useCallback(async () => {
    if (!currentTrack) return
    setError(null, null)
    await loadStream(currentTrack, true)
    setPlaying(true)
  }, [currentTrack, loadStream, setError, setPlaying])

  const seek = (time: number) => {
    const audio = audioRef.current
    if (audio) {
      audio.currentTime = time
      setCurrentTime(time)
    }
  }

  return {
    audioRef,
    handleTimeUpdate,
    handleLoadedMetadata,
    handleEnded,
    handleError,
    handleStalled,
    seek,
    retryPlayback,
    retryWithLowerQuality,
    clearCacheAndRetry,
    currentTrack,
  }
}
