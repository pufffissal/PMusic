import { getYTMusic } from './ytClient'
import { pickThumbnail } from './mappers'
import type { YtmPlaylist, YtmTrack } from '../ipc/youtube'

export async function fetchFeaturedPlaylists(): Promise<YtmPlaylist[]> {
  const ytm = await getYTMusic()
  const sections = await ytm.getHomeSections()
  const seen = new Set<string>()
  const playlists: YtmPlaylist[] = []

  for (const section of sections) {
    for (const item of section.contents) {
      if (item.type !== 'PLAYLIST') continue
      if (seen.has(item.playlistId)) continue
      seen.add(item.playlistId)
      playlists.push({
        id: item.playlistId,
        title: item.name,
        artist: item.artist?.name?.trim() || 'YouTube Music',
        thumbnail: pickThumbnail(item.thumbnails),
        trackCount: 0,
      })
    }
  }

  return playlists.slice(0, 24)
}

export async function fetchPlaylistTracks(playlistId: string): Promise<YtmTrack[]> {
  const ytm = await getYTMusic()
  const videos = await ytm.getPlaylistVideos(playlistId)
  return videos.map((video) => ({
    id: video.videoId,
    title: video.name,
    artist: video.artist?.name?.trim() || 'Unknown artist',
    duration: video.duration ?? 0,
    thumbnail: pickThumbnail(video.thumbnails, video.videoId),
  }))
}
