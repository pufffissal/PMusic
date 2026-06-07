import { TitleBarSearch, TitleBarSearchTabsClassic } from '@/components/layout/TitleBarSearch'
import { Minus, Square, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useAppStore } from '@/store/appStore'
import { useSettingsStore } from '@/store/settingsStore'

export function TitleBar() {
  const currentView = useAppStore((s) => s.currentView)
  const onSearch = currentView === 'search'
  const enhancedSearch = useSettingsStore((s) => s.settings.enhancedSearch)

  if (onSearch) {
    return (
      <div
        className={cn(
          'glass-titlebar drag-region flex shrink-0 items-center gap-2 sm:gap-3',
          enhancedSearch ? 'enhanced-search-titlebar px-4 py-3' : 'px-3 py-2 sm:px-4',
        )}
        style={{ minHeight: 'var(--titlebar-height)' }}
      >
        <div className="no-drag flex min-w-0 flex-1 items-center gap-2">
          <TitleBarSearch enhanced={enhancedSearch} onSearchView />
          {!enhancedSearch && <TitleBarSearchTabsClassic />}
        </div>

        <WindowControls />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'glass-titlebar drag-region grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 px-4',
        enhancedSearch ? 'enhanced-search-titlebar enhanced-search-titlebar--inline py-3' : 'py-2.5',
      )}
      style={{ minHeight: 'var(--titlebar-height)' }}
    >
      <span className="no-drag hidden justify-self-start text-[11px] font-medium tracking-wide text-fg-muted uppercase sm:inline">
        PMusic
      </span>

      <TitleBarSearch enhanced={enhancedSearch} />

      <WindowControls />
    </div>
  )
}

function WindowControls() {
  return (
    <div className="no-drag flex shrink-0 items-center gap-0.5 justify-self-end">
      <WinButton onClick={() => window.electron?.window.minimize()} label="Minimize">
        <Minus size={14} strokeWidth={2} />
      </WinButton>
      <WinButton onClick={() => window.electron?.window.maximize()} label="Maximize">
        <Square size={11} strokeWidth={2} />
      </WinButton>
      <WinButton onClick={() => window.electron?.window.close()} label="Close" danger>
        <X size={14} strokeWidth={2} />
      </WinButton>
    </div>
  )
}

function WinButton({
  children,
  onClick,
  label,
  danger,
}: {
  children: React.ReactNode
  onClick: () => void
  label: string
  danger?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'interactive-scale flex h-8 w-10 items-center justify-center rounded-lg text-fg-secondary transition-colors',
        danger ? 'hover:bg-red-500/90 hover:text-fg' : 'hover:bg-white/12 hover:text-fg',
      )}
    >
      {children}
    </button>
  )
}
