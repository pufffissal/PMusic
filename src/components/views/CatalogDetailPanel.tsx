import { useEffect, useState } from 'react'
import { X, Play, Shuffle, Radio } from 'lucide-react'
import { motion } from 'framer-motion'
import { useCatalogStore } from '@/store/catalogStore'
import { usePlayerStore, type QueueTrack } from '@/store/playerStore'
import { TrackRow } from '@/components/ui/TrackRow'
import { AlbumCard } from '@/components/ui/AlbumCard'
import type { SearchTrack, CatalogAlbum, CatalogArtist } from '../../../electron/preload'

function toTrack(t: SearchTrack | QueueTrack): QueueTrack {
  return {
    id: t.id,
    title: t.title,
    artist: t.artist,
    thumbnail: t.thumbnail,
    duration: 'duration' in t ? t.duration : undefined,
  }
}

export function CatalogDetailPanel() {
  const detail = useCatalogStore((s) => s.catalogDetail)
  const setDetail = useCatalogStore((s) => s.setCatalogDetail)
  const playQueue = usePlayerStore((s) => s.playQueue)

  const [album, setAlbum] = useState<CatalogAlbum | null>(null)
  const [artist, setArtist] = useState<CatalogArtist | null>(null)
  const [playlistTracks, setPlaylistTracks] = useState<SearchTrack[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!detail) {
      setAlbum(null)
      setArtist(null)
      setPlaylistTracks([])
      return
    }

    if (detail.kind === 'tracklist') {
      setAlbum(null)
      setArtist(null)
      setPlaylistTracks(
        detail.tracks.map((t) => ({
          id: t.id,
          title: t.title,
          artist: t.artist,
          thumbnail: t.thumbnail,
          duration: t.duration ?? 0,
          type: 'song' as const,
        })),
      )
      setLoading(false)
      return
    }

    setLoading(true)
    if (detail.kind === 'album') {
      void window.electron?.catalog.getAlbum(detail.id).then((a) => {
        setAlbum(a)
        setLoading(false)
      })
    } else if (detail.kind === 'artist') {
      void window.electron?.catalog.getArtist({ id: detail.id, name: detail.name }).then((a) => {
        setArtist(a)
        setLoading(false)
      })
    } else {
      void window.electron?.catalog.getPlaylistTracks(detail.id).then((tracks) => {
        setPlaylistTracks(tracks)
        setLoading(false)
      })
    }
  }, [detail])

  if (!detail) return null

  const tracks =
    detail.kind === 'album'
      ? album?.tracks ?? []
      : detail.kind === 'playlist'
        ? playlistTracks
        : artist?.topTracks ?? []

  const headerTitle =
    detail.kind === 'artist'
      ? detail.name
      : detail.kind === 'album'
        ? album?.title ?? detail.title
        : detail.kind === 'tracklist'
          ? detail.title
          : detail.title

  const headerArtist =
    detail.kind === 'artist'
      ? `${artist?.topTracks.length ?? 0} top tracks`
      : detail.kind === 'tracklist'
        ? detail.subtitle ?? `${tracks.length} songs`
        : album?.artist ?? detail.artist

  const thumbnail =
    detail.kind === 'album'
      ? album?.thumbnail ?? detail.thumbnail
      : detail.kind === 'artist'
        ? artist?.thumbnail ?? detail.thumbnail
        : detail.kind === 'tracklist'
          ? detail.thumbnail
          : detail.thumbnail

  const playAll = (shuffle = false) => {
    if (!tracks.length) return
    const queue = tracks.map(toTrack)
    playQueue(queue, shuffle ? Math.floor(Math.random() * queue.length) : 0)
    setDetail(null)
  }

  const playRadio = async () => {
    if (detail.kind !== 'artist' || !window.electron) return
    const seed = artist?.topTracks[0]
    if (!seed) return
    const radio = await window.electron.catalog.getArtistRadio({
      id: seed.id,
      name: detail.name,
    })
    if (radio.length) {
      playQueue(radio.map(toTrack), 0)
      setDetail(null)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-stretch justify-end bg-black/50 backdrop-blur-sm"
      onClick={() => setDetail(null)}
    >
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="glass flex h-full w-full max-w-lg flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center gap-3 border-b border-white/8 px-5 py-4">
          <button type="button" onClick={() => setDetail(null)} className="rounded-lg p-1.5 hover:bg-white/10">
            <X size={18} />
          </button>
          <h2 className="min-w-0 flex-1 truncate text-lg font-semibold">{headerTitle}</h2>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="mb-6 flex gap-4">
            {thumbnail ? (
              <img
                src={thumbnail}
                alt=""
                className="h-28 w-28 shrink-0 rounded-xl object-cover shadow-lg ring-1 ring-white/10"
              />
            ) : (
              <div className="h-28 w-28 shrink-0 rounded-xl bg-white/10" />
            )}
            <div className="min-w-0">
              <p className="text-sm text-fg-secondary">{headerArtist}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!tracks.length}
                  onClick={() => playAll(false)}
                  className="flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                >
                  <Play size={14} fill="currentColor" />
                  Play
                </button>
                <button
                  type="button"
                  disabled={!tracks.length}
                  onClick={() => playAll(true)}
                  className="flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15 disabled:opacity-40"
                >
                  <Shuffle size={14} />
                  Shuffle
                </button>
                {detail.kind === 'artist' && (
                  <button
                    type="button"
                    onClick={() => void playRadio()}
                    className="flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15"
                  >
                    <Radio size={14} />
                    Radio
                  </button>
                )}
              </div>
            </div>
          </div>

          {loading && <p className="text-sm text-fg-muted">Loading…</p>}

          {detail.kind === 'artist' && artist && artist.albums.length > 0 && (
            <section className="mb-6">
              <h3 className="mb-3 text-xs font-semibold tracking-wider text-fg-muted uppercase">Albums</h3>
              <div className="grid grid-cols-2 gap-3">
                {artist.albums.map((a) => (
                  <AlbumCard
                    key={a.id}
                    track={a}
                    onPlay={() =>
                      useCatalogStore.getState().setCatalogDetail({
                        kind: 'album',
                        id: a.id,
                        title: a.title,
                        artist: a.artist,
                        thumbnail: a.thumbnail,
                      })
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {!loading && tracks.length > 0 && (
            <section>
              <h3 className="mb-3 text-xs font-semibold tracking-wider text-fg-muted uppercase">Tracks</h3>
              <div className="flex flex-col gap-0.5">
                {tracks.map((track, i) => (
                  <TrackRow
                    key={`${track.id}-${i}`}
                    track={toTrack(track)}
                    index={i + 1}
                    onPlay={() => {
                      playQueue(tracks.map(toTrack), i)
                      setDetail(null)
                    }}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </motion.aside>
    </motion.div>
  )
}
