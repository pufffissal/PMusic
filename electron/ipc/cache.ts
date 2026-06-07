import { ipcMain } from 'electron'
import { clearDiskCache, formatBytes, getCacheStats } from '../utils/appCache'
import { clearStreamCache } from './stream'
import { clearSearchCache } from './search'
import { clearMetadataCache } from './metadata'

export function registerCacheIpc(): void {
  ipcMain.handle('cache:getStats', () => {
    const stats = getCacheStats()
    return {
      sizeBytes: stats.sizeBytes,
      fileCount: stats.fileCount,
      formatted: formatBytes(stats.sizeBytes),
    }
  })

  ipcMain.handle('cache:clearAll', () => {
    clearStreamCache()
    clearSearchCache()
    clearMetadataCache()
    clearDiskCache()
    const stats = getCacheStats()
    return {
      sizeBytes: stats.sizeBytes,
      fileCount: stats.fileCount,
      formatted: formatBytes(stats.sizeBytes),
    }
  })
}
