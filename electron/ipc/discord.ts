import { ipcMain } from 'electron'
import {
  connectRPC,
  disconnectRPC,
  updateActivity,
  clearActivity,
  getRPCStatus,
  type RPCTrackData,
} from '../services/discordRPC'
import { isDiscordRpcConfigured } from '../constants/discord.js'

export function registerDiscordIPC(): void {
  ipcMain.handle('discord:isConfigured', () => isDiscordRpcConfigured())

  ipcMain.handle('discord:connect', async () => {
    await connectRPC()
    return getRPCStatus()
  })

  ipcMain.handle('discord:disconnect', async () => {
    await disconnectRPC()
    return 'disconnected'
  })

  ipcMain.handle('discord:updateActivity', async (_, track: RPCTrackData) => {
    await updateActivity(track)
    return null
  })

  ipcMain.handle('discord:clearActivity', async () => {
    await clearActivity()
    return null
  })

  ipcMain.handle('discord:status', () => getRPCStatus())
}
