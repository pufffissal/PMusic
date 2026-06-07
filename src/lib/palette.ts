import { Vibrant } from 'node-vibrant/browser'

export const DEFAULT_ACCENT_PALETTE: string[] = [
  '#fa2d48',
  '#bf5af2',
  '#6366f1',
  '#3b82f6',
  '#1d4ed8',
]

async function resolveImageSource(imageUrl: string): Promise<string> {
  if (window.electron?.palette?.imageDataUrl) {
    try {
      return await window.electron.palette.imageDataUrl(imageUrl)
    } catch {
      // fall through to direct URL
    }
  }
  return imageUrl
}

export async function extractAccentFromImage(imageUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const size = 64
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(DEFAULT_ACCENT_PALETTE[0])
        return
      }
      ctx.drawImage(img, 0, 0, size, size)
      try {
        const data = ctx.getImageData(0, 0, size, size).data
        let r = 0
        let g = 0
        let b = 0
        let count = 0
        for (let i = 0; i < data.length; i += 16) {
          const pr = data[i]
          const pg = data[i + 1]
          const pb = data[i + 2]
          const brightness = (pr + pg + pb) / 3
          if (brightness > 40 && brightness < 220) {
            r += pr
            g += pg
            b += pb
            count++
          }
        }
        if (count === 0) {
          resolve(DEFAULT_ACCENT_PALETTE[0])
          return
        }
        const toHex = (n: number) =>
          Math.min(255, Math.round(n / count))
            .toString(16)
            .padStart(2, '0')
        resolve(`#${toHex(r)}${toHex(g)}${toHex(b)}`)
      } catch {
        resolve(DEFAULT_ACCENT_PALETTE[0])
      }
    }
    img.onerror = () => resolve(DEFAULT_ACCENT_PALETTE[0])
    void resolveImageSource(imageUrl).then((src) => {
      img.src = src
    })
  })
}

export async function extractPaletteFromImage(imageUrl: string): Promise<string[]> {
  try {
    const src = await resolveImageSource(imageUrl)
    const palette = await Vibrant.from(src).getPalette()
    return [
      palette.Vibrant?.hex ?? DEFAULT_ACCENT_PALETTE[0],
      palette.DarkVibrant?.hex ?? DEFAULT_ACCENT_PALETTE[1],
      palette.LightVibrant?.hex ?? DEFAULT_ACCENT_PALETTE[2],
      palette.Muted?.hex ?? DEFAULT_ACCENT_PALETTE[3],
      palette.DarkMuted?.hex ?? DEFAULT_ACCENT_PALETTE[4],
    ]
  } catch {
    const single = await extractAccentFromImage(imageUrl)
    return [single, ...DEFAULT_ACCENT_PALETTE.slice(1)]
  }
}
