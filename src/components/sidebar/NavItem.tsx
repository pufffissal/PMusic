import type { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'
import { useMotion } from '@/hooks/useMotion'
import { navHighlightTransition } from '@/lib/motion'

interface NavItemProps {
  icon: LucideIcon
  label: string
  active?: boolean
  shortcut?: string
  highlightLayoutId?: string
  compact?: boolean
  onClick: () => void
}

export function NavItem({
  icon: Icon,
  label,
  active,
  shortcut,
  highlightLayoutId,
  compact,
  onClick,
}: NavItemProps) {
  const { reduceMotion, spring } = useMotion()
  const highlightTransition = navHighlightTransition(reduceMotion)

  const className = cn(
    'no-drag relative flex w-full items-center rounded-xl text-left font-medium transition-colors duration-150',
    compact ? 'gap-2.5 px-3 py-2 text-[0.875rem]' : 'gap-3 px-3.5 py-2.5 text-[0.92rem]',
    active ? 'text-[var(--accent)]' : 'text-fg-secondary hover:bg-[var(--surface-hover)] hover:text-fg',
    active && reduceMotion && 'bg-[var(--surface-active)] ring-1 ring-[var(--border-glass-strong)]',
  )

  const content = (
    <>
      {active && highlightLayoutId && !reduceMotion && (
        <motion.div
          layoutId={highlightLayoutId}
          className="pointer-events-none absolute inset-0 rounded-xl bg-[var(--surface-active)] ring-1 ring-[var(--border-glass-strong)]"
          transition={highlightTransition}
        />
      )}
      <Icon
        size={compact ? 18 : 19}
        className="relative z-10 shrink-0"
        strokeWidth={active ? 2.25 : 1.75}
      />
      <span className="relative z-10 min-w-0 flex-1 truncate">{label}</span>
    </>
  )

  const title = shortcut ? `${label} (${shortcut})` : label

  if (reduceMotion) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? 'page' : undefined}
        title={title}
        className={className}
      >
        {content}
      </button>
    )
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      title={title}
      className={className}
      whileHover={active ? undefined : { x: 2 }}
      whileTap={{ scale: 0.98 }}
      transition={spring}
    >
      {content}
    </motion.button>
  )
}
