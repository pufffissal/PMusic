import {
  getYoutubeSession,
  getYoutubeUserAgent,
  invalidateYoutubeSession,
} from './youtubeSession'
import { resetPlayDlInit } from './playDlInit'

export interface InnertubeFormat {
  url?: string
  mimeType?: string
  bitrate?: number
  averageBitrate?: number
  itag?: number
  width?: number
  height?: number
  audioQuality?: string
  audioChannels?: number
}

interface PlayerResponse {
  playabilityStatus?: { status?: string; reason?: string }
  videoDetails?: { lengthSeconds?: string; videoId?: string }
  streamingData?: {
    formats?: InnertubeFormat[]
    adaptiveFormats?: InnertubeFormat[]
  }
}

interface InnertubeClient {
  clientName: string
  clientVersion: string
  userAgent: string
  apiKey?: string
}

const CLIENTS: InnertubeClient[] = [
  {
    clientName: 'ANDROID_VR',
    clientVersion: '1.65.10',
    userAgent: 'com.google.android.apps.youtube.vr.oculus/1.65.10 (Linux; U; Android 12L)',
    apiKey: 'AIzaSyA8eiZmM1VeDVjeBDMjmwd6c0D6v8eiD2U',
  },
  {
    clientName: 'ANDROID',
    clientVersion: '19.17.34',
    userAgent:
      'com.google.android.youtube/19.17.34 (Linux; U; Android 14) gzip',
    apiKey: 'AIzaSyA8eiZmM1VeDVjeBDMjmwd6c0D6v8eiD2U',
  },
  {
    clientName: 'WEB',
    clientVersion: '2.20250217.01.00',
    userAgent: getYoutubeUserAgent(),
  },
]

const playabilityLogged = new Set<string>()

function logPlayabilityOnce(videoId: string, status: string, reason?: string): void {
  const key = `${videoId}:${status}`
  if (playabilityLogged.has(key)) return
  playabilityLogged.add(key)
  if (playabilityLogged.size > 200) playabilityLogged.clear()
  console.warn('[innertube] playability', videoId, status, reason ?? '')
}

function formatsFromResponse(data: PlayerResponse): InnertubeFormat[] {
  return [
    ...(data.streamingData?.formats ?? []),
    ...(data.streamingData?.adaptiveFormats ?? []),
  ]
}

async function playerRequest(
  videoId: string,
  client: InnertubeClient,
  session: Awaited<ReturnType<typeof getYoutubeSession>>,
): Promise<PlayerResponse | null> {
  const apiKey = client.apiKey ?? session.apiKey

  const res = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': client.userAgent,
      Cookie: session.cookieHeader,
      Origin: 'https://music.youtube.com',
      Referer: `https://music.youtube.com/watch?v=${videoId}`,
    },
    body: JSON.stringify({
      context: {
        client: {
          clientName: client.clientName,
          clientVersion: client.clientVersion,
          hl: 'en',
          gl: 'US',
          visitorData: session.visitorData,
        },
        user: { lockedSafetyMode: false },
      },
      videoId,
      contentCheckOk: true,
      racyCheckOk: true,
    }),
    signal: AbortSignal.timeout(12_000),
  })

  if (!res.ok) return null
  return (await res.json()) as PlayerResponse
}

async function tryClients(
  videoId: string,
  session: Awaited<ReturnType<typeof getYoutubeSession>>,
): Promise<{ formats: InnertubeFormat[]; durationSeconds: number } | null> {
  let sawLoginRequired = false

  for (const client of CLIENTS) {
    let data: PlayerResponse | null = null
    try {
      data = await playerRequest(videoId, client, session)
    } catch {
      continue
    }
    if (!data) continue

    const status = data.playabilityStatus?.status
    if (status === 'OK') {
      const formats = formatsFromResponse(data)
      const durationSeconds = Number.parseInt(data.videoDetails?.lengthSeconds ?? '0', 10) || 0
      if (formats.some((f) => f.url)) {
        return { formats, durationSeconds }
      }
    }

    if (status === 'LOGIN_REQUIRED') {
      sawLoginRequired = true
    } else if (status) {
      logPlayabilityOnce(videoId, status, data.playabilityStatus?.reason)
    }
  }

  if (sawLoginRequired) {
    logPlayabilityOnce(videoId, 'LOGIN_REQUIRED', 'bot check — refreshing session')
  }

  return null
}

export async function fetchInnertubeStreamFormats(
  videoId: string,
): Promise<{ formats: InnertubeFormat[]; durationSeconds: number } | null> {
  try {
    let session = await getYoutubeSession()
    let result = await tryClients(videoId, session)
    if (result) return result

    invalidateYoutubeSession()
    resetPlayDlInit()
    session = await getYoutubeSession(true)
    result = await tryClients(videoId, session)
    return result
  } catch (err) {
    console.warn('[innertube] player failed:', videoId, err instanceof Error ? err.message : err)
    return null
  }
}
