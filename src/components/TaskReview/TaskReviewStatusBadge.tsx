import React from 'react'
import type { TaskReviewStatus } from '../../services/TaskReviewService'

interface TaskReviewStatusBadgeProps {
  status: TaskReviewStatus | string | null | undefined
  pendingLabel?: string
  reviewedLabel?: string
}

const TaskReviewStatusBadge: React.FC<TaskReviewStatusBadgeProps> = ({
  status,
  pendingLabel = 'Pending',
  reviewedLabel = 'Reviewed',
}) => {
  const normalized = String(status ?? '').trim().toLowerCase()
  const isReviewed = normalized === 'reviewed'

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        borderRadius: 999,
        padding: '4px 10px',
        fontSize: 11,
        fontWeight: 700,
        border: `1px solid ${isReviewed ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
        background: isReviewed ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
        color: isReviewed ? '#047857' : '#b45309',
      }}
    >
      {isReviewed ? reviewedLabel : pendingLabel}
    </span>
  )
}

export default TaskReviewStatusBadge
