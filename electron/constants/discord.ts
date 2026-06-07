/**
 * Built-in Discord Application ID for all PMusic installs (MSI/portable).
 * Users only toggle Rich Presence in Settings — no Developer Portal setup required.
 * Optional: Rich Presence → Art Assets → upload PMusic icon as "logo"
 */
export const PMUSIC_DISCORD_APP_ID = '1513223936253362336'

export function isDiscordRpcConfigured(): boolean {
  return PMUSIC_DISCORD_APP_ID.trim().length > 0
}
