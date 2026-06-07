import { app } from 'electron'

import fs from 'fs'

import path from 'path'

import crypto from 'crypto'



export function getCacheRoot(): string {

  const root = path.join(app.getPath('userData'), 'cache')

  fs.mkdirSync(root, { recursive: true })

  return root

}



function cachePath(key: string): string {

  const hash = crypto.createHash('sha256').update(key).digest('hex')

  return path.join(getCacheRoot(), `${hash}.json`)

}



export interface CachedPayload<T> {

  data: T

  cachedAt: number

  expiresAt: number

}



const memoryCache = new Map<string, CachedPayload<unknown>>()



export const CACHE_TTL = {

  /** Direct stream URLs (play-dl) */

  stream: 6 * 60 * 60 * 1000,

  search: 24 * 60 * 60 * 1000,

  home: 24 * 60 * 60 * 1000,

  catalog: 24 * 60 * 60 * 1000,

  metadata: 14 * 24 * 60 * 60 * 1000,

  similar: 8 * 60 * 60 * 1000,

  /** Use expired entries while refreshing in the background */

  staleGrace: 45 * 60 * 1000,

} as const



export const CACHE_LIMITS = {

  /** In-memory hot entries (avoids disk read per hit) */

  memoryEntries: 800,

  /** Max JSON cache files on disk (~metadata, search, home, etc.) */

  maxDiskFiles: 2500,

  /** Soft cap for cache folder size */

  maxDiskBytes: 512 * 1024 * 1024,

} as const



function evictMemoryIfNeeded(): void {

  while (memoryCache.size > CACHE_LIMITS.memoryEntries) {

    let oldestKey: string | null = null

    let oldestAt = Infinity

    for (const [key, payload] of memoryCache) {

      if (payload.cachedAt < oldestAt) {

        oldestAt = payload.cachedAt

        oldestKey = key

      }

    }

    if (oldestKey) memoryCache.delete(oldestKey)

    else break

  }

}



function touchMemory<T>(key: string, payload: CachedPayload<T>): void {

  memoryCache.delete(key)

  memoryCache.set(key, payload as CachedPayload<unknown>)

  evictMemoryIfNeeded()

}



function readPayloadFromDisk<T>(key: string): CachedPayload<T> | null {

  const file = cachePath(key)

  if (!fs.existsSync(file)) return null

  try {

    return JSON.parse(fs.readFileSync(file, 'utf8')) as CachedPayload<T>

  } catch {

    try {

      fs.unlinkSync(file)

    } catch {

      // ignore

    }

    return null

  }

}



const writeQueue = new Map<string, CachedPayload<unknown>>()

let flushTimer: ReturnType<typeof setTimeout> | null = null



function scheduleDiskFlush(): void {

  if (flushTimer) return

  flushTimer = setTimeout(() => {

    flushTimer = null

    const batch = new Map(writeQueue)

    writeQueue.clear()

    for (const [key, payload] of batch) {

      try {

        fs.writeFileSync(cachePath(key), JSON.stringify(payload))

      } catch {

        // ignore write errors

      }

    }

    evictDiskIfNeeded()

  }, 120)

}



function evictDiskIfNeeded(): void {

  const root = getCacheRoot()

  if (!fs.existsSync(root)) return



  const reserved = new Set(['streams.json'])

  const files: { path: string; mtime: number; size: number }[] = []

  let totalBytes = 0



  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {

    if (!entry.isFile() || reserved.has(entry.name)) continue

    const full = path.join(root, entry.name)

    const stat = fs.statSync(full)

    files.push({ path: full, mtime: stat.mtimeMs, size: stat.size })

    totalBytes += stat.size

  }



  if (files.length <= CACHE_LIMITS.maxDiskFiles && totalBytes <= CACHE_LIMITS.maxDiskBytes) return

  files.sort((a, b) => a.mtime - b.mtime)
  let count = files.length
  for (const file of files) {
    if (count <= CACHE_LIMITS.maxDiskFiles && totalBytes <= CACHE_LIMITS.maxDiskBytes) break
    try {
      fs.unlinkSync(file.path)
      totalBytes -= file.size
      count -= 1
      for (const [key] of [...memoryCache]) {
        if (cachePath(key) === file.path) memoryCache.delete(key)
      }
    } catch {
      // ignore
    }
  }
}



export function readCache<T>(key: string): T | null {

  const mem = memoryCache.get(key) as CachedPayload<T> | undefined

  if (mem) {

    if (mem.expiresAt <= Date.now()) {

      memoryCache.delete(key)

      try {

        fs.unlinkSync(cachePath(key))

      } catch {

        // ignore

      }

      return null

    }

    touchMemory(key, mem)

    return mem.data

  }



  const disk = readPayloadFromDisk<T>(key)

  if (!disk) return null

  if (disk.expiresAt <= Date.now()) {

    try {

      fs.unlinkSync(cachePath(key))

    } catch {

      // ignore

    }

    return null

  }



  touchMemory(key, disk)

  return disk.data

}



export function writeCache<T>(key: string, data: T, ttlMs: number): void {

  const payload: CachedPayload<T> = {

    data,

    cachedAt: Date.now(),

    expiresAt: Date.now() + ttlMs,

  }

  touchMemory(key, payload)

  writeQueue.set(key, payload as CachedPayload<unknown>)

  scheduleDiskFlush()

}



export function deleteCacheKey(key: string): void {

  memoryCache.delete(key)

  writeQueue.delete(key)

  const file = cachePath(key)

  if (fs.existsSync(file)) fs.unlinkSync(file)

}



export function readJsonFile<T>(filename: string, fallback: T): T {

  const file = path.join(getCacheRoot(), filename)

  if (!fs.existsSync(file)) return fallback

  try {

    return JSON.parse(fs.readFileSync(file, 'utf8')) as T

  } catch {

    return fallback

  }

}



export function writeJsonFile(filename: string, data: unknown): void {

  const file = path.join(getCacheRoot(), filename)

  fs.writeFileSync(file, JSON.stringify(data))

}



export function deleteJsonFile(filename: string): void {

  const file = path.join(getCacheRoot(), filename)

  if (fs.existsSync(file)) fs.unlinkSync(file)

}



export function getCacheStats(): { sizeBytes: number; fileCount: number } {

  const root = getCacheRoot()

  if (!fs.existsSync(root)) return { sizeBytes: 0, fileCount: 0 }



  let sizeBytes = 0

  let fileCount = 0



  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {

    if (!entry.isFile()) continue

    const stat = fs.statSync(path.join(root, entry.name))

    sizeBytes += stat.size

    fileCount++

  }



  return { sizeBytes, fileCount }

}



export function clearDiskCache(): void {

  memoryCache.clear()

  writeQueue.clear()

  if (flushTimer) {

    clearTimeout(flushTimer)

    flushTimer = null

  }

  const root = getCacheRoot()

  if (!fs.existsSync(root)) return

  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {

    const target = path.join(root, entry.name)

    if (entry.isDirectory()) fs.rmSync(target, { recursive: true, force: true })

    else fs.unlinkSync(target)

  }

}



export function formatBytes(bytes: number): string {

  if (bytes < 1024) return `${bytes} B`

  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`

  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`

}


