import React, { useState } from 'react'
import { requestChapterTasks } from '../../../../../services/SignalR'
import { FocusSessionService, SessionType } from '../../../../../services'
import { useNavigate } from 'react-router-dom'
import ROUTER from '../../../../../router/ROUTER'
import { BookOpen, Code, HelpCircle, Play } from 'lucide-react'
import FocusSessionDialog from '../../../../../components/FocusSessionDialog'
import Toast from '../../../../../components/Toast'
import { useTranslation } from 'react-i18next'

interface ChapterTasksProps {
  chapterId: string
  onAllTasksCompleted?: (chapterId: string, completed: boolean) => void
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
  Priority?: number
  TaskStatus?: number | string
  QuizQuestionsJson?: string
  quizQuestionsJson?: string // lowercase version
}

const ChapterTasks: React.FC<ChapterTasksProps> = ({ chapterId }) => {
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
    } catch (error: any) {
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

  // Handle task click - show focus session dialog
  const handleTaskClick = (task: Task, taskIdx: number) => {
    // Try both id and taskId fields from API
    const taskId = task.id || task.taskId || task.TaskId
    if (!taskId) {
      setToast({ message: t('task.invalidId'), type: 'error' })
      return
    }
    
    const taskTitle = task.title || task.Title || task.description || task.Description || `Task ${taskIdx + 1}`
    
    // Store the full task data for later use
    setSelectedTask({ 
      id: taskId, 
      title: taskTitle,
      fullTask: task // Store full task object
    })
    setShowFocusDialog(true)
  }

  const loadTasks = async (retryCount = 0, forceReload = false) => {
    if (!forceReload && (loaded || loadingRef.current)) return

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
    } catch (e: any) {
      loadingRef.current = false
      if (retryCount < 1) {
        await new Promise(r => setTimeout(r, 1000))
        return loadTasks(retryCount + 1, forceReload)
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
    
    // Automatically load tasks for the new chapter (force reload)
    loadTasks(0, true)
  }, [chapterId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Initial load when component mounts
  React.useEffect(() => {
    if (chapterId && !loaded && !loading) {
      loadTasks(0, true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
          {loaded && (
            <button
              onClick={() => {
                setLoaded(false); loadingRef.current = false; setTasks([]); setError(null);
                loadTasks(0, true);
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
              return (
                <div
                  key={task.id || task.taskId || taskIdx}
                  style={{
                    background: 'var(--bg-surface)', 
                    border: '1px solid var(--border-base)',
                    padding: 16, 
                    borderRadius: 2, 
                    display: 'flex', 
                    gap: 16, 
                    alignItems: 'flex-start',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-base)' }}
                >
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', 
                    background: 'var(--text-disabled)', 
                    color: 'var(--bg-surface)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 2
                  }}>
                    {taskIdx + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <p style={{
                        margin: 0, fontSize: 14, fontWeight: 600,
                        color: 'var(--text-primary)'
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
                          e.currentTarget.style.background = 'var(--accent-secondary)'
                          e.currentTarget.style.transform = 'translateY(-1px)'
                        }}
                        onMouseLeave={(e) => { 
                          e.currentTarget.style.background = 'var(--accent-primary)'
                          e.currentTarget.style.transform = 'translateY(0)'
                        }}
                      >
                        <Play size={14} />
                        {t('task.focus')}
                      </button>
                    </div>
                    {(task.description || task.Description) && (task.title || task.Title) && (
                      <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                        {task.description || task.Description}
                      </p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
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
                      {task.taskType !== undefined && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '2px 8px', fontSize: 11, fontWeight: 600,
                          textTransform: 'uppercase', borderRadius: 2, border: '1px solid currentColor',
                          color: task.taskType === 0 || task.taskType === 'Practice' ? 'var(--success-primary)' :
                                 task.taskType === 1 || task.taskType === 'Theory' ? 'var(--accent-primary)' :
                                 task.taskType === 2 || task.taskType === 'Quizz' ? 'var(--warning-primary)' : 'var(--text-secondary)',
                          background: 'transparent'
                        }}>
                          {task.taskType === 0 || task.taskType === 'Practice' ? <><Code size={12} /> {t('task.practice')}</> :
                           task.taskType === 1 || task.taskType === 'Theory' ? <><BookOpen size={12} /> {t('task.theory')}</> :
                           task.taskType === 2 || task.taskType === 'Quizz' ? <><HelpCircle size={12} /> {t('task.quiz')}</> : `Type ${task.taskType}`}
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
