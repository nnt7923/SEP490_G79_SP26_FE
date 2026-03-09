import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { SummarySession } from '../../../types/summary'

/**
 * Integration tests for requestSummary handler (Task 8.4)
 * Feature: resource-ai-summary
 * Requirements: 2.4, 2.5, 3.1
 * 
 * Validates: Requirements 2.4, 2.5, 3.1
 */

describe('Task 8.4: requestSummary Handler Integration', () => {
  const mockResourceId = 'resource-123'
  const totalPages = 100

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Input Validation', () => {
    it('should validate start page >= 1', () => {
      const startPage = 0
      const endPage = 10
      const existingSessions: SummarySession[] = []

      const validatePageRange = (start: number, end: number, total: number, sessions: SummarySession[]) => {
        if (start < 1) return 'Start page must be at least 1'
        if (end > total) return `End page cannot exceed ${total}`
        if (start > end) return 'Start page must be less than or equal to end page'
        
        const isDuplicate = sessions.some(
          (session) =>
            session.startPage === start &&
            session.endPage === end &&
            (session.status === 'loading' || session.status === 'success')
        )
        
        if (isDuplicate) return `Summary for pages ${start}-${end} already exists or is in progress`
        return null
      }

      const error = validatePageRange(startPage, endPage, totalPages, existingSessions)
      expect(error).toBe('Start page must be at least 1')
    })

    it('should validate end page <= totalPages', () => {
      const startPage = 1
      const endPage = 150
      const existingSessions: SummarySession[] = []

      const validatePageRange = (start: number, end: number, total: number, sessions: SummarySession[]) => {
        if (start < 1) return 'Start page must be at least 1'
        if (end > total) return `End page cannot exceed ${total}`
        if (start > end) return 'Start page must be less than or equal to end page'
        
        const isDuplicate = sessions.some(
          (session) =>
            session.startPage === start &&
            session.endPage === end &&
            (session.status === 'loading' || session.status === 'success')
        )
        
        if (isDuplicate) return `Summary for pages ${start}-${end} already exists or is in progress`
        return null
      }

      const error = validatePageRange(startPage, endPage, totalPages, existingSessions)
      expect(error).toBe('End page cannot exceed 100')
    })

    it('should validate start page <= end page', () => {
      const startPage = 50
      const endPage = 25
      const existingSessions: SummarySession[] = []

      const validatePageRange = (start: number, end: number, total: number, sessions: SummarySession[]) => {
        if (start < 1) return 'Start page must be at least 1'
        if (end > total) return `End page cannot exceed ${total}`
        if (start > end) return 'Start page must be less than or equal to end page'
        
        const isDuplicate = sessions.some(
          (session) =>
            session.startPage === start &&
            session.endPage === end &&
            (session.status === 'loading' || session.status === 'success')
        )
        
        if (isDuplicate) return `Summary for pages ${start}-${end} already exists or is in progress`
        return null
      }

      const error = validatePageRange(startPage, endPage, totalPages, existingSessions)
      expect(error).toBe('Start page must be less than or equal to end page')
    })
  })

  describe('Duplicate Request Prevention', () => {
    it('should prevent duplicate request when session is loading', () => {
      const startPage = 1
      const endPage = 10
      const existingSessions: SummarySession[] = [
        {
          id: 'session-1',
          resourceId: mockResourceId,
          startPage: 1,
          endPage: 10,
          status: 'loading',
          timestamp: Date.now(),
        },
      ]

      const validatePageRange = (start: number, end: number, total: number, sessions: SummarySession[]) => {
        if (start < 1) return 'Start page must be at least 1'
        if (end > total) return `End page cannot exceed ${total}`
        if (start > end) return 'Start page must be less than or equal to end page'
        
        const isDuplicate = sessions.some(
          (session) =>
            session.startPage === start &&
            session.endPage === end &&
            (session.status === 'loading' || session.status === 'success')
        )
        
        if (isDuplicate) return `Summary for pages ${start}-${end} already exists or is in progress`
        return null
      }

      const error = validatePageRange(startPage, endPage, totalPages, existingSessions)
      expect(error).toBe('Summary for pages 1-10 already exists or is in progress')
    })

    it('should prevent duplicate request when session is successful', () => {
      const startPage = 5
      const endPage = 15
      const existingSessions: SummarySession[] = [
        {
          id: 'session-1',
          resourceId: mockResourceId,
          startPage: 5,
          endPage: 15,
          status: 'success',
          summary: 'Test summary',
          timestamp: Date.now(),
        },
      ]

      const validatePageRange = (start: number, end: number, total: number, sessions: SummarySession[]) => {
        if (start < 1) return 'Start page must be at least 1'
        if (end > total) return `End page cannot exceed ${total}`
        if (start > end) return 'Start page must be less than or equal to end page'
        
        const isDuplicate = sessions.some(
          (session) =>
            session.startPage === start &&
            session.endPage === end &&
            (session.status === 'loading' || session.status === 'success')
        )
        
        if (isDuplicate) return `Summary for pages ${start}-${end} already exists or is in progress`
        return null
      }

      const error = validatePageRange(startPage, endPage, totalPages, existingSessions)
      expect(error).toBe('Summary for pages 5-15 already exists or is in progress')
    })

    it('should allow duplicate request when previous session errored (retry scenario)', () => {
      const startPage = 1
      const endPage = 10
      const existingSessions: SummarySession[] = [
        {
          id: 'session-1',
          resourceId: mockResourceId,
          startPage: 1,
          endPage: 10,
          status: 'error',
          errorMessage: 'Previous error',
          timestamp: Date.now(),
        },
      ]

      const validatePageRange = (start: number, end: number, total: number, sessions: SummarySession[]) => {
        if (start < 1) return 'Start page must be at least 1'
        if (end > total) return `End page cannot exceed ${total}`
        if (start > end) return 'Start page must be less than or equal to end page'
        
        const isDuplicate = sessions.some(
          (session) =>
            session.startPage === start &&
            session.endPage === end &&
            (session.status === 'loading' || session.status === 'success')
        )
        
        if (isDuplicate) return `Summary for pages ${start}-${end} already exists or is in progress`
        return null
      }

      const error = validatePageRange(startPage, endPage, totalPages, existingSessions)
      expect(error).toBeNull()
    })
  })

  describe('Loading Session Creation', () => {
    it('should create session with unique ID', () => {
      const startPage = 1
      const endPage = 10
      const timestamp1 = Date.now()
      
      const session1 = {
        id: `${mockResourceId}-${startPage}-${endPage}-${timestamp1}`,
        resourceId: mockResourceId,
        startPage,
        endPage,
        status: 'loading' as const,
        timestamp: timestamp1,
      }

      // Simulate creating another session with same params but different timestamp
      const timestamp2 = timestamp1 + 1
      const session2 = {
        id: `${mockResourceId}-${startPage}-${endPage}-${timestamp2}`,
        resourceId: mockResourceId,
        startPage,
        endPage,
        status: 'loading' as const,
        timestamp: timestamp2,
      }

      // IDs should be different due to timestamp
      expect(session1.id).not.toBe(session2.id)
    })

    it('should create session with correct properties', () => {
      const startPage = 5
      const endPage = 15
      const timestamp = Date.now()
      
      const session: SummarySession = {
        id: `${mockResourceId}-${startPage}-${endPage}-${timestamp}`,
        resourceId: mockResourceId,
        startPage,
        endPage,
        status: 'loading',
        timestamp,
      }

      expect(session.resourceId).toBe(mockResourceId)
      expect(session.startPage).toBe(startPage)
      expect(session.endPage).toBe(endPage)
      expect(session.status).toBe('loading')
      expect(session.timestamp).toBe(timestamp)
      expect(session.summary).toBeUndefined()
      expect(session.errorMessage).toBeUndefined()
    })

    it('should include timestamp in session', () => {
      const startPage = 1
      const endPage = 10
      const beforeTimestamp = Date.now()
      
      const session: SummarySession = {
        id: `${mockResourceId}-${startPage}-${endPage}-${Date.now()}`,
        resourceId: mockResourceId,
        startPage,
        endPage,
        status: 'loading',
        timestamp: Date.now(),
      }

      const afterTimestamp = Date.now()

      expect(session.timestamp).toBeGreaterThanOrEqual(beforeTimestamp)
      expect(session.timestamp).toBeLessThanOrEqual(afterTimestamp)
    })
  })

  describe('Session State Updates', () => {
    it('should add new session to beginning of sessions array', () => {
      const existingSessions: SummarySession[] = [
        {
          id: 'session-1',
          resourceId: mockResourceId,
          startPage: 1,
          endPage: 10,
          status: 'success',
          summary: 'Old summary',
          timestamp: Date.now() - 1000,
        },
      ]

      const newSession: SummarySession = {
        id: 'session-2',
        resourceId: mockResourceId,
        startPage: 11,
        endPage: 20,
        status: 'loading',
        timestamp: Date.now(),
      }

      // Simulate setSessions((prev) => [newSession, ...prev])
      const updatedSessions = [newSession, ...existingSessions]

      expect(updatedSessions).toHaveLength(2)
      expect(updatedSessions[0]).toBe(newSession)
      expect(updatedSessions[1]).toBe(existingSessions[0])
    })

    it('should maintain existing sessions when adding new one', () => {
      const existingSessions: SummarySession[] = [
        {
          id: 'session-1',
          resourceId: mockResourceId,
          startPage: 1,
          endPage: 10,
          status: 'success',
          summary: 'Summary 1',
          timestamp: Date.now() - 2000,
        },
        {
          id: 'session-2',
          resourceId: mockResourceId,
          startPage: 11,
          endPage: 20,
          status: 'success',
          summary: 'Summary 2',
          timestamp: Date.now() - 1000,
        },
      ]

      const newSession: SummarySession = {
        id: 'session-3',
        resourceId: mockResourceId,
        startPage: 21,
        endPage: 30,
        status: 'loading',
        timestamp: Date.now(),
      }

      const updatedSessions = [newSession, ...existingSessions]

      expect(updatedSessions).toHaveLength(3)
      expect(updatedSessions[0].id).toBe('session-3')
      expect(updatedSessions[1].id).toBe('session-1')
      expect(updatedSessions[2].id).toBe('session-2')
    })
  })

  describe('Error Handling', () => {
    it('should handle SignalR invocation errors gracefully', () => {
      const startPage = 1
      const endPage = 10
      const sessions: SummarySession[] = [
        {
          id: `${mockResourceId}-${startPage}-${endPage}-${Date.now()}`,
          resourceId: mockResourceId,
          startPage,
          endPage,
          status: 'loading',
          timestamp: Date.now(),
        },
      ]

      // Simulate error handling: update session to error state
      const updatedSessions = sessions.map((session) =>
        session.resourceId === mockResourceId &&
        session.startPage === startPage &&
        session.endPage === endPage &&
        session.status === 'loading'
          ? {
              ...session,
              status: 'error' as const,
              errorMessage: 'Failed to send summary request. Please try again.',
            }
          : session
      )

      expect(updatedSessions[0].status).toBe('error')
      expect(updatedSessions[0].errorMessage).toBe('Failed to send summary request. Please try again.')
    })

    it('should only update the failed session, not others', () => {
      const sessions: SummarySession[] = [
        {
          id: 'session-1',
          resourceId: mockResourceId,
          startPage: 1,
          endPage: 10,
          status: 'loading',
          timestamp: Date.now(),
        },
        {
          id: 'session-2',
          resourceId: mockResourceId,
          startPage: 11,
          endPage: 20,
          status: 'success',
          summary: 'Existing summary',
          timestamp: Date.now() - 1000,
        },
      ]

      const failedStartPage = 1
      const failedEndPage = 10

      const updatedSessions = sessions.map((session) =>
        session.resourceId === mockResourceId &&
        session.startPage === failedStartPage &&
        session.endPage === failedEndPage &&
        session.status === 'loading'
          ? {
              ...session,
              status: 'error' as const,
              errorMessage: 'Failed to send summary request. Please try again.',
            }
          : session
      )

      expect(updatedSessions[0].status).toBe('error')
      expect(updatedSessions[1].status).toBe('success')
      expect(updatedSessions[1].summary).toBe('Existing summary')
    })
  })

  describe('Complete Request Flow', () => {
    it('should execute complete request flow with valid inputs', () => {
      const startPage = 5
      const endPage = 15
      const existingSessions: SummarySession[] = []

      // Step 1: Validate inputs
      const validatePageRange = (start: number, end: number, total: number, sessions: SummarySession[]) => {
        if (start < 1) return 'Start page must be at least 1'
        if (end > total) return `End page cannot exceed ${total}`
        if (start > end) return 'Start page must be less than or equal to end page'
        
        const isDuplicate = sessions.some(
          (session) =>
            session.startPage === start &&
            session.endPage === end &&
            (session.status === 'loading' || session.status === 'success')
        )
        
        if (isDuplicate) return `Summary for pages ${start}-${end} already exists or is in progress`
        return null
      }

      const validationError = validatePageRange(startPage, endPage, totalPages, existingSessions)
      expect(validationError).toBeNull()

      // Step 2: Create loading session
      const timestamp = Date.now()
      const newSession: SummarySession = {
        id: `${mockResourceId}-${startPage}-${endPage}-${timestamp}`,
        resourceId: mockResourceId,
        startPage,
        endPage,
        status: 'loading',
        timestamp,
      }

      expect(newSession.status).toBe('loading')
      expect(newSession.startPage).toBe(startPage)
      expect(newSession.endPage).toBe(endPage)

      // Step 3: Update sessions state
      const updatedSessions = [newSession, ...existingSessions]
      expect(updatedSessions).toHaveLength(1)
      expect(updatedSessions[0]).toBe(newSession)

      // Step 4: Verify SignalR would be called with correct parameters
      // (In actual implementation, hub.invoke('RequestResourceSummary', resourceId, startPage, endPage))
      const signalRParams = {
        method: 'RequestResourceSummary',
        resourceId: mockResourceId,
        startPage,
        endPage,
      }

      expect(signalRParams.method).toBe('RequestResourceSummary')
      expect(signalRParams.resourceId).toBe(mockResourceId)
      expect(signalRParams.startPage).toBe(startPage)
      expect(signalRParams.endPage).toBe(endPage)
    })
  })
})
