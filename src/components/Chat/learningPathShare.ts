import type {
  DirectMessageDto,
  LearningPathShareCardData,
  PendingLearningPathShareSummaryDto,
  ShareStatus,
} from '../../types/chat'

const asString = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim()) return value
  return null
}

export const normalizeShareId = (value: string | null | undefined): string =>
  (value ?? '').trim().toLowerCase()

export const extractSharedLearningPathTitle = (content: string | null | undefined): string | null => {
  const raw = asString(content)
  if (!raw) return null

  const patterns = [
    /^shared learning path:\s*(.+)$/i,
    /^share learning path:\s*(.+)$/i,
    /^learning path shared:\s*(.+)$/i,
  ]

  for (const pattern of patterns) {
    const match = raw.match(pattern)
    if (match?.[1]?.trim()) return match[1].trim()
  }

  return null
}

export const getMessageTypeValue = (message: DirectMessageDto | Record<string, any>): string | null =>
  asString(message?.messageType) ??
  asString((message as any)?.MessageType)

export const getLearningPathShareId = (message: DirectMessageDto | Record<string, any>): string | null =>
  asString(message?.learningPathShareId) ??
  asString((message as any)?.LearningPathShareId) ??
  asString((message as any)?.learningPathShare?.shareId) ??
  asString((message as any)?.LearningPathShare?.shareId)

export const isLearningPathShareMessage = (message: DirectMessageDto | Record<string, any>): boolean =>
  getMessageTypeValue(message) === 'LearningPathShare' && !!getLearningPathShareId(message)

export function buildLearningPathShareCardData(
  message: DirectMessageDto,
  pendingShares: PendingLearningPathShareSummaryDto[] = []
): LearningPathShareCardData | null {
  const shareId = getLearningPathShareId(message)
  if (!shareId) return null

  const nested = (message as any)?.learningPathShare ?? (message as any)?.LearningPathShare ?? {}
  const normalizedShareId = normalizeShareId(shareId)
  const pendingShare = pendingShares.find((share) => normalizeShareId(share.shareId) === normalizedShareId)

  const title =
    asString(message.learningPathTitle) ??
    asString((message as any)?.LearningPathTitle) ??
    asString(nested?.learningPathTitle) ??
    asString(nested?.title) ??
    extractSharedLearningPathTitle(message.content) ??
    asString(pendingShare?.learningPathTitle)

  if (!title) return null

  const status =
    (asString(message.shareStatus) ??
      asString((message as any)?.ShareStatus) ??
      asString(nested?.status) ??
      asString(pendingShare?.status) ??
      'Pending') as ShareStatus

  return {
    shareId,
    pathId:
      asString(message.pathId) ??
      asString((message as any)?.PathId) ??
      asString(nested?.pathId) ??
      asString(pendingShare?.pathId),
    title,
    description:
      asString(message.learningPathDescription) ??
      asString((message as any)?.LearningPathDescription) ??
      asString(nested?.learningPathDescription) ??
      asString(nested?.description) ??
      pendingShare?.learningPathDescription ??
      null,
    mentorName:
      asString(message.mentorName) ??
      asString((message as any)?.MentorName) ??
      asString(nested?.mentorName) ??
      asString(pendingShare?.mentorName),
    studentName:
      asString(message.studentName) ??
      asString((message as any)?.StudentName) ??
      asString(nested?.studentName),
    status,
    sentAt:
      asString(message.sentAt) ??
      asString((message as any)?.SentAt) ??
      asString(nested?.sentAt) ??
      asString(pendingShare?.sentAt),
    respondedAt:
      asString(message.respondedAt) ??
      asString((message as any)?.RespondedAt) ??
      asString(nested?.respondedAt),
  }
}
