import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Clock } from 'lucide-react'
import { PopIn, Stagger, StaggerItem } from '@/components/ui/motion'
import { ArtworkImage } from '@/components/ui/ArtworkImage'
import { cn } from '@/lib/cn'

const FALLBACK_HINTS = ['Live sessions', 'Chill playlists', 'Remixes', 'Acoustic covers', 'Instrumentals', 'Live albums']

interface ListeningTrack {
  id: string
  title: string
  artist: string
  thumbnail: string
}

interface EnhancedSearchEmptyProps {
  recentQueries: string[]
  onQuery: (q: string) => void
  onClearRecent: () => void
  className?: string
}

function cleanArtist(name: string): string {
  return name.replace(/\s*[-–—]\s*topic$/i, '').trim()
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-3 text-xs font-semibold tracking-wide text-fg-muted uppercase sm:text-sm">{children}</h3>
  )
}

export function EnhancedSearchEmpty({
  recentQueries,
  onQuery,
  onClearRecent,
  className,
}: EnhancedSearchEmptyProps) {
  const [listening, setListening] = useState<ListeningTrack[]>([])

  useEffect(() => {
    void window.electron?.library.getHistory().then((history) => {
      if (!history?.length) return
      setListening(
        history.slice(0, 12).map((e: { id: string; title: string; artist: string; thumbnail: string }) => ({
          id: e.id,
          title: e.title,
          artist: e.artist,
          thumbnail: e.thumbnail,
        })),
      )
    })
  }, [])

  const artistHints = useMemo(() => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const track of listening) {
      const name = cleanArtist(track.artist)
      if (!name || name === 'Unknown artist' || seen.has(name.toLowerCase())) continue
      seen.add(name.toLowerCase())
      out.push(name)
      if (out.length >= 8) break
    }
    return out
  }, [listening])

  const hints = artistHints.length > 0 ? artistHints : FALLBACK_HINTS

  return (
    <PopIn
      className={cn(
        'enhanced-search-empty flex w-full min-w-0 flex-col gap-6 pt-2 sm:gap-8 sm:pt-0',
        className,
      )}
    >
      {recentQueries.length > 0 && (
        <section className="w-full min-w-0">
          <div className="mb-3 flex items-center justify-between gap-2">
            <SectionLabel>
              <span className="inline-flex items-center gap-1.5">
                <Clock size={13} aria-hidden />
                Recent
              </span>
            </SectionLabel>
            <button
              type="button"
              onClick={onClearRecent}
              className="shrink-0 text-xs text-fg-muted transition-colors hover:text-fg"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-2.5">
            {recentQueries.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onQuery(q)}
                className="max-w-full truncate rounded-full bg-white/8 px-3.5 py-1.5 text-sm text-fg-secondary transition-colors hover:bg-white/12 hover:text-fg sm:px-4 sm:py-2"
              >
                {q}
              </button>
            ))}
          </div>
        </section>
      )}

      {listening.length > 0 && (
        <section className="w-full min-w-0">
          <SectionLabel>Recently played</SectionLabel>
          <Stagger className="enhanced-search-card-grid grid grid-cols-[repeat(auto-fill,minmax(min(100%,8.5rem),1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(min(100%,9.5rem),1fr))] sm:gap-4 md:grid-cols-[repeat(auto-fill,minmax(min(100%,10.5rem),1fr))]">
            {listening.map((track) => (
              <StaggerItem key={`${track.id}-${track.title}`}>
                <button
                  type="button"
                  onClick={() => onQuery(cleanArtist(track.artist) || track.title)}
                  className="group w-full min-w-0 text-left"
                >
                  <ArtworkImage
                    videoId={track.id}
                    thumbnail={track.thumbnail}
                    alt=""
                    className="mb-2 aspect-square w-full rounded-xl object-cover ring-1 ring-white/10 transition-transform duration-200 group-hover:scale-[1.02]"
                  />
                  <p className="truncate text-xs font-medium text-fg sm:text-sm">{track.title}</p>
                  <p className="truncate text-[11px] text-fg-muted sm:text-xs">{cleanArtist(track.artist)}</p>
                </button>
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      )}

      <section className="w-full min-w-0">
        <SectionLabel>{artistHints.length > 0 ? 'Artists you listen to' : 'Suggestions'}</SectionLabel>
        <div className="flex flex-wrap gap-2 sm:gap-2.5">
          {hints.map((hint) => (
            <button
              key={hint}
              type="button"
              onClick={() => onQuery(hint)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors sm:px-4 sm:py-2',
                'bg-white/8 text-fg-secondary hover:bg-white/12 hover:text-fg',
              )}
            >
              {hint}
            </button>
          ))}
        </div>
      </section>
    </PopIn>
  )
}
