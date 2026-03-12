
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../../../components/Layout'
import { useStudentSidebarConfig } from '../components/StudentSideBar'
import { GoalService } from '../../../../services'
import { useTranslation } from 'react-i18next'

const GoalsPage: React.FC = () => {
  const navigate = useNavigate()
  const [goals, setGoals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGoal, setSelectedGoal] = useState<any | null>(null)
  const { t } = useTranslation('student')
  const { t: tc } = useTranslation('common')



  const sidebarConfig = {
    navItems: useStudentSidebarConfig(),
    actions: [],
    brand: { name: 'Goals', subtitle: 'Learning' },
  }

  useEffect(() => { fetchGoals() }, [])

  const fetchGoals = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await GoalService.getUserGoals()
      setGoals(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || t('goals.loading'))
    } finally {
      setLoading(false)
    }
  }

  const filteredGoals = goals.filter(goal => {
    const q = searchTerm.toLowerCase()
    return (goal?.title || '').toLowerCase().includes(q) || (goal?.description || '').toLowerCase().includes(q)
  })

  return (
    <Layout sidebar={sidebarConfig}>
      <div style={{ padding: 24, background: 'var(--bg-surface)', minHeight: '100vh' }}>
        {/* Search */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ position: 'relative' }}>
            <input
              placeholder={t('goals.searchPlaceholder')} value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 12px', fontSize: 13, border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' as const }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }}
            />
          </div>
        </div>

        {/* Main Content */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          {/* Goals List */}
          <div>
            {loading ? (
              <div style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 48, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>{t('goals.loading')}</div>
            ) : error ? (
              <div style={{ border: '1px solid var(--danger-primary)', borderRadius: 2, padding: 16, color: 'var(--danger-primary)', fontSize: 13 }}>ERROR: {error}</div>
            ) : filteredGoals.length === 0 ? (
              <div style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 48, textAlign: 'center' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{t('goals.noGoalsFound')}</p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{searchTerm ? t('goals.noGoalsMatch') : t('goals.startCreating')}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredGoals.map((goal) => {
                  const isSelected = selectedGoal?.goalId === goal.goalId || selectedGoal?.id === goal.id
                  return (
                    <div
                      key={goal.goalId || goal.id}
                      onClick={() => setSelectedGoal(goal)}
                      style={{
                        border: isSelected ? '2px solid var(--accent-primary)' : '1px solid var(--border-base)',
                        borderRadius: 2, padding: 16, cursor: 'pointer', transition: 'border-color 0.2s', background: isSelected ? 'var(--bg-blue-hover)' : 'var(--bg-surface-short)',
                      }}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--accent-primary)' }}
                      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.borderColor = 'var(--border-base)' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>{goal.title || t('goals.untitled')}</h3>
                          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{goal.description || t('goals.noDescription')}</p>
                          <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--gray-400)' }}>
                            <span>{t('goals.days', { count: goal.durationDays || 0 })}</span>
                            <span>{goal.isCompleted ? tc('status.done') : tc('status.active')}</span>
                            {goal.createdAt && <span>{new Date(goal.createdAt).toLocaleDateString()}</span>}
                          </div>
                        </div>
                        <span style={{ fontSize: 14, color: 'var(--text-secondary)', flexShrink: 0, marginLeft: 12 }}>→</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Goal Details Panel */}
          <div>
            {selectedGoal ? (
              <div style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 20, position: 'sticky', top: 24 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px' }}>{selectedGoal.title || t('goals.goalDetails')}</h2>

                <div style={{ marginBottom: 16 }}>
                  <h3 style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{t('goals.description')}</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: 0 }}>{selectedGoal.description || t('goals.noDescAvailable')}</p>
                </div>

                <div style={{ paddingTop: 16, borderTop: '1px solid var(--border-base)', marginBottom: 16 }}>
                  <h3 style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{t('goals.statusLabel')}</h3>
                  <span style={{ fontSize: 12, padding: '4px 10px', border: '1px solid var(--border-base)', borderRadius: 2, color: selectedGoal.isCompleted ? 'var(--success-primary)' : 'var(--text-secondary)' }}>
                    {selectedGoal.isCompleted ? tc('status.completed') : tc('status.inProgress')}
                  </span>
                </div>

                {selectedGoal.createdAt && (
                  <div style={{ paddingTop: 16, borderTop: '1px solid var(--border-base)', marginBottom: 16 }}>
                    <h3 style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{t('goals.createdLabel')}</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: 0 }}>{new Date(selectedGoal.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                )}

                {selectedGoal.completedAt && (
                  <div style={{ paddingTop: 16, borderTop: '1px solid var(--border-base)', marginBottom: 16 }}>
                    <h3 style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{t('goals.completedLabel')}</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: 0 }}>{new Date(selectedGoal.completedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => navigate(`/goals/${selectedGoal.goalId || selectedGoal.id}`)}
                  style={{ width: '100%', marginTop: 8, padding: '8px 16px', background: 'var(--text-primary)', color: 'var(--bg-surface-short)', border: '1px solid var(--text-primary)', borderRadius: 2, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--text-strong)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--text-primary)' }}
                >
                  {tc('actions.viewDetails')}
                </button>
              </div>
            ) : (
              <div style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 24, textAlign: 'center', position: 'sticky', top: 24 }}>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{t('goals.selectGoal')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default GoalsPage
