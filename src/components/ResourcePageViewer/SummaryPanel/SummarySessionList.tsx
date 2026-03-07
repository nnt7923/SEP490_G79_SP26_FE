import React from 'react'
import SummarySessionItem from './SummarySessionItem'
import type { SummarySessionListProps } from '../../../types/summary'

/**
 * SummarySessionList Component
 * 
 * Displays a list of summary sessions in reverse chronological order (newest first).
 * Maps sessions to SummarySessionItem components and handles empty state.
 * 
 * Feature: resource-ai-summary
 * Requirements: 1.2, 4.5
 */
const SummarySessionList: React.FC<SummarySessionListProps> = ({
  sessions,
  onRetry,
  onDelete,
}) => {
  // Sort sessions by timestamp in descending order (newest first)
  // Validates: Requirement 4.5
  const sortedSessions = [...sessions].sort((a, b) => b.timestamp - a.timestamp)

  // Handle empty state with friendly message
  if (sortedSessions.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
        <p className="text-sm">No summaries yet.</p>
        <p className="text-xs mt-1">Request a summary to get started.</p>
      </div>
    )
  }

  // Render sessions in reverse chronological order
  // Validates: Requirements 1.2, 4.5
  return (
    <div className="space-y-3">
      {sortedSessions.map((session) => (
        <SummarySessionItem
          key={session.id}
          session={session}
          onRetry={() => onRetry(session.id)}
          onDelete={() => onDelete(session.id)}
        />
      ))}
    </div>
  )
}

export default SummarySessionList
