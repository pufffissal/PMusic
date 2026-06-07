import { useCallback, useEffect, useRef, useState } from 'react'
import { Heart, ListMusic, Play, Search, Sparkles } from 'lucide-react'
import { AlbumCard } from '@/components/ui/AlbumCard'
import { PlaylistCard, type HomePlaylistItem } from '@/components/ui/PlaylistCard'
import { Appear, Stagger, StaggerItem } from '@/components/ui/motion'
import type { QueueTrack } from '@/store/playerStore'
import { usePlayerStore } from '@/store/playerStore'
import { useAppStore } from '@/store/appStore'
import { useCatalogStore } from '@/store/catalogStore'
import { GlassContextMenu } from '@/components/ui/GlassContextMenu'
import { useTrackContextMenu } from '@/hooks/useTrackContextMenu'
import { ArtworkImage } from '@/components/ui/ArtworkImage'
import type { SearchTrack, SmartPlaylist, StoredTrack } from '../../../electron/preload'

type SavedPlaybackSession = NonNullable<Awaited<ReturnType<NonNullable<typeof window.electron>['playback']['getSession']>>>

const SMART_PLAYLIST_COLORS = ['#fa2d48', '#1db954', '#0a84ff', '#bf5af2', '#ff9f0a', '#64d2ff']

function toTrack(t: StoredTrack | QueueTrack | SearchTrack): QueueTrack {
  return {
    id: t.id,
    title: t.title,
    artist: t.artist,
    thumbnail: t.thumbnail,
    duration: 'duration' in t ? t.duration : undefined,
  }
}

function cleanArtist(name: string): string {
  return name.replace(/\s*[-–—]\s*topic$/i, '').trim()
}

function smartPlaylistToCard(pl: SmartPlaylist, index: number): HomePlaylistItem {
  const covers = [...new Set(pl.tracks.map((t) => t.thumbnail).filter(Boolean))].slice(0, 4)
  return {
    id: pl.id,
    name: pl.name,
    subtitle: pl.description,
    kind: 'smart',
    emoji: pl.emoji,
    color: SMART_PLAYLIST_COLORS[index % SMART_PLAYLIST_COLORS.length],
    thumbnail: pl.tracks[0]?.thumbnail,
    covers: covers.length > 1 ? covers : undefined,
    trackCount: pl.tracks.length,
  }
}

function topArtistsFromListening(
  history: { artist: string }[],
  liked: { artist: string }[],
): string[] {
  const counts = new Map<string, number>()
  const bump = (raw: string) => {
    const name = cleanArtist(raw)
    if (!name || name === 'Unknown artist' || name === 'Unknown') return
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  for (const e of history) bump(e.artist)
  for (const e of liked) bump(e.artist)
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)
    .slice(0, 6)
}

