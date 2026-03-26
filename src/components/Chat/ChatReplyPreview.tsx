import React from 'react'
import { Map, X } from 'lucide-react'
import type { ShareStatus } from '../../types/chat'
import type { ReplyPreviewModel } from './chatReply'

type Props = {
  preview: ReplyPreviewModel
  variant?: 'bubble' | 'composer'
  onClose?: () => void
  closeLabel?: string
}

const statusClassMap: Record<ShareStatus, string> = {
  Pending: 'chat-kit-share-status chat-kit-share-status--pending',
  Accepted: 'chat-kit-share-status chat-kit-share-status--accepted',
  Rejected: 'chat-kit-share-status chat-kit-share-status--rejected',
}

const ChatReplyPreview: React.FC<Props> = ({
  preview,
  variant = 'bubble',
  onClose,
  closeLabel = 'Close reply preview',
}) => (
  <div className={`chat-kit-reply-preview chat-kit-reply-preview--${variant}`}>
    <div className="chat-kit-reply-preview__body">
      <div className="chat-kit-reply-preview__header">
        <span className="chat-kit-reply-preview__sender">{preview.senderLabel}</span>
        {preview.kind === 'share' && (
          <span className="chat-kit-reply-preview__label">{preview.label}</span>
        )}
      </div>

      {preview.kind === 'share' ? (
        <div className="chat-kit-reply-preview__content chat-kit-reply-preview__content--share">
          <span className="chat-kit-reply-preview__icon">
            <Map size={12} />
          </span>
          <span className="chat-kit-reply-preview__text">{preview.title}</span>
          {preview.status && (
            <span className={`${statusClassMap[preview.status]} chat-kit-reply-preview__status`}>
              {preview.status}
            </span>
          )}
        </div>
      ) : (
        <div className="chat-kit-reply-preview__content">
          <span className="chat-kit-reply-preview__text">{preview.content}</span>
        </div>
      )}
    </div>

    {onClose && (
      <button
        type="button"
        className="chat-kit-reply-preview__close"
        onClick={onClose}
        aria-label={closeLabel}
      >
        <X size={14} />
      </button>
    )}
  </div>
)

export default ChatReplyPreview
