import { useEffect, useState, type CSSProperties } from 'react'
import { extractPaletteFromImage } from '@/lib/palette'

export function useArtworkGlow(imageUrl: string | undefined, enabled: boolean): CSSProperties | undefined {
  const [colors, setColors] = useState<[string, string, string] | null>(null)

  useEffect(() => {
    if (!imageUrl || !enabled) {
      setColors(null)
      return
    }

    let cancelled = false
    void extractPaletteFromImage(imageUrl).then((palette) => {
      if (!cancelled) setColors([palette[0], palette[1], palette[2]])
    })

    return () => {
      cancelled = true
    }
  }, [imageUrl, enabled])

  if (!colors) return undefined

  return {
    '--art-glow-1': colors[0],
    '--art-glow-2': colors[1],
    '--art-glow-3': colors[2],
  } as CSSProperties
}
