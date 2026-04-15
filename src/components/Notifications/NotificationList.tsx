import React from 'react'
import { useTranslation } from 'react-i18next'
import type { NotificationDto } from '../../types/notification'
import {
  formatNotificationDate,
  getNotificationSeverityTone,
  hasShareVersionUpdatedSnapshot,
  resolveNotificationText,
  resolveShareVersionUpdatedNotificationText,
  resolveShareVersionUpdatedTitleParts,
} from './utils'
import {
  extractShareIdFromNotification,
  getCachedShareUpdateContext,
  getCachedShareUpdateContextRecord,
  isShareVersionUpdatedNotification,
  loadShareUpdateContext,
} from './shareUpdateContextCache'

interface NotificationListProps {
  items: NotificationDto[]
  loading?: boolean
  error?: string | null
  emptyLabel: string
  onItemClick: (notification: NotificationDto) => void | Promise<void>
  onReadVisible?: (notificationIds: string[]) => void | Promise<void>
  compact?: boolean
  titleOnly?: boolean
  footer?: React.ReactNode
}

const NotificationList: React.FC<NotificationListProps> = ({
  items,
  loading = false,
  error = null,
  emptyLabel,
  onItemClick,
  onReadVisible,
  compact = false,
  titleOnly = false,
  footer,
}) => {
  const { t } = useTranslation('common')
  const [shareUpdateContextById, setShareUpdateContextById] = React.useState<Record<string, {
    mentorUserName?: string
    sourceLearningPathTitle?: string
  }>>(getCachedShareUpdateContextRecord)
  const loadingShareContextIdsRef = React.useRef<Set<string>>(new Set())
  const [loadingShareContextIds, setLoadingShareContextIds] = React.useState<Record<string, true>>({})
  const itemElementRef = React.useRef<Map<string, HTMLButtonElement>>(new Map())
  const observerRef = React.useRef<IntersectionObserver | null>(null)
  const queuedReadIdsRef = React.useRef<Set<string>>(new Set())
  const readDispatchTimerRef = React.useRef<number | null>(null)

  const flushQueuedReadIds = React.useCallback(() => {
    if (!onReadVisible || queuedReadIdsRef.current.size === 0) return

    const readIds = Array.from(queuedReadIdsRef.current)
    queuedReadIdsRef.current.clear()

    Promise.resolve(onReadVisible(readIds)).catch(() => {
      const observer = observerRef.current
      if (!observer) return

      readIds.forEach((notificationId) => {
        const targetElement = itemElementRef.current.get(notificationId)
        if (targetElement) {
          observer.observe(targetElement)
        }
      })
    })
  }, [onReadVisible])

  const scheduleQueuedReadDispatch = React.useCallback(() => {
    if (!onReadVisible || queuedReadIdsRef.current.size === 0) return
    if (readDispatchTimerRef.current != null) return

    readDispatchTimerRef.current = window.setTimeout(() => {
      readDispatchTimerRef.current = null
      flushQueuedReadIds()
    }, 120)
  }, [flushQueuedReadIds, onReadVisible])

  React.useEffect(() => {
    const shareIds = Array.from(new Set(items
      .filter((item) => isShareVersionUpdatedNotification(item.type) && !hasShareVersionUpdatedSnapshot(item))
      .map((item) => extractShareIdFromNotification(item))
      .filter((id): id is string => Boolean(id))))

    if (shareIds.length === 0) return

    let active = true
    shareIds.forEach((shareId) => {
      const cached = getCachedShareUpdateContext(shareId)
      if (cached) {
        if (!shareUpdateContextById[shareId]) {
          setShareUpdateContextById((prev) => ({
            ...prev,
            [shareId]: cached,
          }))
        }
        return
      }

      if (shareUpdateContextById[shareId]) return
      if (loadingShareContextIdsRef.current.has(shareId)) return

      loadingShareContextIdsRef.current.add(shareId)
      setLoadingShareContextIds((prev) => ({ ...prev, [shareId]: true }))

      void loadShareUpdateContext(shareId)
        .then((context) => {
          if (!active || !context) return
          setShareUpdateContextById((prev) => ({
            ...prev,
            [shareId]: context,
          }))
        })
        .catch(() => {})
        .finally(() => {
          loadingShareContextIdsRef.current.delete(shareId)
          setLoadingShareContextIds((prev) => {
            const next = { ...prev }
            delete next[shareId]
            return next
          })
        })
    })

    return () => {
      active = false
    }
  }, [items, shareUpdateContextById])

  const getShareVersionNotificationText = React.useCallback((notification: NotificationDto) => {
    const shareId = extractShareIdFromNotification(notification)
    const context = shareId ? shareUpdateContextById[shareId] : undefined
    return resolveShareVersionUpdatedNotificationText(notification, t, context)
  }, [shareUpdateContextById, t])

  React.useEffect(() => {
    if (!onReadVisible || typeof IntersectionObserver === 'undefined') {
      return
    }

    const unreadIds = items
      .filter((item) => !item.isRead)
      .map((item) => item.notificationId)

    if (unreadIds.length === 0) return

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return

        const element = entry.target as HTMLElement
        const notificationId = String(element.dataset.notificationId || '').trim()
        if (!notificationId) return

        queuedReadIdsRef.current.add(notificationId)
        observer.unobserve(entry.target)
      })

      scheduleQueuedReadDispatch()
    }, {
      threshold: 0.55,
    })

    observerRef.current = observer

    unreadIds.forEach((notificationId) => {
      const targetElement = itemElementRef.current.get(notificationId)
      if (targetElement) {
        observer.observe(targetElement)
      }
    })

    return () => {
      observer.disconnect()
      observerRef.current = null
      if (readDispatchTimerRef.current != null) {
        window.clearTimeout(readDispatchTimerRef.current)
        readDispatchTimerRef.current = null
      }
    }
  }, [items, onReadVisible, scheduleQueuedReadDispatch])

  if (loading) {
    return (
      <div style={{ padding: compact ? 16 : 20, color: 'var(--text-secondary)', fontSize: 13 }}>
        Loading notifications...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: compact ? 16 : 20, color: 'var(--danger-primary)', fontSize: 13 }}>
        {error}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div style={{ padding: compact ? 16 : 20, color: 'var(--text-secondary)', fontSize: 13 }}>
        {emptyLabel}
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 8 : 10 }}>
        {items.map((notification) => {
          const tone = getNotificationSeverityTone(notification.severity)
          const muted = notification.isRead
          const baseText = resolveNotificationText(notification, t)
          const shareId = isShareVersionUpdatedNotification(notification.type)
            ? extractShareIdFromNotification(notification)
            : null
          const hasSnapshot = hasShareVersionUpdatedSnapshot(notification)
          const hasShareContext = Boolean(shareId && shareUpdateContextById[shareId])
          const isShareContextLoading = Boolean(shareId && loadingShareContextIds[shareId])
          const shareContext = shareId ? shareUpdateContextById[shareId] : undefined

          const shareText = isShareVersionUpdatedNotification(notification.type)
            ? (hasShareContext
              ? getShareVersionNotificationText(notification)
              : (!hasSnapshot && isShareContextLoading
                ? {
                  title: t('notification.shareVersionUpdated.loadingTitle', { defaultValue: 'Loading update details...' }),
                  message: t('notification.shareVersionUpdated.loadingMessage', { defaultValue: 'Fetching mentor and learning path details.' }),
                }
                : getShareVersionNotificationText(notification)))
            : baseText
          const shareTitleParts = isShareVersionUpdatedNotification(notification.type)
            ? resolveShareVersionUpdatedTitleParts(notification, shareContext)
            : null
          const titleText = shareText.title
          const messageText = shareText.message
          return (
            <button
              key={notification.notificationId}
              type="button"
              data-notification-id={notification.notificationId}
              ref={(element) => {
                if (element) {
                  itemElementRef.current.set(notification.notificationId, element)
                  return
                }
                itemElementRef.current.delete(notification.notificationId)
              }}
              onClick={() => { void onItemClick(notification) }}
              style={{
                width: '100%',
                textAlign: 'left',
                border: compact && titleOnly ? '1px solid var(--border-base)' : `1px solid ${tone.border}`,
                borderLeft: compact && titleOnly ? '1px solid var(--border-base)' : `3px solid ${tone.accent}`,
                borderRadius: 4,
                background: muted ? 'var(--bg-main)' : (compact && titleOnly ? 'var(--bg-surface)' : tone.background),
                padding: compact ? '10px 12px' : '14px 16px',
                cursor: 'pointer',
                opacity: muted ? 0.72 : 1,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.borderColor = compact && titleOnly ? 'var(--accent-primary)' : tone.accent
                event.currentTarget.style.opacity = '1'
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.borderColor = compact && titleOnly ? 'var(--border-base)' : tone.border
                event.currentTarget.style.opacity = muted ? '0.72' : '1'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: titleOnly ? 0 : 6 }}>
                    {!notification.isRead && (
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 999,
                          background: titleOnly ? 'var(--accent-primary)' : tone.accent,
                          flexShrink: 0,
                        }}
                      />
                    )}
                    {!titleOnly && (
                      <span style={{ fontSize: 11, color: tone.meta, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                        {notification.severity || 'Low'}
                      </span>
                    )}
                  </div>
                  <div style={{ color: titleOnly ? 'var(--text-primary)' : tone.text, fontSize: compact ? 13 : 14, fontWeight: 700, lineHeight: 1.4 }}>
                    {shareTitleParts ? (
                      <>
                        <span style={{ color: titleOnly ? 'var(--text-primary)' : tone.text, fontWeight: 700 }}>
                          {t('notification.shareVersionUpdated.titleLead', { defaultValue: 'Lộ trình' })}{' '}
                        </span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 900 }}>
                          {shareTitleParts.pathTitle}
                        </span>
                        <span style={{ color: titleOnly ? 'var(--text-primary)' : tone.text, fontWeight: 700 }}>
                          {' '}
                          {t('notification.shareVersionUpdated.titleBridge', { defaultValue: 'đã có phiên bản mới' })}
                        </span>
                        {shareTitleParts.version != null && (
                          <span
                            style={{
                              display: 'inline-block',
                              marginLeft: 8,
                              padding: '2px 9px',
                              borderRadius: 999,
                              background: tone.accent,
                              border: `1px solid ${tone.accent}`,
                              color: '#fff',
                              fontWeight: 800,
                              letterSpacing: 0.2,
                              boxShadow: `0 0 0 1px ${tone.accent}22`,
                            }}
                          >
                            ver {shareTitleParts.version}
                          </span>
                        )}
                      </>
                    ) : (
                      titleText || notification.title
                    )}
                  </div>
                  {!titleOnly && messageText && (
                    <div style={{ marginTop: 6, color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.5 }}>
                      {messageText}
                    </div>
                  )}
                </div>
                {!titleOnly && (
                  <div style={{ flexShrink: 0, fontSize: 11, color: 'var(--text-secondary)' }}>
                    {formatNotificationDate(notification.createdAt)}
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {footer && (
        <div style={{ marginTop: compact ? 12 : 16 }}>
          {footer}
        </div>
      )}
    </div>
  )
}

export default NotificationList
