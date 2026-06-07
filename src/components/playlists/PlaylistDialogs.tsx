import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, ListMusic } from 'lucide-react'
import { cn } from '@/lib/cn'
import { PlaylistArt } from '@/components/ui/PlaylistArt'
import { usePlaylistDialogStore } from '@/store/playlistDialogStore'
import type { Playlist } from '../../../electron/preload'

const PRESET_COLORS = ['#fa2d48', '#fc3c44', '#1db954', '#0a84ff', '#bf5af2', '#ff9f0a', '#ff375f', '#64d2ff']
const PRESET_EMOJIS = ['🎵', '🔥', '💜', '🌙', '⚡', '🎸', '🎧', '✨']

function ModalBackdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="glass w-full max-w-md overflow-hidden rounded-2xl shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>,
    document.body,
  )
}

function useCreatePlaylist(playlistCount: number) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (): Promise<Playlist | null> => {
    const trimmed = name.trim()
    if (!trimmed || saving) return null
    setSaving(true)
    try {
      return (
        (await window.electron?.library.createPlaylist({
          name: trimmed,
          color: PRESET_COLORS[playlistCount % PRESET_COLORS.length],
          emoji: PRESET_EMOJIS[playlistCount % PRESET_EMOJIS.length],
        })) ?? null
      )
    } finally {
      setSaving(false)
    }
  }

  return { name, setName, saving, submit }
}

function CreatePlaylistForm({
  onCreated,
  onCancel,
  playlistCount,
}: {
  onCreated: (playlist: Playlist) => void
  onCancel: () => void
  playlistCount: number
}) {
  const { name, setName, saving, submit } = useCreatePlaylist(playlistCount)

  const handleSubmit = async () => {
    const pl = await submit()
    if (pl) onCreated(pl)
  }

  return (
    <>
      <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
        <h2 className="text-lg font-semibold">New playlist</h2>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg p-1.5 text-fg-muted hover:bg-white/10 hover:text-fg-secondary"
        >
          <X size={18} />
        </button>
      </div>
      <div className="p-5">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleSubmit()
            if (e.key === 'Escape') onCancel()
          }}
          placeholder="Playlist name"
          className="mb-4 w-full rounded-xl bg-white/8 px-4 py-3 text-sm outline-none ring-1 ring-white/10 focus:ring-[var(--accent)]"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-4 py-2 text-sm text-fg-secondary hover:text-fg-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!name.trim() || saving}
            onClick={() => void handleSubmit()}
            className="rounded-xl bg-[var(--accent)] px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </>
  )
}

