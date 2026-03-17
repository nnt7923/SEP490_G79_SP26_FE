import React from 'react'
import type { DirectMessageDto } from '../../types/chat'
import { getMessageStatus } from '../../types/chat'
import MessageStatusIcon from './MessageStatusIcon'

interface Props {
  message: DirectMessageDto
  isMine: boolean
  /** If true, show status icon (only for the sender's last message) */
  showStatus?: boolean
}

const MessageBubble: React.FC<Props> = ({ message, isMine, showStatus }) => {
  const status = getMessageStatus(message)

  const displayContent = (() => {
    const raw = message.content ?? ''
    if (!raw.includes('\n') && !raw.includes('\r')) return raw
    const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const parts = normalized.split('\n')
    const nonEmpty = parts.filter(p => p.length > 0)
    if (nonEmpty.length >= 2 && nonEmpty.every(p => p.length === 1)) {
      return nonEmpty.join('')
    }
    return raw
  })()

  const bubbleStyle: React.CSSProperties = {
    maxWidth: '72%',
    width: 'fit-content',
    padding: '8px 12px',
    borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
    background: isMine ? 'var(--accent-primary)' : 'var(--bg-surface)',
    color: isMine ? '#fff' : 'var(--text-primary)',
    fontSize: '14px',
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
    wordBreak: 'normal',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: isMine ? 'none' : '1px solid var(--border-base)',
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isMine ? 'flex-end' : 'flex-start',
        marginBottom: '4px',
      }}
    >
      <div style={bubbleStyle}>{displayContent}</div>
      {showStatus && isMine && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginTop: '2px',
            paddingRight: '2px',
          }}
        >
          <MessageStatusIcon status={status} />
        </div>
      )}
      <span
        style={{
          fontSize: '11px',
          color: 'var(--text-disabled)',
          marginTop: '2px',
          paddingLeft: isMine ? 0 : '2px',
          paddingRight: isMine ? '2px' : 0,
        }}
      >
        {new Date(message.sentAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </span>
    </div>
  )
}

export default MessageBubble
