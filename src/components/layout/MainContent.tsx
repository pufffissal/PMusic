import { lazy, Suspense } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppStore, type ViewId } from '@/store/appStore'
import { useMotion } from '@/hooks/useMotion'
import { viewSlideVariants } from '@/lib/motion'

const HomeView = lazy(() => import('@/components/views/HomeView').then((m) => ({ default: m.HomeView })))
const SearchView = lazy(() => import('@/components/views/SearchView').then((m) => ({ default: m.SearchView })))
const LibraryView = lazy(() => import('@/components/views/LibraryView').then((m) => ({ default: m.LibraryView })))
const DownloadsView = lazy(() => import('@/components/views/DownloadsView').then((m) => ({ default: m.DownloadsView })))
const ArtistsView = lazy(() => import('@/components/views/ArtistsView').then((m) => ({ default: m.ArtistsView })))
const StatsView = lazy(() => import('@/components/views/StatsView').then((m) => ({ default: m.StatsView })))
const SettingsView = lazy(() => import('@/components/views/SettingsView').then((m) => ({ default: m.SettingsView })))

const VIEW_COMPONENTS: Record<ViewId, React.LazyExoticComponent<() => React.ReactNode>> = {
  home: HomeView,
  search: SearchView,
  library: LibraryView,
  downloads: DownloadsView,
  artists: ArtistsView,
  stats: StatsView,
  settings: SettingsView,
}

function ViewFallback() {
  return <div className="flex h-full items-center justify-center text-sm text-fg-muted">Loading…</div>
}

export function MainContent() {
  const currentView = useAppStore((s) => s.currentView)
  const viewDirection = useAppStore((s) => s.viewDirection)
  const { reduceMotion, transition } = useMotion()

  const View = VIEW_COMPONENTS[currentView]

  if (reduceMotion) {
    return (
      <div className="h-full min-h-0 overflow-hidden">
        <Suspense fallback={<ViewFallback />}>
          <View />
        </Suspense>
      </div>
    )
  }

  return (
    <div className="relative h-full min-h-0 overflow-hidden">
      <AnimatePresence mode="wait" custom={viewDirection}>
        <motion.div
          key={currentView}
          custom={viewDirection}
          variants={viewSlideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={transition(0.32)}
          className="absolute inset-0 h-full min-h-0 overflow-hidden"
        >
          <Suspense fallback={<ViewFallback />}>
            <View />
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