function AddToPlaylistDialog({
  track,
  onClose,
}: {
  track: { id: string; title: string; artist: string; thumbnail: string }
  onClose: () => void
}) {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)
  const create = useCreatePlaylist(playlists.length)

  const load = useCallback(async () => {
    setLoading(true)
    const list = await window.electron?.library.getPlaylists()
    setPlaylists(list ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const addTo = async (playlistId: string) => {
    setAdding(playlistId)
    try {
      await window.electron?.library.addTrackToPlaylist({
        playlistId,
        track,
      })
      window.dispatchEvent(new CustomEvent('pmusic:playlists-changed'))
      onClose()
    } finally {
      setAdding(null)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold">Add to playlist</h2>
          <p className="mt-0.5 truncate text-xs text-fg-muted">{track.title}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-fg-muted hover:bg-white/10 hover:text-fg-secondary"
        >
          <X size={18} />
        </button>
      </div>
      <div className="max-h-72 overflow-y-auto p-2">
        {loading ? (
          <p className="px-3 py-4 text-sm text-fg-muted">Loading playlists…</p>
        ) : creating ? (
          <div className="p-3">
            <input
              autoFocus
              value={create.name}
              onChange={(e) => create.setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  void create.submit().then((pl) => {
                    if (pl) void addTo(pl.id)
                  })
                }
                if (e.key === 'Escape') setCreating(false)
              }}
              placeholder="Playlist name"
              className="mb-3 w-full rounded-xl bg-white/8 px-4 py-2.5 text-sm outline-none ring-1 ring-white/10 focus:ring-[var(--accent)]"
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!create.name.trim() || create.saving}
                onClick={() =>
                  void create.submit().then((pl) => {
                    if (pl) void addTo(pl.id)
                  })
                }
                className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                {create.saving ? 'Creating…' : 'Create & add'}
              </button>
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="rounded-xl px-4 py-2 text-sm text-fg-secondary"
              >
                Back
              </button>
            </div>
          </div>
        ) : playlists.length === 0 ? (
          <div className="px-3 py-4 text-center">
            <p className="mb-3 text-sm text-fg-muted">No playlists yet.</p>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
            >
              Create your first playlist
            </button>
          </div>
        ) : (
          <>
            {playlists.map((pl) => (
              <button
                key={pl.id}
                type="button"
                disabled={adding === pl.id}
                onClick={() => void addTo(pl.id)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/10 disabled:opacity-50"
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
                {adding === pl.id && (
                  <span className="text-xs text-fg-muted">Adding…</span>
                )}
              </button>
            ))}
          </>
        )}
      </div>
      {!loading && !creating && playlists.length > 0 && (
        <div className="border-t border-white/8 p-2">
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-fg-secondary hover:bg-white/10"
          >
            <Plus size={16} />
            New playlist
          </button>
        </div>
      )}
    </>
  )
}

export function PlaylistDialogs() {
  const addTrack = usePlaylistDialogStore((s) => s.addTrack)
  const closeAddToPlaylist = usePlaylistDialogStore((s) => s.closeAddToPlaylist)
  const createOpen = usePlaylistDialogStore((s) => s.createOpen)
  const closeCreatePlaylist = usePlaylistDialogStore((s) => s.closeCreatePlaylist)
  const deleteTarget = usePlaylistDialogStore((s) => s.deleteTarget)
  const closeDeletePlaylist = usePlaylistDialogStore((s) => s.closeDeletePlaylist)

  const [playlistCount, setPlaylistCount] = useState(0)

  useEffect(() => {
    if (!createOpen) return
    void window.electron?.library.getPlaylists().then((p) => setPlaylistCount(p?.length ?? 0))
  }, [createOpen])

  return (
    <AnimatePresence>
      {addTrack && (
        <ModalBackdrop onClose={closeAddToPlaylist} key="add">
          <AddToPlaylistDialog track={addTrack} onClose={closeAddToPlaylist} />
        </ModalBackdrop>
      )}

      {createOpen && (
        <ModalBackdrop onClose={closeCreatePlaylist} key="create">
          <CreatePlaylistForm
            playlistCount={playlistCount}
            onCancel={closeCreatePlaylist}
            onCreated={(pl) => {
              closeCreatePlaylist()
              window.dispatchEvent(
                new CustomEvent('pmusic:playlists-changed', { detail: { id: pl.id } }),
              )
            }}
          />
        </ModalBackdrop>
      )}

      {deleteTarget && (
        <ModalBackdrop onClose={closeDeletePlaylist} key="delete">
          <div className="p-5">
            <h2 className="text-lg font-semibold">Delete playlist?</h2>
            <p className="mt-2 text-sm text-fg-secondary">
              &ldquo;{deleteTarget.name}&rdquo; will be removed. Songs stay in your library.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDeletePlaylist}
                className="rounded-xl px-4 py-2 text-sm text-fg-secondary hover:text-fg-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await window.electron?.library.deletePlaylist(deleteTarget.id)
                  closeDeletePlaylist()
                  window.dispatchEvent(
                    new CustomEvent('pmusic:playlist-deleted', { detail: { id: deleteTarget.id } }),
                  )
                }}
                className="rounded-xl bg-red-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </ModalBackdrop>
      )}
    </AnimatePresence>
  )
}

export function AddToPlaylistButton({
  track,
  className,
  iconOnly = false,
}: {
  track: { id: string; title: string; artist: string; thumbnail: string }
  className?: string
  iconOnly?: boolean
}) {
  const open = usePlaylistDialogStore((s) => s.openAddToPlaylist)
  return (
    <button
      type="button"
      onClick={() => open(track)}
      title="Add to playlist"
      aria-label="Add to playlist"
      className={cn(
        'flex items-center gap-2 text-sm font-medium',
        className ?? 'glass rounded-full px-5 py-2.5',
      )}
    >
      <ListMusic size={16} />
      {!iconOnly && 'Add to playlist'}
    </button>
  )
}
