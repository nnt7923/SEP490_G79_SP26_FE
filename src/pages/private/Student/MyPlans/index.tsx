
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../../../components/Layout'
import { useStudentSidebarConfig } from '../components/StudentSideBar'
import LearningPathService, { type SkeletonResponse } from '../../../../services/LearningPathService'
import useAuthStore from '../../../../store/useAuthStore'
import useChatStore from '../../../../store/useChatStore'
import { useTranslation } from 'react-i18next'
import { shouldShowSourceUpdateBadge } from '../shareVersionBadge'

const clampPercent = (value: unknown) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return Math.max(0, Math.min(100, numeric))
}

const formatProgressPercent = (value: unknown) => `${clampPercent(value).toFixed(2)}%`

const getProgressVisual = (value: number) => {
  if (value < 35) {
    return {
      color: '#d96b6b',
      tint: 'rgba(217, 107, 107, 0.08)',
      border: 'rgba(217, 107, 107, 0.24)',
      track: 'rgba(217, 107, 107, 0.14)',
      gradient: 'linear-gradient(90deg, #f29a9a 0%, #d96b6b 100%)',
    }
  }

  if (value < 70) {
    return {
      color: 'var(--warning-primary)',
      tint: 'rgba(245, 158, 11, 0.08)',
      border: 'rgba(245, 158, 11, 0.24)',
      track: 'rgba(245, 158, 11, 0.14)',
      gradient: 'linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)',
    }
  }

  return {
    color: 'var(--success-primary)',
    tint: 'var(--bg-green-tint)',
    border: 'rgba(22, 163, 74, 0.24)',
    track: 'rgba(34, 197, 94, 0.14)',
    gradient: 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)',
  }
}

