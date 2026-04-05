import type { NotificationDto } from '../../types/notification'
import i18n from '../../i18n'
import { resolveNotificationText } from './utils'

let permissionRequest: Promise<NotificationPermission> | null = null

type DocumentLike = Pick<Document, 'visibilityState' | 'hasFocus'>

export function shouldShowBrowserNotification(doc: DocumentLike | null | undefined = typeof document !== 'undefined' ? document : null) {
  if (!doc) return false
  return doc.visibilityState !== 'visible' || !doc.hasFocus()
}

export function supportsBrowserNotifications() {
  return typeof window !== 'undefined' && typeof Notification !== 'undefined'
}

export async function ensureBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (!supportsBrowserNotifications()) return 'denied'
  if (Notification.permission !== 'default') return Notification.permission

  if (!permissionRequest) {
    permissionRequest = Notification.requestPermission()
      .catch(() => 'denied' as NotificationPermission)
      .finally(() => {
        permissionRequest = null
      })
  }

  return permissionRequest
}

function getBrowserNotificationBody(notification: NotificationDto) {
  const { message } = resolveNotificationText(notification, (key) => i18n.t(key))
  if (message) return message

  const type = String(notification.type || '').trim()
  if (type) return type

  return 'You have a new notification.'
}

export function showBrowserNotification(notification: NotificationDto) {
  if (!supportsBrowserNotifications()) return null
  if (Notification.permission !== 'granted') return null
  if (!shouldShowBrowserNotification()) return null

  const { title } = resolveNotificationText(notification, (key) => i18n.t(key))

  const browserNotification = new Notification(title || 'Notification', {
    body: getBrowserNotificationBody(notification),
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: `notification-${notification.notificationId}`,
  })

  browserNotification.onclick = () => {
    try {
      window.focus()
    } catch {
      // ignore focus failures
    }
    browserNotification.close()
  }

  window.setTimeout(() => {
    try {
      browserNotification.close()
    } catch {
      // ignore close failures
    }
  }, 10000)

  return browserNotification
}
