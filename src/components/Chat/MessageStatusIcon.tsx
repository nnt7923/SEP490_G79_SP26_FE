import React from 'react'
import { Check, CheckCheck } from 'lucide-react'
import type { MessageStatus } from '../../types/chat'

interface Props {
  status: MessageStatus
}

/**
 * Shows the delivery/read receipt icon next to a sent message.
 * ✓  = sent
 * ✓✓ = delivered (grey)
 * ✓✓ = seen (accent blue)
 */
const MessageStatusIcon: React.FC<Props> = ({ status }) => {
  if (status === 'seen') {
    return (
      <CheckCheck
        size={14}
        style={{ color: 'var(--accent-primary)', flexShrink: 0 }}
        aria-label="Seen"
      />
    )
  }
  if (status === 'delivered') {
    return (
      <CheckCheck
        size={14}
        style={{ color: 'var(--text-disabled)', flexShrink: 0 }}
        aria-label="Delivered"
      />
    )
  }
  return (
    <Check
      size={14}
      style={{ color: 'var(--text-disabled)', flexShrink: 0 }}
      aria-label="Sent"
    />
  )
}

export default MessageStatusIcon
