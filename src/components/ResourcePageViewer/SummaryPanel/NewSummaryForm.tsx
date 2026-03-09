import React, { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
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
  const [startPage, setStartPage] = useState<string>('1')
  const [endPage, setEndPage] = useState<string>(totalPages.toString())
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validatePageRange = (start: number, end: number): string | null => {
    // Validate start page >= 1
    if (start < 1) {
      return 'Start page must be at least 1'
    }

    // Validate end page <= totalPages
    if (end > totalPages) {
      return `End page cannot exceed ${totalPages}`
    }

    // Validate start <= end
    if (start > end) {
      return 'Start page must be less than or equal to end page'
    }

    // Check for duplicate requests
    const isDuplicate = existingSessions.some(
      (session) =>
        session.startPage === start &&
        session.endPage === end &&
        (session.status === 'loading' || session.status === 'success')
    )

    if (isDuplicate) {
      return `Summary for pages ${start}-${end} already exists or is in progress`
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
      setValidationError('Please enter valid page numbers')
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
      // Reset form on success - set endPage to totalPages
      setStartPage('1')
      setEndPage(totalPages.toString())
    } catch (err) {
      // Error handling is done by parent component
      console.error('Error submitting summary request:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Compact inline page range inputs */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label htmlFor="startPage" className="sr-only">Start Page</label>
          <input
            id="startPage"
            type="number"
            min="1"
            max={totalPages}
            value={startPage}
            onChange={(e) => setStartPage(e.target.value)}
            disabled={disabled || isSubmitting}
            className="w-full px-3 py-2 text-sm border border-sl-200 rounded-lg bg-th-card text-sl-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="From"
          />
        </div>
        <span className="text-sl-400">→</span>
        <div className="flex-1">
          <label htmlFor="endPage" className="sr-only">End Page</label>
          <input
            id="endPage"
            type="number"
            min="1"
            max={totalPages}
            value={endPage}
            onChange={(e) => setEndPage(e.target.value)}
            disabled={disabled || isSubmitting}
            className="w-full px-3 py-2 text-sm border border-sl-200 rounded-lg bg-th-card text-sl-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="To"
          />
        </div>
      </div>

      {validationError && (
        <div className="text-xs text-status-red bg-status-red-bg px-2.5 py-1.5 rounded-lg">
          {validationError}
        </div>
      )}

      <button
        type="submit"
        disabled={disabled || isSubmitting}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-status-blue-solid hover:bg-status-blue-solid-hover rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Generate
          </>
        )}
      </button>
    </form>
  )
}

export default NewSummaryForm
