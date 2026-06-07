import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  parseLrc,
  getActiveLineIndex,
  parseLineWords,
  parseLineClauses,
  getLineEndTime,
  getActiveWordIndex,
  type LrcWord,
} from '@/lib/lrc'
import { cn } from '@/lib/cn'
import { useSettingsStore } from '@/store/settingsStore'
import { StaticLyrics } from '@/components/player/StaticLyrics'

interface SyncedLyricsProps {
  syncedLyrics: string
  plainLyrics?: string
  currentTime: number
  /** Positive = delay lyrics (fixes early lyrics). Applied when matching lines/words. */
  offsetMs?: number
  onSeek?: (time: number) => void
  centered?: boolean
  className?: string
}

const SIZE_CLASSES = {
  small: 'text-xl lg:text-2xl gap-4',
  medium: 'text-2xl lg:text-3xl gap-5',
  large: 'text-3xl lg:text-4xl gap-6',
} as const

function LyricSegments({
  segments,
  matchTime,
  seekOffsetSec,
  onSeek,
  reduceMotion,
  segmentClassName,
}: {
  segments: LrcWord[]
  matchTime: number
  seekOffsetSec: number
  onSeek?: (time: number) => void
  reduceMotion: boolean
  segmentClassName?: string
}) {
  const activeIndex = getActiveWordIndex(segments, matchTime)

  return (
    <span className="inline-flex flex-wrap justify-center gap-x-[0.35em] gap-y-1">
      {segments.map((segment, i) => {
        const active = i === activeIndex
        const past = i < activeIndex
        return (
          <motion.span
            key={`${segment.time}-${i}-${segment.text.slice(0, 12)}`}
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation()
              onSeek?.(segment.time + seekOffsetSec)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSeek?.(segment.time + seekOffsetSec)
              }
            }}
            className={cn(
              'now-playing__lyric-word cursor-pointer rounded-md px-0.5',
              segmentClassName,
              active && 'now-playing__lyric-word--active',
              past && !active && 'now-playing__lyric-word--past',
              !active && !past && 'now-playing__lyric-word--upcoming',
            )}
            animate={{
              opacity: active ? 1 : past ? 0.52 : 0.38,
              scale: active && !reduceMotion ? 1.08 : 1,
              y: active && !reduceMotion ? -1 : 0,
            }}
            transition={{
              duration: reduceMotion ? 0 : 0.2,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {segment.text}
          </motion.span>
        )
      })}
    </span>
  )
}

export function SyncedLyrics({
  syncedLyrics,
  plainLyrics,
  currentTime,
  offsetMs = 0,
  onSeek,
  centered = true,
  className,
}: SyncedLyricsProps) {
  const lines = useMemo(() => parseLrc(syncedLyrics), [syncedLyrics])
  const matchTime = currentTime - offsetMs / 1000
  const seekOffsetSec = offsetMs / 1000
  const activeIndex = getActiveLineIndex(lines, matchTime)
  const lyricsSize = useSettingsStore((s) => s.settings.lyricsFontSize)
  const scrollStaticLyrics = useSettingsStore((s) => s.settings.scrollStaticLyrics)
  const reduceMotion = useSettingsStore((s) => s.settings.reduceMotion)
  const lyricsSyncMode = useSettingsStore((s) => s.settings.lyricsSyncMode)

  const segmentLines = useMemo(() => {
    return lines.map((line, i) => {
      const end = getLineEndTime(lines, i)
      if (lyricsSyncMode === 'word') return parseLineWords(line, end)
      if (lyricsSyncMode === 'clause') return parseLineClauses(line, end)
      return []
    })
  }, [lines, lyricsSyncMode])

  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const lineRefs = useRef<(HTMLParagraphElement | null)[]>([])
  const [offsetY, setOffsetY] = useState(0)

  useEffect(() => {
    lineRefs.current = lineRefs.current.slice(0, lines.length)
  }, [lines.length])

  useEffect(() => {
    setOffsetY(0)
  }, [syncedLyrics])

  useEffect(() => {
    const viewport = viewportRef.current
    const activeEl = lineRefs.current[activeIndex]
    const track = trackRef.current
    if (!viewport || !activeEl || !track) return

    const scrollActive = () => {
      const viewportH = viewport.clientHeight
      const trackH = track.scrollHeight
      const lineOffset = activeEl.offsetTop
      const lineH = activeEl.offsetHeight

      let offset = viewportH / 2 - lineOffset - lineH / 2
      const maxOffset = 0
      const minOffset = Math.min(0, viewportH - trackH)
      offset = Math.min(maxOffset, Math.max(minOffset, offset))
      setOffsetY(offset)
    }

    scrollActive()
    const ro = new ResizeObserver(scrollActive)
    ro.observe(viewport)
    ro.observe(track)
    return () => ro.disconnect()
  }, [activeIndex, lines, lyricsSize, lyricsSyncMode])

  if (!lines.length) {
    return (
      <StaticLyrics
        text={plainLyrics || 'No synced lyrics available.'}
        scrollable={scrollStaticLyrics}
        centered={centered}
        className={className}
      />
    )
  }

  return (
    <div ref={viewportRef} className={cn('relative h-full w-full overflow-hidden', className)}>
      <div
        ref={trackRef}
        className={cn(
          'flex w-full flex-col will-change-transform',
          SIZE_CLASSES[lyricsSize],
          centered && 'items-center',
          !reduceMotion && 'transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
        )}
        style={{ transform: `translateY(${offsetY}px)` }}
      >
        {lines.map((line, i) => {
          const active = i === activeIndex
          const past = i < activeIndex
          const segments = segmentLines[i]
          const useSegmentMode =
            active && segments.length > 0 && (lyricsSyncMode === 'word' || lyricsSyncMode === 'clause')
          const isClause = lyricsSyncMode === 'clause'

          return (
            <motion.p
              key={`${line.time}-${i}`}
              ref={(el) => {
                lineRefs.current[i] = el
              }}
              onClick={() => !useSegmentMode && onSeek?.(line.time + seekOffsetSec)}
              className={cn(
                'max-w-3xl font-semibold tracking-tight',
                centered && 'text-center',
                useSegmentMode ? 'leading-relaxed' : 'cursor-pointer',
                !useSegmentMode && active && 'scale-[1.03] text-[var(--accent)]',
                past && !active && 'now-playing__lyric-past',
                !active && !past && 'now-playing__lyric-upcoming',
                active && !useSegmentMode && 'text-[var(--accent)]',
              )}
              animate={{ opacity: active ? 1 : past ? 0.3 : 0.45 }}
              transition={{ duration: reduceMotion ? 0 : 0.25 }}
            >
              {useSegmentMode ? (
                <LyricSegments
                  segments={segments}
                  matchTime={matchTime}
                  seekOffsetSec={seekOffsetSec}
                  onSeek={onSeek}
                  reduceMotion={reduceMotion}
                  segmentClassName={isClause ? 'now-playing__lyric-clause' : undefined}
                />
              ) : (
                line.text || '♪'
              )}
            </motion.p>
          )
        })}
      </div>
    </div>
  )
}
