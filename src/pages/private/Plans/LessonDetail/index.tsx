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
      <div className="layout min-h-screen bg-[var(--gray-100)]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
        <Header />
        <main className="page-main py-12">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <p className="text-label mb-4">// no learning path found. please generate a learning path first.</p>
            <button
              onClick={() => navigate(ROUTER.PLANS)}
              className="px-6 py-2 bg-[var(--code-block-bg)] text-white font-medium hover:opacity-90 transition-all"
            >
              {'>_'} goToPlans()
            </button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!currentLesson) {
    return (
      <div className="layout min-h-screen bg-[var(--gray-100)]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
        <Header />
        <main className="page-main py-12">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <p className="text-label mb-4">[ERROR]: lesson not found.</p>
            <button
              onClick={() => navigate(ROUTER.PLANS_RESULT, { state: { skeleton } })}
              className="px-6 py-2 bg-[var(--code-block-bg)] text-white font-medium hover:opacity-90 transition-all"
            >
              {'<'} backToPath()
            </button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="layout min-h-screen bg-[var(--gray-100)]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
      <Header />
      <main className="page-main py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back button */}
          <button
            onClick={() => navigate(ROUTER.PLANS_RESULT, { state: { skeleton } })}
            className="flex items-center gap-2 text-label hover:text-black mb-6 font-medium transition-colors"
          >
            {'<'} back to learning path
          </button>

          {/* Lesson Header */}
          <div className="bg-th-card border border-bd p-6 mb-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-1">
                <div className="text-sm text-muted mb-2 font-mono">
                  // {currentLesson.chapterTitle} • Lesson {currentLesson.lessonIndex + 1}
                </div>
                <h1 className="text-2xl font-bold text-heading flex items-center gap-2">
                  <span className="text-status-blue">{'>_'}</span> {currentLesson.title}
                </h1>
                {currentLesson.description && (
                  <p className="text-label mt-2 text-sm">{currentLesson.description}</p>
                )}
              </div>
            </div>

            {/* Progress indicator */}
            <div className="flex items-center gap-3 text-sm text-label font-mono mt-4 pt-4 border-t border-bd-subtle">
              <span className="w-24">progress:</span>
              <div className="flex-1 h-[6px] bg-th-input">
                <div 
                  className="h-full bg-status-blue-solid transition-all duration-300"
                  style={{ width: `${((currentLessonIndex + 1) / allLessons.length) * 100}%` }}
                />
              </div>
              <span className="w-16 text-right">[{currentLessonIndex + 1}/{allLessons.length}]</span>
            </div>
          </div>

          {/* Lesson Content */}
          <div className="bg-th-card border border-bd p-6 mb-6">
            <LessonContent content={md} loading={loading} error={error || undefined} />
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-4 mt-8">
            {prevLesson ? (
              <button
                onClick={() => navigate(`/lesson/${prevLesson.id}`, { state: { skeleton } })}
                className="flex flex-col items-start px-5 py-3 bg-th-card border border-bd hover:border-black transition-colors w-1/2 max-w-[240px]"
              >
                <div className="text-xs text-muted mb-1">{'<'} previous block</div>
                <div className="text-sm font-medium text-heading truncate w-full text-left">{String(prevLesson.title).toLowerCase()}</div>
              </button>
            ) : (
              <div className="w-1/2 max-w-[240px]" />
            )}

            {nextLesson ? (
              <button
                onClick={() => navigate(`/lesson/${nextLesson.id}`, { state: { skeleton } })}
                className="flex flex-col items-end px-5 py-3 bg-[var(--code-block-bg)] text-white hover:opacity-90 transition-all w-1/2 max-w-[240px] ml-auto"
              >
                <div className="text-xs text-placeholder mb-1">next block {'>'}</div>
                <div className="text-sm font-medium truncate w-full text-right">{String(nextLesson.title).toLowerCase()}</div>
              </button>
            ) : (
              <button
                onClick={() => navigate(ROUTER.PLANS_RESULT, { state: { skeleton } })}
                className="px-6 py-4 bg-status-green-solid-dark text-white font-medium hover:bg-status-green-solid-darker transition-colors ml-auto"
              >
                [✓] complete_path
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
