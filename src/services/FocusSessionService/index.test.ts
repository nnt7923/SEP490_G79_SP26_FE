import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../Axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

import api from '../Axios'
import { getSessionHistory } from './index'

const mockedApi = vi.mocked(api, true)

describe('FocusSessionService history normalization', () => {
  beforeEach(() => {
    mockedApi.get.mockReset()
    mockedApi.post.mockReset()
  })

  it('parses taskReview when present', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        items: [
          {
            sessionId: 'session-1',
            taskId: 'task-1',
            taskTitle: 'Implement BFS',
            title: 'Study BFS',
            startTime: '2026-04-24T12:00:00Z',
            endTime: '2026-04-24T13:00:00Z',
            plannedDurationMinutes: 60,
            actualDurationMinutes: 55,
            sessionStatus: 'CompletedOnTime',
            sessionType: 'Study',
            submittedCode: 'code',
            submittedSummary: 'summary',
            submittedQuizAnswers: 'A,B',
            isVerified: true,
            verificationScore: 88,
            taskReview: {
              reviewId: 'review-1',
              mentorId: 'mentor-1',
              mentorUserName: 'mentor01',
              status: 'Pending',
              requestedAt: '2026-04-24T13:05:00Z',
            },
            createdAt: '2026-04-24T12:00:00Z',
          },
        ],
        pageNumber: 1,
        pageSize: 10,
        totalCount: 1,
        totalPages: 1,
      },
    })

    const result = await getSessionHistory({ pageNumber: 1, pageSize: 10 })

    expect(result.items[0]).toMatchObject({
      submittedQuizAnswers: 'A,B',
      taskReview: {
        reviewId: 'review-1',
        mentorUserName: 'mentor01',
        status: 'Pending',
      },
    })
  })

  it('keeps backward compatibility when taskReview is missing', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        items: [
          {
            sessionId: 'session-2',
            taskId: 'task-2',
            title: 'Study DFS',
            startTime: '2026-04-24T12:00:00Z',
            plannedDurationMinutes: 30,
            sessionStatus: 'CompletedOnTime',
            sessionType: 'Study',
            isVerified: false,
            createdAt: '2026-04-24T12:00:00Z',
          },
        ],
        pageNumber: 1,
        pageSize: 10,
        totalCount: 1,
        totalPages: 1,
      },
    })

    const result = await getSessionHistory({ pageNumber: 1, pageSize: 10 })

    expect(result.items[0].taskReview).toBeNull()
  })
})
