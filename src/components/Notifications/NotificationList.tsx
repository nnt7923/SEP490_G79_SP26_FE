import React from 'react'
import type { NotificationDto } from '../../types/notification'
import { formatNotificationDate, getNotificationSeverityTone } from './utils'

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
                    {notification.title}
                  </div>
                  {!titleOnly && notification.message && (
                    <div style={{ marginTop: 6, color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.5 }}>
                      {notification.message}
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
