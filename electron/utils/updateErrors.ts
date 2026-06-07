export function isMissingUpdateFeedError(message: string): boolean {
  return (
    message.includes('latest.yml') ||
    message.includes('ERR_UPDATER_CHANNEL_FILE_NOT_FOUND')
  )
}

export function friendlyUpdateError(message: string): string {
  if (isMissingUpdateFeedError(message)) {
    return 'Auto-update is not set up for this release yet. Download the latest installer from GitHub Releases.'
  }
  if (message.length > 180) {
    return `${message.slice(0, 177)}…`
  }
  return message
}
