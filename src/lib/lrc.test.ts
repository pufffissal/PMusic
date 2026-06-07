import { describe, expect, it } from 'vitest'
import {
  parseLrc,
  getActiveLineIndex,
  parseLineWords,
  parseLineClauses,
  splitLineIntoClauses,
  getLineEndTime,
  getActiveWordIndex,
} from '@/lib/lrc'

describe('parseLrc', () => {
  it('parses timestamped lines', () => {
    const lines = parseLrc('[00:12.50]Hello\n[01:00]World')
    expect(lines).toHaveLength(2)
    expect(lines[0].time).toBeCloseTo(12.5, 1)
    expect(lines[0].text).toBe('Hello')
    expect(lines[1].text).toBe('World')
  })

  it('ignores lines without timestamps', () => {
    expect(parseLrc('plain text\n[00:01]Ok')).toHaveLength(1)
  })
})

describe('getActiveLineIndex', () => {
  const lines = parseLrc('[00:10]A\n[00:20]B\n[00:30]C')

  it('returns -1 before first line', () => {
    expect(getActiveLineIndex(lines, 0)).toBe(-1)
  })

  it('returns active line index', () => {
    expect(getActiveLineIndex(lines, 15)).toBe(0)
    expect(getActiveLineIndex(lines, 25)).toBe(1)
  })
})

describe('parseLineWords', () => {
  it('splits words evenly between line timestamps', () => {
    const lrcLines = parseLrc('[00:10.00]Hello beautiful world\n[00:20.00]Next line')
    const words = parseLineWords(lrcLines[0], getLineEndTime(lrcLines, 0))
    expect(words).toHaveLength(3)
    expect(words[0].text).toBe('Hello')
    expect(words[0].time).toBeCloseTo(10, 1)
    expect(words[2].text).toBe('world')
    expect(words[2].time).toBeLessThan(20)
  })

  it('parses inline word timestamps when present', () => {
    const line = { time: 5, text: '<00:05.00>One <00:05.50>two <00:06.00>three' }
    const words = parseLineWords(line, 10)
    expect(words.map((w) => w.text)).toEqual(['One', 'two', 'three'])
    expect(words[1].time).toBeCloseTo(5.5, 2)
  })
})

describe('splitLineIntoClauses', () => {
  it('splits on commas', () => {
    expect(splitLineIntoClauses('Hello, beautiful world, goodbye')).toEqual([
      'Hello',
      'beautiful world',
      'goodbye',
    ])
  })

  it('chunks long lines without punctuation', () => {
    const parts = splitLineIntoClauses(
      'one two three four five six seven eight nine ten eleven',
    )
    expect(parts.length).toBeGreaterThanOrEqual(2)
  })
})

describe('parseLineClauses', () => {
  it('assigns staggered times across clauses', () => {
    const lines = parseLrc('[00:10.00]First part, second part\n[00:20.00]Next')
    const clauses = parseLineClauses(lines[0], getLineEndTime(lines, 0))
    expect(clauses.length).toBeGreaterThanOrEqual(2)
    expect(clauses[0].text).toBe('First part')
    expect(clauses[1].time).toBeGreaterThan(clauses[0].time)
  })
})

describe('getActiveWordIndex', () => {
  const words = [
    { time: 10, text: 'Hello' },
    { time: 11, text: 'world' },
    { time: 12, text: 'again' },
  ]

  it('returns active word', () => {
    expect(getActiveWordIndex(words, 10.5)).toBe(0)
    expect(getActiveWordIndex(words, 11.2)).toBe(1)
    expect(getActiveWordIndex(words, 12)).toBe(2)
  })
})
