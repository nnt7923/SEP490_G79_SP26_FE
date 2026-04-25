import { describe, expect, it } from 'vitest'
import { getTaskReviewId, isTaskReviewMessage } from './taskReview'

describe('taskReview chat helpers', () => {
  it('detects string TaskReview messages', () => {
    const message = {
      messageType: 'TaskReview',
      taskReviewId: 'review-1',
    }

    expect(isTaskReviewMessage(message as any)).toBe(true)
    expect(getTaskReviewId(message as any)).toBe('review-1')
  })

  it('detects numeric messageType 3 with PascalCase review id', () => {
    const message = {
      MessageType: 3,
      TaskReviewId: 'review-2',
    }

    expect(isTaskReviewMessage(message as any)).toBe(true)
    expect(getTaskReviewId(message as any)).toBe('review-2')
  })
})
