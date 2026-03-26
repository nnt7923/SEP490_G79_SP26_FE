import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../Axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

import api from '../Axios'
import {
  getLearningPathProgress,
  getLessonReadStatus,
  markLessonContentRead,
} from './index'

const mockedApi = vi.mocked(api, true)

describe('LearningPathService progress/read APIs', () => {
  beforeEach(() => {
    mockedApi.get.mockReset()
    mockedApi.post.mockReset()
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
})
