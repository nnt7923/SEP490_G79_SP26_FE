import type { DirectMessageDto } from '../../types/chat'

const asString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized || null
}

export const getTaskReviewId = (
  message: DirectMessageDto | Record<string, any>,
): string | null =>
  asString((message as any)?.taskReviewId)
  ?? asString((message as any)?.TaskReviewId)

export const getTaskReviewMessageType = (
  message: DirectMessageDto | Record<string, any>,
): string | null =>
  asString((message as any)?.messageType)
  ?? asString((message as any)?.MessageType)

export const isTaskReviewMessage = (
  message: DirectMessageDto | Record<string, any>,
): boolean => {
  const rawType = getTaskReviewMessageType(message)
  const numericType = Number((message as any)?.messageType ?? (message as any)?.MessageType)
  return rawType === 'TaskReview' || numericType === 3 || !!getTaskReviewId(message)
}
