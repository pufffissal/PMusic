import { create } from 'zustand'
import {
  applyAccentGradients,
  applyAccentPalette,
  DEFAULT_ACCENT_PALETTE,
  hexToRgba,
} from '@/lib/gradient'

interface ThemeState {
  accent: string
  accentMuted: string
  accentColors: string[]
  setAccent: (color: string) => void
  setAccentColors: (colors: string[]) => void
}

applyAccentPalette(DEFAULT_ACCENT_PALETTE)

export const useThemeStore = create<ThemeState>((set) => ({
  accent: DEFAULT_ACCENT_PALETTE[0],
  accentMuted: hexToRgba(DEFAULT_ACCENT_PALETTE[0], 0.32),
  accentColors: [...DEFAULT_ACCENT_PALETTE],
  setAccent: (color) => {
    applyAccentGradients(color)
    set({
      accent: color,
      accentMuted: hexToRgba(color, 0.32),
      accentColors: [color, ...DEFAULT_ACCENT_PALETTE.slice(1)],
    })
  },
  setAccentColors: (colors) => {
    if (colors.length === 0) return
    applyAccentPalette(colors)
    set({
      accentColors: colors,
      accent: colors[0],
      accentMuted: hexToRgba(colors[0], 0.32),
    })
  },
}))
