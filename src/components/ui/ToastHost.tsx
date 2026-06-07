import { useEffect } from 'react'
import { X } from 'lucide-react'
import { useToastStore } from '@/store/toastStore'
import { cn } from '@/lib/cn'

export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  useEffect(() => {
    if (!toasts.length) return
    const latest = toasts[toasts.length - 1]
    const timer = window.setTimeout(() => dismiss(latest.id), 4000)
    return () => window.clearTimeout(timer)
  }, [toasts, dismiss])

  if (!toasts.length) return null

  return (
    <div className="pointer-events-none fixed bottom-[calc(var(--player-height)+1rem)] right-4 z-[200] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'glass pointer-events-auto flex max-w-sm items-start gap-3 rounded-xl px-4 py-3 shadow-xl',
            t.variant === 'error' && 'ring-1 ring-red-400/40',
            t.variant === 'success' && 'ring-1 ring-emerald-400/30',
          )}
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-fg">{t.title}</p>
            {t.body && <p className="mt-0.5 text-xs text-fg-secondary">{t.body}</p>}
          </div>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            className="shrink-0 rounded-lg p-1 text-fg-muted hover:bg-white/10"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
