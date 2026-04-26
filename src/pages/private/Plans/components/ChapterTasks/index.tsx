import React, { useEffect, useRef, useState } from 'react'
import { requestChapterTasks } from '../../../../../services/SignalR'
import { FocusSessionService, SessionType } from '../../../../../services'
import type { FocusSession } from '../../../../../services/FocusSessionService'
import { useNavigate } from 'react-router-dom'
import ROUTER from '../../../../../router/ROUTER'
import { AlertTriangle, BookOpen, CalendarDays, CheckCircle2, Clock3, Code, FileText, HelpCircle, Pause, Play } from 'lucide-react'
import FocusSessionDialog from '../../../../../components/FocusSessionDialog'
import Toast from '../../../../../components/Toast'
import { useTranslation } from 'react-i18next'

interface ChapterTasksProps {
  chapterId: string
  selectedTaskId?: string | null
  initialTasks?: Task[]
  onAllTasksCompleted?: (chapterId: string, completed: boolean) => void
  showReloadButton?: boolean
}

interface Task {
  id?: string
  taskId?: string  // API uses TaskId
  TaskId?: string  // C# property name
  title?: string
  Title?: string   // C# property name
  description?: string
  Description?: string // C# property name
  difficulty?: 'Easy' | 'Medium' | 'Hard'
  taskType?: number | string // 0: practice, 1: theory, 2: quiz OR "Practice", "Theory", "Quizz"
  TaskType?: number | string // C# property name
  type?: number | string // Alternative field name for taskType
  kind?: number | string // Alternative field name for taskType
  category?: number | string // Alternative field name for taskType
  priority?: string | number | null  // Can be string ("High", "Medium", "Low") or number (1, 2, 3)
  Priority?: string | number | null
  taskStatus?: string | number | null  // Can be string ("Pending", "Completed") or number (0, 1, 2)
  TaskStatus?: string | number | null
  dueDate?: string | null
  DueDate?: string | null
  deadline?: string | null
  Deadline?: string | null
  dueAt?: string | null
  DueAt?: string | null
  dueAtUtc?: string | null
  DueAtUtc?: string | null
  endDate?: string | null
  EndDate?: string | null
  QuizQuestionsJson?: string
  quizQuestionsJson?: string // lowercase version
}

type TaskVisualStatus = 'completed' | 'overdue' | 'due-today' | 'pending-review' | 'default'

const normalizeKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')

