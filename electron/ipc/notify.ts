import { ipcMain, Notification, BrowserWindow, app } from 'electron'
import { createRequire } from 'node:module'
import { friendlyUpdateError, isMissingUpdateFeedError } from '../utils/updateErrors.js'

const require = createRequire(import.meta.url)

let updateStatus: 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error' = 'idle'
let updateInfo: { version?: string; error?: string; percent?: number } = {}

function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload)
  }
}

export function registerNotifyIpc(): void {
  ipcMain.handle(
    'notify:show',
    (_, payload: { title: string; body?: string; silent?: boolean }) => {
      if (!Notification.isSupported()) return false
      const n = new Notification({
        title: payload.title,
        body: payload.body,
        silent: payload.silent ?? false,
      })
      n.show()
      return true
    },
  )
}

export function registerUpdateIpc(): void {
  const registerDisabledHandlers = (message?: string) => {
    ipcMain.handle('update:check', () => ({
      status: 'idle' as const,
      ...(message ? { message } : {}),
    }))
    ipcMain.handle('update:download', () => false)
    ipcMain.handle('update:getStatus', () => ({ status: 'idle' as const }))
    ipcMain.handle('update:install', () => false)
  }

  if (!app.isPackaged) {
    registerDisabledHandlers('Updates disabled in dev')
    return
  }

  let autoUpdater: import('electron-updater').AppUpdater
  try {
    ;({ autoUpdater } = require('electron-updater') as typeof import('electron-updater'))
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn('Auto-update unavailable:', message)
    registerDisabledHandlers('Auto-update unavailable')
    return
  }

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'pufffissal',
    repo: 'PMusic',
  })

  autoUpdater.on('checking-for-update', () => {
    updateStatus = 'checking'
    broadcast('update:status', { status: updateStatus })
  })

  autoUpdater.on('update-available', (info) => {
    updateStatus = 'available'
    updateInfo = { version: info.version }
    broadcast('update:status', { status: updateStatus, version: info.version })
  })

  autoUpdater.on('update-not-available', () => {
    updateStatus = 'idle'
    broadcast('update:status', { status: updateStatus })
  })

  autoUpdater.on('download-progress', (progress) => {
    updateStatus = 'downloading'
    updateInfo = { ...updateInfo, percent: progress.percent }
    broadcast('update:status', {
      status: updateStatus,
      version: updateInfo.version,
      percent: progress.percent,
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    updateStatus = 'ready'
    updateInfo = { version: info.version }
    broadcast('update:status', { status: updateStatus, version: info.version })
  })

  autoUpdater.on('error', (err) => {
    if (isMissingUpdateFeedError(err.message)) {
      updateStatus = 'idle'
      updateInfo = {}
      console.warn('[update] Release has no latest.yml yet:', err.message)
      broadcast('update:status', { status: updateStatus })
      return
    }
    updateStatus = 'error'
    updateInfo = { error: friendlyUpdateError(err.message) }
    broadcast('update:status', { status: updateStatus, error: updateInfo.error })
  })

  ipcMain.handle('update:check', async () => {
    try {
      await autoUpdater.checkForUpdates()
      return { status: updateStatus, ...updateInfo }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (isMissingUpdateFeedError(message)) {
        updateStatus = 'idle'
        updateInfo = {}
        return { status: updateStatus, message: friendlyUpdateError(message) }
      }
      updateStatus = 'error'
      updateInfo = { error: friendlyUpdateError(message) }
      return { status: updateStatus, error: updateInfo.error }
    }
  })

  ipcMain.handle('update:download', async () => {
    try {
      await autoUpdater.downloadUpdate()
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('update:install', () => {
    if (updateStatus !== 'ready') return false
    autoUpdater.quitAndInstall()
    return true
  })

  ipcMain.handle('update:getStatus', () => ({ status: updateStatus, ...updateInfo }))

  setTimeout(() => {
    void autoUpdater.checkForUpdates().catch(() => {})
  }, 8000)
}
