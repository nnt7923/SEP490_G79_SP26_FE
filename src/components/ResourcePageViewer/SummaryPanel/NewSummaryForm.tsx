import React, { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { NewSummaryFormProps } from '../../../types/summary'

/**
 * Form component for requesting new AI summaries
 * Feature: resource-ai-summary
 * Requirements: 2.1, 2.2, 2.3, 2.5
 */
const NewSummaryForm: React.FC<NewSummaryFormProps> = ({
  totalPages,
  onSubmit,
  disabled,
  existingSessions,
}) => {
  const { t } = useTranslation('admin')
  const maxPagesPerRequest = 5
  const initialEndPage = Math.max(1, Math.min(totalPages, maxPagesPerRequest))
  const [startPage, setStartPage] = useState<string>('1')
  const [endPage, setEndPage] = useState<string>(initialEndPage.toString())
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validatePageRange = (start: number, end: number): string | null => {
    // Validate start page >= 1
    if (start < 1) {
      return t('resources.summaryPanel.form.validation.startMin')
    }

    // Validate end page <= totalPages
    if (end > totalPages) {
      return t('resources.summaryPanel.form.validation.endMax', { totalPages })
    }

    // Validate start <= end
    if (start > end) {
      return t('resources.summaryPanel.form.validation.startBeforeEnd')
    }

    // Validate max pages per request
    if (end - start + 1 > maxPagesPerRequest) {
      return t('resources.summaryPanel.form.validation.maxPages', { maxPages: maxPagesPerRequest })
    }

    // Check for duplicate requests
    const isDuplicate = existingSessions.some(
      (session) =>
        session.startPage === start &&
        session.endPage === end &&
        (session.status === 'loading' || session.status === 'success')
    )

    if (isDuplicate) {
      return t('resources.summaryPanel.form.validation.duplicateRange', { start, end })
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    const start = parseInt(startPage, 10)
    const end = parseInt(endPage, 10)

    // Validate numeric inputs
    if (isNaN(start) || isNaN(end)) {
      setValidationError(t('resources.summaryPanel.form.validation.invalidNumber'))
      return
    }

    // Validate page range
    const error = validatePageRange(start, end)
    if (error) {
      setValidationError(error)
      return
    }

    // Submit the form
    setIsSubmitting(true)
    try {
      await onSubmit(start, end)
      // Keep the user-entered range after successful submit.
    } catch (err) {
      // Error handling is done by parent component
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Compact inline page range inputs */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label htmlFor="startPage" className="sr-only">{t('resources.summaryPanel.form.startPage')}</label>
          <input
            id="startPage"
            type="number"
            min="1"
            max={totalPages}
            value={startPage}
            onChange={(e) => setStartPage(e.target.value)}
            disabled={disabled || isSubmitting}
            className="w-full px-3 py-2 text-sm border border-sl-200 bg-th-card text-sl-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder={t('resources.summaryPanel.form.from')}
          />
        </div>
        <span className="text-sl-400" aria-hidden="true">-&gt;</span>
        <div className="flex-1">
          <label htmlFor="endPage" className="sr-only">{t('resources.summaryPanel.form.endPage')}</label>
          <input
            id="endPage"
            type="number"
            min="1"
            max={totalPages}
            value={endPage}
            onChange={(e) => setEndPage(e.target.value)}
            disabled={disabled || isSubmitting}
            className="w-full px-3 py-2 text-sm border border-sl-200 bg-th-card text-sl-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder={t('resources.summaryPanel.form.to')}
          />
        </div>
      </div>

      {validationError && (
        <div className="text-xs text-status-red bg-status-red-bg px-2.5 py-1.5">
          {validationError}
        </div>
      )}

      <p className="text-[11px] text-sl-500">
        {t('resources.summaryPanel.form.maxPagesHint', { maxPages: maxPagesPerRequest })}
      </p>

      <button
        type="submit"
        disabled={disabled || isSubmitting}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-status-blue-solid hover:bg-status-blue-solid-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('resources.summaryPanel.form.generating')}
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            {t('resources.summaryPanel.form.generate')}
          </>
        )}
      </button>
    </form>
  )
}

export default NewSummaryForm
