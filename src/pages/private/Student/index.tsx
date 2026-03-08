import React from 'react'
import useAuthStore from '../../../store/useAuthStore'
import ROUTER from '../../../router/ROUTER'
import { useNavigate } from 'react-router-dom'
import Layout from '../../../components/Layout'
import { getStudentSidebarConfig } from './components/StudentSideBar'
import { LogOut } from 'lucide-react'
import { getMyGoals } from '../../../services/GoalService'
import type { Goal } from '../../../services/GoalService'
import { getUserLearningPaths } from '../../../services/LearningPathService'
import type { SkeletonResponse } from '../../../services/LearningPathService'

const StudentIndex: React.FC = () => {
  const { user, logout } = useAuthStore()
  const displayName = user?.name || user?.username || 'Student'
  const navigate = useNavigate()
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

  const handleLogout = async () => {
    await logout()
    navigate(ROUTER.LOGIN)
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const sidebarConfig = {
    navItems: getStudentSidebarConfig(),
    actions: [
      {
        label: 'Logout',
        icon: <LogOut className="w-5 h-5" />,
        onClick: handleLogout,
        variant: 'danger' as const,
      },
    ],
    brand: { name: 'Dashboard', subtitle: 'Learning' },
  }

  return (
    <Layout sidebar={sidebarConfig}>
      <div style={{ padding: 16, background: 'var(--bg-surface)', minHeight: '100vh' }}>
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
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', margin: 0 }}>Goals</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{loading ? '—' : goals.length}</p>
              </div>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>// learning objectives</p>
          </div>
          <div style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 16, transition: 'border-color 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--accent-primary)', fontWeight: 600 }}>[pln]</span>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', margin: 0 }}>Plans</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{loading ? '—' : plans.length}</p>
              </div>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>// learning paths</p>
          </div>
        </div>

        {/* Recent Goals */}
        <div style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>// Recent Goals</h2>
            <button type="button" onClick={() => navigate(ROUTER.GOALS)} style={{ fontSize: 12, color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>view all →</button>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)', fontSize: 12 }}>// loading...</div>
          ) : goals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>// No goals yet</p>
              <button type="button" onClick={() => navigate(ROUTER.GOALS)} style={{ padding: '8px 16px', background: 'var(--text-primary)', color: 'var(--bg-surface-short)', border: 'none', borderRadius: 2, fontSize: 12, cursor: 'pointer' }}>{'>'} create goal</button>
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
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>// Recent Plans</h2>
            <button type="button" onClick={() => navigate(ROUTER.MY_PLANS)} style={{ fontSize: 12, color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>view all →</button>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)', fontSize: 12 }}>// loading...</div>
          ) : plans.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>// No plans yet</p>
              <button type="button" onClick={() => navigate(ROUTER.PLANS)} style={{ padding: '8px 16px', background: 'var(--text-primary)', color: 'var(--bg-surface-short)', border: 'none', borderRadius: 2, fontSize: 12, cursor: 'pointer' }}>{'>'} create plan</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {plans.map((plan) => (
                <div key={plan.pathId} onClick={() => navigate(`${ROUTER.MY_PLANS}/${plan.pathId}`)} style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 12, cursor: 'pointer', transition: 'border-color 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{plan.title || 'Learning Path'}</h3>
                      {plan.description && <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{plan.description}</p>}
                      <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--gray-400)' }}>
                        <span>{plan.chapterCount || plan.chapters?.length || 0} chapters</span>
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
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px' }}>// Quick Actions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <button type="button" onClick={() => navigate(ROUTER.PLANS)} style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 12, textAlign: 'left', cursor: 'pointer', background: 'var(--bg-surface-short)', transition: 'border-color 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{'>'} new path</span>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '4px 0 0' }}>// generate learning path</p>
            </button>
            <button type="button" onClick={() => navigate(ROUTER.GOALS)} style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 12, textAlign: 'left', cursor: 'pointer', background: 'var(--bg-surface-short)', transition: 'border-color 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{'>'} new goal</span>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '4px 0 0' }}>// set learning objective</p>
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default StudentIndex
