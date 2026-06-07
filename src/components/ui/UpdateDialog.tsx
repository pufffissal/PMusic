import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { useAppUpdate } from '@/hooks/useAppUpdate'
import { useMotion } from '@/hooks/useMotion'
import { cn } from '@/lib/cn'

/** Version the user dismissed the "update available" prompt for (until app restart). */
let dismissedAvailableVersion: string | null = null
/** Version the user chose "Later" on the restart prompt for (until app restart). */
let dismissedReadyVersion: string | null = null

export function UpdateDialog() {
  const { state, download, install } = useAppUpdate()
  const { reduceMotion } = useMotion()
  const [dismissedAvailable, setDismissedAvailable] = useState(dismissedAvailableVersion)
  const [dismissedReady, setDismissedReady] = useState(dismissedReadyVersion)

  const skippedAvailable =
    state.status === 'available' &&
    state.version != null &&
    dismissedAvailable === state.version

  const skippedReady =
    state.status === 'ready' && state.version != null && dismissedReady === state.version

  const showDialog =
    state.status === 'downloading' ||
    (state.status === 'ready' && !skippedReady) ||
    (state.status === 'available' && !skippedAvailable)

  const dismiss = () => {
    if (state.status === 'downloading') return
    if (state.status === 'available' && state.version) {
      dismissedAvailableVersion = state.version
      setDismissedAvailable(state.version)
    } else if (state.status === 'ready' && state.version) {
      dismissedReadyVersion = state.version
      setDismissedReady(state.version)
    }
  }

  const handleUpdate = async () => {
    if (state.status === 'ready') {
      install()
      return
    }
    if (state.status === 'available') {
      await download()
    }
  }

  const title =
    state.status === 'error'
      ? 'Update check failed'
      : state.status === 'ready'
        ? 'Update ready'
        : state.status === 'downloading'
          ? 'Downloading update'
          : 'Update available'

  const description =
    state.status === 'error'
      ? state.error ?? 'Could not check for updates.'
      : state.status === 'ready'
        ? `PMusic ${state.version ?? ''} will install when you restart.`
        : state.status === 'downloading'
          ? 'Please keep PMusic open until the download finishes.'
          : `PMusic ${state.version ?? ''} is available on GitHub with the latest features and fixes.`

  const primaryLabel =
    state.status === 'ready'
      ? 'Restart now'
      : state.status === 'downloading'
        ? 'Downloading…'
        : 'Update now'

  const secondaryLabel = state.status === 'ready' ? 'Later' : state.status === 'error' ? 'Dismiss' : 'Not now'

  return createPortal(
    <AnimatePresence>
      {showDialog && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.2 }}
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && state.status !== 'downloading') dismiss()
          }}
        >
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="glass w-full max-w-md overflow-hidden rounded-2xl shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="border-b border-white/8 px-6 py-5">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/15 text-[var(--accent)]">
                  {state.status === 'downloading' ? (
                    <Loader2 size={22} className="animate-spin" />
                  ) : state.status === 'ready' ? (
                    <RefreshCw size={22} />
                  ) : (
                    <Sparkles size={22} />
                  )}
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <h2 className="text-lg font-semibold text-fg">{title}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-fg-secondary">{description}</p>
                </div>
              </div>
              {state.status === 'downloading' && (
                <div className="mt-4">
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-full rounded-full bg-[var(--accent)]"
                      initial={false}
                      animate={{
                        width: `${Math.min(100, Math.max(4, state.percent ?? 0))}%`,
                      }}
                      transition={reduceMotion ? { duration: 0 } : { duration: 0.25 }}
                    />
                  </div>
                  {state.percent != null && state.percent > 0 && (
                    <p className="mt-2 text-xs text-fg-muted">{Math.round(state.percent)}% complete</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-2 px-6 py-4 sm:flex-row sm:justify-end">
              {state.status !== 'downloading' && (
                <button
                  type="button"
                  onClick={dismiss}
                  className="rounded-xl px-4 py-2.5 text-sm font-medium text-fg-secondary transition-colors hover:bg-white/8 hover:text-fg"
                >
                  {secondaryLabel}
                </button>
              )}
              {state.status !== 'error' && (
                <button
                  type="button"
                  disabled={state.status === 'downloading'}
                  onClick={() => void handleUpdate()}
                  className={cn(
                    'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-opacity',
                    'bg-[var(--accent)] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50',
                  )}
                >
                  {state.status === 'available' && <Download size={16} />}
                  {primaryLabel}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
