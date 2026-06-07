import { describe, expect, it } from 'vitest'
import { parseYoutubePlaylistId } from './youtubePlaylist'

describe('parseYoutubePlaylistId', () => {
  it('accepts bare playlist id', () => {
    expect(parseYoutubePlaylistId('PLrAXtmRdnEQy6nuLMH')).toBe('PLrAXtmRdnEQy6nuLMH')
  })

  it('parses youtube music playlist url', () => {
    expect(
      parseYoutubePlaylistId('https://music.youtube.com/playlist?list=PLabc123xyz'),
    ).toBe('PLabc123xyz')
  })

  it('returns null for empty input', () => {
    expect(parseYoutubePlaylistId('')).toBeNull()
    expect(parseYoutubePlaylistId('   ')).toBeNull()
  })
})
