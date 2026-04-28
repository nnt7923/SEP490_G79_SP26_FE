import React, { useEffect, useState, useCallback } from 'react'
import Layout from '../../../../components/Layout'
import { useMentorSidebarConfig } from '../components/MentorSideBar'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { RefreshCw, ChevronLeft, ChevronRight, FileSearch, AlertCircle, X, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import MentorLearningPathReviewService, {
  type LearningPathReviewItem,
} from '../../../../services/MentorLearningPathReviewService'
import { getMentorReviews } from '../../../../services/LearningPathService'

const PAGE_SIZE_OPTIONS = [10, 20, 50]

// Enum: Pending=0, Accepted=1, Rejected=2, WaitingStudentResponse=3
const STATUS_OPTIONS = [
  { value: '',                      labelKey: 'mentorLpReviews.filterAll' },
  { value: 'Pending',               labelKey: 'mentorLpReviews.filterPending' },
  { value: 'Accepted',              labelKey: 'mentorLpReviews.filterAccepted' },
  { value: 'Rejected',              labelKey: 'mentorLpReviews.filterRejected' },
  { value: 'WaitingStudentResponse',labelKey: 'mentorLpReviews.filterWaiting' },
]

const STATUS_STYLE: Record<string, { label: string; dot: string; bg: string; text: string; border: string }> = {
  Pending:                { label: 'mentorLpReviews.statusPending',  dot: 'bg-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-300 dark:border-yellow-700' },
  Accepted:               { label: 'mentorLpReviews.statusAccepted', dot: 'bg-green-500',  bg: 'bg-green-50 dark:bg-green-900/20',   text: 'text-green-700 dark:text-green-400',   border: 'border-green-300 dark:border-green-700'   },
  Rejected:               { label: 'mentorLpReviews.statusRejected', dot: 'bg-red-500',    bg: 'bg-red-50 dark:bg-red-900/20',       text: 'text-red-700 dark:text-red-400',       border: 'border-red-300 dark:border-red-700'       },
  WaitingStudentResponse: { label: 'mentorLpReviews.statusWaiting',  dot: 'bg-blue-500',   bg: 'bg-blue-50 dark:bg-blue-900/20',     text: 'text-blue-700 dark:text-blue-400',     border: 'border-blue-300 dark:border-blue-700'     },
}

function StatusBadge({ status, t }: { status: string; t: TFunction<'mentor'> }) {
  const s = STATUS_STYLE[status]
  if (!s) return <span className="text-xs text-muted font-mono">{status}</span>
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold border rounded-full font-mono ${s.bg} ${s.text} ${s.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
      {t(s.label as Parameters<typeof t>[0])}
    </span>
  )
}

/** Format datetime to UTC+7, show date + HH:mm:ss */
function formatDateTime(value: string | null | undefined, locale: string): string {
  if (!value) return '—'
  const normalized = /[Zz]$|[+-]\d{2}:\d{2}$/.test(value) ? value : value + 'Z'
  const d = new Date(normalized)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString(locale, {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

function Pagination({ page, totalPages, pageSize, totalCount, onPage, onPageSize, t }: {
  page: number; totalPages: number; pageSize: number; totalCount: number
  onPage: (p: number) => void; onPageSize: (s: number) => void; t: TFunction<'mentor'>
}) {
  const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, totalCount)
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 py-2">
      <div className="flex items-center gap-2 text-xs text-muted font-mono">
        <span>{t('mentorLpReviews.showing', { start, end, total: totalCount })}</span>
        <span className="opacity-30">|</span>
        <span>{t('mentorLpReviews.perPage')}</span>
        <select
          value={pageSize}
          onChange={(e) => { onPageSize(Number(e.target.value)); onPage(1) }}
          className="px-1.5 py-0.5 bg-th-input border border-bd text-body text-xs focus:outline-none focus:border-blue-500 rounded"
        >
          {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1}
          className="p-1 text-muted hover:text-heading hover:bg-th-card border border-transparent hover:border-bd disabled:opacity-30 transition-all rounded">
          <ChevronLeft size={15} />
        </button>
        <span className="px-3 py-0.5 text-xs font-mono text-heading bg-th-card border border-bd rounded min-w-[5rem] text-center">
          {t('mentorLpReviews.page', { current: page, total: Math.max(1, totalPages) })}
        </span>
        <button onClick={() => onPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
          className="p-1 text-muted hover:text-heading hover:bg-th-card border border-transparent hover:border-bd disabled:opacity-30 transition-all rounded">
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  )
}

/** Per-row action button — fetches revisedPathId then navigates to review editor */
function ReviewActionButton({ item, t }: { item: LearningPathReviewItem; t: TFunction<'mentor'> }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const isAccepted = item.decisionStatus === 'Accepted'

  const handleReview = async () => {
    setLoading(true)
    setErr(null)
    try {
      const reviews = await getMentorReviews(item.pathId)
      const mine = reviews.find(r => r.mentorId === item.mentorId) ?? reviews[0]
      if (mine?.revisedPathId) {
        navigate(`/mentor/drafts/${mine.revisedPathId}?reviewPathId=${item.pathId}`)
      } else {
        setErr(t('mentorLpReviews.reviewWorkspaceNotReady'))
      }
    } catch {
      setErr(t('mentorLpReviews.reviewLoadError'))
    } finally {
      setLoading(false)
    }
  }

  if (isAccepted) {
    return (
      <span className="text-xs text-muted italic font-mono">
        {t('mentorLpReviews.reviewDone')}
      </span>
    )
  }

  return (
    <div>
      <button
        onClick={handleReview}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 border border-blue-600 bg-status-blue-solid text-white text-xs font-bold hover:bg-status-blue-solid-hover transition-colors disabled:opacity-50 whitespace-nowrap"
      >
        {loading
          ? <RefreshCw size={12} className="animate-spin" />
          : <ExternalLink size={12} />
        }
        {t('mentorLpReviews.reviewBtn')}
      </button>
      {err && <p className="text-xs text-status-red mt-1">{err}</p>}
    </div>
  )
}

const MentorLearningPathReviews: React.FC = () => {
  const { t, i18n } = useTranslation('mentor')
  const navigate = useNavigate()
  const navItems = useMentorSidebarConfig()
  const sidebarConfig = { navItems, brand: { name: t('mentorLpReviews.title'), subtitle: 'Mentor' } }
  const locale = i18n.language?.startsWith('vi') ? 'vi-VN' : 'en-US'

  const [items, setItems] = useState<LearningPathReviewItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await MentorLearningPathReviewService.getLearningPathReviews({
        page, pageSize, status: statusFilter || undefined,
      })
      setItems(result.items)
      setTotalPages(result.totalPages)
      setTotalCount(result.totalCount)
    } catch {
      setError(t('mentorLpReviews.fetchError'))
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, statusFilter, t])

  useEffect(() => { fetchData() }, [fetchData])

  const paginationProps = { page, totalPages, pageSize, totalCount, onPage: setPage, onPageSize: setPageSize, t }

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="min-h-screen bg-[var(--gray-100)] px-4 py-8 font-mono">
        <div className="max-w-6xl mx-auto space-y-5">

          {/* Header */}
          <div className="border-b border-bd pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <FileSearch className="w-6 h-6 text-status-blue" />
              <div>
                <h1 className="text-2xl font-bold text-heading">{t('mentorLpReviews.title')}</h1>
                <p className="text-xs text-muted mt-0.5">{t('mentorLpReviews.subtitle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
                className="px-3 py-2 border border-bd-strong bg-th-card text-heading text-sm font-mono focus:outline-none focus:border-blue-600"
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.labelKey as Parameters<typeof t>[0])}
                  </option>
                ))}
              </select>
              <button onClick={fetchData} disabled={loading}
                className="flex items-center gap-2 px-4 py-2 border border-bd-strong bg-th-card text-body text-sm hover:bg-th-input transition-colors disabled:opacity-50">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                {t('mentorLpReviews.reload')}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 border border-red-400 bg-status-red-bg text-status-red text-sm">
              <div className="flex items-center gap-2"><AlertCircle size={15} /><span>{error}</span></div>
              <button onClick={() => setError(null)}><X size={14} /></button>
            </div>
          )}

          {/* Table container */}
          <div className="bg-th-card border border-bd-strong overflow-hidden">

            {/* Pagination top */}
            {!loading && totalCount > 0 && (
              <div className="px-4 border-b border-bd">
                <Pagination {...paginationProps} />
              </div>
            )}

            {/* Table */}
            {loading ? (
              <div className="flex flex-col items-center gap-3 py-20 text-muted">
                <RefreshCw className="animate-spin" size={26} />
                <span className="text-sm">{t('mentorLpReviews.loading')}</span>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-20 text-muted">
                <FileSearch size={40} className="opacity-20" />
                <p className="text-sm">{t('mentorLpReviews.empty')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-bd bg-th-input">
                      <th className="text-left px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider w-[35%]">
                        {t('mentorLpReviews.colPath')}
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider w-[18%]">
                        {t('mentorLpReviews.colStudent')}
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider w-[15%]">
                        {t('mentorLpReviews.colStatus')}
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider w-[17%]">
                        {t('mentorLpReviews.colNote')}
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider w-[15%]">
                        {t('mentorLpReviews.colDate')}
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider w-[10%]">
                        {t('mentorLpReviews.colAction')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-bd">
                    {items.map((item) => (
                      <tr key={item.reviewId} className="hover:bg-th-page transition-colors">
                        {/* Path */}
                        <td className="px-4 py-3 align-top">
                          <p className="font-semibold text-heading text-sm leading-snug line-clamp-2">{item.pathTitle}</p>
                        </td>
                        {/* Student */}
                        <td className="px-4 py-3 align-top">
                          <p className="font-medium text-body text-sm">{item.studentName}</p>
                          <p className="text-xs text-muted font-mono truncate">{item.studentEmail}</p>
                        </td>
                        {/* Status */}
                        <td className="px-4 py-3 align-top">
                          <StatusBadge status={item.decisionStatus} t={t} />
                        </td>
                        {/* Note */}
                        <td className="px-4 py-3 align-top">
                          {item.studentRequestNote
                            ? <p className="text-body text-xs leading-relaxed line-clamp-3">{item.studentRequestNote}</p>
                            : <span className="text-muted text-xs italic">{t('mentorLpReviews.noNote')}</span>
                          }
                        </td>
                        {/* Date */}
                        <td className="px-4 py-3 align-top">
                          <p className="text-body text-xs font-mono whitespace-nowrap">{formatDateTime(item.createdAt, locale)}</p>
                        </td>
                        {/* Action */}
                        <td className="px-4 py-3 align-top">
                          <ReviewActionButton item={item} t={t} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination bottom */}
            {!loading && totalCount > 0 && (
              <div className="px-4 border-t border-bd">
                <Pagination {...paginationProps} />
              </div>
            )}
          </div>

        </div>
      </div>
    </Layout>
  )
}

export default MentorLearningPathReviews
