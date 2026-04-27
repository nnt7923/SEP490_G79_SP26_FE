import React, { useState, useEffect, useRef } from 'react'
import Editor from '@monaco-editor/react'
import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, Code, HelpCircle, Bot, Timer, Flag, CheckCircle, Info, ArrowLeft, Loader2, PlayCircle, PauseCircle, Maximize2, Minimize2, MessageCircle } from 'lucide-react'
import { useNavigate, useLocation, useBlocker } from 'react-router-dom'
import { DailyCheckinService, FocusSessionService, SessionType } from '../../../services'
import type { FocusSession } from '../../../services/FocusSessionService'
import Header from '../../../components/Layout/Header'
import Footer from '../../../components/Layout/Footer'
import Toast from '../../../components/Toast'
import CompleteSessionDialog from '../../../components/CompleteSessionDialog'
import TaskReviewRequestModal, { type TaskReviewRequestSession } from '../../../components/TaskReview/TaskReviewRequestModal'
import ROUTER from '../../../router/ROUTER'
import { useTranslation } from 'react-i18next'
import useDailyCheckinActivitySync from '../../../hooks/useDailyCheckinActivitySync'
import DailyCheckinPopup from '../Student/components/DailyCheckinPopup'
import { hasTaskReviewSubmission } from '../../../components/TaskReview/utils'
import type { MentorDto } from '../../../services/MentorService'
import type { RequestTaskReviewResult } from '../../../services/TaskReviewService'

interface TaskData {
  id?: string
  taskId?: string
  title?: string
  description?: string
  taskType?: string | number // Can be string ("Practice", "Theory", "Quizz") or number (0, 1, 2)
  quizQuestionsJson?: string // JSON string for quiz questions
}

interface SessionNoteItem {
  noteId: string
  title: string
  content: string
  createdAt?: string | null
  updatedAt?: string | null
}

const parseUtcDateValue = (value?: string | null): Date | null => {
  if (!value) return null
  const raw = String(value).trim()
  if (!raw) return null

  const normalizedBase = raw.includes('T') ? raw : raw.replace(' ', 'T')
  const hasTimezone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(normalizedBase)
  const normalized = hasTimezone ? normalizedBase : `${normalizedBase}Z`
  const parsed = new Date(normalized)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

type SessionUiState = 'Running' | 'Paused' | 'Completed'

const readErrorCode = (error: any): string => {
  return String(
    error?.response?.data?.errorCode
    || error?.response?.data?.code
    || error?.response?.data?.data?.errorCode
    || ''
  ).toUpperCase()
}

const normalizeSessionUiState = (status: unknown): SessionUiState => {
  if (typeof status === 'number') {
    if (status === 0) return 'Running'
    if (status === 1) return 'Paused'
    return 'Completed'
  }

  const normalized = String(status ?? '').trim().toLowerCase()
  if (normalized === 'running') return 'Running'
  if (normalized === 'paused') return 'Paused'
  if (normalized === 'completedearly' || normalized === 'completedontime' || normalized === 'completedlate' || normalized === 'completed' || normalized === 'abandoned' || normalized === 'stopped') {
    return 'Completed'
  }

  return 'Running'
}

const toSafeNumber = (value: unknown): number | undefined => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const readRemainingSecondsFromSnapshot = (source: Partial<FocusSession> | null | undefined): number | undefined => {
  if (!source) return undefined

  const remainingSeconds = toSafeNumber(source.remainingSeconds)
  if (remainingSeconds != null) return Math.max(0, Math.floor(remainingSeconds))

  const remainingMinutes = toSafeNumber(source.remainingMinutes)
  if (remainingMinutes != null) return Math.max(0, Math.floor(remainingMinutes * 60))

  return undefined
}

const clampElapsedByPlan = (elapsedSeconds: number, plannedSeconds: number): number => {
  if (plannedSeconds <= 0) return Math.max(0, elapsedSeconds)
  return Math.max(0, Math.min(plannedSeconds, elapsedSeconds))
}

const FOCUS_SESSION_RUNNING_LOCK_KEY = 'focus_session_running_lock'
const FOCUS_SESSION_META_CACHE_KEY = 'focus_session_meta_cache_v1'
const FOCUS_SESSION_WORK_DRAFT_PREFIX = 'focus_session_work_draft_v1:'

interface FocusSessionMetaCacheItem {
  sessionId: string
  taskId?: string
  title?: string
  startTime?: string
  plannedDurationMinutes?: number
  updatedAtMs: number
}

interface FocusSessionWorkDraft {
  sessionId: string
  taskId?: string
  taskTypeNum: number
  code?: string
  theoryAnswer?: string
  quizAnswers?: Record<string, number>
  editorLanguage?: string
  updatedAtMs: number
}

const resolveTaskTypeNum = (taskType?: string | number): number => {
  if (typeof taskType === 'number') return taskType
  if (typeof taskType === 'string') {
    if (taskType === 'Theory') return 1
    if (taskType === 'Quizz' || taskType === 'Quiz') return 2
  }
  return 0
}

const buildFocusSessionWorkDraftKeys = (sessionId?: string | null, taskId?: string | null): string[] => {
  const keys: string[] = []
  if (sessionId) {
    keys.push(`${FOCUS_SESSION_WORK_DRAFT_PREFIX}session:${sessionId}`)
  }
  if (taskId) {
    keys.push(`${FOCUS_SESSION_WORK_DRAFT_PREFIX}task:${taskId}`)
  }
  return keys
}

const readFocusSessionWorkDraft = (keys: string[]): FocusSessionWorkDraft | null => {
  if (typeof window === 'undefined') return null

  for (const key of keys) {
    try {
      const raw = window.sessionStorage.getItem(key)
      if (!raw) continue
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object') continue

      return parsed as FocusSessionWorkDraft
    } catch {
      // ignore malformed draft and continue probing fallback keys
    }
  }

  return null
}

const writeFocusSessionWorkDraft = (key: string, draft: FocusSessionWorkDraft): void => {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(key, JSON.stringify(draft))
  } catch {
    // ignore storage write failures
  }
}

const clearFocusSessionWorkDraft = (keys: string[]): void => {
  if (typeof window === 'undefined') return
  for (const key of keys) {
    try {
      window.sessionStorage.removeItem(key)
    } catch {
      // ignore storage remove failures
    }
  }
}

const readFocusSessionMetaCache = (): Record<string, FocusSessionMetaCacheItem> => {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.sessionStorage.getItem(FOCUS_SESSION_META_CACHE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as Record<string, FocusSessionMetaCacheItem>
  } catch {
    return {}
  }
}

const writeFocusSessionMetaCache = (cache: Record<string, FocusSessionMetaCacheItem>) => {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(FOCUS_SESSION_META_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Ignore storage write failures.
  }
}

const findCachedMetaByTaskId = (cache: Record<string, FocusSessionMetaCacheItem>, taskId?: string): FocusSessionMetaCacheItem | null => {
  if (!taskId) return null
  let latest: FocusSessionMetaCacheItem | null = null
  for (const item of Object.values(cache)) {
    if (!item || item.taskId !== taskId) continue
    if (!latest || item.updatedAtMs > latest.updatedAtMs) {
      latest = item
    }
  }
  return latest
}

const mergeSessionWithCachedMeta = (source: FocusSession | null | undefined): FocusSession | null => {
  if (!source) return null

  const cache = readFocusSessionMetaCache()
  const byId = source.id ? cache[source.id] : null
  const byTask = findCachedMetaByTaskId(cache, source.taskId)
  const cached = byId ?? byTask

  if (!cached) return source

  return {
    ...source,
    title: source.title ?? cached.title ?? null,
    startTime: source.startTime ?? cached.startTime ?? '',
    plannedDurationMinutes: Number.isFinite(Number(source.plannedDurationMinutes))
      ? Number(source.plannedDurationMinutes)
      : Number(cached.plannedDurationMinutes ?? 0),
  }
}

const persistSessionMetaToCache = (source: FocusSession | null | undefined) => {
  if (!source?.id) return

  const title = String(source.title ?? '').trim()
  const startTime = String(source.startTime ?? '').trim()
  const plannedDurationMinutes = Number(source.plannedDurationMinutes)

  if (!title && !startTime && !Number.isFinite(plannedDurationMinutes)) return

  const cache = readFocusSessionMetaCache()
  const existing = cache[source.id]
  cache[source.id] = {
    sessionId: source.id,
    taskId: source.taskId || existing?.taskId,
    title: title || existing?.title,
    startTime: startTime || existing?.startTime,
    plannedDurationMinutes: Number.isFinite(plannedDurationMinutes)
      ? plannedDurationMinutes
      : existing?.plannedDurationMinutes,
    updatedAtMs: Date.now(),
  }
  writeFocusSessionMetaCache(cache)
}

const FocusSessionPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation('student')
  const syncDailyCheckin = useDailyCheckinActivitySync()

  // Get session data from navigation state
  const sessionData = location.state?.session as FocusSession | undefined
  const taskData = location.state?.task as TaskData | undefined
  const initialSessionData = mergeSessionWithCachedMeta(sessionData)
  const shouldAutoResumeOnMount = normalizeSessionUiState(initialSessionData?.sessionStatus) === 'Paused'

  const [session, setSession] = useState<FocusSession | null>(initialSessionData || null)
  const [task] = useState<TaskData | null>(taskData || null)
  const currentTaskTypeNum = React.useMemo(() => resolveTaskTypeNum(task?.taskType), [task?.taskType])
  const shouldPauseOnLeaveRef = useRef(true)
  const sessionIdRef = useRef<string | null>(initialSessionData?.id ?? null)
  const sessionUiStateRef = useRef<SessionUiState>('Running')
  const timerAnchorRef = useRef<{ remainingSeconds: number; elapsedSeconds: number; anchoredAtMs: number }>({
    remainingSeconds: 0,
    elapsedSeconds: 0,
    anchoredAtMs: Date.now(),
  })

  // Scroll to top when component mounts
  React.useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }, [])

  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [sessionUiState, setSessionUiState] = useState<SessionUiState>('Running')
  const [sessionActionLoading, setSessionActionLoading] = useState<'pause' | 'resume' | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null)
  const [showCompleteDialog, setShowCompleteDialog] = useState<boolean>(false)
  const [aiReviewLoading, setAiReviewLoading] = useState<boolean>(false)
  const [aiReview, setAiReview] = useState<{ feedback: string, score?: number } | null>(null)
  const [isAiReviewModalOpen, setIsAiReviewModalOpen] = useState<boolean>(false)
  const [finalSubmissionResult, setFinalSubmissionResult] = useState<{ feedback: string; score?: number; taskCompleted: boolean; message?: string } | null>(null)
  const [isFinalSubmissionModalOpen, setIsFinalSubmissionModalOpen] = useState<boolean>(false)
  const [isTaskReviewRequestModalOpen, setIsTaskReviewRequestModalOpen] = useState<boolean>(false)
  const [shouldPromptTaskReviewAfterComplete, setShouldPromptTaskReviewAfterComplete] = useState(false)
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false)
  const [dailyCheckinPopup, setDailyCheckinPopup] = useState<{ message: string; currentStreak: number; mood?: string | null; productivity?: number | null } | null>(null)
  const [noteTitle, setNoteTitle] = useState<string>('')
  const [noteContent, setNoteContent] = useState<string>('')
  const [noteLoading, setNoteLoading] = useState<boolean>(false)
  const [isNoteWidgetOpen, setIsNoteWidgetOpen] = useState<boolean>(false)
  const [sessionNotes, setSessionNotes] = useState<SessionNoteItem[]>([])
  const [isSessionNotesOpen, setIsSessionNotesOpen] = useState<boolean>(false)
  const [selectedSessionNoteId, setSelectedSessionNoteId] = useState<string | null>(null)
  const [sessionNotesLoading, setSessionNotesLoading] = useState<boolean>(false)
  const [isSessionNotesModalOpen, setIsSessionNotesModalOpen] = useState<boolean>(false)
  const [selectedSessionNoteDetail, setSelectedSessionNoteDetail] = useState<SessionNoteItem | null>(null)
  const [isSessionNoteDetailModalOpen, setIsSessionNoteDetailModalOpen] = useState<boolean>(false)
  const [noteWidgetPosition, setNoteWidgetPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const noteWidgetCollapsedPositionRef = useRef<{ x: number; y: number } | null>(null)
  const noteWidgetDragRef = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    moved: false,
  })

  // Code editor state for practice tasks
  const [code, setCode] = useState<string>('')
  const [editorLanguage, setEditorLanguage] = useState<string>('javascript')

  // Theory form state
  const [theoryAnswers, setTheoryAnswers] = useState<Record<string, string>>({})

  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({})
  const hydratedProgressSessionIdRef = useRef<string | null>(null)
  const hydratedDraftSessionIdRef = useRef<string | null>(null)
  const heartbeatWarningShownRef = useRef(false)
  const isSyncingActiveSessionRef = useRef(false)
  const lastServerRemainingSecondsRef = useRef<number | null>(readRemainingSecondsFromSnapshot(initialSessionData) ?? null)
  const lastLocalPausedRemainingSecondsRef = useRef<number | null>(readRemainingSecondsFromSnapshot(initialSessionData) ?? null)
  const timeRemainingRef = useRef<number>(readRemainingSecondsFromSnapshot(initialSessionData) ?? 0)
  const autoResumeAttemptedRef = useRef<boolean>(false)
  const resumeTransitionIntervalRef = useRef<number | null>(null)
  const handleCompleteSessionRef = useRef<((submissionType: 0 | 1 | 2, isEarlyCompletion?: boolean) => Promise<void>) | null>(null)
  const initialServerHydrationRef = useRef<boolean>(false)
  const isRunning = sessionUiState === 'Running'
  const shouldBlockNavigation = Boolean(session?.id && sessionUiState === 'Running' && shouldPauseOnLeaveRef.current)
  const navigationBlocker = useBlocker(shouldBlockNavigation)

  useEffect(() => {
    sessionIdRef.current = session?.id ?? null
  }, [session?.id])

  useEffect(() => {
    sessionUiStateRef.current = sessionUiState
  }, [sessionUiState])

  useEffect(() => {
    if (!session) return
    persistSessionMetaToCache(session)
  }, [session?.id, session?.taskId, session?.title, session?.startTime, session?.plannedDurationMinutes])

  useEffect(() => {
    if (!session?.id) return
    if (String(session.title ?? '').trim()) return
    const taskTitle = String(task?.title ?? '').trim()
    if (!taskTitle) return

    setSession((prev) => {
      if (!prev) return prev
      if (String(prev.title ?? '').trim()) return prev
      return { ...prev, title: taskTitle }
    })
  }, [session?.id, session?.title, task?.title])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (session?.id && sessionUiState === 'Running' && shouldPauseOnLeaveRef.current) {
      window.sessionStorage.setItem(FOCUS_SESSION_RUNNING_LOCK_KEY, session.id)
      return
    }
    window.sessionStorage.removeItem(FOCUS_SESSION_RUNNING_LOCK_KEY)
  }, [session?.id, sessionUiState])

  useEffect(() => {
    return () => {
      if (typeof window === 'undefined') return
      window.sessionStorage.removeItem(FOCUS_SESSION_RUNNING_LOCK_KEY)
    }
  }, [])

  useEffect(() => {
    timeRemainingRef.current = timeRemaining
  }, [timeRemaining])

  useEffect(() => {
    if (navigationBlocker.state !== 'blocked') return
    setToast({ message: t('focusSession.mustPauseBeforeLeaving'), type: 'warning' })
    navigationBlocker.reset()
  }, [navigationBlocker, t])

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (sessionUiStateRef.current !== 'Running') return
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (resumeTransitionIntervalRef.current != null) {
        window.clearInterval(resumeTransitionIntervalRef.current)
        resumeTransitionIntervalRef.current = null
      }
    }
  }, [])

  // Helper function to format quiz answers for API
  const formatQuizAnswers = (): string => {
    try {
      // Convert quizAnswers object to simple array of answer indices
      // Example: {q0: 1, q1: 0, q2: 1} -> "[1, 0, 1]"
      const answersArray: number[] = []

      // Get all question indices and sort them to ensure correct order
      const questionKeys = Object.keys(quizAnswers).sort((a, b) => {
        const aIndex = parseInt(a.replace('q', ''))
        const bIndex = parseInt(b.replace('q', ''))
        return aIndex - bIndex
      })

      // Build array with answer indices in correct order
      questionKeys.forEach(questionKey => {
        const answerIndex = quizAnswers[questionKey]
        answersArray.push(answerIndex)
      })

      const result = JSON.stringify(answersArray)
      return result
    } catch (error) {
      return JSON.stringify([])
    }
  }

  const taskReviewRequestSession = React.useMemo<TaskReviewRequestSession | null>(() => {
    if (!session?.id) return null

    return {
      sessionId: String(session.id),
      taskId: String(session.taskId || task?.taskId || task?.id || ''),
      taskTitle: task?.title || session.title || null,
      title: session.title || task?.title || '',
      submittedCode: currentTaskTypeNum === 0 ? code : (session.submittedCode ?? null),
      submittedSummary: currentTaskTypeNum === 1 ? (theoryAnswers.answer || '') : (session.submittedSummary ?? null),
      submittedQuizAnswers: currentTaskTypeNum === 2 ? formatQuizAnswers() : (session.submittedQuizAnswers ?? null),
    }
  }, [
    code,
    currentTaskTypeNum,
    formatQuizAnswers,
    session?.id,
    session?.submittedCode,
    session?.submittedQuizAnswers,
    session?.submittedSummary,
    session?.taskId,
    session?.title,
    task?.id,
    task?.taskId,
    task?.title,
    theoryAnswers.answer,
  ])

  const canRequestMentorReviewAfterComplete = React.useMemo(() => {
    if (!finalSubmissionResult || !taskReviewRequestSession) return false
    return hasTaskReviewSubmission(taskReviewRequestSession)
  }, [finalSubmissionResult, taskReviewRequestSession])

  const parseSubmittedQuizAnswers = (value: unknown): Record<string, number> => {
    if (value == null) return {}

    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value

      if (Array.isArray(parsed)) {
        return parsed.reduce<Record<string, number>>((acc, item, idx) => {
          const answerIndex = Number(item)
          if (Number.isFinite(answerIndex) && answerIndex >= 0) {
            acc[`q${idx}`] = answerIndex
          }
          return acc
        }, {})
      }

      if (parsed && typeof parsed === 'object') {
        return Object.entries(parsed as Record<string, unknown>).reduce<Record<string, number>>((acc, [key, item]) => {
          const answerIndex = Number(item)
          if (Number.isFinite(answerIndex) && answerIndex >= 0) {
            const normalizedKey = key.startsWith('q') ? key : `q${key}`
            acc[normalizedKey] = answerIndex
          }
          return acc
        }, {})
      }
    } catch {
      return {}
    }

    return {}
  }

  const renderAiReviewModal = () => {
    if (!aiReview) return null

    return (
      <AnimatePresence>
        {isAiReviewModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsAiReviewModalOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.64)',
              backdropFilter: 'blur(3px)',
              zIndex: 100090,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 26, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 'min(760px, 100%)',
                maxHeight: '82vh',
                borderRadius: 14,
                overflow: 'hidden',
                border: '1px solid color-mix(in oklab, var(--accent-primary) 40%, var(--border-base))',
                background: 'linear-gradient(160deg, color-mix(in oklab, var(--bg-surface) 92%, var(--accent-primary)) 0%, var(--bg-surface) 58%, var(--bg-main) 100%)',
                boxShadow: '0 24px 70px rgba(2, 6, 23, 0.42)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{
                padding: '14px 16px',
                borderBottom: '1px solid var(--border-base)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                background: 'color-mix(in oklab, var(--bg-surface) 70%, var(--accent-primary))'
              }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
                  <Bot size={16} />
                  {t('focusSession.aiFeedback')}
                </div>

                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  {aiReview.score !== undefined && (
                    <span style={{
                      padding: '4px 10px',
                      background: aiReview.score >= 80 ? 'var(--success-primary)' : aiReview.score >= 60 ? 'var(--warning-primary)' : 'var(--danger-primary)',
                      color: 'white',
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: '0.2px'
                    }}>
                      {t('focusSession.verificationScoreLabel')}: {aiReview.score}/100
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsAiReviewModalOpen(false)}
                    style={{
                      border: '1px solid var(--border-base)',
                      borderRadius: 8,
                      background: 'var(--bg-main)',
                      color: 'var(--text-primary)',
                      padding: '6px 10px',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {t('focusSession.noteModalClose')}
                  </button>
                </div>
              </div>

              <div style={{ padding: 16, overflow: 'auto' }}>
                <div style={{
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-base)',
                  borderRadius: 10,
                  padding: 14,
                  minHeight: 150,
                }}>
                  {aiReview.feedback}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    )
  }

  const renderFinalSubmissionModal = () => {
    if (!finalSubmissionResult) return null

    const isPass = finalSubmissionResult.taskCompleted

    return (
      <AnimatePresence>
        {isFinalSubmissionModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={navigateBackToDetail}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.64)',
              backdropFilter: 'blur(3px)',
              zIndex: 100091,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 26, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 'min(760px, 100%)',
                maxHeight: '82vh',
                borderRadius: 14,
                overflow: 'hidden',
                border: `1px solid ${isPass ? 'var(--success-primary)' : 'var(--danger-primary)'}`,
                background: 'linear-gradient(160deg, color-mix(in oklab, var(--bg-surface) 92%, var(--accent-primary)) 0%, var(--bg-surface) 58%, var(--bg-main) 100%)',
                boxShadow: '0 24px 70px rgba(2, 6, 23, 0.42)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{
                padding: '14px 16px',
                borderBottom: '1px solid var(--border-base)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                background: 'color-mix(in oklab, var(--bg-surface) 70%, var(--accent-primary))'
              }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
                  <Bot size={16} />
                  {t('focusSession.aiFeedback')}
                </div>

                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    padding: '4px 10px',
                    background: isPass ? 'var(--success-primary)' : 'var(--danger-primary)',
                    color: 'white',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '0.2px'
                  }}>
                    {isPass ? t('focusSession.finalPassBadge') : t('focusSession.finalFailBadge')}
                  </span>

                  {finalSubmissionResult.score !== undefined && (
                    <span style={{
                      padding: '4px 10px',
                      background: finalSubmissionResult.score >= 70 ? 'var(--success-primary)' : 'var(--danger-primary)',
                      color: 'white',
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: '0.2px'
                    }}>
                      {t('focusSession.verificationScoreLabel')}: {finalSubmissionResult.score}/100
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={navigateBackToDetail}
                    style={{
                      border: '1px solid var(--border-base)',
                      borderRadius: 8,
                      background: 'var(--bg-main)',
                      color: 'var(--text-primary)',
                      padding: '6px 10px',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {t('focusSession.noteModalClose')}
                  </button>
                </div>
              </div>

              <div style={{ padding: 16, overflow: 'auto', display: 'grid', gap: 12 }}>
                {finalSubmissionResult.message && (
                  <div style={{
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-base)',
                    borderRadius: 10,
                    padding: '10px 12px'
                  }}>
                    {finalSubmissionResult.message}
                  </div>
                )}

                <div style={{
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-base)',
                  borderRadius: 10,
                  padding: 14,
                  minHeight: 150,
                }}>
                  {finalSubmissionResult.feedback}
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  {canRequestMentorReviewAfterComplete && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsFinalSubmissionModalOpen(false)
                        setIsTaskReviewRequestModalOpen(true)
                      }}
                      style={{
                        border: 'none',
                        borderRadius: 8,
                        background: shouldPromptTaskReviewAfterComplete ? 'var(--warning-primary)' : 'var(--accent-primary)',
                        color: 'white',
                        padding: '8px 12px',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {shouldPromptTaskReviewAfterComplete
                        ? t('focusSession.continueToMentorReviewButton')
                        : t('focusSession.mentorReviewButton')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={navigateBackToDetail}
                    style={{
                      border: '1px solid var(--border-base)',
                      borderRadius: 8,
                      background: 'var(--bg-main)',
                      color: 'var(--text-primary)',
                      padding: '8px 12px',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {t('focusSession.backToPlans')}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    )
  }

  // Focus mode toggle
  const toggleFocusMode = async () => {
    if (!isFocusMode) {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen().catch(() => {})
      }
      setIsFocusMode(true)
    } else {
      if (document.exitFullscreen && document.fullscreenElement) {
        await document.exitFullscreen().catch(() => {})
      }
      setIsFocusMode(false)
    }
  }

  // Handle ESC key or exiting fullscreen manually
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFocusMode) {
        setIsFocusMode(false)
      }
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [isFocusMode])

  const clampNoteWidgetPosition = React.useCallback((x: number, y: number) => {
    const minX = 16
    const minY = 16
    // Keep enough visible width for the note bubble button so it is easy to spot and click.
    const maxX = window.innerWidth - 180
    const maxY = window.innerHeight - 110

    return {
      x: Math.max(minX, Math.min(x, maxX)),
      y: Math.max(minY, Math.min(y, maxY)),
    }
  }, [])

  const getExpandedNoteWidgetCenterPosition = React.useCallback(() => {
    const panelWidth = Math.min(620, window.innerWidth - 24)
    const panelHeight = Math.min(Math.floor(window.innerHeight * 0.75), 560)
    const centeredX = (window.innerWidth - panelWidth) / 2
    const centeredY = (window.innerHeight - panelHeight) / 2
    return clampNoteWidgetPosition(centeredX, centeredY)
  }, [clampNoteWidgetPosition])

  useEffect(() => {
    if (noteWidgetPosition.x !== 0 || noteWidgetPosition.y !== 0) return
    const initial = clampNoteWidgetPosition(window.innerWidth - 210, window.innerHeight - 170)
    setNoteWidgetPosition(initial)
  }, [clampNoteWidgetPosition, noteWidgetPosition.x, noteWidgetPosition.y])

  useEffect(() => {
    if (isNoteWidgetOpen) return
    if (noteWidgetPosition.x === 0 && noteWidgetPosition.y === 0) return
    noteWidgetCollapsedPositionRef.current = noteWidgetPosition
  }, [isNoteWidgetOpen, noteWidgetPosition])

  useEffect(() => {
    const handleMove = (event: MouseEvent) => {
      if (!noteWidgetDragRef.current.dragging) return

      const deltaX = event.clientX - noteWidgetDragRef.current.startX
      const deltaY = event.clientY - noteWidgetDragRef.current.startY

      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        noteWidgetDragRef.current.moved = true
      }

      const next = clampNoteWidgetPosition(
        noteWidgetDragRef.current.originX + deltaX,
        noteWidgetDragRef.current.originY + deltaY
      )
      setNoteWidgetPosition(next)
    }

    const handleUp = () => {
      noteWidgetDragRef.current.dragging = false
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [clampNoteWidgetPosition])

  const startNoteWidgetDrag = (clientX: number, clientY: number) => {
    noteWidgetDragRef.current.dragging = true
    noteWidgetDragRef.current.startX = clientX
    noteWidgetDragRef.current.startY = clientY
    noteWidgetDragRef.current.originX = noteWidgetPosition.x
    noteWidgetDragRef.current.originY = noteWidgetPosition.y
    noteWidgetDragRef.current.moved = false
  }

  const handleNoteBubbleMouseDown = (event: React.MouseEvent<HTMLButtonElement>) => {
    startNoteWidgetDrag(event.clientX, event.clientY)
  }

  const handleNotePanelMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    startNoteWidgetDrag(event.clientX, event.clientY)
  }

  const handleToggleNoteWidget = () => {
    if (noteWidgetDragRef.current.moved) {
      noteWidgetDragRef.current.moved = false
      return
    }

    if (!isNoteWidgetOpen) {
      noteWidgetCollapsedPositionRef.current = {
        x: noteWidgetPosition.x,
        y: noteWidgetPosition.y,
      }
      setNoteWidgetPosition(getExpandedNoteWidgetCenterPosition())
      setIsNoteWidgetOpen(true)
      return
    }

    const collapsedPosition = noteWidgetCollapsedPositionRef.current
    if (collapsedPosition) {
      setNoteWidgetPosition(clampNoteWidgetPosition(collapsedPosition.x, collapsedPosition.y))
    }
    setIsNoteWidgetOpen(false)
  }

  const handleOpenSavedNotesModal = () => {
    setIsSessionNotesModalOpen(true)
    setSelectedSessionNoteId((prev) => prev ?? (sessionNotes[0]?.noteId || null))
    setSelectedSessionNoteDetail(null)
  }

  const handleCloseSavedNotesModal = () => {
    setIsSessionNotesModalOpen(false)
  }

  const handleCloseNoteDetailModal = () => {
    setIsSessionNoteDetailModalOpen(false)
  }

  const handleSelectSessionNote = (noteId: string) => {
    if (!noteId) return

    setSelectedSessionNoteId(noteId)
    const selected = sessionNotes.find((note) => note.noteId === noteId) || null
    setSelectedSessionNoteDetail(selected)
    setIsSessionNoteDetailModalOpen(Boolean(selected))
  }

  const getAnchorFromSession = React.useCallback((source: FocusSession, normalizedState?: SessionUiState) => {
    const plannedSeconds = Math.max(0, Math.floor((Number(source.plannedDurationMinutes) || 0) * 60))
    const elapsedFromSeconds = toSafeNumber(source.elapsedSeconds)
    const elapsedFromMinutes = toSafeNumber(source.elapsedMinutes)
    const remainingFromSeconds = toSafeNumber(source.remainingSeconds)
    const remainingFromMinutes = toSafeNumber(source.remainingMinutes)

    let elapsedSeconds = elapsedFromSeconds ?? (elapsedFromMinutes != null ? Math.floor(elapsedFromMinutes * 60) : undefined)
    let remainingSeconds = remainingFromSeconds ?? (remainingFromMinutes != null ? Math.floor(remainingFromMinutes * 60) : undefined)

    if (remainingSeconds == null && elapsedSeconds != null && plannedSeconds > 0) {
      remainingSeconds = Math.max(0, plannedSeconds - elapsedSeconds)
    }
    if (elapsedSeconds == null && remainingSeconds != null && plannedSeconds > 0) {
      elapsedSeconds = Math.max(0, plannedSeconds - remainingSeconds)
    }

    if (elapsedSeconds == null || remainingSeconds == null) {
      if (normalizedState === 'Paused') {
        const pausedRemaining = lastServerRemainingSecondsRef.current
          ?? lastLocalPausedRemainingSecondsRef.current
          ?? timeRemainingRef.current
          ?? 0
        const safePausedRemaining = Math.max(0, Math.floor(pausedRemaining))
        remainingSeconds = remainingSeconds ?? safePausedRemaining
        const pausedElapsed = plannedSeconds > 0
          ? plannedSeconds - safePausedRemaining
          : (elapsedSeconds ?? 0)
        elapsedSeconds = elapsedSeconds ?? clampElapsedByPlan(pausedElapsed, plannedSeconds)
      }
    }

    if (elapsedSeconds == null || remainingSeconds == null) {
      const startTimeMs = parseUtcDateValue(source.startTime)?.getTime() ?? Date.now()
      const elapsedByClock = Math.max(0, Math.floor((Date.now() - startTimeMs) / 1000))
      const computedRemaining = Math.max(0, plannedSeconds - elapsedByClock)
      elapsedSeconds = elapsedSeconds ?? clampElapsedByPlan(elapsedByClock, plannedSeconds)
      remainingSeconds = remainingSeconds ?? computedRemaining
    }

    return {
      elapsedSeconds: Math.max(0, Math.floor(elapsedSeconds ?? 0)),
      remainingSeconds: Math.max(0, Math.floor(remainingSeconds ?? 0)),
    }
  }, [])

  const applySessionSnapshot = React.useCallback((nextSession: FocusSession, forcedState?: SessionUiState) => {
    const mergedSession = mergeSessionWithCachedMeta(nextSession) ?? nextSession
    const normalizedState = forcedState ?? normalizeSessionUiState(mergedSession.sessionStatus)
    const anchor = getAnchorFromSession(mergedSession, normalizedState)

    timerAnchorRef.current = {
      remainingSeconds: anchor.remainingSeconds,
      elapsedSeconds: anchor.elapsedSeconds,
      anchoredAtMs: Date.now(),
    }

    setSession(mergedSession)
    setSessionUiState(anchor.remainingSeconds <= 0 ? 'Completed' : normalizedState)
    setTimeRemaining(anchor.remainingSeconds)
    lastServerRemainingSecondsRef.current = anchor.remainingSeconds
    persistSessionMetaToCache(mergedSession)
    if (normalizedState === 'Paused') {
      lastLocalPausedRemainingSecondsRef.current = anchor.remainingSeconds
    }

    if (anchor.remainingSeconds <= 0 || normalizedState === 'Completed') {
      shouldPauseOnLeaveRef.current = false
    }
  }, [getAnchorFromSession])

  const syncSessionFromServer = React.useCallback(async (reason: 'status_mismatch' | 'heartbeat_invalid' | 'drift' | 'reconnect' | 'visibility') => {
    if (!session?.taskId) return
    if (isSyncingActiveSessionRef.current) return

    isSyncingActiveSessionRef.current = true
    try {
      const active = await FocusSessionService.getActiveSession(session.taskId)
      if (!active) {
        setSessionUiState('Completed')
        if (!heartbeatWarningShownRef.current) {
          heartbeatWarningShownRef.current = true
          setToast({ message: t('focusSession.sessionNotActive'), type: 'warning' })
        }
        return
      }

      heartbeatWarningShownRef.current = false
      const activeState = normalizeSessionUiState(active.sessionStatus)
      const activeRemaining = readRemainingSecondsFromSnapshot(active)

      if (activeRemaining != null) {
        applySessionSnapshot(active)
      } else {
        // Active-by-taskId payload can miss remainingSeconds.
        // In that case, keep current timer anchor to avoid drift from inferred fallback.
        setSession((prev) => ({ ...(prev ?? {}), ...(active as any) } as FocusSession))
        if (activeState === 'Completed') {
          setSessionUiState('Completed')
          shouldPauseOnLeaveRef.current = false
        } else if (activeState === 'Paused') {
          setSessionUiState('Paused')
          lastLocalPausedRemainingSecondsRef.current = Math.max(0, timeRemainingRef.current)
        } else {
          setSessionUiState('Running')
        }
      }

      if (reason === 'status_mismatch' || reason === 'heartbeat_invalid' || reason === 'reconnect') {
        setToast({ message: t('focusSession.sessionResynced'), type: 'warning' })
      }
    } catch {
      // Keep local state; next heartbeat/drift cycle will retry.
    } finally {
      isSyncingActiveSessionRef.current = false
    }
  }, [applySessionSnapshot, session?.taskId, t])

  useEffect(() => {
    if (!session?.id) return
    if (initialServerHydrationRef.current) return

    initialServerHydrationRef.current = true
    let cancelled = false

    void (async () => {
      try {
        const latest = await FocusSessionService.getSession(session.id)
        if (cancelled || !latest) return

        const inferredState: SessionUiState = latest.endTime
          ? 'Completed'
          : latest.sessionStatus != null
            ? normalizeSessionUiState(latest.sessionStatus)
            : latest.isActive === false
              ? 'Paused'
              : 'Running'

        applySessionSnapshot({ ...latest, sessionStatus: inferredState }, inferredState)
      } catch {
        // Keep navigation-state snapshot when server hydration fails.
      }
    })()

    return () => {
      cancelled = true
    }
  }, [applySessionSnapshot, session?.id])

  useEffect(() => {
    if (!session) return
    applySessionSnapshot(session)
  }, [applySessionSnapshot, session?.id])

  useEffect(() => {
    if (!session?.id || sessionUiState !== 'Running') return

    const intervalId = window.setInterval(() => {
      if (sessionUiStateRef.current !== 'Running') {
        return
      }

      const elapsedSinceAnchor = Math.max(0, Math.floor((Date.now() - timerAnchorRef.current.anchoredAtMs) / 1000))
      const remaining = Math.max(0, timerAnchorRef.current.remainingSeconds - elapsedSinceAnchor)
      setTimeRemaining(remaining)

      if (remaining <= 0) {
        setSessionUiState('Completed')
        shouldPauseOnLeaveRef.current = false
        // Auto-submit: save progress when time runs out (not early completion)
        handleCompleteSessionRef.current?.(0, false)
      }
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [session?.id, sessionUiState, t])

  useEffect(() => {
    if (sessionUiState !== 'Paused') return

    timerAnchorRef.current = {
      ...timerAnchorRef.current,
      remainingSeconds: Math.max(0, timeRemaining),
      anchoredAtMs: Date.now(),
    }
  }, [sessionUiState, timeRemaining])

  useEffect(() => {
    if (!session?.id || (sessionUiState !== 'Running' && sessionUiState !== 'Paused')) return

    let stopped = false

    const sendHeartbeat = async () => {
      if (stopped || !session?.id) return
      if (!navigator.onLine) return

      try {
        await FocusSessionService.sendHeartbeat(session.id)
      } catch (error: any) {
        const code = readErrorCode(error)
        if (code === 'SESSION_NOT_ACTIVE' || code === 'SESSION_NOT_FOUND') {
          stopped = true
          void syncSessionFromServer('heartbeat_invalid')
        }
      }
    }

    const runHeartbeat = () => {
      void sendHeartbeat()
    }

    runHeartbeat()
    const intervalId = window.setInterval(runHeartbeat, 45000)
    return () => {
      stopped = true
      window.clearInterval(intervalId)
    }
  }, [session?.id, sessionUiState, syncSessionFromServer])

  useEffect(() => {
    if (!session?.taskId || (sessionUiState !== 'Running' && sessionUiState !== 'Paused')) return

    const intervalId = window.setInterval(() => {
      void syncSessionFromServer('drift')
    }, 120000)

    const onOnline = () => {
      void syncSessionFromServer('reconnect')
    }

    window.addEventListener('online', onOnline)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('online', onOnline)
    }
  }, [session?.taskId, sessionUiState, syncSessionFromServer])

  const handlePauseSession = async () => {
    if (!session?.id) return
    if (sessionActionLoading) return

    const frozenRemaining = Math.max(0, timeRemaining)
    timerAnchorRef.current = {
      ...timerAnchorRef.current,
      remainingSeconds: frozenRemaining,
      anchoredAtMs: Date.now(),
    }
    setTimeRemaining(frozenRemaining)
    setSessionUiState('Paused')

    setSessionActionLoading('pause')
    try {
      const paused = await FocusSessionService.pauseSession(session.id)

      const hasRemainingAnchor = paused.remainingSeconds != null || paused.remainingMinutes != null
      const pauseSnapshot: FocusSession = hasRemainingAnchor
        ? paused
        : {
            ...paused,
            remainingSeconds: Math.max(0, timeRemaining),
            elapsedSeconds: Math.max(0, session.plannedDurationMinutes * 60 - Math.max(0, timeRemaining)),
          }

      applySessionSnapshot(pauseSnapshot, 'Paused')
      const pausedRemaining = readRemainingSecondsFromSnapshot(pauseSnapshot)
      if (pausedRemaining != null) {
        lastServerRemainingSecondsRef.current = pausedRemaining
        lastLocalPausedRemainingSecondsRef.current = pausedRemaining
      }
      setToast({ message: t('focusSession.pauseSuccess'), type: 'success' })
    } catch (error: any) {
      if (readErrorCode(error) === 'SESSION_NOT_RUNNING') {
        await syncSessionFromServer('status_mismatch')
      } else {
        setSessionUiState('Running')
        const msg = error?.response?.data?.message || error?.message || t('focusSession.pauseError')
        setToast({ message: msg, type: 'error' })
      }
    } finally {
      setSessionActionLoading(null)
    }
  }

  const resumeFromServer = React.useCallback(async (sessionId: string, showSuccessToast = true) => {
    const smoothAdjustTimer = async (fromSeconds: number, toSeconds: number): Promise<void> => {
      const from = Math.max(0, Math.floor(fromSeconds))
      const to = Math.max(0, Math.floor(toSeconds))

      if (from === to) {
        setTimeRemaining(to)
        return
      }

      if (resumeTransitionIntervalRef.current != null) {
        window.clearInterval(resumeTransitionIntervalRef.current)
        resumeTransitionIntervalRef.current = null
      }

      await new Promise<void>((resolve) => {
        const steps = 8
        let step = 0
        const delta = to - from

        resumeTransitionIntervalRef.current = window.setInterval(() => {
          step += 1
          const progress = step / steps
          const easedProgress = 1 - Math.pow(1 - progress, 2)
          const nextValue = Math.round(from + delta * easedProgress)

          setTimeRemaining(nextValue)

          if (step >= steps) {
            if (resumeTransitionIntervalRef.current != null) {
              window.clearInterval(resumeTransitionIntervalRef.current)
              resumeTransitionIntervalRef.current = null
            }
            setTimeRemaining(to)
            resolve()
          }
        }, 45)
      })
    }

    const localBeforeResume = timeRemainingRef.current
    const resumed = await FocusSessionService.resumeSession(sessionId)
    let serverRemaining = readRemainingSecondsFromSnapshot(resumed)

    console.groupCollapsed('[FocusSession][Resume] payload check')
    console.log('sessionId:', sessionId)
    console.log('localBeforeResume(seconds):', localBeforeResume)
    console.log('resumeResponse:', resumed)
    console.log('remainingSecondsFromResume:', resumed?.remainingSeconds)
    console.log('remainingMinutesFromResume:', resumed?.remainingMinutes)
    console.log('parsedRemainingFromResume:', serverRemaining)

    if (serverRemaining == null && session?.taskId) {
      const active = await FocusSessionService.getActiveSession(session.taskId)
      serverRemaining = readRemainingSecondsFromSnapshot(active)
      console.log('fallbackActiveResponse:', active)
      console.log('remainingSecondsFromActive:', active?.remainingSeconds)
      console.log('remainingMinutesFromActive:', active?.remainingMinutes)
      console.log('parsedRemainingFromActive:', serverRemaining)
    }

    if (serverRemaining == null) {
      console.warn('[FocusSession][Resume] remainingSeconds is missing after resume and active fallback')
      console.groupEnd()
      throw new Error('MISSING_REMAINING_SECONDS_FROM_SERVER')
    }

    const chosenRemaining = serverRemaining
    const plannedSeconds = Math.max(0, Math.floor((Number(resumed.plannedDurationMinutes ?? session?.plannedDurationMinutes) || 0) * 60))

    const diffBeforeApply = Math.abs(localBeforeResume - chosenRemaining)
    if (diffBeforeApply > 0) {
      await smoothAdjustTimer(localBeforeResume, chosenRemaining)
    }

    const resumeSnapshot: FocusSession = {
      ...resumed,
      remainingSeconds: Math.max(0, chosenRemaining),
      elapsedSeconds: Math.max(0, plannedSeconds - Math.max(0, chosenRemaining)),
    }

    applySessionSnapshot(resumeSnapshot, 'Running')
    lastServerRemainingSecondsRef.current = chosenRemaining
    console.log('chosenRemainingAppliedToTimer:', chosenRemaining)
    console.log('diffBeforeApply(local-server):', diffBeforeApply)
    queueMicrotask(() => {
      console.log('timeRemainingAfterApply(ref, microtask):', timeRemainingRef.current)
      console.groupEnd()
    })

    if (showSuccessToast) {
      setToast({ message: t('focusSession.resumeSuccess'), type: 'success' })
    }
  }, [applySessionSnapshot, session?.plannedDurationMinutes, session?.taskId, t])

  useEffect(() => {
    if (!shouldAutoResumeOnMount) return
    if (!session?.id) return
    if (autoResumeAttemptedRef.current) return

    autoResumeAttemptedRef.current = true
    setSessionActionLoading('resume')

    void (async () => {
      try {
        await resumeFromServer(session.id, false)
      } catch (error: any) {
        if (readErrorCode(error) === 'SESSION_NOT_PAUSED') {
          await syncSessionFromServer('status_mismatch')
        }
      } finally {
        setSessionActionLoading(null)
      }
    })()
  }, [resumeFromServer, session?.id, shouldAutoResumeOnMount, syncSessionFromServer])

  const handleResumeSession = async () => {
    if (!session?.id) return
    if (sessionActionLoading) return

    setSessionActionLoading('resume')
    try {
      await resumeFromServer(session.id, true)
    } catch (error: any) {
      if (readErrorCode(error) === 'SESSION_NOT_PAUSED') {
        await syncSessionFromServer('status_mismatch')
      } else {
        if (String(error?.message || '') === 'MISSING_REMAINING_SECONDS_FROM_SERVER') {
          await syncSessionFromServer('status_mismatch')
        }
        const msg = error?.response?.data?.message || error?.message || t('focusSession.resumeError')
        setToast({ message: msg, type: 'error' })
      }
    } finally {
      setSessionActionLoading(null)
    }
  }

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getSessionTypeColor = (type: SessionType): string => {
    return type === SessionType.Pomodoro ? 'var(--danger-primary)' : 'var(--accent-primary)'
  }

  const formatDateTime = (dateString: string): string => {
    const date = parseUtcDateValue(dateString)
    if (!date) return 'Invalid Date'

    return date.toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const normalizeSessionNote = (raw: any): SessionNoteItem | null => {
    if (!raw) return null

    const source = raw?.data ?? raw?.value ?? raw
    const noteId = String(source?.noteId ?? source?.id ?? '')
    const title = String(source?.title ?? '').trim()
    const content = String(source?.content ?? '').trim()

    if (!noteId && !title && !content) return null

    return {
      noteId: noteId || `${Date.now()}`,
      title: title || t('focusSession.noteUntitled'),
      content,
      createdAt: source?.createdAt ?? null,
      updatedAt: source?.updatedAt ?? null,
    }
  }

  const formatUtcPlus7DateTime = (value?: string | null): string => {
    if (!value) return t('focusSession.noteNoTime')
    const date = parseUtcDateValue(value)
    if (!date) return t('focusSession.noteNoTime')

    const locale = String((t('focusSession.localeCode', { defaultValue: 'vi-VN' })) || 'vi-VN')
    return new Intl.DateTimeFormat(locale, {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date)
  }

  const navigateBackToDetail = React.useCallback(() => {
    shouldPauseOnLeaveRef.current = false
    setIsFinalSubmissionModalOpen(false)
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate(ROUTER.MY_PLANS)
  }, [navigate])

  useEffect(() => {
    if (!session?.id) return

    let isMounted = true

    const fetchSessionNotes = async () => {
      setSessionNotesLoading(true)
      try {
        const rows = await FocusSessionService.getSessionNotes(session.id)
        if (!isMounted) return

        const normalized = rows
          .map((row: any) => normalizeSessionNote(row))
          .filter((note): note is SessionNoteItem => note != null)

        setSessionNotes(normalized)
        setSelectedSessionNoteId((prev) => prev ?? (normalized[0]?.noteId || null))
        setSelectedSessionNoteDetail(null)
      } catch {
        if (!isMounted) return
      } finally {
        if (isMounted) {
          setSessionNotesLoading(false)
        }
      }
    }

    fetchSessionNotes()
    return () => { isMounted = false }
  }, [session?.id])

  const handleCompleteNow = async () => {
    setShowCompleteDialog(true)
  }

  const handleCompleteSession = async (submissionType: 0 | 1 | 2, isEarlyCompletion = true) => {
    if (!session) return

    // Validate content before final submission
    if (submissionType === 1) {
      if (currentTaskTypeNum === 0 && !code.trim()) {
        setToast({ message: t('focusSession.emptySubmitError'), type: 'error' })
        setShowCompleteDialog(false)
        return
      }
      if (currentTaskTypeNum === 1 && !theoryAnswers.answer?.trim()) {
        setToast({ message: t('focusSession.emptySubmitErrorTheory'), type: 'error' })
        setShowCompleteDialog(false)
        return
      }
      if (currentTaskTypeNum === 2 && Object.keys(quizAnswers).length === 0) {
        setToast({ message: t('focusSession.emptySubmitErrorQuiz'), type: 'error' })
        setShowCompleteDialog(false)
        return
      }
    }

    setLoading(true)
    setShouldPromptTaskReviewAfterComplete(false)
    try {
      // Prepare payload based on submitType and taskType
      const payload: any = {
        submissionType: submissionType === 2 ? 0 : submissionType,
        isEarlyCompletion,
      }

      // Add task-specific data based on taskType
      if (currentTaskTypeNum === 0) {
        // Practice - send code
        payload.submittedCode = code
      } else if (currentTaskTypeNum === 1) {
        // Theory - send summary
        payload.submittedSummary = theoryAnswers.answer || ''
      } else if (currentTaskTypeNum === 2) {
        // Quiz - send quiz answers
        payload.submittedQuizAnswers = formatQuizAnswers()
      }

      // Call complete session API
      const preActionStatus = submissionType === 1
        ? await DailyCheckinService.getDailyCheckinStatus().catch(() => null)
        : null
      const completeResult = await FocusSessionService.completeSession(session.id, payload)
      clearCurrentWorkDraft()
      shouldPauseOnLeaveRef.current = false

      setSession((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          id: completeResult.sessionId || prev.id,
          endTime: completeResult.endTime ?? prev.endTime ?? new Date().toISOString(),
          sessionStatus: completeResult.sessionStatus ?? 'Completed',
          submittedCode: payload.submittedCode ?? prev.submittedCode,
          submittedSummary: payload.submittedSummary ?? prev.submittedSummary,
          submittedQuizAnswers: payload.submittedQuizAnswers ?? prev.submittedQuizAnswers,
        }
      })

      setSessionUiState('Completed')
      setTimeRemaining(0)
      setShowCompleteDialog(false)

      const message = submissionType === 0
        ? t('focusSession.progressSaved')
        : (completeResult.message || t('focusSession.completed'))

      setToast({ message, type: 'success' })

      if (submissionType !== 1) {
        if (submissionType === 2) {
          setIsTaskReviewRequestModalOpen(true)
        } else {
          setTimeout(() => {
            navigateBackToDetail()
          }, 2000)
        }
        return
      }

      const isPass = Boolean(completeResult.taskCompleted)
      const scoreValue = completeResult.verificationScore == null ? undefined : Number(completeResult.verificationScore)
      const feedback = String(completeResult.aiFeedback || t('focusSession.reviewDefaultFeedback'))

      setFinalSubmissionResult({
        feedback,
        score: Number.isFinite(scoreValue as number) ? scoreValue : undefined,
        taskCompleted: isPass,
        message: completeResult.message || undefined,
      })
      setIsFinalSubmissionModalOpen(true)

      if (isPass) {
        const dailyCheckinResult = await syncDailyCheckin({ preActionStatus })
        if (dailyCheckinResult?.shouldShowPopup) {
          setDailyCheckinPopup({
            message: dailyCheckinResult.message,
            currentStreak: dailyCheckinResult.stats.currentStreak,
            mood: dailyCheckinResult.todayCheckin?.mood,
          })
        }
      }
    } catch (error: any) {
      setShouldPromptTaskReviewAfterComplete(false)
      const msg = error?.response?.data?.message || error?.message || t('focusSession.completeError')
      setToast({ message: msg, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // Keep ref in sync so timer interval can call it without stale closure
  handleCompleteSessionRef.current = handleCompleteSession

  const handleCancelComplete = () => {
    setShowCompleteDialog(false)
  }

  const handleTaskReviewSubmitted = React.useCallback((result: RequestTaskReviewResult, mentor: MentorDto) => {
    setIsTaskReviewRequestModalOpen(false)
    setIsFinalSubmissionModalOpen(false)
    setToast({
      message: t('focusSession.mentorReviewRequestedSuccess', {
        mentorName: mentor.fullName || mentor.username || mentor.mentorId,
      }),
      type: 'success',
    })
    navigate(ROUTER.TASK_REVIEW_DETAIL.replace(':reviewId', result.reviewId))
  }, [navigate, t])

  const handleAiReview = async () => {
    if (!session) return

    // Validate that we have content to review
    let hasContent = false
    if (currentTaskTypeNum === 0 && code.trim()) {
      hasContent = true
    } else if (currentTaskTypeNum === 1 && theoryAnswers.answer?.trim()) {
      hasContent = true
    } else if (currentTaskTypeNum === 2 && Object.keys(quizAnswers).length > 0) {
      hasContent = true
    }

    if (!hasContent) {
      setToast({
        message: t('focusSession.emptyContentWarning'),
        type: 'warning'
      })
      return
    }

    setAiReviewLoading(true)
    try {
      const payload: any = {}

      if (currentTaskTypeNum === 0) {
        // Practice - send code
        payload.submittedCode = code
      } else if (currentTaskTypeNum === 1) {
        // Theory - send summary
        payload.submittedSummary = theoryAnswers.answer || ''
      } else if (currentTaskTypeNum === 2) {
        // Quiz - send quiz answers
        payload.submittedQuizAnswers = formatQuizAnswers()
      }

      // Use FocusSessionService to call AI review API
      const reviewData = await FocusSessionService.getAiReview(session.id, payload)

      const reviewSource = reviewData?.value ?? reviewData?.data?.value ?? reviewData?.data ?? reviewData
      if (import.meta.env.DEV) {
        console.info('[FocusSession][AI Review] raw response:', reviewData)
        console.info('[FocusSession][AI Review] normalized source:', reviewSource)
      }

      const backendAiFeedback = reviewSource?.aiFeedback
      const backendFeedback = reviewSource?.feedback
      const backendMessage = reviewSource?.message ?? reviewData?.message
      const feedbackRaw = backendAiFeedback ?? backendFeedback ?? backendMessage
      const feedback = typeof feedbackRaw === 'string' && feedbackRaw.length > 0
        ? feedbackRaw
        : t('focusSession.reviewDefaultFeedback')
      const scoreRaw = reviewSource?.verificationScore ?? reviewSource?.score
      const scoreParsed = Number(scoreRaw)
      const score = Number.isFinite(scoreParsed) ? scoreParsed : undefined

      setAiReview({ feedback, score })
      setIsAiReviewModalOpen(true)
      setToast({ message: t('focusSession.reviewReceived'), type: 'success' })
    } catch (error: any) {
      // More detailed error handling
      let errorMsg = t('focusSession.reviewError')

      if (error?.response?.data?.message) {
        errorMsg = error.response.data.message
      } else if (error?.response?.data?.error) {
        errorMsg = error.response.data.error
      } else if (error?.message) {
        errorMsg = error.message
      }

      // Show error in AI review section for debugging
      setAiReview({
        feedback: `❌ ${t('focusSession.errorPrefix')}: ${errorMsg}\n\n${t('focusSession.errorDetail')}:\n${JSON.stringify(error?.response?.data || error?.message || 'Unknown error', null, 2)}`,
        score: undefined
      })
      setIsAiReviewModalOpen(true)

      setToast({ message: errorMsg, type: 'error' })
    } finally {
      setAiReviewLoading(false)
    }
  }

  useEffect(() => {
    if (!session?.id) return
    if (hydratedProgressSessionIdRef.current === session.id) return

    hydratedProgressSessionIdRef.current = session.id

    const draftKeys = buildFocusSessionWorkDraftKeys(session.id, session.taskId || task?.taskId)
    const draft = readFocusSessionWorkDraft(draftKeys)

    if (currentTaskTypeNum === 0) {
      const submitted = typeof session.submittedCode === 'string' ? session.submittedCode : ''
      if (submitted.trim().length > 0) {
        setCode(submitted)
      } else if (typeof draft?.code === 'string') {
        setCode(draft.code)
      }

      if (typeof draft?.editorLanguage === 'string' && draft.editorLanguage.trim().length > 0) {
        setEditorLanguage(draft.editorLanguage)
      }
      hydratedDraftSessionIdRef.current = session.id
      return
    }

    if (currentTaskTypeNum === 1) {
      const submitted = typeof session.submittedSummary === 'string' ? session.submittedSummary : ''
      if (submitted.trim().length > 0) {
        setTheoryAnswers((prev) => ({ ...prev, answer: submitted }))
      } else if (typeof draft?.theoryAnswer === 'string') {
        setTheoryAnswers((prev) => ({ ...prev, answer: draft.theoryAnswer ?? '' }))
      }
      hydratedDraftSessionIdRef.current = session.id
      return
    }

    if (currentTaskTypeNum === 2) {
      const parsedQuizAnswers = parseSubmittedQuizAnswers(session.submittedQuizAnswers)
      if (Object.keys(parsedQuizAnswers).length > 0) {
        setQuizAnswers(parsedQuizAnswers)
      } else if (draft?.quizAnswers && typeof draft.quizAnswers === 'object') {
        const normalizedDraftAnswers = Object.entries(draft.quizAnswers).reduce<Record<string, number>>((acc, [key, item]) => {
          const answerIndex = Number(item)
          if (Number.isFinite(answerIndex) && answerIndex >= 0) {
            const normalizedKey = key.startsWith('q') ? key : `q${key}`
            acc[normalizedKey] = answerIndex
          }
          return acc
        }, {})

        if (Object.keys(normalizedDraftAnswers).length > 0) {
          setQuizAnswers(normalizedDraftAnswers)
        }
      }
    }

    hydratedDraftSessionIdRef.current = session.id
  }, [currentTaskTypeNum, session?.id, session?.submittedCode, session?.submittedSummary, session?.submittedQuizAnswers, session?.taskId, task?.taskId])

  const clearCurrentWorkDraft = React.useCallback(() => {
    const draftKeys = buildFocusSessionWorkDraftKeys(session?.id, session?.taskId || task?.taskId)
    clearFocusSessionWorkDraft(draftKeys)
  }, [session?.id, session?.taskId, task?.taskId])

  useEffect(() => {
    if (!session?.id) return
    if (hydratedDraftSessionIdRef.current !== session.id) return
    if (sessionUiState === 'Completed') return

    const draftKeys = buildFocusSessionWorkDraftKeys(session.id, session.taskId || task?.taskId)
    const primaryKey = draftKeys[0]
    if (!primaryKey) return

    const draftPayload: FocusSessionWorkDraft = {
      sessionId: session.id,
      taskId: session.taskId || task?.taskId,
      taskTypeNum: currentTaskTypeNum,
      editorLanguage,
      updatedAtMs: Date.now(),
    }

    if (currentTaskTypeNum === 0) {
      draftPayload.code = code
    } else if (currentTaskTypeNum === 1) {
      draftPayload.theoryAnswer = theoryAnswers.answer || ''
    } else if (currentTaskTypeNum === 2) {
      draftPayload.quizAnswers = quizAnswers
    }

    writeFocusSessionWorkDraft(primaryKey, draftPayload)

    // Keep fallback key updated so draft survives changes in session identifier strategy.
    if (draftKeys.length > 1) {
      writeFocusSessionWorkDraft(draftKeys[1], draftPayload)
    }
  }, [code, currentTaskTypeNum, editorLanguage, quizAnswers, session?.id, session?.taskId, sessionUiState, task?.taskId, theoryAnswers.answer])

  const handleBackToPlans = async () => {
    if (sessionUiState === 'Running') {
      setToast({ message: t('focusSession.mustPauseBeforeLeaving'), type: 'warning' })
      return
    }
    navigateBackToDetail()
  }

  const handleCreateNote = async () => {
    if (!session) return

    const title = noteTitle.trim()
    const content = noteContent.trim()

    if (!title || !content) {
      setToast({ message: t('focusSession.noteValidation'), type: 'warning' })
      return
    }

    setNoteLoading(true)
    try {
      const response = await FocusSessionService.createSessionNote(session.id, { title, content })
      const normalized = normalizeSessionNote(response)
      if (normalized) {
        setSessionNotes((prev) => [normalized, ...prev])
        setIsSessionNotesOpen(true)
        setSelectedSessionNoteId(normalized.noteId)
        setSelectedSessionNoteDetail(null)
      }
      setNoteTitle('')
      setNoteContent('')
      setToast({ message: t('focusSession.noteCreated'), type: 'success' })
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || t('focusSession.noteCreateError')
      setToast({ message: msg, type: 'error' })
    } finally {
      setNoteLoading(false)
    }
  }

  const renderWorkspace = () => {
    switch (currentTaskTypeNum) {
      case 0: // Practice - Code Editor (Monaco)
        return (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Toolbar */}
            <div style={{
              padding: '8px 16px',
              background: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border-base)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Code size={16} color='var(--accent-primary)' />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {t('focusSession.practiceMode')}
                </span>
              </div>
              {/* Language selector */}
              <select
                value={editorLanguage}
                onChange={(e) => setEditorLanguage(e.target.value)}
                style={{
                  padding: '4px 10px',
                  background: 'var(--bg-main)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-base)',
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="csharp">C#</option>
                <option value="cpp">C++</option>
                <option value="c">C</option>
                <option value="go">Go</option>
                <option value="rust">Rust</option>
                <option value="sql">SQL</option>
                <option value="html">HTML</option>
                <option value="css">CSS</option>
                <option value="php">PHP</option>
                <option value="ruby">Ruby</option>
                <option value="kotlin">Kotlin</option>
                <option value="swift">Swift</option>
                <option value="plaintext">Plain Text</option>
              </select>
            </div>

            {/* Monaco Editor Container */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#1e1e1e' }}>
              {/* Floating Placeholder */}
              {!code && (
                <div style={{
                  position: 'absolute',
                  top: 12,
                  left: 68, // Offset for line numbers
                  zIndex: 1,
                  color: 'rgba(255, 255, 255, 0.3)',
                  fontSize: 14,
                  fontFamily: 'monospace',
                  pointerEvents: 'none',
                  userSelect: 'none'
                }}>
                  {t('focusSession.codePlaceholder')}
                </div>
              )}

              <Editor
                height="100%"
                language={editorLanguage}
                value={code}
                onChange={(val) => setCode(val ?? '')}
                theme="vs-dark"
                options={{
                  fontSize: 14,
                  fontFamily: "'Fira Code', 'Cascadia Code', Consolas, 'Courier New', monospace",
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  lineNumbers: 'on',
                  renderLineHighlight: 'all',
                  automaticLayout: true,
                  tabSize: 2,
                  padding: { top: 12 },
                  suggest: { showKeywords: true },
                  quickSuggestions: true,
                  formatOnPaste: true,
                  formatOnType: false,
                  bracketPairColorization: { enabled: true },
                }}
              />
            </div>

          </div>
        )

      case 1: // Theory - Text Input
        return (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{
              padding: '12px 16px',
              background: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border-base)',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <BookOpen size={16} /> {t('focusSession.theoryMode')}
            </div>
            <div style={{ flex: 1, padding: 16, overflow: 'auto' }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: 6
                }}>
                  {t('focusSession.theoryInputLabel')}
                </label>
                <textarea
                  value={theoryAnswers['answer'] || ''}
                  onChange={(e) => setTheoryAnswers(prev => ({ ...prev, answer: e.target.value }))}
                  placeholder={t('focusSession.theoryInputPlaceholder')}
                  style={{
                    width: '100%',
                    height: 400,
                    minHeight: 300,
                    padding: 12,
                    border: '1px solid var(--border-base)',
                    borderRadius: 2,
                    background: 'var(--bg-main)',
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
            </div>
          </div>
        )

      case 2: // Quiz - Display questions from QuizQuestionsJson
        return (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{
              padding: '12px 16px',
              background: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border-base)',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <HelpCircle size={16} /> {t('focusSession.quizMode')}
            </div>
            <div style={{ flex: 1, padding: 16, overflow: 'auto' }}>
              {(() => {
                try {
                  const quizData = task?.quizQuestionsJson ? JSON.parse(task.quizQuestionsJson) : null

                  if (!quizData) {
                    return (
                      <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 40 }}>
                        <div>{t('focusSession.noQuizData')}</div>
                        <div style={{ fontSize: 11, marginTop: 8, color: 'var(--text-disabled)' }}>
                          QuizQuestionsJson: {task?.quizQuestionsJson || 'null'}
                        </div>
                      </div>
                    )
                  }

                  if (!Array.isArray(quizData)) {
                    return (
                      <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 40 }}>
                        <div>{t('focusSession.invalidQuizData')}</div>
                        <div style={{ fontSize: 11, marginTop: 8, color: 'var(--text-disabled)' }}>
                          Type: {typeof quizData}, Data: {JSON.stringify(quizData)}
                        </div>
                      </div>
                    )
                  }

                  return quizData.map((question: any, qIdx: number) => (
                    <div key={qIdx} style={{ marginBottom: 24 }}>
                      <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
                        {t('focusSession.question', { number: qIdx + 1 })}: {question.question || question.text || question.title || question.Question || question.Text || question.Title}
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(question.options || question.answers || question.Options || question.Answers || []).map((option: any, optIdx: number) => (
                          <label key={optIdx} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            cursor: 'pointer',
                            padding: 8,
                            borderRadius: 2,
                            background: quizAnswers[`q${qIdx}`] === optIdx ? 'var(--bg-blue-hover)' : 'transparent'
                          }}>
                            <input
                              type="radio"
                              name={`q${qIdx}`}
                              value={optIdx}
                              checked={quizAnswers[`q${qIdx}`] === optIdx}
                              onChange={() => setQuizAnswers(prev => ({ ...prev, [`q${qIdx}`]: optIdx }))}
                              style={{ margin: 0 }}
                            />
                            <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                              {typeof option === 'string' ? option : option.text || option.title || option.answer || option.Text || option.Title || option.Answer}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))
                } catch (error) {
                  return (
                    <div style={{ textAlign: 'center', color: 'var(--error-primary)', padding: 40 }}>
                      <div>{t('focusSession.quizLoadError')}</div>
                      <div style={{ fontSize: 11, marginTop: 8, color: 'var(--text-disabled)' }}>
                        Error: {(error as any)?.message || 'Unknown error'}
                      </div>
                      <div style={{ fontSize: 11, marginTop: 4, color: 'var(--text-disabled)' }}>
                        Raw data: {task?.quizQuestionsJson || 'null'}
                      </div>
                    </div>
                  )
                }
              })()}

              {/* Debug: Show current quiz answers */}
              {Object.keys(quizAnswers).length > 0 && (
                <div style={{
                  marginTop: 16,
                  padding: 12,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-base)',
                  borderRadius: 4
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle size={14} /> {t('focusSession.debugCurrentAnswers')}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-primary)' }}>
                    {Object.entries(quizAnswers)
                      .sort(([a], [b]) => {
                        const aIndex = parseInt(a.replace('q', ''))
                        const bIndex = parseInt(b.replace('q', ''))
                        return aIndex - bIndex
                      })
                      .map(([questionKey, answerIndex]) => {
                        const questionNum = parseInt(questionKey.replace('q', '')) + 1
                        return (
                          <div key={questionKey} style={{ marginBottom: 4 }}>
                            {t('focusSession.question', { number: questionNum })}: {answerIndex + 1} (index: {answerIndex})
                          </div>
                        )
                      })}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-disabled)', marginTop: 8 }}>
                    <div>Định dạng gửi API: {formatQuizAnswers()}</div>
                    <div style={{ marginTop: 4 }}>
                      Giải thích: Mảng các index đáp án theo thứ tự câu hỏi
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )

      default:
        return (
          <div style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            color: 'var(--text-secondary)',
            fontSize: 14,
            gap: 8
          }}>
            <div style={{ fontSize: 12 }}>{t('focusSession.selectTaskTypeMsg')}</div>
          </div>
        )
    }
  }

  if (!session) {
    return (
      <div style={{ background: 'var(--bg-surface)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header />
        <main style={{ flex: 1, padding: '40px 24px 80px 24px', maxWidth: 800, margin: '0 auto', width: '100%', textAlign: 'center' }}>
          <div style={{ padding: 40 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
              {t('focusSession.sessionNotFound')}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
              {t('focusSession.sessionExpired')}
            </p>
            <button
              type="button"
              onClick={handleBackToPlans}
              style={{
                padding: '12px 24px',
                background: 'var(--text-primary)',
                color: 'var(--bg-surface-short)',
                border: 'none',
                borderRadius: 2,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {t('focusSession.backToPlans')}
            </button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const progressPercentage = session.plannedDurationMinutes > 0
    ? Math.max(0, Math.min(100, ((session.plannedDurationMinutes * 60 - timeRemaining) / (session.plannedDurationMinutes * 60)) * 100))
    : 0

  return (
    <div style={{ background: 'var(--bg-surface)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {!isFocusMode && <Header />}

      {/* Floating Exit Focus Button */}
      {isFocusMode && (
        <button
          type="button"
          onClick={toggleFocusMode}
          style={{
            position: 'fixed', top: 16, right: 16, zIndex: 100000,
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--bg-main)', border: '1px dashed var(--border-base)',
            color: 'var(--text-primary)', padding: '8px 16px', borderRadius: 4,
            cursor: 'pointer', fontSize: 13, fontWeight: 700, transition: 'all 0.2s'
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.color = 'var(--accent-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-base)'; e.currentTarget.style.color = 'var(--text-primary)' }}
        >
          <Minimize2 size={16} /> [ {t('lessonDetail.exitFocus')} ]
        </button>
      )}

      <main style={{ flex: 1, display: 'flex', gap: 0, marginBottom: isFocusMode ? '40px' : '96px' }}>
        {/* Left Panel - Task Info */}
        <div style={{
          width: 300,
          background: 'var(--bg-main)',
          borderRight: '1px solid var(--border-base)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            padding: 16,
            borderBottom: '1px solid var(--border-base)',
            background: 'var(--bg-surface)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}>
            <button
              type="button"
              onClick={handleBackToPlans}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'transparent',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-base)',
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-primary)'
                e.currentTarget.style.borderColor = 'var(--text-primary)'
                e.currentTarget.style.background = 'var(--bg-surface-hover)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)'
                e.currentTarget.style.borderColor = 'var(--border-base)'
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <ArrowLeft size={16} />
              {t('focusSession.backToPlans')}
            </button>

            {/* Enable Focus Mode button */}
            <button
              type="button"
              onClick={toggleFocusMode}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--bg-main)',
                color: 'var(--accent-primary)',
                border: '1px dashed var(--border-base)',
                borderRadius: 2,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }}
              title="Toggle Distraction-Free Mode"
            >
              <Maximize2 size={14} />
              [ {t('lessonDetail.enableFocus')} ]
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Info size={18} className="text-th-muted" />
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {t('focusSession.taskInfo')}
              </h3>
            </div>
          </div>

          <div style={{ flex: 1, padding: 16 }}>
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                {task?.title || session.title || t('focusSession.untitledTask')}
              </h4>
              {task?.description && (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  {task.description}
                </p>
              )}
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 24,
                fontWeight: 700,
                color: 'var(--text-primary)',
                fontFamily: 'monospace',
                textAlign: 'center',
                marginBottom: 8
              }}>
                {formatTime(timeRemaining)}
              </div>
              <div style={{
                width: '100%',
                height: 6,
                background: 'var(--border-base)',
                borderRadius: 3,
                overflow: 'hidden',
                marginBottom: 8
              }}>
                <div style={{
                  width: `${progressPercentage}%`,
                  height: '100%',
                  background: getSessionTypeColor(session.sessionType),
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {timeRemaining > 0 && (
                <button
                  type="button"
                  onClick={isRunning ? handlePauseSession : handleResumeSession}
                  disabled={Boolean(sessionActionLoading)}
                  style={{
                    padding: '10px 16px',
                    background: isRunning ? 'var(--warning-primary)' : 'var(--success-primary)',
                    color: 'var(--bg-surface)',
                    border: 'none',
                    borderRadius: 2,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: sessionActionLoading ? 'not-allowed' : 'pointer',
                    opacity: sessionActionLoading ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  {sessionActionLoading ? <Loader2 className="animate-spin" size={16} /> : isRunning ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
                  {sessionActionLoading === 'pause'
                    ? t('focusSession.pausingBtn')
                    : sessionActionLoading === 'resume'
                      ? t('focusSession.resumingBtn')
                      : isRunning
                        ? t('focusSession.pauseBtn')
                        : t('focusSession.resumeBtn')}
                </button>
              )}

              <button
                type="button"
                onClick={handleAiReview}
                disabled={aiReviewLoading}
                style={{
                  padding: '10px 16px',
                  background: aiReviewLoading ? 'var(--text-secondary)' : 'var(--accent-primary)',
                  color: 'var(--bg-surface)',
                  border: 'none',
                  borderRadius: 2,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: aiReviewLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                {aiReviewLoading ? <Loader2 className="animate-spin" size={16} /> : <Bot size={16} />}
                {aiReviewLoading ? t('focusSession.aiAnalyzing') : t('focusSession.aiReviewBtn')}
              </button>

              <button
                type="button"
                onClick={handleCompleteNow}
                disabled={loading}
                style={{
                  padding: '12px 16px',
                  background: loading ? 'var(--text-secondary)' : 'var(--success-primary)',
                  color: 'var(--bg-surface)',
                  border: 'none',
                  borderRadius: 2,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Flag size={16} />}
                {loading ? t('focusSession.completingBtn') : t('focusSession.completeBtn')}
              </button>
            </div>

          </div>
        </div>

        {/* Center Panel - Workspace */}
        <div style={{
          flex: 1,
          background: 'var(--bg-main)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {renderWorkspace()}
        </div>

        {/* Right Panel - Session Info */}
        <div style={{
          width: 280,
          background: 'var(--bg-main)',
          borderLeft: '1px solid var(--border-base)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            padding: 16,
            borderBottom: '1px solid var(--border-base)',
            background: 'var(--bg-surface)',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <Timer size={18} className="text-th-muted" />
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              {t('focusSession.sessionDetails')}
            </h3>
          </div>

          <div style={{ flex: 1, padding: 16 }}>
            {/* Session Name */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ 
                padding: '16px 20px', 
                background: 'var(--bg-surface)', 
                borderRadius: 8, 
                border: '1px solid var(--border-base)' 
              }}>
                <div style={{ 
                  fontSize: 11, 
                  fontWeight: 600, 
                  color: 'var(--text-secondary)', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.5px', 
                  marginBottom: 8 
                }}>
                  {t('focusSession.sessionNameLabel')}
                </div>
                <div style={{ 
                  fontSize: 16, 
                  color: 'var(--text-primary)', 
                  fontWeight: 600, 
                  wordBreak: 'break-word', 
                  lineHeight: 1.4 
                }}>
                  {session.title || t('focusSession.defaultSessionName')}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ padding: 12, background: 'var(--bg-surface)', borderRadius: 6, border: '1px solid var(--border-base)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                  {t('focusSession.startTime')}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>
                  {formatDateTime(session.startTime)}
                </div>
              </div>

              <div style={{ padding: 12, background: 'var(--bg-surface)', borderRadius: 6, border: '1px solid var(--border-base)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                  {t('focusSession.plannedDuration')}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>
                  {session.plannedDurationMinutes} {t('focusSession.minutes')}
                </div>
              </div>

              <div style={{ padding: 12, background: 'var(--bg-surface)', borderRadius: 6, border: '1px solid var(--border-base)' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                  {t('focusSession.status')}
                </div>
                <div style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: sessionUiState === 'Running'
                    ? 'var(--success-primary)'
                    : sessionUiState === 'Paused'
                      ? 'var(--warning-primary)'
                      : 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  {sessionUiState === 'Running' ? (
                    <><PlayCircle size={14} /> {t('focusSession.statusRunning')}</>
                  ) : sessionUiState === 'Paused' ? (
                    <><Info size={14} /> {t('focusSession.statusPaused')}</>
                  ) : (
                    <><CheckCircle size={14} /> {t('focusSession.statusCompleted')}</>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenSavedNotesModal}
                style={{
                  width: '100%',
                  border: '1px solid var(--border-base)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  borderRadius: 6,
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <BookOpen size={14} />
                  {t('focusSession.noteQuickViewBtn')}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>({sessionNotes.length})</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Note Bubble */}
      <div
        style={{
          position: 'fixed',
          left: noteWidgetPosition.x,
          top: noteWidgetPosition.y,
          zIndex: 100001,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 10,
        }}
      >
        {isNoteWidgetOpen && (
          <div
            style={{
              width: 'min(620px, calc(100vw - 24px))',
              maxHeight: '75vh',
              overflow: 'auto',
              padding: 12,
              border: '1px solid var(--border-base)',
              borderRadius: 12,
              background: 'var(--bg-surface)',
              boxShadow: '0 12px 28px rgba(0, 0, 0, 0.15)',
            }}
          >
            <div
              onMouseDown={handleNotePanelMouseDown}
              onClick={handleToggleNoteWidget}
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.4px',
                cursor: 'grab',
                userSelect: 'none',
                textDecoration: 'underline',
                textUnderlineOffset: 3,
                border: '1px dashed var(--border-base)',
                borderRadius: 8,
                padding: '8px 10px',
              }}
            >
              {t('focusSession.noteSectionTitle')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder={t('focusSession.noteTitlePlaceholder')}
                maxLength={120}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid var(--border-base)',
                  borderRadius: 8,
                  background: 'var(--bg-main)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder={t('focusSession.noteContentPlaceholder')}
                rows={14}
                maxLength={2000}
                style={{
                  width: '100%',
                  minHeight: 340,
                  padding: '10px',
                  border: '1px solid var(--border-base)',
                  borderRadius: 8,
                  background: 'var(--bg-main)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
              <button
                type="button"
                onClick={handleCreateNote}
                disabled={noteLoading}
                style={{
                  padding: '9px 12px',
                  background: noteLoading ? 'var(--text-secondary)' : 'var(--text-primary)',
                  color: 'var(--bg-surface-short)',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: noteLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {noteLoading ? <Loader2 className="animate-spin" size={14} /> : <BookOpen size={14} />}
                {noteLoading ? t('focusSession.noteSaving') : t('focusSession.noteSaveBtn')}
              </button>

              <div style={{ marginTop: 8, borderTop: '1px dashed var(--border-base)', paddingTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setIsSessionNotesOpen((prev) => !prev)}
                  style={{
                    width: '100%',
                    border: '1px solid var(--border-base)',
                    background: 'var(--bg-main)',
                    color: 'var(--text-primary)',
                    borderRadius: 8,
                    padding: '8px 10px',
                    textAlign: 'left',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {t('focusSession.noteReviewTitle')} ({sessionNotes.length})
                </button>

                {isSessionNotesOpen && (
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {sessionNotesLoading ? (
                      <div style={{
                        border: '1px dashed var(--border-base)',
                        borderRadius: 8,
                        padding: '10px',
                        fontSize: 12,
                        color: 'var(--text-secondary)'
                      }}>
                        {t('focusSession.noteLoading')}
                      </div>
                    ) : sessionNotes.length === 0 ? (
                      <div style={{
                        border: '1px dashed var(--border-base)',
                        borderRadius: 8,
                        padding: '10px',
                        fontSize: 12,
                        color: 'var(--text-secondary)'
                      }}>
                        {t('focusSession.noteReviewEmpty')}
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflow: 'auto' }}>
                          {sessionNotes.map((note) => (
                            <button
                              key={note.noteId}
                              type="button"
                              onClick={() => handleSelectSessionNote(note.noteId)}
                              style={{
                                border: selectedSessionNoteId === note.noteId ? '1px solid var(--accent-primary)' : '1px solid var(--border-base)',
                                background: selectedSessionNoteId === note.noteId ? 'var(--bg-blue-hover)' : 'var(--bg-main)',
                                color: selectedSessionNoteId === note.noteId ? 'var(--accent-primary)' : 'var(--text-primary)',
                                borderRadius: 8,
                                padding: '8px 10px',
                                textAlign: 'left',
                                fontSize: 12,
                                cursor: 'pointer'
                              }}
                            >
                              <div style={{ fontWeight: 700, marginBottom: 3 }}>{note.title || t('focusSession.noteUntitled')}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                {t('focusSession.noteCreatedAt')}: {formatUtcPlus7DateTime(note.createdAt)}
                              </div>
                            </button>
                          ))}
                        </div>

                        <div style={{ border: '1px dashed var(--border-base)', borderRadius: 8, padding: 10, fontSize: 12, color: 'var(--text-secondary)' }}>
                          {t('focusSession.noteOpenDetailHint')}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onMouseDown={handleNoteBubbleMouseDown}
          onClick={handleToggleNoteWidget}
          style={{
            border: 'none',
            borderRadius: 999,
            background: 'var(--accent-primary)',
            color: 'white',
            boxShadow: '0 10px 24px rgba(37, 99, 235, 0.35)',
            padding: '12px 16px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <MessageCircle size={16} />
          {isNoteWidgetOpen ? t('focusSession.noteCollapseBtn') : t('focusSession.noteExpandBtn')}
        </button>
      </div>

      {isSessionNotesModalOpen && (
        <div
          onClick={handleCloseSavedNotesModal}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(2px)',
            zIndex: 100050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(760px, 100%)',
              maxHeight: '80vh',
              overflow: 'hidden',
              borderRadius: 12,
              border: '1px solid var(--border-base)',
              background: 'var(--bg-surface)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.28)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{
              padding: '12px 14px',
              borderBottom: '1px solid var(--border-base)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                <BookOpen size={16} />
                {t('focusSession.noteReviewTitle')} ({sessionNotes.length})
              </div>
              <button
                type="button"
                onClick={handleCloseSavedNotesModal}
                style={{
                  border: '1px solid var(--border-base)',
                  borderRadius: 8,
                  background: 'var(--bg-main)',
                  color: 'var(--text-primary)',
                  padding: '6px 10px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {t('focusSession.noteModalClose')}
              </button>
            </div>

            <div style={{ padding: 12, overflow: 'auto', display: 'grid', gap: 10 }}>
              {sessionNotesLoading ? (
                <div style={{ border: '1px dashed var(--border-base)', borderRadius: 8, padding: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                  {t('focusSession.noteLoading')}
                </div>
              ) : sessionNotes.length === 0 ? (
                <div style={{ border: '1px dashed var(--border-base)', borderRadius: 8, padding: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                  {t('focusSession.noteReviewEmpty')}
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gap: 8, maxHeight: 260, overflow: 'auto' }}>
                    {sessionNotes.map((note) => (
                      <button
                        key={note.noteId}
                        type="button"
                        onClick={() => handleSelectSessionNote(note.noteId)}
                        style={{
                          border: selectedSessionNoteId === note.noteId ? '1px solid var(--accent-primary)' : '1px solid var(--border-base)',
                          background: selectedSessionNoteId === note.noteId ? 'var(--bg-blue-hover)' : 'var(--bg-main)',
                          color: selectedSessionNoteId === note.noteId ? 'var(--accent-primary)' : 'var(--text-primary)',
                          borderRadius: 8,
                          padding: '9px 10px',
                          textAlign: 'left',
                          fontSize: 12,
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ fontWeight: 700, marginBottom: 3 }}>{note.title || t('focusSession.noteUntitled')}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                          {t('focusSession.noteCreatedAt')}: {formatUtcPlus7DateTime(note.createdAt)}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div style={{ border: '1px dashed var(--border-base)', borderRadius: 8, padding: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                    {t('focusSession.noteOpenDetailHint')}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {isSessionNoteDetailModalOpen && (
        <div
          onClick={handleCloseNoteDetailModal}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.62)',
            backdropFilter: 'blur(2px)',
            zIndex: 100060,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(900px, 100%)',
              maxHeight: '85vh',
              borderRadius: 12,
              border: '1px solid var(--border-base)',
              background: 'var(--bg-surface)',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.32)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div style={{
              padding: '12px 14px',
              borderBottom: '1px solid var(--border-base)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}>
              <div style={{ display: 'grid', gap: 4 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedSessionNoteDetail?.title || t('focusSession.noteUntitled')}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  {t('focusSession.noteCreatedAt')}: {formatUtcPlus7DateTime(selectedSessionNoteDetail?.createdAt)}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseNoteDetailModal}
                style={{
                  border: '1px solid var(--border-base)',
                  borderRadius: 8,
                  background: 'var(--bg-main)',
                  color: 'var(--text-primary)',
                  padding: '6px 10px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {t('focusSession.noteModalClose')}
              </button>
            </div>

            <div style={{ padding: 14, overflow: 'auto' }}>
              <div style={{
                whiteSpace: 'pre-wrap',
                fontSize: 13,
                color: 'var(--text-primary)',
                lineHeight: 1.65,
                background: 'var(--bg-main)',
                border: '1px solid var(--border-base)',
                borderRadius: 10,
                padding: 14,
                minHeight: 180,
              }}>
                {selectedSessionNoteDetail?.content || t('focusSession.noteNoContent')}
              </div>
            </div>
          </div>
        </div>
      )}

      {renderAiReviewModal()}
      {renderFinalSubmissionModal()}
      <TaskReviewRequestModal
        isOpen={isTaskReviewRequestModalOpen}
        session={taskReviewRequestSession}
        onClose={() => setIsTaskReviewRequestModalOpen(false)}
        onSubmitted={handleTaskReviewSubmitted}
      />

      {/* Complete Session Dialog */}
      {showCompleteDialog && (
        <CompleteSessionDialog
          isOpen={showCompleteDialog}
          onConfirm={handleCompleteSession}
          onCancel={handleCancelComplete}
          loading={loading}
        />
      )}

      <DailyCheckinPopup
        isOpen={dailyCheckinPopup != null}
        title={t('dashboard.dailyCheckin.popupTitle')}
        message={dailyCheckinPopup?.message ?? ''}
        currentStreakLabel={t('dashboard.dailyCheckin.currentStreak')}
        moodLabel={t('dashboard.dailyCheckin.mood')}
        productivityLabel={t('dashboard.dailyCheckin.productivity')}
        productivityValueTemplate={t('dashboard.dailyCheckin.productivityValue', { value: '{{value}}' })}
        closeLabel={t('dashboard.dailyCheckin.close')}
        stats={dailyCheckinPopup ? {
          todayCheckedIn: true,
          currentStreak: dailyCheckinPopup.currentStreak,
          longestStreak: 0,
          totalCheckins: 0,
          lastCheckinDate: null,
          isStreakMilestone: false,
          popupCode: '',
          popupParams: null,
        } : null}
        todayCheckin={dailyCheckinPopup ? {
          checkinId: '',
          userId: '',
          checkinDate: '',
          mood: dailyCheckinPopup.mood ?? null,
          createdAt: '',
        } : null}
        onClose={() => setDailyCheckinPopup(null)}
      />

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {!isFocusMode && <Footer />}
    </div>
  )
}

export default FocusSessionPage
