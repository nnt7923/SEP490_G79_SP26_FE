import type { NavigateFunction } from 'react-router-dom'
import ROUTER from '../../router/ROUTER'
import type { NotificationDto } from '../../types/notification'

export type NotificationNavigationTarget = {
  path: string
  state?: Record<string, unknown>
}

type TranslateFn = (key: string, options?: Record<string, unknown>) => string

type ShareUpdateContextLike = {
  mentorUserName?: string
  sourceLearningPathTitle?: string
}

export type ShareVersionUpdatedTitleParts = {
  pathTitle: string
  version: number | null
}

const SHARE_VERSION_UPDATED_TITLE_KEY = 'notification.shareVersionUpdated.title'
const SHARE_VERSION_UPDATED_MESSAGE_KEY = 'notification.shareVersionUpdated.message'
const NOTIFICATION_DEFAULT_TITLE_KEY = 'notification.default.title'

function normalizeText(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim()
}

function stripTrailingVersionLabel(value: string): string {
  return value.replace(/\s+(?:ver|version)\s*\d+\s*$/i, '').trim()
}

function looksLikeI18nKey(value: string): boolean {
  return value.includes('.') && !value.includes(' ')
}

function isShareVersionUpdatedType(type?: string | null): boolean {
  const normalized = String(type || '').trim().toLowerCase()
  return normalized === 'shareversionupdated' || normalized === '9'
}

function translateKeyIfExists(key: string, t: TranslateFn): string | null {
  const translated = t(key)
  if (translated !== key) return translated
  return null
}

function fallbackTitleByType(type?: string | null, raw?: string | null, t?: TranslateFn): string {
  const rawText = normalizeText(raw)
  if (rawText && !looksLikeI18nKey(rawText)) return rawText

  if (isShareVersionUpdatedType(type)) {
    const translated = t ? translateKeyIfExists(SHARE_VERSION_UPDATED_TITLE_KEY, t) : null
    return translated || 'Learning path updated'
  }

  const translatedDefault = t ? translateKeyIfExists(NOTIFICATION_DEFAULT_TITLE_KEY, t) : null
  return translatedDefault || 'Notification'
}

function fallbackMessageByType(type?: string | null, raw?: string | null, t?: TranslateFn): string {
  const rawText = normalizeText(raw)
  if (rawText && !looksLikeI18nKey(rawText)) return rawText

  if (isShareVersionUpdatedType(type)) {
    const translated = t ? translateKeyIfExists(SHARE_VERSION_UPDATED_MESSAGE_KEY, t) : null
    return translated || 'A newer shared learning path version is available. Review changes and choose how to sync.'
  }

  return ''
}

function resolveFieldValue(
  rawValue: string,
  type: string | null | undefined,
  t: TranslateFn,
  fallback: (type?: string | null, raw?: string | null, t?: TranslateFn) => string,
): string {
  if (rawValue) {
    const translated = translateKeyIfExists(rawValue, t)
    if (translated) return translated

    if (!looksLikeI18nKey(rawValue)) return rawValue
  }

  return fallback(type, rawValue, t)
}

export function resolveNotificationText(
  notification: Pick<NotificationDto, 'type' | 'title' | 'message'>,
  t: TranslateFn,
): { title: string; message: string } {
  const rawTitle = normalizeText(notification.title)
  const rawMessage = normalizeText(notification.message)

  const title = resolveFieldValue(rawTitle, notification.type, t, fallbackTitleByType)
  const message = resolveFieldValue(rawMessage, notification.type, t, fallbackMessageByType)

  return { title, message }
}

export function hasShareVersionUpdatedSnapshot(
  notification: Pick<NotificationDto, 'notifiedPathTitle' | 'notifiedMentorUserName' | 'notifiedSourceVersion'>,
): boolean {
  return Boolean(
    normalizeText(notification.notifiedPathTitle)
    || normalizeText(notification.notifiedMentorUserName)
    || notification.notifiedSourceVersion != null,
  )
}

