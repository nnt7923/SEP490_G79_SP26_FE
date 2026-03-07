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
      className="flex items-center gap-2 text-blue-600 dark:text-blue-400"
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
      <div className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
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
      <div className="flex items-start gap-2 text-red-600 dark:text-red-400">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-xs flex-1">
          {errorMessage || 'Failed to generate summary. Please try again.'}
        </p>
      </div>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 rounded-md transition-colors"
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
      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
    >
      {/* Compact header with page range */}
      <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
          Pages {startPage}-{endPage}
        </span>
        {status === 'success' && (
          <button
            onClick={onDelete}
            className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
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
