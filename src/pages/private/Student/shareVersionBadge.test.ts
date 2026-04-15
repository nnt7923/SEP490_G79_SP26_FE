import { describe, expect, it } from 'vitest'
import { shouldShowShareUpdateBadge, shouldShowSourceUpdateBadge } from './shareVersionBadge'

describe('shareVersionBadge guards', () => {
  it('shows share update badge when hasNewVersion is true', () => {
    expect(shouldShowShareUpdateBadge({ hasNewVersion: true })).toBe(true)
  })

  it('hides share update badge when hasNewVersion is false-like string', () => {
    expect(shouldShowShareUpdateBadge({ hasNewVersion: 'false' })).toBe(false)
  })

  it('shows source update badge when hasSourceUpdate is true-like string', () => {
    expect(shouldShowSourceUpdateBadge({ hasSourceUpdate: 'true' })).toBe(true)
  })

  it('hides source update badge when hasSourceUpdate is missing', () => {
    expect(shouldShowSourceUpdateBadge({})).toBe(false)
  })
})
