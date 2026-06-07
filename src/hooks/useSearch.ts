import { useQuery } from '@tanstack/react-query'
import { useMemo, useState, useEffect } from 'react'
import type { SearchMode } from '@/store/appStore'
import { useSettingsStore } from '@/store/settingsStore'

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

export function useSearch(
  query: string,
  options?: { debounceMs?: number; minLength?: number; mode?: SearchMode },
) {
  const debounceMs = options?.debounceMs ?? 120
  const minLength = options?.minLength ?? 1
  const mode = options?.mode ?? 'music'
  const debounced = useDebounce(query.trim(), debounceMs)
  const prebufferNextTrack = useSettingsStore((s) => s.settings.prebufferNextTrack)

  return useQuery({
    queryKey: ['search', debounced, mode, prebufferNextTrack],
    queryFn: async () => {
      const data = await window.electron!.search.query(debounced, mode)
      if (prebufferNextTrack && window.electron) {
        const ids: string[] = []
        const top = data.topResult
        if (top && (top.type === 'song' || top.type === 'podcast')) ids.push(top.id)
        for (const song of data.songs ?? []) {
          if (ids.length >= 3) break
          if (!ids.includes(song.id)) ids.push(song.id)
        }
        if (ids.length > 0) void window.electron.stream.prefetch(ids)
      }
      return data
    },
    enabled: debounced.length >= minLength && !!window.electron,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}

export function useFormattedDuration(seconds: number) {
  return useMemo(() => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }, [seconds])
}
