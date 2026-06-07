import { useEffect, useState } from 'react'
import { Users, ChevronRight, Play } from 'lucide-react'
import { Appear, Stagger, StaggerItem } from '@/components/ui/motion'
import { TrackRow } from '@/components/ui/TrackRow'
import { GlassContextMenu } from '@/components/ui/GlassContextMenu'
import { useTrackContextMenu } from '@/hooks/useTrackContextMenu'
import { useAppStore } from '@/store/appStore'
import { usePlayerStore } from '@/store/playerStore'
import { useCatalogStore } from '@/store/catalogStore'
import { cn } from '@/lib/cn'
import type { ArtistSummary } from '../../../electron/preload'

export function ArtistsView() {
  const currentView = useAppStore((s) => s.currentView)
  const playQueue = usePlayerStore((s) => s.playQueue)
  const setCatalogDetail = useCatalogStore((s) => s.setCatalogDetail)
  const [artists, setArtists] = useState<ArtistSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const ctx = useTrackContextMenu()

  useEffect(() => {
    if (currentView !== 'artists') return
    const load = () => {
      setLoading(true)
      void window.electron?.library.getArtists().then((list) => {
        setArtists(list ?? [])
        setLoading(false)
      })
    }
    load()
    window.addEventListener('pmusic:library-changed', load)
    return () => window.removeEventListener('pmusic:library-changed', load)
  }, [currentView])

  const selectedArtist = artists.find((a) => a.name === selected)

  return (
    <div className="flex h-full overflow-hidden">
      <div className="glass-inset-subtle w-80 shrink-0 overflow-y-auto p-6">
        <Appear className="mb-6">
          <h1 className="text-2xl font-bold">Artists</h1>
          <p className="mt-1 text-sm text-fg-muted">From your history, likes, and playlists</p>
        </Appear>

        {loading && (
          <p className="text-sm text-fg-muted">Loading artists…</p>
        )}

        {!loading && artists.length === 0 && (
          <p className="text-sm text-fg-muted">
            Play and like some music to build your artist list.
          </p>
        )}

        <Stagger fast>
          {artists.map((artist) => (
            <StaggerItem key={artist.name}>
              <button
                type="button"
                onClick={() => setSelected(artist.name)}
                className={cn(
                  'mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                  selected === artist.name ? 'bg-[var(--surface-active)]' : 'hover:bg-[var(--surface-hover)]',
                )}
              >
                {artist.thumbnail ? (
                  <img
                    src={artist.thumbnail}
                    alt=""
                    className="h-11 w-11 shrink-0 rounded-full object-cover ring-1 ring-white/10"
                  />
                ) : (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--surface-active)] text-[var(--accent)]">
                    <Users size={18} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-fg">{artist.name}</p>
                  <p className="text-xs text-fg-muted">
                    {artist.trackCount} {artist.trackCount === 1 ? 'track' : 'tracks'}
                    {artist.playCount > 0 && ` · ${artist.playCount} plays`}
                  </p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-fg-muted" />
              </button>
            </StaggerItem>
          ))}
        </Stagger>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {!selectedArtist ? (
          <Appear>
            <div className="flex flex-col items-center justify-center gap-4 py-24 text-center text-fg-muted">
              <Users size={48} className="opacity-40" />
              <p>Select an artist to see their tracks</p>
            </div>
          </Appear>
        ) : (
          <>
            <Appear className="mb-8 flex items-end gap-6">
              {selectedArtist.thumbnail ? (
                <img
                  src={selectedArtist.thumbnail}
                  alt=""
                  className="h-32 w-32 shrink-0 rounded-full object-cover shadow-xl ring-1 ring-white/15"
                />
              ) : (
                <span className="flex h-32 w-32 items-center justify-center rounded-full bg-[var(--surface-active)] text-4xl text-[var(--accent)]">
                  <Users size={48} />
                </span>
              )}
              <div className="flex-1">
                <h2 className="text-4xl font-bold">{selectedArtist.name}</h2>
                <p className="mt-1 text-fg-secondary">
                  {selectedArtist.trackCount} tracks
                  {selectedArtist.playCount > 0 && ` · ${selectedArtist.playCount} plays in history`}
                </p>
                {selectedArtist.tracks.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => playQueue(selectedArtist.tracks, 0)}
                      className="flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
                    >
                      <Play size={14} fill="currentColor" />
                      Play all
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const results = await window.electron?.search.query(selectedArtist.name)
                        const match = results?.artists.find(
                          (a) => a.title.toLowerCase() === selectedArtist.name.toLowerCase(),
                        ) ?? results?.artists[0]
                        if (match) {
                          setCatalogDetail({
                            kind: 'artist',
                            id: match.id,
                            name: match.title,
                            thumbnail: match.thumbnail,
                          })
                        }
                      }}
                      className="rounded-full bg-white/10 px-5 py-2 text-sm font-medium hover:bg-white/15"
                    >
                      Explore catalog
                    </button>
                  </div>
                )}
              </div>
            </Appear>

            <Stagger className="flex flex-col gap-0.5">
              {selectedArtist.tracks.map((track, i) => (
                <StaggerItem key={track.id}>
                  <TrackRow
                    track={track}
                    index={i + 1}
                    onPlay={() => playQueue(selectedArtist.tracks, i)}
                    onContextMenu={ctx.openMenu}
                  />
                </StaggerItem>
              ))}
            </Stagger>
          </>
        )}
      </div>

      <GlassContextMenu
        open={!!ctx.menu}
        x={ctx.position.x}
        y={ctx.position.y}
        items={ctx.items}
        onClose={ctx.closeMenu}
      />
    </div>
  )
}
