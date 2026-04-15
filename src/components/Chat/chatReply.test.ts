import { describe, expect, it } from 'vitest'
import type { DirectMessageDto } from '../../types/chat'
import {
  buildReplyDraft,
  buildReplyPreviewForMessage,
  isReplyableMessage,
} from './chatReply'

const baseContext = {
  currentUserId: 'user-1',
  otherParticipantName: 'Alex Mentor',
  youLabel: 'You',
  unavailableLabel: 'Message unavailable',
  sharedLearningPathLabel: 'Shared learning path',
}

const createMessage = (patch: Partial<DirectMessageDto>): DirectMessageDto => ({
  messageId: 'message-1',
  conversationId: 'conversation-1',
  senderId: 'user-2',
  content: 'Hello',
  messageType: 'Text',
  sentAt: '2026-03-25T09:10:00Z',
  deliveredAt: null,
  seenAt: null,
  ...patch,
})

describe('chatReply helpers', () => {
  it('recognizes replyable message types', () => {
    expect(isReplyableMessage(createMessage({ messageType: 'Text' }))).toBe(true)
    expect(isReplyableMessage(createMessage({ messageType: 'Emoji' }))).toBe(true)
    expect(
      isReplyableMessage(
        createMessage({
          messageType: 'LearningPathShare',
          learningPathShareId: 'share-1',
          content: 'Shared learning path: React Basics',
        })
      )
    ).toBe(true)
  })

  it('builds share reply preview from a full learning path share message', () => {
    const draft = buildReplyDraft(
      createMessage({
        messageId: 'share-message',
        messageType: 'LearningPathShare',
        learningPathShareId: 'share-1',
        learningPathTitle: 'React Basics',
        shareStatus: 'Accepted',
        content: 'Shared learning path: React Basics',
      }),
      baseContext
    )

    expect(draft).not.toBeNull()
    expect(draft?.preview).toEqual({
      kind: 'share',
      senderLabel: 'Alex Mentor',
      title: 'React Basics',
      label: 'Shared learning path',
      status: 'Accepted',
    })
  })

  it('parses learning path share title from replyToContent when source message is missing', () => {
    const preview = buildReplyPreviewForMessage(
      createMessage({
        messageId: 'reply-message',
        replyToMessageId: 'missing-source',
        replyToSenderId: 'user-2',
        replyToContent: 'Shared learning path: React Basics',
      }),
      [],
      baseContext
    )

    expect(preview).toEqual({
      kind: 'share',
      senderLabel: 'Alex Mentor',
      title: 'React Basics',
      label: 'Shared learning path',
      status: null,
    })
  })

  it('falls back to unavailable text when reply content is missing', () => {
    const preview = buildReplyPreviewForMessage(
      createMessage({
        messageId: 'reply-message',
        replyToMessageId: 'missing-source',
        replyToSenderId: 'user-1',
        replyToContent: null,
      }),
      [],
      baseContext
    )

    expect(preview).toEqual({
      kind: 'text',
      senderLabel: 'You',
      content: 'Message unavailable',
    })
  })

  it('supports PascalCase reply metadata from realtime payloads', () => {
    const rawMessage = {
      ...createMessage({
        messageId: 'reply-message',
      }),
      ReplyToMessageId: 'missing-source',
      ReplyToSenderId: 'user-2',
      ReplyToContent: 'Shared learning path: React Basics',
    } as DirectMessageDto

    expect(buildReplyPreviewForMessage(rawMessage, [], baseContext)).toEqual({
      kind: 'share',
      senderLabel: 'Alex Mentor',
      title: 'React Basics',
      label: 'Shared learning path',
      status: null,
    })
  })
})
