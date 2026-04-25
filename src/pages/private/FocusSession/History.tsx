import React from 'react'
import { RotateCcw, Loader2, BarChart3, ListChecks, Timer, Filter, Search, X, BookOpen, Play } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import Layout from '../../../components/Layout'
import { useStudentSidebarConfig } from '../Student/components/StudentSideBar'
import { FocusSessionService } from '../../../services'
import ROUTER from '../../../router/ROUTER'
import TaskReviewStatusBadge from '../../../components/TaskReview/TaskReviewStatusBadge'
import type {
  FocusSession,
  FocusSessionHistoryItem,
  FocusSessionHistoryPage,
} from '../../../services/FocusSessionService'

type HistoryState = FocusSessionHistoryPage

type SessionNoteListItem = {
  noteId: string
  title: string
  content: string
  createdAt?: string | null
  updatedAt?: string | null
}

const DEFAULT_PAGE_SIZE = 10

const createEmptyState = (): HistoryState => ({
  items: [],
  pageNumber: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  totalCount: 0,
  totalPages: 1,
})

const humanizeToken = (input: string): string => {
  if (!input) return '-'
  return input
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
}

const parseAsUtcDate = (raw: string): Date => {
  const normalized = raw.includes(' ') ? raw.replace(' ', 'T') : raw
  const hasTimezone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(normalized)
  const candidate = hasTimezone ? normalized : `${normalized}Z`
  return new Date(candidate)
}

const normalizeSessionNote = (raw: any): SessionNoteListItem | null => {
  if (!raw) return null
  const source = raw?.data ?? raw?.value ?? raw
  const noteId = String(source?.noteId ?? source?.id ?? '').trim()
  const title = String(source?.title ?? '').trim()
  const content = String(source?.content ?? '')

  if (!noteId && !title && !content) return null

  return {
    noteId: noteId || `${Date.now()}`,
    title: title || 'Untitled',
    content,
    createdAt: source?.createdAt ?? null,
    updatedAt: source?.updatedAt ?? null,
  }
}

const toStartOfDayIso = (dateValue: string): string => {
  return new Date(`${dateValue}T00:00:00`).toISOString()
}

const toEndOfDayIso = (dateValue: string): string => {
  return new Date(`${dateValue}T23:59:59.999`).toISOString()
}

const SESSION_STATUS_VALUES = [
  'Running',
  'Paused',
  'CompletedEarly',
  'CompletedOnTime',
  'CompletedLate',
  'Abandoned',
] as const

type CanonicalSessionStatus = 'running' | 'paused' | 'completedearly' | 'completedontime' | 'completedlate' | 'abandoned' | 'unknown'

type SessionStatusFilterValue = (typeof SESSION_STATUS_VALUES)[number] | ''
type SessionTypeFilterValue = 'Pomodoro' | 'Study' | ''

type HistoryFilterState = {
  taskId: string
  sessionStatus: SessionStatusFilterValue
  sessionType: SessionTypeFilterValue
  startedFrom: string
  startedTo: string
}

const createDefaultFilters = (): HistoryFilterState => ({
  taskId: '',
  sessionStatus: '',
  sessionType: '',
  startedFrom: '',
  startedTo: '',
})

const getCanonicalSessionStatus = (raw: unknown): CanonicalSessionStatus => {
  if (raw == null) return 'unknown'

  const numeric = Number(raw)
  if (Number.isFinite(numeric)) {
    if (numeric === 0) return 'running'
    if (numeric === 1) return 'paused'
    if (numeric === 2) return 'completedearly'
    if (numeric === 3) return 'completedontime'
    if (numeric === 4) return 'completedlate'
    if (numeric === 5) return 'abandoned'
  }

  const normalized = String(raw).trim().toLowerCase()
  if (!normalized) return 'unknown'
  if (normalized === 'running' || normalized.includes('run') || normalized.includes('active')) return 'running'
  if (normalized === 'paused' || normalized.includes('pause')) return 'paused'
  if (normalized === 'completedearly') return 'completedearly'
  if (normalized === 'completedontime') return 'completedontime'
  if (normalized === 'completedlate') return 'completedlate'
  if (normalized === 'abandoned') return 'abandoned'
  if (normalized.includes('complete') || normalized.includes('done')) return 'completedontime'

  return 'unknown'
}

