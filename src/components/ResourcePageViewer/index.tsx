import React, { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, Loader2, Sparkles, FileText } from 'lucide-react'
import { ResourceService } from '../../services'
import Toast from '../Toast'

interface PageData {
  pageNumber: number
  imageUrl?: string
  extractedText?: string
  text?: string
  summary?: string
}

interface ResourcePageViewerProps {
  isOpen: boolean
  resourceId: string
  fileName: string
  onClose: () => void
  onSummaryRequest?: (pageNumber: number, pageText: string) => Promise<string>
}

const ResourcePageViewer: React.FC<ResourcePageViewerProps> = ({
  isOpen,
  resourceId,
  fileName,
  onClose,
  onSummaryRequest,
}) => {
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [pages, setPages] = useState<PageData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [pageSummaries, setPageSummaries] = useState<Record<number, string>>({})
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [selectedPages, setSelectedPages] = useState<number[]>([])
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [generatingSummary, setGeneratingSummary] = useState(false)
  const [documentSummary, setDocumentSummary] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null)

  useEffect(() => {
    if (isOpen && resourceId) {
      fetchPages()
    }
  }, [isOpen, resourceId])

  const fetchPages = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await ResourceService.getResourcePages(resourceId)
      
      const pagesData = response?.pages || response?.items || []
      const total = response?.totalPages || response?.total || pagesData.length || 0
      
      setPages(pagesData)
      setTotalPages(total)
      
      if (total === 0) {
        setError('No pages found. The document may not have been processed yet.')
      }
    } catch (err: any) {
      console.error('Error fetching pages:', err)
      
      if (err?.response?.status === 404) {
        setError('Page extraction not available yet. Backend needs to implement the /api/resources/{id}/pages endpoint.')
      } else {
        const errorMsg = 
          err?.response?.data?.message || 
          err?.response?.data?.msg ||
          err?.message ||
          'Failed to load document pages'
        setError(errorMsg)
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const currentPageData = pages.find((p) => p.pageNumber === currentPage)

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1)
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1)
  }

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page)
  }

  const handleSummary = async () => {
    if (!onSummaryRequest || pageSummaries[currentPage]) return
    
    const pageText = currentPageData?.extractedText || currentPageData?.text
    if (!pageText) return

    try {
      setLoadingSummary(true)
      const summary = await onSummaryRequest(currentPage, pageText)
      setPageSummaries((prev) => ({ ...prev, [currentPage]: summary }))
    } catch (error) {
      console.error('Failed to generate summary:', error)
    } finally {
      setLoadingSummary(false)
    }
  }

  const handleOpenSummaryModal = () => {
    setSelectedPages([currentPage])
    setSummaryError(null)
    setShowSummaryModal(true)
  }

  const handlePageSelect = (page: number) => {
    let newSelection = [...selectedPages]
    
    if (newSelection.includes(page)) {
      // Deselect page
      newSelection = newSelection.filter(p => p !== page)
    } else {
      // Select page
      newSelection.push(page)
      newSelection.sort((a, b) => a - b)
    }

    // Validate: must be consecutive and max 5 pages
    if (newSelection.length > 0) {
      const min = Math.min(...newSelection)
      const max = Math.max(...newSelection)
      const range = max - min + 1
      
      // Check if consecutive
      const isConsecutive = newSelection.length === range
      
      if (!isConsecutive) {
        setSummaryError('Pages must be consecutive (no gaps allowed)')
        return
      }
      
      if (newSelection.length > 5) {
        setSummaryError('Maximum 5 pages allowed')
        return
      }
    }

    setSelectedPages(newSelection)
    setSummaryError(null)
  }

  const handleGenerateSummary = async () => {
    if (selectedPages.length === 0) {
      setSummaryError('Please select at least 1 page')
      return
    }

    if (selectedPages.length > 5) {
      setSummaryError('Maximum 5 pages allowed')
      return
    }

    const min = Math.min(...selectedPages)
    const max = Math.max(...selectedPages)
    
    try {
      setGeneratingSummary(true)
      setShowSummaryModal(false)
      
      const response = await ResourceService.generateSummary(resourceId, min, max)
      
      const summaryText = response?.summary || response?.data?.summary || response
      setDocumentSummary(summaryText)
      
      setToast({
        message: `Summary generated for pages ${min}-${max}`,
        type: 'success'
      })
    } catch (err: any) {
      const errorMsg = 
        err?.response?.data?.message || 
        err?.response?.data?.msg ||
        err?.message ||
        'Failed to generate summary'
      
      setToast({
        message: errorMsg,
        type: 'error'
      })
    } finally {
      setGeneratingSummary(false)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      
      if (e.key === 'ArrowLeft') handlePrevPage()
      else if (e.key === 'ArrowRight') handleNextPage()
      else if (e.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, currentPage, totalPages])

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/90 backdrop-blur-md animate-scale-in">
      <div className="w-full h-full max-w-[1600px] max-h-[95vh] m-4 flex flex-col bg-slate-50 dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden">
        {/* Clean Header */}
        <div className="flex items-center justify-between px-8 py-5 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white truncate">
                {fileName}
              </h3>
              {totalPages > 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Page {currentPage} of {totalPages}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {totalPages > 0 && (
              <button
                onClick={handleOpenSummaryModal}
                disabled={generatingSummary}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 text-blue-700 dark:text-blue-300 hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-900/30 dark:hover:to-blue-800/30 transition-all duration-200 cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                title="Generate AI summary for multiple pages"
              >
                {generatingSummary ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">
                  {generatingSummary ? 'Generating...' : 'Document Summary'}
                </span>
              </button>
            )}
            {onSummaryRequest && (currentPageData?.extractedText || currentPageData?.text) && (
              <button
                onClick={handleSummary}
                disabled={loadingSummary || !!pageSummaries[currentPage]}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 text-purple-700 dark:text-purple-300 hover:from-purple-100 hover:to-purple-200 dark:hover:from-purple-900/30 dark:hover:to-purple-800/30 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                title="Generate AI summary for current page"
              >
                {loadingSummary ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">
                  {pageSummaries[currentPage] ? 'View Summary' : 'Page Summary'}
                </span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-all duration-200 cursor-pointer shadow-sm"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0 flex bg-slate-50 dark:bg-slate-950">
          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-auto p-6">
              {loading && (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                  <p className="text-slate-600 dark:text-slate-400">Loading document...</p>
                </div>
              )}

              {error && (
                <div className="flex items-center justify-center h-full">
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8 max-w-md border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 bg-red-50 dark:bg-red-900/20 rounded-xl">
                        <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </div>
                      <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Unable to Load
                      </h4>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                      {error}
                    </p>
                    <button
                      onClick={fetchPages}
                      className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors duration-200 cursor-pointer font-medium shadow-sm"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}

              {!loading && !error && currentPageData && (
                <div className="max-w-5xl mx-auto">
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden border border-slate-200 dark:border-slate-700 min-h-[400px] flex flex-col">
                    {/* Page Header */}
                    <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between">
                        <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                          Page {currentPage}
                        </h4>
                        <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                          {totalPages} pages
                        </span>
                      </div>
                    </div>
                    
                    {/* Page Content */}
                    <div className="p-8 flex-1">
                      {(currentPageData.extractedText || currentPageData.text) ? (
                        <div className="prose prose-slate dark:prose-invert max-w-none">
                          <div className="whitespace-pre-wrap text-slate-700 dark:text-slate-300 leading-relaxed text-[15px]">
                            {currentPageData.extractedText || currentPageData.text}
                          </div>
                        </div>
                      ) : currentPageData.imageUrl ? (
                        <img
                          src={currentPageData.imageUrl}
                          alt={`Page ${currentPage}`}
                          className="max-w-full h-auto rounded-lg"
                        />
                      ) : (
                        <div className="text-center py-16 text-slate-500 dark:text-slate-400">
                          <FileText className="w-16 h-16 mx-auto mb-4 opacity-40" />
                          <p className="text-base font-medium mb-2">Page content not available</p>
                          <p className="text-sm">This page may not have been processed yet.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 0 && !loading && (
              <div className="px-6 py-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed font-medium shadow-sm"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>

                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Page</span>
                    <input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={currentPage}
                      onChange={(e) => handlePageChange(parseInt(e.target.value))}
                      className="w-20 px-3 py-2 text-center border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                    />
                    <span className="text-sm text-slate-600 dark:text-slate-400">of {totalPages}</span>
                  </div>

                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed font-medium shadow-sm"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* AI Summary Sidebar */}
          {(pageSummaries[currentPage] || loadingSummary) && (
            <div className="w-96 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col animate-slide-in-right">
              <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-b border-purple-200 dark:border-purple-800">
                <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  AI Summary - Page {currentPage}
                </h4>
              </div>
              <div className="flex-1 overflow-auto p-6">
                {loadingSummary ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                    <p className="text-sm text-slate-600 dark:text-slate-400">Generating summary...</p>
                  </div>
                ) : (
                  <div className="prose prose-sm prose-slate dark:prose-invert max-w-none">
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {pageSummaries[currentPage]}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Document Summary Sidebar */}
          {documentSummary && (
            <div className="w-96 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col animate-slide-in-right">
              <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-b border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Document Summary
                  </h4>
                  <button
                    onClick={() => setDocumentSummary(null)}
                    className="p-1 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors cursor-pointer"
                    title="Close summary"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-6">
                <div className="prose prose-sm prose-slate dark:prose-invert max-w-none">
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {documentSummary}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-500 text-center">
            💡 Use arrow keys (← →) to navigate • Press Esc to close
          </p>
        </div>
      </div>

      {/* Summary Range Modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Generate Document Summary
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Select up to 5 consecutive pages
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSummaryModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5">
              {summaryError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
                  <p className="text-sm text-red-800 dark:text-red-200">{summaryError}</p>
                </div>
              )}

              {/* Info Display */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Selected pages:</span>
                  <span className="font-semibold text-blue-700 dark:text-blue-300">
                    {selectedPages.length > 0 
                      ? `${Math.min(...selectedPages)} - ${Math.max(...selectedPages)}`
                      : 'None'
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-slate-600 dark:text-slate-400">Total selected:</span>
                  <span className="font-semibold text-blue-700 dark:text-blue-300">
                    {selectedPages.length} / 5
                  </span>
                </div>
              </div>

              {/* Page Grid Selector */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Select pages (must be consecutive):
                </p>
                <div className="grid grid-cols-5 gap-2 max-h-[300px] overflow-y-auto p-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    const isSelected = selectedPages.includes(page)
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageSelect(page)}
                        className={`
                          relative p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer
                          ${isSelected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
                          }
                        `}
                      >
                        <div className="text-center">
                          <div className="text-sm font-semibold">{page}</div>
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Helper Text */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  💡 <span className="font-medium">Tip:</span> Click on pages to select them. You can select up to 5 consecutive pages (e.g., pages 3-7). Gaps between pages are not allowed.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex gap-3 rounded-b-2xl">
              <button
                onClick={() => setShowSummaryModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors duration-200 cursor-pointer font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateSummary}
                disabled={selectedPages.length === 0 || selectedPages.length > 5}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors duration-200 cursor-pointer font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Generate Summary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

export default ResourcePageViewer
