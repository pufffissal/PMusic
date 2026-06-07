import { useEffect, useState } from 'react'
import { Heart, Plus, Pencil, Trash2, Download } from 'lucide-react'
import { downloadPlaylist } from '@/store/downloadStore'
import { usePlaylistDialogStore } from '@/store/playlistDialogStore'
import { useTrackContextMenu } from '@/hooks/useTrackContextMenu'
import { GlassContextMenu } from '@/components/ui/GlassContextMenu'
import { TrackRow } from '@/components/ui/TrackRow'
import { Appear, PopIn, Stagger, StaggerItem, SlideUp } from '@/components/ui/motion'
import { usePlayerStore, type QueueTrack } from '@/store/playerStore'
import { cn } from '@/lib/cn'
import { PlaylistArt } from '@/components/ui/PlaylistArt'
import { YoutubeImportPanel } from '@/components/library/YoutubeImportPanel'
import type { Playlist, StoredTrack } from '../../../electron/preload'

const PRESET_COLORS = ['#fa2d48', '#fc3c44', '#1db954', '#0a84ff', '#bf5af2', '#ff9f0a', '#ff375f', '#64d2ff']
const PRESET_EMOJIS = ['🎵', '🔥', '💜', '🌙', '⚡', '🎸', '🎧', '✨']

type Selection = { kind: 'liked' } | { kind: 'local'; id: string }

