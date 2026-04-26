import { describe, expect, it } from 'vitest'
import {
  canCurrentUserSubmitTaskReview,
  canRequestTaskReview,
  hasTaskReviewSubmission,
  isTaskReviewQuotaReached,
} from './utils'

describe('task review ui helpers', () => {
  it('detects whether a focus session contains a submission', () => {
    expect(hasTaskReviewSubmission({
      submittedCode: null,
      submittedSummary: '',
      submittedQuizAnswers: 'A,B,C',
    } as any)).toBe(true)

    expect(hasTaskReviewSubmission({
      submittedCode: null,
      submittedSummary: '',
      submittedQuizAnswers: '',
    } as any)).toBe(false)
  })

  it('allows request button only when session has submission and no existing review', () => {
    expect(canRequestTaskReview({
      taskReview: null,
      submittedCode: 'code',
      submittedSummary: '',
      submittedQuizAnswers: '',
    } as any)).toBe(true)

    expect(canRequestTaskReview({
      taskReview: { reviewId: 'review-1' },
      submittedCode: 'code',
      submittedSummary: '',
      submittedQuizAnswers: '',
    } as any)).toBe(false)
  })

  it('treats zero remaining quota as exhausted', () => {
    expect(isTaskReviewQuotaReached(0)).toBe(true)
    expect(isTaskReviewQuotaReached(-1)).toBe(false)
  })

  it('shows mentor submit form only for assigned mentor on pending review', () => {
    expect(canCurrentUserSubmitTaskReview({
      status: 'Pending',
      mentorId: 'mentor-1',
    } as any, 'mentor-1', 'Mentor')).toBe(true)

    expect(canCurrentUserSubmitTaskReview({
      status: 'Reviewed',
      mentorId: 'mentor-1',
    } as any, 'mentor-1', 'Mentor')).toBe(false)

    expect(canCurrentUserSubmitTaskReview({
      status: 'Pending',
      mentorId: 'mentor-1',
    } as any, 'student-1', 'Student')).toBe(false)
  })
})