const parseDateLikeValue = (value: unknown): string | null => {
  if (value === null || value === undefined) return null

  const asString = String(value).trim()
  if (!asString) return null

  const parsed = new Date(asString)
  if (!Number.isNaN(parsed.getTime())) return asString

  // Handle .NET Date format: /Date(1712803200000)/
  const dotNetMatch = asString.match(/\/Date\((\d+)\)\//)
  if (dotNetMatch?.[1]) {
    const ms = Number(dotNetMatch[1])
    if (Number.isFinite(ms)) {
      const dotNetDate = new Date(ms)
      if (!Number.isNaN(dotNetDate.getTime())) {
        return dotNetDate.toISOString()
      }
    }
  }

  return null
}

const getTaskFieldValue = (task: Task, aliases: string[]): unknown => {
  for (const alias of aliases) {
    if (Object.prototype.hasOwnProperty.call(task, alias)) {
      const directValue = (task as Record<string, unknown>)[alias]
      if (directValue !== undefined && directValue !== null && String(directValue).trim() !== '') {
        return directValue
      }
    }
  }

  const normalizedAliases = aliases.map(normalizeKey)
  for (const [key, value] of Object.entries(task as Record<string, unknown>)) {
    if (value === undefined || value === null || String(value).trim() === '') continue
    if (normalizedAliases.includes(normalizeKey(key))) {
      return value
    }
  }

  // Fallback: detect likely due/deadline/end date keys even if backend renamed fields.
  for (const [key, value] of Object.entries(task as Record<string, unknown>)) {
    const normalizedKey = normalizeKey(key)
    const looksLikeDueKey =
      normalizedKey.includes('due') ||
      normalizedKey.includes('deadline') ||
      normalizedKey.includes('expire') ||
      normalizedKey.includes('enddate')

    if (!looksLikeDueKey) continue

    const parsedValue = parseDateLikeValue(value)
    if (parsedValue) return parsedValue
  }

  return null
}

const normalizeTaskStatus = (value: unknown): TaskVisualStatus | undefined => {
  if (value === null || value === undefined) return undefined

  if (typeof value === 'number') {
    if (value === 2) return 'completed'
    if (value === 3) return 'pending-review'
    return undefined
  }

  const normalized = String(value).trim().toLowerCase().replace(/[\s_-]/g, '')
  if (!normalized) return undefined

  if (['completed', 'done', 'finished', 'success'].includes(normalized)) return 'completed'
  if (['overdue', 'pastdue', 'late', 'expired'].includes(normalized)) return 'overdue'
  if (['pendingreview', 'reviewing'].includes(normalized)) return 'pending-review'

  return undefined
}

const resolveTaskVisualStatus = (task: Task): TaskVisualStatus => {
  const rawStatus = task.taskStatus ?? task.TaskStatus
  const normalizedStatus = normalizeTaskStatus(rawStatus)
  if (normalizedStatus) return normalizedStatus

  const dueDate = getTaskFieldValue(task, [
    'dueDate',
    'DueDate',
    'dueAt',
    'DueAt',
    'dueAtUtc',
    'DueAtUtc',
    'deadline',
    'Deadline',
    'endDate',
    'EndDate'
  ])
  if (dueDate) {
    const parsedDate = new Date(String(dueDate))
    if (!Number.isNaN(parsedDate.getTime())) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const dueDay = new Date(parsedDate)
      dueDay.setHours(0, 0, 0, 0)

      if (dueDay.getTime() < today.getTime()) {
        return 'overdue'
      }

      if (dueDay.getTime() === today.getTime()) {
        return 'due-today'
      }
    }
  }

  return 'default'
}

const formatDueDateLabel = (value: string) => {
  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) return value

  const hasTimePart = /\d{2}:\d{2}/.test(value)
  return hasTimePart
    ? parsedDate.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : parsedDate.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
}

const getDueDateValue = (task: Task): string | null => {
  const value = getTaskFieldValue(task, [
    'dueDate',
    'DueDate',
    'dueAt',
    'DueAt',
    'dueAtUtc',
    'DueAtUtc',
    'deadline',
    'Deadline',
    'endDate',
    'EndDate'
  ])

  if (value === null || value === undefined || String(value).trim() === '') return null
  return String(value)
}

const getTaskTypeMeta = (task: Task, t: (key: string) => string) => {
  const rawType = task.taskType ?? task.TaskType ?? task.type ?? task.kind ?? task.category
  const normalizedType = String(rawType).toLowerCase()

  if (rawType === 0 || normalizedType === 'practice') {
    return {
      icon: <Code size={12} />,
      label: t('task.practice'),
      color: '#166534',
      background: 'rgba(255, 255, 255, 0.92)',
      border: 'rgba(22, 163, 74, 0.22)'
    }
  }

  if (rawType === 1 || normalizedType === 'theory') {
    return {
      icon: <BookOpen size={12} />,
      label: t('task.theory'),
      color: '#1e40af',
      background: 'rgba(255, 255, 255, 0.92)',
      border: 'rgba(37, 99, 235, 0.22)'
    }
  }

  if (rawType === 2 || normalizedType === 'quiz' || normalizedType === 'quizz') {
    return {
      icon: <HelpCircle size={12} />,
      label: t('task.quiz'),
      color: '#b45309',
      background: 'rgba(255, 255, 255, 0.92)',
      border: 'rgba(245, 158, 11, 0.22)'
    }
  }

  return null
}

