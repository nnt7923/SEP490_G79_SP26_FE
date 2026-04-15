import { describe, expect, it } from 'vitest'
import { shouldShowBrowserNotification } from './browser'

describe('browser notifications', () => {
  it('does not show a browser notification when the page is visible and focused', () => {
    expect(shouldShowBrowserNotification({
      visibilityState: 'visible',
      hasFocus: () => true,
    })).toBe(false)
  })

  it('shows a browser notification when the page is hidden', () => {
    expect(shouldShowBrowserNotification({
      visibilityState: 'hidden',
      hasFocus: () => false,
    })).toBe(true)
  })

  it('shows a browser notification when the page is visible but unfocused', () => {
    expect(shouldShowBrowserNotification({
      visibilityState: 'visible',
      hasFocus: () => false,
    })).toBe(true)
  })
})
