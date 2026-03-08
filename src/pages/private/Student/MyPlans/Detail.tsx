
import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../../../../components/Layout'
import { getStudentSidebarConfig } from '../components/StudentSideBar'
import LearningPathService, { type SkeletonResponse } from '../../../../services/LearningPathService'
import { requestChapterTasks } from '../../../../services/SignalR'
import useAuthStore from '../../../../store/useAuthStore'
import { ArrowLeft, Loader, AlertCircle, BookOpen, CheckCircle2, Clock, ListTodo } from 'lucide-react'

const MyPlansDetailPage: React.FC = () => {
  const { pathId } = useParams<{ pathId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [plan, setPlan] = useState<SkeletonResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set())
  const [chapterTasks, setChapterTasks] = useState<Record<string, any[]>>({})
  const [loadingTasks, setLoadingTasks] = useState<Set<string>>(new Set())

  const sidebarConfig = {
    navItems: getStudentSidebarConfig(),
    actions: [],
    brand: { name: 'Plan Details', subtitle: 'Learning' },
  }

  useEffect(() => {
    // In a real app, you'd fetch the specific plan by ID
    // For now, we'll get it from the list and find it
    fetchPlanDetail()
  }, [pathId])

  const fetchPlanDetail = async () => {
    if (!user?.id || !pathId) return

    setLoading(true)
    setError(null)
    try {
      // Fetch all plans and find the one matching pathId
      const response = await LearningPathService.getUserLearningPaths(user.id, {
        pageNumber: 1,
        pageSize: 100,
      })
      
      const foundPlan = response.items.find(p => (p.pathId || p.id) === pathId)
      if (foundPlan) {
        setPlan(foundPlan)
        // Start with all chapters collapsed
        setExpandedChapters(new Set())
      } else {
        setError('Learning path not found')
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to load learning path'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // Auto-load tasks when chapter is expanded
  const handleChapterToggle = async (chapterId: string) => {
    const newExpanded = new Set(expandedChapters)
    const isExpanding = !newExpanded.has(chapterId)
    
    if (isExpanding) {
      newExpanded.add(chapterId)
      
      // Load tasks if not already loaded
      if (!chapterTasks[chapterId] && !loadingTasks.has(chapterId)) {
        setLoadingTasks(prev => new Set(prev).add(chapterId))
        try {
          const tasks = await requestChapterTasks(chapterId)
          setChapterTasks(prev => ({ ...prev, [chapterId]: Array.isArray(tasks) ? tasks : [] }))
        } catch (err) {
          console.error('Failed to load tasks:', err)
          setChapterTasks(prev => ({ ...prev, [chapterId]: [] }))
        } finally {
          setLoadingTasks(prev => {
            const next = new Set(prev)
            next.delete(chapterId)
            return next
          })
        }
      }
    } else {
      newExpanded.delete(chapterId)
    }
    
    setExpandedChapters(newExpanded)
  }

  if (loading) {
    return (
      <Layout sidebar={sidebarConfig}>
      
        <div className="px-6 py-8 bg-gradient-to-br from-[var(--color-hex-12)] to-[var(--gray-100)] min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader className="w-8 h-8 text-[var(--color-hex-48)] animate-spin mx-auto mb-3" />
            <p className="text-[var(--text-secondary)]">Loading learning path details...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (error || !plan) {
    return (
      <Layout sidebar={sidebarConfig}>
        <div className="px-6 py-8 bg-gradient-to-br from-[var(--color-hex-12)] to-[var(--gray-100)] min-h-screen">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-[var(--color-hex-48)] hover:text-[var(--color-hex-101)] mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          
          <div className="bg-white rounded-lg border border-[var(--gray-200)] p-8">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[var(--color-hex-85)] flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-[var(--gray-900)]">Error loading plan</h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1">{error || 'Learning path not found'}</p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="px-4 py-4 bg-gradient-to-br from-[var(--color-hex-12)] to-[var(--gray-100)] min-h-screen">
        {/* Back Button */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[var(--color-hex-48)] hover:text-[var(--color-hex-101)] mb-4 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to My Plans
        </button>

        {/* Header */}
        <div className="bg-white rounded-lg border border-[var(--gray-200)] p-5 mb-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold text-[var(--gray-900)] mb-1">{plan.title || 'Untitled Plan'}</h1>
              <p className="text-[var(--text-secondary)] text-sm">{plan.description || 'No description available'}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-[var(--gray-200)]">
            <div className="stat-box">
              <div className="text-2xl font-bold text-[var(--color-hex-48)]">{plan.chapterCount || plan.chapters?.length || 0}</div>
              <div className="text-xs text-[var(--text-secondary)] mt-0.5">Chapters</div>
            </div>
            <div className="stat-box">
              <div className="text-2xl font-bold text-[var(--color-hex-50)]">{plan.lessons?.length || 0}</div>
              <div className="text-xs text-[var(--text-secondary)] mt-0.5">Lessons</div>
            </div>
            <div className="stat-box">
              <div className="text-2xl font-bold text-[var(--color-hex-58)]">0</div>
              <div className="text-xs text-[var(--text-secondary)] mt-0.5">Completed</div>
            </div>
            <div className="stat-box">
              <div className="text-2xl font-bold text-[var(--color-hex-28)]">0%</div>
              <div className="text-xs text-[var(--text-secondary)] mt-0.5">Progress</div>
            </div>
          </div>

          {/* Meta Info */}
          {plan.createdAt && (
            <div className="flex items-center gap-2 mt-4 text-xs text-[var(--text-secondary)]">
              <Clock className="w-3.5 h-3.5" />
              Created on {new Date(plan.createdAt).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          )}
        </div>

        {/* Chapters & Lessons - Full Width */}
        <div className="space-y-3">
          {plan.chapters && plan.chapters.length > 0 ? (
            plan.chapters.map((chapter, chapterIdx) => (
              <div key={chapter.id || chapterIdx} className="bg-white rounded-lg border border-[var(--gray-200)] overflow-hidden">
                {/* Chapter Header */}
                <button
                  type="button"
                  onClick={() => handleChapterToggle(chapter.id)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--color-hex-12)] transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 text-left">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[var(--color-hex-48)] text-white flex items-center justify-center font-semibold text-sm">
                      {chapterIdx + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold text-[var(--gray-900)] text-base">{chapter.title}</h3>
                      {chapter.lessons && chapter.lessons.length > 0 && (
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">{chapter.lessons.length} lessons</p>
                      )}
                    </div>
                  </div>
                  <div className={`transform transition-transform ${expandedChapters.has(chapter.id) ? 'rotate-180' : ''}`}>
                    <svg className="w-4 h-4 text-[var(--gray-400)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                </button>

                {/* Chapter Content */}
                {chapter.content && (
                  <div className="px-4 py-2 bg-[var(--color-hex-12)] border-t border-[var(--gray-200)]">
                    <p className="text-xs text-[var(--gray-700)]">{chapter.content}</p>
                  </div>
                )}

                {/* Lessons */}
                {expandedChapters.has(chapter.id) && chapter.lessons && chapter.lessons.length > 0 && (
                  <div className="border-t border-[var(--gray-200)]">
                    <div className="divide-y divide-[var(--gray-200)]">
                      {chapter.lessons.map((lesson, lessonIdx) => (
                        <div key={lesson.id || lessonIdx} className="px-4 py-3 hover:bg-[var(--color-hex-12)] transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-hex-50)] text-white flex items-center justify-center text-xs font-semibold">
                              {lessonIdx + 1}
                            </div>
                            <div className="flex-1">
                              <button
                                type="button"
                                onClick={() => {
                                  try { sessionStorage.setItem('learningPathSkeleton', JSON.stringify(plan)) } catch {}
                                  navigate(`/lesson/${lesson.id}`, { state: { skeleton: plan } })
                                }}
                                title="View lesson content"
                                className="font-medium text-[var(--gray-900)] text-sm text-left hover:text-[var(--color-hex-48)] underline decoration-transparent hover:decoration-[var(--color-hex-48)]"
                              >
                                {lesson.title}
                              </button>
                              {lesson.description && (
                                <p className="text-xs text-[var(--text-secondary)] mt-1">{lesson.description}</p>
                              )}
                              

                              {/* Quizzes */}
                              {lesson.quizzes && lesson.quizzes.length > 0 && (
                                <div className="mt-2 space-y-1.5">
                                  <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Quizzes:</p>
                                  <div className="space-y-1">
                                    {lesson.quizzes.map((quiz, quizIdx) => (
                                      <button
                                        key={quiz.id || quizIdx}
                                        type="button"
                                        onClick={() => {
                                          if (!quiz.id) {
                                            alert('Quiz ID is missing! Cannot navigate to quiz.')
                                            return
                                          }
                                          
                                          navigate(`/quiz/${quiz.id}`, { 
                                            state: { 
                                              quizTitle: quiz.title,
                                              skeleton: plan 
                                            } 
                                          })
                                        }}
                                        className="flex items-center gap-2 text-xs text-[var(--gray-700)] hover:text-[var(--color-hex-48)] transition-colors cursor-pointer"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-hex-58)]" />
                                        <span className="underline decoration-transparent hover:decoration-[var(--color-hex-48)]">{quiz.title}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tasks */}
                {expandedChapters.has(chapter.id) && (
                  <div className="border-t border-[var(--gray-200)] bg-[var(--color-hex-103)] px-4 py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <ListTodo className="w-4 h-4 text-[var(--warning-primary)]" />
                      <h4 className="text-sm font-semibold text-[var(--color-hex-104)]">Chapter Tasks</h4>
                    </div>
                    
                    {loadingTasks.has(chapter.id) ? (
                      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                        <Loader className="w-3.5 h-3.5 animate-spin" />
                        <span>Loading tasks...</span>
                      </div>
                    ) : chapterTasks[chapter.id] && chapterTasks[chapter.id].length > 0 ? (
                      <div className="space-y-2">
                        {chapterTasks[chapter.id].map((task: any, taskIdx: number) => (
                          <div key={task.id || taskIdx} className="flex items-start gap-2 text-xs">
                            <div className="flex-shrink-0 w-5 h-5 rounded bg-[var(--color-hex-54)] border border-[var(--color-hex-105)] flex items-center justify-center text-[var(--color-hex-104)] font-semibold">
                              {taskIdx + 1}
                            </div>
                            <div className="flex-1">
                              <p className="text-[var(--color-hex-104)] font-medium">{task.title || task.description || 'Task'}</p>
                              {task.description && task.title && (
                                <p className="text-[var(--color-hex-106)] mt-0.5">{task.description}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--color-hex-106)]">No tasks available for this chapter</p>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="bg-white rounded-lg border border-[var(--gray-200)] p-8 text-center">
              <BookOpen className="w-10 h-10 text-[var(--gray-300)] mx-auto mb-3" />
              <p className="text-sm text-[var(--text-secondary)]">No chapters available for this learning path</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-3">
          <button type="button" className="flex-1 px-5 py-2.5 bg-[var(--color-hex-48)] text-white rounded-lg font-medium hover:bg-[var(--color-hex-101)] transition-all duration-200 text-sm">
            Start Learning
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 px-5 py-2.5 border border-[var(--gray-200)] text-[var(--gray-700)] rounded-lg font-medium hover:bg-[var(--color-hex-12)] transition-all duration-200 text-sm"
          >
            Back
          </button>
        </div>
      </div>

      <style>{`
        .stat-box {
          padding: 0.75rem;
          background: var(--color-hex-12);
          border-radius: 0.5rem;
          border: 1px solid var(--gray-200);
        }
      `}</style>
    </Layout>
  )
}

export default MyPlansDetailPage
