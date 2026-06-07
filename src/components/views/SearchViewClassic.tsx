import { useMemo } from 'react'
import { Search, Loader2, User, Disc3, ListMusic, Mic2, Radio } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useSearch } from '@/hooks/useSearch'
import { useAppStore } from '@/store/appStore'
import { usePlayerStore } from '@/store/playerStore'
import { useCatalogStore } from '@/store/catalogStore'
import { TrackRow } from '@/components/ui/TrackRow'
import { AlbumCard } from '@/components/ui/AlbumCard'
import { Appear, PopIn, Stagger, StaggerItem } from '@/components/ui/motion'
import { GlassContextMenu } from '@/components/ui/GlassContextMenu'
import { useTrackContextMenu } from '@/hooks/useTrackContextMenu'
import { useSettingsStore } from '@/store/settingsStore'
import type { SearchTrack } from '../../../electron/preload'
import { openCatalogItem, toQueueTrack } from '@/components/search/searchUtils'

export function SearchViewClassic() {
  const searchQuery = useAppStore((s) => s.searchQuery)
  const searchMode = useAppStore((s) => s.searchMode)
  const setSearchMode = useAppStore((s) => s.setSearchMode)
  const searchDebounceMs = useSettingsStore((s) => s.settings.searchDebounceMs)
  const { data, isLoading, isFetching, isError, error } = useSearch(searchQuery, {
    debounceMs: searchDebounceMs,
    mode: searchMode,
  })
  const playTrack = usePlayerStore((s) => s.playTrack)
  const addToQueue = usePlayerStore((s) => s.addToQueue)
  const setCatalogDetail = useCatalogStore((s) => s.setCatalogDetail)
  const ctx = useTrackContextMenu()

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

  const hasQuery = searchQuery.trim().length > 0
  const showMusic = searchMode === 'music' || searchMode === 'all'
  const showPodcasts = searchMode === 'podcasts' || searchMode === 'all'

  const showResults = hasQuery && data && (
    (showMusic &&
      (allSongs.length > 0 ||
        (data.topResult && data.topResult.type !== 'podcast') ||
        (data.artists?.length ?? 0) > 0 ||
        (data.albums?.length ?? 0) > 0 ||
        (data.playlists?.length ?? 0) > 0)) ||
    (showPodcasts &&
      (allPodcasts.length > 0 ||
        (data.topResult?.type === 'podcast') ||
        (data.podcastShows?.length ?? 0) > 0))
  )

  const openCatalog = (item: SearchTrack) => openCatalogItem(item, setCatalogDetail)

  const modeLabel = searchMode === 'music' ? 'Music' : searchMode === 'podcasts' ? 'Podcasts' : 'All'

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-white/5 px-4 py-2 sm:hidden">
        <div className="flex rounded-lg bg-[var(--surface-hover)] p-0.5" role="tablist" aria-label="Search category">
          {(['music', 'podcasts', 'all'] as const).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={searchMode === id}
              onClick={() => setSearchMode(id)}
              className={cn(
                'flex-1 rounded-md py-1.5 text-xs font-semibold capitalize transition-colors',
                searchMode === id ? 'bg-[var(--accent)] text-white' : 'text-fg-secondary',
              )}
            >
              {id === 'all' ? 'All' : id}
            </button>
          ))}
        </div>
      </div>

      {hasQuery && (
        <Appear className="am-view-header shrink-0 px-6 py-4 sm:px-8">
          <div className="relative z-[1] flex items-center gap-3">
            <h1 className="section-title truncate">{searchQuery.trim()}</h1>
            {(isLoading || isFetching) && (
              <Loader2 size={18} className="animate-spin text-fg-muted" aria-label="Searching" />
            )}
          </div>
          <p className="section-subtitle relative z-[1]">{modeLabel}</p>
        </Appear>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-10 sm:px-8">
        {!hasQuery && (
          <PopIn className="flex min-h-[40vh] flex-col items-center justify-center text-center">
            <Search size={48} className="mb-4 text-fg-muted" strokeWidth={1} />
            <p className="text-base text-fg-muted">Find songs, artists, and albums</p>
            <p className="mt-2 text-sm text-fg-muted">Start typing in the search bar above</p>
          </PopIn>
        )}

        {hasQuery && isLoading && !data && (
          <p className="py-8 text-center text-sm text-fg-muted">Searching…</p>
        )}

        {isError && hasQuery && (
          <p className="py-8 text-center text-sm text-red-400/90">
            {error instanceof Error ? error.message : 'Search failed'}
          </p>
        )}

        {hasQuery && !isLoading && !isError && !showResults && (
          <p className="py-12 text-center text-fg-muted">No results for &ldquo;{searchQuery}&rdquo;</p>
        )}

        {showResults && data?.topResult && (() => {
          const top = toQueueTrack(data.topResult)
          const isPodcastTop = data.topResult.type === 'podcast'
          if (isPodcastTop && !showPodcasts) return null
          if (!isPodcastTop && !showMusic) return null
          return (
            <Appear delay={0.04} className="mb-8">
              <section>
                <h2 className="mb-3 text-[11px] font-semibold tracking-[0.12em] text-fg-muted uppercase">
                  Top Result
                </h2>
                <TrackRow
                  track={top}
                  onPlay={() => playTrack(top)}
                  onQueue={() => addToQueue(top)}
                  onContextMenu={ctx.openMenu}
                />
              </section>
            </Appear>
          )
        })()}

        {showResults && showPodcasts && allPodcasts.length > 0 && (
          <Appear delay={0.06}>
            <section className={showMusic && allSongs.length > 0 ? 'mb-8' : ''}>
              <h2 className="mb-3 flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] text-fg-muted uppercase">
                <Mic2 size={12} /> Podcast episodes
              </h2>
              <Stagger className="grid grid-cols-1 gap-0.5 xl:grid-cols-2" fast key={`${searchQuery}-podcasts`}>
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
            </section>
          </Appear>
        )}

        {showResults && showPodcasts && (data?.podcastShows?.length ?? 0) > 0 && (
          <Appear delay={0.08} className="mt-8">
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] text-fg-muted uppercase">
                <Radio size={12} /> Podcast shows
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {data!.podcastShows!.map((show) => (
                  <AlbumCard key={show.id} track={toQueueTrack(show)} onPlay={() => openCatalog(show)} />
                ))}
              </div>
            </section>
          </Appear>
        )}

        {showResults && showMusic && allSongs.length > 0 && (
          <Appear delay={0.08}>
            <section>
              <h2 className="mb-3 text-[11px] font-semibold tracking-[0.12em] text-fg-muted uppercase">Songs</h2>
              <Stagger className="grid grid-cols-1 gap-0.5 xl:grid-cols-2" fast key={searchQuery}>
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
            </section>
          </Appear>
        )}

        {showResults && showMusic && (data?.artists?.length ?? 0) > 0 && (
          <Appear delay={0.1} className="mt-8">
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] text-fg-muted uppercase">
                <User size={12} /> Artists
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {data!.artists.map((artist) => (
                  <AlbumCard key={artist.id} track={toQueueTrack(artist)} onPlay={() => openCatalog(artist)} />
                ))}
              </div>
            </section>
          </Appear>
        )}

        {showResults && showMusic && (data?.albums?.length ?? 0) > 0 && (
          <Appear delay={0.12} className="mt-8">
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] text-fg-muted uppercase">
                <Disc3 size={12} /> Albums
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {data!.albums.map((album) => (
                  <AlbumCard key={album.id} track={toQueueTrack(album)} onPlay={() => openCatalog(album)} />
                ))}
              </div>
            </section>
          </Appear>
        )}

        {showResults && showMusic && (data?.playlists?.length ?? 0) > 0 && (
          <Appear delay={0.14} className="mt-8">
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] text-fg-muted uppercase">
                <ListMusic size={12} /> Playlists
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {data!.playlists.map((pl) => (
                  <AlbumCard key={pl.id} track={toQueueTrack(pl)} onPlay={() => openCatalog(pl)} />
                ))}
              </div>
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
