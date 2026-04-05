import type { NotificationDto } from '../../types/notification'
import i18n from '../../i18n'

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
  const rawMessage = String(notification.message || '').trim()
  const message = rawMessage ? (() => {
    const translated = i18n.t(rawMessage)
    if (translated !== rawMessage) return translated

    const looksLikeI18nKey = rawMessage.includes('.') && !rawMessage.includes(' ')
    if (looksLikeI18nKey && String(notification.type || '').trim() === 'ShareVersionUpdated') {
      const fallback = i18n.t('notification.shareVersionUpdated.message')
      if (fallback !== 'notification.shareVersionUpdated.message') return fallback
    }

    return rawMessage
  })() : ''
  if (message) return message

  if (String(notification.type || '').trim() === 'ShareVersionUpdated') {
    const translatedFallback = i18n.t('notification.shareVersionUpdated.message')
    if (translatedFallback && translatedFallback !== 'notification.shareVersionUpdated.message') {
      return translatedFallback
    }
  }

  const type = String(notification.type || '').trim()
  if (type) return type

  return 'You have a new notification.'
}

export function showBrowserNotification(notification: NotificationDto) {
  if (!supportsBrowserNotifications()) return null
  if (Notification.permission !== 'granted') return null
  if (!shouldShowBrowserNotification()) return null

  const rawTitle = String(notification.title || '').trim()
  const translatedTitle = rawTitle ? (() => {
    const translated = i18n.t(rawTitle)
    if (translated !== rawTitle) return translated

    const looksLikeI18nKey = rawTitle.includes('.') && !rawTitle.includes(' ')
    if (looksLikeI18nKey && String(notification.type || '').trim() === 'ShareVersionUpdated') {
      const fallback = i18n.t('notification.shareVersionUpdated.title')
      if (fallback !== 'notification.shareVersionUpdated.title') return fallback
    }

    return rawTitle
  })() : ''
  const title = translatedTitle
    || (String(notification.type || '').trim() === 'ShareVersionUpdated'
      ? i18n.t('notification.shareVersionUpdated.title')
      : '')
    || 'Notification'

  const browserNotification = new Notification(title, {
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
