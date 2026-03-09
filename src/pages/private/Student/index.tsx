import React from 'react'
import useAuthStore from '../../../store/useAuthStore'
import ROUTER from '../../../router/ROUTER'
import { useNavigate } from 'react-router-dom'
import Layout from '../../../components/Layout'
import { useStudentSidebarConfig } from './components/StudentSideBar'

import { getMyGoals } from '../../../services/GoalService'
import type { Goal } from '../../../services/GoalService'
import { getUserLearningPaths } from '../../../services/LearningPathService'
import type { SkeletonResponse } from '../../../services/LearningPathService'
import { useTranslation } from 'react-i18next'

const StudentIndex: React.FC = () => {
  const { user } = useAuthStore()
  const displayName = user?.name || user?.username || 'Student'
  const navigate = useNavigate()
  const { t } = useTranslation('student')
  const [goals, setGoals] = React.useState<Goal[]>([])
  const [plans, setPlans] = React.useState<SkeletonResponse[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [goalsData, plansData] = await Promise.all([
          getMyGoals(),
          getUserLearningPaths(user?.id || 'me', { pageSize: 3 })
        ])
        setGoals(goalsData.slice(0, 3))
        setPlans(plansData.items.slice(0, 3))
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [user?.id])

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const sidebarConfig = {
    navItems: useStudentSidebarConfig(),
    actions: [],
    brand: { name: 'Dashboard', subtitle: 'Learning' },
  }

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="page-fade-in" style={{ padding: 16, background: 'var(--bg-surface)', minHeight: '100vh' }}>
        {/* Profile Header */}
        <div style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: '16px 20px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 2, border: '1px solid var(--border-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', flexShrink: 0 }}>
              {getInitials(displayName)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{'>'} {displayName}</h1>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>// {user?.email ?? '—'}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 16, transition: 'border-color 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--accent-primary)', fontWeight: 600 }}>[gol]</span>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', margin: 0 }}>{t('dashboard.goals')}</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{loading ? '—' : goals.length}</p>
              </div>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>// {t('dashboard.learningObjectives')}</p>
          </div>
          <div style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 16, transition: 'border-color 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--accent-primary)', fontWeight: 600 }}>[pln]</span>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', margin: 0 }}>{t('dashboard.plans')}</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{loading ? '—' : plans.length}</p>
              </div>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>// {t('dashboard.learningPaths')}</p>
          </div>
        </div>

        {/* Recent Goals */}
        <div style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>// {t('dashboard.recentGoals')}</h2>
            <button type="button" onClick={() => navigate(ROUTER.GOALS)} style={{ fontSize: 12, color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>{t('dashboard.viewAll')}</button>
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="dash-skeleton-card">
                  <div className="skeleton-block" style={{ width: '60%', height: 14 }} />
                  <div className="skeleton-block" style={{ width: '40%', height: 11 }} />
                </div>
              ))}
            </div>
          ) : goals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>// {t('dashboard.noGoalsYet')}</p>
              <button type="button" onClick={() => navigate(ROUTER.GOALS)} style={{ padding: '8px 16px', background: 'var(--text-primary)', color: 'var(--bg-surface-short)', border: 'none', borderRadius: 2, fontSize: 12, cursor: 'pointer' }}>{'>'} {t('dashboard.createGoal')}</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {goals.map((goal) => (
                <div key={goal.goalId} onClick={() => navigate(`${ROUTER.GOALS}/${goal.goalId}`)} style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 12, cursor: 'pointer', transition: 'border-color 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{goal.title}</h3>
                      {goal.description && <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{goal.description}</p>}
                      <p style={{ fontSize: 11, color: 'var(--gray-400)', margin: '4px 0 0' }}>{new Date(goal.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span style={{ fontSize: 14, color: 'var(--text-secondary)', flexShrink: 0, marginLeft: 8 }}>→</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Plans */}
        <div style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>// {t('dashboard.recentPlans')}</h2>
            <button type="button" onClick={() => navigate(ROUTER.MY_PLANS)} style={{ fontSize: 12, color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>{t('dashboard.viewAll')}</button>
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="dash-skeleton-card">
                  <div className="skeleton-block" style={{ width: '55%', height: 14 }} />
                  <div className="skeleton-block" style={{ width: '35%', height: 11 }} />
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div className="skeleton-block" style={{ width: 60, height: 11 }} />
                    <div className="skeleton-block" style={{ width: 80, height: 11 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : plans.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>// {t('dashboard.noPlansYet')}</p>
              <button type="button" onClick={() => navigate(ROUTER.PLANS)} style={{ padding: '8px 16px', background: 'var(--text-primary)', color: 'var(--bg-surface-short)', border: 'none', borderRadius: 2, fontSize: 12, cursor: 'pointer' }}>{'>'} {t('dashboard.createPlan')}</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {plans.map((plan) => (
                <div key={plan.pathId} onClick={() => navigate('/my-plans/detail', { state: { pathId: plan.pathId || plan.id } })} style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 12, cursor: 'pointer', transition: 'border-color 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }} role="button" tabIndex={0}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{plan.title || 'Learning Path'}</h3>
                      {plan.description && <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{plan.description}</p>}
                      <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--gray-400)' }}>
                        <span>{plan.chapterCount || plan.chapters?.length || 0} {t('dashboard.chapters', { count: plan.chapterCount || plan.chapters?.length || 0 }).replace(/^\d+ /, '')}</span>
                        {plan.createdAt && <span>{new Date(plan.createdAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <span style={{ fontSize: 14, color: 'var(--text-secondary)', flexShrink: 0, marginLeft: 8 }}>→</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' }}>// {t('dashboard.quickActions')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <button type="button" onClick={() => navigate(ROUTER.PLANS)} style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 12, textAlign: 'left', cursor: 'pointer', background: 'var(--bg-surface-short)', transition: 'border-color 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{'>'} {t('dashboard.newPath')}</span>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '4px 0 0' }}>// {t('dashboard.generateLearningPath')}</p>
            </button>
            <button type="button" onClick={() => navigate(ROUTER.GOALS)} style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 12, textAlign: 'left', cursor: 'pointer', background: 'var(--bg-surface-short)', transition: 'border-color 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{'>'} {t('dashboard.newGoal')}</span>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '4px 0 0' }}>// {t('dashboard.setLearningObjective')}</p>
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default StudentIndex
