import { ipcMain } from 'electron'
import { getAppSettings } from './settings'
import {
  clearStreamCache,
  getStreamUrl,
  initStreamService,
  invalidateStream,
  prefetchStreams,
} from '../services/streamService'

export function registerStreamIpc(): void {
  initStreamService()

  ipcMain.handle('stream:getUrl', async (_, videoId: string, options?: { skipCache?: boolean; quality?: string }) => {
    const settingsQuality = getAppSettings().streamQuality ?? 'best'
    const quality = (options?.quality as typeof settingsQuality) ?? settingsQuality
    return getStreamUrl(videoId, quality, options?.skipCache)
  })

  ipcMain.handle('stream:prefetch', async (_, videoIds: string[]) => {
    const quality = getAppSettings().streamQuality ?? 'best'
    prefetchStreams(videoIds, quality)
  })

  ipcMain.handle('stream:clearCache', () => {
    clearStreamCache()
  })

  ipcMain.handle('stream:invalidate', (_, videoId: string) => {
    invalidateStream(videoId)
  })
}

export { clearStreamCache }
