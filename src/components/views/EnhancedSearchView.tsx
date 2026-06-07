import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Loader2,
  User,
  Disc3,
  ListMusic,
  Mic2,
  Radio,
  Play,
  ListPlus,
  Sparkles,
  Search,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useSearch } from '@/hooks/useSearch'
import { useAppStore, type SearchMode } from '@/store/appStore'
import { usePlayerStore } from '@/store/playerStore'
import { useCatalogStore } from '@/store/catalogStore'
import { TrackRow } from '@/components/ui/TrackRow'
import { AlbumCard } from '@/components/ui/AlbumCard'
import { ArtworkImage } from '@/components/ui/ArtworkImage'
import { Appear, Stagger, StaggerItem } from '@/components/ui/motion'
import { GlassContextMenu } from '@/components/ui/GlassContextMenu'
import { useTrackContextMenu } from '@/hooks/useTrackContextMenu'
import { useSettingsStore } from '@/store/settingsStore'
import type { SearchTrack } from '../../../electron/preload'
import { openCatalogItem, toQueueTrack } from '@/components/search/searchUtils'
import { getRecentSearches, pushRecentSearch, clearRecentSearches } from '@/lib/recentSearches'
import { EnhancedSearchEmpty } from '@/components/search/EnhancedSearchEmpty'

type ResultFilter = 'all' | 'songs' | 'artists' | 'albums' | 'playlists' | 'podcasts'

const FILTER_TABS: { id: ResultFilter; label: string; icon: typeof Sparkles; mode: SearchMode }[] = [
  { id: 'all', label: 'All', icon: Sparkles, mode: 'all' },
  { id: 'songs', label: 'Songs', icon: Play, mode: 'music' },
  { id: 'artists', label: 'Artists', icon: User, mode: 'music' },
  { id: 'albums', label: 'Albums', icon: Disc3, mode: 'music' },
  { id: 'playlists', label: 'Playlists', icon: ListMusic, mode: 'music' },
  { id: 'podcasts', label: 'Podcasts', icon: Mic2, mode: 'podcasts' },
]

function filterToMode(filter: ResultFilter): SearchMode {
  if (filter === 'podcasts') return 'podcasts'
  if (filter === 'all') return 'all'
  return 'music'
}