const getTaskStatusMeta = (task: Task, t: (key: string, options?: any) => string) => {
  const status = task.taskStatus ?? task.TaskStatus
  if (status === undefined || status === null) return null

  const normalized = String(status).toLowerCase().replace(/[\s_-]/g, '')

  if (status === 2 || normalized === 'completed' || normalized === 'done') {
    return {
      icon: <CheckCircle2 size={12} />,
      label: t('task.statusCompleted', { defaultValue: 'Completed' }),
      color: '#166534',
      background: 'rgba(255, 255, 255, 0.92)',
      border: 'rgba(22, 163, 74, 0.22)'
    }
  }
  if (normalized === 'overdue' || normalized === 'pastdue') {
    return {
      icon: <AlertTriangle size={12} />,
      label: t('task.statusOverdue', { defaultValue: 'Overdue' }),
      color: '#b91c1c',
      background: 'rgba(255, 255, 255, 0.92)',
      border: 'rgba(220, 38, 38, 0.22)'
    }
  }
  if (status === 3 || normalized === 'pendingreview') {
    return {
      icon: <Clock3 size={12} />,
      label: t('task.statusPendingReview', { defaultValue: 'Pending Review' }),
      color: '#9333ea',
      background: 'rgba(255, 255, 255, 0.92)',
      border: 'rgba(147, 51, 234, 0.22)'
    }
  }
  if (status === 1 || normalized === 'inprogress') {
    return {
      icon: <Clock3 size={12} />,
      label: t('task.statusInProgress', { defaultValue: 'In Progress' }),
      color: '#1e40af',
      background: 'rgba(255, 255, 255, 0.92)',
      border: 'rgba(37, 99, 235, 0.22)'
    }
  }
  if (status === 0 || normalized === 'pending') {
    return {
      icon: <Pause size={12} />,
      label: t('task.statusPending', { defaultValue: 'Pending' }),
      color: '#92400e',
      background: 'rgba(255, 255, 255, 0.92)',
      border: 'rgba(245, 158, 11, 0.22)'
    }
  }

  return {
    icon: <FileText size={12} />,
    label: `${t('task.statusUnknown', { defaultValue: 'Unknown' })}: ${String(status)}`,
    color: '#475569',
    background: 'rgba(255, 255, 255, 0.92)',
    border: 'rgba(148, 163, 184, 0.22)'
  }
}

const getTaskVisualStyles = (status: TaskVisualStatus) => {
  if (status === 'completed') {
    return {
      background: 'rgba(34, 197, 94, 0.06)',
      borderColor: 'rgba(34, 197, 94, 0.3)',
      leftAccent: 'var(--success-primary)',
      badgeBackground: 'var(--success-primary)',
      badgeColor: 'var(--bg-surface)',
      titleColor: 'var(--text-primary)',
      secondaryColor: 'var(--success-primary)'
    }
  }

  if (status === 'overdue') {
    return {
      background: 'rgba(207, 34, 46, 0.06)',
      borderColor: 'rgba(207, 34, 46, 0.28)',
      leftAccent: 'var(--danger-primary)',
      badgeBackground: 'var(--danger-primary)',
      badgeColor: 'var(--bg-surface)',
      titleColor: 'var(--text-primary)',
      secondaryColor: 'var(--danger-primary)'
    }
  }

  if (status === 'pending-review') {
    return {
      background: 'rgba(147, 51, 234, 0.06)',
      borderColor: 'rgba(147, 51, 234, 0.3)',
      leftAccent: '#9333ea',
      badgeBackground: '#9333ea',
      badgeColor: 'var(--bg-surface)',
      titleColor: 'var(--text-primary)',
      secondaryColor: '#9333ea'
    }
  }

  if (status === 'due-today') {
    return {
      background: 'rgba(245, 158, 11, 0.08)',
      borderColor: 'rgba(245, 158, 11, 0.35)',
      leftAccent: 'var(--warning-primary)',
      badgeBackground: 'var(--warning-primary)',
      badgeColor: 'var(--bg-surface)',
      titleColor: 'var(--text-primary)',
      secondaryColor: 'var(--warning-primary)'
    }
  }

  return {
    background: 'var(--bg-surface)',
    borderColor: 'var(--border-base)',
    leftAccent: 'transparent',
    badgeBackground: 'var(--text-disabled)',
    badgeColor: 'var(--bg-surface)',
    titleColor: 'var(--text-primary)',
    secondaryColor: 'var(--text-secondary)'
  }
}

const normalizeTaskArray = (input: unknown): Task[] => {
  if (!Array.isArray(input)) return []
  return input.map((task) => ({ ...(task as Task) }))
}

