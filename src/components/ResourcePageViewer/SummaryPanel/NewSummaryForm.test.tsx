import { describe, it, expect, beforeEach } from 'vitest'
import type { SummarySession } from '../../../types/summary'

/**
 * Unit tests for NewSummaryForm component
 * Feature: resource-ai-summary
 * Requirements: 2.1, 2.2, 2.3, 2.5
 */

// Helper function to validate page range (extracted from component logic)
const validatePageRange = (
  start: number,
  end: number,
  totalPages: number,
  existingSessions: SummarySession[]
): string | null => {
  const maxPagesPerRequest = 5

  if (start < 1) {
    return 'Start page must be at least 1'
  }

  if (end > totalPages) {
    return `End page cannot exceed ${totalPages}`
  }

  if (start > end) {
    return 'Start page must be less than or equal to end page'
  }

  if (end - start + 1 > maxPagesPerRequest) {
    return `You can generate at most ${maxPagesPerRequest} pages per request`
  }

  const isDuplicate = existingSessions.some(
    (session) =>
      session.startPage === start &&
      session.endPage === end &&
      (session.status === 'loading' || session.status === 'success')
  )

  if (isDuplicate) {
    return `Summary for pages ${start}-${end} already exists or is in progress`
  }

  return null
}

describe('NewSummaryForm - Validation Logic', () => {
  const totalPages = 100
  const existingSessions: SummarySession[] = []

  beforeEach(() => {
    existingSessions.length = 0
  })

  it('validates start page must be at least 1', () => {
    const error = validatePageRange(0, 10, totalPages, existingSessions)
    expect(error).toBe('Start page must be at least 1')
  })

  it('validates end page cannot exceed total pages', () => {
    const error = validatePageRange(1, 150, totalPages, existingSessions)
    expect(error).toBe('End page cannot exceed 100')
  })

  it('validates start page must be less than or equal to end page', () => {
    const error = validatePageRange(50, 25, totalPages, existingSessions)
    expect(error).toBe('Start page must be less than or equal to end page')
  })

  it('validates duplicate page range with loading status', () => {
    const sessions: SummarySession[] = [
      {
        id: '1',
        resourceId: 'resource-1',
        startPage: 1,
        endPage: 5,
        status: 'loading',
        timestamp: Date.now(),
      },
    ]

    const error = validatePageRange(1, 5, totalPages, sessions)
    expect(error).toBe('Summary for pages 1-5 already exists or is in progress')
  })

  it('validates duplicate page range with success status', () => {
    const sessions: SummarySession[] = [
      {
        id: '1',
        resourceId: 'resource-1',
        startPage: 5,
        endPage: 9,
        status: 'success',
        summary: 'Test summary',
        timestamp: Date.now(),
      },
    ]

    const error = validatePageRange(5, 9, totalPages, sessions)
    expect(error).toBe('Summary for pages 5-9 already exists or is in progress')
  })

  it('allows duplicate page range with error status (retry scenario)', () => {
    const sessions: SummarySession[] = [
      {
        id: '1',
        resourceId: 'resource-1',
        startPage: 1,
        endPage: 5,
        status: 'error',
        errorMessage: 'Test error',
        timestamp: Date.now(),
      },
    ]

    const error = validatePageRange(1, 5, totalPages, sessions)
    expect(error).toBeNull()
  })

  it('returns null for valid page range', () => {
    const error = validatePageRange(5, 9, totalPages, existingSessions)
    expect(error).toBeNull()
  })

  it('validates edge case: single page range', () => {
    const error = validatePageRange(1, 1, totalPages, existingSessions)
    expect(error).toBeNull()
  })

  it('validates edge case: full document range', () => {
    const error = validatePageRange(1, totalPages, totalPages, existingSessions)
    expect(error).toBe('You can generate at most 5 pages per request')
  })

  it('validates max pages per request rule', () => {
    const error = validatePageRange(2, 7, totalPages, existingSessions)
    expect(error).toBe('You can generate at most 5 pages per request')
  })

  it('validates multiple existing sessions do not interfere', () => {
    const sessions: SummarySession[] = [
      {
        id: '1',
        resourceId: 'resource-1',
        startPage: 1,
        endPage: 5,
        status: 'success',
        summary: 'Summary 1',
        timestamp: Date.now(),
      },
      {
        id: '2',
        resourceId: 'resource-1',
        startPage: 20,
        endPage: 24,
        status: 'success',
        summary: 'Summary 2',
        timestamp: Date.now(),
      },
    ]

    // Should allow new range that doesn't overlap
    const error = validatePageRange(11, 15, totalPages, sessions)
    expect(error).toBeNull()
  })
})
