import React from 'react'
import useAuthStore from '../../../store/useAuthStore'
import ROUTER from '../../../router/ROUTER'
import { useNavigate } from 'react-router-dom'
import Header from '../../../components/Layout/Header'
import Footer from '../../../components/Layout/Footer'
import { getMyGoals } from '../../../services/GoalService'
import { getUserLearningPaths } from '../../../services/LearningPathService'
import { useTranslation } from 'react-i18next'
import { FileText, Target, BookOpen, GraduationCap, AlertTriangle, ArrowRight } from 'lucide-react'
import useAppNotificationStore from '../../../store/useAppNotificationStore'
import { navigateAndMarkNotificationRead } from '../../../components/Notifications/utils'
import useNotificationStore from '../../../store/useNotificationStore'
import type { NotificationDto } from '../../../types/notification'

const StudentOverview: React.FC = () => {
  const { user } = useAuthStore()
  const displayName = user?.name || user?.username || 'Student'
  const navigate = useNavigate()
  const { t } = useTranslation('student')
  const { t: tc } = useTranslation('common')
  const items = useAppNotificationStore((state) => state.items)
  const panelItems = useAppNotificationStore((state) => state.panelItems)
  const markAsRead = useAppNotificationStore((state) => state.markAsRead)
  const showToast = useNotificationStore((state) => state.showToast)
  const [plansCount, setPlansCount] = React.useState(0)
  const [recentPlans, setRecentPlans] = React.useState<any[]>([])
  const [recentGoals, setRecentGoals] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [stats, setStats] = React.useState({
    totalLessons: 0,
    completedLessons: 0,
    totalChapters: 0,
    activeGoals: 0
  })

  React.useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        const [goals, pathsResponse] = await Promise.all([
          getMyGoals(),
          getUserLearningPaths(user?.id || 'me', { pageNumber: 1, pageSize: 10 })
        ])

        const goalsArray = Array.isArray(goals) ? goals : []
        const plansArray = pathsResponse?.items || []

        setPlansCount(pathsResponse?.totalCount || 0)
        setRecentPlans(plansArray.slice(0, 3))
        setRecentGoals(goalsArray.slice(0, 3))

        let totalLessons = 0
        let totalChapters = 0
        plansArray.forEach((plan: any) => {
          totalChapters += plan.chapterCount || plan.chapters?.length || 0
          if (plan.chapters) {
            plan.chapters.forEach((chapter: any) => {
              totalLessons += chapter.lessons?.length || 0
            })
          }
        })

        const activeGoals = goalsArray.filter((g: any) => g.status !== 'Completed').length

        setStats({ totalLessons, completedLessons: 0, totalChapters, activeGoals })
      } catch (error) {
        // Error handling
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [user?.id])

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const progressPercentage = stats.totalLessons > 0
    ? Math.round((stats.completedLessons / stats.totalLessons) * 100)
    : 0

  const expiringSoonNotification = React.useMemo<NotificationDto | null>(() => {
    const seen = new Set<string>()
    const deduped = [...panelItems, ...items].filter((item) => {
      if (!item.notificationId || seen.has(item.notificationId)) return false
      seen.add(item.notificationId)
      return true
    })

    const matched = deduped
      .filter((item) => String(item.type || '').trim() === 'PlanExpiringSoon')
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())

    return matched[0] ?? null
  }, [items, panelItems])

  const handleSubscriptionNoticeClick = React.useCallback(async () => {
    if (!expiringSoonNotification) return

    try {
      await navigateAndMarkNotificationRead(expiringSoonNotification, navigate, (notificationId) => markAsRead(notificationId))
    } catch (error: any) {
      showToast(error?.message || tc('notifications.markReadError'), 'error')
    }
  }, [expiringSoonNotification, markAsRead, navigate, showToast, tc])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-surface)' }}>
      <Header />
      <main style={{ padding: '16px 0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px' }}>
          {/* Welcome Header */}
          <div style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: '12px 16px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 2, border: '1px solid var(--border-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'var(--bg-main)', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                {getInitials(displayName)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('overview.welcomeBack', { name: displayName })}</h1>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>{t('overview.subtitle')}</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => navigate(ROUTER.PLANS)} style={{ padding: '6px 12px', background: 'var(--text-primary)', color: 'var(--bg-surface-short)', border: '1px solid var(--text-primary)', borderRadius: 2, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  {t('overview.newPlan')}
                </button>
                <button type="button" onClick={() => navigate(ROUTER.MY_RESOURCES)} style={{ padding: '6px 12px', background: 'var(--bg-surface-short)', color: 'var(--text-primary)', border: '1px solid var(--border-base)', borderRadius: 2, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  {t('overview.resources')}
                </button>
              </div>
            </div>
          </div>

          {expiringSoonNotification && (
            <button
              type="button"
              onClick={() => { void handleSubscriptionNoticeClick() }}
              style={{
                width: '100%',
                maxWidth: 760,
                margin: '0 auto 20px',
                display: 'block',
                padding: '18px 22px',
                borderRadius: 8,
                border: '1px solid rgba(245, 158, 11, 0.4)',
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.16), rgba(251, 191, 36, 0.08))',
                textAlign: 'left',
                cursor: 'pointer',
                boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 999,
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(245, 158, 11, 0.18)',
                      color: '#b45309',
                    }}
                  >
                    <AlertTriangle size={20} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#b45309' }}>
                      <span>{t('overview.subscriptionNotice.eyebrow')}</span>
                    </div>
                    <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
                      {expiringSoonNotification.title || t('overview.subscriptionNotice.title')}
                    </h2>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                      {expiringSoonNotification.message || t('overview.subscriptionNotice.description')}
                    </p>
                  </div>
                </div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    flexShrink: 0,
                    padding: '10px 12px',
                    borderRadius: 999,
                    background: 'rgba(255, 255, 255, 0.72)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    color: 'var(--text-primary)',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  <span>{t('overview.subscriptionNotice.action')}</span>
                  <ArrowRight size={14} />
                </div>
              </div>
            </button>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-secondary)', fontSize: 13 }}>{tc('status.loading')}</div>
          ) : (
            <>
              {/* Stats Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
                {[
                  { label: t('overview.stats.plans'), value: plansCount, icon: <FileText size={16} /> },
                  { label: t('overview.stats.goals'), value: stats.activeGoals, icon: <Target size={16} /> },
                  { label: t('overview.stats.chapters'), value: stats.totalChapters, icon: <BookOpen size={16} /> },
                  { label: t('overview.stats.lessons'), value: stats.totalLessons, icon: <GraduationCap size={16} /> },
                ].map((stat) => (
                  <div key={stat.label} style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: '12px 16px', background: 'var(--bg-surface-short)', transition: 'border-color 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 12, color: 'var(--accent-primary)', fontWeight: 600 }}>{stat.icon}</span>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>{stat.label}</p>
                        <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{stat.value}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Progress */}
              <div style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('overview.progress.title')}</h2>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '2px 0 0' }}>{t('overview.progress.subtitle')}</p>
                  </div>
                  <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-primary)' }}>{progressPercentage}%</span>
                </div>
                <div style={{ width: '100%', height: 6, background: 'var(--gray-200)', borderRadius: 1, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'var(--text-primary)', width: `${progressPercentage}%`, transition: 'width 0.5s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
                  <span>{t('overview.progress.completed', { count: stats.completedLessons })}</span>
                  <span>{t('overview.progress.total', { count: stats.totalLessons })}</span>
                </div>
              </div>

              {/* Two Column Layout */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Recent Plans */}
                <div style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('overview.recentPlans.title')}</h2>
                    <button type="button" onClick={() => navigate(ROUTER.MY_PLANS)} style={{ fontSize: 12, color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>{tc('actions.viewAll')}</button>
                  </div>
                  {recentPlans.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {recentPlans.map((plan, idx) => (
                        <button key={plan.pathId || plan.id || idx} type="button" onClick={() => navigate('/my-plans/detail', { state: { pathId: plan.pathId || plan.id } })} style={{ padding: 12, border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-surface-short)', textAlign: 'left', cursor: 'pointer', transition: 'border-color 0.2s', width: '100%' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }}>
                          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{plan.title || t('overview.recentPlans.untitled')}</h3>
                          <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>{t('overview.recentPlans.chapters', { count: plan.chapterCount || plan.chapters?.length || 0 })} {plan.createdAt && `· ${new Date(plan.createdAt).toLocaleDateString()}`}</p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: 32 }}>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>{t('overview.recentPlans.empty')}</p>
                      <button type="button" onClick={() => navigate(ROUTER.PLANS)} style={{ padding: '8px 16px', background: 'var(--text-primary)', color: 'var(--bg-surface-short)', border: 'none', borderRadius: 2, fontSize: 12, cursor: 'pointer' }}>{t('overview.recentPlans.createFirst')}</button>
                    </div>
                  )}
                </div>

                {/* Recent Goals */}
                <div style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('overview.recentGoals.title')}</h2>
                    <button type="button" onClick={() => navigate(ROUTER.GOALS)} style={{ fontSize: 12, color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>{tc('actions.viewAll')}</button>
                  </div>
                  {recentGoals.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {recentGoals.map((goal, idx) => (
                        <button key={goal.id || idx} type="button" onClick={() => navigate(ROUTER.GOALS)} style={{ padding: 12, border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-surface-short)', textAlign: 'left', cursor: 'pointer', transition: 'border-color 0.2s', width: '100%' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{goal.title || goal.name || t('overview.recentGoals.untitled')}</h3>
                            <span style={{ fontSize: 11, padding: '2px 8px', border: '1px solid var(--border-base)', borderRadius: 2, color: goal.status === 'Completed' ? 'var(--success-primary)' : 'var(--text-secondary)', flexShrink: 0, marginLeft: 8 }}>
                              {goal.status === 'Completed' ? tc('status.done') : tc('status.active')}
                            </span>
                          </div>
                          <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>{goal.description || t('overview.recentGoals.noDescription')}</p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: 32 }}>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>{t('overview.recentGoals.empty')}</p>
                      <button type="button" onClick={() => navigate(ROUTER.GOALS)} style={{ padding: '8px 16px', background: 'var(--text-primary)', color: 'var(--bg-surface-short)', border: 'none', borderRadius: 2, fontSize: 12, cursor: 'pointer' }}>{t('overview.recentGoals.setFirst')}</button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default StudentOverview
