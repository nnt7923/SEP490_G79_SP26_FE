import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../../../components/Layout'
import { useStudentSidebarConfig } from '../components/StudentSideBar'
import { GoalService, SubjectService } from '../../../../services'
import ROUTER from '../../../../router/ROUTER.js'
import { useTranslation } from 'react-i18next'
import useNotificationStore from '../../../../store/useNotificationStore'
import { requestGoalSupplementLearningPath } from '../../../../services/SignalR'

type DashboardPathStatusFilter = 'All' | 'Active' | 'InProgress' | 'Completed' | 'Draft' | 'Cancelled'
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
  subjectId?: string
  title: string
  description: string | null
  duration?: string | null
  durationDays?: number | null
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

const POLL_INTERVAL_MS = 20000

const GOAL_DURATION_VALUES: GoalDuration[] = GOAL_DURATION_OPTIONS.map((item) => item.value)

const mapDurationDaysToEnum = (durationDays: unknown): GoalDuration => {
  const days = Number(durationDays)
  if (!Number.isFinite(days) || days <= 0) return 'OneMonth'

  const matched = GOAL_DURATION_OPTIONS.find((option) => option.days === days)
  if (matched) return matched.value

  const closest = GOAL_DURATION_OPTIONS.reduce((best, current) => {
    const bestDistance = Math.abs(best.days - days)
    const currentDistance = Math.abs(current.days - days)
    return currentDistance < bestDistance ? current : best
  }, GOAL_DURATION_OPTIONS[0])

  return closest.value
}

const mapGoalDurationValue = (goal: any): GoalDuration => {
  const rawDuration = String(goal?.duration ?? '').trim() as GoalDuration
  if (GOAL_DURATION_VALUES.includes(rawDuration)) return rawDuration
  return mapDurationDaysToEnum(goal?.durationDays)
}

const normalizePercentValue = (value: unknown): number => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return Math.max(0, Math.min(100, numeric))
}

const normalizeWeightPercent = (weight: unknown): number => {
  const numeric = Number(weight)
  if (!Number.isFinite(numeric)) return 0
  const asPercent = numeric <= 1 ? numeric * 100 : numeric
  return Math.max(0, Math.min(100, asPercent))
}

