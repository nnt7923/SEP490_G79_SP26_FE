import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../../../components/Layout'
import { useStudentSidebarConfig } from '../components/StudentSideBar'
import { GoalService, SubjectService } from '../../../../services'
import ROUTER from '../../../../router/ROUTER.js'
import { useTranslation } from 'react-i18next'
import useNotificationStore from '../../../../store/useNotificationStore'

type DashboardStatusFilter = 'learning' | 'completed' | 'all'
type GoalDuration = 'OneWeek' | 'TwoWeeks' | 'OneMonth' | 'TwoMonths' | 'ThreeMonths' | 'SixMonths'

const GOAL_DURATION_OPTIONS: Array<{ value: GoalDuration; days: number }> = [
  { value: 'OneWeek', days: 7 },
  { value: 'TwoWeeks', days: 14 },
  { value: 'OneMonth', days: 30 },
  { value: 'TwoMonths', days: 60 },
  { value: 'ThreeMonths', days: 90 },
  { value: 'SixMonths', days: 180 },
]

type PersonalGoalItem = {
  goalId: string
  title: string
  description: string | null
  progressPercent: number
  status: 'NotStarted' | 'InProgress' | 'Completed' | string
  lastUpdatedAt?: string | null
}

type PathGoalItem = {
  learningPathId: string
  learningPathTitle: string
  learningPathStatus: string
  subjectName?: string | null
  goalId: string
  goalTitle: string
  isSystemDefined: boolean
  weight?: number | null
  targetPercent?: number | null
  progressPercent?: number | null
  completionPercent?: number | null
  goalStatus?: string | null
  completedAt?: string | null
  lastUpdatedAt?: string | null
}

