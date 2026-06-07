import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { app } from 'electron'
import { youtubeThumbnail } from './mappers'

const cacheDir = () => {
  const dir = path.join(app.getPath('userData'), 'thumbnail-cache')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

const memCache = new Map<string, string>()
const MEM_MAX = 500

function setMemCache(id: string, val: string): void {
  if (memCache.size >= MEM_MAX) memCache.delete(memCache.keys().next().value!)
  memCache.set(id, val)
}

function generatePlaceholder(videoId: string): string {
  const hash = crypto.createHash('md5').update(videoId).digest('hex')
  const h = Number.parseInt(hash.slice(0, 3), 16) % 360
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180">
    <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:hsl(${h},60%,20%)"/>
      <stop offset="100%" style="stop-color:hsl(${(h + 40) % 360},60%,10%)"/>
    </linearGradient></defs>
    <rect width="320" height="180" fill="url(#g)"/>
    <text x="160" y="100" font-size="48" text-anchor="middle" fill="rgba(255,255,255,0.2)">♪</text>
  </svg>`
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

export type ThumbnailSize = 'small' | 'medium' | 'large'

export function getThumbnailUrl(
  videoId: string,
  size: ThumbnailSize = 'medium',
): string {
  switch (size) {
    case 'small':
      return youtubeThumbnail(videoId, 'mq')
    case 'medium':
      return youtubeThumbnail(videoId, 'hq')
    case 'large':
      return youtubeThumbnail(videoId, 'max')
  }
}

async function downloadThumbnailBuffer(videoId: string): Promise<Buffer | null> {
  const urls = [
    youtubeThumbnail(videoId, 'max'),
    youtubeThumbnail(videoId, 'hq'),
    youtubeThumbnail(videoId, 'mq'),
  ]

  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) })
      if (!res.ok) continue

      const contentLength = res.headers.get('content-length')
      if (contentLength && parseInt(contentLength, 10) < 5000) continue

      const buffer = Buffer.from(await res.arrayBuffer())
      if (buffer.length < 5000) continue

      return buffer
    } catch {
      continue
    }
  }

  return null
}

/** Returns CDN URL (fast path for UI). Disk/memory cache used for data URLs when needed. */
export async function getThumbnail(videoId: string): Promise<string> {
  if (memCache.has(videoId)) return memCache.get(videoId)!

  const diskPath = path.join(cacheDir(), `${videoId}.jpg`)
  if (fs.existsSync(diskPath)) {
    const b64 = `data:image/jpeg;base64,${fs.readFileSync(diskPath).toString('base64')}`
    setMemCache(videoId, b64)
    return b64
  }

  const buffer = await downloadThumbnailBuffer(videoId)
  if (buffer) {
    fs.writeFileSync(diskPath, buffer)
    const b64 = `data:image/jpeg;base64,${buffer.toString('base64')}`
    setMemCache(videoId, b64)
    return b64
  }

  const placeholder = generatePlaceholder(videoId)
  setMemCache(videoId, placeholder)
  return placeholder
}

export async function prefetchThumbnails(videoIds: string[]): Promise<void> {
  const dir = cacheDir()
  const uncached = videoIds.filter(
    (id) => id && !memCache.has(id) && !fs.existsSync(path.join(dir, `${id}.jpg`)),
  )
  for (let i = 0; i < uncached.length; i += 5) {
    const chunk = uncached.slice(i, i + 5)
    await Promise.allSettled(chunk.map((id) => getThumbnail(id)))
  }
}