const buildTaskSignature = (tasks: Task[]) => {
  if (tasks.length === 0) return '0'
  return tasks
    .map((task) => {
      const id = task.id || task.taskId || task.TaskId || ''
      const status = String(task.taskStatus ?? task.TaskStatus ?? '')
      const due = String(task.dueDate ?? task.DueDate ?? '')
      return `${id}:${status}:${due}`
    })
    .join('|')
}

const ChapterTasks: React.FC<ChapterTasksProps> = ({ chapterId, selectedTaskId = null, initialTasks = [], showReloadButton = true }) => {
  const { t } = useTranslation('student')
  const navigate = useNavigate()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const loadingRef = React.useRef(false)
  const [showFocusDialog, setShowFocusDialog] = useState<boolean>(false)
  const [selectedTask, setSelectedTask] = useState<{ id: string; title: string; fullTask?: Task } | null>(null)
  const [creatingSession, setCreatingSession] = useState<boolean>(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null)
  const [activeSessions, setActiveSessions] = useState<Record<string, FocusSession>>({})
  const taskRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const stableInitialTasks = React.useMemo(() => normalizeTaskArray(initialTasks), [initialTasks])
  const initialTasksSignature = React.useMemo(() => buildTaskSignature(stableInitialTasks), [stableInitialTasks])

  const getTaskId = (task: Task) => task.id || task.taskId || task.TaskId || null

  // Check for active sessions for all tasks - single request instead of N requests
  const checkActiveSessions = async (taskList: Task[]) => {
    try {
      const allActive = await FocusSessionService.getActiveSessions()
      if (!allActive.length) return
      const taskIds = new Set(taskList.map(t => getTaskId(t)).filter(Boolean))
      const activeSessionsMap: Record<string, FocusSession> = {}
      for (const session of allActive) {
        if (session.taskId && taskIds.has(session.taskId)) {
          activeSessionsMap[session.taskId] = session
        }
      }
      setActiveSessions(activeSessionsMap)
    } catch {
      // Ignore errors - no active sessions
    }
  }

  // Handle focus session creation
  const handleCreateFocusSession = async (sessionType: SessionType, duration: number, title?: string) => {
    if (!selectedTask) return

    setCreatingSession(true)
    try {
      const session = await FocusSessionService.startSession({
        taskId: selectedTask.id,
        sessionType,
        plannedDurationMinutes: duration,
        title: title || selectedTask.title
      })

      setToast({ message: t('task.sessionCreated'), type: 'success' })
      setShowFocusDialog(false)
      setSelectedTask(null)

      // Navigate to focus session page with both session and task data
      const taskType = selectedTask.fullTask?.taskType
      const quizData = selectedTask.fullTask?.QuizQuestionsJson || selectedTask.fullTask?.quizQuestionsJson
      
      navigate(ROUTER.FOCUS_SESSION, { 
        state: { 
          session,
          task: {
            id: selectedTask.id,
            title: selectedTask.title,
            description: selectedTask.fullTask?.description || selectedTask.fullTask?.Description,
            taskType: taskType, // Pass original value (number or string)
            quizQuestionsJson: quizData
          }
        } 
      })
      
      // Scroll to top when navigating to focus session
      setTimeout(() => {
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        })
      }, 100)
    } catch (error: any) {
      const errorCode = String(
        error?.response?.data?.errorCode
        || error?.response?.data?.code
        || error?.response?.data?.data?.errorCode
        || ''
      ).toUpperCase()

      if (errorCode === 'SESSION_ALREADY_ACTIVE' && selectedTask?.id) {
        const activeSession = await FocusSessionService.getActiveSession(selectedTask.id)
        if (activeSession) {
          setToast({ message: t('focusSession.sessionResynced'), type: 'warning' })
          setShowFocusDialog(false)
          setSelectedTask(null)

          navigate(ROUTER.FOCUS_SESSION, {
            state: {
              session: activeSession,
              task: {
                id: selectedTask.id,
                title: selectedTask.title,
                description: selectedTask.fullTask?.description || selectedTask.fullTask?.Description,
                taskType: selectedTask.fullTask?.taskType || selectedTask.fullTask?.TaskType,
                quizQuestionsJson: selectedTask.fullTask?.QuizQuestionsJson || selectedTask.fullTask?.quizQuestionsJson,
              },
            },
          })
          return
        }
      }

      const msg = error?.response?.data?.message || error?.message || t('task.createSessionError')
      setToast({ message: msg, type: 'error' })
    } finally {
      setCreatingSession(false)
    }
  }

  const handleCancelFocusSession = () => {
    setShowFocusDialog(false)
    setSelectedTask(null)
  }

  // Handle task click - show focus session dialog or navigate to active session
  const handleTaskClick = async (task: Task, taskIdx: number) => {
    // Try both id and taskId fields from API
    const taskId = getTaskId(task)
    if (!taskId) {
      setToast({ message: t('task.invalidId'), type: 'error' })
      return
    }
    
    const taskTitle = task.title || task.Title || task.description || task.Description || `Task ${taskIdx + 1}`
    
    // Check if there's an active session for this task
    const activeSession = activeSessions[taskId]
    if (activeSession) {
      // Resume the session before navigating
      try {
        const resumedSession = await FocusSessionService.resumeSession(activeSession.id)
        
        // Navigate to the resumed session
        navigate(ROUTER.FOCUS_SESSION, { 
          state: { 
            session: resumedSession,
            task: {
              id: taskId,
              title: taskTitle,
              description: task.description || task.Description,
              taskType: task.taskType || task.TaskType,
              quizQuestionsJson: task.QuizQuestionsJson || task.quizQuestionsJson
            }
          } 
        })
      } catch (error: any) {
        // If resume fails, still navigate but show error
        console.warn('Failed to resume session:', error)
        setToast({ message: 'Không thể tiếp tục phiên, nhưng vẫn có thể truy cập', type: 'warning' })
        
        navigate(ROUTER.FOCUS_SESSION, { 
          state: { 
            session: activeSession,
            task: {
              id: taskId,
              title: taskTitle,
              description: task.description || task.Description,
              taskType: task.taskType || task.TaskType,
              quizQuestionsJson: task.QuizQuestionsJson || task.quizQuestionsJson
            }
          } 
        })
      }
      
      // Scroll to top when navigating to focus session
      setTimeout(() => {
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        })
      }, 100)
      return
    }
    
    // No active session, show create dialog
    setSelectedTask({ 
      id: taskId, 
      title: taskTitle,
      fullTask: task // Store full task object
    })
    setShowFocusDialog(true)
    
    // Scroll to center of screen for better modal positioning
    setTimeout(() => {
      window.scrollTo({
        top: window.innerHeight / 2 - 30,
        behavior: 'smooth'
      })
    }, 100)
  }

  const loadTasks = async (retryCount = 0, forceSignalR = false) => {
    if (!forceSignalR && (loaded || loadingRef.current)) return

    const restTasks = stableInitialTasks
    if (!forceSignalR && restTasks.length > 0) {
      setTasks(restTasks)
      setLoaded(true)
      setError(null)
      setLoading(false)
      loadingRef.current = false
      checkActiveSessions(restTasks)
      return
    }

    loadingRef.current = true
    setLoading(true)
    setError(null)

    try {
      const result = await requestChapterTasks(chapterId, () => setLoading(true))
      let taskArray: Task[] = []
      
      if (Array.isArray(result)) {
        taskArray = result
      } else if (result && typeof result === 'object') {
        if (Array.isArray(result.tasks)) taskArray = result.tasks
        else if (Array.isArray(result.data)) taskArray = result.data
        else if (Array.isArray(result.items)) taskArray = result.items
        else taskArray = [result]
      }
      
      taskArray = taskArray.map(task => ({
        ...task
      }))
      
      setTasks(taskArray)
      setLoaded(true)
      
      // Check for active sessions after loading tasks
      checkActiveSessions(taskArray)
    } catch (e: any) {
      loadingRef.current = false
      if (retryCount < 1) {
        await new Promise(r => setTimeout(r, 1000))
        return loadTasks(retryCount + 1, forceSignalR)
      }
      setError(e?.message || t('task.notFound'))
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    // Reset state when chapterId changes
    setLoaded(false)
    loadingRef.current = false
    setTasks([])
    setError(null)
    
    // Prefer REST-provided tasks; fallback to SignalR only when chapter has no tasks.
    loadTasks(0, false)
  }, [chapterId, initialTasksSignature]) // eslint-disable-line react-hooks/exhaustive-deps

  // Initial load when component mounts
  React.useEffect(() => {
    if (chapterId && !loaded && !loading) {
      loadTasks(0, false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!loaded || !selectedTaskId) return

    const targetNode = taskRefs.current[selectedTaskId]
    if (!targetNode) return

    const timer = window.setTimeout(() => {
      targetNode.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }, 150)

    return () => window.clearTimeout(timer)
  }, [loaded, selectedTaskId, tasks])

  return (
    <div style={{
      padding: '24px',
      background: 'var(--bg-main)',
      fontFamily: 'monospace',
      position: 'relative',
      borderTop: '1px dashed var(--border-base)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
          {t('task.title')}
        </h4>
        <div style={{ display: 'flex', gap: 12 }}>
          {showReloadButton && loaded && (
            <button
              onClick={() => {
                setLoaded(false); loadingRef.current = false; setTasks([]); setError(null);
                loadTasks(0, false);
              }}
              style={{
                background: 'transparent', border: '1px dashed var(--border-base)', color: 'var(--text-disabled)',
                padding: '4px 12px', fontSize: 13, cursor: 'pointer', borderRadius: 2
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-disabled)'}
            >
              {t('task.reload')}
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div style={{ fontSize: 13, color: 'var(--accent-primary)', marginBottom: 16 }}>
          {t('task.loadingAuto')}
        </div>
      )}

      {!loading && !loaded && !error && (
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
          {t('task.loadingPrep')}
        </div>
      )}

      {error && (
        <div style={{
          padding: '12px 16px', background: 'var(--error-surface)', border: '1px solid var(--error-primary)',
          color: 'var(--error-primary)', fontSize: 13, marginBottom: 16, borderRadius: 2
        }}>
          [{t('task.error')}]: {error}
        </div>
      )}

      {loaded && tasks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Task List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {tasks.map((task, taskIdx) => {
              const taskVisualStatus = resolveTaskVisualStatus(task)
              const taskStyles = getTaskVisualStyles(taskVisualStatus)
              const taskId = getTaskId(task)
              const isSelectedTask = selectedTaskId !== null && taskId === selectedTaskId
              const dueDateValue = getDueDateValue(task)
              const taskTypeMeta = getTaskTypeMeta(task, t)
              const taskStatusMeta = getTaskStatusMeta(task, t)
              const dueDateTone =
                taskVisualStatus === 'completed'
                  ? { color: '#166534', border: 'rgba(22, 163, 74, 0.22)', background: 'rgba(255, 255, 255, 0.92)' }
                  : taskVisualStatus === 'overdue'
                    ? { color: '#b91c1c', border: 'rgba(220, 38, 38, 0.22)', background: 'rgba(255, 255, 255, 0.92)' }
                    : taskVisualStatus === 'due-today'
                      ? { color: '#92400e', border: 'rgba(245, 158, 11, 0.22)', background: 'rgba(255, 255, 255, 0.92)' }
                      : { color: '#1e40af', border: 'rgba(37, 99, 235, 0.22)', background: 'rgba(255, 255, 255, 0.92)' }

              return (
                <div
                  key={task.id || task.taskId || taskIdx}
                  ref={(node) => {
                    if (!taskId) return
                    if (node) {
                      taskRefs.current[taskId] = node
                      return
                    }
                    delete taskRefs.current[taskId]
                  }}
                  style={{
                    background: taskStyles.background,
                    border: `1px solid ${isSelectedTask ? 'var(--accent-primary)' : taskStyles.borderColor}`,
                    borderLeft: `3px solid ${taskStyles.leftAccent}`,
                    padding: 16, 
                    borderRadius: 2, 
                    display: 'flex', 
                    gap: 16, 
                    alignItems: 'flex-start',
                    transition: 'all 0.2s ease',
                    boxShadow: isSelectedTask ? '0 0 0 2px rgba(59, 130, 246, 0.18)' : 'none'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = isSelectedTask ? 'var(--accent-primary)' : taskStyles.borderColor }}
                >
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', 
                    background: taskStyles.badgeBackground,
                    color: taskStyles.badgeColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 2
                  }}>
                    {taskIdx + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <p style={{
                        margin: 0, fontSize: 14, fontWeight: 600,
                        color: taskStyles.titleColor
                      }}>
                        {task.title || task.Title || task.description || task.Description || `Task ${taskIdx + 1}`}
                      </p>
                      <button
                        onClick={() => handleTaskClick(task, taskIdx)}
                        style={{
                          background: 'var(--accent-primary)',
                          color: 'white',
                          border: 'none',
                          padding: '6px 12px',
                          fontSize: 12,
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => { 
                          e.currentTarget.style.background = '#2563eb'
                          e.currentTarget.style.transform = 'translateY(-1px)'
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.3)'
                        }}
                        onMouseLeave={(e) => { 
                          e.currentTarget.style.background = 'var(--accent-primary)'
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.boxShadow = 'none'
                        }}
                      >
                        <Play size={14} />
                        {(() => {
                          const hasActiveSession = taskId && activeSessions[taskId]
                          return hasActiveSession ? 'Quay trở lại phiên' : t('task.focus')
                        })()}
                      </button>
                    </div>
                    {(task.description || task.Description) && (task.title || task.Title) && (
                      <p style={{ margin: '8px 0 0', fontSize: 13, color: taskStyles.secondaryColor }}>
                        {task.description || task.Description}
                      </p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                      {/* Task Status */}
                      {taskStatusMeta ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 10px',
                          fontSize: 11,
                          fontWeight: 700,
                          borderRadius: 999,
                          border: `1px solid ${taskStatusMeta.border}`,
                          color: taskStatusMeta.color,
                          background: taskStatusMeta.background
                        }}>
                          <span>{taskStatusMeta.icon}</span>
                          <span>{taskStatusMeta.label}</span>
                        </span>
                      ) : null}
                      
                      {/* Due Date */}
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 10px',
                        fontSize: 11,
                        fontWeight: 700,
                        borderRadius: 999,
                        border: `1px solid ${dueDateTone.border}`,
                        color: dueDateTone.color,
                        background: dueDateTone.background
                      }}>
                        <CalendarDays size={12} />
                        <span>{dueDateValue ? formatDueDateLabel(dueDateValue) : 'Chưa có hạn'}</span>
                      </span>
                      
                      {task.difficulty && (
                        <span style={{
                          display: 'inline-block', padding: '2px 8px', fontSize: 11, fontWeight: 600,
                          textTransform: 'uppercase', borderRadius: 2, border: '1px solid currentColor',
                          color: task.difficulty.toLowerCase() === 'easy' ? 'var(--success-primary)' :
                                 task.difficulty.toLowerCase() === 'medium' ? 'var(--warning-primary)' :
                                 'var(--danger-primary)'
                        }}>
                          {t(`task.${task.difficulty.toLowerCase()}`)}
                        </span>
                      )}
                      {taskTypeMeta && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 10px',
                          fontSize: 11,
                          fontWeight: 700,
                          borderRadius: 999,
                          border: `1px solid ${taskTypeMeta.border}`,
                          color: taskTypeMeta.color,
                          background: taskTypeMeta.background
                        }}>
                          {taskTypeMeta.icon}
                          {taskTypeMeta.label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loaded && tasks.length === 0 && (
        <div style={{ fontSize: 13, color: 'var(--text-disabled)', padding: 16, textAlign: 'center', border: '1px dashed var(--border-base)', borderRadius: 2 }}>
          {t('task.noTasks')}
        </div>
      )}

      {/* Focus Session Dialog */}
      {showFocusDialog && selectedTask && (
        <FocusSessionDialog
          isOpen={showFocusDialog}
          taskTitle={selectedTask.title}
          onConfirm={handleCreateFocusSession}
          onCancel={handleCancelFocusSession}
          loading={creatingSession}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

export default ChapterTasks
