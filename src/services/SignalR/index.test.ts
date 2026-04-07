import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as signalR from '@microsoft/signalr'
import {
  disconnectHubs,
  disconnectSummaryHub,
  getSummaryHub,
  requestLessonQuizSkeleton,
  requestResourceSummary,
} from './index'

// Mock the SignalR module
vi.mock('@microsoft/signalr', () => ({
  HubConnectionBuilder: vi.fn(() => ({
    withUrl: vi.fn().mockReturnThis(),
    withAutomaticReconnect: vi.fn().mockReturnThis(),
    configureLogging: vi.fn().mockReturnThis(),
    build: vi.fn(() => mockHubConnection),
  })),
  HubConnectionState: {
    Disconnected: 0,
    Connected: 1,
  },
  LogLevel: {
    None: 0,
    Information: 1,
  },
}))

// Mock auth store
vi.mock('../../store/useAuthStore', () => ({
  default: {
    getState: () => ({ token: 'mock-token' }),
  },
}))

const mockHubConnection = {
  state: 0, // Disconnected
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
  invoke: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  onclose: vi.fn(),
  onreconnecting: vi.fn(),
  onreconnected: vi.fn(),
}

describe('SignalR Summary Hub Service', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.useRealTimers()
    mockHubConnection.state = 0 // Reset to Disconnected
    mockHubConnection.start.mockReset()
    mockHubConnection.start.mockResolvedValue(undefined)
    mockHubConnection.stop.mockReset()
    mockHubConnection.stop.mockResolvedValue(undefined)
    mockHubConnection.invoke.mockReset()
    mockHubConnection.on.mockReset()
    mockHubConnection.off.mockReset()
    mockHubConnection.onclose.mockReset()
    mockHubConnection.onreconnecting.mockReset()
    mockHubConnection.onreconnected.mockReset()
    // Ensure clean state by disconnecting
    await disconnectSummaryHub()
    await disconnectHubs()
  })

  afterEach(async () => {
    await disconnectSummaryHub()
    await disconnectHubs()
  })

  describe('getSummaryHub', () => {
    it('should create and start a hub connection', async () => {
      const hub = await getSummaryHub()
      
      expect(hub).toBeDefined()
      expect(mockHubConnection.start).toHaveBeenCalled()
    })

    it('should return the same instance on subsequent calls (singleton)', async () => {
      const hub1 = await getSummaryHub()
      mockHubConnection.state = 1 // Set to Connected
      const hub2 = await getSummaryHub()
      
      expect(hub1).toBe(hub2)
      expect(mockHubConnection.start).toHaveBeenCalledTimes(1)
    })
  })

  describe('requestResourceSummary', () => {
    it('should reject if resourceId is not a valid GUID', async () => {
      await expect(
        requestResourceSummary('invalid-id', 1, 10)
      ).rejects.toThrow('resourceId phải là GUID hợp lệ')
    })

    it('should reject if startPage is less than 1', async () => {
      const validGuid = '12345678-1234-1234-1234-123456789012'
      await expect(
        requestResourceSummary(validGuid, 0, 10)
      ).rejects.toThrow('Số trang phải lớn hơn 0')
    })

    it('should reject if endPage is less than 1', async () => {
      const validGuid = '12345678-1234-1234-1234-123456789012'
      await expect(
        requestResourceSummary(validGuid, 1, 0)
      ).rejects.toThrow('Số trang phải lớn hơn 0')
    })

    it('should reject if startPage is greater than endPage', async () => {
      const validGuid = '12345678-1234-1234-1234-123456789012'
      await expect(
        requestResourceSummary(validGuid, 10, 5)
      ).rejects.toThrow('Trang bắt đầu phải nhỏ hơn hoặc bằng trang kết thúc')
    })

    it('should invoke hub method with correct parameters', async () => {
      const validGuid = '12345678-1234-1234-1234-123456789012'
      mockHubConnection.invoke.mockResolvedValue(undefined)
      
      // Simulate successful response
      mockHubConnection.on.mockImplementation((event, handler) => {
        if (event === 'ReceiveSummary') {
          setTimeout(() => handler({
            resourceId: validGuid,
            startPage: 1,
            endPage: 10,
            summary: 'Test summary'
          }), 10)
        }
      })

      const promise = requestResourceSummary(validGuid, 1, 10)
      
      await expect(promise).resolves.toBeDefined()
      expect(mockHubConnection.invoke).toHaveBeenCalledWith(
        'RequestResourceSummary',
        validGuid,
        1,
        10
      )
    })

    it('should call onLoading callback when SummaryLoading event is received', async () => {
      const validGuid = '12345678-1234-1234-1234-123456789012'
      const onLoading = vi.fn()
      mockHubConnection.invoke.mockResolvedValue(undefined)
      
      mockHubConnection.on.mockImplementation((event, handler) => {
        if (event === 'SummaryLoading') {
          setTimeout(() => handler(), 5)
        }
        if (event === 'ReceiveSummary') {
          setTimeout(() => handler({
            resourceId: validGuid,
            startPage: 1,
            endPage: 10,
            summary: 'Test summary'
          }), 10)
        }
      })

      await requestResourceSummary(validGuid, 1, 10, onLoading)
      
      expect(onLoading).toHaveBeenCalled()
    })

    it('should resolve with summary data when ReceiveSummary event is received', async () => {
      const validGuid = '12345678-1234-1234-1234-123456789012'
      const mockSummary = {
        resourceId: validGuid,
        startPage: 1,
        endPage: 10,
        summary: 'This is a test summary'
      }
      
      mockHubConnection.invoke.mockResolvedValue(undefined)
      mockHubConnection.on.mockImplementation((event, handler) => {
        if (event === 'ReceiveSummary') {
          setTimeout(() => handler(mockSummary), 10)
        }
      })

      const result = await requestResourceSummary(validGuid, 1, 10)
      
      expect(result).toEqual(mockSummary)
    })

    it('should reject when SummaryError event is received', async () => {
      const validGuid = '12345678-1234-1234-1234-123456789012'
      const mockError = {
        errorCode: 'AI_SERVICE_ERROR',
        errorMessage: 'AI service temporarily unavailable'
      }
      
      mockHubConnection.invoke.mockResolvedValue(undefined)
      mockHubConnection.on.mockImplementation((event, handler) => {
        if (event === 'SummaryError') {
          setTimeout(() => handler(mockError), 10)
        }
      })

      await expect(
        requestResourceSummary(validGuid, 1, 10)
      ).rejects.toThrow('AI service temporarily unavailable')
    })

    it('should prevent duplicate requests for the same resource and page range', async () => {
      const validGuid = '12345678-1234-1234-1234-123456789012'
      mockHubConnection.invoke.mockResolvedValue(undefined)
      mockHubConnection.state = 1 // Set to Connected to avoid reconnection
      
      mockHubConnection.on.mockImplementation((event, handler) => {
        if (event === 'ReceiveSummary') {
          setTimeout(() => handler({
            resourceId: validGuid,
            startPage: 1,
            endPage: 10,
            summary: 'Test summary'
          }), 50)
        }
      })

      // Start first request
      const promise1 = requestResourceSummary(validGuid, 1, 10)
      // Start second request with same parameters immediately (before first completes)
      const promise2 = requestResourceSummary(validGuid, 1, 10)
      
      // Wait for both to complete
      const [result1, result2] = await Promise.all([promise1, promise2])
      
      // Both should resolve to the same data
      expect(result1).toEqual(result2)
      
      // Hub invoke should only be called once (single-flight guard working)
      expect(mockHubConnection.invoke).toHaveBeenCalledTimes(1)
    })
  })

  describe('disconnectSummaryHub', () => {
    it('should stop the hub connection', async () => {
      await getSummaryHub()
      mockHubConnection.state = 1 // Set to Connected
      
      await disconnectSummaryHub()
      
      expect(mockHubConnection.stop).toHaveBeenCalled()
    })

    it('should not throw if hub is already disconnected', async () => {
      mockHubConnection.state = 0 // Disconnected
      
      await expect(disconnectSummaryHub()).resolves.not.toThrow()
    })
  })

  describe('requestLessonQuizSkeleton', () => {
    it('should invoke RequestQuizSkeleton and resolve with quiz payload', async () => {
      const lessonId = '12345678-1234-1234-1234-123456789012'
      const quizPayload = {
        LessonId: lessonId,
        Quizzes: [{ QuizId: '87654321-1234-1234-1234-123456789012', Title: 'Quiz 1' }],
      }

      mockHubConnection.invoke.mockResolvedValue(undefined)
      mockHubConnection.on.mockImplementation((event, handler) => {
        if (event === 'ReceiveQuizSkeleton') {
          setTimeout(() => handler(quizPayload), 10)
        }
      })

      await expect(requestLessonQuizSkeleton(lessonId)).resolves.toEqual(quizPayload)
      expect(mockHubConnection.invoke).toHaveBeenCalledWith('RequestQuizSkeleton', lessonId)
    })

    it('should ignore invoke return values and wait for ReceiveQuizSkeleton', async () => {
      const lessonId = '12345678-1234-1234-1234-123456789012'
      const invokeAck = {
        LessonId: lessonId,
        Quizzes: [],
      }
      const eventPayload = {
        LessonId: lessonId,
        Quizzes: [{ QuizId: '87654321-1234-1234-1234-123456789012', Title: 'Quiz 1' }],
      }

      mockHubConnection.invoke.mockResolvedValue(invokeAck)
      mockHubConnection.on.mockImplementation((event, handler) => {
        if (event === 'ReceiveQuizSkeleton') {
          setTimeout(() => handler(eventPayload), 10)
        }
      })

      await expect(requestLessonQuizSkeleton(lessonId)).resolves.toEqual(eventPayload)
      expect(mockHubConnection.invoke).toHaveBeenCalledWith('RequestQuizSkeleton', lessonId)
    })

    it('should call onLoading when QuizSkeletonLoading event is received', async () => {
      const lessonId = '12345678-1234-1234-1234-123456789012'
      const onLoading = vi.fn()

      mockHubConnection.invoke.mockResolvedValue(undefined)
      mockHubConnection.on.mockImplementation((event, handler) => {
        if (event === 'QuizSkeletonLoading') {
          setTimeout(() => handler({ lessonId }), 5)
        }
        if (event === 'ReceiveQuizSkeleton') {
          setTimeout(() => handler({ LessonId: lessonId, Quizzes: [] }), 10)
        }
      })

      await requestLessonQuizSkeleton(lessonId, onLoading)
      expect(onLoading).toHaveBeenCalled()
    })

    it('should reject when QuizSkeletonError event is received', async () => {
      const lessonId = '12345678-1234-1234-1234-123456789012'
      const mockError = {
        LessonId: lessonId,
        ErrorMessage: 'AI service temporarily unavailable',
      }

      mockHubConnection.invoke.mockResolvedValue(undefined)
      mockHubConnection.on.mockImplementation((event, handler) => {
        if (event === 'QuizSkeletonError') {
          setTimeout(() => handler(mockError), 10)
        }
      })

      await expect(requestLessonQuizSkeleton(lessonId)).rejects.toThrow('AI service temporarily unavailable')
    })

    it('should prevent duplicate requests for the same lesson', async () => {
      const lessonId = '12345678-1234-1234-1234-123456789012'
      const quizPayload = { LessonId: lessonId, Quizzes: [{ QuizId: 'quiz-1', Title: 'Quiz 1' }] }

      mockHubConnection.invoke.mockResolvedValue(undefined)
      mockHubConnection.state = 1
      mockHubConnection.on.mockImplementation((event, handler) => {
        if (event === 'ReceiveQuizSkeleton') {
          setTimeout(() => handler(quizPayload), 50)
        }
      })

      const promise1 = requestLessonQuizSkeleton(lessonId)
      const promise2 = requestLessonQuizSkeleton(lessonId)

      const [result1, result2] = await Promise.all([promise1, promise2])
      expect(result1).toEqual(result2)
      expect(mockHubConnection.invoke).toHaveBeenCalledTimes(1)
    })

    it('should timeout when no quiz skeleton event is received', async () => {
      vi.useFakeTimers()
      const lessonId = '12345678-1234-1234-1234-123456789012'
      mockHubConnection.invoke.mockResolvedValue(undefined)

      const promise = requestLessonQuizSkeleton(lessonId)
      const expectation = expect(promise).rejects.toThrow('Lesson quiz skeleton request timeout')
      await vi.advanceTimersByTimeAsync(120000)

      await expectation
      vi.useRealTimers()
    })
  })
})
