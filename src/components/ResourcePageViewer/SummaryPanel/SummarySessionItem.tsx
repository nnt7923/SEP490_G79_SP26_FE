import React from 'react'
import { Loader2, AlertCircle, RotateCw, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useTranslation } from 'react-i18next'
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
  canDelete = false,
  isDeleting = false,
}) => {
  const { t } = useTranslation('admin')
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
      aria-label={t('resources.summaryPanel.item.generatingAria', { start: startPage, end: endPage })}
    >
      <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" aria-hidden="true" />
      <span className="text-xs">{t('resources.summaryPanel.item.generating')}</span>
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
      aria-label={t('resources.summaryPanel.item.generatedAria', { start: startPage, end: endPage })}
    >
      <div className="text-xs text-sl-700 leading-relaxed break-words">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ ...props }) => <h1 className="text-sm font-semibold mt-2 mb-2 text-sl-900" {...props} />,
            h2: ({ ...props }) => <h2 className="text-sm font-semibold mt-2 mb-2 text-sl-900" {...props} />,
            h3: ({ ...props }) => <h3 className="text-sm font-semibold mt-2 mb-1 text-sl-900" {...props} />,
            p: ({ ...props }) => <p className="mb-2 last:mb-0 whitespace-pre-wrap" {...props} />,
            ul: ({ ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
            ol: ({ ...props }) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
            li: ({ ...props }) => <li className="leading-relaxed" {...props} />,
            a: ({ ...props }) => <a className="text-status-blue underline break-all" target="_blank" rel="noreferrer" {...props} />,
            code: ({ inline, ...props }: any) =>
              inline
                ? <code className="px-1 py-0.5 rounded bg-sl-100 text-sl-800" {...props} />
                : <code className="text-sl-800" {...props} />,
            pre: ({ ...props }) => <pre className="bg-sl-100 border border-sl-200 rounded p-2 overflow-x-auto mb-2" {...props} />,
            table: ({ ...props }) => (
              <div className="overflow-x-auto mb-2">
                <table className="min-w-full border border-sl-200 text-[11px]" {...props} />
              </div>
            ),
            th: ({ ...props }) => <th className="border border-sl-200 px-2 py-1 text-left bg-sl-50" {...props} />,
            td: ({ ...props }) => <td className="border border-sl-200 px-2 py-1 align-top" {...props} />,
          }}
        >
          {summary || ''}
        </ReactMarkdown>
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
      aria-label={t('resources.summaryPanel.item.errorAria', {
        start: startPage,
        end: endPage,
        message: errorMessage || t('resources.summaryPanel.item.failedDefaultShort'),
      })}
    >
      <div className="flex items-start gap-2 text-status-red">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-xs flex-1">
          {errorMessage || t('resources.summaryPanel.item.failedDefault')}
        </p>
      </div>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-white bg-status-red-solid hover:bg-status-red-solid-dark transition-colors"
        title={t('resources.summaryPanel.item.retryTitle')}
        aria-label={t('resources.summaryPanel.item.retryAria', { start: startPage, end: endPage })}
      >
        <RotateCw className="w-3.5 h-3.5" aria-hidden="true" />
        {t('resources.summaryPanel.item.retry')}
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
          {t('resources.summaryPanel.item.pagesRange', { start: startPage, end: endPage })}
        </span>
        {status === 'success' && canDelete && (
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="p-1 text-sl-400 hover:text-status-red transition-colors"
            title={t('resources.summaryPanel.item.deleteTitle')}
            aria-label={t('resources.summaryPanel.item.deleteAria', { start: startPage, end: endPage })}
          >
            {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
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