export function resolveShareVersionUpdatedTitleParts(
  notification: Pick<NotificationDto, 'notifiedPathTitle' | 'notifiedSourceVersion'>,
  fallbackContext?: ShareUpdateContextLike,
): ShareVersionUpdatedTitleParts | null {
  const pathTitle = stripTrailingVersionLabel(
    normalizeText(notification.notifiedPathTitle)
    || normalizeText(fallbackContext?.sourceLearningPathTitle),
  )

  if (!pathTitle) return null

  return {
    pathTitle,
    version: notification.notifiedSourceVersion,
  }
}

export function resolveShareVersionUpdatedNotificationText(
  notification: Pick<NotificationDto, 'type' | 'title' | 'message' | 'notifiedPathTitle' | 'notifiedMentorUserName' | 'notifiedSourceVersion'>,
  t: TranslateFn,
  fallbackContext?: ShareUpdateContextLike,
): { title: string; message: string } {
  const baseText = resolveNotificationText(notification, t)

  if (!isShareVersionUpdatedType(notification.type)) {
    return baseText
  }

  const titleParts = resolveShareVersionUpdatedTitleParts(notification, fallbackContext)
  const pathTitle = titleParts?.pathTitle || ''
  const mentorName = normalizeText(notification.notifiedMentorUserName)
    || normalizeText(fallbackContext?.mentorUserName)
  const sourceVersion = titleParts?.version ?? null
  const detailedTitle = pathTitle
    ? t(
      sourceVersion != null
        ? 'notification.shareVersionUpdated.titleDetailedWithVersion'
        : 'notification.shareVersionUpdated.titleDetailed',
      {
        pathTitle,
        version: sourceVersion,
        defaultValue: 'Learning path {{pathTitle}} has a new version ver {{version}}',
      },
    )
    : baseText.title

  if (mentorName && pathTitle) {
    return {
      title: detailedTitle,
      message: t('notification.shareVersionUpdated.messageDetailed', {
        mentorName,
        pathTitle,
        defaultValue: 'Mentor {{mentorName}} updated the shared learning path {{pathTitle}}.',
      }),
    }
  }

  if (pathTitle) {
    return {
      title: detailedTitle,
      message: t('notification.shareVersionUpdated.messagePathOnly', {
        pathTitle,
        defaultValue: 'The shared learning path {{pathTitle}} has a new version from your mentor.',
      }),
    }
  }

  if (mentorName) {
    return {
      title: baseText.title,
      message: t('notification.shareVersionUpdated.messageMentorOnly', {
        mentorName,
        defaultValue: 'Mentor {{mentorName}} updated a shared learning path.',
      }),
    }
  }

  return baseText
}

function extractShareIdFromUpdatePath(path: string): string | null {
  const trimmed = String(path || '').trim()
  const match = trimmed.match(/^\/learning-path-shares\/([^/]+)\/updates(?:\?.*)?$/i)
    || trimmed.match(/^\/learningpath-shares\/([^/]+)\/updates(?:\?.*)?$/i)
  return match?.[1] || null
}

function isSupportedNotificationPath(path: string): boolean {
  if (!path.startsWith('/')) return false

  return (
    path === ROUTER.SHOP ||
    path === ROUTER.SUBSCRIPTION ||
    path === ROUTER.SUBSCRIPTION_CURRENT ||
    path === ROUTER.MY_PLANS ||
    path === ROUTER.NOTIFICATIONS ||
    path.startsWith('/learning-path-shares/') ||
    path.startsWith('/learningpath-shares/') ||
    path.startsWith('/lesson/') ||
    path.startsWith('/quiz/') ||
    path.startsWith('/my-plans/detail')
  )
}

