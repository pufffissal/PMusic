import { useEffect, useState } from 'react'
import { Download, Link2, Loader2, Search } from 'lucide-react'
import type { YoutubePlaylist } from '../../../electron/preload'

interface YoutubeImportPanelProps {
  onImported: (playlistId: string) => void
}

export function YoutubeImportPanel({ onImported }: YoutubeImportPanelProps) {
  const [url, setUrl] = useState('')
  const [search, setSearch] = useState('')
  const [featured, setFeatured] = useState<YoutubePlaylist[]>([])
  const [results, setResults] = useState<YoutubePlaylist[]>([])
  const [loadingFeatured, setLoadingFeatured] = useState(true)
  const [searching, setSearching] = useState(false)
  const [importingId, setImportingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void window.electron?.youtube.getPlaylists().then((lists) => {
      setFeatured(lists)
      setLoadingFeatured(false)
    })
  }, [])

  const importPlaylist = async (playlistId: string, name?: string) => {
    setImportingId(playlistId)
    setError(null)
    try {
      const pl = await window.electron?.youtube.importPlaylist({ playlistId, name })
      if (!pl) {
        setError('Could not import playlist — check the link or try again.')
        return
      }
      window.dispatchEvent(new CustomEvent('pmusic:playlists-changed', { detail: { id: pl.id } }))
      onImported(pl.id)
    } catch {
      setError('Import failed. The playlist may be private or unavailable.')
    } finally {
      setImportingId(null)
    }
  }

  const importFromUrl = async () => {
    const id = await window.electron?.youtube.parsePlaylistId(url)
    if (!id) {
      setError('Paste a YouTube Music playlist URL or playlist ID.')
      return
    }
    await importPlaylist(id)
    setUrl('')
  }

  const runSearch = async () => {
    const q = search.trim()
    if (!q) return
    setSearching(true)
    setError(null)
    try {
      const found = await window.electron?.youtube.searchPlaylists(q)
      setResults(found ?? [])
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="mb-6 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Download size={16} className="text-[var(--accent)]" />
        <p className="text-sm font-semibold text-fg">Import from YouTube Music</p>
      </div>
      <p className="mb-3 text-xs text-fg-muted">Public playlists — no sign-in required.</p>

      <div className="mb-3 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Link2 size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-fg-muted" />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Playlist URL or ID"
            className="w-full rounded-xl bg-white/8 py-2 pr-3 pl-9 text-sm outline-none ring-[var(--accent)] focus:ring-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') void importFromUrl()
            }}
          />
        </div>
        <button
          type="button"
          disabled={!url.trim() || importingId != null}
          onClick={() => void importFromUrl()}
          className="shrink-0 rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Import
        </button>
      </div>

      <div className="mb-3 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-fg-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search playlists"
            className="w-full rounded-xl bg-white/8 py-2 pr-3 pl-9 text-sm outline-none ring-[var(--accent)] focus:ring-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') void runSearch()
            }}
          />
        </div>
        <button
          type="button"
          disabled={!search.trim() || searching}
          onClick={() => void runSearch()}
          className="shrink-0 rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15 disabled:opacity-40"
        >
          {searching ? <Loader2 size={16} className="animate-spin" /> : 'Search'}
        </button>
      </div>

      {error && <p className="mb-3 text-xs text-red-400">{error}</p>}

      {(results.length > 0 || featured.length > 0) && (
        <div className="max-h-48 space-y-1 overflow-y-auto">
          {(results.length > 0 ? results : featured).slice(0, 12).map((pl) => (
            <button
              key={pl.id}
              type="button"
              disabled={importingId === pl.id}
              onClick={() => void importPlaylist(pl.id, pl.title)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white/8 disabled:opacity-50"
            >
              {pl.thumbnail ? (
                <img src={pl.thumbnail} alt="" className="h-8 w-8 rounded object-cover" />
              ) : (
                <div className="h-8 w-8 rounded bg-white/10" />
              )}
              <span className="min-w-0 flex-1 truncate">{pl.title}</span>
              {importingId === pl.id && <Loader2 size={14} className="animate-spin text-fg-muted" />}
            </button>
          ))}
        </div>
      )}

      {loadingFeatured && results.length === 0 && (
        <p className="text-xs text-fg-muted">Loading featured playlists…</p>
      )}
    </div>
  )
}
