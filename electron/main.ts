import './deprecationFilter.js'
import { app, BrowserWindow, ipcMain, globalShortcut, nativeImage, session, protocol } from 'electron'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { registerStreamIpc } from './ipc/stream'
import { registerSearchIpc } from './ipc/search'
import { registerMetadataIpc } from './ipc/metadata'
import { registerLyricsOverridesIpc } from './ipc/lyricsOverrides'
import { registerLibraryIpc } from './ipc/library'
import { registerSettingsIpc } from './ipc/settings'
import { registerSimilarIpc } from './ipc/similar'
import { registerYoutubeIpc } from './ipc/youtube'
import { registerDownloadIpc } from './ipc/download'
import { registerCacheIpc } from './ipc/cache'
import { registerHomeIpc } from './ipc/home'
import { registerPlaybackIpc } from './ipc/playback'
import { registerPaletteIpc } from './ipc/palette'
import { registerCatalogIpc } from './ipc/catalog'
import { registerNotifyIpc, registerUpdateIpc } from './ipc/notify'
import { registerDiscordIPC } from './ipc/discord'
import { disconnectRPC } from './services/discordRPC'
import { registerLocalMediaProtocol } from './ipc/download'
import { initPlayDl } from './services/playDlInit'
import { getYTMusic } from './services/ytClient'
import { getYoutubeSession } from './services/youtubeSession'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let appIcon: Electron.NativeImage | undefined

function resolveAppIcon(): Electron.NativeImage | undefined {
  if (appIcon && !appIcon.isEmpty()) return appIcon

  const roots = [
    process.cwd(),
    path.join(process.cwd(), '..'),
    app.getAppPath(),
    process.resourcesPath,
  ]

  const relativePaths = [
    path.join('src', 'assets', 'icon.png'),
    path.join('resources', 'icon.png'),
    'icon.png',
  ]

  const seen = new Set<string>()
  for (const root of roots) {
    for (const rel of relativePaths) {
      const p = path.join(root, rel)
      if (seen.has(p) || !fs.existsSync(p)) continue
      seen.add(p)
      const img = nativeImage.createFromPath(p)
      if (!img.isEmpty()) {
        appIcon = img
        return appIcon
      }
    }
  }

  return undefined
}

let mainWindow: BrowserWindow | null = null
let miniMode = false
let savedBounds: Electron.Rectangle | null = null

const WINDOW_SIZE = { width: 1440, height: 900 }
const MINI_SIZE = { width: 320, height: 68 }

function createWindow(): void {
  const icon = resolveAppIcon()

  mainWindow = new BrowserWindow({
    ...WINDOW_SIZE,
    minWidth: 1000,
    minHeight: 640,
    frame: false,
    transparent: false,
    backgroundColor: '#060608',
    icon,
    show: false,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 16, y: 18 },
    ...(process.platform === 'darwin' ? { vibrancy: 'under-window' as const } : {}),
    ...(process.platform === 'win32' ? { backgroundMaterial: 'acrylic' as const } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      autoplayPolicy: 'no-user-gesture-required',
    },
  })

  if (icon && process.platform === 'win32') {
    mainWindow.setIcon(icon)
  }

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    if (process.env.OPEN_DEVTOOLS === '1') {
      mainWindow.webContents.openDevTools({ mode: 'detach' })
    }
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('blur', () => {
    mainWindow?.webContents.send('window:blur')
  })

  mainWindow.on('minimize', () => {
    mainWindow?.webContents.send('window:blur')
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function registerWindowIpc(): void {
  ipcMain.handle('window:minimize', () => mainWindow?.minimize())
  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize()
    else mainWindow?.maximize()
  })
  ipcMain.handle('window:close', () => mainWindow?.close())
  ipcMain.handle('window:getMiniMode', () => miniMode)

  ipcMain.handle('window:toggleMini', () => {
    if (!mainWindow) return miniMode
    miniMode = !miniMode
    if (miniMode) {
      savedBounds = mainWindow.getBounds()
      mainWindow.setMinimumSize(MINI_SIZE.width, MINI_SIZE.height)
      mainWindow.setAlwaysOnTop(true, 'floating')
      mainWindow.setSize(MINI_SIZE.width, MINI_SIZE.height, true)
      mainWindow.setResizable(false)
      mainWindow.setBackgroundColor('#1a1a1e')
    } else {
      mainWindow.setAlwaysOnTop(false)
      mainWindow.setResizable(true)
      mainWindow.setMinimumSize(1000, 640)
      mainWindow.setBackgroundColor('#060608')
      if (savedBounds) {
        mainWindow.setBounds(savedBounds)
        savedBounds = null
      } else {
        mainWindow.setSize(WINDOW_SIZE.width, WINDOW_SIZE.height, true)
        mainWindow.center()
      }
    }
    return miniMode
  })
}

function registerGlobalShortcuts(): void {
  const send = (channel: string) => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    mainWindow.webContents.send(channel)
  }

  app.whenReady().then(() => {
    globalShortcut.register('MediaPlayPause', () => send('player:togglePlay'))
    globalShortcut.register('MediaNextTrack', () => send('player:next'))
    globalShortcut.register('MediaPreviousTrack', () => send('player:previous'))

    globalShortcut.register('CommandOrControl+Right', () => send('player:next'))
    globalShortcut.register('CommandOrControl+Left', () => send('player:previous'))
    globalShortcut.register('CommandOrControl+Up', () => send('player:volumeUp'))
    globalShortcut.register('CommandOrControl+Down', () => send('player:volumeDown'))
    globalShortcut.register('CommandOrControl+Shift+M', () => send('player:toggleMute'))
    globalShortcut.register('CommandOrControl+Shift+S', () => send('player:toggleShuffle'))
    globalShortcut.register('CommandOrControl+Shift+R', () => send('player:cycleRepeat'))
  })
}

app.commandLine.appendSwitch('disable-renderer-backgrounding')

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'pmusic-local',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      corsEnabled: true,
    },
  },
])

function registerMediaRequestHeaders(): void {
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['*://*.googlevideo.com/*', '*://*.youtube.com/*'] },
    (details, callback) => {
      const headers = { ...details.requestHeaders }
      if (details.url.includes('googlevideo.com')) {
        headers.Referer = 'https://www.youtube.com/'
        headers.Origin = 'https://www.youtube.com'
      }
      callback({ requestHeaders: headers })
    },
  )
}

app.whenReady().then(async () => {
  const icon = resolveAppIcon()
  if (icon) {
    app.setAppUserModelId('com.pmusic.app')
    if (process.platform === 'darwin') {
      app.dock?.setIcon(icon)
    }
  }

  registerMediaRequestHeaders()
  registerStreamIpc()
  registerSearchIpc()
  registerMetadataIpc()
  registerLyricsOverridesIpc()
  registerLibraryIpc()
  registerSettingsIpc()
  registerSimilarIpc()
  registerYoutubeIpc()
  registerDownloadIpc()
  registerCacheIpc()
  registerHomeIpc()
  registerPlaybackIpc()
  registerPaletteIpc()
  registerCatalogIpc()
  registerNotifyIpc()
  registerUpdateIpc()
  registerDiscordIPC()
  registerLocalMediaProtocol()
  registerWindowIpc()
  registerGlobalShortcuts()
  createWindow()
  void getYoutubeSession().catch((err) => console.warn('[youtube] session bootstrap failed:', err))
  void initPlayDl().catch(() => {})
  void getYTMusic().catch((err) => console.warn('[ytmusic] init failed:', err))

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  void disconnectRPC()
})
