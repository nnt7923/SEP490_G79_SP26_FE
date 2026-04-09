import api from '../Axios'
import type {
  MarkNotificationAsReadResultDto,
  NotificationAction,
  NotificationDto,
  NotificationListQuery,
  NotificationPagedResultDto,
} from '../../types/notification'

function toSafeString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function toNotificationType(value: unknown): string | null {
  const stringValue = toSafeString(value)
  if (stringValue) return stringValue

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  return null
}

function toBoolean(value: unknown, fallback: boolean = false): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true') return true
    if (normalized === 'false') return false
  }
  return fallback
}

function toSafeNumber(value: unknown, fallback: number): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function toNullableNumber(value: unknown): number | null {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function normalizeAction(raw: unknown): NotificationAction {
  const record = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const targetTypeRaw = toSafeString(record.targetType)
  const targetTypeNormalized = String(targetTypeRaw || '').toLowerCase()

  let targetType: NotificationAction['targetType'] = null
  if (targetTypeNormalized === 'task') targetType = 'task'
  else if (targetTypeNormalized === 'chapter') targetType = 'chapter'
  else if (targetTypeNormalized === 'lesson') targetType = 'lesson'
  else if (targetTypeNormalized === 'learningpath') targetType = 'learningPath'
  else if (targetTypeNormalized === 'learningpathshareupdate') targetType = 'learningPathShareUpdate'
  else if (targetTypeNormalized === 'subscription') targetType = 'subscription'

  return {
    targetType,
    targetId: toSafeString(record.targetId),
    targetUrl: toSafeString(record.targetUrl),
    route: toSafeString(record.route),
    taskId: toSafeString(record.taskId),
    chapterId: toSafeString(record.chapterId),
    lessonId: toSafeString(record.lessonId),
    learningPathId: toSafeString(record.learningPathId),
  }
}

function normalizeNotification(raw: unknown): NotificationDto {
  const record = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}

  return {
    notificationId: String(record.notificationId ?? record.id ?? ''),
    userId: String(record.userId ?? ''),
    type: toNotificationType(record.type),
    title: String(record.title ?? 'Notification'),
    message: toSafeString(record.message),
    notifiedPathTitle: toSafeString(record.notifiedPathTitle),
    notifiedSourceVersion: toNullableNumber(record.notifiedSourceVersion),
    notifiedMentorUserName: toSafeString(record.notifiedMentorUserName),
    createdAt: String(record.createdAt ?? ''),
    isRead: toBoolean(record.isRead),
    readAt: toSafeString(record.readAt),
    severity: String(record.severity ?? 'Low'),
    channels: Array.isArray(record.channels)
      ? record.channels.map((channel) => String(channel)).filter(Boolean)
      : [],
    action: normalizeAction(record.action),
  }
}

function extractNotificationItems(root: unknown): unknown[] {
  if (Array.isArray(root)) return root
  if (!root || typeof root !== 'object') return []

  const record = root as Record<string, unknown>
  if (Array.isArray(record.items)) return record.items
  if (Array.isArray(record.data)) return record.data
  if (record.data && typeof record.data === 'object') {
    const nested = record.data as Record<string, unknown>
    if (Array.isArray(nested.items)) return nested.items
  }

  return []
}

function normalizePagedNotifications(raw: unknown, fallbackQuery?: NotificationListQuery): NotificationPagedResultDto {
  const value = raw && typeof raw === 'object'
    ? ((raw as Record<string, unknown>).data ?? raw)
    : raw
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const itemsRaw = extractNotificationItems(record)

  return {
    items: itemsRaw.map(normalizeNotification),
    pageNumber: Math.max(1, toSafeNumber(record.pageNumber, fallbackQuery?.pageNumber ?? 1)),
    pageSize: Math.max(1, toSafeNumber(record.pageSize, fallbackQuery?.pageSize ?? (itemsRaw.length || 20))),
    totalCount: Math.max(0, toSafeNumber(record.totalCount, itemsRaw.length)),
    hasNextPage: toBoolean(record.hasNextPage),
    hasPreviousPage: toBoolean(record.hasPreviousPage),
  }
}

function normalizeUnreadCount(raw: unknown): number {
  if (typeof raw === 'number') return Math.max(0, raw)
  if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>
    if (typeof record.data === 'number') return Math.max(0, record.data)
    if (typeof record.unreadCount === 'number') return Math.max(0, record.unreadCount)
    if (record.data && typeof record.data === 'object') {
      const nested = record.data as Record<string, unknown>
      if (typeof nested.unreadCount === 'number') return Math.max(0, nested.unreadCount)
    }
  }
  return 0
}

function normalizeNotificationIds(value: unknown, fallbackIds: string[]): string[] {
  const fromArray = Array.isArray(value)
    ? value
      .map((item) => String(item || '').trim())
      .filter(Boolean)
    : []

  if (fromArray.length > 0) {
    return Array.from(new Set(fromArray))
  }

  return Array.from(new Set(fallbackIds.map((id) => String(id || '').trim()).filter(Boolean)))
}

function normalizeMarkAsReadResult(raw: unknown, notificationIds: string[]): MarkNotificationAsReadResultDto {
  const value = raw && typeof raw === 'object'
    ? ((raw as Record<string, unknown>).data ?? raw)
    : raw
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const normalizedIds = normalizeNotificationIds(record.notificationIds, notificationIds)
  const legacyNotificationId = toSafeString(record.notificationId)

  return {
    notificationIds: legacyNotificationId
      ? Array.from(new Set([...normalizedIds, legacyNotificationId]))
      : normalizedIds,
    readAt: toSafeString(record.readAt),
    unreadCount: Math.max(0, toSafeNumber(record.unreadCount, 0)),
  }
}

class NotificationService {
  async getMyNotifications(query: NotificationListQuery = {}): Promise<NotificationPagedResultDto> {
    const params = new URLSearchParams()
    params.set('pageNumber', String(query.pageNumber ?? 1))
    params.set('pageSize', String(query.pageSize ?? 20))
    params.set('unreadOnly', String(Boolean(query.unreadOnly)))

    const response = await api.get(`/notifications/my?${params.toString()}`)
    return normalizePagedNotifications(response, query)
  }

  async getUnreadCount(): Promise<number> {
    const response = await api.get('/notifications/unread-count')
    return normalizeUnreadCount(response)
  }

  async markAsRead(notificationIds: string[]): Promise<MarkNotificationAsReadResultDto> {
    const sanitizedIds = Array.from(new Set(notificationIds.map((id) => String(id || '').trim()).filter(Boolean)))
    if (sanitizedIds.length === 0) {
      return {
        notificationIds: [],
        readAt: null,
        unreadCount: 0,
      }
    }

    const response = await api.patch('/notifications/read', sanitizedIds)
    return normalizeMarkAsReadResult(response, sanitizedIds)
  }

  normalizeRealtimeNotification(raw: unknown): NotificationDto {
    return normalizeNotification(raw)
  }

  normalizeUnreadCountPayload(raw: unknown): number {
    return normalizeUnreadCount(raw)
  }
}

export default new NotificationService()
