import type { QueueTrack } from '@/store/playerStore'
import type { SearchTrack } from '../../../electron/preload'

export function toQueueTrack(s: {
  id: string
  title: string
  artist: string
  thumbnail: string
  duration?: number
}): QueueTrack {
  return { id: s.id, title: s.title, artist: s.artist, thumbnail: s.thumbnail, duration: s.duration }
}

export function openCatalogItem(
  item: SearchTrack,
  setCatalogDetail: (detail: import('@/store/catalogStore').CatalogDetail) => void,
) {
  if (item.type === 'album') {
    setCatalogDetail({ kind: 'album', id: item.id, title: item.title, artist: item.artist, thumbnail: item.thumbnail })
  } else if (item.type === 'artist') {
    setCatalogDetail({ kind: 'artist', id: item.id, name: item.title, thumbnail: item.thumbnail })
  } else if (item.type === 'playlist') {
    setCatalogDetail({ kind: 'playlist', id: item.id, title: item.title, artist: item.artist, thumbnail: item.thumbnail })
  }
}
