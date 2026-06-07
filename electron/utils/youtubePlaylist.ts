export function parseYoutubePlaylistId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (/^[A-Za-z0-9_-]{10,}$/.test(trimmed) && !trimmed.includes(' ')) return trimmed
  const listMatch = trimmed.match(/[?&]list=([A-Za-z0-9_-]+)/)
  if (listMatch?.[1]) return listMatch[1]
  const pathMatch = trimmed.match(/playlist\/([A-Za-z0-9_-]+)/)
  if (pathMatch?.[1]) return pathMatch[1]
  return null
}