const GoalsPage: React.FC = () => {
  const { t, i18n } = useTranslation('student')
  const navigate = useNavigate()
  const showToast = useNotificationStore((state) => state.showToast)

  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const [searchInput, setSearchInput] = useState<string>('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<DashboardPathStatusFilter>('All')

  const [personalGoals, setPersonalGoals] = useState<PersonalGoalItem[]>([])
  const [personalGoalsTotal, setPersonalGoalsTotal] = useState(0)
  const [personalGoalsTotalPages, setPersonalGoalsTotalPages] = useState(1)
  const [personalGoalsHasNext, setPersonalGoalsHasNext] = useState(false)
  const [personalGoalsHasPrev, setPersonalGoalsHasPrev] = useState(false)
  const [personalGoalsPage, setPersonalGoalsPage] = useState(1)
  const personalGoalsPageSize = 6
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

  const [showEditGoalModal, setShowEditGoalModal] = useState<boolean>(false)
  const [editingGoalId, setEditingGoalId] = useState<string>('')
  const [editGoalSubjectId, setEditGoalSubjectId] = useState<string>('')
  const [editGoalTitle, setEditGoalTitle] = useState<string>('')
  const [editGoalDescription, setEditGoalDescription] = useState<string>('')
  const [editGoalDuration, setEditGoalDuration] = useState<GoalDuration>('OneMonth')
  const [editGoalError, setEditGoalError] = useState<string | null>(null)
  const [updatingGoal, setUpdatingGoal] = useState<boolean>(false)

  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null)
  const [deleteGoalTarget, setDeleteGoalTarget] = useState<{ goalId: string; title: string } | null>(null)

  const [pageNumber, setPageNumber] = useState<number>(1)
  const pageSize = 20

  const [showCompensatoryModal, setShowCompensatoryModal] = useState<{ pathId: string; goalId: string } | null>(null)
  const [generatingCompensatory, setGeneratingCompensatory] = useState<boolean>(false)
  const [supplementaryLanguage, setSupplementaryLanguage] = useState<number>(1) // 1=Vietnamese, 2=English
  const [supplementaryLevel, setSupplementaryLevel] = useState<string>('Beginner')

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

  const mapPersonalStatusLabel = (status: string): string => {
    const normalized = String(status || '').trim().toLowerCase()
    if (normalized === 'notstarted') return t('goals.statusNotStarted')
    if (normalized === 'inprogress' || normalized === 'active') return t('goals.statusInProgress')
    if (normalized === 'completed') return t('goals.statusCompleted')
    return status || t('goals.statusUnknown')
  }

  const mapPathStatusLabel = (status: string): string => {
    const normalized = String(status || '').trim().toLowerCase()
    if (normalized === 'active') return t('goals.pathStatusActive')
    if (normalized === 'inprogress') return t('goals.pathStatusInProgress')
    if (normalized === 'completed') return t('goals.pathStatusCompleted')
    if (normalized === 'draft') return t('goals.pathStatusDraft')
    if (normalized === 'cancelled') return t('goals.pathStatusCancelled')
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

  const resetEditGoalForm = () => {
    setEditingGoalId('')
    setEditGoalSubjectId('')
    setEditGoalTitle('')
    setEditGoalDescription('')
    setEditGoalDuration('OneMonth')
    setEditGoalError(null)
  }

  const closeEditGoalModal = () => {
    setShowEditGoalModal(false)
    resetEditGoalForm()
  }

  const extractErrorCode = (err: any): string => {
    const raw = err?.response?.data?.errorCode ?? err?.response?.data?.code
    return String(raw || '').trim().toUpperCase()
  }

  const extractErrorMessage = (err: any, fallback: string): string => {
    const data = err?.response?.data
    return data?.errorMessage || data?.message || err?.message || fallback
  }

  const refreshDashboard = useCallback(async (showLoadingState = true): Promise<void> => {
    if (showLoadingState) {
      setLoading(true)
    }
    setError(null)

    try {
      const [dashboardResponse, personalGoalsResponse] = await Promise.all([
        GoalService.getGoalsDashboard({
          pageNumber,
          pageSize,
          searchTerm: debouncedSearchTerm || undefined,
          pathStatus: statusFilter === 'All' ? undefined : statusFilter,
          sortDescending: true,
        }),
        GoalService.getMyGoals({
          pageNumber: personalGoalsPage,
          pageSize: personalGoalsPageSize,
          searchTerm: debouncedSearchTerm || undefined,
        }),
      ])

      setPersonalGoals(personalGoalsResponse.items.map((g: any) => ({
        goalId: g.goalId,
        subjectId: g.subjectId ?? g.subjects?.[0]?.subjectId ?? '',
        title: g.title,
        description: g.description,
        duration: g.duration,
        durationDays: g.durationDays,
        progressPercent: Number(g.progressPercentage ?? g.progressPercent ?? 0),
        status: g.status ?? 'NotStarted',
        lastUpdatedAt: g.lastUpdatedAt ?? null,
      })))
      setPersonalGoalsTotal(personalGoalsResponse.totalCount)
      setPersonalGoalsTotalPages(personalGoalsResponse.totalPages)
      setPersonalGoalsHasNext(personalGoalsResponse.hasNextPage)
      setPersonalGoalsHasPrev(personalGoalsResponse.hasPreviousPage)

      setPathGoalsPage(dashboardResponse?.pathGoals || DEFAULT_PATH_GOAL_PAGE)
    } catch (err: any) {
      const statusCode = Number(err?.response?.status)
      const msg = extractErrorMessage(err, t('goals.loadDashboardFailed'))

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
      if (showLoadingState) {
        setLoading(false)
      }
    }
  }, [debouncedSearchTerm, navigate, pageNumber, personalGoalsPage, showToast, statusFilter, t])

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
    void refreshDashboard(true)
  }, [refreshDashboard])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      void refreshDashboard(false)
    }, POLL_INTERVAL_MS)

    return () => window.clearInterval(intervalId)
  }, [refreshDashboard])

  const handleOpenEditGoalModal = async (goalId: string) => {
    setEditGoalError(null)
    setUpdatingGoal(false)

    try {
      // Fetch goal detail directly to get subjectId
      let selectedGoal: any = null
      try {
        selectedGoal = await GoalService.getGoalById(goalId)
      } catch (fetchErr: any) {
        console.warn('[Goals] getGoalById failed, trying getUserGoals fallback', fetchErr?.response?.status)
        // Fallback to list
        try {
          const myGoals = await GoalService.getUserGoals()
          selectedGoal = (Array.isArray(myGoals) ? myGoals : []).find((goal: any) => String(goal?.goalId || goal?.id || '') === goalId)
        } catch {
          // ignore
        }
      }

      if (!selectedGoal) {
        setEditGoalError(t('goals.goalLoadForEditFailed'))
        setShowEditGoalModal(true) // show modal with error
        return
      }

      const subjectId = String(
        selectedGoal?.subjects?.[0]?.subjectId
        ?? selectedGoal?.subjectId
        ?? selectedGoal?.SubjectId
        ?? ''
      ).trim()

      setEditingGoalId(goalId)
      setEditGoalSubjectId(subjectId)
      setEditGoalTitle(String(selectedGoal?.title || '').trim())
      setEditGoalDescription(String(selectedGoal?.description || '').trim())
      setEditGoalDuration(mapGoalDurationValue(selectedGoal))
      setShowEditGoalModal(true)
      await loadSubjects()
    } catch (err: any) {
      setEditGoalError(extractErrorMessage(err, t('goals.goalLoadForEditFailed')))
      setShowEditGoalModal(true)
    }
  }

  const handleUpdateGoal = async () => {
    const title = editGoalTitle.trim()
    const description = editGoalDescription.trim()

    if (!editGoalSubjectId) {
      setEditGoalError(t('goals.subjectRequired'))
      return
    }

    if (!title) {
      setEditGoalError(t('goals.titleRequired'))
      return
    }

    setUpdatingGoal(true)
    setEditGoalError(null)

    try {
      await GoalService.updateGoal(editingGoalId, {
        subjectId: editGoalSubjectId,
        title,
        description,
        duration: editGoalDuration,
      })

      showToast(t('goals.goalUpdatedSuccess'), 'success')
      closeEditGoalModal()
      await refreshDashboard(false)
    } catch (err: any) {
      const code = extractErrorCode(err)
      if (code === 'GOAL_IN_USE') {
        showToast(t('goals.goalInUseError'), 'error')
        return
      }

      setEditGoalError(extractErrorMessage(err, t('goals.goalUpdateFailed')))
    } finally {
      setUpdatingGoal(false)
    }
  }

  const handleAskDeleteGoal = (goalId: string, title: string) => {
    setDeleteGoalTarget({ goalId, title })
  }

  const handleDeleteGoal = async () => {
    if (!deleteGoalTarget?.goalId) return

    setDeletingGoalId(deleteGoalTarget.goalId)
    try {
      await GoalService.deleteGoal(deleteGoalTarget.goalId)
      showToast(t('goals.goalDeletedSuccess'), 'success')
      setDeleteGoalTarget(null)
      await refreshDashboard(false)
    } catch (err: any) {
      const code = extractErrorCode(err)
      if (code === 'GOAL_IN_USE') {
        showToast(t('goals.goalInUseError'), 'error')
      } else {
        showToast(extractErrorMessage(err, t('goals.goalDeleteFailed')), 'error')
      }
    } finally {
      setDeletingGoalId(null)
    }
  }

  const pathGoalRows = useMemo(() => (Array.isArray(pathGoalsPage.items) ? pathGoalsPage.items : []), [pathGoalsPage.items])

  // Group path goals by learningPathId to determine compensatory generation eligibility
  const pathGoalsByPath = useMemo(() => {
    const map = new Map<string, PathGoalItem[]>()
    for (const item of pathGoalRows) {
      const existing = map.get(item.learningPathId) ?? []
      existing.push(item)
      map.set(item.learningPathId, existing)
    }
    return map
  }, [pathGoalRows])

  // A path is eligible for supplementary generation if:
  // 1. It has more than 1 goal
  // 2. All goals in that path have goalStatus = 'completed'
  const eligibleCompensatoryPaths = useMemo(() => {
    const result: Array<{ learningPathId: string; learningPathTitle: string; subjectName: string | null | undefined; goals: PathGoalItem[] }> = []
    for (const [pathId, goals] of pathGoalsByPath.entries()) {
      if (goals.length <= 1) continue
      const allGoalsCompleted = goals.every((g) => {
        const status = String(g.goalStatus || '').trim().toLowerCase()
        return status === 'completed'
      })
      if (!allGoalsCompleted) continue
      result.push({
        learningPathId: pathId,
        learningPathTitle: goals[0]?.learningPathTitle ?? '',
        subjectName: goals[0]?.subjectName,
        goals,
      })
    }
    return result
  }, [pathGoalsByPath])

  const handleGenerateCompensatory = async (pathId: string, goalId: string) => {
    setGeneratingCompensatory(true)
    try {
      const result = await requestGoalSupplementLearningPath(pathId, goalId, {
        complexityLevel: supplementaryLevel,
        languageSelection: supplementaryLanguage,
        saveAsDraft: false,
        onStarted: () => {
          showToast(t('goals.compensatoryGenStarted'), 'success')
        },
      })
      showToast(t('goals.compensatoryGenSuccess'), 'success')
      setShowCompensatoryModal(null)
      if (result.pathId) {
        navigate('/my-plans/detail', { state: { pathId: result.pathId } })
      } else {
        await refreshDashboard(false)
      }
    } catch (err: any) {
      showToast(err?.message || t('goals.compensatoryGenFailed'), 'error')
    } finally {
      setGeneratingCompensatory(false)
    }
  }

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
              setStatusFilter(event.target.value as DashboardPathStatusFilter)
              setPageNumber(1)
            }}
            style={{ width: '100%', padding: '10px 12px', fontSize: 13, border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
          >
            <option value="All">{t('goals.filterAll')}</option>
            <option value="Active">{t('goals.filterActive')}</option>
            <option value="InProgress">{t('goals.filterInProgress')}</option>
            <option value="Completed">{t('goals.filterCompleted')}</option>
            <option value="Draft">{t('goals.filterDraft')}</option>
            <option value="Cancelled">{t('goals.filterCancelled')}</option>
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
                      <span style={{ ...statusStyle, borderRadius: 999, fontSize: 10, fontWeight: 700, padding: '2px 8px', whiteSpace: 'nowrap' }}>{mapPersonalStatusLabel(goal.status)}</span>
                    </div>

                    <p style={{ margin: '0 0 10px', color: 'var(--text-secondary)', fontSize: 12, minHeight: 32 }}>{goal.description || t('goals.noDescription')}</p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t('goals.progressLabel')}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 700 }}>{percentText}%</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 999, background: 'var(--bg-surface)', overflow: 'hidden' }}>
                      <div style={{ width: `${normalizePercentValue(goal.progressPercent)}%`, height: '100%', background: 'var(--accent-primary)' }} />
                    </div>

                    <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEditGoalModal(goal.goalId)}
                          style={{ padding: '5px 9px', border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-surface-short)', color: 'var(--text-primary)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                        >
                          {t('goals.editButton')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAskDeleteGoal(goal.goalId, goal.title || t('goals.untitled'))}
                          style={{ padding: '5px 9px', border: '1px solid var(--danger-primary)', borderRadius: 2, background: 'transparent', color: 'var(--danger-primary)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                        >
                          {t('goals.deleteButton')}
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          {/* Personal goals pagination */}
          {!loading && personalGoalsTotal > 0 && (
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {t('goals.paginationInfo', {
                  page: personalGoalsPage,
                  totalPages: personalGoalsTotalPages,
                  totalCount: personalGoalsTotal,
                })}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setPersonalGoalsPage((p) => Math.max(1, p - 1))}
                  disabled={loading || !personalGoalsHasPrev}
                  style={{ padding: '7px 12px', border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: loading || !personalGoalsHasPrev ? 'not-allowed' : 'pointer', opacity: loading || !personalGoalsHasPrev ? 0.6 : 1 }}
                >
                  {t('goals.prevPage')}
                </button>
                <button
                  type="button"
                  onClick={() => setPersonalGoalsPage((p) => p + 1)}
                  disabled={loading || !personalGoalsHasNext}
                  style={{ padding: '7px 12px', border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: loading || !personalGoalsHasNext ? 'not-allowed' : 'pointer', opacity: loading || !personalGoalsHasNext ? 0.6 : 1 }}
                >
                  {t('goals.nextPage')}
                </button>
              </div>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Array.from(pathGoalsByPath.entries()).map(([pathId, goalsInPath]) => {
                const firstGoal = goalsInPath[0]
                const pathEligible = eligibleCompensatoryPaths.some((p) => p.learningPathId === pathId)
                const pathHasMultipleGoals = goalsInPath.length > 1
                const pathStatusText = mapPathStatusLabel(firstGoal?.learningPathStatus ?? '')

                return (
                  <article key={pathId} style={{ border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-main)', padding: 12 }}>
                    {/* Path header */}
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', overflowWrap: 'anywhere' }}>
                        {firstGoal?.learningPathTitle || t('goals.pathUntitled')}
                      </div>
                      <div style={{ marginTop: 3, fontSize: 11, color: 'var(--text-secondary)' }}>
                        {firstGoal?.subjectName || '-'} &nbsp;·&nbsp;
                        {t('goals.pathStatusLabel')}: <span style={{ color: getStatusBadgeStyles(firstGoal?.learningPathStatus ?? '').color, fontWeight: 700 }}>{pathStatusText}</span>
                      </div>
                    </div>

                    {/* Goals list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {goalsInPath.map((item) => {
                        const goalStatusText = mapPersonalStatusLabel(String(item.goalStatus || ''))
                        const progress = normalizePercentValue(item.progressPercent)
                        const target = normalizePercentValue(item.targetPercent)
                        const weight = normalizeWeightPercent(item.weight)
                        const goalMet = progress >= target

                        return (
                          <div key={item.goalId} style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: '10px 12px', background: 'var(--bg-surface-short)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                                {item.goalTitle || t('goals.untitled')}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                {pathHasMultipleGoals && (
                                  <button
                                    type="button"
                                    onClick={() => setShowCompensatoryModal({ pathId, goalId: item.goalId })}
                                    disabled={!pathEligible}
                                    title={!pathEligible ? t('goals.compensatoryBtnDisabledHint') : undefined}
                                    style={{
                                      padding: '3px 9px',
                                      border: `1px solid ${pathEligible ? 'var(--accent-primary)' : 'var(--border-base)'}`,
                                      borderRadius: 2,
                                      background: pathEligible ? 'var(--accent-primary)' : 'transparent',
                                      color: pathEligible ? 'var(--bg-surface-short)' : 'var(--text-secondary)',
                                      fontSize: 11,
                                      fontWeight: 700,
                                      cursor: pathEligible ? 'pointer' : 'not-allowed',
                                      opacity: pathEligible ? 1 : 0.5,
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {t('goals.supplementaryGenButton')}
                                  </button>
                                )}
                              </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 6 }}>
                              <div style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: '6px 8px' }}>
                                <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{t('goals.weightLabel')}</div>
                                <div style={{ marginTop: 3, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{formatPercent(weight)}%</div>
                              </div>
                              <div style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: '6px 8px' }}>
                                <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{t('goals.targetPercentLabel')}</div>
                                <div style={{ marginTop: 3, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{formatPercent(target)}%</div>
                              </div>
                              <div style={{ border: `1px solid ${goalMet ? 'var(--success-primary)' : 'var(--border-base)'}`, borderRadius: 2, padding: '6px 8px' }}>
                                <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{t('goals.progressPercentLabel')}</div>
                                <div style={{ marginTop: 3, fontSize: 13, fontWeight: 700, color: goalMet ? 'var(--success-primary)' : 'var(--text-primary)' }}>{formatPercent(progress)}%</div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </article>
                )
              })}
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

        {showEditGoalModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 91, padding: 16 }}>
            <div style={{ width: '100%', maxWidth: 560, background: 'var(--bg-surface-short)', border: '1px solid var(--border-base)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-base)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text-primary)', fontWeight: 700 }}>{t('goals.editGoalModalTitle')}</h3>
                <button
                  type="button"
                  onClick={closeEditGoalModal}
                  disabled={updatingGoal}
                  style={{ border: '1px solid var(--border-base)', background: 'transparent', color: 'var(--text-secondary)', borderRadius: 2, padding: '4px 8px', cursor: updatingGoal ? 'not-allowed' : 'pointer' }}
                >
                  X
                </button>
              </div>

              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {editGoalError && (
                  <div style={{ border: '1px solid var(--danger-primary)', borderRadius: 2, padding: '8px 10px', background: 'var(--bg-red-tint)', color: 'var(--danger-primary)', fontSize: 12 }}>
                    {editGoalError}
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    $ {t('goals.subjectLabel')}
                  </label>
                  <select
                    value={editGoalSubjectId}
                    onChange={(event) => setEditGoalSubjectId(event.target.value)}
                    disabled={loadingSubjects || updatingGoal}
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
                    value={editGoalTitle}
                    onChange={(event) => setEditGoalTitle(event.target.value)}
                    placeholder={t('goals.titlePlaceholder')}
                    disabled={updatingGoal}
                    style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    $ {t('goals.descriptionLabel')}
                  </label>
                  <textarea
                    value={editGoalDescription}
                    onChange={(event) => setEditGoalDescription(event.target.value)}
                    placeholder={t('goals.descriptionPlaceholder')}
                    rows={3}
                    disabled={updatingGoal}
                    style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    $ {t('goals.durationLabel')}
                  </label>
                  <select
                    value={editGoalDuration}
                    onChange={(event) => setEditGoalDuration(event.target.value as GoalDuration)}
                    disabled={updatingGoal}
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
                  onClick={closeEditGoalModal}
                  disabled={updatingGoal}
                  style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: updatingGoal ? 'not-allowed' : 'pointer' }}
                >
                  {t('goals.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleUpdateGoal}
                  disabled={updatingGoal || loadingSubjects || !editingGoalId}
                  style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--text-primary)', borderRadius: 2, background: updatingGoal ? 'var(--text-secondary)' : 'var(--text-primary)', color: 'var(--bg-surface-short)', fontSize: 12, fontWeight: 700, cursor: updatingGoal ? 'not-allowed' : 'pointer' }}
                >
                  {updatingGoal ? t('goals.updatingGoal') : t('goals.updateGoalButton')}
                </button>
              </div>
            </div>
          </div>
        )}

        {deleteGoalTarget && (
          <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 92, padding: 16 }}>
            <div style={{ width: '100%', maxWidth: 480, background: 'var(--bg-surface-short)', border: '1px solid var(--border-base)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-base)' }}>
                <h3 style={{ margin: '0 0 6px', fontSize: 16, color: 'var(--text-primary)', fontWeight: 700 }}>{t('goals.deleteConfirmTitle')}</h3>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                  {t('goals.deleteConfirmMessage', { title: deleteGoalTarget.title || t('goals.untitled') })}
                </p>
              </div>
              <div style={{ padding: '14px 20px', display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setDeleteGoalTarget(null)}
                  disabled={Boolean(deletingGoalId)}
                  style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: deletingGoalId ? 'not-allowed' : 'pointer' }}
                >
                  {t('goals.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteGoal}
                  disabled={Boolean(deletingGoalId)}
                  style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--danger-primary)', borderRadius: 2, background: deletingGoalId ? 'var(--text-secondary)' : 'var(--danger-primary)', color: 'var(--bg-surface-short)', fontSize: 12, fontWeight: 700, cursor: deletingGoalId ? 'not-allowed' : 'pointer' }}
                >
                  {deletingGoalId ? t('goals.deletingGoal') : t('goals.deleteButton')}
                </button>
              </div>
            </div>
          </div>
        )}

        {showCompensatoryModal && (() => {
          const { pathId, goalId } = showCompensatoryModal
          const goalsInPath = pathGoalsByPath.get(pathId) ?? []
          const goal = goalsInPath.find((g) => g.goalId === goalId)
          const firstGoal = goalsInPath[0]
          return (
            <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 93, padding: 16 }}>
              <div style={{ width: '100%', maxWidth: 520, background: 'var(--bg-surface-short)', border: '1px solid var(--border-base)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-base)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text-primary)', fontWeight: 700 }}>{t('goals.compensatoryModalTitle')}</h3>
                  <button
                    type="button"
                    onClick={() => setShowCompensatoryModal(null)}
                    disabled={generatingCompensatory}
                    style={{ border: '1px solid var(--border-base)', background: 'transparent', color: 'var(--text-secondary)', borderRadius: 2, padding: '4px 8px', cursor: generatingCompensatory ? 'not-allowed' : 'pointer' }}
                  >
                    X
                  </button>
                </div>

                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Goal info */}
                  <div style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: '10px 12px', background: 'var(--bg-main)' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {t('goals.supplementaryModalInfo', {
                        goalTitle: goal?.goalTitle || t('goals.untitled'),
                        subject: firstGoal?.subjectName || t('goals.pathUntitled'),
                      })}
                    </div>
                  </div>

                  {/* Language */}
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {t('goals.supplementaryLanguageLabel')}
                    </label>
                    <select
                      value={supplementaryLanguage}
                      onChange={(e) => setSupplementaryLanguage(Number(e.target.value))}
                      disabled={generatingCompensatory}
                      style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none' }}
                    >
                      <option value={1}>{t('plans.languageVietnamese')}</option>
                      <option value={2}>{t('plans.languageEnglish')}</option>
                    </select>
                  </div>

                  {/* Level */}
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {t('goals.supplementaryLevelLabel')}
                    </label>
                    <select
                      value={supplementaryLevel}
                      onChange={(e) => setSupplementaryLevel(e.target.value)}
                      disabled={generatingCompensatory}
                      style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none' }}
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </div>
                </div>

                <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-base)', display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setShowCompensatoryModal(null)}
                    disabled={generatingCompensatory}
                    style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: generatingCompensatory ? 'not-allowed' : 'pointer' }}
                  >
                    {t('goals.cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGenerateCompensatory(pathId, goalId)}
                    disabled={generatingCompensatory}
                    style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--accent-primary)', borderRadius: 2, background: generatingCompensatory ? 'var(--text-secondary)' : 'var(--accent-primary)', color: 'var(--bg-surface-short)', fontSize: 12, fontWeight: 700, cursor: generatingCompensatory ? 'not-allowed' : 'pointer' }}
                  >
                    {generatingCompensatory ? t('goals.compensatoryGenerating') : t('goals.compensatoryConfirmButton')}
                  </button>
                </div>
              </div>
            </div>
          )
        })()}
      </div>
    </Layout>
  )
}

export default GoalsPage
