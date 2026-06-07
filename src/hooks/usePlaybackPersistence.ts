import { useEffect, useRef } from 'react'
import { usePlayerStore } from '@/store/playerStore'
import { useSettingsStore } from '@/store/settingsStore'

const SAVE_DEBOUNCE_MS = 1500

function savePlaybackSession() {
  const state = usePlayerStore.getState()
  if (!window.electron?.playback) return

  if (state.queue.length === 0) {
    void window.electron.playback.clearSession()
    return
  }

  void window.electron.playback.saveSession({
    queue: state.queue,
    currentIndex: state.currentIndex,
    currentTime: state.currentTime,
    isPlaying: state.isPlaying,
  })
}

export function usePlaybackPersistence() {
  const loaded = useSettingsStore((s) => s.loaded)
  const resumePlayback = useSettingsStore((s) => s.settings.resumePlayback)
  const restoredRef = useRef(false)

  useEffect(() => {
    if (!loaded || !window.electron?.playback || restoredRef.current) return

    restoredRef.current = true
    if (!resumePlayback) return

    void window.electron.playback.getSession().then((session) => {
      if (!session?.queue?.length) return
      const index = Math.min(Math.max(0, session.currentIndex), session.queue.length - 1)
      usePlayerStore.getState().restorePlayback(
        session.queue,
        index,
        session.currentTime,
        session.isPlaying,
      )
    })
  }, [loaded, resumePlayback])

  useEffect(() => {
    if (!loaded || !resumePlayback) return

    let timer: ReturnType<typeof setTimeout> | undefined

    const debouncedSave = () => {
      clearTimeout(timer)
      timer = setTimeout(savePlaybackSession, SAVE_DEBOUNCE_MS)
    }

    const flushSave = () => {
      clearTimeout(timer)
      savePlaybackSession()
    }

    const unsub = usePlayerStore.subscribe(debouncedSave)
    window.addEventListener('beforeunload', flushSave)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushSave()
    })

    return () => {
      unsub()
      clearTimeout(timer)
      window.removeEventListener('beforeunload', flushSave)
    }
  }, [loaded, resumePlayback])

  useEffect(() => {
    if (!loaded || resumePlayback) return
    restoredRef.current = false
    void window.electron?.playback.clearSession()
  }, [loaded, resumePlayback])
}
