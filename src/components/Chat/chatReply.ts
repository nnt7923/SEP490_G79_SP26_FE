import type {
  DirectMessageDto,
  LearningPathShareCardData,
  PendingLearningPathShareSummaryDto,
  ShareStatus,
} from '../../types/chat'
import {
  buildLearningPathShareCardData,
  extractSharedLearningPathTitle,
  getMessageTypeValue,
} from './learningPathShare'

export type ReplyPreviewModel =
  | {
    kind: 'text'
    senderLabel: string
    content: string
  }
  | {
    kind: 'share'
    senderLabel: string
    title: string
    label: string
    status: ShareStatus | null
  }

export interface ReplyDraft {
  messageId: string
  preview: ReplyPreviewModel
}

export interface ReplyPreviewContext {
  currentUserId: string
  otherParticipantName: string
  youLabel: string
  unavailableLabel: string
  sharedLearningPathLabel?: string
  pendingShares?: PendingLearningPathShareSummaryDto[]
  resolveShareCardData?: (message: DirectMessageDto) => LearningPathShareCardData | null
}

const REPLYABLE_TYPES = new Set(['Text', 'Emoji', 'LearningPathShare'])

export function normalizeChatMessageContent(raw: string | null | undefined): string {
  const content = raw ?? ''
  if (!content.includes('\n') && !content.includes('\r')) return content

  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const parts = normalized.split('\n')
  const nonEmpty = parts.filter((part) => part.length > 0)

  if (nonEmpty.length >= 2 && nonEmpty.every((part) => part.length === 1)) {
    return nonEmpty.join('')
  }

  return content
}

export function isReplyableMessage(message: DirectMessageDto | Record<string, any>): boolean {
  const messageType = getMessageTypeValue(message)
  return !!messageType && REPLYABLE_TYPES.has(messageType)
}

function getReplySenderLabel(senderId: string | null | undefined, context: ReplyPreviewContext): string {
  if (senderId && senderId === context.currentUserId) return context.youLabel
  return context.otherParticipantName || context.youLabel
}

function buildTextReplyPreview(
  senderLabel: string,
  content: string | null | undefined,
  context: ReplyPreviewContext
): ReplyPreviewModel {
  const normalizedContent = normalizeChatMessageContent(content).trim()
  return {
    kind: 'text',
    senderLabel,
    content: normalizedContent || context.unavailableLabel,
  }
}

function buildShareReplyPreview(
  senderLabel: string,
  title: string,
  status: ShareStatus | null,
  context: ReplyPreviewContext
): ReplyPreviewModel {
  return {
    kind: 'share',
    senderLabel,
    title,
    status,
    label: context.sharedLearningPathLabel ?? 'Shared learning path',
  }
}

function resolveShareReplyPreview(
  message: DirectMessageDto,
  senderLabel: string,
  context: ReplyPreviewContext
): ReplyPreviewModel | null {
  const shareCardData =
    context.resolveShareCardData?.(message) ??
    buildLearningPathShareCardData(message, context.pendingShares ?? [])

  const title =
    shareCardData?.title?.trim() ||
    extractSharedLearningPathTitle(normalizeChatMessageContent(message.content))

  if (!title) return null

  return buildShareReplyPreview(senderLabel, title, shareCardData?.status ?? null, context)
}

function buildReplyPreviewFromSourceMessage(
  message: DirectMessageDto,
  context: ReplyPreviewContext
): ReplyPreviewModel {
  const senderLabel = getReplySenderLabel(message.senderId, context)

  if (getMessageTypeValue(message) === 'LearningPathShare') {
    return resolveShareReplyPreview(message, senderLabel, context)
      ?? buildTextReplyPreview(senderLabel, null, context)
  }

  return buildTextReplyPreview(senderLabel, message.content, context)
}

export function buildReplyDraft(
  message: DirectMessageDto,
  context: ReplyPreviewContext
): ReplyDraft | null {
  if (!isReplyableMessage(message)) return null

  return {
    messageId: message.messageId,
    preview: buildReplyPreviewFromSourceMessage(message, context),
  }
}

export function buildReplyPreviewForMessage(
  message: DirectMessageDto,
  messages: DirectMessageDto[],
  context: ReplyPreviewContext
): ReplyPreviewModel | null {
  if (!message.replyToMessageId) return null

  const sourceMessage = messages.find((item) => item.messageId === message.replyToMessageId)
  if (sourceMessage) return buildReplyPreviewFromSourceMessage(sourceMessage, context)

  const senderLabel = getReplySenderLabel(message.replyToSenderId, context)
  const normalizedReplyContent = normalizeChatMessageContent(message.replyToContent).trim()
  const shareTitle = extractSharedLearningPathTitle(normalizedReplyContent)

  if (shareTitle) {
    return buildShareReplyPreview(senderLabel, shareTitle, null, context)
  }

  return buildTextReplyPreview(senderLabel, normalizedReplyContent, context)
}

export function getReplyPreviewText(preview: ReplyPreviewModel): string {
  if (preview.kind === 'share') return preview.title
  return preview.content
}
