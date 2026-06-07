import { useEffect } from 'react'
import { useThemeStore } from '@/store/themeStore'
import { useSettingsStore } from '@/store/settingsStore'
import { extractPaletteFromImage } from '@/lib/palette'

export { extractAccentFromImage } from '@/lib/palette'

export function useVibrant(imageUrl: string | undefined) {
  const setAccentColors = useThemeStore((s) => s.setAccentColors)
  const useDynamic = useSettingsStore((s) => s.settings.useDynamicAccent)

  useEffect(() => {
    if (!imageUrl || !useDynamic) return
    let cancelled = false

    void extractPaletteFromImage(imageUrl).then((colors) => {
      if (!cancelled) setAccentColors(colors)
    })

    return () => {
      cancelled = true
    }
  }, [imageUrl, useDynamic, setAccentColors])
}
