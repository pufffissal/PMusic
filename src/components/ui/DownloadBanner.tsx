import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useDownloadStore, subscribeDownloadProgress } from '@/store/downloadStore'
import { useMotion } from '@/hooks/useMotion'
import { EASE_OUT, slideInRight } from '@/lib/motion'
import { cn } from '@/lib/cn'

export function DownloadBanner() {
  const download = useDownloadStore((s) => s.download)
  const resetDownload = useDownloadStore((s) => s.resetDownload)
  const { reduceMotion } = useMotion()

  useEffect(() => subscribeDownloadProgress(), [])

  const visible = download.active || download.status !== 'idle'
  const isError = download.status === 'error'
  const isDone = download.status === 'done'

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={reduceMotion ? false : slideInRight.hidden}
          animate={slideInRight.show}
          exit={reduceMotion ? undefined : { opacity: 0, x: 24, scale: 0.96 }}
          transition={{ duration: 0.38, ease: EASE_OUT }}
          className={cn(
            'fixed bottom-24 right-6 z-[200] w-80 overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-xl',
            isError
              ? 'border-red-500/30 bg-red-950/80'
              : isDone
                ? 'border-emerald-500/30 bg-emerald-950/80'
                : 'border-white/10 bg-black/70',
          )}
        >
          <div className="flex items-start gap-3 p-4">
            <div className="mt-0.5 shrink-0 text-fg-secondary">
              {isError ? (
                <AlertCircle size={18} className="text-red-400" />
              ) : isDone ? (
                <CheckCircle2 size={18} className="text-emerald-400" />
              ) : (
                <Loader2 size={18} className="animate-spin" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {isDone ? 'Download complete' : isError ? 'Download failed' : 'Downloading'}
              </p>
              <p className="truncate text-xs text-fg-secondary">{download.title}</p>
              {download.message && (
                <p className="mt-1 text-xs text-fg-muted">{download.message}</p>
              )}
              {!isDone && !isError && (
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-[var(--accent)]"
                    initial={false}
                    animate={{ width: `${Math.min(100, download.percent)}%` }}
                    transition={reduceMotion ? { duration: 0 } : { duration: 0.3, ease: EASE_OUT }}
                  />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                if (!isDone && !isError) void window.electron?.download.cancel()
                resetDownload()
              }}
              className="shrink-0 rounded-lg p-1 text-fg-muted hover:bg-white/10 hover:text-fg-secondary"
              title={isDone || isError ? 'Dismiss' : 'Cancel'}
            >
              <X size={14} />
            </button>
          </div>
          {isDone && (
            <div className="flex items-center gap-1.5 border-t border-white/8 px-4 py-2 text-xs text-fg-muted">
              <Download size={12} />
              Saved as MP3
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
