import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../Axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}))

vi.mock('../SignalR', () => ({
  requestLearningPathGeneration: vi.fn(),
  requestChapterMentorSkeleton: vi.fn(),
  requestChapterSkeleton: vi.fn(),
  requestLessonQuizSkeleton: vi.fn(),
  requestSingleTask: vi.fn(),
  requestLearningPathSuggestions: vi.fn(),
}))

import api from '../Axios'
import {
  createManualDraft,
  generateChapterMentorSkeleton,
  generateLessonQuizSkeleton,
  generateSingleTask,
  getLearningPathProgress,
  getLessonReadStatus,
  markLessonContentRead,
  updateManualDraft,
} from './index'
import { requestChapterMentorSkeleton, requestLessonQuizSkeleton, requestSingleTask } from '../SignalR'

const mockedApi = vi.mocked(api, true)
const mockedRequestChapterMentorSkeleton = vi.mocked(requestChapterMentorSkeleton)
const mockedRequestLessonQuizSkeleton = vi.mocked(requestLessonQuizSkeleton)
const mockedRequestSingleTask = vi.mocked(requestSingleTask)

describe('LearningPathService progress/read APIs', () => {
  beforeEach(() => {
    mockedApi.get.mockReset()
    mockedApi.post.mockReset()
    mockedApi.put.mockReset()
    mockedRequestChapterMentorSkeleton.mockReset()
    mockedRequestLessonQuizSkeleton.mockReset()
    mockedRequestSingleTask.mockReset()
  })

  it('normalizes progress v2 fields defensively', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        value: {
          pathId: 'path-1',
          completedLessonContents: '6',
          totalLessonContents: 10,
          contentProgressPercent: '60',
          completedQuizzes: '4',
          totalQuizzes: 8,
          quizProgressPercent: '50',
          completedTasks: null,
          totalTasks: undefined,
          progressPercent: '56.25',
          status: 'InProgress',
        },
      },
    })

    await expect(getLearningPathProgress('path-1')).resolves.toEqual({
      pathId: 'path-1',
      completedLessonContents: 6,
      totalLessonContents: 10,
      contentProgressPercent: 60,
      completedQuizzes: 4,
      totalQuizzes: 8,
      quizProgressPercent: 50,
      completedTasks: 0,
      totalTasks: 0,
      progressPercent: 56.25,
      status: 'InProgress',
    })
  })

  it('defaults missing progress fields to zero and status to NotStarted', async () => {
    mockedApi.get.mockResolvedValue({ data: { value: {} } })

    await expect(getLearningPathProgress('path-2')).resolves.toEqual({
      pathId: 'path-2',
      completedLessonContents: 0,
      totalLessonContents: 0,
      contentProgressPercent: 0,
      completedQuizzes: 0,
      totalQuizzes: 0,
      quizProgressPercent: 0,
      completedTasks: 0,
      totalTasks: 0,
      progressPercent: 0,
      status: 'NotStarted',
    })
  })

  it('parses lesson read status for read and unread responses', async () => {
    mockedApi.get
      .mockResolvedValueOnce({
        data: {
          value: {
            lessonId: 'lesson-1',
            isLessonContentRead: true,
            readAt: '2026-03-22T10:30:00Z',
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          value: {
            lessonId: 'lesson-2',
            isLessonContentRead: false,
            readAt: null,
          },
        },
      })

    await expect(getLessonReadStatus('lesson-1')).resolves.toEqual({
      lessonId: 'lesson-1',
      isLessonContentRead: true,
      readAt: '2026-03-22T10:30:00Z',
    })

    await expect(getLessonReadStatus('lesson-2')).resolves.toEqual({
      lessonId: 'lesson-2',
      isLessonContentRead: false,
      readAt: null,
    })
  })

  it('returns mark-read response payload', async () => {
    mockedApi.post.mockResolvedValue({ data: { value: 'Lesson content marked as read' } })

    await expect(markLessonContentRead('lesson-3')).resolves.toBe('Lesson content marked as read')
  })

  it('uses the dedicated lesson quiz skeleton request when available', async () => {
    const lessonId = 'lesson-quiz-1'
    const quizPayload = { LessonId: lessonId, Quizzes: [{ QuizId: 'quiz-1', Title: 'Quiz 1' }] }
    mockedRequestLessonQuizSkeleton.mockResolvedValue(quizPayload)

    await expect(generateLessonQuizSkeleton(lessonId)).resolves.toEqual(quizPayload)
    expect(mockedRequestLessonQuizSkeleton).toHaveBeenCalledWith(lessonId, undefined)
  })

  it('surfaces RequestQuizSkeleton errors without falling back', async () => {
    const lessonId = 'lesson-quiz-2'
    mockedRequestLessonQuizSkeleton.mockRejectedValue(new Error("Method does not exist: 'RequestQuizSkeleton'"))

    await expect(generateLessonQuizSkeleton(lessonId)).rejects.toThrow("Method does not exist: 'RequestQuizSkeleton'")
  })

  it('delegates chapter mentor skeleton generation to SignalR request', async () => {
    const payload = {
      pathId: '12345678-1234-1234-1234-123456789012',
      chapterTitle: 'State Management',
      chapterDescription: 'Redux and context patterns',
      lessons: [{ title: 'Redux fundamentals', orderIndex: 1 }],
    }
    const onLoading = vi.fn()
    mockedRequestChapterMentorSkeleton.mockResolvedValue(payload)

    await expect(
      generateChapterMentorSkeleton(payload.pathId, payload.chapterTitle, payload.chapterDescription, { onLoading }),
    ).resolves.toEqual(payload)

    expect(mockedRequestChapterMentorSkeleton).toHaveBeenCalledWith(
      payload.pathId,
      payload.chapterTitle,
      payload.chapterDescription,
      onLoading,
    )
  })

  it('delegates single task generation to SignalR request', async () => {
    const chapterId = '12345678-1234-1234-1234-123456789012'
    const title = 'Implement array sorting'
    const taskType = 0
    const onLoading = vi.fn()
    const generatedTask = {
      taskId: 'task-1',
      title: 'Sort arrays efficiently',
      taskType,
    }
    mockedRequestSingleTask.mockResolvedValue(generatedTask)

    await expect(generateSingleTask(chapterId, title, taskType, { onLoading })).resolves.toEqual(generatedTask)

    expect(mockedRequestSingleTask).toHaveBeenCalledWith(chapterId, title, taskType, onLoading)
  })

  it('keeps manual draft languageSelection numeric and normalizes nested quiz questions', async () => {
    mockedApi.post.mockResolvedValue({
      data: {
        value: {
          pathId: 'path-1',
          chapters: [
            {
              id: 'chapter-1',
              title: 'Chapter 1',
              lessons: [
                {
                  id: 'lesson-1',
                  title: 'Lesson 1',
                  quizzes: [
                    {
                      id: 'quiz-1',
                      title: 'Quiz 1',
                      dueDate: '2026-04-03T00:00:00.000Z',
                      questions: [
                        {
                          questionId: 'question-1',
                          questionText: 'Q1',
                          type: 2,
                          options: ['A', 'B'],
                          correctAnswer: 'A',
                          points: 1,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    })

    const payload = {
      subjectId: 'subject-1',
      goals: [{ goalId: 'goal-1', weight: 100 }],
      complexityLevel: 2,
      languageSelection: 2,
      title: 'Draft',
      chapters: [],
    }

    const result = await createManualDraft(payload as any)

    expect(mockedApi.post).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ languageSelection: 2 }))
    expect(result.chapters?.[0].lessons?.[0].quizzes?.[0]).toMatchObject({
      dueDate: '2026-04-03T00:00:00.000Z',
      questions: [
        {
          id: 'question-1',
          questionId: 'question-1',
          questionText: 'Q1',
          type: 2,
          options: ['A', 'B'],
          correctAnswer: 'A',
          points: 1,
        },
      ],
    })
  })

  it('keeps numeric languageSelection when updating manual draft', async () => {
    mockedApi.put.mockResolvedValue({ data: { value: { pathId: 'path-2', chapters: [] } } })

    await updateManualDraft('path-2', {
      subjectId: 'subject-1',
      goals: [{ goalId: 'goal-1', weight: 100 }],
      complexityLevel: 1,
      languageSelection: 1,
      title: 'Draft',
      chapters: [],
    } as any)

    expect(mockedApi.put).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ languageSelection: 1 }))
  })
})