type PathGoalPage = {
  items: PathGoalItem[]
  pageNumber: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

const DEFAULT_PATH_GOAL_PAGE: PathGoalPage = {
  items: [],
  pageNumber: 1,
  pageSize: 20,
  totalCount: 0,
  totalPages: 1,
  hasPreviousPage: false,
  hasNextPage: false,
}

const getStatusBadgeStyles = (status: string) => {
  const normalized = String(status || '').trim().toLowerCase()

  if (normalized === 'completed') {
    return {
      color: 'var(--success-primary)',
    }
  }

  if (normalized === 'inprogress' || normalized === 'active') {
    return {
      color: 'var(--accent-primary)',
    }
  }

  return {
    color: 'var(--text-primary)',
  }
}

const GoalsPage: React.FC = () => {
  const { t, i18n } = useTranslation('student')
  const navigate = useNavigate()
  const showToast = useNotificationStore((state) => state.showToast)

  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const [searchInput, setSearchInput] = useState<string>('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<DashboardStatusFilter>('learning')

  const [personalGoals, setPersonalGoals] = useState<PersonalGoalItem[]>([])
  const [pathGoalsPage, setPathGoalsPage] = useState<PathGoalPage>(DEFAULT_PATH_GOAL_PAGE)

  const [showAddGoalModal, setShowAddGoalModal] = useState<boolean>(false)
  const [subjectOptions, setSubjectOptions] = useState<Array<{ id: string; name: string }>>([])
  const [loadingSubjects, setLoadingSubjects] = useState<boolean>(false)
  const [createGoalSubjectId, setCreateGoalSubjectId] = useState<string>('')
  const [createGoalTitle, setCreateGoalTitle] = useState<string>('')
  const [createGoalDescription, setCreateGoalDescription] = useState<string>('')
  const [createGoalDuration, setCreateGoalDuration] = useState<GoalDuration>('OneMonth')
  const [creatingGoal, setCreatingGoal] = useState<boolean>(false)
  const [createGoalError, setCreateGoalError] = useState<string | null>(null)

  const [pageNumber, setPageNumber] = useState<number>(1)
  const pageSize = 20

  const sidebarConfig = {
    navItems: useStudentSidebarConfig(),
    actions: [],
    brand: { name: 'Goals', subtitle: 'Learning' },
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchInput.trim())
    }, 400)

    return () => window.clearTimeout(timeoutId)
  }, [searchInput])

  const formatPercent = (value: number | null | undefined): string => {
    const numeric = Number(value ?? 0)
    const safe = Number.isFinite(numeric) ? Math.min(100, Math.max(0, numeric)) : 0
    const locale = i18n.language?.startsWith('vi') ? 'vi-VN' : 'en-US'

    if (safe === 0) {
      return '0'
    }

    const roundedTwoDecimals = Math.round(safe * 100) / 100
    const oneDecimalString = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(roundedTwoDecimals)

    const twoDecimalsString = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(roundedTwoDecimals)

    const decimalSeparator = i18n.language?.startsWith('vi') ? ',' : '.'
    if (twoDecimalsString.endsWith(`${decimalSeparator}00`)) {
      return new Intl.NumberFormat(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(roundedTwoDecimals)
    }

    if (twoDecimalsString.endsWith('0')) {
      return oneDecimalString
    }

    return twoDecimalsString
  }

  const mapStatusLabel = (status: string): string => {
    const normalized = String(status || '').trim().toLowerCase()
    if (normalized === 'notstarted') return t('goals.statusNotStarted')
    if (normalized === 'inprogress' || normalized === 'active') return t('goals.statusInProgress')
    if (normalized === 'completed') return t('goals.statusCompleted')
    return status || t('goals.statusUnknown')
  }

  const loadSubjects = async (): Promise<void> => {
    if (subjectOptions.length > 0) return

    setLoadingSubjects(true)
    try {
      const data = await SubjectService.listSubjects()
      const normalized = (Array.isArray(data) ? data : [])
        .map((subject: any) => ({
          id: String(subject?.id ?? subject?.subjectId ?? '').trim(),
          name: String(subject?.name ?? '').trim(),
        }))
        .filter((subject) => Boolean(subject.id) && Boolean(subject.name))

      setSubjectOptions(normalized)
    } catch (err: any) {
      const d = err?.response?.data
      const msg = d?.errorMessage || d?.message || err?.message || t('goals.loadSubjectsFailed')
      setCreateGoalError(msg)
    } finally {
      setLoadingSubjects(false)
    }
  }

  useEffect(() => {
    if (!showAddGoalModal) return
    void loadSubjects()
  }, [showAddGoalModal])

  const resetCreateGoalForm = () => {
    setCreateGoalSubjectId('')
    setCreateGoalTitle('')
    setCreateGoalDescription('')
    setCreateGoalDuration('OneMonth')
    setCreateGoalError(null)
  }

  const handleOpenAddGoalModal = () => {
    setCreateGoalError(null)
    setShowAddGoalModal(true)
  }

  const handleCloseAddGoalModal = () => {
    setShowAddGoalModal(false)
    resetCreateGoalForm()
  }

  const refreshDashboard = async () => {
    const pathStatus = statusFilter === 'completed' ? 'Completed' : undefined
    const response = await GoalService.getGoalsDashboard({
      pageNumber,
      pageSize,
      searchTerm: debouncedSearchTerm || undefined,
      pathStatus,
      sortDescending: true,
    })

    setPersonalGoals(Array.isArray(response?.personalGoals) ? response.personalGoals : [])
    setPathGoalsPage(response?.pathGoals || DEFAULT_PATH_GOAL_PAGE)
  }

  const handleCreateGoal = async () => {
    const title = createGoalTitle.trim()
    const description = createGoalDescription.trim()

    if (!createGoalSubjectId) {
      setCreateGoalError(t('goals.subjectRequired'))
      return
    }

    if (!title) {
      setCreateGoalError(t('goals.titleRequired'))
      return
    }

    setCreatingGoal(true)
    setCreateGoalError(null)

    try {
      await GoalService.createGoal({
        subjectId: createGoalSubjectId,
        title,
        description,
        duration: createGoalDuration,
      })

      showToast(t('goals.goalCreatedSuccess'), 'success')
      handleCloseAddGoalModal()
      await refreshDashboard()
    } catch (err: any) {
      const statusCode = Number(err?.response?.status)
      const d = err?.response?.data
      const msg = d?.errorMessage || d?.message || err?.message || t('goals.goalCreateFailed')

      if (statusCode === 401) {
        navigate(ROUTER.LOGIN)
        return
      }

      setCreateGoalError(msg)
    } finally {
      setCreatingGoal(false)
    }
  }

  useEffect(() => {
    let active = true

    const loadDashboard = async () => {
      setLoading(true)
      setError(null)

      const pathStatus = statusFilter === 'completed' ? 'Completed' : undefined

      try {
        const response = await GoalService.getGoalsDashboard({
          pageNumber,
          pageSize,
          searchTerm: debouncedSearchTerm || undefined,
          pathStatus,
          sortDescending: true,
        })

        if (!active) return

        setPersonalGoals(Array.isArray(response?.personalGoals) ? response.personalGoals : [])
        setPathGoalsPage(response?.pathGoals || DEFAULT_PATH_GOAL_PAGE)
      } catch (err: any) {
        if (!active) return

        const statusCode = Number(err?.response?.status)
        const d = err?.response?.data
        const msg = d?.errorMessage || d?.message || err?.message || t('goals.loadDashboardFailed')

        if (statusCode === 401) {
          navigate(ROUTER.LOGIN)
          return
        }

        if (statusCode === 400) {
          setError(msg || t('goals.invalidQueryParams'))
          return
        }

        if (statusCode >= 500) {
          showToast(t('goals.systemErrorTryAgain'), 'error')
          setError(t('goals.systemErrorTryAgain'))
          return
        }

        setError(msg)
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadDashboard()

    return () => {
      active = false
    }
  }, [debouncedSearchTerm, navigate, pageNumber, showToast, statusFilter, t])

  const pathGoalRows = useMemo(() => (Array.isArray(pathGoalsPage.items) ? pathGoalsPage.items : []), [pathGoalsPage.items])

  return (
    <Layout sidebar={sidebarConfig}>
      <div style={{ padding: 24, background: 'var(--bg-surface)', minHeight: '100vh' }}>
        <div style={{ marginBottom: 18, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h1 style={{ margin: '0 0 8px', fontSize: 22, color: 'var(--text-primary)', fontWeight: 700 }}>{t('goals.dashboardTitle')}</h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13 }}>{t('goals.dashboardSubtitle')}</p>
          </div>
          <button
            type="button"
            onClick={handleOpenAddGoalModal}
            style={{ padding: '8px 14px', border: '1px solid var(--text-primary)', borderRadius: 2, background: 'var(--text-primary)', color: 'var(--bg-surface-short)', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            + {t('goals.addGoalButton')}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) 220px', gap: 12, marginBottom: 20 }}>
          <input
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value)
              setPageNumber(1)
            }}
            placeholder={t('goals.dashboardSearchPlaceholder')}
            style={{ width: '100%', padding: '10px 12px', fontSize: 13, border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
          />

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as DashboardStatusFilter)
              setPageNumber(1)
            }}
            style={{ width: '100%', padding: '10px 12px', fontSize: 13, border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
          >
            <option value="learning">{t('goals.filterLearning')}</option>
            <option value="completed">{t('goals.filterCompleted')}</option>
            <option value="all">{t('goals.filterAll')}</option>
          </select>
        </div>

        {error && (
          <div style={{ marginBottom: 16, border: '1px solid var(--danger-primary)', borderRadius: 2, padding: '10px 12px', color: 'var(--danger-primary)', background: 'var(--bg-red-tint)', fontSize: 12 }}>
            {error}
          </div>
        )}

        <div style={{ border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-surface-short)', padding: 16, marginBottom: 18 }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 16, color: 'var(--text-primary)', fontWeight: 700 }}>{t('goals.personalGoalsTitle')}</h2>

          {loading ? (
            <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{t('goals.loadingDashboard')}</div>
          ) : personalGoals.length === 0 ? (
            <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{t('goals.emptyPersonalGoals')}</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {personalGoals.map((goal) => {
                const statusStyle = getStatusBadgeStyles(goal.status)
                const percentText = formatPercent(goal.progressPercent)

                return (
                  <article key={goal.goalId} style={{ border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-main)', padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8, marginBottom: 8 }}>
                      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>{goal.title || t('goals.untitled')}</h3>
                      <span style={{ ...statusStyle, borderRadius: 999, fontSize: 10, fontWeight: 700, padding: '2px 8px', whiteSpace: 'nowrap' }}>{mapStatusLabel(goal.status)}</span>
                    </div>

                    <p style={{ margin: '0 0 10px', color: 'var(--text-secondary)', fontSize: 12, minHeight: 32 }}>{goal.description || t('goals.noDescription')}</p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t('goals.progressLabel')}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 700 }}>{percentText}%</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 999, background: 'var(--bg-surface)', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, Math.max(0, Number(goal.progressPercent || 0)))}%`, height: '100%', background: 'var(--accent-primary)' }} />
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>

        <div style={{ border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-surface-short)', padding: 16 }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 16, color: 'var(--text-primary)', fontWeight: 700 }}>{t('goals.pathGoalsTitle')}</h2>

          {loading ? (
            <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{t('goals.loadingDashboard')}</div>
          ) : pathGoalRows.length === 0 ? (
            <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{t('goals.emptyPathGoals')}</div>
          ) : (
            <div style={{ overflowX: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    <th style={{ width: '28%', textAlign: 'left', padding: '10px 8px', fontSize: 11, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-base)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{t('goals.columnGoal')}</th>
                    <th style={{ width: '40%', textAlign: 'left', padding: '10px 8px', fontSize: 11, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-base)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{t('goals.columnPath')}</th>
                    <th style={{ width: '10%', textAlign: 'right', padding: '10px 8px', fontSize: 11, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-base)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{t('goals.columnProgress')}</th>
                    <th style={{ width: '10%', textAlign: 'right', padding: '10px 8px', fontSize: 11, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-base)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{t('goals.columnCompletion')}</th>
                    <th style={{ width: '12%', textAlign: 'left', padding: '10px 8px', fontSize: 11, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-base)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{t('goals.columnStatus')}</th>
                  </tr>
                </thead>
                <tbody>
                  {pathGoalRows.map((item) => {
                    const statusStyle = getStatusBadgeStyles(String(item.goalStatus || item.learningPathStatus || ''))

                    return (
                      <tr key={`${item.learningPathId}-${item.goalId}`}>
                        <td style={{ padding: '10px 8px', borderBottom: '1px solid var(--border-base)', verticalAlign: 'top' }}>
                          <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600, whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{item.goalTitle || t('goals.untitled')}</div>
                          <div style={{ marginTop: 3, fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{item.subjectName || '-'}</div>
                        </td>
                        <td style={{ padding: '10px 8px', borderBottom: '1px solid var(--border-base)', verticalAlign: 'top' }}>
                          <div style={{ fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{item.learningPathTitle || t('goals.pathUntitled')}</div>
                          <div style={{ marginTop: 3, fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{item.learningPathStatus || '-'}</div>
                        </td>
                        <td style={{ padding: '10px 8px', borderBottom: '1px solid var(--border-base)', textAlign: 'right', fontSize: 12, color: 'var(--text-primary)', verticalAlign: 'top', whiteSpace: 'nowrap' }}>{formatPercent(item.progressPercent)}%</td>
                        <td style={{ padding: '10px 8px', borderBottom: '1px solid var(--border-base)', textAlign: 'right', fontSize: 12, color: 'var(--text-primary)', verticalAlign: 'top', whiteSpace: 'nowrap' }}>{formatPercent(item.completionPercent)}%</td>
                        <td style={{ padding: '10px 8px', borderBottom: '1px solid var(--border-base)', verticalAlign: 'top' }}>
                          <span
                            style={{
                              ...statusStyle,
                              fontSize: 12,
                              fontWeight: 700,
                              display: 'inline-block',
                              maxWidth: '100%',
                              whiteSpace: 'normal',
                              overflowWrap: 'anywhere',
                              boxSizing: 'border-box',
                            }}
                          >
                            {mapStatusLabel(String(item.goalStatus || item.learningPathStatus || ''))}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {t('goals.paginationInfo', {
                page: pathGoalsPage.pageNumber || pageNumber,
                totalPages: pathGoalsPage.totalPages || 1,
                totalCount: pathGoalsPage.totalCount || 0,
              })}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setPageNumber((current) => Math.max(1, current - 1))}
                disabled={loading || !pathGoalsPage.hasPreviousPage}
                style={{ padding: '7px 12px', border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: loading || !pathGoalsPage.hasPreviousPage ? 'not-allowed' : 'pointer', opacity: loading || !pathGoalsPage.hasPreviousPage ? 0.6 : 1 }}
              >
                {t('goals.prevPage')}
              </button>
              <button
                type="button"
                onClick={() => setPageNumber((current) => current + 1)}
                disabled={loading || !pathGoalsPage.hasNextPage}
                style={{ padding: '7px 12px', border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: loading || !pathGoalsPage.hasNextPage ? 'not-allowed' : 'pointer', opacity: loading || !pathGoalsPage.hasNextPage ? 0.6 : 1 }}
              >
                {t('goals.nextPage')}
              </button>
            </div>
          </div>
        </div>

        {showAddGoalModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 90, padding: 16 }}>
            <div style={{ width: '100%', maxWidth: 560, background: 'var(--bg-surface-short)', border: '1px solid var(--border-base)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-base)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text-primary)', fontWeight: 700 }}>{t('goals.addGoalModalTitle')}</h3>
                <button
                  type="button"
                  onClick={handleCloseAddGoalModal}
                  disabled={creatingGoal}
                  style={{ border: '1px solid var(--border-base)', background: 'transparent', color: 'var(--text-secondary)', borderRadius: 2, padding: '4px 8px', cursor: creatingGoal ? 'not-allowed' : 'pointer' }}
                >
                  X
                </button>
              </div>

              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {createGoalError && (
                  <div style={{ border: '1px solid var(--danger-primary)', borderRadius: 2, padding: '8px 10px', background: 'var(--bg-red-tint)', color: 'var(--danger-primary)', fontSize: 12 }}>
                    {createGoalError}
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    $ {t('goals.subjectLabel')}
                  </label>
                  <select
                    value={createGoalSubjectId}
                    onChange={(event) => setCreateGoalSubjectId(event.target.value)}
                    disabled={loadingSubjects || creatingGoal}
                    style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none' }}
                  >
                    <option value="">{loadingSubjects ? t('goals.loadingSubjects') : t('goals.subjectPlaceholder')}</option>
                    {subjectOptions.map((subject) => (
                      <option key={subject.id} value={subject.id}>{subject.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    $ {t('goals.titleLabel')} *
                  </label>
                  <input
                    type="text"
                    value={createGoalTitle}
                    onChange={(event) => setCreateGoalTitle(event.target.value)}
                    placeholder={t('goals.titlePlaceholder')}
                    disabled={creatingGoal}
                    style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    $ {t('goals.descriptionLabel')}
                  </label>
                  <textarea
                    value={createGoalDescription}
                    onChange={(event) => setCreateGoalDescription(event.target.value)}
                    placeholder={t('goals.descriptionPlaceholder')}
                    rows={3}
                    disabled={creatingGoal}
                    style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    $ {t('goals.durationLabel')}
                  </label>
                  <select
                    value={createGoalDuration}
                    onChange={(event) => setCreateGoalDuration(event.target.value as GoalDuration)}
                    disabled={creatingGoal}
                    style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none' }}
                  >
                    {GOAL_DURATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {t(`goals.durationOptions.${option.value}`)} ({option.days} {t('goals.dayUnit')})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-base)', display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={handleCloseAddGoalModal}
                  disabled={creatingGoal}
                  style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: creatingGoal ? 'not-allowed' : 'pointer' }}
                >
                  {t('goals.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleCreateGoal}
                  disabled={creatingGoal || loadingSubjects || subjectOptions.length === 0}
                  style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--text-primary)', borderRadius: 2, background: creatingGoal ? 'var(--text-secondary)' : 'var(--text-primary)', color: 'var(--bg-surface-short)', fontSize: 12, fontWeight: 700, cursor: creatingGoal ? 'not-allowed' : 'pointer' }}
                >
                  {creatingGoal ? t('goals.creatingGoal') : t('goals.createGoalButton')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default GoalsPage