export function HomeView() {
  const currentView = useAppStore((s) => s.currentView)
  const setView = useAppStore((s) => s.setView)
  const setCatalogDetail = useCatalogStore((s) => s.setCatalogDetail)
  const playTrack = usePlayerStore((s) => s.playTrack)
  const playQueue = usePlayerStore((s) => s.playQueue)
  const restorePlayback = usePlayerStore((s) => s.restorePlayback)
  const ctx = useTrackContextMenu()

  const [recent, setRecent] = useState<QueueTrack[]>([])
  const [liked, setLiked] = useState<QueueTrack[]>([])
  const [libraryPlaylists, setLibraryPlaylists] = useState<HomePlaylistItem[]>([])
  const [discoverPlaylists, setDiscoverPlaylists] = useState<HomePlaylistItem[]>([])
  const [suggestedSongs, setSuggestedSongs] = useState<QueueTrack[]>([])
  const [smartPlaylists, setSmartPlaylists] = useState<HomePlaylistItem[]>([])
  const [smartPlaylistsLoading, setSmartPlaylistsLoading] = useState(false)
  const [continueSession, setContinueSession] = useState<SavedPlaybackSession | null>(null)
  const smartTracksRef = useRef<Map<string, QueueTrack[]>>(new Map())
  const smartMetaRef = useRef<Map<string, SmartPlaylist>>(new Map())
  const [loading, setLoading] = useState(true)
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [hasListeningHistory, setHasListeningHistory] = useState(false)

  const playLocalPlaylist = async (id: string) => {
    const tracks = await window.electron?.library.getPlaylistTracks(id)
    if (tracks?.length) playQueue(tracks.map(toTrack), 0)
  }

  const playDiscoverPlaylist = async (id: string) => {
    const tracks = await window.electron?.home.getPlaylistTracks(id)
    if (tracks?.length) playQueue(tracks.map(toTrack), 0)
  }

  const loadHome = useCallback(async () => {
    setLoading(true)
    setSuggestionsLoading(true)
    setSmartPlaylistsLoading(true)
    try {
      const [history, likedRaw, localPlaylists, hiddenIds] = await Promise.all([
        window.electron?.library.getHistory(),
        window.electron?.library.getLiked(),
        window.electron?.library.getPlaylists(),
        window.electron?.library.getHiddenTrackIds(),
      ])

      const hidden = new Set(hiddenIds ?? [])

      const historyList = history ?? []
      setHasListeningHistory(historyList.length > 0 || (likedRaw?.length ?? 0) > 0)

      const session = await window.electron?.playback.getSession()
      if (session?.queue.length) {
        const resume = session.currentTime > 8 || session.currentIndex > 0
        setContinueSession(resume ? session : null)
      } else {
        setContinueSession(null)
      }
      const recentTracks = historyList.map(
        (e: { id: string; title: string; artist: string; thumbnail: string }) => toTrack(e),
      )
      setRecent(recentTracks)

      const likedTracks = (likedRaw ?? []).map((t: { id: string; title: string; artist: string; thumbnail: string }) =>
        toTrack(t),
      )
      setLiked(likedTracks)

      const owned: HomePlaylistItem[] = []

      if (likedTracks.length > 0) {
        const likedCovers = [...new Set(likedTracks.map((t) => t.thumbnail).filter(Boolean))].slice(0, 4)
        owned.push({
          id: '__liked__',
          name: 'Liked Songs',
          subtitle: 'Your library',
          kind: 'liked',
          emoji: '❤️',
          color: '#fa2d48',
          thumbnail: likedTracks[0]?.thumbnail,
          covers: likedCovers.length > 1 ? likedCovers : undefined,
          trackCount: likedTracks.length,
        })
      }

      for (const pl of localPlaylists ?? []) {
        owned.push({
          id: pl.id,
          name: pl.name,
          subtitle: 'Your playlist',
          kind: 'local',
          emoji: pl.emoji,
          color: pl.color,
          thumbnail: pl.cover,
          covers: pl.covers,
          trackCount: pl.trackIds.length,
        })
      }

      setLibraryPlaylists(owned)

      const artists = topArtistsFromListening(historyList, likedRaw ?? [])
      const seedTracks = recentTracks.slice(0, 8).map((t: QueueTrack) => ({
        id: t.id,
        artist: t.artist,
        title: t.title,
      }))

      if (artists.length > 0 || seedTracks.length > 0) {
        const result = await window.electron?.home.getSuggestions({ artists, tracks: seedTracks })
        if (result) {
          setDiscoverPlaylists(
            result.suggestions.playlists.map((pl: SearchTrack) => ({
              id: pl.id,
              name: pl.title,
              subtitle: pl.artist || 'YouTube Music',
              kind: 'discover' as const,
              thumbnail: pl.thumbnail,
              trackCount: 0,
            })),
          )
          setSuggestedSongs(
            result.suggestions.songs.filter((t: SearchTrack) => !hidden.has(t.id)).map(toTrack),
          )
        }
      } else {
        setDiscoverPlaylists([])
        setSuggestedSongs([])
      }

      if (historyList.length > 0 || (likedRaw?.length ?? 0) > 0 || seedTracks.length > 0) {
        const smartResult = await window.electron?.home.getSmartPlaylists({ artists, tracks: seedTracks })
        if (smartResult?.playlists.length) {
          const trackMap = new Map<string, QueueTrack[]>()
          const metaMap = new Map<string, SmartPlaylist>()
          const cards = smartResult.playlists.map((pl, index) => {
            trackMap.set(pl.id, pl.tracks.map(toTrack))
            metaMap.set(pl.id, pl)
            return smartPlaylistToCard(pl, index)
          })
          smartTracksRef.current = trackMap
          smartMetaRef.current = metaMap
          setSmartPlaylists(cards)
        } else {
          smartTracksRef.current = new Map()
          smartMetaRef.current = new Map()
          setSmartPlaylists([])
        }
      } else {
        smartTracksRef.current = new Map()
        smartMetaRef.current = new Map()
        setSmartPlaylists([])
      }
    } finally {
      setLoading(false)
      setSuggestionsLoading(false)
      setSmartPlaylistsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (currentView !== 'home') return
    void loadHome()
  }, [currentView, loadHome])

  useEffect(() => {
    const refresh = () => {
      if (useAppStore.getState().currentView === 'home') void loadHome()
    }
    window.addEventListener('pmusic:playlists-changed', refresh)
    window.addEventListener('pmusic:playlist-deleted', refresh)
    window.addEventListener('pmusic:library-changed', refresh)
    return () => {
      window.removeEventListener('pmusic:playlists-changed', refresh)
      window.removeEventListener('pmusic:playlist-deleted', refresh)
      window.removeEventListener('pmusic:library-changed', refresh)
    }
  }, [loadHome])

  const playPlaylist = (item: HomePlaylistItem) => {
    switch (item.kind) {
      case 'liked':
        if (liked.length) playQueue(liked, 0)
        break
      case 'local':
        void playLocalPlaylist(item.id)
        break
      case 'discover':
        void playDiscoverPlaylist(item.id)
        break
      case 'smart': {
        const tracks = smartTracksRef.current.get(item.id)
        if (tracks?.length) playQueue(tracks, 0)
        break
      }
    }
  }

  const browseSmartPlaylist = (item: HomePlaylistItem) => {
    const tracks = smartTracksRef.current.get(item.id)
    if (!tracks?.length) return
    setCatalogDetail({
      kind: 'tracklist',
      title: item.name,
      subtitle: item.subtitle,
      thumbnail: item.thumbnail,
      tracks,
    })
  }

  const saveSmartPlaylist = async (item: HomePlaylistItem) => {
    const tracks = smartTracksRef.current.get(item.id)
    const meta = smartMetaRef.current.get(item.id)
    if (!tracks?.length || !window.electron) return
    const stored: StoredTrack[] = tracks.map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      thumbnail: t.thumbnail,
      duration: t.duration,
    }))
    const pl = await window.electron.library.createPlaylistFromTracks({
      name: item.name,
      emoji: meta?.emoji ?? item.emoji ?? '✨',
      color: item.color,
      description: meta?.description ?? item.subtitle,
      tracks: stored,
    })
    window.dispatchEvent(new CustomEvent('pmusic:playlists-changed', { detail: { id: pl.id } }))
  }

  const resumeContinueListening = () => {
    if (!continueSession?.queue.length) return
    restorePlayback(
      continueSession.queue.map(toTrack),
      continueSession.currentIndex,
      continueSession.currentTime,
      continueSession.isPlaying,
    )
  }

  const continueTrack = continueSession?.queue[continueSession.currentIndex]

  const hasDiscover = discoverPlaylists.length > 0 || suggestedSongs.length > 0
  const hasSmartPlaylists = smartPlaylists.length > 0
  const isEmpty =
    !loading &&
    recent.length === 0 &&
    libraryPlaylists.length === 0 &&
    !hasDiscover &&
    !hasSmartPlaylists

  return (
    <div className="h-full overflow-y-auto">
      <Appear className="am-view-header px-8 pb-6 pt-6">
        <h1 className="section-title">Listen Now</h1>
        <p className="section-subtitle">
          Based on what you play — your library and similar picks from YouTube Music
        </p>
      </Appear>

      <div className="space-y-10 px-8 pb-10">
        {continueTrack && (
          <Appear>
            <section
              className="relative overflow-hidden rounded-2xl p-6"
              style={{
                background: 'linear-gradient(135deg, rgba(250,45,72,0.25), rgba(10,132,255,0.12))',
              }}
            >
              <p className="mb-1 text-xs font-semibold tracking-wider text-fg-muted uppercase">
                Continue listening
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <ArtworkImage
                  videoId={continueTrack.id}
                  thumbnail={continueTrack.thumbnail}
                  alt=""
                  className="h-20 w-20 shrink-0 rounded-xl object-cover shadow-lg ring-1 ring-white/15"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xl font-bold text-fg">{continueTrack.title}</p>
                  <p className="truncate text-sm text-fg-secondary">{continueTrack.artist}</p>
                </div>
                <button
                  type="button"
                  onClick={resumeContinueListening}
                  className="flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
                >
                  <Play size={16} fill="currentColor" />
                  Resume
                </button>
              </div>
            </section>
          </Appear>
        )}

        {loading && isEmpty && (
          <Appear delay={0.06}>
            <p className="text-fg-muted">Loading your music…</p>
          </Appear>
        )}

        {isEmpty && !loading && (
          <Appear>
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <Heart size={44} className="text-fg-muted opacity-40" />
              <div>
                <p className="font-medium text-fg">Nothing here yet</p>
                <p className="mt-1 max-w-sm text-sm text-fg-muted">
                  Play some music and Home will fill with your recent listens and similar playlists.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setView('search')}
                className="flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                <Search size={16} />
                Find music
              </button>
            </div>
          </Appear>
        )}

        {recent.length > 0 && (
          <Appear>
            <section>
              <h2 className="mb-4 text-2xl font-bold tracking-tight text-fg">Recently played</h2>
              <div className="home-recent-scroll -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
                {recent.slice(0, 16).map((track) => (
                  <div key={track.id} className="w-[160px] shrink-0">
                    <AlbumCard
                      track={track}
                      size="md"
                      onPlay={() => playTrack(track)}
                      onContextMenu={(e) => ctx.openMenu(e, track, 'recent')}
                    />
                  </div>
                ))}
              </div>
            </section>
          </Appear>
        )}

        {libraryPlaylists.length > 0 && (
          <Appear delay={0.04}>
            <section>
              <h2 className="mb-4 text-2xl font-bold tracking-tight text-fg">Your library</h2>
              <Stagger className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-5" fast>
                {libraryPlaylists.map((pl) => (
                  <StaggerItem key={`lib-${pl.kind}-${pl.id}`}>
                    <PlaylistCard playlist={pl} onPlay={() => playPlaylist(pl)} />
                  </StaggerItem>
                ))}
              </Stagger>
            </section>
          </Appear>
        )}

        {(suggestionsLoading || hasDiscover) && (
          <Appear delay={0.06}>
            <section>
              <div className="mb-4 flex items-center gap-2">
                <Sparkles size={22} className="text-[var(--accent)]" />
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-fg">Recommended for you</h2>
                  <p className="text-sm text-fg-muted">Playlists and songs similar to your taste</p>
                </div>
              </div>

              {suggestionsLoading && !hasDiscover && (
                <p className="text-sm text-fg-muted">Finding playlists you might like…</p>
              )}

              {discoverPlaylists.length > 0 && (
                <Stagger className="mb-8 grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-5" fast>
                  {discoverPlaylists.map((pl) => (
                    <StaggerItem key={`discover-${pl.id}`}>
                      <PlaylistCard playlist={pl} onPlay={() => playPlaylist(pl)} />
                    </StaggerItem>
                  ))}
                </Stagger>
              )}

              {suggestedSongs.length > 0 && (
                <>
                  <h3 className="mb-3 text-lg font-semibold text-fg">Similar songs</h3>
                  <Stagger className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-5" fast>
                    {suggestedSongs.map((track) => (
                      <StaggerItem key={`song-${track.id}`}>
                        <AlbumCard
                          track={track}
                          size="md"
                          onPlay={() => playTrack(track)}
                          onContextMenu={(e) => ctx.openMenu(e, track, 'similar')}
                        />
                      </StaggerItem>
                    ))}
                  </Stagger>
                </>
              )}
            </section>
          </Appear>
        )}

        {(smartPlaylistsLoading || hasSmartPlaylists || (hasListeningHistory && !smartPlaylistsLoading)) && (
          <Appear delay={0.08}>
            <section>
              <div className="mb-4 flex items-center gap-2">
                <ListMusic size={22} className="text-[var(--accent)]" />
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-fg">Smart playlists</h2>
                  <p className="text-sm text-fg-muted">
                    Automatically created from what you listen to and like
                  </p>
                </div>
              </div>

              {smartPlaylistsLoading && !hasSmartPlaylists && (
                <p className="text-sm text-fg-muted">Building your playlists…</p>
              )}

              {!smartPlaylistsLoading && !hasSmartPlaylists && hasListeningHistory && (
                <p className="text-sm text-fg-muted">
                  Keep listening — smart playlists appear once you have enough history and likes.
                </p>
              )}

              {hasSmartPlaylists && (
                <Stagger className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-5" fast>
                  {smartPlaylists.map((pl) => (
                    <StaggerItem key={`smart-${pl.id}`}>
                      <PlaylistCard
                        playlist={pl}
                        onPlay={() => playPlaylist(pl)}
                        onBrowse={() => browseSmartPlaylist(pl)}
                        onSave={() => void saveSmartPlaylist(pl)}
                      />
                    </StaggerItem>
                  ))}
                </Stagger>
              )}
            </section>
          </Appear>
        )}
      </div>

      <GlassContextMenu
        open={!!ctx.menu}
        x={ctx.position.x}
        y={ctx.position.y}
        onClose={ctx.closeMenu}
        items={ctx.items}
      />
    </div>
  )
}
