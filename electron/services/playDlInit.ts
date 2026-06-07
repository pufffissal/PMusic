import play from 'play-dl'
import { getYoutubeSession, getYoutubeUserAgent } from './youtubeSession'

let initialized = false

export async function initPlayDl(): Promise<void> {
  if (initialized) return
  try {
    const session = await getYoutubeSession()
    await play.setToken({
      useragent: [getYoutubeUserAgent()],
      youtube: {
        cookie: session.cookieHeader,
      },
    })
    initialized = true
  } catch (err) {
    console.warn('[play-dl] setToken failed:', err)
    try {
      await play.setToken({
        useragent: [getYoutubeUserAgent()],
      })
      initialized = true
    } catch {
      // ignore
    }
  }
}

export function resetPlayDlInit(): void {
  initialized = false
}
