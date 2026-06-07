import { motion } from 'framer-motion'
import { useThemeStore } from '@/store/themeStore'
import { useSettingsStore } from '@/store/settingsStore'
import { DEFAULT_ACCENT_PALETTE } from '@/lib/gradient'
import { cn } from '@/lib/cn'

interface BlobConfig {
  size: string
  top?: string
  left?: string
  right?: string
  bottom?: string
  opacity: number
  blur: number
  duration: number
  keyframes: { x: number[]; y: number[]; scale: number[]; rotate: number[] }
}

const BLOB_CONFIGS: BlobConfig[] = [
  {
    size: 'min(55vw, 680px)',
    top: '-12%',
    left: '-10%',
    opacity: 0.72,
    blur: 90,
    duration: 22,
    keyframes: { x: [0, 60, 20, -30, 0], y: [0, 40, 90, 30, 0], scale: [1, 1.08, 0.94, 1.04, 1], rotate: [0, 12, -8, 6, 0] },
  },
  {
    size: 'min(48vw, 620px)',
    top: '8%',
    right: '-14%',
    opacity: 0.58,
    blur: 100,
    duration: 28,
    keyframes: { x: [0, -50, -10, -60, 0], y: [0, 30, -40, 10, 0], scale: [1, 1.06, 0.92, 1.02, 1], rotate: [0, -10, 14, -6, 0] },
  },
  {
    size: 'min(62vw, 760px)',
    bottom: '-18%',
    left: '18%',
    opacity: 0.48,
    blur: 110,
    duration: 32,
    keyframes: { x: [0, 40, -20, 30, 0], y: [0, -35, 25, -15, 0], scale: [1, 1.1, 0.9, 1.05, 1], rotate: [0, 8, -12, 4, 0] },
  },
  {
    size: 'min(38vw, 480px)',
    top: '42%',
    left: '8%',
    opacity: 0.38,
    blur: 80,
    duration: 24,
    keyframes: { x: [0, 80, 40, 10, 0], y: [0, -30, 50, 15, 0], scale: [1, 1.12, 0.88, 1.06, 1], rotate: [0, -14, 10, -4, 0] },
  },
]

function meshGradient(a: string, b: string, c: string): string {
  return `
    radial-gradient(ellipse 80% 60% at 20% 30%, ${a} 0%, transparent 55%),
    radial-gradient(ellipse 70% 55% at 75% 25%, ${b} 0%, transparent 52%),
    radial-gradient(ellipse 65% 70% at 55% 75%, ${c} 0%, transparent 58%),
    conic-gradient(from 120deg at 50% 50%, ${a}, ${b}, ${c}, ${a})
  `
}

interface AuroraBackgroundProps {
  subtle?: boolean
  className?: string
}

export function AuroraBackground({ subtle = false, className }: AuroraBackgroundProps) {
  const accentColors = useThemeStore((s) => s.accentColors)
  const reduceMotion = useSettingsStore((s) => s.settings.reduceMotion)

  if (reduceMotion) return null

  const palette = [
    accentColors[0] ?? DEFAULT_ACCENT_PALETTE[0],
    accentColors[1] ?? DEFAULT_ACCENT_PALETTE[1],
    accentColors[2] ?? DEFAULT_ACCENT_PALETTE[2],
    accentColors[0] ?? DEFAULT_ACCENT_PALETTE[3],
  ]

  const opacityScale = subtle ? 0.42 : 1

  return (
    <div className={cn('aurora-mesh absolute inset-0 overflow-hidden', className)} aria-hidden>
      <div className="aurora-mesh__base" />

      {BLOB_CONFIGS.map((cfg, i) => {
        const a = palette[i % palette.length]
        const b = palette[(i + 1) % palette.length]
        const c = palette[(i + 2) % palette.length]

        return (
          <motion.div
            key={i}
            className="aurora-mesh__blob absolute rounded-full"
            style={{
              width: cfg.size,
              height: cfg.size,
              top: cfg.top,
              left: cfg.left,
              right: cfg.right,
              bottom: cfg.bottom,
              background: meshGradient(a, b, c),
              filter: `blur(${cfg.blur}px) saturate(165%)`,
              opacity: cfg.opacity * opacityScale,
              willChange: 'transform',
            }}
            animate={{
              x: cfg.keyframes.x,
              y: cfg.keyframes.y,
              scale: cfg.keyframes.scale,
              rotate: cfg.keyframes.rotate,
            }}
            transition={{
              duration: cfg.duration,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * -5.5,
            }}
          />
        )
      })}

      <div
        className="aurora-mesh__veil absolute inset-0"
        style={{
          background: subtle
            ? 'radial-gradient(ellipse 100% 80% at 50% 50%, transparent 42%, rgba(6,6,8,0.55) 100%)'
            : `
              radial-gradient(ellipse 90% 70% at 50% 40%, transparent 28%, rgba(6,6,8,0.45) 100%),
              linear-gradient(to bottom, rgba(6,6,8,0.15) 0%, transparent 28%, transparent 58%, rgba(6,6,8,0.82) 100%)
            `,
        }}
      />
    </div>
  )
}
