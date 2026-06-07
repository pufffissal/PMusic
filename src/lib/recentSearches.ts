const STORAGE_KEY = 'pmusic:recent-searches'
const MAX = 8

export function getRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((q) => typeof q === 'string').slice(0, MAX) : []
  } catch {
    return []
  }
}

export function pushRecentSearch(query: string): string[] {
  const trimmed = query.trim()
  if (trimmed.length < 2) return getRecentSearches()
  const next = [trimmed, ...getRecentSearches().filter((q) => q.toLowerCase() !== trimmed.toLowerCase())].slice(
    0,
    MAX,
  )
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export function clearRecentSearches(): void {
  localStorage.removeItem(STORAGE_KEY)
}
