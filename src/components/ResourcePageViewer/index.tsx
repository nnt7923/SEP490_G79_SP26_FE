import React, { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, Loader2, Sparkles, FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ResourceService } from '../../services'
import { useResponsive } from '../../hook/useResponsive'
import SummaryPanel from './SummaryPanel'

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
}

interface ResourcePagesCacheEntry {
  timestamp: number
  pages: PageData[]
  totalPages: number
}

const RESOURCE_PAGES_CACHE_PREFIX = 'resource-pages:'
const RESOURCE_PAGES_CACHE_TTL_MS = 30 * 60 * 1000

const readResourcePagesCache = (resourceId: string): ResourcePagesCacheEntry | null => {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.sessionStorage.getItem(`${RESOURCE_PAGES_CACHE_PREFIX}${resourceId}`)
    if (!raw) return null

    const parsed = JSON.parse(raw) as ResourcePagesCacheEntry
    if (!parsed || !Array.isArray(parsed.pages) || typeof parsed.totalPages !== 'number' || !parsed.timestamp) {
      return null
    }

    const isExpired = Date.now() - parsed.timestamp > RESOURCE_PAGES_CACHE_TTL_MS
    if (isExpired) {
      window.sessionStorage.removeItem(`${RESOURCE_PAGES_CACHE_PREFIX}${resourceId}`)
      return null
    }

    return parsed
  } catch {
    return null
  }
}

const writeResourcePagesCache = (resourceId: string, pages: PageData[], totalPages: number) => {
  if (typeof window === 'undefined') return

  try {
    const payload: ResourcePagesCacheEntry = {
      timestamp: Date.now(),
      pages,
      totalPages,
    }
    window.sessionStorage.setItem(`${RESOURCE_PAGES_CACHE_PREFIX}${resourceId}`, JSON.stringify(payload))
  } catch {
  }
}

