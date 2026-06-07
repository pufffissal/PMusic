import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useMotion } from '@/hooks/useMotion'
import { EASE_OUT } from '@/lib/motion'

export interface ContextMenuItem {
  id: string
  label: string
  icon?: LucideIcon
  onClick?: () => void
  disabled?: boolean
  danger?: boolean
  separator?: boolean
  header?: boolean
}

interface GlassContextMenuProps {
  x: number
  y: number
  open: boolean
  onClose: () => void
  items: ContextMenuItem[]
}

export function GlassContextMenu({ x, y, open, onClose, items }: GlassContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { reduceMotion } = useMotion()

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('mousedown', close)
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('keydown', esc)
    }
  }, [open, onClose])

  useEffect(() => {
    if (!open || !ref.current) return
    const el = ref.current
    const rect = el.getBoundingClientRect()
    const pad = 12
    let left = x
    let top = y
    if (left + rect.width > window.innerWidth - pad) left = window.innerWidth - rect.width - pad
    if (top + rect.height > window.innerHeight - pad) top = window.innerHeight - rect.height - pad
    el.style.left = `${Math.max(pad, left)}px`
    el.style.top = `${Math.max(pad, top)}px`
  }, [open, x, y, items])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, scale: 0.98, y: -2 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.14, ease: EASE_OUT }}
          className="context-menu fixed z-[200] min-w-[220px] overflow-hidden rounded-2xl p-1.5 shadow-2xl"
          style={{ left: x, top: y }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {items.map((item) => {
            if (item.header) {
              return (
                <p key={item.id} className="context-menu__header">
                  {item.label}
                </p>
              )
            }

            if (item.separator) {
              return <div key={item.id} className="context-menu__separator" role="separator" />
            }

            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                disabled={item.disabled}
                onClick={() => {
                  item.onClick?.()
                  onClose()
                }}
                className={cn(
                  'context-menu__item',
                  item.danger && 'context-menu__item--danger',
                  item.disabled && 'pointer-events-none opacity-40',
                )}
              >
                {Icon && <Icon size={16} className="shrink-0 opacity-80" />}
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
              </button>
            )
          })}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
