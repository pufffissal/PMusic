import { cn } from '@/lib/cn'

interface SettingRowProps {
  label: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function SettingRow({ label, description, children, className }: SettingRowProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 rounded-xl px-4 py-3.5 transition-colors hover:bg-[var(--surface-hover)]',
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-fg">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs leading-relaxed text-fg-secondary">{description}</span>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export function SettingSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="glass overflow-hidden">
      <div className="border-b border-[var(--border-glass)] px-5 py-4">
        <h2 className="text-sm font-semibold text-fg">{title}</h2>
        {description && (
          <p className="mt-0.5 text-xs leading-relaxed text-fg-secondary">{description}</p>
        )}
      </div>
      <div className="divide-y divide-[var(--border-glass)]">{children}</div>
    </section>
  )
}

export function SettingGroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-5 pb-1 pt-3 text-[11px] font-semibold tracking-wide text-fg-muted uppercase">
      {children}
    </p>
  )
}

export function SettingNote({ children }: { children: React.ReactNode }) {
  return <p className="px-5 py-3 text-xs leading-relaxed text-fg-muted">{children}</p>
}

export function SettingButton({
  children,
  onClick,
  disabled,
  variant = 'secondary',
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'danger'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40',
        variant === 'primary' && 'bg-[var(--accent)] text-white hover:opacity-90',
        variant === 'secondary' && 'bg-[var(--surface-hover)] text-fg-secondary hover:bg-[var(--surface-active)]',
        variant === 'danger' && 'text-red-400 hover:bg-red-500/10',
      )}
    >
      {children}
    </button>
  )
}

export function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-7 w-12 shrink-0 rounded-full transition-colors',
        checked ? 'bg-[var(--accent)]' : 'bg-[var(--surface-active)]',
        disabled && 'opacity-40',
      )}
    >
      <span
        className={cn(
          'absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow transition-transform',
          checked && 'translate-x-5',
        )}
      />
    </button>
  )
}
