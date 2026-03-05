
import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../../../../components/Layout'
import { getStudentSidebarConfig } from '../components/StudentSideBar'
import LearningPathService, { type SkeletonResponse } from '../../../../services/LearningPathService'
import useAuthStore from '../../../../store/useAuthStore'
import { ArrowLeft, Loader, AlertCircle, BookOpen, CheckCircle2, Clock } from 'lucide-react'

const MyPlansDetailPage: React.FC = () => {
  const { pathId } = useParams<{ pathId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [plan, setPlan] = useState<SkeletonResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set())

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

  if (loading) {
    return (
      <Layout sidebar={sidebarConfig}>
      
        <div className="px-6 py-8 bg-gradient-to-br from-[#f9fafb] to-[#f3f4f6] min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader className="w-8 h-8 text-[#2f80ed] animate-spin mx-auto mb-3" />
            <p className="text-[#6b7280]">Loading learning path details...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (error || !plan) {
    return (
      <Layout sidebar={sidebarConfig}>
        <div className="px-6 py-8 bg-gradient-to-br from-[#f9fafb] to-[#f3f4f6] min-h-screen">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-[#2f80ed] hover:text-[#1e5fb8] mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          
          <div className="bg-white rounded-lg border border-[#e5e7eb] p-8">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#ef4444] flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-[#111827]">Error loading plan</h3>
                <p className="text-sm text-[#6b7280] mt-1">{error || 'Learning path not found'}</p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="px-6 py-8 bg-gradient-to-br from-[#f9fafb] to-[#f3f4f6] min-h-screen">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#2f80ed] hover:text-[#1e5fb8] mb-6 transition-colors font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to My Plans
        </button>

        {/* Header */}
        <div className="bg-white rounded-lg border border-[#e5e7eb] p-8 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-[#111827] mb-2">{plan.title || 'Untitled Plan'}</h1>
              <p className="text-[#6b7280] text-lg">{plan.description || 'No description available'}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-[#e5e7eb]">
            <div className="stat-box">
              <div className="text-3xl font-bold text-[#2f80ed]">{plan.chapterCount || plan.chapters?.length || 0}</div>
              <div className="text-sm text-[#6b7280] mt-1">Chapters</div>
            </div>
            <div className="stat-box">
              <div className="text-3xl font-bold text-[#7c3aed]">{plan.lessons?.length || 0}</div>
              <div className="text-sm text-[#6b7280] mt-1">Lessons</div>
            </div>
            <div className="stat-box">
              <div className="text-3xl font-bold text-[#059669]">0</div>
              <div className="text-sm text-[#6b7280] mt-1">Completed</div>
            </div>
            <div className="stat-box">
              <div className="text-3xl font-bold text-[#f59e0b]">0%</div>
              <div className="text-sm text-[#6b7280] mt-1">Progress</div>
            </div>
          </div>

          {/* Meta Info */}
          {plan.createdAt && (
            <div className="flex items-center gap-2 mt-6 text-sm text-[#6b7280]">
              <Clock className="w-4 h-4" />
              Created on {new Date(plan.createdAt).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          )}
        </div>

        {/* Chapters & Lessons - Full Width */}
        <div className="space-y-4">
          {plan.chapters && plan.chapters.length > 0 ? (
            plan.chapters.map((chapter, chapterIdx) => (
              <div key={chapter.id || chapterIdx} className="bg-white rounded-lg border border-[#e5e7eb] overflow-hidden">
                {/* Chapter Header */}
                <button
                  onClick={() => {
                    const newExpanded = new Set(expandedChapters)
                    if (newExpanded.has(chapter.id)) {
                      newExpanded.delete(chapter.id)
                    } else {
                      newExpanded.add(chapter.id)
                    }
                    setExpandedChapters(newExpanded)
                  }}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#f9fafb] transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 text-left">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#2f80ed] text-white flex items-center justify-center font-semibold">
                      {chapterIdx + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#111827] text-lg">{chapter.title}</h3>
                      {chapter.lessons && chapter.lessons.length > 0 && (
                        <p className="text-sm text-[#6b7280] mt-1">{chapter.lessons.length} lessons</p>
                      )}
                    </div>
                  </div>
                  <div className={`transform transition-transform ${expandedChapters.has(chapter.id) ? 'rotate-180' : ''}`}>
                    <svg className="w-5 h-5 text-[#9ca3af]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                </button>

                {/* Chapter Content */}
                {chapter.content && (
                  <div className="px-6 py-3 bg-[#f9fafb] border-t border-[#e5e7eb]">
                    <p className="text-sm text-[#374151]">{chapter.content}</p>
                  </div>
                )}

                {/* Lessons */}
                {expandedChapters.has(chapter.id) && chapter.lessons && chapter.lessons.length > 0 && (
                  <div className="border-t border-[#e5e7eb]">
                    <div className="divide-y divide-[#e5e7eb]">
                      {chapter.lessons.map((lesson, lessonIdx) => (
                        <div key={lesson.id || lessonIdx} className="px-6 py-4 hover:bg-[#f9fafb] transition-colors">
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#7c3aed] text-white flex items-center justify-center text-sm font-semibold">
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
                                className="font-medium text-[#111827] text-left hover:text-[#2f80ed] underline decoration-transparent hover:decoration-[#2f80ed]"
                              >
                                {lesson.title}
                              </button>
                              {lesson.description && (
                                <p className="text-sm text-[#6b7280] mt-1">{lesson.description}</p>
                              )}
                              

                              {/* Quizzes */}
                              {lesson.quizzes && lesson.quizzes.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide">Quizzes:</p>
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
                                        className="flex items-center gap-2 text-sm text-[#374151] hover:text-[#2f80ed] transition-colors cursor-pointer"
                                      >
                                        <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                                        <span className="underline decoration-transparent hover:decoration-[#2f80ed]">{quiz.title}</span>
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
              </div>
            ))
          ) : (
            <div className="bg-white rounded-lg border border-[#e5e7eb] p-12 text-center">
              <BookOpen className="w-12 h-12 text-[#d1d5db] mx-auto mb-4" />
              <p className="text-[#6b7280]">No chapters available for this learning path</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex gap-4">
          <button className="flex-1 px-6 py-3 bg-[#2f80ed] text-white rounded-lg font-medium hover:bg-[#1e5fb8] transition-all duration-200">
            Start Learning
          </button>
          <button
            onClick={() => navigate(-1)}
            className="flex-1 px-6 py-3 border border-[#e5e7eb] text-[#374151] rounded-lg font-medium hover:bg-[#f9fafb] transition-all duration-200"
          >
            Back
          </button>
        </div>
      </div>

      <style>{`
        .stat-box {
          padding: 1rem;
          background: #f9fafb;
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
        }
      `}</style>
    </Layout>
  )
}

export default MyPlansDetailPage
