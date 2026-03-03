import React, { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import Header from '../../../../components/Layout/Header'
import Footer from '../../../../components/Layout/Footer'
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react'
import { requestLessonContent } from '../../../../services/SignalR'
import LessonContent from '../components/LessonContent'
import ROUTER from '../../../../router/ROUTER'

const LessonDetailPage: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>()
  const navigate = useNavigate()
  const location = useLocation() as any
  
  const [skeleton, setSkeleton] = useState<any | null>(() => {
    const fromState = location?.state?.skeleton
    if (fromState) return fromState
    try {
      const raw = sessionStorage.getItem('learningPathSkeleton')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  const [md, setMd] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Extract all lessons from chapters
  const allLessons = useMemo(() => {
    if (!skeleton?.chapters) return []
    return skeleton.chapters.flatMap((chapter: any, chapterIdx: number) => 
      (chapter.lessons || []).map((lesson: any, lessonIdx: number) => ({
        ...lesson,
        chapterTitle: chapter.title,
        chapterIndex: chapterIdx,
        lessonIndex: lessonIdx
      }))
    )
  }, [skeleton])

  const currentLessonIndex = useMemo(() => {
    return allLessons.findIndex((l: any) => l.id === lessonId)
  }, [allLessons, lessonId])

  const currentLesson = allLessons[currentLessonIndex]
  const prevLesson = currentLessonIndex > 0 ? allLessons[currentLessonIndex - 1] : null
  const nextLesson = currentLessonIndex < allLessons.length - 1 ? allLessons[currentLessonIndex + 1] : null

  // Helper to extract markdown from various payload shapes
  const extractMarkdown = (payload: any): string => {
    if (!payload) return ''
    if (typeof payload === 'string') return payload
    if (Array.isArray(payload)) return payload.map(extractMarkdown).join('\n\n')
    if (typeof payload === 'object') {
      return (
        payload.content ?? payload.markdown ?? payload.body ?? payload.text ??
        (Array.isArray(payload.sections) ? payload.sections.map(extractMarkdown).join('\n\n') : '')
      ) as string
    }
    return ''
  }

  // Fetch lesson content
  useEffect(() => {
    if (!lessonId) return
    
    // Scroll to top when lesson changes
    window.scrollTo({ top: 0, behavior: 'smooth' })
    
    let disposed = false
    const run = async () => {
      setLoading(true)
      setError(null)

      // 1) Check if content is in skeleton
      const found = allLessons.find((l: any) => l.id === lessonId)
      const fromSkeleton = extractMarkdown(found?.content)
      if (!disposed && fromSkeleton && fromSkeleton.trim().length > 0) {
        setMd(fromSkeleton)
        setLoading(false)
        return
      }

      // 2) Fallback to SignalR request
      try {
        const content = await requestLessonContent(lessonId, () => {
          if (!disposed) setLoading(true)
        })
        if (disposed) return
        setMd(extractMarkdown(content))
      } catch (e: any) {
        if (disposed) return
        const msg = e?.message || 'Unable to load lesson content.'
        setError(msg)
      } finally {
        if (!disposed) setLoading(false)
      }
    }
    run()
    return () => { disposed = true }
  }, [lessonId, allLessons])

  if (!skeleton) {
    return (
      <div className="layout min-h-screen  from-teal-50 via-cyan-50 to-blue-50">
        <Header />
        <main className="page-main py-12">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <p className="text-gray-600">No learning path found. Please generate a learning path first.</p>
            <button
              onClick={() => navigate(ROUTER.PLANS)}
              className="mt-4 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
              Go to Plans
            </button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!currentLesson) {
    return (
      <div className="layout min-h-screen  from-teal-50 via-cyan-50 to-blue-50">
        <Header />
        <main className="page-main py-12">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <p className="text-gray-600">Lesson not found.</p>
            <button
              onClick={() => navigate(ROUTER.PLANS_RESULT, { state: { skeleton } })}
              className="mt-4 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
              Back to Learning Path
            </button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="layout min-h-screen  from-teal-50 via-cyan-50 to-blue-50">
      <Header />
      <main className="page-main py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back button */}
          <button
            onClick={() => navigate(ROUTER.PLANS_RESULT, { state: { skeleton } })}
            className="flex items-center gap-2 text-teal-600 hover:text-teal-700 mb-6 font-medium transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Learning Path
          </button>

          {/* Lesson Header */}
          <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm p-6 mb-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-cyan-600 text-white flex items-center justify-center font-semibold">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="text-sm text-gray-600 mb-1">
                  {currentLesson.chapterTitle} • Lesson {currentLesson.lessonIndex + 1}
                </div>
                <h1 className="text-3xl font-bold text-gray-900">{currentLesson.title}</h1>
                {currentLesson.description && (
                  <p className="text-gray-600 mt-2">{currentLesson.description}</p>
                )}
              </div>
            </div>

            {/* Progress indicator */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Lesson {currentLessonIndex + 1} of {allLessons.length}</span>
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-teal-600 transition-all duration-300"
                  style={{ width: `${((currentLessonIndex + 1) / allLessons.length) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Lesson Content */}
          <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm p-6 mb-6">
            <LessonContent content={md} loading={loading} error={error || undefined} />
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-4">
            {prevLesson ? (
              <button
                onClick={() => navigate(`/lesson/${prevLesson.id}`, { state: { skeleton } })}
                className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
              >
                <ChevronLeft className="w-5 h-5" />
                <div className="text-left">
                  <div className="text-xs text-gray-500">Previous</div>
                  <div className="text-sm">{prevLesson.title}</div>
                </div>
              </button>
            ) : (
              <div />
            )}

            {nextLesson ? (
              <button
                onClick={() => navigate(`/lesson/${nextLesson.id}`, { state: { skeleton } })}
                className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-all shadow-md hover:shadow-lg ml-auto"
              >
                <div className="text-right">
                  <div className="text-xs text-teal-100">Next</div>
                  <div className="text-sm">{nextLesson.title}</div>
                </div>
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={() => navigate(ROUTER.PLANS_RESULT, { state: { skeleton } })}
                className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-all shadow-md hover:shadow-lg ml-auto"
              >
                Complete Learning Path
              </button>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default LessonDetailPage
