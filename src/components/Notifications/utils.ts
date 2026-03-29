import type { NavigateFunction } from 'react-router-dom'
import ROUTER from '../../router/ROUTER'
import type { NotificationDto } from '../../types/notification'

export type NotificationNavigationTarget = {
  path: string
  state?: Record<string, unknown>
}

function isSupportedNotificationPath(path: string): boolean {
  if (!path.startsWith('/')) return false

  return (
    path === ROUTER.SUBSCRIPTION ||
    path === ROUTER.SUBSCRIPTION_CURRENT ||
    path === ROUTER.MY_PLANS ||
    path === ROUTER.NOTIFICATIONS ||
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

  if (isSupportedNotificationPath(targetUrl)) {
    return { path: targetUrl }
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

  if (action?.targetType === 'subscription') {
    if (notification.type === 'PlanExpired') {
      return { path: ROUTER.SUBSCRIPTION }
    }
    return { path: ROUTER.SUBSCRIPTION_CURRENT }
  }

  return null
}

export async function navigateAndMarkNotificationRead(
  notification: NotificationDto,
  navigate: NavigateFunction,
  markAsRead: (notificationId: string) => Promise<unknown>,
) {
  const target = resolveNotificationNavigationTarget(notification)
  if (target) {
    navigate(target.path, target.state ? { state: target.state } : undefined)
  }

  if (!notification.isRead) {
    await markAsRead(notification.notificationId)
  }
}
