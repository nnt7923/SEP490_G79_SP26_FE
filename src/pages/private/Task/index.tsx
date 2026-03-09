import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Header from '../../../components/Layout/Header'
import Footer from '../../../components/Layout/Footer'
import { requestChapterTasks } from '../../../services/SignalR'

interface Task {
  id?: string
  title?: string
  description?: string
  difficulty?: 'Easy' | 'Medium' | 'Hard'
  completed?: boolean
}

const TaskPage: React.FC = () => {
  const { taskId: chapterId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation('student')
  
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)

  useEffect(() => {
    if (!chapterId) return

    let disposed = false
    const fetchTasks = async (retryCount = 0) => {
      setLoading(true)
      setError(null)

      try {
        const result = await requestChapterTasks(chapterId, () => {
          if (!disposed) setLoading(true)
        })
        
        if (disposed) return

        // Handle different response formats robustly
        let taskArray: Task[] = []
        if (Array.isArray(result)) {
          taskArray = result
        } else if (result && typeof result === 'object') {
          if (Array.isArray(result.tasks)) {
            taskArray = result.tasks
          } else if (Array.isArray(result.data)) {
            taskArray = result.data
          } else if (Array.isArray(result.items)) {
            taskArray = result.items
          } else {
            taskArray = [result]
          }
        }
        
        // Ensure all tasks have completed property set to false by default
        taskArray = taskArray.map(task => ({
          ...task,
          completed: false
        }))
        
        setTasks(taskArray)
      } catch (e: any) {
        if (disposed) return
        
        // Auto-retry once on failure
        if (retryCount < 1) {
          await new Promise(r => setTimeout(r, 1000))
          if (!disposed) return fetchTasks(retryCount + 1)
          return
        }
        
        const msg = e?.message || t('task.notFound')
        setError(msg)
      } finally {
        if (!disposed) setLoading(false)
      }
    }

    fetchTasks()
    return () => { disposed = true }
  }, [chapterId, t])

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
      
      return newTasks
    })
  }

  if (loading) {
    return (
      <div className="layout min-h-screen bg-status-blue-bg">
        <Header />
        <main className="page-main py-12">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <Loader2 className="w-12 h-12 text-status-blue-muted animate-spin mx-auto mb-4" />
            <p className="text-label">Loading tasks...</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (error) {
    return (
      <div className="layout min-h-screen bg-status-blue-bg">
        <Header />
        <main className="page-main py-12">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <XCircle className="w-12 h-12 text-status-red-muted mx-auto mb-4" />
            <p className="text-label mb-4">{error}</p>
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-2 bg-status-blue-solid-muted text-white rounded-lg hover:bg-status-blue-solid"
            >
              {t('task.backToPlans')}
            </button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="layout min-h-screen bg-status-blue-bg">
        <Header />
        <main className="page-main py-12">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <p className="text-label mb-4">{t('task.noTasks')}</p>
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-2 bg-status-blue-solid-muted text-white rounded-lg hover:bg-status-blue-solid"
            >
              {t('task.backToPlans')}
            </button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const completedCount = tasks.filter(t => t.completed).length
  const progressPercentage = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0

  return (
    <div className="layout min-h-screen bg-status-blue-bg relative">
      <Header />
      
      {/* Celebration Message Overlay */}
      {showCelebration && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-status-green-solid text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 border-2 border-green-400">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-bold text-lg">{t('task.allCompleted')}</span>
          </div>
        </div>
      )}

      <main className="page-main py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-status-blue-muted hover:text-status-blue mb-6 font-medium transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('task.backToPlans')}
          </button>

          {/* Header */}
          <div className="bg-th-card rounded-2xl border-2 border-bd-muted shadow-sm p-6 mb-6">
            <h1 className="text-3xl font-bold text-heading mb-2">{t('task.title')}</h1>
            <p className="text-body mb-6">{t('task.description')}</p>
            
            {/* Progress Bar */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-body">{t('task.progress')}</span>
              <span className="text-sm font-semibold text-status-blue-muted">
                {t('task.completedText', { completed: completedCount, total: tasks.length })}
              </span>
            </div>
            <div className="w-full h-3 bg-th-hover rounded-full overflow-hidden">
              <div 
                className="h-full bg-status-blue-solid-muted transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Task List */}
          <div className="space-y-4">
            {tasks.map((task, taskIdx) => {
              const difficultyLower = task.difficulty?.toLowerCase() || 'medium'
              const getDifficultyTranslation = () => {
                if (difficultyLower === 'easy') return t('task.easy')
                if (difficultyLower === 'hard') return t('task.hard')
                return t('task.medium')
              }
              const difficultyTag = task.difficulty ? getDifficultyTranslation() : null

              return (
                <div 
                  key={task.id || taskIdx} 
                  className={`bg-th-card rounded-2xl border-2 border-bd-muted p-5 hover:shadow-md transition-all duration-300 ${
                    task.completed ? 'opacity-75 bg-status-green-bg border-green-200' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <button
                        type="button"
                        onClick={() => toggleTaskCompletion(task.id, taskIdx)}
                        className={`w-6 h-6 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all ${
                          task.completed 
                            ? 'border-green-500 bg-status-green-solid text-white hover:bg-green-600' 
                            : 'border-status-blue-muted hover:bg-status-blue-bg'
                        }`}
                        aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
                      >
                        {task.completed && (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <div className="flex-1">
                      <p className={`font-semibold text-lg ${task.completed ? 'text-muted line-through' : 'text-heading'}`}>
                        {task.title || task.description || `Task ${taskIdx + 1}`}
                      </p>
                      {task.description && task.title && (
                        <p className={`mt-2 ${task.completed ? 'text-placeholder' : 'text-body'}`}>
                          {task.description}
                        </p>
                      )}
                      {difficultyTag && (
                        <span className={`inline-block mt-3 px-2.5 py-1 text-xs font-semibold rounded pointer-events-none ${
                          difficultyLower === 'easy' ? 'bg-status-green-bg border border-green-200 text-status-green-dark' :
                          difficultyLower === 'medium' ? 'bg-orange-50 border border-orange-200 text-orange-700' :
                          'bg-status-red-bg border border-red-200 text-status-red-dark'
                        }`}>
                          {difficultyTag}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default TaskPage
