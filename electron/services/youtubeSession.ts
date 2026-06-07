/**
 * Fresh visitorData + cookies from YouTube — required to avoid LOGIN_REQUIRED / bot checks.
 */

const SESSION_TTL_MS = 25 * 60 * 1000
const BOOTSTRAP_URL = 'https://music.youtube.com/'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

export interface YoutubeSession {
  visitorData: string
  apiKey: string
  cookieHeader: string
  fetchedAt: number
}

let cached: YoutubeSession | null = null
let fetchPromise: Promise<YoutubeSession> | null = null

function parseSetCookies(res: Response): string[] {
  const headers = res.headers as Headers & { getSetCookie?: () => string[] }
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie()
  }
  const raw = res.headers.get('set-cookie')
  if (!raw) return []
  return raw.split(/,(?=[^;]+?=)/)
}

function buildCookieHeader(setCookies: string[]): string {
  const parts = new Set<string>(['SOCS=CAI', 'PREF=hl=en&tz=UTC'])
  for (const line of setCookies) {
    const pair = line.split(';')[0]?.trim()
    if (pair) parts.add(pair)
  }
  return [...parts].join('; ')
}

async function bootstrapSession(): Promise<YoutubeSession> {
  const res = await fetch(BOOTSTRAP_URL, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept-Language': 'en-US,en;q=0.9',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(12_000),
  })

  if (!res.ok) {
    throw new Error(`YouTube session bootstrap failed (${res.status})`)
  }

  const html = await res.text()
  const visitorData = html.match(/"visitorData":"([^"]+)"/)?.[1]
  const apiKey =
    html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1] ?? 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8'

  if (!visitorData) {
    throw new Error('Could not extract visitorData from YouTube')
  }

  return {
    visitorData,
    apiKey,
    cookieHeader: buildCookieHeader(parseSetCookies(res)),
    fetchedAt: Date.now(),
  }
}

export async function getYoutubeSession(forceRefresh = false): Promise<YoutubeSession> {
  if (!forceRefresh && cached && Date.now() - cached.fetchedAt < SESSION_TTL_MS) {
    return cached
  }

  if (!fetchPromise || forceRefresh) {
    fetchPromise = bootstrapSession()
      .then((session) => {
        cached = session
        return session
      })
      .catch((err) => {
        fetchPromise = null
        throw err
      })
  }

  return fetchPromise
}

export function invalidateYoutubeSession(): void {
  cached = null
  fetchPromise = null
}

export function getYoutubeUserAgent(): string {
  return USER_AGENT
}
