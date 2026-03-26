import React from 'react'
import type { DirectConversationDto } from '../../types/chat'

interface Props {
  conversation: DirectConversationDto
  currentUserId: string
  isActive: boolean
  onClick(): void
}

function formatTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Yesterday'
  return d.toLocaleDateString([], { day: '2-digit', month: '2-digit' })
}

const ConversationItem: React.FC<Props> = ({
  conversation,
  currentUserId,
  isActive,
  onClick,
}) => {
  const otherName =
    conversation.mentorId === currentUserId
      ? conversation.studentName
      : conversation.mentorName

  const initials = otherName
    ? otherName
        .split(' ')
        .slice(-2)
        .map((w) => w[0]?.toUpperCase())
        .join('')
    : '?'

  const hasUnread = conversation.unreadCount > 0

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 16px',
        background: isActive ? 'var(--accent-primary)' : 'transparent',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.15s',
        borderRadius: '8px',
      }}
      onMouseEnter={(e) => {
        if (!isActive)
          (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-main)'
      }}
      onMouseLeave={(e) => {
        if (!isActive)
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--accent-primary)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {initials}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontWeight: hasUnread ? 700 : 500,
              fontSize: '14px',
              color: isActive ? '#fff' : 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '140px',
            }}
          >
            {otherName}
          </span>
          <span
            style={{
              fontSize: '11px',
              color: isActive ? 'rgba(255,255,255,0.7)' : 'var(--text-disabled)',
              flexShrink: 0,
            }}
          >
            {formatTime(conversation.lastMessageAt)}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontSize: '12px',
              color: isActive ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '155px',
            }}
          >
            {conversation.lastMessagePreview ?? ''}
          </span>
          {hasUnread && !isActive && (
            <span
              style={{
                background: 'var(--accent-primary)',
                color: '#fff',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 700,
                minWidth: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 5px',
                flexShrink: 0,
              }}
            >
              {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

export default ConversationItem
