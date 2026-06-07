import { useCallback, useEffect, useRef } from 'react'
import { usePlayerStore } from '@/store/playerStore'
import { useSettingsStore } from '@/store/settingsStore'

/** Updates Discord Rich Presence from playback state. */
export function useDiscordRPC() {
  const discordEnabled = useSettingsStore((s) => s.settings.discordEnabled)
  const discordShowProgress = useSettingsStore((s) => s.settings.discordShowProgress)
  const settingsLoaded = useSettingsStore((s) => s.loaded)

  const queue = usePlayerStore((s) => s.queue)
  const currentIndex = usePlayerStore((s) => s.currentIndex)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const currentTime = usePlayerStore((s) => s.currentTime)
  const duration = usePlayerStore((s) => s.duration)

  const currentTrack = queue[currentIndex] ?? null

  const discordEnabledRef = useRef(discordEnabled)
  discordEnabledRef.current = discordEnabled

  const playbackRef = useRef({
    currentTrack,
    currentTime,
    duration,
    isPlaying,
    discordShowProgress,
  })
  playbackRef.current = {
    currentTrack,
    currentTime,
    duration,
    isPlaying,
    discordShowProgress,
  }

  const pushActivity = useCallback(() => {
    if (!window.electron?.discord || !discordEnabledRef.current) return

    const {
      currentTrack: track,
      currentTime: position,
      duration: trackDuration,
      isPlaying: playing,
      discordShowProgress: showProgress,
    } = playbackRef.current

    if (!track) return

    void window.electron.discord.updateActivity({
      videoId: track.id,
      title: track.title,
      artist: track.artist,
      durationSeconds: trackDuration || track.duration || 0,
      positionSeconds: position,
      isPlaying: playing,
      showProgress,
    })
  }, [])

  const prevTimeRef = useRef(currentTime)

  useEffect(() => {
    if (!window.electron?.discord || !settingsLoaded) return

    if (!discordEnabled) {
      void window.electron.discord.disconnect()
      return
    }

    void window.electron.discord.connect()
  }, [discordEnabled, settingsLoaded])

  useEffect(() => {
    if (!window.electron?.discord) return

    if (!discordEnabled || !currentTrack) {
      void window.electron.discord.clearActivity().catch(() => {})
      return
    }

    pushActivity()
    prevTimeRef.current = currentTime
  }, [
    currentTrack?.id,
    isPlaying,
    duration,
    discordShowProgress,
    discordEnabled,
    pushActivity,
    currentTrack,
  ])

  useEffect(() => {
    if (!window.electron?.discord || !discordEnabled || !currentTrack) return

    const prev = prevTimeRef.current
    prevTimeRef.current = currentTime

    if (Math.abs(currentTime - prev) > 2.5) {
      pushActivity()
    }
  }, [currentTime, discordEnabled, currentTrack, pushActivity])
}
