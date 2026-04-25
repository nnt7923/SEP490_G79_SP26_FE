import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../Axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}))

import api from '../Axios'
import TaskReviewService from './index'

const mockedApi = vi.mocked(api, true)

describe('TaskReviewService', () => {
  beforeEach(() => {
    mockedApi.get.mockReset()
    mockedApi.post.mockReset()
    mockedApi.put.mockReset()
  })

  it('unwraps request task review response', async () => {
    mockedApi.post.mockResolvedValue({
      data: {
        value: {
          reviewId: 'review-1',
          messageId: 'message-1',
          conversationId: 'conversation-1',
        },
      },
    })

    await expect(TaskReviewService.requestSessionReview('session-1', {
      mentorId: 'mentor-1',
      studentRequestNote: 'Please check async flow',
    })).resolves.toEqual({
      reviewId: 'review-1',
      messageId: 'message-1',
      conversationId: 'conversation-1',
    })
  })

  it('normalizes task review detail and status', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        reviewId: 'review-2',
        sessionId: 'session-2',
        taskId: 'task-2',
        taskTitle: 'Implement BFS',
        studentId: 'student-1',
        studentUserName: 'student01',
        mentorId: 'mentor-2',
        mentorUserName: 'mentor01',
        score: 85,
        feedback: 'Solid work',
        suggestions: 'Add edge-case handling',
        studentRequestNote: 'Review the queue logic',
        status: 'Reviewed',
        requestedAt: '2026-04-24T14:00:00Z',
        reviewedAt: '2026-04-24T15:30:00Z',
        submittedCode: 'console.log(1)',
        submittedSummary: 'Summary',
        submittedQuizAnswers: 'A,B,C',
        aiFeedback: 'AI feedback',
        verificationScore: 90,
        isVerified: true,
      },
    })

    await expect(TaskReviewService.getTaskReviewById('review-2')).resolves.toMatchObject({
      reviewId: 'review-2',
      sessionId: 'session-2',
      taskId: 'task-2',
      taskTitle: 'Implement BFS',
      status: 'Reviewed',
      score: 85,
      submittedQuizAnswers: 'A,B,C',
      verificationScore: 90,
      isVerified: true,
    })
  })

  it('unwraps submit review response', async () => {
    mockedApi.put.mockResolvedValue({
      data: {
        value: {
          message: 'Review submitted successfully.',
        },
      },
    })

    await expect(TaskReviewService.submitTaskReview('review-3', {
      score: 92,
      feedback: 'Great job',
      suggestions: null,
    })).resolves.toEqual({
      message: 'Review submitted successfully.',
    })
  })
})
