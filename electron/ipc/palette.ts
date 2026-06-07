import { ipcMain } from 'electron'

async function fetchImageAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    signal: AbortSignal.timeout(12_000),
  })
  if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`)
  const contentType = res.headers.get('content-type')?.split(';')[0] ?? 'image/jpeg'
  const buf = Buffer.from(await res.arrayBuffer())
  return `data:${contentType};base64,${buf.toString('base64')}`
}

export function registerPaletteIpc(): void {
  ipcMain.handle('palette:imageDataUrl', (_, url: string) => fetchImageAsDataUrl(url))
}
