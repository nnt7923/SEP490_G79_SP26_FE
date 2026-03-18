import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Layout from '../../../../components/Layout'
import { useMentorSidebarConfig } from '../components/MentorSideBar'
import LearningPathService, { type SkeletonResponse } from '../../../../services/LearningPathService'
import { SubjectService } from '../../../../services'
import { useTranslation } from 'react-i18next'
import Toast from '../../../../components/Toast'
import ROUTER from '../../../../router/ROUTER'

type ToastState = { message: string; type: 'success' | 'error' | 'warning' | 'info' }

const MentorDraftsPage: React.FC = () => {
  const { t } = useTranslation('mentor')
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()
  const location = useLocation() as { state?: { toast?: ToastState } }
  const [drafts, setDrafts] = useState<SkeletonResponse[]>([])
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [sortDescending, setSortDescending] = useState(true)
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize] = useState(10)
  const [totalCount, setTotalCount] = useState(0)
  const [toast, setToast] = useState<ToastState | null>(location.state?.toast ?? null)

  const sidebarConfig = {
    navItems: useMentorSidebarConfig(),
    actions: [],
    brand: { name: t('drafts.brandName'), subtitle: t('drafts.brandSubtitle') },
  }

  useEffect(() => {
    SubjectService.listSubjects()
      .then((items) => {
        setSubjects(items.map((item: any) => ({
          id: String(item?.id ?? item?.subjectId),
          name: item?.name ?? 'Subject',
        })))
      })
      .catch(() => setSubjects([]))
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput.trim())
      setPageNumber(1)
    }, 350)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    if (location.state?.toast) {
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    let active = true

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await LearningPathService.getMyDrafts({
          pageNumber,
          pageSize,
          searchTerm: searchTerm || undefined,
          subjectId: subjectId || undefined,
          sortDescending,
        })
        if (!active) return
        setDrafts(res.items)
        setTotalCount(res.totalCount)
      } catch (err: any) {
        if (!active) return
        setError(err?.response?.data?.message || err?.message || t('drafts.loadFailed'))
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [pageNumber, pageSize, searchTerm, sortDescending, subjectId])

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / pageSize)), [pageSize, totalCount])

  return (
    <Layout sidebar={sidebarConfig}>
      <div style={{ padding: 24, background: 'var(--bg-main)', minHeight: '100vh' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button
              type="button"
              onClick={() => navigate(ROUTER.MENTOR_DRAFT_CREATE)}
              style={{
                padding: '10px 14px',
                border: '1px solid var(--accent-primary)',
                borderRadius: 2,
                background: 'var(--bg-surface)',
                color: 'var(--accent-primary)',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              + {t('drafts.createManualCta')}
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('drafts.searchPlaceholder')}
              style={{
                flex: '1 1 280px',
                minWidth: 220,
                padding: '10px 12px',
                border: '1px solid var(--border-base)',
                borderRadius: 2,
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
            <select
              value={subjectId}
              onChange={(e) => { setSubjectId(e.target.value); setPageNumber(1) }}
              style={{
                minWidth: 220,
                padding: '10px 12px',
                border: '1px solid var(--border-base)',
                borderRadius: 2,
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="">{t('drafts.subjectFilterAll')}</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
            <select
              value={sortDescending ? 'desc' : 'asc'}
              onChange={(e) => { setSortDescending(e.target.value === 'desc'); setPageNumber(1) }}
              style={{
                minWidth: 180,
                padding: '10px 12px',
                border: '1px solid var(--border-base)',
                borderRadius: 2,
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="desc">{t('drafts.sortNewest')}</option>
              <option value="asc">{t('drafts.sortOldest')}</option>
            </select>
          </div>

          {loading ? (
            <div style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 48, textAlign: 'center', background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
              {t('drafts.loading')}
            </div>
          ) : error ? (
            <div style={{ border: '1px solid var(--danger-primary)', borderRadius: 2, padding: 16, background: 'var(--bg-red-tint)', color: 'var(--danger-primary)' }}>
              {error}
            </div>
          ) : drafts.length === 0 ? (
            <div style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 48, textAlign: 'center', background: 'var(--bg-surface)' }}>
              <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>{t('drafts.emptyTitle')}</p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{t('drafts.emptyDesc')}</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {drafts.map((draft) => (
                <button
                  key={draft.pathId || draft.id}
                  type="button"
                  onClick={() => navigate(ROUTER.MENTOR_DRAFT_DETAIL.replace(':pathId', String(draft.pathId || draft.id)), { state: { draft } })}
                  style={{
                    padding: 18,
                    border: '1px solid var(--border-base)',
                    borderRadius: 2,
                    background: 'var(--bg-surface)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s, background 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-primary)'
                    e.currentTarget.style.background = 'var(--bg-main)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-base)'
                    e.currentTarget.style.background = 'var(--bg-surface)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'start' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                          {draft.title || tc('status.notUpdated')}
                        </h3>
                        <span style={{ padding: '2px 8px', border: '1px solid var(--warning-primary)', color: 'var(--warning-primary)', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                          {t('drafts.draftBadge')}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-secondary)' }}>
                        <span>{(draft as any).subjectName || '-'}</span>
                        <span>{t('drafts.chapterCount', { count: draft.chapterCount || draft.chapters?.length || 0 })}</span>
                        <span>{draft.createdAt ? new Date(draft.createdAt).toLocaleDateString() : '-'}</span>
                      </div>
                    </div>
                    <span style={{ color: 'var(--accent-primary)', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                      {t('drafts.openDraft')} →
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {totalPages > 1 && !loading && !error && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, gap: 12 }}>
              <button
                type="button"
                onClick={() => setPageNumber((prev) => Math.max(1, prev - 1))}
                disabled={pageNumber === 1}
                style={{
                  padding: '8px 16px',
                  border: '1px solid var(--border-base)',
                  borderRadius: 2,
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  cursor: pageNumber === 1 ? 'not-allowed' : 'pointer',
                  opacity: pageNumber === 1 ? 0.5 : 1,
                }}
              >
                {tc('pagination.prev')}
              </button>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {tc('pagination.page')} {pageNumber} {tc('pagination.of')} {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPageNumber((prev) => Math.min(totalPages, prev + 1))}
                disabled={pageNumber === totalPages}
                style={{
                  padding: '8px 16px',
                  border: '1px solid var(--border-base)',
                  borderRadius: 2,
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  cursor: pageNumber === totalPages ? 'not-allowed' : 'pointer',
                  opacity: pageNumber === totalPages ? 0.5 : 1,
                }}
              >
                {tc('pagination.next')}
              </button>
            </div>
          )}
        </div>

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </Layout>
  )
}

export default MentorDraftsPage
