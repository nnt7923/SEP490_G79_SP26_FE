import React from 'react'
import { Loader2, AlertCircle, RotateCw, X } from 'lucide-react'
import type { SummarySessionItemProps } from '../../../types/summary'

/**
 * SummarySessionItem Component
 * 
 * Displays an individual summary session with page range badge.
 * Renders different UI based on session status (loading, success, error).
 * 
 * Feature: resource-ai-summary
 * Requirements: 3.1, 3.2, 4.1, 4.3, 5.1, 5.2, 5.3
 */
const SummarySessionItem: React.FC<SummarySessionItemProps> = ({
  session,
  onRetry,
  onDelete,
}) => {
  const { startPage, endPage, status, summary, errorMessage } = session

  /**
   * Render loading state with spinner animation
   * Validates: Requirements 3.1, 3.2, 7.4
   */
  const renderLoadingState = () => (
    <div 
      className="flex items-center gap-2 text-status-blue"
      role="status"
      aria-live="polite"
      aria-label={`Generating summary for pages ${startPage} to ${endPage}`}
    >
      <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" aria-hidden="true" />
      <span className="text-xs">Generating summary...</span>
    </div>
  )

  /**
   * Render success state with formatted summary text
   * Validates: Requirements 4.1, 4.3, 7.4
   */
  const renderSuccessState = () => (
    <div 
      role="status"
      aria-live="polite"
      aria-label={`Summary generated successfully for pages ${startPage} to ${endPage}`}
    >
      <div className="text-xs text-sl-700 whitespace-pre-wrap leading-relaxed">
        {summary}
      </div>
    </div>
  )

  /**
   * Render error state with error message and retry button
   * Validates: Requirements 5.1, 5.2, 5.3, 7.4
   */
  const renderErrorState = () => (
    <div 
      className="space-y-2"
      role="alert"
      aria-live="assertive"
      aria-label={`Error generating summary for pages ${startPage} to ${endPage}: ${errorMessage || 'Failed to generate summary'}`}
    >
      <div className="flex items-start gap-2 text-status-red">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-xs flex-1">
          {errorMessage || 'Failed to generate summary. Please try again.'}
        </p>
      </div>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-white bg-status-red-solid hover:bg-status-red-solid-dark transition-colors"
        title="Retry summary generation"
        aria-label={`Retry generating summary for pages ${startPage} to ${endPage}`}
      >
        <RotateCw className="w-3.5 h-3.5" aria-hidden="true" />
        Retry
      </button>
    </div>
  )

  return (
    <div
      data-testid="summary-session"
      className="bg-th-card border border-sl-200 overflow-hidden"
    >
      {/* Compact header with page range */}
      <div className="px-3 py-2 bg-sl-50 border-b border-sl-200 flex items-center justify-between">
        <span className="text-xs font-medium text-sl-600">
          Pages {startPage}-{endPage}
        </span>
        {status === 'success' && (
          <button
            onClick={onDelete}
            className="p-1 text-sl-400 hover:text-status-red transition-colors"
            title="Delete summary"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Content area */}
      <div className="p-3">
        {status === 'loading' && renderLoadingState()}
        {status === 'success' && renderSuccessState()}
        {status === 'error' && renderErrorState()}
      </div>
    </div>
  )
}

export default SummarySessionItem