export function EnhancedSearchView() {
  const searchQuery = useAppStore((s) => s.searchQuery)
  const [filter, setFilter] = useState<ResultFilter>('all')
  const searchDebounceMs = useSettingsStore((s) => s.settings.searchDebounceMs)
  const { data, isLoading, isFetching, isError, error } = useSearch(searchQuery, {
    debounceMs: searchDebounceMs,
    mode: filterToMode(filter),
  })
  const playTrack = usePlayerStore((s) => s.playTrack)
  const addToQueue = usePlayerStore((s) => s.addToQueue)
  const setCatalogDetail = useCatalogStore((s) => s.setCatalogDetail)
  const setSearchQuery = useAppStore((s) => s.setSearchQuery)
  const ctx = useTrackContextMenu()
  const [recent, setRecent] = useState<string[]>(() => getRecentSearches())

  const trimmed = searchQuery.trim()
  const hasQuery = trimmed.length > 0

  useEffect(() => {
    if (!hasQuery || isLoading || isFetching || !data) return
    setRecent(pushRecentSearch(trimmed))
  }, [trimmed, hasQuery, isLoading, isFetching, data])

  const allSongs = useMemo(() => {
    const songs = data?.songs ?? []
    const topId = data?.topResult?.id
    const topIsSong = data?.topResult?.type === 'song' || data?.topResult?.type === 'podcast'
    return topId && topIsSong ? songs.filter((s) => s.id !== topId) : songs
  }, [data?.songs, data?.topResult?.id, data?.topResult?.type])

  const allPodcasts = useMemo(() => {
    const episodes = data?.podcasts ?? []
    const topId = data?.topResult?.id
    const topIsPodcast = data?.topResult?.type === 'podcast'
    return topId && topIsPodcast ? episodes.filter((s) => s.id !== topId) : episodes
  }, [data?.podcasts, data?.topResult?.id, data?.topResult?.type])

  const showSongs = filter === 'all' || filter === 'songs'
  const showArtists = filter === 'all' || filter === 'artists'
  const showAlbums = filter === 'all' || filter === 'albums'
  const showPlaylists = filter === 'all' || filter === 'playlists'
  const showPodcasts = filter === 'all' || filter === 'podcasts'

  const resultCount = useMemo(() => {
    if (!data) return 0
    let n = 0
    if (showSongs) n += allSongs.length + (data.topResult?.type === 'song' ? 1 : 0)
    if (showArtists) n += data.artists?.length ?? 0
    if (showAlbums) n += data.albums?.length ?? 0
    if (showPlaylists) n += data.playlists?.length ?? 0
    if (showPodcasts) {
      n += allPodcasts.length + (data.topResult?.type === 'podcast' ? 1 : 0)
      n += data.podcastShows?.length ?? 0
    }
    return n
  }, [data, allSongs.length, allPodcasts.length, showSongs, showArtists, showAlbums, showPlaylists, showPodcasts])

  const showResults = hasQuery && data && resultCount > 0
  const openCatalog = (item: SearchTrack) => openCatalogItem(item, setCatalogDetail)

  const topResult = data?.topResult
  const topTrack = topResult ? toQueueTrack(topResult) : null
  const showTopHero =
    topTrack &&
    topResult &&
    (filter === 'all' ||
      (filter === 'songs' && (topResult.type === 'song' || topResult.type === 'podcast')) ||
      (filter === 'artists' && topResult.type === 'artist') ||
      (filter === 'albums' && topResult.type === 'album') ||
      (filter === 'playlists' && topResult.type === 'playlist') ||
      (filter === 'podcasts' && topResult.type === 'podcast'))

  return (
    <div className="enhanced-search-layout flex h-full min-h-0 w-full min-w-0 flex-col">
      {!hasQuery ? (
        <Appear className="am-view-header enhanced-search-page-header shrink-0 px-3 pb-4 pt-3 sm:px-4 sm:pb-5 sm:pt-4 md:px-6">
          <div className="relative z-[1] flex items-center gap-3 sm:gap-4">
            <div className="enhanced-search-page-icon flex h-11 w-11 shrink-0 items-center justify-center sm:h-12 sm:w-12">
              <Search size={22} strokeWidth={2} className="text-[var(--accent)]" aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="section-title">Search</h1>
              <p className="section-subtitle">Your history, suggestions, and more</p>
            </div>
          </div>
        </Appear>
      ) : (
        <Appear className="am-view-header enhanced-search-page-header shrink-0 px-3 pb-4 pt-3 sm:px-4 sm:pb-5 sm:pt-4 md:px-6">
          <div className="relative z-[1] flex items-end justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold tracking-[0.12em] text-fg-muted uppercase">Results for</p>
              <h1 className="section-title truncate">{trimmed}</h1>
            </div>
            <div className="flex shrink-0 items-center gap-2 pb-1 text-xs text-fg-muted">
              {isLoading || isFetching ? (
                <>
                  <Loader2 size={14} className="animate-spin text-[var(--accent)]" aria-hidden />
                  <span>Searching…</span>
                </>
              ) : (
                <span>
                  {showResults
                    ? `${resultCount} result${resultCount === 1 ? '' : 's'}`
                    : 'No matches'}
                </span>
              )}
            </div>
          </div>
        </Appear>
      )}

      <div className="enhanced-search-toolbar shrink-0 px-3 pb-3 pt-0 sm:px-4 md:px-6">
        <div
          className="enhanced-search-filters flex flex-wrap gap-1.5 sm:gap-2"
          role="tablist"
          aria-label="Filter search results"
        >
          {FILTER_TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={filter === tab.id}
                aria-label={tab.label}
                onClick={() => setFilter(tab.id)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:px-3.5 sm:py-2',
                  filter === tab.id
                    ? 'bg-[var(--accent)] text-white shadow-md shadow-[var(--accent)]/20'
                    : 'bg-white/8 text-fg-secondary hover:bg-white/12 hover:text-fg',
                )}
              >
                <Icon size={13} aria-hidden />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="min-h-0 w-full min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-10 sm:px-4 md:px-6">
        {!hasQuery && (
          <EnhancedSearchEmpty
            recentQueries={recent}
            onQuery={setSearchQuery}
            onClearRecent={() => {
              clearRecentSearches()
              setRecent([])
            }}
          />
        )}

        {hasQuery && isLoading && !data && (
          <div className="space-y-3 py-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="enhanced-search-skeleton h-14 rounded-xl" />
            ))}
          </div>
        )}

        {isError && hasQuery && (
          <div className="rounded-2xl border border-red-400/25 bg-red-500/10 px-5 py-8 text-center">
            <p className="text-sm text-red-300">
              {error instanceof Error ? error.message : 'Search failed — check your connection and try again.'}
            </p>
          </div>
        )}

        {hasQuery && !isLoading && !isError && !showResults && (
          <div className="py-20 text-center">
            <p className="text-fg-muted">No results for &ldquo;{trimmed}&rdquo;</p>
          </div>
        )}

        {showResults && showTopHero && topTrack && topResult && (
          <Appear delay={0.03} className="mb-8">
            <section aria-label="Top result">
              <div className="enhanced-search-hero glass flex flex-col gap-4 rounded-2xl p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
                <ArtworkImage
                  videoId={topTrack.id}
                  thumbnail={topTrack.thumbnail}
                  priority="high"
                  className="mx-auto h-28 w-28 shrink-0 rounded-2xl object-cover shadow-xl ring-1 ring-white/15 sm:mx-0 sm:h-32 sm:w-32 md:h-36 md:w-36"
                />
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <p className="text-[11px] font-semibold tracking-[0.14em] text-[var(--accent)] uppercase">
                    Top result
                  </p>
                  <h2 className="mt-1 line-clamp-2 text-xl font-bold text-fg sm:truncate sm:text-2xl">{topTrack.title}</h2>
                  <p className="truncate text-sm text-fg-secondary">{topTrack.artist}</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                    {(topResult.type === 'song' || topResult.type === 'podcast') && (
                      <>
                        <button
                          type="button"
                          onClick={() => playTrack(topTrack)}
                          className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
                        >
                          <Play size={16} fill="currentColor" />
                          Play
                        </button>
                        <button
                          type="button"
                          onClick={() => addToQueue(topTrack)}
                          className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-sm font-medium hover:bg-white/15"
                        >
                          <ListPlus size={16} />
                          Queue
                        </button>
                      </>
                    )}
                    {(topResult.type === 'artist' ||
                      topResult.type === 'album' ||
                      topResult.type === 'playlist') && (
                      <button
                        type="button"
                        onClick={() => openCatalog(topResult)}
                        className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
                      >
                        Open
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </Appear>
        )}

        {showResults && showPodcasts && allPodcasts.length > 0 && (
          <Appear delay={0.05}>
            <SearchSection title="Podcast episodes" icon={Mic2} count={allPodcasts.length}>
              <Stagger className="grid grid-cols-1 gap-1 md:grid-cols-2" fast>
                {allPodcasts.map((ep, i) => {
                  const track = toQueueTrack(ep)
                  return (
                    <StaggerItem key={ep.id}>
                      <TrackRow
                        track={track}
                        index={i + 1}
                        onPlay={() => playTrack(track)}
                        onQueue={() => addToQueue(track)}
                        onContextMenu={ctx.openMenu}
                      />
                    </StaggerItem>
                  )
                })}
              </Stagger>
            </SearchSection>
          </Appear>
        )}

        {showResults && showPodcasts && (data?.podcastShows?.length ?? 0) > 0 && (
          <Appear delay={0.06}>
            <SearchSection title="Podcast shows" icon={Radio} count={data!.podcastShows!.length}>
              <ResponsiveCardGrid>
                {data!.podcastShows!.map((show) => (
                  <AlbumCard key={show.id} track={toQueueTrack(show)} onPlay={() => openCatalog(show)} />
                ))}
              </ResponsiveCardGrid>
            </SearchSection>
          </Appear>
        )}

        {showResults && showSongs && allSongs.length > 0 && (
          <Appear delay={0.07}>
            <SearchSection title="Songs" count={allSongs.length}>
              <Stagger className="grid grid-cols-1 gap-1 md:grid-cols-2" fast>
                {allSongs.map((song, i) => {
                  const track = toQueueTrack(song)
                  return (
                    <StaggerItem key={song.id}>
                      <TrackRow
                        track={track}
                        index={i + 1}
                        onPlay={() => playTrack(track)}
                        onQueue={() => addToQueue(track)}
                        onContextMenu={ctx.openMenu}
                      />
                    </StaggerItem>
                  )
                })}
              </Stagger>
            </SearchSection>
          </Appear>
        )}

        {showResults && showArtists && (data?.artists?.length ?? 0) > 0 && (
          <Appear delay={0.08}>
            <SearchSection title="Artists" icon={User} count={data!.artists!.length}>
              <ResponsiveCardGrid>
                {data!.artists.map((artist) => (
                  <AlbumCard key={artist.id} track={toQueueTrack(artist)} onPlay={() => openCatalog(artist)} />
                ))}
              </ResponsiveCardGrid>
            </SearchSection>
          </Appear>
        )}

        {showResults && showAlbums && (data?.albums?.length ?? 0) > 0 && (
          <Appear delay={0.09}>
            <SearchSection title="Albums" icon={Disc3} count={data!.albums!.length}>
              <ResponsiveCardGrid>
                {data!.albums.map((album) => (
                  <AlbumCard key={album.id} track={toQueueTrack(album)} onPlay={() => openCatalog(album)} />
                ))}
              </ResponsiveCardGrid>
            </SearchSection>
          </Appear>
        )}

        {showResults && showPlaylists && (data?.playlists?.length ?? 0) > 0 && (
          <Appear delay={0.1}>
            <SearchSection title="Playlists" icon={ListMusic} count={data!.playlists!.length}>
              <ResponsiveCardGrid>
                {data!.playlists.map((pl) => (
                  <AlbumCard key={pl.id} track={toQueueTrack(pl)} onPlay={() => openCatalog(pl)} />
                ))}
              </ResponsiveCardGrid>
            </SearchSection>
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

function SearchSection({
  title,
  icon: Icon,
  count,
  children,
}: {
  title: string
  icon?: typeof User
  count: number
  children: ReactNode
}) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center gap-2">
        {Icon && <Icon size={14} className="text-[var(--accent)]" />}
        <h2 className="text-sm font-semibold text-fg">{title}</h2>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium tabular-nums text-fg-muted">
          {count}
        </span>
      </div>
      {children}
    </section>
  )
}

function ResponsiveCardGrid({ children }: { children: ReactNode }) {
  return (
    <div className="enhanced-search-card-grid grid grid-cols-[repeat(auto-fill,minmax(min(100%,9.5rem),1fr))] gap-4 sm:grid-cols-[repeat(auto-fill,minmax(min(100%,10rem),1fr))] sm:gap-5 md:grid-cols-[repeat(auto-fill,minmax(min(100%,11rem),1fr))]">
      {children}
    </div>
  )
}