const FocusSessionHistoryPageView: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation('student')
  const navItems = useStudentSidebarConfig()

  const sidebarConfig = React.useMemo(() => ({
    navItems,
    actions: [],
    brand: { name: t('focusSessionHistory.title'), subtitle: 'Student' },
  }), [navItems, t])

  const [history, setHistory] = React.useState<HistoryState>(createEmptyState)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [selectedSession, setSelectedSession] = React.useState<FocusSessionHistoryItem | null>(null)
  const [noteSession, setNoteSession] = React.useState<FocusSessionHistoryItem | null>(null)
  const [sessionNotes, setSessionNotes] = React.useState<SessionNoteListItem[]>([])
  const [sessionNotesLoading, setSessionNotesLoading] = React.useState(false)
  const [sessionNotesError, setSessionNotesError] = React.useState('')
  const [selectedNote, setSelectedNote] = React.useState<SessionNoteListItem | null>(null)
  const [isNoteListModalOpen, setIsNoteListModalOpen] = React.useState(false)
  const [isNoteDetailModalOpen, setIsNoteDetailModalOpen] = React.useState(false)
  const [sessionNoteCounts, setSessionNoteCounts] = React.useState<Record<string, number>>({})
  const [filters, setFilters] = React.useState<HistoryFilterState>(createDefaultFilters)
  const [appliedFilters, setAppliedFilters] = React.useState<HistoryFilterState>(createDefaultFilters)
  const [taskOptions, setTaskOptions] = React.useState<Array<{ taskId: string; taskTitle: string }>>([])

  const mergeTaskOptions = React.useCallback((items: FocusSessionHistoryItem[]) => {
    setTaskOptions((prev) => {
      const dict = new Map(prev.map((item) => [item.taskId, item.taskTitle]))
      items.forEach((item) => {
        const taskId = String(item.taskId || '')
        const taskTitle = String(item.taskTitle || item.title || '').trim()
        if (taskId && taskTitle && !dict.has(taskId)) {
          dict.set(taskId, taskTitle)
        }
      })
      return Array.from(dict.entries()).map(([taskId, taskTitle]) => ({ taskId, taskTitle }))
    })
  }, [])

  const loadHistory = React.useCallback(async (pageNumber: number, pageSize: number, activeFilters: HistoryFilterState) => {
    setLoading(true)
    setError('')

    const startedFromIso = activeFilters.startedFrom ? toStartOfDayIso(activeFilters.startedFrom) : undefined
    const startedToIso = activeFilters.startedTo ? toEndOfDayIso(activeFilters.startedTo) : undefined

    try {
      const response = await FocusSessionService.getSessionHistory({
        taskId: activeFilters.taskId || undefined,
        sessionStatus: activeFilters.sessionStatus || undefined,
        sessionType: activeFilters.sessionType || undefined,
        startedFrom: startedFromIso,
        startedTo: startedToIso,
        includeAbandoned: true,
        pageNumber,
        pageSize,
      })

      mergeTaskOptions(response.items)

      setHistory({
        ...response,
        totalPages: response.totalPages > 0 ? response.totalPages : 1,
      })
    } catch (loadError: any) {
      const message =
        loadError?.response?.data?.message
        || loadError?.message
        || t('focusSessionHistory.loadError')
      setError(String(message))
      setHistory(createEmptyState())
    } finally {
      setLoading(false)
    }
  }, [t, mergeTaskOptions])

  React.useEffect(() => {
    const bootstrapTaskOptions = async () => {
      try {
        const response = await FocusSessionService.getSessionHistory({
          pageNumber: 1,
          pageSize: 50,
          includeAbandoned: true,
        })
        mergeTaskOptions(response.items)
      } catch {
        // Ignore task option preload failures.
      }
    }

    bootstrapTaskOptions()
  }, [mergeTaskOptions])

  React.useEffect(() => {
    loadHistory(history.pageNumber, history.pageSize || DEFAULT_PAGE_SIZE, appliedFilters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.pageNumber, history.pageSize, appliedFilters])

  React.useEffect(() => {
    const sessionIds = history.items
      .map((item) => String(item.sessionId || '').trim())
      .filter((sessionId) => sessionId.length > 0)

    const missingIds = sessionIds.filter((sessionId) => sessionNoteCounts[sessionId] === undefined)
    if (missingIds.length === 0) return

    let cancelled = false

    const fetchCounts = async () => {
      const entries = await Promise.all(missingIds.map(async (sessionId) => {
        try {
          const rows = await FocusSessionService.getSessionNotes(sessionId)
          const count = rows
            .map((row: any) => normalizeSessionNote(row))
            .filter((note): note is SessionNoteListItem => note != null)
            .length
          return [sessionId, count] as const
        } catch {
          return [sessionId, 0] as const
        }
      }))

      if (cancelled) return

      setSessionNoteCounts((prev) => {
        const next = { ...prev }
        entries.forEach(([sessionId, count]) => {
          next[sessionId] = count
        })
        return next
      })
    }

    void fetchCounts()

    return () => {
      cancelled = true
    }
  }, [history.items, sessionNoteCounts])

  const refresh = () => {
    loadHistory(history.pageNumber, history.pageSize || DEFAULT_PAGE_SIZE, appliedFilters)
  }

  const goPrevPage = () => {
    setHistory((prev) => ({ ...prev, pageNumber: Math.max(1, prev.pageNumber - 1) }))
  }

  const goNextPage = () => {
    setHistory((prev) => ({ ...prev, pageNumber: Math.min(prev.totalPages || 1, prev.pageNumber + 1) }))
  }

  const updateFilter = <K extends keyof HistoryFilterState>(key: K, value: HistoryFilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const applyFilters = () => {
    if (filters.startedFrom && filters.startedTo) {
      const fromMs = new Date(filters.startedFrom).getTime()
      const toMs = new Date(filters.startedTo).getTime()
      if (Number.isFinite(fromMs) && Number.isFinite(toMs) && fromMs > toMs) {
        setError(t('focusSessionHistory.invalidDateRange'))
        return
      }
    }

    setError('')
    setAppliedFilters(filters)
    setHistory((prev) => ({ ...prev, pageNumber: 1 }))
  }

  const resetFilters = () => {
    const reset = createDefaultFilters()
    setFilters(reset)
    setAppliedFilters(reset)
    setError('')
    setHistory((prev) => ({ ...prev, pageNumber: 1 }))
  }

  const changePageSize = (nextPageSize: number) => {
    setHistory((prev) => ({
      ...prev,
      pageSize: nextPageSize,
      pageNumber: 1,
    }))
  }

  const jumpToPage = (value: string) => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return
    const page = Math.max(1, Math.min(history.totalPages || 1, Math.trunc(parsed)))
    setHistory((prev) => ({ ...prev, pageNumber: page }))
  }

  const openSessionNotes = async (item: FocusSessionHistoryItem) => {
    if (!item.sessionId) return
    setNoteSession(item)
    setIsNoteListModalOpen(true)
    setSessionNotesLoading(true)
    setSessionNotesError('')
    setSessionNotes([])
    setSelectedNote(null)
    setIsNoteDetailModalOpen(false)

    try {
      const rows = await FocusSessionService.getSessionNotes(item.sessionId)
      const normalized = rows
        .map((row: any) => normalizeSessionNote(row))
        .filter((note): note is SessionNoteListItem => note != null)
      setSessionNotes(normalized)
    } catch (loadError: any) {
      const message = loadError?.response?.data?.message || loadError?.message || t('focusSessionHistory.noteLoadError')
      setSessionNotesError(String(message))
    } finally {
      setSessionNotesLoading(false)
    }
  }

  const openNoteDetail = (note: SessionNoteListItem) => {
    setSelectedNote(note)
    setIsNoteDetailModalOpen(true)
  }

  const closeNoteListModal = () => {
    setIsNoteListModalOpen(false)
    setIsNoteDetailModalOpen(false)
    setSelectedNote(null)
  }

  const handleReturnToSession = async (item: FocusSessionHistoryItem) => {
    if (!item.sessionId) return

    const taskState = {
      id: item.taskId || undefined,
      title: item.taskTitle || item.title || t('focusSession.untitledTask'),
      description: item.taskTitle || item.title || undefined,
    }

    const fallbackSession: FocusSession = {
      id: String(item.sessionId),
      taskId: String(item.taskId || ''),
      sessionType: Number(item.sessionType) === 1 ? 1 : 0,
      plannedDurationMinutes: Number(item.plannedDurationMinutes || 0),
      title: item.title || item.taskTitle || null,
      startTime: String(item.startTime || item.createdAt || new Date().toISOString()),
      endTime: item.endTime ?? null,
      isActive: true,
      createdAt: String(item.createdAt || item.startTime || new Date().toISOString()),
    }

    try {
      const resumed = await FocusSessionService.resumeSession(item.sessionId)
      navigate(ROUTER.FOCUS_SESSION, { state: { session: resumed, task: taskState } })
      return
    } catch {
      // Ignore resume failure and fallback to fetch current session.
    }

    try {
      const current = await FocusSessionService.getSession(item.sessionId)
      navigate(ROUTER.FOCUS_SESSION, { state: { session: current, task: taskState } })
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || t('focusSessionHistory.returnToSessionFailed')
      setError(String(msg))
      navigate(ROUTER.FOCUS_SESSION, { state: { session: fallbackSession, task: taskState } })
    }
  }

  const completedCount = React.useMemo(() => {
    return history.items.filter((item) => {
      const status = getCanonicalSessionStatus(item.sessionStatus)
      return status === 'completedearly' || status === 'completedontime' || status === 'completedlate'
    }).length
  }, [history.items])

  const totalActualMinutes = React.useMemo(() => {
    return history.items.reduce((sum, item) => {
      const minutes = item.actualDurationMinutes
      return sum + (typeof minutes === 'number' && Number.isFinite(minutes) ? minutes : 0)
    }, 0)
  }, [history.items])

  const averageScore = React.useMemo(() => {
    const scored = history.items
      .map((item) => item.verificationScore)
      .filter((score): score is number => typeof score === 'number' && Number.isFinite(score))
    if (scored.length === 0) return null
    const total = scored.reduce((sum, score) => sum + score, 0)
    return Math.round(total / scored.length)
  }, [history.items])

  const completionRate = React.useMemo(() => {
    if (history.items.length === 0) return 0
    return Math.round((completedCount / history.items.length) * 100)
  }, [completedCount, history.items.length])

  const formatDate = (value?: string | null) => {
    if (!value) return '-'
    const sourceDate = parseAsUtcDate(value)
    if (Number.isNaN(sourceDate.getTime())) return '-'

    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(sourceDate)
  }

  const formatDuration = (minutes?: number | null) => {
    if (minutes == null || !Number.isFinite(minutes)) return '-'
    return String(minutes)
  }

  const getSessionTypeLabel = (sessionType: unknown) => {
    const normalized = Number(sessionType)
    if (normalized === 0) return t('focusSession.pomodoro')
    if (normalized === 1) return t('focusSession.study')
    return '-'
  }

  const getSessionStatusOptionLabel = (value: string) => {
    const normalized = value.toLowerCase()
    if (normalized === 'running') return t('focusSessionHistory.statusRunning')
    if (normalized === 'paused') return t('focusSessionHistory.statusPaused')
    if (normalized === 'completedearly') return t('focusSessionHistory.statusCompletedEarly')
    if (normalized === 'completedontime') return t('focusSessionHistory.statusCompletedOnTime')
    if (normalized === 'completedlate') return t('focusSessionHistory.statusCompletedLate')
    if (normalized === 'abandoned') return t('focusSessionHistory.statusAbandoned')
    return humanizeToken(value)
  }

  const getSessionNoteCount = (item: FocusSessionHistoryItem): number => {
    const sessionId = String(item.sessionId || '').trim()
    if (sessionId && sessionNoteCounts[sessionId] !== undefined) {
      return sessionNoteCounts[sessionId]
    }

    const candidates = [
      item.noteCount,
      item.notesCount,
      item.sessionNoteCount,
      item.totalNotes,
      item.noteTotal,
    ]

    for (const candidate of candidates) {
      const parsed = Number(candidate)
      if (Number.isFinite(parsed) && parsed >= 0) {
        return Math.floor(parsed)
      }
    }

    return 0
  }

  const renderStatus = (item: FocusSessionHistoryItem) => {
    const status = getCanonicalSessionStatus(item.sessionStatus)
    const style: React.CSSProperties = {
      padding: '2px 8px',
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 700,
      border: '1px solid transparent',
    }

    if (status === 'running') {
      style.background = 'var(--bg-blue-hover)'
      style.color = 'var(--accent-primary)'
      style.borderColor = 'var(--accent-primary)'
    } else if (status === 'paused') {
      style.background = 'var(--bg-warning-soft)'
      style.color = 'var(--warning-primary)'
      style.borderColor = 'var(--warning-primary)'
    } else if (status === 'completedearly') {
      style.background = 'rgba(16, 185, 129, 0.12)'
      style.color = '#047857'
      style.borderColor = '#10b981'
    } else if (status === 'completedontime') {
      style.background = 'var(--badge-bg-success)'
      style.color = 'var(--badge-text-success)'
      style.borderColor = 'var(--success-primary)'
    } else if (status === 'completedlate') {
      style.background = 'rgba(245, 158, 11, 0.12)'
      style.color = '#b45309'
      style.borderColor = '#f59e0b'
    } else if (status === 'abandoned') {
      style.background = 'rgba(239, 68, 68, 0.12)'
      style.color = 'var(--danger-primary)'
      style.borderColor = 'var(--danger-primary)'
    } else {
      style.background = 'var(--th-input-bg)'
      style.color = 'var(--text-secondary)'
      style.borderColor = 'var(--border-base)'
    }

    let statusLabel = t('focusSessionHistory.statusUnknown')
    if (status === 'running') statusLabel = t('focusSessionHistory.statusRunning')
    else if (status === 'paused') statusLabel = t('focusSessionHistory.statusPaused')
    else if (status === 'completedearly') statusLabel = t('focusSessionHistory.statusCompletedEarly')
    else if (status === 'completedontime') statusLabel = t('focusSessionHistory.statusCompletedOnTime')
    else if (status === 'completedlate') statusLabel = t('focusSessionHistory.statusCompletedLate')
    else if (status === 'abandoned') statusLabel = t('focusSessionHistory.statusAbandoned')

    return <span style={style}>{statusLabel}</span>
  }

  return (
    <Layout sidebar={sidebarConfig}>
      <div style={{ padding: 24, background: 'var(--bg-main)', minHeight: '100vh', display: 'grid', gap: 16 }}>
        <div
          style={{
            border: '1px solid var(--border-base)',
            borderRadius: 18,
            padding: 24,
            background: 'var(--bg-surface)',
            backgroundImage: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-main) 100%)',
            boxShadow: '0 12px 26px rgba(15, 23, 42, 0.06)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 26, fontWeight: 800 }}>
                {t('focusSessionHistory.title')}
              </h1>
              <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)' }}>
                {t('focusSessionHistory.subtitle')}
              </p>
            </div>
            <button
              type="button"
              onClick={refresh}
              className="inline-flex items-center gap-2 px-4 py-2 border border-blue-600 bg-th-card text-status-blue text-sm font-bold hover:bg-status-blue-bg transition-colors cursor-pointer rounded-sm"
            >
              <RotateCcw size={16} /> {t('focusSessionHistory.refresh')}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <div style={{ border: '1px solid var(--border-base)', borderRadius: 16, padding: 16, background: 'var(--bg-surface)', boxShadow: '0 8px 18px rgba(15, 23, 42, 0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 12 }}>
              <ListChecks size={14} /> {t('focusSessionHistory.totalSessions')}
            </div>
            <div style={{ marginTop: 8, color: 'var(--text-primary)', fontSize: 24, fontWeight: 800 }}>{history.totalCount}</div>
          </div>
          <div style={{ border: '1px solid var(--border-base)', borderRadius: 16, padding: 16, background: 'var(--bg-surface)', boxShadow: '0 8px 18px rgba(15, 23, 42, 0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 12 }}>
              <Timer size={14} /> {t('focusSessionHistory.totalActualMinutes')}
            </div>
            <div style={{ marginTop: 8, color: 'var(--text-primary)', fontSize: 24, fontWeight: 800 }}>{totalActualMinutes}</div>
          </div>
          <div style={{ border: '1px solid var(--border-base)', borderRadius: 16, padding: 16, background: 'var(--bg-surface)', boxShadow: '0 8px 18px rgba(15, 23, 42, 0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 12 }}>
              <BarChart3 size={14} /> {t('focusSessionHistory.averageScore')}
            </div>
            <div style={{ marginTop: 8, color: 'var(--text-primary)', fontSize: 20, fontWeight: 800 }}>
              {averageScore == null ? '-' : averageScore}
            </div>
            <div style={{ marginTop: 4, color: 'var(--text-secondary)', fontSize: 12 }}>
              {t('focusSessionHistory.completionRate')}: {completionRate}%
            </div>
          </div>
        </div>

        <div
          style={{
            border: '1px solid var(--border-base)',
            borderRadius: 12,
            background: 'var(--bg-surface)',
            padding: 14,
            display: 'grid',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700 }}>
            <Filter size={14} /> {t('focusSessionHistory.filtersTitle')}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('focusSessionHistory.taskFilterLabel')}</span>
              <select
                value={filters.taskId}
                onChange={(event) => updateFilter('taskId', event.target.value)}
                style={{ width: '100%', minWidth: 0, border: '1px solid var(--border-base)', borderRadius: 8, padding: '8px 10px', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
              >
                <option value="">{t('focusSessionHistory.filterAll')}</option>
                {taskOptions.map((task) => (
                  <option key={task.taskId} value={task.taskId}>{task.taskTitle}</option>
                ))}
              </select>
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('focusSessionHistory.statusFilterLabel')}</span>
              <select
                value={filters.sessionStatus}
                onChange={(event) => updateFilter('sessionStatus', event.target.value as SessionStatusFilterValue)}
                style={{ width: '100%', minWidth: 0, border: '1px solid var(--border-base)', borderRadius: 8, padding: '8px 10px', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
              >
                <option value="">{t('focusSessionHistory.filterAll')}</option>
                {SESSION_STATUS_VALUES.map((status) => (
                  <option key={status} value={status}>{getSessionStatusOptionLabel(status)}</option>
                ))}
              </select>
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('focusSessionHistory.typeFilterLabel')}</span>
              <select
                value={filters.sessionType}
                onChange={(event) => updateFilter('sessionType', event.target.value as SessionTypeFilterValue)}
                style={{ width: '100%', minWidth: 0, border: '1px solid var(--border-base)', borderRadius: 8, padding: '8px 10px', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
              >
                <option value="">{t('focusSessionHistory.filterAll')}</option>
                <option value="Pomodoro">{t('focusSession.pomodoro')}</option>
                <option value="Study">{t('focusSession.study')}</option>
              </select>
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('focusSessionHistory.startedFromLabel')}</span>
              <input
                type="date"
                value={filters.startedFrom}
                onChange={(event) => updateFilter('startedFrom', event.target.value)}
                style={{ width: '100%', minWidth: 0, border: '1px solid var(--border-base)', borderRadius: 8, padding: '8px 10px', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
              />
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('focusSessionHistory.startedToLabel')}</span>
              <input
                type="date"
                value={filters.startedTo}
                onChange={(event) => updateFilter('startedTo', event.target.value)}
                style={{ width: '100%', minWidth: 0, border: '1px solid var(--border-base)', borderRadius: 8, padding: '8px 10px', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
              />
            </label>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={applyFilters}
              className="inline-flex items-center gap-2 px-4 py-2 border border-blue-600 bg-th-card text-status-blue text-sm font-bold hover:bg-status-blue-bg transition-colors cursor-pointer rounded-sm"
            >
              <Search size={14} /> {t('focusSessionHistory.applyFilters')}
            </button>
            <button
              type="button"
              onClick={resetFilters}
              style={{ borderRadius: 8, border: '1px solid var(--border-base)', background: 'var(--bg-main)', color: 'var(--text-primary)', padding: '8px 12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <X size={14} /> {t('focusSessionHistory.resetFilters')}
            </button>
          </div>
        </div>

        <div
          style={{
            border: '1px solid var(--border-base)',
            borderRadius: 12,
            background: 'var(--bg-surface)',
            overflow: 'hidden',
          }}
        >
          {loading ? (
            <div style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)' }}>
              <Loader2 size={16} className="animate-spin" />
              {t('focusSessionHistory.loading')}
            </div>
          ) : error ? (
            <div style={{ padding: 24 }}>
              <div style={{ color: 'var(--danger-primary)', marginBottom: 10 }}>{error || t('focusSessionHistory.loadError')}</div>
              <button
                type="button"
                onClick={refresh}
                style={{
                  borderRadius: 8,
                  border: '1px solid var(--danger-primary)',
                  background: 'transparent',
                  color: 'var(--danger-primary)',
                  padding: '8px 12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {t('focusSessionHistory.retry')}
              </button>
            </div>
          ) : history.items.length === 0 ? (
            <div style={{ padding: 24, color: 'var(--text-secondary)' }}>{t('focusSessionHistory.empty')}</div>
          ) : (
            <div style={{ padding: 14, display: 'grid', gap: 10 }}>
              {history.items.map((item) => {
                  const displayTitle = item.taskTitle || item.title || item.sessionId || '-'
                  const canonicalStatus = getCanonicalSessionStatus(item.sessionStatus)
                  const noteCount = getSessionNoteCount(item)
                  const displayContext = [item.learningPathTitle, item.chapterTitle]
                    .filter((part) => typeof part === 'string' && part.trim().length > 0)
                    .join(' • ')

                  return (
                <div
                  key={item.sessionId || `${item.taskId}-${item.createdAt}`}
                  style={{
                    border: '1px solid var(--border-base)',
                    borderRadius: 14,
                    background: 'var(--bg-surface)',
                    padding: 14,
                    boxShadow: '0 8px 16px rgba(15, 23, 42, 0.04)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 700, lineHeight: 1.35 }}>
                      {displayTitle}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {renderStatus(item)}
                      {canonicalStatus === 'paused' && (
                        <button
                          type="button"
                          onClick={() => handleReturnToSession(item)}
                          style={{
                            borderRadius: 999,
                            border: '1px solid #93c5fd',
                            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                            color: '#1d4ed8',
                            padding: '5px 12px',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            boxShadow: '0 6px 14px rgba(59, 130, 246, 0.16)',
                          }}
                        >
                          <Play size={12} fill="currentColor" />
                          {t('focusSessionHistory.returnToSession')}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openSessionNotes(item)}
                        style={{
                          borderRadius: 999,
                          border: '1px solid var(--border-base)',
                          background: 'var(--bg-surface)',
                          color: 'var(--accent-primary)',
                          padding: '5px 11px',
                          fontWeight: 700,
                          fontSize: 11,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          boxShadow: '0 6px 14px rgba(15, 23, 42, 0.08)',
                        }}
                        title={t('focusSessionHistory.noteTag')}
                      >
                        <BookOpen size={12} />
                        {t('focusSessionHistory.noteTag', { defaultValue: 'Notes' })}
                        <span style={{ opacity: 0.95 }}>({noteCount})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedSession(item)}
                        style={{
                          borderRadius: 999,
                          border: '1px solid var(--border-base)',
                          background: 'var(--bg-surface)',
                          color: 'var(--text-primary)',
                          padding: '5px 11px',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {t('focusSessionHistory.viewDetails', { defaultValue: 'Xem chi tiet' })}
                      </button>
                    </div>
                  </div>

                  {displayContext && (
                    <div style={{ marginTop: 6, color: 'var(--text-secondary)', fontSize: 12 }}>
                      {displayContext}
                    </div>
                  )}

                  <div
                    style={{
                      marginTop: 12,
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                      gap: 10,
                    }}
                  >
                    <div style={{ border: '1px solid var(--border-base)', borderRadius: 10, padding: 10, background: 'var(--bg-main)' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{t('focusSessionHistory.type')}</div>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{getSessionTypeLabel(item.sessionType)}</div>
                    </div>
                    <div style={{ border: '1px solid var(--border-base)', borderRadius: 10, padding: 10, background: 'var(--bg-main)' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{t('focusSessionHistory.startTime')}</div>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{formatDate(item.startTime)}</div>
                    </div>
                    <div style={{ border: '1px solid var(--border-base)', borderRadius: 10, padding: 10, background: 'var(--bg-main)' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{t('focusSessionHistory.endTime')}</div>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{formatDate(item.endTime)}</div>
                    </div>
                    <div style={{ border: '1px solid var(--border-base)', borderRadius: 10, padding: 10, background: 'var(--bg-main)' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, whiteSpace: 'nowrap' }}>{t('focusSessionHistory.durationCompact')}</div>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                        {formatDuration(item.actualDurationMinutes)} / {formatDuration(item.plannedDurationMinutes)}
                      </div>
                    </div>
                    <div style={{ border: '1px solid var(--border-base)', borderRadius: 10, padding: 10, background: 'var(--bg-main)' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{t('focusSessionHistory.result')}</div>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                        {item.isVerified ? t('focusSessionHistory.verifiedYes') : t('focusSessionHistory.verifiedNo')} / {item.verificationScore == null ? '-' : item.verificationScore}
                      </div>
                    </div>
                  </div>

                  {item.taskReview && (
                    <div
                      style={{
                        marginTop: 12,
                        border: '1px solid var(--border-base)',
                        borderRadius: 12,
                        padding: 12,
                        background: 'var(--bg-main)',
                        display: 'grid',
                        gap: 10,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12, flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                            {t('focusSessionHistory.taskReviewTitle', { defaultValue: 'Mentor Review' })}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                            {item.taskReview
                              ? t('focusSessionHistory.taskReviewRequestedWithMentor', {
                                defaultValue: 'Mentor: {{mentor}}',
                                mentor: item.taskReview.mentorUserName || item.taskReview.mentorId || '-',
                              })
                              : t('focusSessionHistory.taskReviewHint', {
                                defaultValue: 'Request a mentor to review this focus session submission.',
                              })}
                          </div>
                        </div>

                        {item.taskReview ? (
                          <TaskReviewStatusBadge
                            status={item.taskReview.status}
                            pendingLabel={t('focusSessionHistory.taskReviewPending', { defaultValue: 'Pending' })}
                            reviewedLabel={t('focusSessionHistory.taskReviewReviewed', { defaultValue: 'Reviewed' })}
                          />
                        ) : null}
                      </div>

                      {item.taskReview ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                            {t('focusSessionHistory.taskReviewScore', { defaultValue: 'Score' })}: {item.taskReview.score ?? '-'}
                            {' • '}
                            {t('focusSessionHistory.taskReviewRequestedAt', { defaultValue: 'Requested' })}: {formatDate(item.taskReview.requestedAt)}
                          </div>
                          <button
                            type="button"
                            onClick={() => navigate(ROUTER.TASK_REVIEW_DETAIL.replace(':reviewId', item.taskReview!.reviewId))}
                            style={{
                              borderRadius: 999,
                              border: '1px solid var(--border-base)',
                              background: 'var(--bg-surface)',
                              color: 'var(--text-primary)',
                              padding: '6px 12px',
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            {t('focusSessionHistory.taskReviewOpen', { defaultValue: 'Open review' })}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
                  )
                }
              )}
            </div>
          )}
        </div>

        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            {t('focusSessionHistory.pageInfo', {
              page: history.pageNumber,
              total: history.totalPages,
              count: history.totalCount,
            })}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 12 }}>
              {t('focusSessionHistory.pageSizeLabel')}
              <select
                value={history.pageSize}
                onChange={(event) => changePageSize(Number(event.target.value))}
                style={{ border: '1px solid var(--border-base)', borderRadius: 6, padding: '6px 8px', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
              >
                {[10, 20, 30, 50].map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 12 }}>
              {t('focusSessionHistory.pageNumberLabel')}
              <input
                type="number"
                min={1}
                max={Math.max(1, history.totalPages)}
                value={history.pageNumber}
                onChange={(event) => jumpToPage(event.target.value)}
                style={{ width: 72, border: '1px solid var(--border-base)', borderRadius: 6, padding: '6px 8px', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
              />
            </label>

            <button
              type="button"
              onClick={goPrevPage}
              disabled={loading || history.pageNumber <= 1}
              style={{
                borderRadius: 8,
                border: '1px solid var(--border-base)',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                padding: '8px 12px',
                fontWeight: 700,
                cursor: history.pageNumber <= 1 ? 'not-allowed' : 'pointer',
                opacity: history.pageNumber <= 1 ? 0.6 : 1,
              }}
            >
              {t('focusSessionHistory.prev')}
            </button>
            <button
              type="button"
              onClick={goNextPage}
              disabled={loading || history.pageNumber >= history.totalPages}
              style={{
                borderRadius: 8,
                border: '1px solid var(--border-base)',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                padding: '8px 12px',
                fontWeight: 700,
                cursor: history.pageNumber >= history.totalPages ? 'not-allowed' : 'pointer',
                opacity: history.pageNumber >= history.totalPages ? 0.6 : 1,
              }}
            >
              {t('focusSessionHistory.next')}
            </button>
          </div>
        </div>

        {selectedSession && (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.45)',
              zIndex: 80,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
            onClick={() => setSelectedSession(null)}
          >
            <div
              style={{
                width: 'min(920px, 100%)',
                maxHeight: '85vh',
                overflowY: 'auto',
                borderRadius: 14,
                border: '1px solid var(--border-base)',
                background: 'var(--bg-surface)',
                boxShadow: '0 18px 34px rgba(15, 23, 42, 0.2)',
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <div style={{ padding: 16, borderBottom: '1px solid var(--border-base)', display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('focusSessionHistory.detailTitle', { defaultValue: 'Chi tiet phien hoc' })}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>
                    {selectedSession.taskTitle || selectedSession.title || selectedSession.sessionId || '-'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSession(null)}
                  style={{
                    borderRadius: 8,
                    border: '1px solid var(--border-base)',
                    background: 'var(--bg-main)',
                    color: 'var(--text-primary)',
                    padding: '8px 12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {t('focusSessionHistory.close', { defaultValue: 'Dong' })}
                </button>
              </div>

              <div style={{ padding: 16, display: 'grid', gap: 12 }}>
                <div style={{ border: '1px solid var(--border-base)', borderRadius: 10, padding: 12, background: 'var(--bg-main)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    {t('focusSessionHistory.verificationStateLabel')}
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {selectedSession.isVerified
                      ? t('focusSessionHistory.verificationStateVerified')
                      : t('focusSessionHistory.verificationStateNotVerified')}
                  </div>
                </div>

                {selectedSession.submittedCode != null && (
                  <div style={{ border: '1px solid var(--border-base)', borderRadius: 10, padding: 12, background: 'var(--bg-main)' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      {t('focusSessionHistory.submittedCodeLabel')}
                    </div>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--text-primary)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: 13, lineHeight: 1.5 }}>
{String(selectedSession.submittedCode)}
                    </pre>
                  </div>
                )}

                {selectedSession.submittedSummary != null && (
                  <div style={{ border: '1px solid var(--border-base)', borderRadius: 10, padding: 12, background: 'var(--bg-main)' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      {t('focusSessionHistory.submittedSummaryLabel')}
                    </div>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.5 }}>
{String(selectedSession.submittedSummary)}
                    </pre>
                  </div>
                )}

                {selectedSession.aiFeedback != null && (
                  <div style={{ border: '1px solid var(--border-base)', borderRadius: 10, padding: 12, background: 'var(--bg-main)' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      {t('focusSessionHistory.aiFeedbackLabel')}
                    </div>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.5 }}>
{String(selectedSession.aiFeedback)}
                    </pre>

                    {selectedSession.taskReview && (
                      <div
                        style={{
                          marginTop: 12,
                          paddingTop: 12,
                          borderTop: '1px solid var(--border-base)',
                          display: 'grid',
                          gap: 10,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12, flexWrap: 'wrap' }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                              {t('focusSessionHistory.taskReviewTitle', { defaultValue: 'Mentor Review' })}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                              {selectedSession.taskReview
                                ? t('focusSessionHistory.taskReviewRequestedWithMentor', {
                                  defaultValue: 'Mentor: {{mentor}}',
                                  mentor: selectedSession.taskReview.mentorUserName || selectedSession.taskReview.mentorId || '-',
                                })
                                : t('focusSessionHistory.taskReviewHint', {
                                  defaultValue: 'Request a mentor to review this focus session submission.',
                                })}
                            </div>
                          </div>

                          {selectedSession.taskReview ? (
                            <TaskReviewStatusBadge
                              status={selectedSession.taskReview.status}
                              pendingLabel={t('focusSessionHistory.taskReviewPending', { defaultValue: 'Pending' })}
                              reviewedLabel={t('focusSessionHistory.taskReviewReviewed', { defaultValue: 'Reviewed' })}
                            />
                          ) : null}
                        </div>

                        {selectedSession.taskReview ? (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                              {t('focusSessionHistory.taskReviewScore', { defaultValue: 'Score' })}: {selectedSession.taskReview.score ?? '-'}
                              {' • '}
                              {t('focusSessionHistory.taskReviewRequestedAt', { defaultValue: 'Requested' })}: {formatDate(selectedSession.taskReview.requestedAt)}
                            </div>
                            <button
                              type="button"
                              onClick={() => navigate(ROUTER.TASK_REVIEW_DETAIL.replace(':reviewId', selectedSession.taskReview!.reviewId))}
                              style={{
                                borderRadius: 999,
                                border: '1px solid var(--border-base)',
                                background: 'var(--bg-surface)',
                                color: 'var(--text-primary)',
                                padding: '6px 12px',
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              {t('focusSessionHistory.taskReviewOpen', { defaultValue: 'Open review' })}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {isNoteListModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.55)',
              backdropFilter: 'blur(2px)',
              zIndex: 90,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
            onClick={closeNoteListModal}
          >
            <div
              style={{
                width: 'min(760px, 100%)',
                maxHeight: '82vh',
                overflow: 'hidden',
                borderRadius: 12,
                border: '1px solid var(--border-base)',
                background: 'var(--bg-surface)',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.28)',
                display: 'flex',
                flexDirection: 'column',
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-base)', display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                <div style={{ display: 'grid', gap: 4 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    <BookOpen size={14} />
                    {t('focusSessionHistory.noteListTitle')}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                    {noteSession?.taskTitle || noteSession?.title || noteSession?.sessionId || '-'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeNoteListModal}
                  style={{
                    borderRadius: 8,
                    border: '1px solid var(--border-base)',
                    background: 'var(--bg-main)',
                    color: 'var(--text-primary)',
                    padding: '8px 12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {t('focusSessionHistory.close')}
                </button>
              </div>

              <div style={{ padding: 12, overflowY: 'auto', display: 'grid', gap: 8 }}>
                {sessionNotesLoading ? (
                  <div style={{ border: '1px dashed var(--border-base)', borderRadius: 10, padding: 12, color: 'var(--text-secondary)' }}>
                    {t('focusSessionHistory.noteLoading')}
                  </div>
                ) : sessionNotesError ? (
                  <div style={{ border: '1px dashed var(--danger-primary)', borderRadius: 10, padding: 12, color: 'var(--danger-primary)' }}>
                    {sessionNotesError}
                  </div>
                ) : sessionNotes.length === 0 ? (
                  <div style={{ border: '1px dashed var(--border-base)', borderRadius: 10, padding: 12, color: 'var(--text-secondary)' }}>
                    {t('focusSessionHistory.noteEmpty')}
                  </div>
                ) : (
                  sessionNotes.map((note) => (
                    <button
                      key={note.noteId}
                      type="button"
                      onClick={() => openNoteDetail(note)}
                      style={{
                        border: '1px solid var(--border-base)',
                        borderRadius: 8,
                        background: 'var(--bg-main)',
                        color: 'var(--text-primary)',
                        padding: '10px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'grid',
                        gap: 4,
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 13 }}>
                        {note.title || t('focusSession.noteUntitled')}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        {t('focusSession.noteCreatedAt')}: {formatDate(note.createdAt)}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {isNoteDetailModalOpen && selectedNote && (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.62)',
              backdropFilter: 'blur(2px)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
            onClick={() => setIsNoteDetailModalOpen(false)}
          >
            <div
              style={{
                width: 'min(900px, 100%)',
                maxHeight: '86vh',
                overflow: 'hidden',
                borderRadius: 12,
                border: '1px solid var(--border-base)',
                background: 'var(--bg-surface)',
                boxShadow: '0 24px 64px rgba(0, 0, 0, 0.32)',
                display: 'flex',
                flexDirection: 'column',
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-base)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'grid', gap: 4 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    <BookOpen size={14} />
                    {t('focusSessionHistory.noteTag', { defaultValue: 'Notes' })}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                    {selectedNote.title || t('focusSession.noteUntitled')}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    {t('focusSession.noteCreatedAt')}: {formatDate(selectedNote.createdAt)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNoteDetailModalOpen(false)}
                  style={{
                    borderRadius: 8,
                    border: '1px solid var(--border-base)',
                    background: 'var(--bg-main)',
                    color: 'var(--text-primary)',
                    padding: '8px 12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {t('focusSessionHistory.close')}
                </button>
              </div>

              <div style={{ padding: 14, overflowY: 'auto' }}>
                <div
                  style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    lineHeight: 1.7,
                    border: '1px solid var(--border-base)',
                    borderRadius: 10,
                    background: 'var(--bg-main)',
                    padding: 14,
                    minHeight: 240,
                  }}
                >
                  {selectedNote.content || t('focusSession.noteNoContent')}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default FocusSessionHistoryPageView
