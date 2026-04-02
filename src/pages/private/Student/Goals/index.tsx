
import React, { useEffect, useState } from 'react'
import Layout from '../../../../components/Layout'
import { useStudentSidebarConfig } from '../components/StudentSideBar'
import { GoalService, SubjectService } from '../../../../services'
import { useTranslation } from 'react-i18next'

type GoalDuration = 'OneWeek' | 'TwoWeeks' | 'OneMonth' | 'TwoMonths' | 'ThreeMonths' | 'SixMonths'

const GOAL_DURATION_OPTIONS: Array<{ value: GoalDuration; days: number }> = [
  { value: 'OneWeek', days: 7 },
  { value: 'TwoWeeks', days: 14 },
  { value: 'OneMonth', days: 30 },
  { value: 'TwoMonths', days: 60 },
  { value: 'ThreeMonths', days: 90 },
  { value: 'SixMonths', days: 180 },
]

const GOAL_DURATION_BY_DAYS: Record<number, GoalDuration> = {
  7: 'OneWeek',
  14: 'TwoWeeks',
  30: 'OneMonth',
  60: 'TwoMonths',
  90: 'ThreeMonths',
  180: 'SixMonths',
}

const GoalsPage: React.FC = () => {
  const [goals, setGoals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGoal, setSelectedGoal] = useState<any | null>(null)
  const [showAddGoalModal, setShowAddGoalModal] = useState(false)
  const [subjectOptions, setSubjectOptions] = useState<Array<{ id: string; name: string }>>([])
  const [subjectCatalog, setSubjectCatalog] = useState<any[]>([])
  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [createGoalSubjectId, setCreateGoalSubjectId] = useState('')
  const [createGoalTitle, setCreateGoalTitle] = useState('')
  const [createGoalDescription, setCreateGoalDescription] = useState('')
  const [createGoalDuration, setCreateGoalDuration] = useState<GoalDuration>('OneMonth')
  const [creatingGoal, setCreatingGoal] = useState(false)
  const [createGoalError, setCreateGoalError] = useState<string | null>(null)
  const [createGoalSuccess, setCreateGoalSuccess] = useState<string | null>(null)
  const [showEditGoalModal, setShowEditGoalModal] = useState(false)
  const [editingGoalId, setEditingGoalId] = useState('')
  const [editGoalSubjectId, setEditGoalSubjectId] = useState('')
  const [editGoalTitle, setEditGoalTitle] = useState('')
  const [editGoalDescription, setEditGoalDescription] = useState('')
  const [editGoalDuration, setEditGoalDuration] = useState<GoalDuration>('OneMonth')
  const [updatingGoal, setUpdatingGoal] = useState(false)
  const [updateGoalError, setUpdateGoalError] = useState<string | null>(null)
  const [showDeleteGoalConfirm, setShowDeleteGoalConfirm] = useState(false)
  const [deletingGoal, setDeletingGoal] = useState(false)
  const [deleteGoalError, setDeleteGoalError] = useState<string | null>(null)
  const { t } = useTranslation('student')



  const sidebarConfig = {
    navItems: useStudentSidebarConfig(),
    actions: [],
    brand: { name: 'Goals', subtitle: 'Learning' },
  }

  useEffect(() => { fetchGoals() }, [])

  useEffect(() => {
    if (showAddGoalModal) {
      loadSubjects()
    }
  }, [showAddGoalModal])

  const fetchGoals = async (): Promise<any[]> => {
    setLoading(true)
    setError(null)
    try {
      const data = await GoalService.getUserGoals()
      const normalized = Array.isArray(data) ? data : []
      setGoals(normalized)
      return normalized
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || t('goals.loading'))
      return []
    } finally {
      setLoading(false)
    }
  }

  const getGoalId = (goal: any): string => String(goal?.goalId ?? goal?.id ?? '')

  const getGoalDuration = (goal: any): GoalDuration => {
    const rawDuration = String(goal?.duration || '')
    if (GOAL_DURATION_OPTIONS.some((option) => option.value === rawDuration)) {
      return rawDuration as GoalDuration
    }

    const days = Number(goal?.durationDays ?? goal?.durationInDays ?? 0)
    return GOAL_DURATION_BY_DAYS[days] || 'OneMonth'
  }

  const getGoalDurationDays = (goal: any): number => {
    const days = Number(goal?.durationDays ?? goal?.durationInDays ?? 0)
    return Number.isFinite(days) ? days : 0
  }

  const mapGoalErrorCode = (errorCode: string): string => {
    switch (errorCode) {
      case 'GOAL_SUBJECT_MISMATCH':
        return t('goals.errorCodes.GOAL_SUBJECT_MISMATCH')
      case 'INVALID_GOAL':
        return t('goals.errorCodes.INVALID_GOAL')
      default:
        return t('goals.goalCreateFailed')
    }
  }

  const loadSubjects = async (): Promise<any[]> => {
    if (subjectOptions.length > 0 && subjectCatalog.length > 0) return subjectCatalog
    setLoadingSubjects(true)
    try {
      const data = await SubjectService.listSubjects()
      const normalizedCatalog = (Array.isArray(data) ? data : []).map((subject: any) => ({
        ...subject,
        id: String(subject?.id ?? subject?.subjectId ?? ''),
        goals: Array.isArray(subject?.goals) ? subject.goals : [],
      }))

      const normalized = normalizedCatalog
        .map((subject: any) => ({
          id: String(subject?.id ?? ''),
          name: String(subject?.name ?? ''),
        }))
        .filter((subject) => Boolean(subject.id) && Boolean(subject.name))

      setSubjectCatalog(normalizedCatalog)
      setSubjectOptions(normalized)
      return normalizedCatalog
    } catch (err: any) {
      setCreateGoalError(err?.response?.data?.message || err?.message || t('goals.loadSubjectsFailed'))
      return []
    } finally {
      setLoadingSubjects(false)
    }
  }

  const resetCreateGoalForm = () => {
    setCreateGoalSubjectId('')
    setCreateGoalTitle('')
    setCreateGoalDescription('')
    setCreateGoalDuration('OneMonth')
    setCreateGoalError(null)
  }

  const handleOpenAddGoalModal = () => {
    setCreateGoalSuccess(null)
    setCreateGoalError(null)
    setShowAddGoalModal(true)
  }

  const handleCloseAddGoalModal = () => {
    setShowAddGoalModal(false)
    resetCreateGoalForm()
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
      const created = await GoalService.createGoal({
        subjectId: createGoalSubjectId,
        title,
        description,
        duration: createGoalDuration,
      })

      const refreshedGoals = await fetchGoals()
      const createdGoalId = String(created?.goalId ?? created?.id ?? '')
      const createdGoal = refreshedGoals.find((goal) => getGoalId(goal) === createdGoalId)
      if (createdGoal) {
        setSelectedGoal(createdGoal)
      }

      setCreateGoalSuccess(t('goals.goalCreatedSuccess'))
      handleCloseAddGoalModal()
    } catch (err: any) {
      const d = err?.response?.data
      const errorCode = String(d?.errorCode || d?.code || '').toUpperCase()
      setCreateGoalError(mapGoalErrorCode(errorCode))
    } finally {
      setCreatingGoal(false)
    }
  }

  const handleOpenEditGoalModal = async () => {
    if (!selectedGoal) return

    let workingCatalog = subjectCatalog

    if (subjectOptions.length === 0 || subjectCatalog.length === 0) {
      workingCatalog = await loadSubjects()
    }

    const selectedGoalId = getGoalId(selectedGoal)
    const detectedSubjectIdFromGoal = String(selectedGoal?.subjectId || selectedGoal?.subject?.subjectId || selectedGoal?.subject?.id || '')
    const detectedSubjectFromCatalog = workingCatalog.find((subject: any) => {
      const goals = Array.isArray(subject?.goals) ? subject.goals : []
      return goals.some((goal: any) => getGoalId(goal) === selectedGoalId)
    })
    const detectedSubjectId = detectedSubjectIdFromGoal || String(detectedSubjectFromCatalog?.id || '')

    setUpdateGoalError(null)
    setEditingGoalId(getGoalId(selectedGoal))
    setEditGoalSubjectId(detectedSubjectId)
    setEditGoalTitle(String(selectedGoal?.title || ''))
    setEditGoalDescription(String(selectedGoal?.description || ''))
    setEditGoalDuration(getGoalDuration(selectedGoal))
    setShowEditGoalModal(true)
  }

  const handleCloseEditGoalModal = () => {
    setShowEditGoalModal(false)
    setUpdatingGoal(false)
    setUpdateGoalError(null)
    setEditingGoalId('')
    setEditGoalSubjectId('')
    setEditGoalTitle('')
    setEditGoalDescription('')
    setEditGoalDuration('OneMonth')
  }

  const handleUpdateGoal = async () => {
    const title = editGoalTitle.trim()
    const description = editGoalDescription.trim()

    if (!editGoalSubjectId) {
      setUpdateGoalError(t('goals.subjectRequired'))
      return
    }

    if (!title) {
      setUpdateGoalError(t('goals.titleRequired'))
      return
    }

    if (!editingGoalId) {
      setUpdateGoalError(t('goals.goalUpdateFailed'))
      return
    }

    setUpdatingGoal(true)
    setUpdateGoalError(null)

    try {
      await GoalService.updateGoal(editingGoalId, {
        subjectId: editGoalSubjectId,
        title,
        description,
        duration: editGoalDuration,
      })

      const refreshedGoals = await fetchGoals()
      const updatedGoal = refreshedGoals.find((goal) => getGoalId(goal) === editingGoalId)
      if (updatedGoal) {
        setSelectedGoal(updatedGoal)
      }

      setCreateGoalSuccess(t('goals.goalUpdatedSuccess'))
      handleCloseEditGoalModal()
    } catch (err: any) {
      const d = err?.response?.data
      const errorCode = String(d?.errorCode || d?.code || '').toUpperCase()
      setUpdateGoalError(mapGoalErrorCode(errorCode))
    } finally {
      setUpdatingGoal(false)
    }
  }

  const handleOpenDeleteConfirm = () => {
    if (!selectedGoal) return
    setDeleteGoalError(null)
    setShowDeleteGoalConfirm(true)
  }

  const handleCloseDeleteConfirm = () => {
    setShowDeleteGoalConfirm(false)
    setDeleteGoalError(null)
    setDeletingGoal(false)
  }

  const handleDeleteGoal = async () => {
    if (!selectedGoal) return
    const goalId = getGoalId(selectedGoal)
    if (!goalId) {
      setDeleteGoalError(t('goals.goalDeleteFailed'))
      return
    }

    setDeletingGoal(true)
    setDeleteGoalError(null)

    try {
      await GoalService.deleteGoal(goalId)
      const refreshedGoals = await fetchGoals()
      const nextSelected = refreshedGoals.length > 0 ? refreshedGoals[0] : null
      setSelectedGoal(nextSelected)
      setCreateGoalSuccess(t('goals.goalDeletedSuccess'))
      handleCloseDeleteConfirm()
    } catch (err: any) {
      setDeleteGoalError(err?.response?.data?.message || err?.message || t('goals.goalDeleteFailed'))
    } finally {
      setDeletingGoal(false)
    }
  }

  const filteredGoals = goals.filter(goal => {
    const q = searchTerm.toLowerCase()
    return (goal?.title || '').toLowerCase().includes(q) || (goal?.description || '').toLowerCase().includes(q)
  })

  return (
    <Layout sidebar={sidebarConfig}>
      <div style={{ padding: 24, background: 'var(--bg-surface)', minHeight: '100vh' }}>
        {createGoalSuccess && (
          <div style={{ marginBottom: 16, border: '1px solid var(--success-primary)', borderRadius: 2, background: 'var(--bg-green-tint)', color: 'var(--success-primary)', padding: '10px 12px', fontSize: 13 }}>
            {createGoalSuccess}
          </div>
        )}

        {/* Search */}
        <div style={{ marginBottom: 20, display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center' }}>
          <div style={{ position: 'relative', minWidth: 0 }}>
            <input
              placeholder={t('goals.searchPlaceholder')} value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 12px', fontSize: 13, border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' as const }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }}
            />
          </div>
          <button
            type="button"
            onClick={handleOpenAddGoalModal}
            style={{ padding: '8px 14px', border: '1px solid var(--text-primary)', borderRadius: 2, background: 'var(--text-primary)', color: 'var(--bg-surface-short)', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--text-strong)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--text-primary)' }}
          >
            + {t('goals.addGoalButton')}
          </button>
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
                  const selectedGoalId = getGoalId(selectedGoal)
                  const currentGoalId = getGoalId(goal)
                  const isSelected = Boolean(selectedGoalId) && Boolean(currentGoalId) && selectedGoalId === currentGoalId
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
                            <span>{t('goals.days', { count: getGoalDurationDays(goal) })}</span>
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

                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={handleOpenEditGoalModal}
                    style={{ flex: 1, padding: '8px 16px', background: 'var(--text-primary)', color: 'var(--bg-surface-short)', border: '1px solid var(--text-primary)', borderRadius: 2, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--text-strong)'
                      e.currentTarget.style.transform = 'translateY(-1px)'
                      e.currentTarget.style.boxShadow = '0 4px 10px rgba(15, 23, 42, 0.15)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--text-primary)'
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    {t('goals.editButton')}
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenDeleteConfirm}
                    style={{ flex: 1, padding: '8px 16px', background: 'var(--bg-red-tint)', color: 'var(--danger-primary)', border: '1px solid var(--danger-primary)', borderRadius: 2, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--danger-primary)'
                      e.currentTarget.style.color = 'white'
                      e.currentTarget.style.transform = 'translateY(-1px)'
                      e.currentTarget.style.boxShadow = '0 4px 10px rgba(220, 38, 38, 0.25)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-red-tint)'
                      e.currentTarget.style.color = 'var(--danger-primary)'
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    {t('goals.deleteButton')}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 24, textAlign: 'center', position: 'sticky', top: 24 }}>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{t('goals.selectGoal')}</p>
              </div>
            )}
          </div>
        </div>

        {showAddGoalModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80, padding: 16 }}>
            <div style={{ width: '100%', maxWidth: 560, background: 'var(--bg-surface-short)', border: '1px solid var(--border-base)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-base)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text-primary)', fontWeight: 700 }}>{t('goals.addGoalModalTitle')}</h3>
                <button
                  type="button"
                  onClick={handleCloseAddGoalModal}
                  style={{ border: '1px solid var(--border-base)', background: 'transparent', color: 'var(--text-secondary)', borderRadius: 2, padding: '4px 8px', cursor: 'pointer' }}
                >
                  ✕
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
                    onChange={(e) => setCreateGoalSubjectId(e.target.value)}
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
                    onChange={(e) => setCreateGoalTitle(e.target.value)}
                    placeholder={t('goals.titlePlaceholder')}
                    disabled={creatingGoal}
                    style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' as const }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    $ {t('goals.descriptionLabel')}
                  </label>
                  <textarea
                    value={createGoalDescription}
                    onChange={(e) => setCreateGoalDescription(e.target.value)}
                    placeholder={t('goals.descriptionPlaceholder')}
                    rows={3}
                    disabled={creatingGoal}
                    style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none', resize: 'none', boxSizing: 'border-box' as const }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    $ {t('goals.durationLabel')}
                  </label>
                  <select
                    value={createGoalDuration}
                    onChange={(e) => setCreateGoalDuration(e.target.value as GoalDuration)}
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
          <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 85, padding: 16 }}>
            <div style={{ width: '100%', maxWidth: 560, background: 'var(--bg-surface-short)', border: '1px solid var(--border-base)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-base)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text-primary)', fontWeight: 700 }}>{t('goals.editGoalModalTitle')}</h3>
                <button
                  type="button"
                  onClick={handleCloseEditGoalModal}
                  style={{ border: '1px solid var(--border-base)', background: 'transparent', color: 'var(--text-secondary)', borderRadius: 2, padding: '4px 8px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {updateGoalError && (
                  <div style={{ border: '1px solid var(--danger-primary)', borderRadius: 2, padding: '8px 10px', background: 'var(--bg-red-tint)', color: 'var(--danger-primary)', fontSize: 12 }}>
                    {updateGoalError}
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    $ {t('goals.subjectLabel')}
                  </label>
                  <select
                    value={editGoalSubjectId}
                    onChange={(e) => setEditGoalSubjectId(e.target.value)}
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
                    onChange={(e) => setEditGoalTitle(e.target.value)}
                    placeholder={t('goals.titlePlaceholder')}
                    disabled={updatingGoal}
                    style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' as const }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    $ {t('goals.descriptionLabel')}
                  </label>
                  <textarea
                    value={editGoalDescription}
                    onChange={(e) => setEditGoalDescription(e.target.value)}
                    placeholder={t('goals.descriptionPlaceholder')}
                    rows={3}
                    disabled={updatingGoal}
                    style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none', resize: 'none', boxSizing: 'border-box' as const }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    $ {t('goals.durationLabel')}
                  </label>
                  <select
                    value={editGoalDuration}
                    onChange={(e) => setEditGoalDuration(e.target.value as GoalDuration)}
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
                  onClick={handleCloseEditGoalModal}
                  disabled={updatingGoal}
                  style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: updatingGoal ? 'not-allowed' : 'pointer' }}
                >
                  {t('goals.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleUpdateGoal}
                  disabled={updatingGoal}
                  style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--text-primary)', borderRadius: 2, background: updatingGoal ? 'var(--text-secondary)' : 'var(--text-primary)', color: 'var(--bg-surface-short)', fontSize: 12, fontWeight: 700, cursor: updatingGoal ? 'not-allowed' : 'pointer' }}
                >
                  {updatingGoal ? t('goals.updatingGoal') : t('goals.updateGoalButton')}
                </button>
              </div>
            </div>
          </div>
        )}

        {showDeleteGoalConfirm && (
          <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 90, padding: 16 }}>
            <div style={{ width: '100%', maxWidth: 480, background: 'var(--bg-surface-short)', border: '1px solid var(--border-base)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-base)' }}>
                <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text-primary)', fontWeight: 700 }}>{t('goals.deleteConfirmTitle')}</h3>
              </div>

              <div style={{ padding: 20 }}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6 }}>
                  {t('goals.deleteConfirmMessage', { title: selectedGoal?.title || t('goals.untitled') })}
                </p>
                {deleteGoalError && (
                  <div style={{ marginTop: 12, border: '1px solid var(--danger-primary)', borderRadius: 2, padding: '8px 10px', background: 'var(--bg-red-tint)', color: 'var(--danger-primary)', fontSize: 12 }}>
                    {deleteGoalError}
                  </div>
                )}
              </div>

              <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-base)', display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={handleCloseDeleteConfirm}
                  disabled={deletingGoal}
                  style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: deletingGoal ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease' }}
                  onMouseEnter={(e) => {
                    if (deletingGoal) return
                    e.currentTarget.style.borderColor = 'var(--accent-primary)'
                    e.currentTarget.style.color = 'var(--accent-primary)'
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.boxShadow = '0 4px 10px rgba(59, 130, 246, 0.18)'
                  }}
                  onMouseLeave={(e) => {
                    if (deletingGoal) return
                    e.currentTarget.style.borderColor = 'var(--border-base)'
                    e.currentTarget.style.color = 'var(--text-primary)'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {t('goals.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteGoal}
                  disabled={deletingGoal}
                  style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--danger-primary)', borderRadius: 2, background: 'var(--danger-primary)', opacity: deletingGoal ? 0.7 : 1, color: 'white', fontSize: 12, fontWeight: 700, cursor: deletingGoal ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease' }}
                  onMouseEnter={(e) => {
                    if (deletingGoal) return
                    e.currentTarget.style.background = 'var(--danger-dark, #b91c1c)'
                    e.currentTarget.style.borderColor = 'var(--danger-dark, #b91c1c)'
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.30)'
                  }}
                  onMouseLeave={(e) => {
                    if (deletingGoal) return
                    e.currentTarget.style.background = 'var(--danger-primary)'
                    e.currentTarget.style.borderColor = 'var(--danger-primary)'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {deletingGoal ? t('goals.deletingGoal') : t('goals.deleteButton')}
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
