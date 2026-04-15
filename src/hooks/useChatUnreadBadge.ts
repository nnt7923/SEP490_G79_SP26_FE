import { useEffect } from 'react'
import { getUnreadCount } from '../services/DirectChatService'
import useChatStore from '../store/useChatStore'

export function useChatUnreadBadge() {
  const setGlobalUnreadCount = useChatStore((state) => state.setGlobalUnreadCount)

  useEffect(() => {
    let active = true

    const syncUnreadCount = async () => {
      try {
        const response = await getUnreadCount()
        if (!active) return
        setGlobalUnreadCount(response?.totalUnreadCount ?? 0)
      } catch {
        // Keep the last known unread count when refresh fails.
      }
    }

    void syncUnreadCount()

    if (typeof window === 'undefined') {
      return () => {
        active = false
      }
    }

    const handleFocus = () => {
      void syncUnreadCount()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void syncUnreadCount()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      active = false
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [setGlobalUnreadCount])
}

export default useChatUnreadBadge
