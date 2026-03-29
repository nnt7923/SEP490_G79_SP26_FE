import React from 'react'
import useAuthStore from '../../store/useAuthStore'
import useAppNotificationStore from '../../store/useAppNotificationStore'
import NotificationService from '../../services/NotificationService'
import { disconnectNotificationHub, subscribeToNotifications } from '../../services/SignalR'
import {
  ensureBrowserNotificationPermission,
  showBrowserNotification,
} from './browser'

const NotificationBootstrap: React.FC = () => {
  const token = useAuthStore((state) => state.token)
  const bootstrap = useAppNotificationStore((state) => state.bootstrap)
  const prependRealtimeItem = useAppNotificationStore((state) => state.prependRealtimeItem)
  const syncUnreadCount = useAppNotificationStore((state) => state.syncUnreadCount)
  const reset = useAppNotificationStore((state) => state.reset)

  React.useEffect(() => {
    if (!token) {
      reset()
      disconnectNotificationHub().catch(() => {})
      return
    }

    let active = true
    let unsubscribe: (() => void) | null = null

    const run = async () => {
      try {
        await bootstrap()
        if (!active) return
        void ensureBrowserNotificationPermission()

        unsubscribe = await subscribeToNotifications({
          onReceiveNotification: (payload) => {
            const notification = NotificationService.normalizeRealtimeNotification(payload)
            const existing = [
              ...useAppNotificationStore.getState().items,
              ...useAppNotificationStore.getState().panelItems,
            ].some((item) => item.notificationId === notification.notificationId)
            prependRealtimeItem(notification)
            if (!notification.isRead && !existing) {
              syncUnreadCount(useAppNotificationStore.getState().unreadCount + 1)
              showBrowserNotification(notification)
            }
          },
          onUnreadCountChanged: (payload) => {
            const count = NotificationService.normalizeUnreadCountPayload(payload)
            syncUnreadCount(count)
          },
        })
      } catch {
        // keep notifications in degraded REST-only mode
      }
    }

    run()

    return () => {
      active = false
      unsubscribe?.()
    }
  }, [bootstrap, prependRealtimeItem, reset, syncUnreadCount, token])

  return null
}

export default NotificationBootstrap
