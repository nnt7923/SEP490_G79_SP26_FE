
import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Header from '../../../../components/Layout/Header'
import Footer from '../../../../components/Layout/Footer'
import ROUTER from '../../../../router/ROUTER'
import { requestLessonContent, requestChapterContent } from '../../../../services/SignalR'
import { generateAllContent } from '../../../../services/ContentGenerator'
import LessonContent from '../components/LessonContent'

const ResultPage: React.FC = () => {
  const location = useLocation() as any
  const navigate = useNavigate()
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

  useEffect(() => {
    if (!skeleton) navigate(ROUTER.PLANS)
  }, [skeleton, navigate])

  // Dev-only: initialize hubs and generate content in background
  useEffect(() => {
    const run = async () => {
      if (!import.meta.env.DEV || !skeleton) return
      const lessonCount = Array.isArray(skeleton?.lessons) ? skeleton.lessons.length : 0
      if (lessonCount === 0) {

        /* no-op: skip background generation when no lessons */
         return
       }
       try {
         // Hubs will be started on first request; content generation is stubbed
         const summary = await generateAllContent(skeleton, { concurrency: 2 })

        // generation summary available if needed in DEV via debugger
       } catch (err: any) {
         // Removed console.error in Generate error handler
       }
     }
     run()
   }, [skeleton])

  // Lessons list from skeleton (normalize id/title)
  const lessons = useMemo(() => {
    const raw = Array.isArray(skeleton?.lessons) ? skeleton.lessons : []
    return raw
      .map((ls: any, idx: number) => ({
        id: ls?.id ?? ls?.lessonId ?? ls?.LessonId,
        title: ls?.title || `Lesson ${idx + 1}`,
        content: ls?.content ?? null,
        chapters: Array.isArray(ls?.chapters) ? ls.chapters : [],
      }))
      .filter((x: any) => !!x.id)
  }, [skeleton])

  const selectedFromNav: string | undefined = location?.state?.selectedLessonId
  const [selectedLessonId, setSelectedLessonId] = useState<string | undefined>(() => selectedFromNav || lessons?.[0]?.id)
  useEffect(() => {
    if (!selectedLessonId && lessons?.[0]?.id) setSelectedLessonId(lessons[0].id)
  }, [lessons, selectedLessonId])

  // Helpers to extract markdown-like text from various payload shapes
  const getStored = (key: string) => {
    try { return JSON.parse(sessionStorage.getItem(key) || 'null') } catch { return null }
  }
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

  const [md, setMd] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch lesson content via SignalR when selected lesson changes
  useEffect(() => {
    let disposed = false
    const run = async () => {
      if (!selectedLessonId) { setMd(''); setError(null); return }
      setLoading(true)
      setError(null)

      // 1) Prefer content provided directly in skeleton
      const found = lessons.find((x: any) => x.id === selectedLessonId)
      const fromSkeleton = extractMarkdown(found?.content)
      if (!disposed && fromSkeleton && fromSkeleton.trim().length > 0) {
        setMd(fromSkeleton)
        setLoading(false)
        try { sessionStorage.setItem(`lessonContent:${selectedLessonId}`, JSON.stringify(found?.content)) } catch {}
        return
      }

      // 2) Fallback to SignalR request
      try {
        const content = await requestLessonContent(selectedLessonId, () => {
          if (!disposed) setLoading(true)
        })
        if (disposed) return
        try { sessionStorage.setItem(`lessonContent:${selectedLessonId}`, JSON.stringify(content)) } catch {}
        setMd(extractMarkdown(content))
      } catch (e: any) {
        if (disposed) return
        const msg = e?.message || 'Unable to load lesson content.'
        // Fallback to any cached content
        const cached = getStored(`lessonContent:${selectedLessonId}`)
        if (cached) {
          setMd(extractMarkdown(cached))
        } else {
          setError(msg)
        }
      } finally {
        if (!disposed) setLoading(false)
      }
    }
    run()
    return () => { disposed = true }
  }, [selectedLessonId, lessons])

  // Allow chapter content loading as well
  const loadChapterContent = async (chapterId: string) => {
    setLoading(true)
    setError(null)
    try {
      const content = await requestChapterContent(chapterId, () => setLoading(true))
      setMd(extractMarkdown(content))
    } catch (e: any) {
      const msg = e?.message || 'Unable to load chapter content.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // Header info
  const pathTitle: string = skeleton?.title || skeleton?.path?.title || 'Learning Path'
  const pathDescription: string = skeleton?.description || skeleton?.path?.description || ''
  const chapterCount: number | undefined = (() => {
    const fromArray = Array.isArray(skeleton?.chapters) ? skeleton.chapters.length : undefined
    if (typeof fromArray === 'number') return fromArray
    const lessonsRaw = Array.isArray(skeleton?.lessons) ? skeleton.lessons : []
    return lessonsRaw.flatMap((ls: any) => ls?.chapters || []).length || undefined
  })()
  const pathId: string | undefined = skeleton?.pathId ?? skeleton?.PathId ?? skeleton?.Id ?? skeleton?.path?.pathId ?? skeleton?.path?.id
  const createdAt: string | undefined = (skeleton?.createdAt ?? skeleton?.CreatedAt) as any

  // Chapters tree (new API)
  const chapters = useMemo(() => {
    return Array.isArray(skeleton?.chapters) ? skeleton.chapters : []
  }, [skeleton])

  return (
    <div className="layout min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50">
      <Header />
      <main className="page-main py-12" role="main" aria-label="learning-path">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero frame */}
          <section className="rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-600 p-8 shadow-xl text-white mb-8">
            <div className="flex items-start justify-between">
              <div className="space-y-3 w-full max-w-3xl">
                <h1 className="text-2xl sm:text-3xl font-bold font-heading">{pathTitle}</h1>
                {pathDescription ? (
                  <p className="text-white/95 text-base sm:text-lg">{pathDescription}</p>
                ) : (
                  <p className="text-white/80 text-sm">No learning path description.</p>
                )}
                {/* Removed badges: PathID, Chapters, Created */}
              </div>
            </div>
          </section>

          {/* Grid layout: full width lesson/chapter content */}
          <section className="grid grid-cols-1 gap-6">
            <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 font-heading">Lesson / Chapter Content</h2>
                <div className="flex items-center gap-2">
                  <select
                    className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none text-sm font-medium transition-colors"
                    value={selectedLessonId || ''}
                    onChange={(e) => setSelectedLessonId(e.target.value || undefined)}
                    aria-label="Select lesson"
                  >
                    {lessons.map((ls: any) => (
                      <option key={ls.id} value={ls.id}>{ls.title}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="px-3 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition"
                    title="View lesson content"
                    onClick={() => selectedLessonId && setSelectedLessonId(selectedLessonId)}
                  >
                    View
                  </button>
                </div>
              </div>

              <LessonContent content={md} loading={loading} error={error || undefined} />
            </div>
          </section>

          {/* Empty state */}
          {(!Array.isArray(chapters) || chapters.length === 0) && (
            <div className="text-gray-500 text-center py-8">No chapter/lesson list found in the skeleton.</div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default ResultPage