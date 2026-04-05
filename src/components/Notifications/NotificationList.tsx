import React from 'react'
import { useTranslation } from 'react-i18next'
import type { NotificationDto } from '../../types/notification'
import { formatNotificationDate, getNotificationSeverityTone, resolveNotificationText } from './utils'
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

  React.useEffect(() => {
    const shareIds = Array.from(new Set(items
      .filter((item) => isShareVersionUpdatedNotification(item.type))
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
    const mentorName = String(context?.mentorUserName || '').trim()
    const pathTitle = String(context?.sourceLearningPathTitle || '').trim()

    if (mentorName && pathTitle) {
      return {
        title: t('notification.shareVersionUpdated.titleDetailed', { pathTitle, defaultValue: '{{pathTitle}} has a new version' }),
        message: t('notification.shareVersionUpdated.messageDetailed', {
          mentorName,
          pathTitle,
          defaultValue: 'Mentor {{mentorName}} updated the shared learning path {{pathTitle}}.',
        }),
      }
    }

    if (pathTitle) {
      return {
        title: t('notification.shareVersionUpdated.titleDetailed', { pathTitle, defaultValue: '{{pathTitle}} has a new version' }),
        message: t('notification.shareVersionUpdated.messagePathOnly', {
          pathTitle,
          defaultValue: 'The shared learning path {{pathTitle}} has a new version from your mentor.',
        }),
      }
    }

    if (mentorName) {
      return {
        title: t('notification.shareVersionUpdated.title', { defaultValue: 'Learning path updated by mentor' }),
        message: t('notification.shareVersionUpdated.messageMentorOnly', {
          mentorName,
          defaultValue: 'Mentor {{mentorName}} updated a shared learning path.',
        }),
      }
    }

    return resolveNotificationText(notification, t)
  }, [shareUpdateContextById, t])

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
          const hasShareContext = Boolean(shareId && shareUpdateContextById[shareId])
          const isShareContextLoading = Boolean(shareId && loadingShareContextIds[shareId])

          const shareText = isShareVersionUpdatedNotification(notification.type)
            ? (hasShareContext
              ? getShareVersionNotificationText(notification)
              : (isShareContextLoading
                ? {
                  title: t('notification.shareVersionUpdated.loadingTitle', { defaultValue: 'Loading update details...' }),
                  message: t('notification.shareVersionUpdated.loadingMessage', { defaultValue: 'Fetching mentor and learning path details.' }),
                }
                : getShareVersionNotificationText(notification)))
            : baseText
          const titleText = shareText.title
          const messageText = shareText.message
          return (
            <button
              key={notification.notificationId}
              type="button"
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
                    {titleText || notification.title}
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