export function getNotificationSeverityTone(severity?: string | null) {
  const normalized = String(severity || 'Low').trim().toLowerCase()

  if (normalized === 'critical') {
    return {
      border: 'rgba(207, 34, 46, 0.35)',
      accent: 'var(--danger-primary)',
      background: 'rgba(207, 34, 46, 0.08)',
      text: 'var(--text-primary)',
      meta: 'var(--danger-primary)',
    }
  }

  if (normalized === 'high') {
    return {
      border: 'rgba(245, 158, 11, 0.35)',
      accent: '#f59e0b',
      background: 'rgba(245, 158, 11, 0.08)',
      text: 'var(--text-primary)',
      meta: '#d97706',
    }
  }

  if (normalized === 'medium') {
    return {
      border: 'rgba(59, 130, 246, 0.3)',
      accent: 'var(--accent-primary)',
      background: 'rgba(59, 130, 246, 0.06)',
      text: 'var(--text-primary)',
      meta: 'var(--accent-primary)',
    }
  }

  return {
    border: 'var(--border-base)',
    accent: 'var(--text-disabled)',
    background: 'var(--bg-surface)',
    text: 'var(--text-primary)',
    meta: 'var(--text-secondary)',
  }
}

export function formatNotificationDate(value?: string | null) {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''

  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed)
}

export function resolveNotificationNavigationTarget(notification: NotificationDto): NotificationNavigationTarget | null {
  const action = notification.action
  const targetUrl = String(action?.targetUrl || '').trim()
  const notificationType = String(notification.type || '').trim()

  if (action?.targetType === 'lesson') {
    const lessonId = action.lessonId || action.targetId
    if (lessonId) {
      return { path: `/lesson/${lessonId}` }
    }
  }

  if (action?.targetType === 'task') {
    const learningPathId = action.learningPathId
    if (learningPathId) {
      return {
        path: '/my-plans/detail',
        state: {
          pathId: learningPathId,
          activeChapterId: action.chapterId || null,
          selectedTaskId: action.taskId || action.targetId || null,
        },
      }
    }
  }

  if (action?.targetType === 'chapter') {
    const learningPathId = action.learningPathId
    if (learningPathId) {
      return {
        path: '/my-plans/detail',
        state: {
          pathId: learningPathId,
          activeChapterId: action.chapterId || action.targetId,
        },
      }
    }
    return { path: ROUTER.MY_PLANS }
  }

  if (action?.targetType === 'learningPath') {
    const learningPathId = action.learningPathId || action.targetId
    if (learningPathId) {
      return {
        path: '/my-plans/detail',
        state: { pathId: learningPathId },
      }
    }
    return { path: ROUTER.MY_PLANS }
  }

  if (action?.targetType === 'learningPathShareUpdate') {
    const shareId = String(action.targetId || '').trim() || extractShareIdFromUpdatePath(targetUrl)
    if (shareId) {
      return {
        path: ROUTER.LEARNING_PATH_SHARE_UPDATES.replace(':shareId', shareId),
      }
    }
  }

  if (action?.targetType === 'subscription') {
    if (notificationType === 'PlanExpired' || notificationType === 'PlanExpiringSoon') {
      return { path: ROUTER.SHOP }
    }
    return { path: ROUTER.SUBSCRIPTION_CURRENT }
  }

  const shareIdFromTargetUrl = extractShareIdFromUpdatePath(targetUrl)
  if (shareIdFromTargetUrl) {
    return {
      path: ROUTER.LEARNING_PATH_SHARE_UPDATES.replace(':shareId', shareIdFromTargetUrl),
    }
  }

  if (isSupportedNotificationPath(targetUrl)) {
    return { path: targetUrl }
  }

  return null
}

export async function navigateAndMarkNotificationRead(
  notification: NotificationDto,
  navigate: NavigateFunction,
  markAsRead: (notificationIds: string[]) => Promise<unknown>,
) {
  const target = resolveNotificationNavigationTarget(notification)
  if (target) {
    navigate(target.path, target.state ? { state: target.state } : undefined)
  }

  if (!notification.isRead) {
    await markAsRead([notification.notificationId])
  }
}
