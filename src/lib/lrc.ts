export interface LrcLine {
  time: number
  text: string
}

/** Timed fragment within a line (word or clause). */
export interface LrcWord {
  time: number
  text: string
}

export type LyricsSyncMode = 'line' | 'clause' | 'word'

const INLINE_TIME_RE = /<(\d+):(\d{2})(?:\.(\d{2,3}))?>/g

function parseTimestampParts(min: string, sec: string, frac?: string): number {
  const fraction = frac ? parseInt(frac.padEnd(3, '0').slice(0, 3), 10) / 1000 : 0
  return parseInt(min, 10) * 60 + parseInt(sec, 10) + fraction
}

export function parseLrc(lrc: string): LrcLine[] {
  const lines: LrcLine[] = []
  for (const raw of lrc.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const matches = [...line.matchAll(/\[(\d+):(\d{2})(?:\.(\d{2,3}))?\]/g)]
    if (!matches.length) continue
    const last = matches[matches.length - 1]
    const min = parseInt(last[1], 10)
    const sec = parseInt(last[2], 10)
    const frac = last[3] ? parseInt(last[3].padEnd(3, '0').slice(0, 3), 10) / 1000 : 0
    const time = min * 60 + sec + frac
    const text = line.replace(/\[(\d+):(\d{2})(?:\.(\d{2,3}))?\]/g, '').trim()
    if (text) lines.push({ time, text })
  }
  return lines.sort((a, b) => a.time - b.time)
}

export function getActiveLineIndex(lines: LrcLine[], currentTime: number): number {
  if (!lines.length) return -1
  let idx = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time <= currentTime + 0.25) idx = i
    else break
  }
  return idx
}

/** End time for a line — next line timestamp or a length-based estimate. */
export function getLineEndTime(lines: LrcLine[], index: number): number {
  const line = lines[index]
  if (!line) return 0
  const next = lines[index + 1]
  if (next) return next.time
  const wordCount = line.text.split(/\s+/).filter(Boolean).length
  return line.time + Math.max(2.5, wordCount * 0.35)
}

function expandSegmentsEvenly(
  parts: string[],
  start: number,
  end: number,
  minSpanPerPart: number,
): LrcWord[] {
  if (!parts.length) return []
  const weights = parts.map((p) => Math.max(p.length, 2))
  const totalWeight = weights.reduce((sum, w) => sum + w, 0)
  const span = Math.max(end - start, parts.length * minSpanPerPart)
  let t = start
  return parts.map((text, i) => {
    const seg = { text, time: t }
    t += (weights[i] / totalWeight) * span
    return seg
  })
}

function expandWordsEvenly(text: string, start: number, end: number): LrcWord[] {
  const parts = text.split(/\s+/).filter(Boolean)
  return expandSegmentsEvenly(parts, start, end, 0.12)
}

/** Split a lyric line into natural clauses (punctuation / breath groups). */
export function splitLineIntoClauses(text: string): string[] {
  const clean = text.replace(INLINE_TIME_RE, '').replace(/\s+/g, ' ').trim()
  if (!clean) return []

  const byPunctuation = clean
    .split(/\s*[,;]\s*|\s+—\s+|\s+–\s+|\s+\.\s+(?=[A-ZÀ-ÖØ-öø-ÿ])/)
    .map((s) => s.trim())
    .filter(Boolean)

  if (byPunctuation.length >= 2) return byPunctuation

  const byConjunction = clean
    .split(/\s+(?=(?:and|but|or|yet|so|when|if|'cause|cause|oh|yeah|well)\s+)/i)
    .map((s) => s.trim())
    .filter(Boolean)

  if (byConjunction.length >= 2 && clean.length > 28) return byConjunction

  const words = clean.split(/\s+/).filter(Boolean)
  if (words.length <= 7) return [clean]

  const targetChunks = Math.min(4, Math.max(2, Math.ceil(words.length / 5)))
  const chunkSize = Math.ceil(words.length / targetChunks)
  const clauses: string[] = []
  for (let i = 0; i < words.length; i += chunkSize) {
    clauses.push(words.slice(i, i + chunkSize).join(' '))
  }
  return clauses.length ? clauses : [clean]
}

function expandClausesEvenly(text: string, start: number, end: number): LrcWord[] {
  const clauses = splitLineIntoClauses(text)
  if (clauses.length <= 1) return clauses.length === 1 ? [{ text: clauses[0], time: start }] : []
  return expandSegmentsEvenly(clauses, start, end, 0.22)
}

/** Word timings from inline `<mm:ss.xx>` tags, or even spacing between line start and end. */
export function parseLineWords(line: LrcLine, endTime: number): LrcWord[] {
  const raw = line.text
  const tags: { time: number; contentStart: number; tagIndex: number }[] = []
  const re = new RegExp(INLINE_TIME_RE.source, 'g')
  let match: RegExpExecArray | null
  while ((match = re.exec(raw)) !== null) {
    tags.push({
      time: parseTimestampParts(match[1], match[2], match[3]),
      contentStart: match.index + match[0].length,
      tagIndex: match.index,
    })
  }

  if (tags.length > 0) {
    const words: LrcWord[] = []
    for (let i = 0; i < tags.length; i++) {
      const end = i + 1 < tags.length ? tags[i + 1].tagIndex : raw.length
      const text = raw.slice(tags[i].contentStart, end).trim()
      if (text) words.push({ time: tags[i].time, text })
    }
    if (words.length) return words
  }

  const clean = raw.replace(INLINE_TIME_RE, '').trim()
  return expandWordsEvenly(clean, line.time, endTime)
}

/** Clause timings — estimated from line bounds (no per-clause tags in standard LRC). */
export function parseLineClauses(line: LrcLine, endTime: number): LrcWord[] {
  const raw = line.text
  const tags: { time: number; contentStart: number; tagIndex: number }[] = []
  const re = new RegExp(INLINE_TIME_RE.source, 'g')
  let match: RegExpExecArray | null
  while ((match = re.exec(raw)) !== null) {
    tags.push({
      time: parseTimestampParts(match[1], match[2], match[3]),
      contentStart: match.index + match[0].length,
      tagIndex: match.index,
    })
  }

  if (tags.length > 1) {
    const words: LrcWord[] = []
    for (let i = 0; i < tags.length; i++) {
      const end = i + 1 < tags.length ? tags[i + 1].tagIndex : raw.length
      const text = raw.slice(tags[i].contentStart, end).trim()
      if (text) words.push({ time: tags[i].time, text })
    }
    const clauses: LrcWord[] = []
    let bucket: string[] = []
    let bucketStart = words[0]?.time ?? line.time
    const flush = () => {
      if (!bucket.length) return
      clauses.push({ time: bucketStart, text: bucket.join(' ') })
      bucket = []
    }
    for (const w of words) {
      const endsClause = /[,;—–-]$/.test(w.text) || /^(and|but|or|yet|so)$/i.test(w.text)
      if (!bucket.length) bucketStart = w.time
      bucket.push(w.text)
      if (endsClause) flush()
    }
    flush()
    if (clauses.length >= 2) return clauses
    if (words.length) return words
  }

  const clean = raw.replace(INLINE_TIME_RE, '').trim()
  return expandClausesEvenly(clean, line.time, endTime)
}

export function getActiveWordIndex(words: LrcWord[], currentTime: number): number {
  if (!words.length) return -1
  let idx = -1
  for (let i = 0; i < words.length; i++) {
    if (words[i].time <= currentTime + 0.05) idx = i
    else break
  }
  return idx
}
