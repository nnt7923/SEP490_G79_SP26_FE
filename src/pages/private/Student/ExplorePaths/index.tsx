import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, BookOpen, CheckCircle2 } from 'lucide-react'
import Layout from '../../../../components/Layout'
import Toast from '../../../../components/Toast'
import { useStudentSidebarConfig } from '../components/StudentSideBar'
import ROUTER from '../../../../router/ROUTER'
import LearningPathService, { type PublishedLearningPathItem } from '../../../../services/LearningPathService'
import { listSubjects, type Subject } from '../../../../services/SubjectService'
import { useTranslation } from 'react-i18next'
import './explore-paths.css'

type ToastState = { message: string; type: 'success' | 'error' | 'warning' | 'info' }

const COMPLEXITY_LABELS: Record<number, string> = {
  0: 'Beginner',
  1: 'Intermediate',
  2: 'Advanced',
}

const COMPLEXITY_OPTIONS = [
  { value: '', label: 'All levels' },
  { value: '0', label: 'Beginner' },
  { value: '1', label: 'Intermediate' },
  { value: '2', label: 'Advanced' },
]

const complexityColor: Record<number, string> = {
  0: 'var(--success-primary)',
  1: 'var(--warning-primary)',
  2: 'var(--danger-primary)',
}

const ExplorePathsPage: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation('student')
  const navItems = useStudentSidebarConfig()

  const [items, setItems] = useState<PublishedLearningPathItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [complexityLevel, setComplexityLevel] = useState('')
  const [sortDescending, setSortDescending] = useState(true)
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize] = useState(12)
  const [totalPages, setTotalPages] = useState(1)

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [enrollingId, setEnrollingId] = useState<string | null>(null)

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const sidebarConfig = {
    navItems,
    actions: [],
    brand: {
      name: t('explorePaths.title', { defaultValue: 'Explore Learning Paths' }),
      subtitle: t('explorePaths.subtitle', { defaultValue: 'Discover and enroll in published learning paths' }),
    },
  }

  useEffect(() => {
    listSubjects().then(setSubjects).catch(() => { /* silent */ })
  }, [])

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setPageNumber(1)
    }, 400)
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [searchTerm])

  const fetchPaths = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const resp = await LearningPathService.getPublishedPaths({
        search: debouncedSearch || undefined,
        subjectId: subjectId || undefined,
        complexityLevel: complexityLevel || undefined,
        sortDescending,
        pageNumber,
        pageSize,
      })
      setItems(resp.items ?? [])
      setTotalPages(resp.totalPages ?? 1)
    } catch {
      setError(t('explorePaths.loadFailed', { defaultValue: 'Failed to load learning paths' }))
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, subjectId, complexityLevel, sortDescending, pageNumber, pageSize, t])

  useEffect(() => {
    fetchPaths()
  }, [fetchPaths])

  const handleEnroll = async (pathId: string) => {
    setEnrollingId(pathId)
    try {
      await LearningPathService.enrollInPath(pathId)
      setToast({ message: t('explorePaths.enrollSuccess', { defaultValue: 'Enrolled successfully! The path has been added to your plans.' }), type: 'success' })
      setItems((prev) => prev.map((p) => p.pathId === pathId ? { ...p, isEnrolled: true } : p))
    } catch (err: any) {
      const code = err?.response?.data?.errorCode || err?.response?.data?.code
      if (code === 'ALREADY_ENROLLED') {
        setToast({ message: t('explorePaths.alreadyEnrolled', { defaultValue: 'You are already enrolled in this learning path.' }), type: 'info' })
        setItems((prev) => prev.map((p) => p.pathId === pathId ? { ...p, isEnrolled: true } : p))
      } else {
        setToast({ message: t('explorePaths.enrollFailed', { defaultValue: 'Failed to enroll. Please try again.' }), type: 'error' })
      }
    } finally {
      setEnrollingId(null)
    }
  }

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="explore-paths-container">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Page header */}
      <div style={{ padding: '24px 32px 0' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          {t('explorePaths.title', { defaultValue: 'Explore Learning Paths' })}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
          {t('explorePaths.subtitle', { defaultValue: 'Discover and enroll in published learning paths' })}
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '16px 32px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder={t('explorePaths.searchPlaceholder', { defaultValue: 'Search by title or description...' })}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7,
              fontSize: 13, borderRadius: 8, border: '1px solid var(--border-color)',
              background: 'var(--bg-surface)', color: 'var(--text-primary)', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <select
          value={subjectId}
          onChange={(e) => { setSubjectId(e.target.value); setPageNumber(1) }}
          style={{
            padding: '7px 10px', fontSize: 13, borderRadius: 8,
            border: '1px solid var(--border-color)', background: 'var(--bg-surface)',
            color: 'var(--text-primary)', cursor: 'pointer',
          }}
        >
          <option value="">{t('explorePaths.filterSubject', { defaultValue: 'All subjects' })}</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <select
          value={complexityLevel}
          onChange={(e) => { setComplexityLevel(e.target.value); setPageNumber(1) }}
          style={{
            padding: '7px 10px', fontSize: 13, borderRadius: 8,
            border: '1px solid var(--border-color)', background: 'var(--bg-surface)',
            color: 'var(--text-primary)', cursor: 'pointer',
          }}
        >
          {COMPLEXITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          value={sortDescending ? 'desc' : 'asc'}
          onChange={(e) => { setSortDescending(e.target.value === 'desc'); setPageNumber(1) }}
          style={{
            padding: '7px 10px', fontSize: 13, borderRadius: 8,
            border: '1px solid var(--border-color)', background: 'var(--bg-surface)',
            color: 'var(--text-primary)', cursor: 'pointer',
          }}
        >
          <option value="desc">{t('explorePaths.sortNewest', { defaultValue: 'Newest first' })}</option>
          <option value="asc">{t('explorePaths.sortOldest', { defaultValue: 'Oldest first' })}</option>
        </select>
      </div>

      {/* Content */}
      <div style={{ padding: '0 32px 32px' }}>
        {loading && (
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            {t('explorePaths.loading', { defaultValue: 'Loading...' })}
          </p>
        )}
        {error && !loading && (
          <p style={{ color: 'var(--danger-primary)', fontSize: 14 }}>{error}</p>
        )}
        {!loading && !error && items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
              {t('explorePaths.noResults', { defaultValue: 'No learning paths found' })}
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
              {t('explorePaths.noResultsHint', { defaultValue: 'Try adjusting your search or filters' })}
            </p>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 24,
            }}>
              {items.map((path) => {
                const subject = subjects.find(s => s.id === path.subjectId || s.subjectId === path.subjectId)
                
                return (
                  <div key={path.pathId} className="ep-card">
                    <div className="ep-card-header">
                      <div className="ep-card-icon-wrapper">
                        {subject?.icon ? (
                          subject.icon.startsWith('devicon-') ? (
                            <i className={subject.icon}></i>
                          ) : (
                            subject.icon
                          )
                        ) : (
                          <BookOpen size={28} />
                        )}
                      </div>
                    </div>
                    <div className="ep-card-body">
                      {/* Meta/Level */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, minHeight: 20 }}>
                        {path.complexityLevel !== undefined && (
                           <span className="ep-card-badge" style={{ color: complexityColor[path.complexityLevel] ?? 'var(--text-secondary)' }}>
                             {COMPLEXITY_LABELS[path.complexityLevel] ?? String(path.complexityLevel)}
                           </span>
                        )}
                        {path.isEnrolled && (
                          <span className="ep-enrolled-indicator">
                            <CheckCircle2 size={14} /> {t('explorePaths.enrolledBadge', { defaultValue: 'Enrolled' })}
                          </span>
                        )}
                      </div>

                      <h3 className="ep-card-title" title={path.title}>{path.title}</h3>
                      
                      {path.mentorName && (
                        <div className="ep-card-mentor">
                          {t('explorePaths.mentorLabel', { name: path.mentorName, defaultValue: `by ${path.mentorName}` })}
                        </div>
                      )}

                      <div className="ep-card-meta">
                        <span className="ep-card-meta-item">
                          {t('explorePaths.chapters', { count: path.chapterCount, defaultValue: `${path.chapterCount} chapters` })}
                        </span>
                        <span className="ep-card-meta-item">
                          {t('explorePaths.lessons', { count: path.lessonCount, defaultValue: `${path.lessonCount} lessons` })}
                        </span>
                        {path.versionNumber && (
                          <span className="ep-card-meta-item">
                            {t('explorePaths.version', { version: path.versionNumber, defaultValue: `v${path.versionNumber}` })}
                          </span>
                        )}
                      </div>

                      <div className="ep-card-footer">
                        <button
                          type="button"
                          className="ep-btn-detail"
                          style={{ width: '100%', justifyContent: 'center' }}
                          onClick={() => navigate(ROUTER.EXPLORE_PATH_PREVIEW.replace(':pathId', path.pathId))}
                        >
                          {t('explorePaths.preview', { defaultValue: 'Chi tiết' })}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
                <button
                  type="button"
                  disabled={pageNumber <= 1}
                  onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                  style={{
                    padding: '6px 14px', fontSize: 13, borderRadius: 8,
                    border: '1px solid var(--border-color)', background: 'var(--bg-surface)',
                    color: 'var(--text-primary)', cursor: pageNumber <= 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  ‹
                </button>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', alignSelf: 'center' }}>
                  {pageNumber} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={pageNumber >= totalPages}
                  onClick={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
                  style={{
                    padding: '6px 14px', fontSize: 13, borderRadius: 8,
                    border: '1px solid var(--border-color)', background: 'var(--bg-surface)',
                    color: 'var(--text-primary)', cursor: pageNumber >= totalPages ? 'not-allowed' : 'pointer',
                  }}
                >
                  ›
                </button>
              </div>
            )}
          </>
        )}
      </div>
      </div>
    </Layout>
  )
}

export default ExplorePathsPage
