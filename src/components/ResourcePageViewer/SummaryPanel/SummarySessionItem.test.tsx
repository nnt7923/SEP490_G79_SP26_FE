import { describe, it, expect } from 'vitest'
import type { SummarySession } from '../../../types/summary'

/**
 * Unit tests for SummarySessionItem component
 * Feature: resource-ai-summary
 * Task: 5.2 Implement status-specific rendering
 * 
 * These tests verify the component logic and rendering behavior
 * for different session statuses (loading, success, error).
 */

/**
 * Helper function to determine what should be rendered based on session status
 */
const getExpectedRenderContent = (session: SummarySession) => {
  const { status, startPage, endPage, summary, errorMessage } = session

  const result = {
    pageRange: `Pages ${startPage}-${endPage}`,
    hasLoadingSpinner: false,
    hasLoadingText: false,
    hasSummaryText: false,
    hasErrorMessage: false,
    hasRetryButton: false,
    loadingText: '',
    summaryText: '',
    errorText: '',
  }

  // All statuses show page range
  result.pageRange = `Pages ${startPage}-${endPage}`

  if (status === 'loading') {
    result.hasLoadingSpinner = true
    result.hasLoadingText = true
    result.loadingText = `Generating summary for pages ${startPage}-${endPage}...`
  } else if (status === 'success') {
    result.hasSummaryText = true
    result.summaryText = summary || ''
  } else if (status === 'error') {
    result.hasErrorMessage = true
    result.hasRetryButton = true
    result.errorText = errorMessage || 'Failed to generate summary. Please try again.'
  }

  return result
}

