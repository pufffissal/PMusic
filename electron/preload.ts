import { contextBridge, ipcRenderer } from 'electron'

export type SearchTrackType = 'song' | 'album' | 'artist' | 'playlist' | 'podcast'

export interface SearchTrack {
  id: string
  title: string
  artist: string
  duration: number
  thumbnail: string
  type: SearchTrackType
}

export type SearchMode = 'music' | 'podcasts' | 'all'

export interface SearchResults {
  topResult?: SearchTrack
  songs: SearchTrack[]
  albums: SearchTrack[]
  artists: SearchTrack[]
  playlists: SearchTrack[]
  podcasts: SearchTrack[]
  podcastShows: SearchTrack[]
}

export interface TrackMetadata {
  id: string
  title: string
  artist: string
  album?: string
  duration: number
  thumbnail: string
  description?: string
  genres?: string[]
  releaseYear?: number
  viewCount?: number
  channel?: string
  plainLyrics?: string
  syncedLyrics?: string
  lyricsSource?: 'lrclib' | 'none'
}

export interface LyricsFetchHints {
  artist: string
  title: string
  duration?: number
  album?: string
}

export interface LyricsFetchResult {
  plainLyrics?: string
  syncedLyrics?: string
  lyricsSource: 'lrclib' | 'none'
}

export interface LyricsTrackOverride {
  offsetMs: number
  updatedAt: number
}

export interface LikedTrack {
  id: string
  title: string
  artist: string
  thumbnail: string
  likedAt: number
}

export interface Playlist {
  id: string
  name: string
  trackIds: string[]
  createdAt: number
  color?: string
  emoji?: string
  description?: string
  cover?: string
  covers?: string[]
}

export interface StoredTrack {
  id: string
  title: string
  artist: string
  thumbnail: string
  duration?: number
}

export interface YoutubeAuthStatus {
  enabled: boolean
  browserProfile: string | null
  browser: string | null
  cookiesFile: string | null
  accountLabel: string | null
}

export interface YoutubePlaylist {
  id: string
  title: string
  artist: string
  thumbnail: string
  trackCount: number
}

export interface YoutubeTrack {
  id: string
  title: string
  artist: string
  duration: number
  thumbnail: string
}

export interface DownloadProgressEvent {
  jobId: string
  trackId: string
  title: string
  percent: number
  status: 'starting' | 'downloading' | 'converting' | 'done' | 'error'
  message?: string
}

export interface DownloadedFile {
  name: string
  path: string
  sizeBytes: number
  modifiedAt: number
  folder: string
}

export interface ArtistSummary {
  name: string
  trackCount: number
  playCount: number
  thumbnail: string
  tracks: StoredTrack[]
}

export interface ListeningStats {
  totalPlays: number
  uniqueTracks: number
  likedCount: number
  playlistCount: number
  playsThisWeek: number
  topArtists: { name: string; count: number }[]
  topTracks: { id: string; title: string; artist: string; thumbnail: string; count: number }[]
  activityByDay: { label: string; count: number }[]
}

export interface HomeSuggestions {
  playlists: SearchTrack[]
  songs: SearchTrack[]
}

export interface HomeSeedTrack {
  id: string
  artist: string
  title: string
}

export interface SmartPlaylist {
  id: string
  name: string
  description: string
  emoji: string
  tracks: StoredTrack[]
}

export interface CatalogAlbum {
  id: string
  title: string
  artist: string
  thumbnail: string
  tracks: SearchTrack[]
}

export interface CatalogArtist {
  id: string
  name: string
  thumbnail: string
  topTracks: SearchTrack[]
  albums: SearchTrack[]
  radioSeed?: SearchTrack
}

export type AppTheme = 'glass' | 'dark' | 'white'

