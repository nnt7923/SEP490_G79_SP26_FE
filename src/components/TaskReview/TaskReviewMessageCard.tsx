import React from 'react'
import TaskReviewService, { type TaskReviewDetail } from '../../services/TaskReviewService'
import TaskReviewStatusBadge from './TaskReviewStatusBadge'

type TaskReviewCardCacheEntry = {
  expiresAt: number
  data: TaskReviewDetail
}

const TASK_REVIEW_CARD_CACHE_TTL_MS = 2 * 60 * 1000
const taskReviewCardCache = new Map<string, TaskReviewCardCacheEntry>()

interface TaskReviewMessageCardProps {
  reviewId: string
  note?: string | null
  isMine?: boolean
  onOpen?: () => void
  openLabel: string
  loadingLabel: string
  loadFailedLabel: string
  titleFallback: string
  mentorLabel: string
  studentLabel: string
}

const TaskReviewMessageCard: React.FC<TaskReviewMessageCardProps> = ({
  reviewId,
  note,
  isMine = false,
  onOpen,
  openLabel,
  loadingLabel,
  loadFailedLabel,
  titleFallback,
  mentorLabel,
  studentLabel,
}) => {
  const [detail, setDetail] = React.useState<TaskReviewDetail | null>(() => {
    const cacheEntry = taskReviewCardCache.get(reviewId)
    return cacheEntry && cacheEntry.expiresAt > Date.now() ? cacheEntry.data : null
  })
  const [loading, setLoading] = React.useState(!detail)
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    const cacheEntry = taskReviewCardCache.get(reviewId)
    if (cacheEntry && cacheEntry.expiresAt > Date.now()) {
      setDetail(cacheEntry.data)
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    setError('')

    TaskReviewService.getTaskReviewById(reviewId)
      .then((response) => {
        if (!active) return
        taskReviewCardCache.set(reviewId, {
          data: response,
          expiresAt: Date.now() + TASK_REVIEW_CARD_CACHE_TTL_MS,
        })
        setDetail(response)
      })
      .catch((loadError: any) => {
        if (!active) return
        setError(loadError?.message || loadFailedLabel)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [loadFailedLabel, reviewId])

  const title = detail?.taskTitle || titleFallback
  const mentorName = detail?.mentorUserName || '-'
  const studentName = detail?.studentUserName || '-'
  const requestNote = (note ?? detail?.studentRequestNote ?? '').trim()

  return (
    <div
      style={{
        maxWidth: 340,
        borderRadius: 12,
        border: `1px solid ${isMine ? 'rgba(59, 130, 246, 0.28)' : 'var(--border-base)'}`,
        background: isMine ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-surface)',
        padding: '12px 14px',
        boxShadow: '0 8px 18px rgba(15, 23, 42, 0.06)',
        display: 'grid',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4 }}>
          {title}
        </div>
        <TaskReviewStatusBadge
          status={detail?.status}
          pendingLabel="Pending"
          reviewedLabel="Reviewed"
        />
      </div>

      <div style={{ display: 'grid', gap: 4, fontSize: 11, color: 'var(--text-secondary)' }}>
        <div>{mentorLabel}: {mentorName}</div>
        <div>{studentLabel}: {studentName}</div>
      </div>

      {requestNote && (
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-secondary)',
            lineHeight: 1.55,
            padding: '10px 12px',
            borderRadius: 10,
            background: 'var(--bg-main)',
            border: '1px solid var(--border-base)',
            fontStyle: 'italic',
          }}
        >
          "{requestNote}"
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 11, color: error ? 'var(--danger-primary)' : 'var(--text-secondary)' }}>
          {loading ? loadingLabel : (error || '')}
        </div>
        {onOpen && (
          <button
            type="button"
            onClick={onOpen}
            style={{
              borderRadius: 8,
              border: 'none',
              background: 'var(--accent-primary)',
              color: 'white',
              padding: '8px 12px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {openLabel}
          </button>
        )}
      </div>
    </div>
  )
}

export default TaskReviewMessageCard