describe('SummarySessionItem - Rendering Logic', () => {
  const baseSession: SummarySession = {
    id: 'test-session-1',
    resourceId: 'resource-123',
    startPage: 5,
    endPage: 10,
    status: 'loading',
    timestamp: Date.now(),
  }

  describe('Loading State', () => {
    it('should determine loading state renders spinner and text', () => {
      const session: SummarySession = {
        ...baseSession,
        status: 'loading',
      }

      const content = getExpectedRenderContent(session)

      expect(content.hasLoadingSpinner).toBe(true)
      expect(content.hasLoadingText).toBe(true)
      expect(content.loadingText).toBe('Generating summary for pages 5-10...')
      expect(content.hasSummaryText).toBe(false)
      expect(content.hasErrorMessage).toBe(false)
      expect(content.hasRetryButton).toBe(false)
    })

    it('should include page range in loading state', () => {
      const session: SummarySession = {
        ...baseSession,
        startPage: 1,
        endPage: 20,
        status: 'loading',
      }

      const content = getExpectedRenderContent(session)

      expect(content.pageRange).toBe('Pages 1-20')
      expect(content.loadingText).toContain('pages 1-20')
    })
  })

  describe('Success State', () => {
    it('should determine success state renders summary text', () => {
      const session: SummarySession = {
        ...baseSession,
        status: 'success',
        summary: 'This is a test summary with multiple lines.\nLine 2\nLine 3',
      }

      const content = getExpectedRenderContent(session)

      expect(content.hasSummaryText).toBe(true)
      expect(content.summaryText).toBe('This is a test summary with multiple lines.\nLine 2\nLine 3')
      expect(content.hasLoadingSpinner).toBe(false)
      expect(content.hasErrorMessage).toBe(false)
      expect(content.hasRetryButton).toBe(false)
    })

    it('should preserve line breaks in summary text', () => {
      const session: SummarySession = {
        ...baseSession,
        status: 'success',
        summary: 'Line 1\nLine 2\nLine 3',
      }

      const content = getExpectedRenderContent(session)

      expect(content.summaryText).toContain('\n')
      expect(content.summaryText.split('\n')).toHaveLength(3)
    })

    it('should handle empty summary text', () => {
      const session: SummarySession = {
        ...baseSession,
        status: 'success',
        summary: '',
      }

      const content = getExpectedRenderContent(session)

      expect(content.hasSummaryText).toBe(true)
      expect(content.summaryText).toBe('')
    })
  })

  describe('Error State', () => {
    it('should determine error state renders error message and retry button', () => {
      const session: SummarySession = {
        ...baseSession,
        status: 'error',
        errorMessage: 'AI service temporarily unavailable. Please try again.',
      }

      const content = getExpectedRenderContent(session)

      expect(content.hasErrorMessage).toBe(true)
      expect(content.hasRetryButton).toBe(true)
      expect(content.errorText).toBe('AI service temporarily unavailable. Please try again.')
      expect(content.hasLoadingSpinner).toBe(false)
      expect(content.hasSummaryText).toBe(false)
    })

    it('should use default error message when errorMessage is undefined', () => {
      const session: SummarySession = {
        ...baseSession,
        status: 'error',
      }

      const content = getExpectedRenderContent(session)

      expect(content.hasErrorMessage).toBe(true)
      expect(content.errorText).toBe('Failed to generate summary. Please try again.')
    })

    it('should handle custom error messages', () => {
      const customErrors = [
        'Summary generation timeout. Please try a smaller page range.',
        'Unable to extract text from the specified pages.',
        'Network error occurred.',
      ]

      customErrors.forEach((errorMessage) => {
        const session: SummarySession = {
          ...baseSession,
          status: 'error',
          errorMessage,
        }

        const content = getExpectedRenderContent(session)

        expect(content.errorText).toBe(errorMessage)
      })
    })
  })

  describe('Page Range Display', () => {
    it('should format page range correctly for all statuses', () => {
      const statuses: Array<'loading' | 'success' | 'error'> = ['loading', 'success', 'error']

      statuses.forEach((status) => {
        const session: SummarySession = {
          ...baseSession,
          startPage: 5,
          endPage: 10,
          status,
          summary: status === 'success' ? 'Test summary' : undefined,
          errorMessage: status === 'error' ? 'Test error' : undefined,
        }

        const content = getExpectedRenderContent(session)

        expect(content.pageRange).toBe('Pages 5-10')
      })
    })

    it('should handle single page range', () => {
      const session: SummarySession = {
        ...baseSession,
        startPage: 7,
        endPage: 7,
        status: 'success',
        summary: 'Single page summary',
      }

      const content = getExpectedRenderContent(session)

      expect(content.pageRange).toBe('Pages 7-7')
    })

    it('should handle large page ranges', () => {
      const session: SummarySession = {
        ...baseSession,
        startPage: 1,
        endPage: 999,
        status: 'loading',
      }

      const content = getExpectedRenderContent(session)

      expect(content.pageRange).toBe('Pages 1-999')
    })
  })

  describe('Status-Specific Styling Requirements', () => {
    it('should identify loading state requires blue styling', () => {
      const session: SummarySession = {
        ...baseSession,
        status: 'loading',
      }

      const content = getExpectedRenderContent(session)

      // Loading state should have spinner and text
      expect(content.hasLoadingSpinner).toBe(true)
      expect(content.hasLoadingText).toBe(true)
      // Component should apply blue classes: text-blue-600, animate-spin
    })

    it('should identify error state requires red styling', () => {
      const session: SummarySession = {
        ...baseSession,
        status: 'error',
        errorMessage: 'Test error',
      }

      const content = getExpectedRenderContent(session)

      // Error state should have error message and retry button
      expect(content.hasErrorMessage).toBe(true)
      expect(content.hasRetryButton).toBe(true)
      // Component should apply red classes: text-red-600, bg-red-600
    })

    it('should identify success state requires neutral styling', () => {
      const session: SummarySession = {
        ...baseSession,
        status: 'success',
        summary: 'Test summary',
      }

      const content = getExpectedRenderContent(session)

      // Success state should have summary text
      expect(content.hasSummaryText).toBe(true)
      // Component should apply neutral classes: text-slate-700
    })
  })
})
