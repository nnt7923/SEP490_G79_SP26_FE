import React from 'react'
import type { SentLearningPathShareSummaryDto, ShareStatus } from '../../types/chat'

type StatusFilter = '' | Exclude<ShareStatus, 'Pending'>

type Props = {
  items: SentLearningPathShareSummaryDto[]
  loading?: boolean
  error?: string | null
  activeStudentName?: string | null
  statusFilter: StatusFilter
  onChangeStatus: (status: StatusFilter) => void
  onSelectItem?: (item: SentLearningPathShareSummaryDto) => void
  onJumpToMessage?: (item: SentLearningPathShareSummaryDto) => void
  hasShareMessage?: (item: SentLearningPathShareSummaryDto) => boolean
  labels: {
    title: string
    subtitle: (studentName?: string | null) => string
    all: string
    pending: string
    accepted: string
    rejected: string
    sentAt: string
    respondedAt: string
    waitingResponse: string
    jumpToMessage: string
    empty: string
    loading: string
    loadError: string
  }
}

const badgeClassMap: Record<ShareStatus, string> = {
  Pending: 'chat-kit-share-status chat-kit-share-status--pending',
  Accepted: 'chat-kit-share-status chat-kit-share-status--accepted',
  Rejected: 'chat-kit-share-status chat-kit-share-status--rejected',
}

const formatDateTime = (value?: string | null) => {
  if (!value) return ''
  return new Date(value).toLocaleString()
}

const SentShareHistoryBlock: React.FC<Props> = ({
  items,
  loading = false,
  error = null,
  activeStudentName,
  statusFilter,
  onChangeStatus,
  onSelectItem,
  onJumpToMessage,
  hasShareMessage,
  labels,
}) => {
  const statusLabelMap: Record<StatusFilter, string> = {
    '': labels.all,
    Accepted: labels.accepted,
    Rejected: labels.rejected,
  }

  const statusFilters: StatusFilter[] = ['', 'Accepted', 'Rejected']

  return (
    <div className="chat-kit-sent-shares">
      <div className="chat-kit-sent-shares-card">
        <div className="chat-kit-sent-shares-header">
          <div>
            <p className="chat-kit-sent-shares-title">{labels.title}</p>
            <p className="chat-kit-sent-shares-subtitle">{labels.subtitle(activeStudentName)}</p>
          </div>
          <div className="chat-kit-sent-shares-chips">
            {statusFilters.map((filter) => (
              <button
                key={filter}
                type="button"
                className={`chat-kit-sent-shares-chip ${statusFilter === filter ? 'is-active' : ''}`}
                onClick={() => onChangeStatus(filter)}
              >
                {statusLabelMap[filter]}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="chat-kit-sent-shares-empty">{labels.loading}</div>
        ) : error ? (
          <div className="chat-kit-sent-shares-error">{error || labels.loadError}</div>
        ) : items.length === 0 ? (
          <div className="chat-kit-sent-shares-empty">{labels.empty}</div>
        ) : (
          <div className="chat-kit-sent-shares-list">
            {items.map((item) => {
              const canJump = hasShareMessage?.(item) ?? false
              return (
                <div
                  key={item.shareId}
                  className="chat-kit-sent-shares-item"
                  onClick={() => onSelectItem?.(item)}
                  onKeyDown={(event) => {
                    if (!onSelectItem) return
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onSelectItem(item)
                    }
                  }}
                  role={onSelectItem ? 'button' : undefined}
                  tabIndex={onSelectItem ? 0 : undefined}
                >
                  <div className="chat-kit-sent-shares-item-head">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p className="chat-kit-sent-shares-item-title">{item.learningPathTitle}</p>
                      <div className="chat-kit-sent-shares-meta">
                        <span>{labels.sentAt}: {formatDateTime(item.sentAt)}</span>
                        <span>
                          {labels.respondedAt}: {item.respondedAt ? formatDateTime(item.respondedAt) : labels.waitingResponse}
                        </span>
                      </div>
                    </div>
                    <span className={badgeClassMap[item.status]}>{statusLabelMap[item.status]}</span>
                  </div>

                  {item.learningPathDescription && (
                    <p className="chat-kit-sent-shares-item-desc">{item.learningPathDescription}</p>
                  )}

                  {canJump && onJumpToMessage && (
                    <div className="chat-kit-sent-shares-actions">
                      <button
                        type="button"
                        className="chat-kit-sent-shares-link"
                        onClick={(event) => {
                          event.stopPropagation()
                          onJumpToMessage(item)
                        }}
                      >
                        {labels.jumpToMessage}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default SentShareHistoryBlock
