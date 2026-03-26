import React from 'react'
import { motion } from 'framer-motion'
import useAuthStore from '../../../store/useAuthStore'
import ROUTER from '../../../router/ROUTER'
import { useNavigate } from 'react-router-dom'
import Layout from '../../../components/Layout'
import { useStudentSidebarConfig } from './components/StudentSideBar'
import { Target, Map, Plus } from 'lucide-react'

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
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: '16px 20px', marginBottom: 16 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 2, border: '1px solid var(--border-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', flexShrink: 0 }}>
              {getInitials(displayName)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{displayName}</h1>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>{user?.email ?? '—'}</p>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {[
            { icon: <Target size={20} />, label: t('dashboard.goals'), value: loading ? '—' : goals.length, sub: t('dashboard.learningObjectives') },
            { icon: <Map size={20} />, label: t('dashboard.plans'), value: loading ? '—' : plans.length, sub: t('dashboard.learningPaths') },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
              whileHover={{ y: -3 }}
              style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 16, transition: 'border-color 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                <span style={{ color: 'var(--accent-primary)', display: 'flex' }}>{stat.icon}</span>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', margin: 0 }}>{stat.label}</p>
                  <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{stat.value}</p>
                </div>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>{stat.sub}</p>
            </motion.div>
          ))}
        </div>

        {/* Recent Goals */}
        <div style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('dashboard.recentGoals')}</h2>
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
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>{t('dashboard.noGoalsYet')}</p>
              <button type="button" onClick={() => navigate(ROUTER.GOALS)} style={{ padding: '8px 16px', background: 'var(--text-primary)', color: 'var(--bg-surface-short)', border: 'none', borderRadius: 2, fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}><Plus size={16} /> {t('dashboard.createGoal')}</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {goals.map((goal, i) => (
                <motion.div
                  key={goal.goalId}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.07 }}
                  whileHover={{ x: 4 }}
                  onClick={() => navigate(`${ROUTER.GOALS}/${goal.goalId}`)}
                  style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 12, cursor: 'pointer', transition: 'border-color 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{goal.title}</h3>
                      {goal.description && <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{goal.description}</p>}
                      <p style={{ fontSize: 11, color: 'var(--gray-400)', margin: '4px 0 0' }}>{new Date(goal.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span style={{ fontSize: 14, color: 'var(--text-secondary)', flexShrink: 0, marginLeft: 8 }}>→</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Plans */}
        <div style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('dashboard.recentPlans')}</h2>
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
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>{t('dashboard.noPlansYet')}</p>
              <button type="button" onClick={() => navigate(ROUTER.PLANS)} style={{ padding: '8px 16px', background: 'var(--text-primary)', color: 'var(--bg-surface-short)', border: 'none', borderRadius: 2, fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}><Plus size={16} /> {t('dashboard.createPlan')}</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {plans.map((plan, i) => (
                <motion.div
                  key={plan.pathId}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.07 }}
                  whileHover={{ x: 4 }}
                  onClick={() => navigate('/my-plans/detail', { state: { pathId: plan.pathId || plan.id } })}
                  style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 12, cursor: 'pointer', transition: 'border-color 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }}
                  role="button" tabIndex={0}
                >
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
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' }}>{t('dashboard.quickActions')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: t('dashboard.newPath'), sub: t('dashboard.generateLearningPath'), icon: <Map size={16} />, route: ROUTER.PLANS },
              { label: t('dashboard.newGoal'), sub: t('dashboard.setLearningObjective'), icon: <Target size={16} />, route: ROUTER.GOALS },
            ].map((action, i) => (
              <motion.button
                key={action.label}
                type="button"
                onClick={() => navigate(action.route)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 + i * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 12, textAlign: 'left', cursor: 'pointer', background: 'var(--bg-surface-short)', transition: 'border-color 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>{action.icon} {action.label}</span>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '4px 0 0' }}>{action.sub}</p>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default StudentIndex