const ResourcePageViewer: React.FC<ResourcePageViewerProps> = ({
  isOpen,
  resourceId,
  fileName,
  onClose,
}) => {
  const { t } = useTranslation('admin')
  const { isMobile } = useResponsive()
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [pages, setPages] = useState<PageData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSummaryPanel, setShowSummaryPanel] = useState(!isMobile)

  useEffect(() => {
    if (isOpen && resourceId) {
      setCurrentPage(1)
      fetchPages()
    }
  }, [isOpen, resourceId])

  const fetchPages = async (forceRefresh = false) => {
    const cached = !forceRefresh ? readResourcePagesCache(resourceId) : null
    if (cached) {
      setPages(cached.pages)
      setTotalPages(cached.totalPages)
      setError(null)
      setLoading(false)
      if (cached.totalPages === 0) {
        setError(t('resources.pageViewer.noPagesFound'))
      }
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const response = await ResourceService.getResourcePages(resourceId)
      
      const pagesData = response?.pages || response?.items || []
      const total = response?.totalPages || response?.total || pagesData.length || 0
      
      setPages(pagesData)
      setTotalPages(total)
      writeResourcePagesCache(resourceId, pagesData, total)
      
      if (total === 0) {
        setError(t('resources.pageViewer.noPagesFound'))
      }
    } catch (err: any) {
      
      if (err?.response?.status === 404) {
        setError(t('resources.pageViewer.extractionUnavailable'))
      } else {
        const errorMsg = 
          err?.response?.data?.message || 
          err?.response?.data?.msg ||
          err?.message ||
          t('resources.pageViewer.failedToLoadPages')
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-sl-900/90 backdrop-blur-md animate-scale-in">
      <div className="w-full h-full max-w-[1600px] max-h-[95vh] m-4 flex flex-col bg-sl-50 shadow-2xl overflow-hidden">
        {/* Clean Header */}
        <div className="flex items-center justify-between px-8 py-5 bg-th-card border-b border-sl-200">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="p-2.5 bg-status-blue-bg">
              <FileText className="w-5 h-5 text-status-blue" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-sl-900 truncate">
                {fileName}
              </h3>
              {totalPages > 0 && (
                <p className="text-sm text-sl-500">
                  {t('resources.pageViewer.pageOf', { current: currentPage, total: totalPages })}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Mobile Summary Panel Toggle */}
            {totalPages > 0 && (
              <button
                onClick={() => setShowSummaryPanel(!showSummaryPanel)}
                className="md:hidden p-2.5 bg-status-blue-bg text-status-blue hover:bg-status-blue-bg-strong transition-all duration-200 cursor-pointer shadow-sm"
                title={t('resources.pageViewer.toggleSummaryPanel')}
                aria-label={
                  showSummaryPanel
                    ? t('resources.pageViewer.closeSummaryPanel')
                    : t('resources.pageViewer.openSummaryPanel')
                }
              >
                <Sparkles className="w-5 h-5" />
              </button>
            )}
            
            <button
              onClick={onClose}
              className="p-2.5 bg-sl-100 text-sl-600 hover:bg-status-red-bg hover:text-status-red transition-all duration-200 cursor-pointer shadow-sm"
              title={t('resources.pageViewer.close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0 flex bg-sl-50">
          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-auto p-6">
              {loading && (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <Loader2 className="w-12 h-12 text-status-blue animate-spin" />
                  <p className="text-sl-600">{t('resources.pageViewer.loadingDocument')}</p>
                </div>
              )}

              {error && (
                <div className="flex items-center justify-center h-full">
                  <div className="bg-th-card shadow-lg p-8 max-w-md border border-sl-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 bg-status-red-bg">
                        <X className="w-5 h-5 text-status-red" />
                      </div>
                      <h4 className="text-lg font-semibold text-sl-900">
                        {t('resources.pageViewer.unableToLoad')}
                      </h4>
                    </div>
                    <p className="text-sm text-sl-600 mb-6 leading-relaxed">
                      {error}
                    </p>
                    <button
                      onClick={() => fetchPages(true)}
                      className="w-full px-4 py-2.5 bg-status-blue-solid hover:bg-status-blue-solid-hover text-white transition-colors duration-200 cursor-pointer font-medium shadow-sm"
                    >
                      {t('resources.pageViewer.retry')}
                    </button>
                  </div>
                </div>
              )}

              {!loading && !error && currentPageData && (
                <div className="max-w-5xl mx-auto">
                  <div className="bg-th-card shadow-lg overflow-hidden border border-sl-200 min-h-[400px] flex flex-col">
                    {/* Page Header */}
                    <div className="px-6 py-4 bg-sl-50 border-b border-sl-200">
                      <div className="flex items-center justify-between">
                        <h4 className="text-base font-semibold text-sl-900">
                          {t('resources.pageViewer.page', { page: currentPage })}
                        </h4>
                        <span className="px-3 py-1 bg-status-blue-bg text-status-blue text-xs font-medium">
                          {t('resources.pageViewer.totalPagesBadge', { count: totalPages })}
                        </span>
                      </div>
                    </div>
                    
                    {/* Page Content */}
                    <div className="p-8 flex-1">
                      {currentPageData.imageUrl ? (
                        <img
                          src={currentPageData.imageUrl}
                          alt={t('resources.pageViewer.pageImageAlt', { page: currentPage })}
                          className="max-w-full h-auto"
                        />
                      ) : (currentPageData.extractedText || currentPageData.text) ? (
                        <div className="prose prose-slate max-w-none">
                          <div className="whitespace-pre-wrap text-sl-700 leading-relaxed text-[15px]">
                            {currentPageData.extractedText || currentPageData.text}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-16 text-sl-500">
                          <FileText className="w-16 h-16 mx-auto mb-4 opacity-40" />
                          <p className="text-base font-medium mb-2">{t('resources.pageViewer.pageContentUnavailable')}</p>
                          <p className="text-sm">{t('resources.pageViewer.pageNotProcessed')}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 0 && !loading && (
              <div className="px-6 py-4 bg-th-card border-t border-sl-200">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className="flex items-center gap-2 px-4 py-2.5 bg-sl-100 text-sl-700 hover:bg-sl-200 transition-colors duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed font-medium shadow-sm"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    {t('resources.pageViewer.previous')}
                  </button>

                  <div className="flex items-center gap-3">
                    <span className="text-sm text-sl-600">{t('resources.pageViewer.pageLabel')}</span>
                    <input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={currentPage}
                      onChange={(e) => handlePageChange(parseInt(e.target.value))}
                      className="w-20 px-3 py-2 text-center border border-sl-300 bg-th-card text-sl-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                    />
                    <span className="text-sm text-sl-600">{t('resources.pageViewer.ofTotal', { total: totalPages })}</span>
                  </div>

                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-2 px-4 py-2.5 bg-status-blue-solid hover:bg-status-blue-solid-hover text-white transition-colors duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed font-medium shadow-sm"
                  >
                    {t('resources.pageViewer.next')}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Summary Panel */}
          {isOpen && totalPages > 0 && (
            <SummaryPanel
              resourceId={resourceId}
              totalPages={totalPages}
              isVisible={showSummaryPanel}
              onToggle={() => setShowSummaryPanel(!showSummaryPanel)}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-th-card border-t border-sl-200">
          <p className="text-xs text-sl-500 text-center">
            {t('resources.pageViewer.footerHint')}
          </p>
        </div>
      </div>

    </div>
  )
}

export default ResourcePageViewer
