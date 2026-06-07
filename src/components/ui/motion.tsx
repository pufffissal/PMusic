import { motion, type HTMLMotionProps } from 'framer-motion'
import { useEffect, useState, type ReactNode } from 'react'
import { useAppStore, type ViewId } from '@/store/appStore'
import { useMotion } from '@/hooks/useMotion'
import {
  EASE_OUT,
  fadeUp,
  pageEnter,
  scaleIn,
  slideInRight,
  slideInUp,
  staggerContainer,
  staggerContainerFast,
  staggerItem,
} from '@/lib/motion'
import { cn } from '@/lib/cn'

export function ViewEnter({ viewId, children }: { viewId: ViewId; children: ReactNode }) {
  const currentView = useAppStore((s) => s.currentView)
  const active = currentView === viewId
  const { reduceMotion } = useMotion()
  const [generation, setGeneration] = useState(0)

  useEffect(() => {
    if (active) setGeneration((g) => g + 1)
  }, [active])

  if (reduceMotion) {
    return <div className="h-full min-h-0">{children}</div>
  }

  return (
    <motion.div
      key={generation}
      initial={pageEnter.hidden}
      animate={pageEnter.show}
      transition={{ duration: 0.45, ease: EASE_OUT }}
      className="h-full min-h-0"
    >
      {children}
    </motion.div>
  )
}

type AppearProps = Omit<HTMLMotionProps<'div'>, 'children'> & {
  children: ReactNode
  delay?: number
}

export function Appear({ children, className, delay = 0, ...props }: AppearProps) {
  const { reduceMotion, transition } = useMotion()
  if (reduceMotion) return <div className={className}>{children}</div>

  return (
    <motion.div
      initial={fadeUp.hidden}
      animate={fadeUp.show}
      transition={{ ...transition(0.4), delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export function PopIn({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const { reduceMotion, spring } = useMotion()
  if (reduceMotion) return <div className={className}>{children}</div>

  return (
    <motion.div
      initial={scaleIn.hidden}
      animate={scaleIn.show}
      transition={{ ...spring, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function SlideUp({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const { reduceMotion, transition } = useMotion()
  if (reduceMotion) return <div className={className}>{children}</div>

  return (
    <motion.div
      initial={slideInUp.hidden}
      animate={slideInUp.show}
      transition={{ ...transition(0.42), delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function SlideIn({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const { reduceMotion, transition } = useMotion()
  if (reduceMotion) return <div className={className}>{children}</div>

  return (
    <motion.div
      initial={slideInRight.hidden}
      animate={slideInRight.show}
      transition={{ ...transition(0.4), delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function Stagger({
  children,
  className,
  fast,
}: {
  children: ReactNode
  className?: string
  fast?: boolean
}) {
  const { reduceMotion, transition } = useMotion()
  if (reduceMotion) return <div className={className}>{children}</div>

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={fast ? staggerContainerFast : staggerContainer}
      transition={transition()}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  const { reduceMotion, transition } = useMotion()
  if (reduceMotion) return <div className={className}>{children}</div>

  return (
    <motion.div variants={staggerItem} transition={transition(0.34)} className={className}>
      {children}
    </motion.div>
  )
}

export function HoverLift({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const { reduceMotion, spring } = useMotion()
  if (reduceMotion) return <div className={className}>{children}</div>

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      transition={spring}
      className={cn('will-change-transform', className)}
    >
      {children}
    </motion.div>
  )
}
