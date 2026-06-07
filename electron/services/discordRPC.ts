import DiscordRPC from 'discord-rpc'
import { PMUSIC_DISCORD_APP_ID } from '../constants/discord.js'

let client: DiscordRPC.Client | null = null
let currentAppId: string | null = null
let isConnected = false
/** User opted in via Settings; blocks reconnect and activity updates when false. */
let rpcUserEnabled = false
let connectInFlight: Promise<void> | null = null
let loginRetryTimeout: ReturnType<typeof setTimeout> | null = null
let lastFailureLogAt = 0

const LOGIN_RETRY_MS = 30_000
const FAILURE_LOG_COOLDOWN_MS = 60_000

export interface RPCTrackData {
  videoId: string
  title: string
  artist: string
  durationSeconds: number
  positionSeconds: number
  isPlaying: boolean
  showProgress?: boolean
}

export function isRpcUserEnabled(): boolean {
  return rpcUserEnabled
}

function clearLoginRetry(): void {
  if (loginRetryTimeout) {
    clearTimeout(loginRetryTimeout)
    loginRetryTimeout = null
  }
}

function scheduleLoginRetry(): void {
  if (!rpcUserEnabled || loginRetryTimeout) return
  loginRetryTimeout = setTimeout(() => {
    loginRetryTimeout = null
    if (rpcUserEnabled) void connectRPC().catch(() => {})
  }, LOGIN_RETRY_MS)
}

function logConnectFailure(err: unknown): void {
  const now = Date.now()
  if (now - lastFailureLogAt < FAILURE_LOG_COOLDOWN_MS) return
  lastFailureLogAt = now
  const msg = err instanceof Error ? err.message : String(err)
  console.log(`[Discord RPC] Discord not running or login failed (${msg})`)
}

async function teardownClient(): Promise<void> {
  clearLoginRetry()

  currentAppId = null

  const activeClient = client
  client = null
  isConnected = false

  if (activeClient) {
    try {
      await activeClient.clearActivity()
      await activeClient.destroy()
    } catch {
      /* ignore */
    }
  }
}

async function doConnect(appId: string): Promise<void> {
  if (client) await teardownClient()

  currentAppId = appId
  DiscordRPC.register(appId)
  client = new DiscordRPC.Client({ transport: 'ipc' })

  client.on('ready', () => {
    isConnected = true
    clearLoginRetry()
    lastFailureLogAt = 0
    console.log('[Discord RPC] Connected')
  })

  client.on('disconnected', () => {
    isConnected = false
    void teardownClient().then(() => scheduleLoginRetry())
  })

  try {
    await client.login({ clientId: appId })
  } catch (err) {
    isConnected = false
    logConnectFailure(err)
    await teardownClient()
    scheduleLoginRetry()
  }
}

export async function connectRPC(): Promise<void> {
  const appId = PMUSIC_DISCORD_APP_ID
  if (!appId) return

  rpcUserEnabled = true

  if (isConnected && currentAppId === appId) return
  if (connectInFlight) return connectInFlight

  connectInFlight = doConnect(appId).finally(() => {
    connectInFlight = null
  })

  return connectInFlight
}

export async function disconnectRPC(): Promise<void> {
  rpcUserEnabled = false
  await teardownClient()
}

function buildActivity(track: RPCTrackData): DiscordRPC.Presence {
  const positionMs = Math.max(0, Math.floor(track.positionSeconds * 1000))
  const durationMs = Math.max(0, Math.floor(track.durationSeconds * 1000))
  const wantsProgress =
    track.showProgress !== false &&
    durationMs > 0

  const activity: DiscordRPC.Presence = {
    details:
      track.title.length > 128 ? `${track.title.slice(0, 125)}...` : track.title,
    state:
      `by ${track.artist}`.length > 128
        ? `by ${track.artist}`.slice(0, 125) + '...'
        : `by ${track.artist}`,
    largeImageKey: `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg`,
    largeImageText: track.title,
    smallImageKey: 'logo',
    smallImageText: 'PMusic',
    buttons: [
      {
        label: 'Open on YouTube Music',
        url: `https://music.youtube.com/watch?v=${track.videoId}`,
      },
    ],
    instance: false,
  }

  if (wantsProgress) {
    const nowMs = Date.now()
    activity.startTimestamp = new Date(nowMs - positionMs)
    if (!track.isPlaying) {
      activity.endTimestamp = new Date(nowMs)
    }
  }

  return activity
}

export async function updateActivity(track: RPCTrackData): Promise<void> {
  if (!rpcUserEnabled || !client || !isConnected) return

  const activity = buildActivity(track)

  try {
    await client.setActivity(activity)
  } catch (err) {
    const { buttons: _buttons, smallImageKey: _small, ...withoutExtras } = activity
    try {
      await client.setActivity(withoutExtras)
    } catch (fallbackErr) {
      console.log('[Discord RPC] setActivity failed:', err, fallbackErr)
    }
  }
}

export async function clearActivity(): Promise<void> {
  if (!client) return
  try {
    await client.clearActivity()
  } catch {
    /* ignore */
  }
}

export function getRPCStatus(): 'connected' | 'disconnected' | 'no-discord' {
  if (!rpcUserEnabled) return 'disconnected'
  if (!client) return 'disconnected'
  if (isConnected) return 'connected'
  return 'no-discord'
}
