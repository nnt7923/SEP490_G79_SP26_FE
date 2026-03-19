import React from 'react'
import { Check, Eye, Map, X } from 'lucide-react'
import type { LearningPathShareCardData } from '../../types/chat'

type Props = {
  data: LearningPathShareCardData
  actionMode?: 'thread' | 'invite'
  canRespond?: boolean
  acceptLoading?: boolean
  rejectLoading?: boolean
  onAccept?: () => void
  onReject?: () => void
  onPreview?: () => void
  onViewPath?: () => void
  labels: {
    pending: string
    accepted: string
    rejected: string
    accept: string
    reject: string
    accepting: string
    rejecting: string
    preview: string
    viewPath: string
    shareFrom: (mentorName?: string | null) => string
  }
}

const statusClassMap: Record<LearningPathShareCardData['status'], string> = {
  Pending: 'chat-kit-share-status chat-kit-share-status--pending',
  Accepted: 'chat-kit-share-status chat-kit-share-status--accepted',
  Rejected: 'chat-kit-share-status chat-kit-share-status--rejected',
}

const statusLabelKeyMap: Record<LearningPathShareCardData['status'], keyof Props['labels']> = {
  Pending: 'pending',
  Accepted: 'accepted',
  Rejected: 'rejected',
}

const LearningPathShareCard: React.FC<Props> = ({
  data,
  actionMode = 'thread',
  canRespond = false,
  acceptLoading = false,
  rejectLoading = false,
  onAccept,
  onReject,
  onPreview,
  onViewPath,
  labels,
}) => {
  const isInviteMode = actionMode === 'invite'
  const wrapperClassName = isInviteMode ? 'chat-kit-invite-card' : 'chat-kit-share-card'
  const isClickable = !!onPreview
  const previewOnly = isClickable && !canRespond && !onViewPath

  const handleCardClick = () => {
    if (onPreview) onPreview()
  }

  const stopAndRun = (event: React.MouseEvent<HTMLButtonElement>, handler?: () => void) => {
    event.stopPropagation()
    if (handler) handler()
  }

  return (
    <div
      className={`${wrapperClassName} ${isClickable ? 'chat-kit-share-card--clickable' : ''}`}
      onClick={handleCardClick}
      onKeyDown={(event) => {
        if (!isClickable) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          handleCardClick()
        }
      }}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <div className="chat-kit-share-header">
        <div className="chat-kit-share-icon">
          <Map size={14} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className={isInviteMode ? 'chat-kit-invite-title' : 'chat-kit-share-title'}>
            {data.title}
          </div>
          <div className={isInviteMode ? 'chat-kit-invite-meta' : 'chat-kit-share-meta'}>
            {labels.shareFrom(data.mentorName)}
          </div>
        </div>
        <span className={statusClassMap[data.status]}>
          {labels[statusLabelKeyMap[data.status]]}
        </span>
      </div>

      {data.description && (
        <div className={isInviteMode ? 'chat-kit-invite-desc' : 'chat-kit-share-desc'}>
          {data.description}
        </div>
      )}

      {(canRespond || onViewPath || previewOnly) && (
        <div className={isInviteMode ? 'chat-kit-invite-actions' : 'chat-kit-share-actions'}>
          {canRespond && onAccept && (
            <button
              type="button"
              onClick={(event) => stopAndRun(event, onAccept)}
              disabled={acceptLoading || rejectLoading}
              className="chat-kit-invite-btn chat-kit-invite-btn--accept"
            >
              <Check size={14} />
              {acceptLoading ? labels.accepting : labels.accept}
            </button>
          )}
          {canRespond && onReject && (
            <button
              type="button"
              onClick={(event) => stopAndRun(event, onReject)}
              disabled={acceptLoading || rejectLoading}
              className="chat-kit-invite-btn chat-kit-invite-btn--reject"
            >
              <X size={14} />
              {rejectLoading ? labels.rejecting : labels.reject}
            </button>
          )}
          {previewOnly && (
            <button
              type="button"
              onClick={(event) => stopAndRun(event, onPreview)}
              className="chat-kit-share-view-btn"
            >
              <Eye size={14} />
              {labels.preview}
            </button>
          )}
          {!canRespond && onViewPath && (
            <button
              type="button"
              onClick={(event) => stopAndRun(event, onViewPath)}
              className="chat-kit-share-view-btn"
            >
              <Eye size={14} />
              {labels.viewPath}
            </button>
          )}
          {canRespond && data.status === 'Accepted' && onViewPath && (
            <button
              type="button"
              onClick={(event) => stopAndRun(event, onViewPath)}
              className="chat-kit-share-view-btn"
            >
              <Eye size={14} />
              {labels.viewPath}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default LearningPathShareCard
