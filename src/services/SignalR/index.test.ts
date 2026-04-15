import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as signalR from '@microsoft/signalr'
import {
  disconnectHubs,
  disconnectSummaryHub,
  getSummaryHub,
  requestChapterMentorSkeleton,
  requestLessonQuizSkeleton,
  requestMentorLessonContent,
  requestResourceSummary,
  requestSingleQuizQuestion,
  requestSingleQuizSkeleton,
  requestSingleTask,
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

  describe('requestChapterMentorSkeleton', () => {
    it('should invoke RequestChapterMentorSkeleton and resolve with generated payload', async () => {
      const pathId = '12345678-1234-1234-1234-123456789012'
      const chapterTitle = 'React Fundamentals'
      const chapterDescription = 'Core React concepts'
      const generatedPayload = {
        pathId,
        chapterTitle,
        chapterDescription,
        lessons: [
          { title: 'Intro to React', orderIndex: 1 },
          { title: 'Components', orderIndex: 2 },
        ],
      }

      mockHubConnection.invoke.mockResolvedValue(undefined)
      mockHubConnection.on.mockImplementation((event, handler) => {
        if (event === 'ChapterMentorSkeletonGenerated') {
          setTimeout(() => handler(generatedPayload), 10)
        }
      })

      await expect(requestChapterMentorSkeleton(pathId, chapterTitle, chapterDescription)).resolves.toEqual(generatedPayload)
      expect(mockHubConnection.invoke).toHaveBeenCalledWith('RequestChapterMentorSkeleton', pathId, chapterTitle, chapterDescription)
    })

    it('should call onLoading when ChapterMentorSkeletonGenerationStarted is received', async () => {
      const pathId = '12345678-1234-1234-1234-123456789012'
      const onLoading = vi.fn()

      mockHubConnection.invoke.mockResolvedValue(undefined)
      mockHubConnection.on.mockImplementation((event, handler) => {
        if (event === 'ChapterMentorSkeletonGenerationStarted') {
          setTimeout(() => handler({ pathId }), 5)
        }
        if (event === 'ChapterMentorSkeletonGenerated') {
          setTimeout(() => handler({ pathId, lessons: [{ title: 'L1', orderIndex: 1 }] }), 10)
        }
      })

      await requestChapterMentorSkeleton(pathId, 'React Fundamentals', 'Core React concepts', onLoading)
      expect(onLoading).toHaveBeenCalled()
    })

    it('should prevent duplicate requests for the same chapter prompt', async () => {
      const pathId = '12345678-1234-1234-1234-123456789012'
      const chapterTitle = 'React Fundamentals'
      const chapterDescription = 'Core React concepts'
      const generatedPayload = { pathId, lessons: [{ title: 'L1', orderIndex: 1 }] }

      mockHubConnection.invoke.mockResolvedValue(undefined)
      mockHubConnection.state = 1
      mockHubConnection.on.mockImplementation((event, handler) => {
        if (event === 'ChapterMentorSkeletonGenerated') {
          setTimeout(() => handler(generatedPayload), 50)
        }
      })

      const promise1 = requestChapterMentorSkeleton(pathId, chapterTitle, chapterDescription)
      const promise2 = requestChapterMentorSkeleton(pathId, chapterTitle, chapterDescription)

      const [result1, result2] = await Promise.all([promise1, promise2])
      expect(result1).toEqual(result2)
      expect(mockHubConnection.invoke).toHaveBeenCalledTimes(1)
    })

    it('should ignore events from another chapter title on the same path', async () => {
      const pathId = '12345678-1234-1234-1234-123456789012'
      const chapterTitle = 'React Fundamentals'
      const chapterDescription = 'Core React concepts'

      mockHubConnection.invoke.mockResolvedValue(undefined)
      mockHubConnection.on.mockImplementation((event, handler) => {
        if (event === 'ChapterMentorSkeletonError') {
          setTimeout(() => handler({ pathId, chapterTitle: 'Wrong Chapter', errorMessage: 'Should be ignored' }), 10)
        }
        if (event === 'ChapterMentorSkeletonGenerated') {
          setTimeout(() => handler({ pathId, chapterTitle, chapterDescription, lessons: [{ title: 'L1', orderIndex: 1 }] }), 20)
        }
      })

      await expect(requestChapterMentorSkeleton(pathId, chapterTitle, chapterDescription)).resolves.toEqual(
        expect.objectContaining({ pathId, chapterTitle }),
      )
    })

    it('should ignore events missing pathId', async () => {
      const pathId = '12345678-1234-1234-1234-123456789012'

      mockHubConnection.invoke.mockResolvedValue(undefined)
      mockHubConnection.on.mockImplementation((event, handler) => {
        if (event === 'ChapterMentorSkeletonGenerated') {
          setTimeout(() => handler({ chapterTitle: 'React Fundamentals', lessons: [{ title: 'L1', orderIndex: 1 }] }), 10)
          setTimeout(() => handler({ pathId, chapterTitle: 'React Fundamentals', chapterDescription: 'Core React concepts', lessons: [{ title: 'L1', orderIndex: 1 }] }), 20)
        }
      })

      await expect(requestChapterMentorSkeleton(pathId, 'React Fundamentals', 'Core React concepts')).resolves.toEqual(
        expect.objectContaining({ pathId }),
      )
    })

    it('should reject when generated payload has invalid lessons shape', async () => {
      const pathId = '12345678-1234-1234-1234-123456789012'

      mockHubConnection.invoke.mockResolvedValue(undefined)
      mockHubConnection.on.mockImplementation((event, handler) => {
        if (event === 'ChapterMentorSkeletonGenerated') {
          setTimeout(() => handler({
            pathId,
            chapterTitle: 'React Fundamentals',
            chapterDescription: 'Core React concepts',
            lessons: [{ title: '', orderIndex: 'x' }],
          }), 10)
        }
      })

      await expect(requestChapterMentorSkeleton(pathId, 'React Fundamentals', 'Core React concepts')).rejects.toMatchObject({
        message: 'Chapter mentor skeleton payload is invalid.',
        code: 'INVALID_AI_RESPONSE',
      })
    })

    it('should preserve error code from ChapterMentorSkeletonError payload', async () => {
      const pathId = '12345678-1234-1234-1234-123456789012'

      mockHubConnection.invoke.mockResolvedValue(undefined)
      mockHubConnection.on.mockImplementation((event, handler) => {
        if (event === 'ChapterMentorSkeletonError') {
          setTimeout(() => handler({
            PathId: pathId,
            ErrorCode: 'GENERATION_FAILED',
            ErrorMessage: 'Failed to generate chapter mentor skeleton.',
          }), 10)
        }
      })

      await expect(requestChapterMentorSkeleton(pathId, 'React Fundamentals', 'Core React concepts')).rejects.toMatchObject({
        message: 'Failed to generate chapter mentor skeleton.',
        code: 'GENERATION_FAILED',
      })
    })

    it('should timeout when no chapter mentor skeleton event is received', async () => {
      vi.useFakeTimers()
      const pathId = '12345678-1234-1234-1234-123456789012'
      mockHubConnection.invoke.mockResolvedValue(undefined)

      const promise = requestChapterMentorSkeleton(pathId, 'React Fundamentals', 'Core React concepts')
      const expectation = expect(promise).rejects.toThrow('Chapter mentor skeleton generation timeout')
      await vi.advanceTimersByTimeAsync(120000)

      await expectation
      vi.useRealTimers()
    })
  })

  describe('requestSingleTask', () => {
    it('should invoke RequestSingleTask and resolve with generated task payload', async () => {
      const chapterId = '12345678-1234-1234-1234-123456789012'
      const generatedTask = {
        taskId: 'task-1',
        title: 'Generated task',
        description: 'Task description',
        taskType: 0,
      }

      mockHubConnection.invoke.mockResolvedValue(undefined)
      mockHubConnection.on.mockImplementation((event, handler) => {
        if (event === 'ReceiveSingleTask') {
          setTimeout(() => handler(generatedTask), 10)
        }
      })

      await expect(requestSingleTask(chapterId, 'Write task', 0)).resolves.toEqual(generatedTask)
      expect(mockHubConnection.invoke).toHaveBeenCalledWith('RequestSingleTask', chapterId, 'Write task', 0)
    })

    it('should call onLoading for matching SingleTaskLoading event', async () => {
      const chapterId = '12345678-1234-1234-1234-123456789012'
      const onLoading = vi.fn()

      mockHubConnection.invoke.mockResolvedValue(undefined)
      mockHubConnection.on.mockImplementation((event, handler) => {
        if (event === 'SingleTaskLoading') {
          setTimeout(() => handler({ chapterId, title: 'Write task', taskType: 0 }), 5)
        }
        if (event === 'ReceiveSingleTask') {
          setTimeout(() => handler({ taskId: 'task-1', title: 'Generated task', taskType: 0 }), 10)
        }
      })

      await requestSingleTask(chapterId, 'Write task', 0, onLoading)
      expect(onLoading).toHaveBeenCalled()
    })

    it('should preserve error code from SingleTaskError payload', async () => {
      const chapterId = '12345678-1234-1234-1234-123456789012'

      mockHubConnection.invoke.mockResolvedValue(undefined)
      mockHubConnection.on.mockImplementation((event, handler) => {
        if (event === 'SingleTaskError') {
          setTimeout(() => handler({
            chapterId,
            errorCode: 'CHAPTER_NO_LESSONS',
            errorMessage: 'Chapter has no lessons',
          }), 10)
        }
      })

      await expect(requestSingleTask(chapterId, 'Write task', 0)).rejects.toMatchObject({
        message: 'Chapter has no lessons',
        code: 'CHAPTER_NO_LESSONS',
      })
    })

    it('should ignore SingleTaskError from a different title when title is present in payload', async () => {
      const chapterId = '12345678-1234-1234-1234-123456789012'

      mockHubConnection.invoke.mockResolvedValue(undefined)
      mockHubConnection.on.mockImplementation((event, handler) => {
        if (event === 'SingleTaskError') {
          setTimeout(() => handler({
            chapterId,
            title: 'Another task title',
            taskType: 0,
            errorMessage: 'Should be ignored',
          }), 10)
        }
        if (event === 'ReceiveSingleTask') {
          setTimeout(() => handler({
            taskId: 'task-1',
            title: 'Generated task',
            taskType: 0,
          }), 20)
        }
      })

      await expect(requestSingleTask(chapterId, 'Write task', 0)).resolves.toEqual(
        expect.objectContaining({ taskId: 'task-1' }),
      )
    })

    it('should ignore mismatched task type success payloads', async () => {
      const chapterId = '12345678-1234-1234-1234-123456789012'

      mockHubConnection.invoke.mockResolvedValue(undefined)
      mockHubConnection.on.mockImplementation((event, handler) => {
        if (event === 'ReceiveSingleTask') {
          setTimeout(() => handler({ taskId: 'wrong-task', title: 'Wrong', taskType: 2 }), 10)
          setTimeout(() => handler({ taskId: 'task-1', title: 'Generated task', taskType: 0 }), 20)
        }
      })

      await expect(requestSingleTask(chapterId, 'Write task', 0)).resolves.toEqual(
        expect.objectContaining({ taskId: 'task-1', taskType: 0 }),
      )
    })

    it('should prevent duplicate requests for same chapter title and task type', async () => {
      const chapterId = '12345678-1234-1234-1234-123456789012'
      const generatedTask = { taskId: 'task-1', title: 'Generated task', taskType: 0 }

      mockHubConnection.invoke.mockResolvedValue(undefined)
      mockHubConnection.state = 1
      mockHubConnection.on.mockImplementation((event, handler) => {
        if (event === 'ReceiveSingleTask') {
          setTimeout(() => handler(generatedTask), 50)
        }
      })

      const promise1 = requestSingleTask(chapterId, 'Write task', 0)
      const promise2 = requestSingleTask(chapterId, 'Write task', 0)

      const [result1, result2] = await Promise.all([promise1, promise2])
      expect(result1).toEqual(result2)
      expect(mockHubConnection.invoke).toHaveBeenCalledTimes(1)
    })

    it('should timeout when no single-task event is received', async () => {
      vi.useFakeTimers()
      const chapterId = '12345678-1234-1234-1234-123456789012'
      mockHubConnection.invoke.mockResolvedValue(undefined)

      const promise = requestSingleTask(chapterId, null, 1)
      const expectation = expect(promise).rejects.toThrow('Single task generation timeout')
      await vi.advanceTimersByTimeAsync(120000)

      await expectation
      vi.useRealTimers()
    })
  })

  describe('requestSingleQuizSkeleton', () => {
    it('should invoke RequestSingleQuizSkeleton and resolve with generated quiz payload', async () => {
      const lessonId = '12345678-1234-1234-1234-123456789012'
      const payload = {
        lessonId,
        quiz: {
          quizId: 'quiz-1',
          title: 'Generated quiz title',
          description: 'Generated quiz description',
        },
      }

      mockHubConnection.invoke.mockResolvedValue(undefined)
      mockHubConnection.on.mockImplementation((event, handler) => {
        if (event === 'ReceiveSingleQuizSkeleton') {
          setTimeout(() => handler(payload), 10)
        }
      })

      await expect(requestSingleQuizSkeleton(lessonId)).resolves.toEqual(payload)
      expect(mockHubConnection.invoke).toHaveBeenCalledWith('RequestSingleQuizSkeleton', lessonId)
    })

    it('should call onLoading when SingleQuizSkeletonLoading is received', async () => {
      const lessonId = '12345678-1234-1234-1234-123456789012'
      const onLoading = vi.fn()

      mockHubConnection.invoke.mockResolvedValue(undefined)
      mockHubConnection.on.mockImplementation((event, handler) => {
        if (event === 'SingleQuizSkeletonLoading') {
          setTimeout(() => handler({ lessonId }), 5)
        }
        if (event === 'ReceiveSingleQuizSkeleton') {
          setTimeout(() => handler({ lessonId, quiz: { quizId: 'quiz-1', title: 'Quiz', description: '' } }), 10)
        }
      })

      await requestSingleQuizSkeleton(lessonId, onLoading)
      expect(onLoading).toHaveBeenCalled()
    })

    it('should preserve error code from SingleQuizSkeletonError payload', async () => {
      const lessonId = '12345678-1234-1234-1234-123456789012'

      mockHubConnection.invoke.mockResolvedValue(undefined)
      mockHubConnection.on.mockImplementation((event, handler) => {
        if (event === 'SingleQuizSkeletonError') {
          setTimeout(() => handler({
            lessonId,
            errorCode: 'LESSON_CONTENT_REQUIRED',
            errorMessage: 'Lesson content is required to generate quiz skeleton',
          }), 10)
        }
      })

      await expect(requestSingleQuizSkeleton(lessonId)).rejects.toMatchObject({
        message: 'Lesson content is required to generate quiz skeleton',
        code: 'LESSON_CONTENT_REQUIRED',
      })
    })

    it('should ignore mismatched lesson events', async () => {
      const lessonId = '12345678-1234-1234-1234-123456789012'
      const anotherLessonId = '87654321-1234-1234-1234-123456789012'

      mockHubConnection.invoke.mockResolvedValue(undefined)
      mockHubConnection.on.mockImplementation((event, handler) => {
        if (event === 'SingleQuizSkeletonError') {
          setTimeout(() => handler({ lessonId: anotherLessonId, errorMessage: 'Should be ignored' }), 10)
        }
        if (event === 'ReceiveSingleQuizSkeleton') {
          setTimeout(() => handler({ lessonId, quiz: { quizId: 'quiz-1', title: 'Quiz', description: '' } }), 20)
        }
      })

      await expect(requestSingleQuizSkeleton(lessonId)).resolves.toEqual(
        expect.objectContaining({ lessonId }),
      )
    })

    it('should prevent duplicate requests for the same lesson', async () => {
      const lessonId = '12345678-1234-1234-1234-123456789012'
      const payload = { lessonId, quiz: { quizId: 'quiz-1', title: 'Quiz', description: '' } }

      mockHubConnection.invoke.mockResolvedValue(undefined)
      mockHubConnection.state = 1
      mockHubConnection.on.mockImplementation((event, handler) => {
        if (event === 'ReceiveSingleQuizSkeleton') {
          setTimeout(() => handler(payload), 50)
        }
      })

      const promise1 = requestSingleQuizSkeleton(lessonId)
      const promise2 = requestSingleQuizSkeleton(lessonId)

      const [result1, result2] = await Promise.all([promise1, promise2])
      expect(result1).toEqual(result2)
      expect(mockHubConnection.invoke).toHaveBeenCalledTimes(1)
    })

    it('should timeout when no single quiz skeleton event is received', async () => {
      vi.useFakeTimers()
      const lessonId = '12345678-1234-1234-1234-123456789012'
      mockHubConnection.invoke.mockResolvedValue(undefined)

      const promise = requestSingleQuizSkeleton(lessonId)
      const expectation = expect(promise).rejects.toThrow('Single quiz skeleton generation timeout')
      await vi.advanceTimersByTimeAsync(120000)

      await expectation
      vi.useRealTimers()
    })
  })

  describe('requestSingleQuizQuestion', () => {
    it('should invoke RequestSingleQuizQuestion and resolve with generated question payload', async () => {
      const quizId = '12345678-1234-1234-1234-123456789012'
      const questionType = 2
      const payload = {
        quizId,
        question: {
          questionId: 'question-1',
          questionText: 'Generated question',
          type: questionType,
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 'B',
          points: 1,
          orderIndex: 3,
        },
      }

      mockHubConnection.invoke.mockResolvedValue(undefined)
      mockHubConnection.on.mockImplementation((event, handler) => {
        if (event === 'ReceiveSingleQuizQuestion') {
          setTimeout(() => handler(payload), 10)
        }
      })

      await expect(requestSingleQuizQuestion(quizId, questionType)).resolves.toEqual(payload)
      expect(mockHubConnection.invoke).toHaveBeenCalledWith('RequestSingleQuizQuestion', quizId, questionType)
    })

    it('should call onLoading when SingleQuizQuestionLoading is received', async () => {
      const quizId = '12345678-1234-1234-1234-123456789012'
      const questionType = 1
      const onLoading = vi.fn()

      mockHubConnection.invoke.mockResolvedValue(undefined)
      mockHubConnection.on.mockImplementation((event, handler) => {
        if (event === 'SingleQuizQuestionLoading') {
          setTimeout(() => handler({ quizId, questionType }), 5)
        }
        if (event === 'ReceiveSingleQuizQuestion') {
          setTimeout(() => handler({ quizId, question: { questionId: 'question-1', questionText: 'Generated', type: questionType } }), 10)
        }
      })

      await requestSingleQuizQuestion(quizId, questionType, onLoading)
      expect(onLoading).toHaveBeenCalled()
    })

    it('should preserve error code from SingleQuizQuestionError payload', async () => {
      const quizId = '12345678-1234-1234-1234-123456789012'
      const questionType = 3

      mockHubConnection.invoke.mockResolvedValue(undefined)
      mockHubConnection.on.mockImplementation((event, handler) => {
        if (event === 'SingleQuizQuestionError') {
          setTimeout(() => handler({
            quizId,
            questionType,
            errorCode: 'QUESTION_TYPE_MISMATCH',
            errorMessage: 'AI generated a different question type than requested.',
          }), 10)
        }
      })

      await expect(requestSingleQuizQuestion(quizId, questionType)).rejects.toMatchObject({
        message: 'AI generated a different question type than requested.',
        code: 'QUESTION_TYPE_MISMATCH',
      })
    })

    it('should ignore mismatched quiz events', async () => {
      const quizId = '12345678-1234-1234-1234-123456789012'
      const anotherQuizId = '87654321-1234-1234-1234-123456789012'
      const questionType = 2

      mockHubConnection.invoke.mockResolvedValue(undefined)
      mockHubConnection.on.mockImplementation((event, handler) => {
        if (event === 'SingleQuizQuestionError') {
          setTimeout(() => handler({ quizId: anotherQuizId, errorMessage: 'Should be ignored' }), 10)
        }
        if (event === 'ReceiveSingleQuizQuestion') {
          setTimeout(() => handler({ quizId, question: { questionId: 'question-1', questionText: 'Generated', type: questionType } }), 20)
        }
      })

      await expect(requestSingleQuizQuestion(quizId, questionType)).resolves.toEqual(
        expect.objectContaining({ quizId }),
      )
    })

    it('should prevent duplicate requests for the same quiz and question type', async () => {
      const quizId = '12345678-1234-1234-1234-123456789012'
      const questionType = 0
      const payload = {
        quizId,
        question: { questionId: 'question-1', questionText: 'Generated question', type: questionType },
      }

      mockHubConnection.invoke.mockResolvedValue(undefined)
      mockHubConnection.state = 1
      mockHubConnection.on.mockImplementation((event, handler) => {
        if (event === 'ReceiveSingleQuizQuestion') {
          setTimeout(() => handler(payload), 50)
        }
      })

      const promise1 = requestSingleQuizQuestion(quizId, questionType)
      const promise2 = requestSingleQuizQuestion(quizId, questionType)

      const [result1, result2] = await Promise.all([promise1, promise2])
      expect(result1).toEqual(result2)
      expect(mockHubConnection.invoke).toHaveBeenCalledTimes(1)
    })

    it('should timeout when no single quiz question event is received', async () => {
      vi.useFakeTimers()
      const quizId = '12345678-1234-1234-1234-123456789012'
      const questionType = 4
      mockHubConnection.invoke.mockResolvedValue(undefined)

      const promise = requestSingleQuizQuestion(quizId, questionType)
      const expectation = expect(promise).rejects.toThrow('Single quiz question generation timeout')
      await vi.advanceTimersByTimeAsync(120000)

      await expectation
      vi.useRealTimers()
    })
  })

  describe('requestMentorLessonContent', () => {
    it('should invoke RequestMentorLessonContent and resolve with generated lesson content', async () => {
      const lessonId = '12345678-1234-1234-1234-123456789012'
      const contentPayload = { lessonId, content: '## Lesson content' }
      const completionPayload = { lessonId, message: 'Lesson content generated successfully!' }

      mockHubConnection.invoke.mockResolvedValue(undefined)
      mockHubConnection.on.mockImplementation((event, handler) => {
        if (event === 'ReceiveLessonContent') {
          setTimeout(() => handler(contentPayload), 5)
        }
        if (event === 'LessonGenerationCompleted') {
          setTimeout(() => handler(completionPayload), 10)
        }
      })

      await expect(requestMentorLessonContent(lessonId)).resolves.toEqual(
        expect.objectContaining({
          lessonId,
          content: '## Lesson content',
          message: 'Lesson content generated successfully!',
        }),
      )
      expect(mockHubConnection.invoke).toHaveBeenCalledWith('RequestMentorLessonContent', lessonId)
    })

    it('should call onLoading when LessonContentLoading is received', async () => {
      const lessonId = '12345678-1234-1234-1234-123456789012'
      const onLoading = vi.fn()

      mockHubConnection.invoke.mockResolvedValue(undefined)
      mockHubConnection.on.mockImplementation((event, handler) => {
        if (event === 'LessonContentLoading') {
          setTimeout(() => handler({ lessonId }), 5)
        }
        if (event === 'ReceiveLessonContent') {
          setTimeout(() => handler({ lessonId, content: 'Generated content' }), 10)
        }
        if (event === 'LessonGenerationCompleted') {
          setTimeout(() => handler({ lessonId, message: 'Done' }), 20)
        }
      })

      await requestMentorLessonContent(lessonId, onLoading)
      expect(onLoading).toHaveBeenCalled()
    })

    it('should preserve error code from LessonContentError payload', async () => {
      const lessonId = '12345678-1234-1234-1234-123456789012'

      mockHubConnection.invoke.mockResolvedValue(undefined)
      mockHubConnection.on.mockImplementation((event, handler) => {
        if (event === 'LessonContentError') {
          setTimeout(() => handler({
            lessonId,
            errorCode: 'LESSON_TITLE_REQUIRED',
            errorMessage: 'Lesson title is required',
          }), 10)
        }
      })

      await expect(requestMentorLessonContent(lessonId)).rejects.toMatchObject({
        message: 'Lesson title is required',
        code: 'LESSON_TITLE_REQUIRED',
      })
    })

    it('should ignore mismatched lesson events', async () => {
      const lessonId = '12345678-1234-1234-1234-123456789012'
      const anotherLessonId = '87654321-1234-1234-1234-123456789012'

      mockHubConnection.invoke.mockResolvedValue(undefined)
      mockHubConnection.on.mockImplementation((event, handler) => {
        if (event === 'LessonContentError') {
          setTimeout(() => handler({ lessonId: anotherLessonId, errorMessage: 'Should be ignored' }), 10)
        }
        if (event === 'ReceiveLessonContent') {
          setTimeout(() => handler({ lessonId, content: 'Generated content' }), 20)
        }
        if (event === 'LessonGenerationCompleted') {
          setTimeout(() => handler({ lessonId, message: 'Done' }), 30)
        }
      })

      await expect(requestMentorLessonContent(lessonId)).resolves.toEqual(
        expect.objectContaining({ lessonId, content: 'Generated content' }),
      )
    })

    it('should prevent duplicate requests for the same lesson', async () => {
      const lessonId = '12345678-1234-1234-1234-123456789012'

      mockHubConnection.invoke.mockResolvedValue(undefined)
      mockHubConnection.state = 1
      mockHubConnection.on.mockImplementation((event, handler) => {
        if (event === 'ReceiveLessonContent') {
          setTimeout(() => handler({ lessonId, content: 'Generated content' }), 20)
        }
        if (event === 'LessonGenerationCompleted') {
          setTimeout(() => handler({ lessonId, message: 'Done' }), 50)
        }
      })

      const promise1 = requestMentorLessonContent(lessonId)
      const promise2 = requestMentorLessonContent(lessonId)

      const [result1, result2] = await Promise.all([promise1, promise2])
      expect(result1).toEqual(result2)
      expect(mockHubConnection.invoke).toHaveBeenCalledTimes(1)
    })

    it('should timeout when no mentor lesson content events complete', async () => {
      vi.useFakeTimers()
      const lessonId = '12345678-1234-1234-1234-123456789012'
      mockHubConnection.invoke.mockResolvedValue(undefined)

      const promise = requestMentorLessonContent(lessonId)
      const expectation = expect(promise).rejects.toThrow('Mentor lesson content request timeout')
      await vi.advanceTimersByTimeAsync(120000)

      await expectation
      vi.useRealTimers()
    })
  })
})
