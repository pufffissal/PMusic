import YTMusic from 'ytmusic-api'

let client: YTMusic | null = null
let initPromise: Promise<YTMusic> | null = null

export async function getYTMusic(): Promise<YTMusic> {
  if (client) return client
  if (!initPromise) {
    initPromise = (async () => {
      const ytm = new YTMusic()
      await ytm.initialize()
      client = ytm
      return ytm
    })().catch((err) => {
      initPromise = null
      throw err
    })
  }
  return initPromise
}

export function resetYTMusicClient(): void {
  client = null
  initPromise = null
}
