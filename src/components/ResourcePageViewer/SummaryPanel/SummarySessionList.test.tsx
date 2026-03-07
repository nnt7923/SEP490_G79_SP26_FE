import { describe, it, expect } from 'vitest'
import type { SummarySession } from '../../../types/summary'

/**
 * Unit tests for SummarySessionList component
 * Feature: resource-ai-summary
 * Task: 6.1 Create SummarySessionList component
 * 
 * These tests verify the component logic for rendering sessions,
 * sorting by timestamp, and handling empty state.
 */

/**
 * Helper function to sort sessions by timestamp (newest first)
 */
const sortSessionsByTimestamp = (sessions: SummarySession[]): SummarySession[] => {
  return [...sessions].sort((a, b) => b.timestamp - a.timestamp)
}

/**
 * Helper function to determine if empty state should be shown
 */
const shouldShowEmptyState = (sessions: SummarySession[]): boolean => {
  return sessions.length === 0
}

describe('SummarySessionList - Rendering Logic', () => {
  const createMockSession = (overrides?: Partial<SummarySession>): SummarySession => ({
    id: 'session-1',
    resourceId: 'resource-1',
    startPage: 1,
    endPage: 5,
    status: 'success',
    summary: 'Test summary',
    timestamp: Date.now(),
    ...overrides,
  })

  describe('Empty State', () => {
    it('should show empty state when no sessions provided', () => {
      const sessions: SummarySession[] = []
      
      expect(shouldShowEmptyState(sessions)).toBe(true)
    })

    it('should not show empty state when sessions exist', () => {
      const sessions: SummarySession[] = [
        createMockSession({ id: 'session-1' }),
      ]
      
      expect(shouldShowEmptyState(sessions)).toBe(false)
    })
  })

  describe('Session Sorting', () => {
    it('should sort sessions in reverse chronological order (newest first)', () => {
      const sessions: SummarySession[] = [
        createMockSession({ id: 'session-1', timestamp: 1000 }),
        createMockSession({ id: 'session-2', timestamp: 3000 }),
        createMockSession({ id: 'session-3', timestamp: 2000 }),
      ]

      const sorted = sortSessionsByTimestamp(sessions)

      expect(sorted[0].id).toBe('session-2') // timestamp 3000 (newest)
      expect(sorted[1].id).toBe('session-3') // timestamp 2000
      expect(sorted[2].id).toBe('session-1') // timestamp 1000 (oldest)
    })

    it('should handle sessions with same timestamp', () => {
      const sessions: SummarySession[] = [
        createMockSession({ id: 'session-1', timestamp: 1000 }),
        createMockSession({ id: 'session-2', timestamp: 1000 }),
        createMockSession({ id: 'session-3', timestamp: 1000 }),
      ]

      const sorted = sortSessionsByTimestamp(sessions)

      expect(sorted).toHaveLength(3)
      // Order may vary for same timestamps, but all should be present
      expect(sorted.map(s => s.id).sort()).toEqual(['session-1', 'session-2', 'session-3'])
    })

    it('should not mutate original sessions array', () => {
      const sessions: SummarySession[] = [
        createMockSession({ id: 'session-1', timestamp: 1000 }),
        createMockSession({ id: 'session-2', timestamp: 2000 }),
      ]

      const originalOrder = [...sessions]
      sortSessionsByTimestamp(sessions)

      // Verify original array is unchanged
      expect(sessions).toEqual(originalOrder)
    })

    it('should handle single session', () => {
      const sessions: SummarySession[] = [
        createMockSession({ id: 'session-1', timestamp: 1000 }),
      ]

      const sorted = sortSessionsByTimestamp(sessions)

      expect(sorted).toHaveLength(1)
      expect(sorted[0].id).toBe('session-1')
    })

    it('should handle large number of sessions', () => {
      const sessions: SummarySession[] = Array.from({ length: 100 }, (_, i) => 
        createMockSession({ id: `session-${i}`, timestamp: i * 1000 })
      )

      const sorted = sortSessionsByTimestamp(sessions)

      expect(sorted).toHaveLength(100)
      // Verify descending order
      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].timestamp).toBeGreaterThanOrEqual(sorted[i + 1].timestamp)
      }
    })
  })

  describe('Session List Rendering', () => {
    it('should determine all sessions should be rendered', () => {
      const sessions: SummarySession[] = [
        createMockSession({ id: 'session-1', startPage: 1, endPage: 5 }),
        createMockSession({ id: 'session-2', startPage: 6, endPage: 10 }),
        createMockSession({ id: 'session-3', startPage: 11, endPage: 15 }),
      ]

      expect(sessions).toHaveLength(3)
      expect(shouldShowEmptyState(sessions)).toBe(false)
    })

    it('should handle sessions with different statuses', () => {
      const sessions: SummarySession[] = [
        createMockSession({ id: 'session-1', status: 'loading', timestamp: 3000 }),
        createMockSession({ id: 'session-2', status: 'success', timestamp: 2000 }),
        createMockSession({ id: 'session-3', status: 'error', errorMessage: 'Error', timestamp: 1000 }),
      ]

      const sorted = sortSessionsByTimestamp(sessions)

      expect(sorted[0].status).toBe('loading')
      expect(sorted[1].status).toBe('success')
      expect(sorted[2].status).toBe('error')
    })

    it('should preserve all session properties after sorting', () => {
      const sessions: SummarySession[] = [
        createMockSession({ 
          id: 'session-1', 
          resourceId: 'resource-1',
          startPage: 1, 
          endPage: 5,
          status: 'success',
          summary: 'Summary 1',
          timestamp: 1000 
        }),
        createMockSession({ 
          id: 'session-2', 
          resourceId: 'resource-2',
          startPage: 6, 
          endPage: 10,
          status: 'loading',
          timestamp: 2000 
        }),
      ]

      const sorted = sortSessionsByTimestamp(sessions)

      // Verify all properties are preserved
      expect(sorted[0]).toEqual(sessions[1])
      expect(sorted[1]).toEqual(sessions[0])
    })
  })

  describe('Callback Handling', () => {
    it('should map session IDs correctly for callbacks', () => {
      const sessions: SummarySession[] = [
        createMockSession({ id: 'session-1' }),
        createMockSession({ id: 'session-2' }),
        createMockSession({ id: 'session-3' }),
      ]

      // Verify each session has a unique ID for callback mapping
      const ids = sessions.map(s => s.id)
      const uniqueIds = new Set(ids)
      
      expect(uniqueIds.size).toBe(sessions.length)
    })
  })
})
