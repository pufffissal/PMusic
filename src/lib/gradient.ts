/** Apple Music–style ambient gradients driven by accent color */

import { DEFAULT_ACCENT_PALETTE } from '@/lib/palette'

export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const DEFAULT_ACCENT = DEFAULT_ACCENT_PALETTE[0]

export { DEFAULT_ACCENT_PALETTE }

const AMBIENT_VARS = [
  '--ambient-top',
  '--ambient-top-soft',
  '--ambient-bottom',
  '--ambient-glow',
  '--ambient-tr',
  '--ambient-bl',
  '--ambient-center',
] as const

/** Dynamic ambient glow is only used in Glass theme */
export function isGlassTheme(): boolean {
  const theme = document.documentElement.dataset.theme
  return theme !== 'dark' && theme !== 'white'
}

export function clearAmbientInlineStyles(): void {
  const root = document.documentElement
  for (const v of AMBIENT_VARS) {
    root.style.removeProperty(v)
  }
}

export function applyAccentGradients(accent: string = DEFAULT_ACCENT, secondary?: string) {
  const root = document.documentElement
  const secondaryColor = secondary ?? accent
  root.style.setProperty('--accent', accent)
  root.style.setProperty('--accent-muted', hexToRgba(accent, 0.32))
  root.style.setProperty('--accent-1', accent)
  root.style.setProperty('--accent-2', secondaryColor)
  root.style.setProperty('--accent-3', secondaryColor)

  if (!isGlassTheme()) {
    clearAmbientInlineStyles()
    return
  }

  root.style.setProperty('--ambient-top', hexToRgba(accent, 0.28))
  root.style.setProperty('--ambient-top-soft', hexToRgba(accent, 0.12))
  root.style.setProperty('--ambient-bottom', hexToRgba(accent, 0.14))
  root.style.setProperty('--ambient-glow', hexToRgba(accent, 0.08))

  const ambientSecondary = secondary ?? '#bf5af2'
  root.style.setProperty('--ambient-tr', hexToRgba(ambientSecondary, 0.22))
  root.style.setProperty('--ambient-bl', 'rgba(28, 52, 92, 0.24)')
}

/** Full palette for aurora blobs + smooth CSS transitions (glass theme only for ambient) */
export function applyAccentPalette(colors: string[]) {
  const root = document.documentElement
  const [primary, secondary, tertiary, muted, darkMuted] = colors

  colors.slice(0, 5).forEach((c, i) => {
    root.style.setProperty(`--accent-${i + 1}`, c)
  })

  applyAccentGradients(primary ?? DEFAULT_ACCENT, secondary ?? tertiary)

  if (!isGlassTheme()) return

  if (muted) root.style.setProperty('--ambient-bl', hexToRgba(muted, 0.2))
  if (darkMuted) root.style.setProperty('--ambient-center', hexToRgba(darkMuted, 0.35))
}

applyAccentPalette(DEFAULT_ACCENT_PALETTE)
