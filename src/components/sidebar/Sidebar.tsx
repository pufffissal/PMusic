import { LayoutGroup } from 'framer-motion'
import { Home, Search, Library, Download, Users, BarChart3, ListMusic, Settings, Disc3 } from 'lucide-react'
import { NavItem } from './NavItem'
import { NavSection } from './NavSection'
import { useAppStore, type ViewId } from '@/store/appStore'
import { usePlayerStore } from '@/store/playerStore'
import { PopIn } from '@/components/ui/motion'
import appIcon from '@/assets/icon.png'

type NavEntry = { id: ViewId; label: string; icon: typeof Home; shortcut: string }

const browseNav: NavEntry[] = [
  { id: 'home', label: 'Home', icon: Home, shortcut: '1' },
  { id: 'search', label: 'Search', icon: Search, shortcut: '2' },
]

const collectionNav: NavEntry[] = [
  { id: 'library', label: 'Library', icon: Library, shortcut: '3' },
  { id: 'downloads', label: 'Downloads', icon: Download, shortcut: '4' },
  { id: 'artists', label: 'Artists', icon: Users, shortcut: '5' },
]

const insightsNav: NavEntry[] = [{ id: 'stats', label: 'Stats', icon: BarChart3, shortcut: '6' }]

function NavLink({
  entry,
  active,
  onSelect,
}: {
  entry: NavEntry
  active: boolean
  onSelect: (id: ViewId) => void
}) {
  return (
    <NavItem
      compact
      icon={entry.icon}
      label={entry.label}
      shortcut={entry.shortcut}
      active={active}
      highlightLayoutId="main-nav-highlight"
      onClick={() => onSelect(entry.id)}
    />
  )
}

export function Sidebar() {
  const currentView = useAppStore((s) => s.currentView)
  const setView = useAppStore((s) => s.setView)
  const setNowPlayingOpen = useAppStore((s) => s.setNowPlayingOpen)
  const setQueueOpen = usePlayerStore((s) => s.setQueueOpen)
  const hasTrack = usePlayerStore((s) => s.queue.length > 0)

  return (
    <aside
      className="glass-sidebar flex shrink-0 flex-col p-3"
      style={{ width: 'var(--sidebar-width)' }}
      aria-label="Main navigation"
    >
      <PopIn className="mb-3 px-1.5 pt-0.5">
        <div className="flex items-center gap-2.5">
          <img
            src={appIcon}
            alt=""
            className="h-8 w-8 rounded-lg object-cover shadow-md ring-1 ring-white/10"
          />
          <div className="min-w-0">
            <h1 className="truncate text-[14px] font-bold tracking-tight text-fg">PMusic</h1>
            <p className="text-[10px] text-fg-muted">YouTube Music</p>
          </div>
        </div>
      </PopIn>

      <div className="flex min-h-0 flex-1 flex-col">
      <LayoutGroup id="main-nav">
        <nav className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain py-1">
          <NavSection label="Browse">
            {browseNav.map((entry) => (
              <NavLink
                key={entry.id}
                entry={entry}
                active={currentView === entry.id}
                onSelect={setView}
              />
            ))}
          </NavSection>

          <NavSection label="Collection">
            {collectionNav.map((entry) => (
              <NavLink
                key={entry.id}
                entry={entry}
                active={currentView === entry.id}
                onSelect={setView}
              />
            ))}
          </NavSection>

          <NavSection label="Insights">
            {insightsNav.map((entry) => (
              <NavLink
                key={entry.id}
                entry={entry}
                active={currentView === entry.id}
                onSelect={setView}
              />
            ))}
          </NavSection>
        </nav>

        <div className="sidebar-footer mt-2 shrink-0 space-y-0.5 border-t border-white/6 pt-2">
          {hasTrack && (
            <NavItem
              compact
              icon={Disc3}
              label="Now Playing"
              shortcut="Ctrl+N"
              onClick={() => setNowPlayingOpen(true)}
            />
          )}
          <NavItem
            compact
            icon={ListMusic}
            label="Queue"
            shortcut="Ctrl+L"
            onClick={() => setQueueOpen(true)}
          />
          <NavItem
            compact
            icon={Settings}
            label="Settings"
            shortcut="7"
            active={currentView === 'settings'}
            highlightLayoutId="main-nav-highlight"
            onClick={() => setView('settings')}
          />
        </div>
      </LayoutGroup>
      </div>
    </aside>
  )
}
