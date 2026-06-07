/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach } from 'vitest'
import { usePlayerStore } from '@/store/playerStore'

const track = (id: string) => ({
  id,
  title: `Title ${id}`,
  artist: 'Artist',
  thumbnail: 'https://example.com/a.jpg',
})

describe('playerStore', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      queue: [],
      currentIndex: 0,
      isPlaying: false,
      shuffle: false,
      repeat: 'off',
      currentTime: 0,
      seekOnLoad: null,
      error: null,
      errorKind: null,
    })
  })

  it('playQueue sets queue and index', () => {
    usePlayerStore.getState().playQueue([track('a'), track('b')], 1)
    const s = usePlayerStore.getState()
    expect(s.queue).toHaveLength(2)
    expect(s.currentIndex).toBe(1)
    expect(s.isPlaying).toBe(true)
  })

  it('next advances index', () => {
    usePlayerStore.getState().playQueue([track('a'), track('b')], 0)
    usePlayerStore.getState().next()
    expect(usePlayerStore.getState().currentIndex).toBe(1)
  })

  it('repeat one restarts current track', () => {
    usePlayerStore.getState().playQueue([track('a')], 0)
    usePlayerStore.setState({ repeat: 'one', currentTime: 40 })
    usePlayerStore.getState().next()
    expect(usePlayerStore.getState().currentIndex).toBe(0)
    expect(usePlayerStore.getState().currentTime).toBe(0)
  })

  it('addToQueueNext inserts after current', () => {
    usePlayerStore.getState().playQueue([track('a'), track('b')], 0)
    usePlayerStore.getState().addToQueueNext(track('c'))
    expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual(['a', 'c', 'b'])
  })
})