export function LibraryView() {
  const playQueue = usePlayerStore((s) => s.playQueue)
  const [liked, setLiked] = useState<QueueTrack[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [selection, setSelection] = useState<Selection>({ kind: 'liked' })
  const [playlistTracks, setPlaylistTracks] = useState<StoredTrack[]>([])
  const [tracksLoading, setTracksLoading] = useState(false)
  const [editing, setEditing] = useState<Playlist | null>(null)
  const openCreatePlaylist = usePlaylistDialogStore((s) => s.openCreatePlaylist)
  const openDeletePlaylist = usePlaylistDialogStore((s) => s.openDeletePlaylist)
  const ctx = useTrackContextMenu()

  const loadLocal = async () => {
    const [l, p] = await Promise.all([
      window.electron?.library.getLiked(),
      window.electron?.library.getPlaylists(),
    ])
    if (l) setLiked(l.map((t) => ({ id: t.id, title: t.title, artist: t.artist, thumbnail: t.thumbnail })))
    if (p) setPlaylists(p)
  }

  useEffect(() => {
    void loadLocal()
  }, [])

  useEffect(() => {
    const onChanged = (e: Event) => {
      void loadLocal()
      const id = (e as CustomEvent<{ id?: string }>).detail?.id
      if (id) setSelection({ kind: 'local', id })
    }
    const onDeleted = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id
      if (id && selection.kind === 'local' && selection.id === id) {
        setSelection({ kind: 'liked' })
      }
      void loadLocal()
    }
    window.addEventListener('pmusic:playlists-changed', onChanged)
    window.addEventListener('pmusic:playlist-deleted', onDeleted)
    return () => {
      window.removeEventListener('pmusic:playlists-changed', onChanged)
      window.removeEventListener('pmusic:playlist-deleted', onDeleted)
    }
  }, [selection])

  useEffect(() => {
    if (selection.kind === 'liked') {
      setPlaylistTracks([])
      return
    }

    setTracksLoading(true)
    const load = async () => {
      const tracks = await window.electron?.library.getPlaylistTracks(selection.id)
      setPlaylistTracks(tracks ?? [])
      setTracksLoading(false)
    }
    void load()
  }, [selection])

  const createPlaylist = () => {
    openCreatePlaylist()
  }

  const saveEdit = async () => {
    if (!editing) return
    await window.electron?.library.updatePlaylist(editing)
    setEditing(null)
    void loadLocal()
  }

  const deletePlaylist = (id: string, name: string) => {
    openDeletePlaylist(id, name)
  }

  const selectedLocal = selection.kind === 'local' ? playlists.find((p) => p.id === selection.id) : null

  const headerTitle =
    selection.kind === 'liked' ? 'Liked Songs' : selectedLocal?.name ?? 'Playlist'

  const headerEmoji = selectedLocal?.emoji
  const headerColor = selectedLocal?.color ?? '#fa2d48'
  const headerCovers = selectedLocal?.covers
  const headerCover = selectedLocal?.cover
  const trackCount = selection.kind === 'liked' ? liked.length : playlistTracks.length

  return (
    <div className="flex h-full overflow-hidden">
      <div className="glass-inset-subtle w-80 shrink-0 overflow-y-auto p-6">
        <Appear className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Library</h1>
          <button
            type="button"
            onClick={createPlaylist}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)] text-white hover:opacity-90"
            title="New local playlist"
          >
            <Plus size={18} />
          </button>
        </Appear>

        <SlideUp delay={0.04}>
        <button
          type="button"
          onClick={() => setSelection({ kind: 'liked' })}
          className={cn(
            'mb-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left',
            selection.kind === 'liked' && 'bg-white/10',
          )}
        >
          <Heart size={18} className="text-[var(--accent)]" fill="currentColor" />
          <span className="font-medium">Liked Songs</span>
          <span className="ml-auto text-xs text-fg-muted">{liked.length}</span>
        </button>
        </SlideUp>

        <p className="mt-4 mb-2 px-1 text-xs font-semibold tracking-wider text-fg-muted uppercase">
          Your playlists
        </p>
        <YoutubeImportPanel onImported={(id) => setSelection({ kind: 'local', id })} />
        <Stagger fast>
        {playlists.map((pl) => (
          <StaggerItem key={pl.id}>
          <button
            type="button"
            onClick={() => setSelection({ kind: 'local', id: pl.id })}
            className={cn(
              'mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
              selection.kind === 'local' && selection.id === pl.id ? 'bg-white/10' : 'hover:bg-white/6',
            )}
          >
            <PlaylistArt
              cover={pl.cover}
              covers={pl.covers}
              emoji={pl.emoji}
              color={pl.color}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{pl.name}</p>
              <p className="text-xs text-fg-muted">{pl.trackIds.length} songs</p>
            </div>
          </button>
          </StaggerItem>
        ))}
        </Stagger>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {editing ? (
          <div className="glass mx-auto max-w-md p-6">
            <h2 className="mb-4 text-lg font-semibold">Edit playlist</h2>
            <input
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              className="mb-4 w-full rounded-xl bg-white/8 px-4 py-2.5 outline-none"
            />
            <p className="mb-2 text-sm text-fg-secondary">Color</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setEditing({ ...editing, color: c })}
                  className={cn('h-8 w-8 rounded-full', editing.color === c && 'ring-2 ring-white')}
                  style={{ background: c }}
                />
              ))}
            </div>
            <p className="mb-2 text-sm text-fg-secondary">Icon</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {PRESET_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEditing({ ...editing, emoji: e })}
                  className={cn(
                    'rounded-lg px-2 py-1 text-xl',
                    editing.emoji === e && 'bg-white/15 ring-1 ring-white/30',
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void saveEdit()}
                className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
              >
                Save
              </button>
              <button type="button" onClick={() => setEditing(null)} className="rounded-xl px-4 py-2 text-sm text-fg-secondary">
                Cancel
              </button>
            </div>
          </div>
        ) : selection.kind === 'liked' ? (
          <>
            <Appear className="mb-6 flex items-center gap-2">
              <Heart size={28} className="text-[var(--accent)]" fill="currentColor" />
              <h2 className="text-3xl font-bold">Liked Songs</h2>
            </Appear>
            {liked.length === 0 ? (
              <PopIn>
              <p className="text-fg-muted">Like tracks from the player to save them here.</p>
              </PopIn>
            ) : (
              <Stagger className="grid grid-cols-1 gap-0.5 xl:grid-cols-2">
                {liked.map((track, i) => (
                  <StaggerItem key={track.id}>
                  <TrackRow track={track} index={i + 1} onPlay={() => playQueue(liked, i)} onContextMenu={ctx.openMenu} />
                  </StaggerItem>
                ))}
              </Stagger>
            )}
          </>
        ) : (
          <>
            <PopIn key={selection.id}>
            <div
              className="mb-8 flex items-end gap-6 rounded-2xl p-8"
              style={{
                background: `linear-gradient(135deg, ${headerColor}44, transparent)`,
              }}
            >
              <PlaylistArt
                cover={headerCover}
                covers={headerCovers}
                emoji={headerEmoji}
                color={headerColor}
                size="lg"
                className="shadow-xl ring-1 ring-white/15"
              />
              <div className="flex-1">
                <h2 className="text-4xl font-bold">{headerTitle}</h2>
                <p className="mt-1 text-fg-secondary">
                  {tracksLoading ? 'Loading…' : `${trackCount} songs`}
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => playlistTracks.length > 0 && playQueue(playlistTracks, 0)}
                    disabled={playlistTracks.length === 0}
                    className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    Play
                  </button>
                  {playlistTracks.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        void downloadPlaylist(
                          headerTitle,
                          playlistTracks.map((t) => ({
                            id: t.id,
                            title: t.title,
                            artist: t.artist,
                          })),
                        )
                      }
                      className="flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
                    >
                      <Download size={14} /> Download
                    </button>
                  )}
                  {selection.kind === 'local' && selectedLocal && (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditing({ ...selectedLocal })}
                        className="rounded-full bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
                      >
                        <Pencil size={14} className="inline" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePlaylist(selectedLocal.id, selectedLocal.name)}
                        className="rounded-full bg-white/10 px-4 py-2 text-sm text-red-400 hover:bg-white/15"
                      >
                        <Trash2 size={14} className="inline" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
            </PopIn>
            {tracksLoading ? (
              <Appear>
              <p className="text-fg-muted">Loading tracks…</p>
              </Appear>
            ) : playlistTracks.length === 0 ? (
              <PopIn>
              <p className="text-fg-muted">No tracks yet. Add songs from search or the player.</p>
              </PopIn>
            ) : (
              <Stagger className="flex flex-col gap-0.5">
                {playlistTracks.map((track, i) => (
                  <StaggerItem key={track.id}>
                  <TrackRow
                    track={track}
                    index={i + 1}
                    onPlay={() => playQueue(playlistTracks, i)}
                    onContextMenu={ctx.openMenu}
                  />
                  </StaggerItem>
                ))}
              </Stagger>
            )}
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
