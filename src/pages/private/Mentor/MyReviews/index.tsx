import React, { useEffect, useState, useCallback } from 'react'
import Layout from '../../../../components/Layout'
import { useMentorSidebarConfig } from '../components/MentorSideBar'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { RefreshCw, ChevronLeft, ChevronRight, Info, X, Star, MessageSquare } from 'lucide-react'
import MentorReviewService, { type MentorRatingItem } from '../../../../services/MentorReviewService'

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50]

function StarRating({ score, size = 16 }: { score: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          className={s <= score ? 'text-yellow-400 fill-yellow-400' : 'text-border-layer fill-border-layer'}
        />
      ))}
    </div>
  )
}

function Avatar({ name, url, size = 10 }: { name: string; url: string | null; size?: number }) {
  const cls = `w-${size} h-${size} rounded-full flex-shrink-0`
  if (url) return <img src={url} alt={name} className={`${cls} object-cover`} />
  const initials = name.split(' ').slice(-2).map((w) => w[0]?.toUpperCase()).join('')
  return (
    <div className={`${cls} bg-accent-primary/15 text-accent-primary flex items-center justify-center text-sm font-bold`}>
      {initials || '?'}
    </div>
  )
}

function formatDate(value: string | null | undefined, locale: string): string {
  if (!value) return '-'
  const normalized = /[Zz]$|[+-]\d{2}:\d{2}$/.test(value) ? value : value + 'Z'
  const d = new Date(normalized)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString(locale, { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: 'short', year: 'numeric' })
}

function ScoreBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-4 text-right text-muted font-medium">{label}</span>
      <Star size={10} className="text-yellow-400 fill-yellow-400 flex-shrink-0" />
      <div className="flex-1 h-1.5 bg-th-input rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="w-5 text-right text-muted">{count}</span>
    </div>
  )
}

function Pagination({ page, totalPages, pageSize, totalCount, onPage, onPageSize, t }: {
  page: number; totalPages: number; pageSize: number; totalCount: number
  onPage: (p: number) => void; onPageSize: (s: number) => void; t: TFunction<'mentor'>
}) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm text-muted">
        <span>{t('myReviews.showing', { start: (page - 1) * pageSize + 1, end: Math.min(page * pageSize, totalCount), total: totalCount })}</span>
        <span className="text-border-layer">|</span>
        <span>{t('myReviews.perPage')}</span>
        <select
          value={pageSize}
          onChange={(e) => { onPageSize(Number(e.target.value)); onPage(1) }}
          className="px-2 py-0.5 bg-th-input border border-bd text-body text-xs focus:outline-none focus:border-accent-primary"
        >
          {PAGE_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1}
          className="p-1.5 text-body hover:bg-th-card border border-transparent hover:border-bd disabled:opacity-30 transition-all rounded">
          <ChevronLeft size={16} />
        </button>
        <span className="px-3 py-1 text-sm font-medium text-heading bg-th-card border border-bd rounded min-w-[4rem] text-center">
          {page} / {totalPages}
        </span>
        <button onClick={() => onPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
          className="p-1.5 text-body hover:bg-th-card border border-transparent hover:border-bd disabled:opacity-30 transition-all rounded">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

const MentorMyReviews: React.FC = () => {
  const { t, i18n } = useTranslation('mentor')
  const navItems = useMentorSidebarConfig()
  const sidebarConfig = { navItems, brand: { name: t('myReviews.title'), subtitle: 'Mentor' } }
  const locale = i18n.language?.startsWith('vi') ? 'vi-VN' : 'en-US'

  const [items, setItems] = useState<MentorRatingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [avgScore, setAvgScore] = useState<number | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await MentorReviewService.getMyReviews({ pageNumber: page, pageSize })
      setItems(result.reviews.items)
      setTotalPages(result.reviews.totalPages)
      setTotalCount(result.totalReviews)
      setAvgScore(result.averageRating)
    } catch {
      setError(t('myReviews.fetchError'))
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, t])

  useEffect(() => { fetchData() }, [fetchData])

  // Distribution per score
  const dist = [5, 4, 3, 2, 1].map((s) => ({
    score: s,
    count: items.filter((i) => i.score === s).length,
    color: s >= 4 ? '#22c55e' : s === 3 ? '#f59e0b' : '#ef4444',
  }))

  const paginationProps = { page, totalPages, pageSize, totalCount, onPage: setPage, onPageSize: setPageSize, t }

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="p-4 md:p-8 bg-th-page min-h-screen max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
          <div>
            <h1 className="text-2xl font-bold text-heading flex items-center gap-2">
              <Star className="text-yellow-400 fill-yellow-400" size={22} />
              {t('myReviews.title')}
            </h1>
            <p className="text-muted text-sm mt-0.5">{t('myReviews.subtitle')}</p>
          </div>
          <button onClick={fetchData} disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-th-card text-body text-sm border border-bd hover:bg-th-input transition-colors disabled:opacity-50 rounded">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {t('myReviews.reload')}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-danger-primary/10 border border-danger-primary text-danger-primary p-3 mb-5 flex items-center justify-between rounded text-sm">
            <div className="flex items-center gap-2"><Info size={16} /><span>{error}</span></div>
            <button onClick={() => setError(null)}><X size={14} /></button>
          </div>
        )}

        {/* Stats card */}
        {avgScore !== null && totalCount > 0 && (
          <div className="bg-th-card border border-bd rounded-lg p-5 mb-6 flex flex-col sm:flex-row gap-6 items-center sm:items-start">
            {/* Big score */}
            <div className="flex flex-col items-center gap-1 min-w-[100px]">
              <span className="text-5xl font-extrabold text-heading">{avgScore.toFixed(1)}</span>
              <StarRating score={Math.round(avgScore)} size={18} />
              <span className="text-xs text-muted mt-1">{totalCount} {t('myReviews.reviews')}</span>
            </div>
            {/* Distribution bars */}
            <div className="flex-1 w-full space-y-2 justify-center flex flex-col">
              {dist.map((d) => (
                <ScoreBar key={d.score} label={String(d.score)} count={d.count} total={items.length} color={d.color} />
              ))}
            </div>
          </div>
        )}

        {/* Pagination top */}
        {!loading && totalCount > 0 && (
          <div className="mb-4">
            <Pagination {...paginationProps} />
          </div>
        )}

        {/* List */}
        {loading && items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-20 text-muted">
            <RefreshCw className="animate-spin" size={28} />
            <span className="text-sm">{t('myReviews.loading')}</span>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-muted">
            <MessageSquare size={44} className="opacity-20" />
            <p className="text-sm">{t('myReviews.empty')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.ratingId} className="bg-th-card border border-bd rounded-lg p-4 flex gap-3 hover:border-accent-primary/40 transition-colors">
                <Avatar name={item.studentName} url={item.studentAvatarUrl} size={10} />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1.5">
                    <span className="font-semibold text-heading text-sm">{item.studentName}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StarRating score={item.score} size={13} />
                      <span className="text-xs font-semibold text-heading">{item.score}/5</span>
                      <span className="text-xs text-muted">{formatDate(item.createdAt, locale)}</span>
                    </div>
                  </div>
                  {item.comment ? (
                    <p className="text-body text-sm leading-relaxed">{item.comment}</p>
                  ) : (
                    <p className="text-muted text-xs italic">{t('myReviews.noComment')}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination bottom */}
        {!loading && totalCount > 0 && (
          <div className="mt-5">
            <Pagination {...paginationProps} />
          </div>
        )}
      </div>
    </Layout>
  )
}

export default MentorMyReviews