export interface AppSettings {
  uiScale: number
  theme: AppTheme
  accentColor: string | null
  useDynamicAccent: boolean
  glassIntensity: 'normal' | 'high'
  autoplaySimilar: boolean
  defaultVolume: number
  openNowPlayingOnPlay: boolean
  showLyrics: boolean
  syncedLyrics: boolean
  lyricsSyncMode: 'line' | 'clause' | 'word'
  scrollStaticLyrics: boolean
  reduceMotion: boolean
  compactPlayer: boolean
  showTrackNumbers: boolean
  searchDebounceMs: number
  enhancedSearch: boolean
  showDurationInLists: boolean
  prebufferNextTrack: boolean
  lyricsFontSize: 'small' | 'medium' | 'large'
  showAuroraEffects: boolean
  showPlayerArtworkGlow: boolean
  pauseOnFocusLoss: boolean
  resumePlayback: boolean
  crossfadeEnabled: boolean
  crossfadeDuration: number
  gaplessEnabled: boolean
  streamQuality: 'best' | 'high' | 'medium' | 'low'
  downloadFolder: string | null
  downloadQuality: 'best' | '320' | '192' | '128'
  downloadEmbedThumbnail: boolean
  downloadEmbedMetadata: boolean
  discordEnabled: boolean
  discordShowProgress: boolean
}

export interface RPCTrackData {
  videoId: string
  title: string
  artist: string
  durationSeconds: number
  positionSeconds: number
  isPlaying: boolean
  showProgress?: boolean
}

