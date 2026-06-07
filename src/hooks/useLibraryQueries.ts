import { useQuery } from '@tanstack/react-query'
import type { ListeningStats } from '../../electron/preload'

export function useStatsQuery(enabled = true) {
  return useQuery({
    queryKey: ['library', 'stats'],
    queryFn: () => window.electron!.library.getStats(),
    enabled: enabled && !!window.electron,
    staleTime: 60_000,
  })
}

export type { ListeningStats }
