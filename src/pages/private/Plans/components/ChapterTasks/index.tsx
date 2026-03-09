import React, { useState } from 'react'
import { requestChapterTasks } from '../../../../../services/SignalR'
import { useTranslation } from 'react-i18next'

interface ChapterTasksProps {
  chapterId: string
  onAllTasksCompleted?: (chapterId: string, completed: boolean) => void
}

interface Task {
  id?: string
  title?: string
  description?: string
  difficulty?: 'Easy' | 'Medium' | 'Hard'
  completed?: boolean
}

const ChapterTasks: React.FC<ChapterTasksProps> = ({ chapterId, onAllTasksCompleted }) => {
  const { t } = useTranslation('student')
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const loadingRef = React.useRef(false)

  const toggleTaskCompletion = (taskId: string | undefined, taskIdx: number) => {
    setTasks(prevTasks => {
      const newTasks = prevTasks.map((task, idx) => 
        (task.id === taskId || idx === taskIdx)
          ? { ...task, completed: !task.completed }
          : task
      )
      
      const allCompleted = newTasks.length > 0 && newTasks.every(t => t.completed === true)
      const wasAllCompleted = prevTasks.length > 0 && prevTasks.every(t => t.completed === true)
      
      if (allCompleted && !wasAllCompleted) {
        setShowCelebration(true)
        setTimeout(() => setShowCelebration(false), 3000)
      }
      
      if (allCompleted !== wasAllCompleted) {
        onAllTasksCompleted?.(chapterId, allCompleted)
      }
      
      return newTasks
    })
  }

  const loadTasks = async (retryCount = 0) => {
    if (loaded || loadingRef.current) return

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
        ...task,
        completed: false
      }))
      
      setTasks(taskArray)
      setLoaded(true)
    } catch (e: any) {
      loadingRef.current = false
      if (retryCount < 1) {
        await new Promise(r => setTimeout(r, 1000))
        return loadTasks(retryCount + 1)
      }
      setError(e?.message || t('task.notFound'))
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    loadTasks()
  }, [chapterId]) // eslint-disable-line react-hooks/exhaustive-deps

  const completedCount = tasks.filter(t => t.completed).length
  const totalCount = tasks.length
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  return (
    <div style={{
      padding: '24px',
      background: 'var(--bg-main)',
      fontFamily: 'monospace',
      position: 'relative',
      borderTop: '1px dashed var(--border-base)'
    }}>
      {/* Celebration Message */}
      {showCelebration && (
        <div style={{
          position: 'absolute',
          top: -20, left: '50%', transform: 'translateX(-50%)',
          zIndex: 10, animation: 'bounce 1s infinite'
        }}>
          <div style={{
            background: 'var(--success-primary)', color: 'var(--bg-main)',
            padding: '8px 16px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 8,
            fontWeight: 700, boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <span>[{t('task.success')}]</span>
            <span>{t('task.allCompleted')}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
          {'>'} {t('task.title')}
        </h4>
        <div style={{ display: 'flex', gap: 12 }}>
          {!loaded && !loading && (
            <button
              onClick={() => loadTasks()}
              style={{
                background: 'var(--bg-surface)', border: '1px solid var(--border-base)', color: 'var(--text-primary)',
                padding: '4px 12px', fontSize: 13, cursor: 'pointer', borderRadius: 2
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-100)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-surface)'}
            >
              [ {t('task.execute')} ]
            </button>
          )}
          {loaded && (
            <button
              onClick={() => {
                setLoaded(false); loadingRef.current = false; setTasks([]); setError(null);
              }}
              style={{
                background: 'transparent', border: '1px dashed var(--border-base)', color: 'var(--text-disabled)',
                padding: '4px 12px', fontSize: 13, cursor: 'pointer', borderRadius: 2
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-disabled)'}
            >
              [ {t('task.reload')} ]
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div style={{ fontSize: 13, color: 'var(--accent-primary)', marginBottom: 16 }}>
          {'>'} {t('task.processing')} _
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
          {/* Progress Bar */}
          <div style={{
            background: 'var(--bg-surface)', padding: 16, border: '1px solid var(--border-base)', borderRadius: 2
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 13 }}>
              <span style={{ color: 'var(--text-secondary)' }}>// {t('task.progress')}</span>
              <span style={{ color: progressPercent === 100 ? 'var(--success-primary)' : 'var(--accent-primary)', fontWeight: 600 }}>
                [{completedCount}/{totalCount}]
              </span>
            </div>
            <div style={{ width: '100%', height: 4, background: 'var(--border-base)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${progressPercent}%`,
                background: progressPercent === 100 ? 'var(--success-primary)' : 'var(--accent-primary)',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>

          {/* Task List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {tasks.map((task, taskIdx) => {
              const difficultyKey = task.difficulty ? task.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard' : undefined;
              return (
                <div
                  key={task.id || taskIdx}
                  style={{
                    background: 'var(--bg-surface)', border: `1px solid ${task.completed ? 'var(--success-primary)' : 'var(--border-base)'}`,
                    padding: 16, borderRadius: 2, display: 'flex', gap: 16, alignItems: 'flex-start',
                    opacity: task.completed ? 0.7 : 1, transition: 'all 0.2s ease', cursor: 'pointer'
                  }}
                  onClick={() => toggleTaskCompletion(task.id, taskIdx)}
                  onMouseEnter={e => { if(!task.completed) e.currentTarget.style.borderColor = 'var(--accent-primary)' }}
                  onMouseLeave={e => { if(!task.completed) e.currentTarget.style.borderColor = 'var(--border-base)' }}
                >
                  <div
                    style={{
                      width: 20, height: 20, flexShrink: 0, marginTop: 2,
                      background: task.completed ? 'var(--success-primary)' : 'transparent',
                      border: `1px solid ${task.completed ? 'var(--success-primary)' : 'var(--border-base)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bg-main)', borderRadius: 2
                    }}
                  >
                    {task.completed && '✓'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{
                      margin: 0, fontSize: 14, fontWeight: 600,
                      color: task.completed ? 'var(--success-primary)' : 'var(--text-primary)',
                      textDecoration: task.completed ? 'line-through' : 'none'
                    }}>
                      {task.title || task.description || `Task ${taskIdx + 1}`}
                    </p>
                    {task.description && task.title && (
                      <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                        {task.description}
                      </p>
                    )}
                    {task.difficulty && difficultyKey && (
                      <span style={{
                        display: 'inline-block', marginTop: 12, padding: '2px 8px', fontSize: 11, fontWeight: 600,
                        textTransform: 'uppercase', borderRadius: 2, border: '1px solid currentColor',
                        color: difficultyKey === 'easy' ? 'var(--success-primary)' :
                               difficultyKey === 'medium' ? 'var(--warning-primary)' :
                               'var(--error-primary)'
                      }}>
                        {t(`task.${difficultyKey}`)}
                      </span>
                    )}
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
    </div>
  )
}

export default ChapterTasks
