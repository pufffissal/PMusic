import { useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useAppStore, type SearchMode } from '@/store/appStore'

const CLASSIC_TABS: { id: SearchMode; label: string }[] = [
  { id: 'music', label: 'Music' },
  { id: 'podcasts', label: 'Podcasts' },
  { id: 'all', label: 'All' },
]

interface TitleBarSearchProps {
  enhanced: boolean
  /** Full-width layout when the Search tab is active */
  onSearchView?: boolean
}

export function TitleBarSearch({ enhanced, onSearchView = false }: TitleBarSearchProps) {
  const searchQuery = useAppStore((s) => s.searchQuery)
  const setSearchQuery = useAppStore((s) => s.setSearchQuery)
  const setView = useAppStore((s) => s.setView)
  const searchFocusTick = useAppStore((s) => s.searchFocusTick)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchFocusTick === 0) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [searchFocusTick])

  const goSearch = () => {
    if (useAppStore.getState().currentView !== 'search') {
      setView('search')
    }
  }

  const clearQuery = () => {
    setSearchQuery('')
    inputRef.current?.focus()
  }

  if (enhanced) {
    return (
      <div
        className={cn(
          'no-drag flex min-w-0',
          onSearchView ? 'flex-1' : 'w-[min(34rem,calc(100vw-12rem))] justify-self-center',
        )}
      >
        <div
          className={cn(
            'search-field enhanced-search-field no-drag flex w-full items-center gap-2.5',
            onSearchView
              ? 'rounded-2xl px-4 py-2.5'
              : 'enhanced-search-field--inline rounded-xl px-3.5 py-1.5',
          )}
        >
          <Search
            size={onSearchView ? 18 : 16}
            className="shrink-0 text-[var(--accent)]"
            aria-hidden
          />
          <input
            ref={inputRef}
            type="search"
            aria-label="Search music and podcasts"
            placeholder={onSearchView ? 'Search songs, artists, albums…' : 'Search…'}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              goSearch()
            }}
            onFocus={goSearch}
            className={cn(
              'search-input min-w-0 flex-1 bg-transparent text-fg placeholder:text-fg-muted',
              onSearchView ? 'text-[15px]' : 'text-sm',
            )}
            autoComplete="off"
            spellCheck={false}
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={clearQuery}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-white/10 hover:text-fg"
            >
              <X size={15} />
            </button>
          )}
          {!onSearchView && (
            <kbd className="hidden shrink-0 rounded-md bg-white/8 px-2 py-1 text-[10px] font-medium text-fg-muted lg:inline">
              Ctrl+F
            </kbd>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'no-drag search-field flex items-center gap-2',
        onSearchView ? 'min-w-0 flex-1 rounded-xl px-3 py-1.5' : 'w-[min(32rem,calc(100vw-10rem))] justify-self-center rounded-xl px-3 py-1',
      )}
    >
      <Search size={16} className="shrink-0 text-fg-muted" aria-hidden />
      <input
        ref={inputRef}
        type="search"
        aria-label="Search"
        placeholder="Search songs, artists, albums…"
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value)
          goSearch()
        }}
        onFocus={goSearch}
        className="search-input min-w-0 flex-1 bg-transparent text-sm text-fg placeholder:text-fg-muted"
        autoComplete="off"
        spellCheck={false}
      />
      {!onSearchView && (
        <kbd className="hidden shrink-0 rounded bg-white/8 px-1.5 py-0.5 text-[10px] text-fg-muted md:inline">
          Ctrl+F
        </kbd>
      )}
    </div>
  )
}

export function TitleBarSearchTabsClassic() {
  const searchMode = useAppStore((s) => s.searchMode)
  const setSearchMode = useAppStore((s) => s.setSearchMode)

  return (
    <div
      className="hidden shrink-0 rounded-lg bg-[var(--surface-hover)] p-0.5 sm:flex"
      role="tablist"
      aria-label="Search category"
    >
      {CLASSIC_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={searchMode === tab.id}
          onClick={() => setSearchMode(tab.id)}
          className={cn(
            'rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors',
            searchMode === tab.id ? 'bg-[var(--accent)] text-white' : 'text-fg-secondary hover:text-fg',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