const MyPlansPage: React.FC = () => {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [plans, setPlans] = useState<SkeletonResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [planProgressMap, setPlanProgressMap] = useState<Record<string, number>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize] = useState(10)
  const [totalCount, setTotalCount] = useState(0)
  const { t } = useTranslation('student')
  const { t: tc } = useTranslation('common')
  const receivedLearningPathShares = useChatStore((state) => state.receivedLearningPathShares)



  const sidebarConfig = {
    navItems: useStudentSidebarConfig(),
    actions: [],
    brand: { name: tc('sidebar.myPlans'), subtitle: 'Learning' },
  }

  useEffect(() => { fetchPlans() }, [pageNumber, searchTerm])

  const fetchPlans = async () => {
    if (!user?.id) return
    setLoading(true)
    setError(null)
    try {
      const response = await LearningPathService.getUserLearningPaths(user.id, {
        pageNumber,
        pageSize,
        searchTerm: searchTerm || undefined,
        useCache: false,
      })
      setPlans(response.items)
      setTotalCount(response.totalCount)
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || t('myPlans.loading'))
    } finally {
      setLoading(false)
    }
  }

  const filteredPlans = plans.filter(plan => {
    const q = searchTerm.toLowerCase()
    return (plan?.title || '').toLowerCase().includes(q) || (plan?.description || '').toLowerCase().includes(q)
  })

  useEffect(() => {
    let isCancelled = false

    const fetchPlanProgress = async () => {
      const pathIds = plans
        .map((plan) => String(plan.pathId || plan.id || '').trim())
        .filter((pathId) => Boolean(pathId))

      if (pathIds.length === 0) {
        if (!isCancelled) setPlanProgressMap({})
        return
      }

      const progressEntries = await Promise.all(pathIds.map(async (pathId) => {
        try {
          const response = await LearningPathService.getLearningPathProgress(pathId)
          return [pathId, clampPercent(response.progressPercent)] as const
        } catch {
          const fallbackPlan = plans.find((plan) => String(plan.pathId || plan.id || '').trim() === pathId)
          const fallbackPercent = clampPercent(fallbackPlan?.progressPercent ?? fallbackPlan?.completionPercent ?? 0)
          return [pathId, fallbackPercent] as const
        }
      }))

      if (isCancelled) return

      const nextProgressMap: Record<string, number> = {}
      progressEntries.forEach(([pathId, progressPercent]) => {
        nextProgressMap[pathId] = progressPercent
      })
      setPlanProgressMap(nextProgressMap)
    }

    fetchPlanProgress()

    return () => {
      isCancelled = true
    }
  }, [plans])

  const totalPages = Math.ceil(totalCount / pageSize)



  return (
    <Layout sidebar={sidebarConfig}>
      <div style={{ padding: '24px', background: 'var(--bg-surface)', minHeight: '100vh' }}>
        {/* Search */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text" placeholder={t('myPlans.searchPlaceholder')} value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPageNumber(1) }}
              style={{ width: '100%', padding: '8px 12px 8px 12px', fontSize: 13, border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box', }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }}
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 48, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>{t('myPlans.loading')}</div>
        ) : error ? (
          <div style={{ border: '1px solid var(--danger-primary)', borderRadius: 2, padding: 16, color: 'var(--danger-primary)', fontSize: 13 }}>ERROR: {error}</div>
        ) : filteredPlans.length === 0 ? (
          <div style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 48, textAlign: 'center' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{t('myPlans.noPlansFound')}</p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{searchTerm ? t('myPlans.noPlansMatch') : t('myPlans.startCreating')}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredPlans.map((plan) => {
              const planId = String(plan.pathId || plan.id || '').trim()
              const fallbackShare = receivedLearningPathShares.find(
                (share) => share.status === 'Accepted' && String(share.pathId || '').trim() === planId,
              )
              const sharedByUserName = String(
                plan.sharedByUserName ||
                fallbackShare?.mentorName ||
                '',
              ).trim()
              const hasSourceUpdate = shouldShowSourceUpdateBadge(plan)
              const progressPercent = clampPercent(
                planId
                  ? (planProgressMap[planId] ?? plan?.progressPercent ?? plan?.completionPercent ?? 0)
                  : (plan?.progressPercent ?? plan?.completionPercent ?? 0)
              )
              const progressVisual = getProgressVisual(progressPercent)

              return (
                <div
                  key={plan.pathId || plan.id}
                  onClick={() => navigate('/my-plans/detail', { state: { pathId: plan.pathId || plan.id } })}
                  style={{
                    border: '1px solid var(--border-base)',
                    borderRadius: 12,
                    padding: 18,
                    cursor: 'pointer',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
                    background: 'var(--bg-surface-short)',
                    boxShadow: '0 4px 16px rgba(15, 23, 42, 0.06)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-primary)'
                    e.currentTarget.style.boxShadow = '0 10px 24px rgba(15, 23, 42, 0.1)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-base)'
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(15, 23, 42, 0.06)'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 14 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {plan.title || t('myPlans.untitled')}
                        </h3>
                        {hasSourceUpdate && (
                          <span
                            style={{
                              flexShrink: 0,
                              fontSize: 11,
                              fontWeight: 700,
                              color: '#854d0e',
                              border: '1px solid rgba(245, 158, 11, 0.35)',
                              borderRadius: 999,
                              padding: '2px 8px',
                              background: 'rgba(245, 158, 11, 0.12)',
                            }}
                          >
                            {t('myPlans.newVersionBadge', { defaultValue: 'Có phiên bản mới' })}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{plan.description || t('myPlans.noDescription')}</p>
                      {sharedByUserName && (
                        <div style={{ marginBottom: 10, fontSize: 11, color: 'var(--text-secondary)' }}>
                          {t('myPlans.sharedBy', { defaultValue: 'Được chia sẻ bởi {{name}}', name: sharedByUserName })}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--gray-400)', flexWrap: 'wrap' }}>
                        <span>{t('myPlans.chapters', { count: plan.chapterCount || plan.chapters?.length || 0 })}</span>
                        <span>{t('myPlans.lessons', { count: plan.lessonCount ?? plan.lessons?.length ?? 0 })}</span>
                        {plan.createdAt && <span>{new Date(plan.createdAt).toLocaleDateString()}</span>}
                      </div>

                      <div style={{ marginTop: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.45px' }}>
                            {t('myPlans.progressLabel')}
                          </span>
                          <span
                            title={formatProgressPercent(progressPercent)}
                            style={{
                              fontSize: 24,
                              fontWeight: 800,
                              lineHeight: 1,
                              color: progressVisual.color,
                              letterSpacing: '-0.3px',
                            }}
                          >
                            {formatProgressPercent(progressPercent)}
                          </span>
                        </div>
                        <div style={{ marginTop: 8, width: '100%', height: 10, borderRadius: 999, background: progressVisual.track, overflow: 'hidden', border: `1px solid ${progressVisual.border}` }}>
                          <div
                            style={{
                              width: `${progressPercent}%`,
                              height: '100%',
                              background: progressVisual.gradient,
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
            <button type="button" onClick={() => setPageNumber(Math.max(1, pageNumber - 1))} disabled={pageNumber === 1}
              style={{ padding: '6px 16px', border: '1px solid var(--border-base)', borderRadius: 2, fontSize: 12, color: 'var(--text-primary)', background: 'var(--bg-surface-short)', cursor: pageNumber === 1 ? 'not-allowed' : 'pointer', opacity: pageNumber === 1 ? 0.5 : 1 }}>
              {tc('pagination.prev')}
            </button>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{tc('pagination.page')} {pageNumber} {tc('pagination.of')} {totalPages}</span>
            <button type="button" onClick={() => setPageNumber(Math.min(totalPages, pageNumber + 1))} disabled={pageNumber === totalPages}
              style={{ padding: '6px 16px', border: '1px solid var(--border-base)', borderRadius: 2, fontSize: 12, color: 'var(--text-primary)', background: 'var(--bg-surface-short)', cursor: pageNumber === totalPages ? 'not-allowed' : 'pointer', opacity: pageNumber === totalPages ? 0.5 : 1 }}>
              {tc('pagination.next')}
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default MyPlansPage
