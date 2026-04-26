import { describe, expect, it } from 'vitest'
import { normalizeDirectMessage } from './useChatHub'

describe('useChatHub normalization', () => {
  it('normalizes realtime direct messages with PascalCase reply fields', () => {
    const normalized = normalizeDirectMessage({
      MessageId: 'message-2',
      ConversationId: 'conversation-1',
      SenderId: 'mentor-1',
      Content: 'Reply here',
      MessageType: 'Text',
      SentAt: '2026-04-02T09:00:00Z',
      ReplyToMessageId: 'message-1',
      ReplyToSenderId: 'student-1',
      ReplyToContent: 'Hello',
    })

    expect(normalized).toMatchObject({
      messageId: 'message-2',
      conversationId: 'conversation-1',
      senderId: 'mentor-1',
      content: 'Reply here',
      messageType: 'Text',
      sentAt: '2026-04-02T09:00:00Z',
      replyToMessageId: 'message-1',
      replyToSenderId: 'student-1',
      replyToContent: 'Hello',
    })
  })

  it('normalizes nested learning path share payloads from realtime messages', () => {
    const normalized = normalizeDirectMessage({
      MessageId: 'message-share',
      ConversationId: 'conversation-1',
      SenderId: 'mentor-1',
      Content: 'Shared learning path: React Basics',
      MessageType: 'LearningPathShare',
      SentAt: '2026-04-02T09:01:00Z',
      LearningPathShare: {
        ShareId: 'share-1',
        PathId: 'path-1',
        LearningPathTitle: 'React Basics',
        LearningPathDescription: 'Intro course',
        MentorName: 'Alex Mentor',
        StudentName: 'Sam Student',
        Status: 'Pending',
        RespondedAt: null,
      },
    })

    expect(normalized).toMatchObject({
      messageId: 'message-share',
      conversationId: 'conversation-1',
      learningPathShareId: 'share-1',
      learningPathTitle: 'React Basics',
      learningPathDescription: 'Intro course',
      pathId: 'path-1',
      mentorName: 'Alex Mentor',
      studentName: 'Sam Student',
      shareStatus: 'Pending',
    })
    expect(normalized?.learningPathShare).toMatchObject({
      shareId: 'share-1',
      pathId: 'path-1',
      learningPathTitle: 'React Basics',
    })
  })

  it('normalizes task review realtime messages from numeric message type payloads', () => {
    const normalized = normalizeDirectMessage({
      MessageId: 'message-task-review',
      ConversationId: 'conversation-1',
      SenderId: 'student-1',
      Content: 'Please review my focus session',
      MessageType: 3,
      TaskReviewId: 'review-1',
      SentAt: '2026-04-24T09:01:00Z',
    })

    expect(normalized).toMatchObject({
      messageId: 'message-task-review',
      conversationId: 'conversation-1',
      messageType: 'TaskReview',
      taskReviewId: 'review-1',
      content: 'Please review my focus session',
    })
  })
})
