import React, { useState } from 'react'
import { requestChapterTasks } from '../../../../../services/SignalR'

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
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const loadingRef = React.useRef(false) // Prevent double loading

  const toggleTaskCompletion = (taskId: string | undefined, taskIdx: number) => {
    setTasks(prevTasks => {
      const newTasks = prevTasks.map((task, idx) => 
        (task.id === taskId || idx === taskIdx)
          ? { ...task, completed: !task.completed }
          : task
      )
      
      // Check if all tasks are completed (must be explicitly true)
      const allCompleted = newTasks.length > 0 && newTasks.every(t => t.completed === true)
      const wasAllCompleted = prevTasks.length > 0 && prevTasks.every(t => t.completed === true)
      
      // Show celebration only when transitioning from incomplete to all complete
      if (allCompleted && !wasAllCompleted) {
        setShowCelebration(true)
        setTimeout(() => setShowCelebration(false), 3000)
      }
      
      // Notify parent about completion status change
      if (allCompleted !== wasAllCompleted) {
        onAllTasksCompleted?.(chapterId, allCompleted)
      }
      
      return newTasks
    })
  }

  const loadTasks = async (retryCount = 0) => {
    if (loaded || loadingRef.current) {
      return
    }

    loadingRef.current = true
    setLoading(true)
    setError(null)

    try {
      const result = await requestChapterTasks(chapterId, () => {
        setLoading(true)
      })
      
      // Handle different response formats
      let taskArray: Task[] = []
      if (Array.isArray(result)) {
        taskArray = result
      } else if (result && typeof result === 'object') {
        // Check if result has a tasks property
        if (Array.isArray(result.tasks)) {
          taskArray = result.tasks
        } else if (Array.isArray(result.data)) {
          taskArray = result.data
        } else if (Array.isArray(result.items)) {
          taskArray = result.items
        } else {
          // Single task object
          taskArray = [result]
        }
      }
      
      // Ensure all tasks have completed property set to false by default
      taskArray = taskArray.map(task => ({
        ...task,
        completed: false // Always start as incomplete, ignore backend value
      }))
      
      setTasks(taskArray)
      setLoaded(true)
    } catch (e: any) {
      // Auto-retry once on failure (handles transient SignalR connection issues)
      loadingRef.current = false // Reset before retry
      if (retryCount < 1) {
        await new Promise(r => setTimeout(r, 1000))
        return loadTasks(retryCount + 1)
      }
      const msg = e?.message || 'Unable to load tasks.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // Auto-load tasks when component mounts
  React.useEffect(() => {
    loadTasks()
  }, [chapterId]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="px-6 py-4 bg-orange-50 relative">
      {/* Celebration Message */}
      {showCelebration && (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10 animate-bounce">
          <div className="bg-status-green-solid text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-semibold">All tasks completed! 🎉</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <h4 className="font-semibold text-heading">Chapter Tasks</h4>
          
        </div>
        {!loaded && !loading && (
          <button
            type="button"
            onClick={() => loadTasks()}
            className="px-3 py-1.5 text-sm font-medium text-amber-700 bg-th-card border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors"
          >
            Load Tasks
          </button>
        )}
        {loaded && (
          <button
            type="button"
            onClick={() => {
              setLoaded(false)
              loadingRef.current = false
              setTasks([])
              setError(null)
            }}
            className="px-3 py-1.5 text-sm font-medium text-label bg-th-card border border-bd rounded-lg hover:bg-th-page transition-colors"
          >
            Reload
          </button>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-label">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading tasks...
        </div>
      )}

      {error && (
        <div className="text-sm text-status-red-dark bg-status-red-bg border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {loaded && tasks.length > 0 && (
        <>
          {/* Progress Bar */}
          <div className="mb-3 p-3 bg-th-card rounded-lg border border-amber-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-body">Progress</span>
              <span className="text-sm font-semibold text-amber-600">
                {tasks.filter(t => t.completed === true).length} / {tasks.length} completed
              </span>
            </div>
            <div className="w-full h-2 bg-th-hover rounded-full overflow-hidden">
              <div 
                className="h-full bg-orange-500 transition-all duration-300"
                style={{ 
                  width: `${tasks.length > 0 ? (tasks.filter(t => t.completed === true).length / tasks.length) * 100 : 0}%` 
                }}
              />
            </div>
          </div>

          {/* Task List */}
          <div className="space-y-2">
            {tasks.map((task, taskIdx) => (
              <div 
                key={task.id || taskIdx} 
                className={`bg-th-card rounded-lg border border-amber-200 p-3 hover:shadow-sm transition-all ${
                  task.completed ? 'opacity-75' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <button
                      type="button"
                      onClick={() => toggleTaskCompletion(task.id, taskIdx)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${
                        task.completed 
                          ? 'border-amber-600 bg-amber-600 hover:bg-amber-700' 
                          : 'border-amber-500 hover:bg-amber-50'
                      }`}
                      aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
                    >
                      {task.completed && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${task.completed ? 'text-muted line-through' : 'text-heading'}`}>
                      {task.title || task.description || `Task ${taskIdx + 1}`}
                    </p>
                    {task.description && task.title && (
                      <p className={`text-sm mt-1 ${task.completed ? 'text-placeholder' : 'text-label'}`}>
                        {task.description}
                      </p>
                    )}
                    {task.difficulty && (
                      <span className={`inline-block mt-2 px-2 py-0.5 text-xs font-medium rounded ${
                        task.difficulty.toLowerCase() === 'easy' ? 'bg-status-green-bg-strong text-status-green-dark' :
                        task.difficulty.toLowerCase() === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-status-red-bg-strong text-status-red-dark'
                      }`}>
                        {task.difficulty}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {loaded && tasks.length === 0 && (
        <p className="text-sm text-label">No tasks available for this chapter.</p>
      )}
    </div>
  )
}

export default ChapterTasks
