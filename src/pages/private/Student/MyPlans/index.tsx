
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../../../components/Layout'
import { useStudentSidebarConfig } from '../components/StudentSideBar'
import LearningPathService, { type SkeletonResponse } from '../../../../services/LearningPathService'
import useAuthStore from '../../../../store/useAuthStore'
import { useTranslation } from 'react-i18next'

const MyPlansPage: React.FC = () => {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [plans, setPlans] = useState<SkeletonResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize] = useState(10)
  const [totalCount, setTotalCount] = useState(0)
  const { t } = useTranslation('student')
  const { t: tc } = useTranslation('common')



  const sidebarConfig = {
    navItems: useStudentSidebarConfig(),
    actions: [],
    brand: { name: 'My Plans', subtitle: 'Learning' },
  }

  useEffect(() => { fetchPlans() }, [pageNumber, searchTerm])

  const fetchPlans = async () => {
    if (!user?.id) return
    setLoading(true)
    setError(null)
    try {
      const response = await LearningPathService.getUserLearningPaths(user.id, { pageNumber, pageSize, searchTerm: searchTerm || undefined })
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

  const totalPages = Math.ceil(totalCount / pageSize)

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px 8px 32px', fontSize: 13, border: '1px solid var(--border-base)', borderRadius: 2,
    background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box',
  }

  return (
    <Layout sidebar={sidebarConfig}>
      <div style={{ padding: '24px', background: 'var(--bg-surface)', minHeight: '100vh' }}>
        {/* Search */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-secondary)' }}>$</span>
            <input
              type="text" placeholder={t('myPlans.searchPlaceholder')} value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPageNumber(1) }}
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }}
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 48, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>{t('myPlans.loading')}</div>
        ) : error ? (
          <div style={{ border: '1px solid var(--danger-primary)', borderRadius: 2, padding: 16, color: 'var(--danger-primary)', fontSize: 13 }}>// ERROR: {error}</div>
        ) : filteredPlans.length === 0 ? (
          <div style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 48, textAlign: 'center' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{t('myPlans.noPlansFound')}</p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{searchTerm ? t('myPlans.noPlansMatch') : t('myPlans.startCreating')}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredPlans.map((plan) => (
              <div
                key={plan.pathId || plan.id}
                onClick={() => navigate('/my-plans/detail', { state: { pathId: plan.pathId || plan.id } })}
                style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 16, cursor: 'pointer', transition: 'border-color 0.2s', background: 'var(--bg-surface-short)' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>{plan.title || t('myPlans.untitled')}</h3>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{plan.description || t('myPlans.noDescription')}</p>
                    <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--gray-400)' }}>
                      <span>{t('myPlans.chapters', { count: plan.chapterCount || plan.chapters?.length || 0 })}</span>
                      <span>{t('myPlans.lessons', { count: plan.lessons?.length || 0 })}</span>
                      {plan.createdAt && <span>{new Date(plan.createdAt).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <span style={{ fontSize: 14, color: 'var(--text-secondary)', flexShrink: 0, marginLeft: 12 }}>→</span>
                </div>
              </div>
            ))}
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
