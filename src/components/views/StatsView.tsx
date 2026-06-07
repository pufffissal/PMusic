import { useEffect, useState } from 'react'
import { BarChart3, Heart, ListMusic, Play, Disc3, TrendingUp, Plus } from 'lucide-react'
import { Appear, Stagger, StaggerItem } from '@/components/ui/motion'
import { TrackRow } from '@/components/ui/TrackRow'
import { useAppStore } from '@/store/appStore'
import { usePlayerStore } from '@/store/playerStore'
import { useStatsQuery } from '@/hooks/useLibraryQueries'
import { useQueryClient } from '@tanstack/react-query'

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof BarChart3
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-active)] text-[var(--accent)]">
        <Icon size={20} />
      </div>
      <p className="text-2xl font-bold tabular-nums text-fg">{value}</p>
      <p className="mt-0.5 text-sm font-medium text-fg-secondary">{label}</p>
      {sub && <p className="mt-1 text-xs text-fg-muted">{sub}</p>}
    </div>
  )
}

export function StatsView() {
  const currentView = useAppStore((s) => s.currentView)
  const playQueue = usePlayerStore((s) => s.playQueue)
  const queryClient = useQueryClient()
  const { data: stats = null, isLoading: loading, refetch } = useStatsQuery(currentView === 'stats')
  const [savingPlaylist, setSavingPlaylist] = useState(false)

  useEffect(() => {
    const load = () => void refetch()
    window.addEventListener('pmusic:library-changed', load)
    return () => window.removeEventListener('pmusic:library-changed', load)
  }, [refetch, queryClient])

  const maxArtistPlays = stats?.topArtists[0]?.count ?? 1
  const maxDayPlays = Math.max(1, ...(stats?.activityByDay.map((d) => d.count) ?? [1]))

  const makeTopTracksPlaylist = async () => {
    if (!stats?.topTracks.length || !window.electron) return
    setSavingPlaylist(true)
    try {
      const pl = await window.electron.library.createPlaylistFromTracks({
        name: 'Most played',
        emoji: '📊',
        color: '#bf5af2',
        description: 'Generated from your listening stats',
        tracks: stats.topTracks.map((t) => ({
          id: t.id,
          title: t.title,
          artist: t.artist,
          thumbnail: t.thumbnail,
        })),
      })
      window.dispatchEvent(new CustomEvent('pmusic:playlists-changed', { detail: { id: pl.id } }))
    } finally {
      setSavingPlaylist(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <Appear className="am-view-header px-8 pb-6 pt-6">
        <h1 className="section-title">Stats</h1>
        <p className="section-subtitle">Your listening activity in PMusic</p>
      </Appear>

      <div className="space-y-10 px-8 pb-8">
        {loading && (
          <Appear delay={0.06}>
            <p className="text-fg-muted">Loading stats…</p>
          </Appear>
        )}

        {stats && (
          <>
            <Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StaggerItem>
                <StatCard icon={Play} label="Total plays" value={stats.totalPlays} sub="From recent history" />
              </StaggerItem>
              <StaggerItem>
                <StatCard icon={Disc3} label="Unique tracks" value={stats.uniqueTracks} />
              </StaggerItem>
              <StaggerItem>
                <StatCard icon={TrendingUp} label="This week" value={stats.playsThisWeek} sub="Last 7 days" />
              </StaggerItem>
              <StaggerItem>
                <StatCard
                  icon={Heart}
                  label="Liked songs"
                  value={stats.likedCount}
                  sub={`${stats.playlistCount} playlists`}
                />
              </StaggerItem>
            </Stagger>

            {stats.topArtists.length > 0 && (
              <Appear delay={0.08}>
                <section>
                  <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-fg">
                    <BarChart3 size={20} className="text-[var(--accent)]" />
                    Top artists
                  </h2>
                  <div className="glass space-y-3 rounded-2xl p-5">
                    {stats.topArtists.map((artist) => (
                      <div key={artist.name}>
                        <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                          <span className="truncate font-medium text-fg">{artist.name}</span>
                          <span className="shrink-0 tabular-nums text-fg-muted">{artist.count} plays</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-hover)]">
                          <div
                            className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
                            style={{ width: `${(artist.count / maxArtistPlays) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </Appear>
            )}

            {stats.activityByDay.length > 0 && (
              <Appear delay={0.1}>
                <section>
                  <h2 className="mb-4 text-xl font-bold text-fg">Activity by day</h2>
                  <div className="glass flex items-end gap-3 rounded-2xl p-5" style={{ minHeight: 120 }}>
                    {stats.activityByDay.map((day) => (
                      <div key={day.label} className="flex flex-1 flex-col items-center gap-2">
                        <div
                          className="w-full max-w-10 rounded-t-md bg-[var(--accent)] opacity-80"
                          style={{ height: `${Math.max(8, (day.count / maxDayPlays) * 80)}px` }}
                          title={`${day.count} plays`}
                        />
                        <span className="text-[10px] font-medium text-fg-muted">{day.label}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </Appear>
            )}

            {stats.topTracks.length > 0 && (
              <Appear delay={0.12}>
                <section>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="flex items-center gap-2 text-xl font-bold text-fg">
                      <ListMusic size={20} className="text-[var(--accent)]" />
                      Most played
                    </h2>
                    <button
                      type="button"
                      disabled={savingPlaylist}
                      onClick={() => void makeTopTracksPlaylist()}
                      className="flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15 disabled:opacity-50"
                    >
                      <Plus size={14} />
                      {savingPlaylist ? 'Saving…' : 'Make playlist'}
                    </button>
                  </div>
                  <Stagger className="grid grid-cols-1 gap-0.5 xl:grid-cols-2">
                    {stats.topTracks.map((track, i) => (
                      <StaggerItem key={track.id}>
                        <div className="relative">
                          <TrackRow
                            track={track}
                            index={i + 1}
                            onPlay={() =>
                              playQueue(
                                stats.topTracks.map((t) => ({
                                  id: t.id,
                                  title: t.title,
                                  artist: t.artist,
                                  thumbnail: t.thumbnail,
                                })),
                                i,
                              )
                            }
                          />
                          <span className="absolute top-1/2 right-14 -translate-y-1/2 text-xs tabular-nums text-fg-muted">
                            {track.count}×
                          </span>
                        </div>
                      </StaggerItem>
                    ))}
                  </Stagger>
                </section>
              </Appear>
            )}

            {stats.totalPlays === 0 && (
              <Appear>
                <p className="py-12 text-center text-fg-muted">
                  Start playing music to see your stats here.
                </p>
              </Appear>
            )}
          </>
        )}
      </div>
    </div>
  )
}