const electronApi = {
  stream: {
    getUrl: (videoId: string, options?: { skipCache?: boolean; quality?: 'best' | 'high' | 'medium' | 'low' }) =>
      ipcRenderer.invoke('stream:getUrl', videoId, options) as Promise<string>,
    prefetch: (videoIds: string[]) => ipcRenderer.invoke('stream:prefetch', videoIds),
    clearCache: () => ipcRenderer.invoke('stream:clearCache'),
    invalidate: (videoId: string) => ipcRenderer.invoke('stream:invalidate', videoId),
  },
  home: {
    getSuggestions: (seeds: { artists: string[]; tracks: HomeSeedTrack[] }) =>
      ipcRenderer.invoke('home:getSuggestions', seeds) as Promise<{
        suggestions: HomeSuggestions
        fromCache: boolean
      }>,
    getPlaylistTracks: (playlistId: string) =>
      ipcRenderer.invoke('home:getPlaylistTracks', playlistId) as Promise<SearchTrack[]>,
    getSmartPlaylists: (seeds: { artists: string[]; tracks: HomeSeedTrack[] }) =>
      ipcRenderer.invoke('home:getSmartPlaylists', seeds) as Promise<{
        playlists: SmartPlaylist[]
        fromCache: boolean
      }>,
  },
  cache: {
    getStats: () =>
      ipcRenderer.invoke('cache:getStats') as Promise<{
        sizeBytes: number
        fileCount: number
        formatted: string
      }>,
    clearAll: () =>
      ipcRenderer.invoke('cache:clearAll') as Promise<{
        sizeBytes: number
        fileCount: number
        formatted: string
      }>,
  },
  search: {
    query: (q: string, mode?: SearchMode) =>
      ipcRenderer.invoke('search:query', q, mode ?? 'music') as Promise<SearchResults>,
  },
  similar: {
    get: (params: { videoId: string; artist: string; title: string; excludeId?: string }) =>
      ipcRenderer.invoke('similar:get', params) as Promise<SearchTrack[]>,
  },
  metadata: {
    get: (
      videoId: string,
      options?: { skipCache?: boolean; includeLyrics?: boolean; hints?: LyricsFetchHints },
    ) => ipcRenderer.invoke('metadata:get', videoId, options) as Promise<TrackMetadata>,
    fetchLyrics: (
      params: { videoId: string } & LyricsFetchHints & { skipCache?: boolean },
    ) => ipcRenderer.invoke('metadata:fetchLyrics', params) as Promise<LyricsFetchResult>,
    refetchLyrics: (videoId: string) =>
      ipcRenderer.invoke('metadata:refetchLyrics', videoId) as Promise<TrackMetadata>,
    prefetch: (videoIds: string[]) => ipcRenderer.invoke('metadata:prefetch', videoIds),
    prefetchLyrics: (
      tracks: ({ videoId: string } & LyricsFetchHints)[],
    ) => ipcRenderer.invoke('metadata:prefetchLyrics', tracks),
  },
  lyrics: {
    getOverride: (trackId: string) =>
      ipcRenderer.invoke('lyrics:getOverride', trackId) as Promise<LyricsTrackOverride | null>,
    setOverride: (trackId: string, patch: { offsetMs?: number }) =>
      ipcRenderer.invoke('lyrics:setOverride', trackId, patch) as Promise<LyricsTrackOverride | null>,
    clearOverride: (trackId: string) => ipcRenderer.invoke('lyrics:clearOverride', trackId),
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get') as Promise<AppSettings>,
    set: (partial: Partial<AppSettings>) => ipcRenderer.invoke('settings:set', partial) as Promise<AppSettings>,
    reset: () => ipcRenderer.invoke('settings:reset') as Promise<AppSettings>,
  },
  palette: {
    imageDataUrl: (url: string) => ipcRenderer.invoke('palette:imageDataUrl', url) as Promise<string>,
  },
  catalog: {
    getAlbum: (albumId: string) => ipcRenderer.invoke('catalog:getAlbum', albumId) as Promise<CatalogAlbum | null>,
    getArtist: (payload: { id: string; name: string }) =>
      ipcRenderer.invoke('catalog:getArtist', payload) as Promise<CatalogArtist | null>,
    getArtistRadio: (payload: { id: string; name: string }) =>
      ipcRenderer.invoke('catalog:getArtistRadio', payload) as Promise<SearchTrack[]>,
    getPlaylistTracks: (playlistId: string) =>
      ipcRenderer.invoke('catalog:getPlaylistTracks', playlistId) as Promise<SearchTrack[]>,
    getSmartPlaylists: () => ipcRenderer.invoke('catalog:getSmartPlaylists') as Promise<SmartPlaylist[]>,
  },
  notify: {
    show: (payload: { title: string; body?: string; silent?: boolean }) =>
      ipcRenderer.invoke('notify:show', payload) as Promise<boolean>,
  },
  update: {
    check: () =>
      ipcRenderer.invoke('update:check') as Promise<{
        status: string
        version?: string
        error?: string
        message?: string
        percent?: number
      }>,
    download: () => ipcRenderer.invoke('update:download') as Promise<boolean>,
    install: () => ipcRenderer.invoke('update:install') as Promise<boolean>,
    getStatus: () =>
      ipcRenderer.invoke('update:getStatus') as Promise<{
        status: string
        version?: string
        error?: string
        message?: string
        percent?: number
      }>,
    onStatus: (
      cb: (payload: {
        status: string
        version?: string
        error?: string
        message?: string
        percent?: number
      }) => void,
    ) => {
      const handler = (
        _: unknown,
        payload: {
          status: string
          version?: string
          error?: string
          message?: string
          percent?: number
        },
      ) => cb(payload)
      ipcRenderer.on('update:status', handler)
      return () => ipcRenderer.removeListener('update:status', handler)
    },
  },
  playback: {
    getSession: () =>
      ipcRenderer.invoke('playback:getSession') as Promise<{
        queue: { id: string; title: string; artist: string; thumbnail: string; duration?: number }[]
        currentIndex: number
        currentTime: number
        isPlaying: boolean
        savedAt: number
      } | null>,
    saveSession: (session: {
      queue: { id: string; title: string; artist: string; thumbnail: string; duration?: number }[]
      currentIndex: number
      currentTime: number
      isPlaying: boolean
    }) => ipcRenderer.invoke('playback:saveSession', session),
    clearSession: () => ipcRenderer.invoke('playback:clearSession'),
  },
  library: {
    getLiked: () => ipcRenderer.invoke('library:getLiked') as Promise<LikedTrack[]>,
    toggleLike: (track: LikedTrack) => ipcRenderer.invoke('library:toggleLike', track),
    isLiked: (id: string) => ipcRenderer.invoke('library:isLiked', id) as Promise<boolean>,
    addHistory: (entry: Omit<LikedTrack, 'likedAt'> & { playedAt?: number }) =>
      ipcRenderer.invoke('library:addHistory', entry),
    getHistory: () => ipcRenderer.invoke('library:getHistory'),
    clearHistory: () => ipcRenderer.invoke('library:clearHistory'),
    removeFromHistory: (trackId: string) => ipcRenderer.invoke('library:removeFromHistory', trackId),
    hideTrack: (trackId: string) => ipcRenderer.invoke('library:hideTrack', trackId),
    getHiddenTrackIds: () => ipcRenderer.invoke('library:getHiddenTrackIds') as Promise<string[]>,
    clearHiddenTracks: () => ipcRenderer.invoke('library:clearHiddenTracks'),
    getPlaylists: () => ipcRenderer.invoke('library:getPlaylists') as Promise<Playlist[]>,
    createPlaylist: (payload: { name: string; color?: string; emoji?: string }) =>
      ipcRenderer.invoke('library:createPlaylist', payload) as Promise<Playlist>,
    createPlaylistFromTracks: (payload: {
      name: string
      emoji?: string
      color?: string
      description?: string
      tracks: StoredTrack[]
    }) => ipcRenderer.invoke('library:createPlaylistFromTracks', payload) as Promise<Playlist>,
    updatePlaylist: (playlist: Playlist) => ipcRenderer.invoke('library:updatePlaylist', playlist),
    deletePlaylist: (id: string) => ipcRenderer.invoke('library:deletePlaylist', id),
    addTrackToPlaylist: (payload: { playlistId: string; track: StoredTrack }) =>
      ipcRenderer.invoke('library:addTrackToPlaylist', payload),
    getPlaylistTracks: (playlistId: string) =>
      ipcRenderer.invoke('library:getPlaylistTracks', playlistId) as Promise<StoredTrack[]>,
    removeTrackFromPlaylist: (payload: { playlistId: string; trackId: string }) =>
      ipcRenderer.invoke('library:removeTrackFromPlaylist', payload),
    getArtists: () => ipcRenderer.invoke('library:getArtists') as Promise<ArtistSummary[]>,
    getStats: () => ipcRenderer.invoke('library:getStats') as Promise<ListeningStats>,
  },
  youtube: {
    getStatus: () => ipcRenderer.invoke('youtube:getStatus') as Promise<YoutubeAuthStatus>,
    getPlaylists: () => ipcRenderer.invoke('youtube:getPlaylists') as Promise<YoutubePlaylist[]>,
    getPlaylistTracks: (playlistId: string) =>
      ipcRenderer.invoke('youtube:getPlaylistTracks', playlistId) as Promise<YoutubeTrack[]>,
    parsePlaylistId: (input: string) =>
      ipcRenderer.invoke('youtube:parsePlaylistId', input) as Promise<string | null>,
    searchPlaylists: (query: string) =>
      ipcRenderer.invoke('youtube:searchPlaylists', query) as Promise<YoutubePlaylist[]>,
    importPlaylist: (payload: { playlistId: string; name?: string; emoji?: string; color?: string }) =>
      ipcRenderer.invoke('youtube:importPlaylist', payload) as Promise<Playlist | null>,
  },
  download: {
    getDefaultFolder: () => ipcRenderer.invoke('download:getDefaultFolder') as Promise<string>,
    pickFolder: () => ipcRenderer.invoke('download:pickFolder') as Promise<string | null>,
    track: (track: { id: string; title: string; artist: string }) =>
      ipcRenderer.invoke('download:track', track) as Promise<
        { ok: true } | { ok: false; error: string }
      >,
    playlist: (payload: { name: string; tracks: { id: string; title: string; artist: string }[] }) =>
      ipcRenderer.invoke('download:playlist', payload) as Promise<{
        ok: boolean
        completed: number
        failed: number
        folder: string
        error?: string
        cancelled?: boolean
      }>,
    cancel: () => ipcRenderer.invoke('download:cancel'),
    listFiles: () =>
      ipcRenderer.invoke('download:listFiles') as Promise<{
        folder: string
        files: DownloadedFile[]
        totalBytes: number
        formattedSize: string
      }>,
    openFolder: (subfolder?: string) => ipcRenderer.invoke('download:openFolder', subfolder),
    revealFile: (filePath: string) => ipcRenderer.invoke('download:revealFile', filePath),
    getLocalUrl: (filePath: string) =>
      ipcRenderer.invoke('download:getLocalUrl', filePath) as Promise<string | null>,
    metaForPath: (filePath: string) =>
      ipcRenderer.invoke('download:metaForPath', filePath) as Promise<{
        id: string
        thumbnail: string
      } | null>,
    resolveTrack: (track: { id: string; title: string; artist: string }) =>
      ipcRenderer.invoke('download:resolveTrack', track) as Promise<string | null>,
    onProgress: (cb: (event: DownloadProgressEvent) => void) => {
      const handler = (_: unknown, event: DownloadProgressEvent) => cb(event)
      ipcRenderer.on('download:progress', handler)
      return () => ipcRenderer.removeListener('download:progress', handler)
    },
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    toggleMini: () => ipcRenderer.invoke('window:toggleMini') as Promise<boolean>,
    getMiniMode: () => ipcRenderer.invoke('window:getMiniMode') as Promise<boolean>,
    onBlur: (cb: () => void) => {
      const handler = () => cb()
      ipcRenderer.on('window:blur', handler)
      return () => ipcRenderer.removeListener('window:blur', handler)
    },
  },
  discord: {
    isConfigured: () => ipcRenderer.invoke('discord:isConfigured') as Promise<boolean>,
    connect: () =>
      ipcRenderer.invoke('discord:connect') as Promise<'connected' | 'disconnected' | 'no-discord'>,
    disconnect: () => ipcRenderer.invoke('discord:disconnect') as Promise<'disconnected'>,
    updateActivity: (track: RPCTrackData) => ipcRenderer.invoke('discord:updateActivity', track),
    clearActivity: () => ipcRenderer.invoke('discord:clearActivity'),
    status: () =>
      ipcRenderer.invoke('discord:status') as Promise<'connected' | 'disconnected' | 'no-discord'>,
  },
  player: {
    onNext: (cb: () => void) => {
      const handler = () => cb()
      ipcRenderer.on('player:next', handler)
      return () => ipcRenderer.removeListener('player:next', handler)
    },
    onPrevious: (cb: () => void) => {
      const handler = () => cb()
      ipcRenderer.on('player:previous', handler)
      return () => ipcRenderer.removeListener('player:previous', handler)
    },
    onTogglePlay: (cb: () => void) => {
      const handler = () => cb()
      ipcRenderer.on('player:togglePlay', handler)
      return () => ipcRenderer.removeListener('player:togglePlay', handler)
    },
    onVolumeUp: (cb: () => void) => {
      const handler = () => cb()
      ipcRenderer.on('player:volumeUp', handler)
      return () => ipcRenderer.removeListener('player:volumeUp', handler)
    },
    onVolumeDown: (cb: () => void) => {
      const handler = () => cb()
      ipcRenderer.on('player:volumeDown', handler)
      return () => ipcRenderer.removeListener('player:volumeDown', handler)
    },
    onToggleMute: (cb: () => void) => {
      const handler = () => cb()
      ipcRenderer.on('player:toggleMute', handler)
      return () => ipcRenderer.removeListener('player:toggleMute', handler)
    },
    onToggleShuffle: (cb: () => void) => {
      const handler = () => cb()
      ipcRenderer.on('player:toggleShuffle', handler)
      return () => ipcRenderer.removeListener('player:toggleShuffle', handler)
    },
    onCycleRepeat: (cb: () => void) => {
      const handler = () => cb()
      ipcRenderer.on('player:cycleRepeat', handler)
      return () => ipcRenderer.removeListener('player:cycleRepeat', handler)
    },
  },
}

contextBridge.exposeInMainWorld('electron', electronApi)

export type ElectronApi = typeof electronApi
