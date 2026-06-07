import { describe, expect, it } from 'vitest'
import { friendlyUpdateError, isMissingUpdateFeedError } from './updateErrors'

describe('updateErrors', () => {
  it('detects missing latest.yml feed', () => {
    expect(isMissingUpdateFeedError('404 latest.yml')).toBe(true)
    expect(isMissingUpdateFeedError('network error')).toBe(false)
  })

  it('returns friendly message for missing feed', () => {
    expect(friendlyUpdateError('404 latest.yml')).toContain('GitHub Releases')
  })
})
