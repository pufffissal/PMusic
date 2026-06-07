import type {
  AlbumDetailed,
  ArtistDetailed,
  PlaylistDetailed,
  SongDetailed,
  ThumbnailFull,
  UpNextsDetails,
  VideoDetailed,
} from 'ytmusic-api'
import type { SearchTrack, SearchTrackType } from '../ipc/search'
import { isUnknownArtist, parseArtistFromTitle } from '../utils/lyricsQuery'

const TYPE_LABELS = new Set([
  'song',
  'songs',
  'video',
  'videos',
  'album',
  'albums',
  'artist',
  'artists',
  'playlist',
  'playlists',
  'single',
  'ep',
  'podcast',
  'episode',
])

function isTypeLabel(value: string | undefined | null): boolean {
  const v = value?.trim().toLowerCase()
  return Boolean(v && TYPE_LABELS.has(v))
}

function resolveQueueArtist(title: string, artist?: string | null): string {
  const a = artist?.trim()
  if (a && !isUnknownArtist(a) && !isTypeLabel(a)) return a
  return parseArtistFromTitle(title)?.artist ?? a ?? 'Unknown artist'
}

function resolveQueueTitle(title: string, artist?: string | null): string {
  const a = artist?.trim()
  if (a && !isUnknownArtist(a)) return title
  return parseArtistFromTitle(title)?.title ?? title
}

export function youtubeThumbnail(videoId: string, size: 'mq' | 'hq' | 'max' = 'hq'): string {
  const file = size === 'mq' ? 'mqdefault.jpg' : size === 'max' ? 'maxresdefault.jpg' : 'hqdefault.jpg'
  return `https://i.ytimg.com/vi/${videoId}/${file}`
}

export function pickThumbnail(thumbnails: ThumbnailFull[] | undefined, videoId?: string): string {
  if (thumbnails?.length) {
    const sorted = [...thumbnails].sort((a, b) => (b.width ?? 0) - (a.width ?? 0))
    const url = sorted[0]?.url ?? sorted[sorted.length - 1]?.url ?? ''
    if (url) return url
  }
  return videoId ? youtubeThumbnail(videoId, 'hq') : ''
}

export function mapSongDetailed(song: SongDetailed): SearchTrack {
  return {
    id: song.videoId,
    title: resolveQueueTitle(song.name, song.artist?.name),
    artist: resolveQueueArtist(song.name, song.artist?.name),
    duration: song.duration ?? 0,
    thumbnail: pickThumbnail(song.thumbnails, song.videoId),
    type: 'song',
  }
}

export function mapVideoDetailed(video: VideoDetailed, asType: SearchTrackType = 'song'): SearchTrack {
  return {
    id: video.videoId,
    title: resolveQueueTitle(video.name, video.artist?.name),
    artist: resolveQueueArtist(video.name, video.artist?.name),
    duration: video.duration ?? 0,
    thumbnail: pickThumbnail(video.thumbnails, video.videoId),
    type: asType,
  }
}

export function mapUpNext(up: UpNextsDetails): SearchTrack {
  return {
    id: up.videoId,
    title: resolveQueueTitle(up.title, up.artists?.name),
    artist: resolveQueueArtist(up.title, up.artists?.name),
    duration: up.duration ?? 0,
    thumbnail: pickThumbnail(up.thumbnails, up.videoId),
    type: 'song',
  }
}

export function mapAlbumDetailed(album: AlbumDetailed): SearchTrack {
  return {
    id: album.albumId,
    title: album.name,
    artist: album.artist?.name?.trim() || 'Unknown artist',
    duration: 0,
    thumbnail: pickThumbnail(album.thumbnails),
    type: 'album',
  }
}

export function mapArtistDetailed(artist: ArtistDetailed): SearchTrack {
  return {
    id: artist.artistId,
    title: artist.name,
    artist: artist.name,
    duration: 0,
    thumbnail: pickThumbnail(artist.thumbnails),
    type: 'artist',
  }
}

export function mapPlaylistDetailed(pl: PlaylistDetailed, asType: SearchTrackType = 'playlist'): SearchTrack {
  return {
    id: pl.playlistId,
    title: pl.name,
    artist: pl.artist?.name?.trim() || 'Unknown artist',
    duration: 0,
    thumbnail: pickThumbnail(pl.thumbnails),
    type: asType,
  }
}
