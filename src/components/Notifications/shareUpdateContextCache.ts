import { getUpdateContext } from '../../services/LearningPathShareService'
import type { NotificationDto } from '../../types/notification'

export type ShareUpdateContextSummary = {
  mentorUserName?: string
  sourceLearningPathTitle?: string
}

const shareUpdateContextCache = new Map<string, ShareUpdateContextSummary>()
const shareUpdateContextInflight = new Map<string, Promise<ShareUpdateContextSummary | null>>()

export function isShareVersionUpdatedNotification(type?: string | null): boolean {
  const normalized = String(type || '').trim().toLowerCase()
  return normalized === 'shareversionupdated' || normalized === '9'
}

export function extractShareIdFromNotification(notification: Pick<NotificationDto, 'action'>): string | null {
  const direct = String(notification.action?.targetId || '').trim()
  if (direct) return direct

  const targetUrl = String(notification.action?.targetUrl || '').trim()
  const match = targetUrl.match(/^\/learning-path-shares\/([^/]+)\/updates(?:\?.*)?$/i)
    || targetUrl.match(/^\/learningpath-shares\/([^/]+)\/updates(?:\?.*)?$/i)
  return match?.[1] || null
}

export function getCachedShareUpdateContext(shareId: string): ShareUpdateContextSummary | undefined {
  return shareUpdateContextCache.get(shareId)
}

export function getCachedShareUpdateContextRecord(): Record<string, ShareUpdateContextSummary> {
  return Object.fromEntries(shareUpdateContextCache.entries())
}

export async function loadShareUpdateContext(shareId: string): Promise<ShareUpdateContextSummary | null> {
  const normalizedShareId = String(shareId || '').trim()
  if (!normalizedShareId) return null

  const cached = shareUpdateContextCache.get(normalizedShareId)
  if (cached) return cached

  const existingInflight = shareUpdateContextInflight.get(normalizedShareId)
  if (existingInflight) return existingInflight

  const request = getUpdateContext(normalizedShareId)
    .then((context) => {
      const summary: ShareUpdateContextSummary = {
        mentorUserName: String(context.mentorUserName || '').trim() || undefined,
        sourceLearningPathTitle: String(context.sourceLearningPathTitle || '').trim() || undefined,
      }
      shareUpdateContextCache.set(normalizedShareId, summary)
      return summary
    })
    .catch(() => null)
    .finally(() => {
      shareUpdateContextInflight.delete(normalizedShareId)
    })

  shareUpdateContextInflight.set(normalizedShareId, request)
  return request
}

export async function prefetchShareUpdateContextsFromNotifications(notifications: NotificationDto[]): Promise<void> {
  const shareIds = Array.from(new Set(
    notifications
      .filter((notification) => isShareVersionUpdatedNotification(notification.type))
      .map((notification) => extractShareIdFromNotification(notification))
      .filter((shareId): shareId is string => Boolean(shareId)),
  ))

  if (shareIds.length === 0) return

  await Promise.allSettled(shareIds.map((shareId) => loadShareUpdateContext(shareId)))
}
