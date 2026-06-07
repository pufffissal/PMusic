import { cn } from '@/lib/cn'
import { useSettingsStore } from '@/store/settingsStore'

interface StaticLyricsProps {
  text: string
  scrollable?: boolean
  centered?: boolean
  className?: string
}

const SIZE_CLASSES = {
  small: 'text-base lg:text-lg',
  medium: 'text-lg lg:text-xl',
  large: 'text-xl lg:text-2xl',
} as const

export function StaticLyrics({
  text,
  scrollable = true,
  centered = true,
  className,
}: StaticLyricsProps) {
  const lyricsSize = useSettingsStore((s) => s.settings.lyricsFontSize)

  return (
    <div
      className={cn(
        'now-playing__lyrics-static min-h-0 w-full flex-1',
        scrollable ? 'now-playing__lyrics-static--scroll' : 'now-playing__lyrics-static--fixed',
        className,
      )}
    >
      <pre
        className={cn(
          'max-w-3xl font-sans leading-relaxed whitespace-pre-wrap text-fg-secondary',
          SIZE_CLASSES[lyricsSize],
          centered && 'mx-auto text-center',
        )}
      >
        {text}
      </pre>
    </div>
  )
}
