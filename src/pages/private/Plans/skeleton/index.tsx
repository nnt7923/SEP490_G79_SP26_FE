import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Header from '../../../../components/Layout/Header'
import Footer from '../../../../components/Layout/Footer'
import ROUTER from '../../../../router/ROUTER'
import { getLessonHub, getChapterHub } from '../../../../services/SignalR'
import { generateAllContent } from '../../../../services/ContentGenerator'
import ReactMarkdown from 'react-markdown'

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
        console.warn('[Generate] skipped: skeleton has no lessons. Run Generate Learning Path.')
        return
      }
      try {
        await Promise.all([getLessonHub(), getChapterHub()])
        console.info('[SignalR] lesson & chapter hubs initialized')
        const summary = await generateAllContent(skeleton, { concurrency: 2 })
        console.info('[Generate] done:', summary)
      } catch (err: any) {
        console.error('[Generate] failed:', err?.message || err)
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
        title: ls?.title || `Bài học ${idx + 1}`,
      }))
      .filter((x: any) => !!x.id)
  }, [skeleton])

  const [selectedLessonId, setSelectedLessonId] = useState<string | undefined>(() => lessons?.[0]?.id)
  useEffect(() => {
    if (!selectedLessonId && lessons?.[0]?.id) setSelectedLessonId(lessons[0].id)
  }, [lessons, selectedLessonId])

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
  const reloadMd = () => {
    if (!selectedLessonId) { setMd(''); return }
    const payload = getStored(`lessonContent:${selectedLessonId}`)
    setMd(extractMarkdown(payload))
  }
  useEffect(() => {
    reloadMd()
  }, [selectedLessonId])

  // Path meta for hero section
  const pathId: string | undefined = skeleton?.pathId ?? skeleton?.PathId ?? skeleton?.Id ?? skeleton?.path?.pathId ?? skeleton?.path?.id
  const pathTitle: string = (skeleton?.title ?? skeleton?.path?.title ?? 'Learning Path') as string
  const pathDescription: string | undefined = skeleton?.description ?? skeleton?.path?.description
  const chapterCount: number | undefined = skeleton?.chapterCount ?? skeleton?.ChapterCount
  const createdAt: string | undefined = (skeleton?.createdAt ?? skeleton?.CreatedAt) as any

  const stageCount = useMemo(() => (Array.isArray(skeleton?.lessons) && skeleton.lessons.length) ? skeleton.lessons.length : 6, [skeleton])

  if (!skeleton) return null

  return (
    <div className="layout">
      <Header />
      <main className="page-main" role="main" aria-label="learning-path">
        <div className="page-container">
          {/* Hero frame */}
          <section className="rounded-xl bg-indigo-600 p-6 shadow-sm text-white">
            <div className="flex items-start justify-between">
              <div className="space-y-2 w-full max-w-[720px]">
                <h1 className="text-xl sm:text-2xl font-semibold">{pathTitle}</h1>
                {pathDescription ? (
                  <p className="text-white/90 text-sm sm:text-base">{pathDescription}</p>
                ) : (
                  <p className="text-white/80 text-sm">Không có mô tả đường học.</p>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  {pathId ? (
                    <span className="inline-flex items-center rounded bg-white/10 px-2 py-1 text-xs">
                      <span className="opacity-80">PathID:</span>&nbsp;
                      <code>{String(pathId).slice(0, 8)}…</code>
                    </span>
                  ) : null}
                  {typeof chapterCount === 'number' ? (
                    <span className="inline-flex items-center rounded bg-white/10 px-2 py-1 text-xs">Chapters: {chapterCount}</span>
                  ) : null}
                  {createdAt ? (
                    <span className="inline-flex items-center rounded bg-white/10 px-2 py-1 text-xs">
                      Created: {new Date(createdAt).toLocaleString()}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          {/* Grid layout: left lesson content, right skeleton list */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="card card__pad">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Nội dung bài học</h2>
                <div className="flex items-center gap-2">
                  <select
                    className="border rounded px-2 py-1 text-sm"
                    value={selectedLessonId || ''}
                    onChange={(e) => setSelectedLessonId(e.target.value || undefined)}
                  >
                    {lessons.map((ls: any) => (
                      <option key={ls.id} value={ls.id}>{ls.title}</option>
                    ))}
                  </select>
                  <button className="btn" onClick={reloadMd}>Cập nhật</button>
                </div>
              </div>
              <div className="prose max-w-none overflow-auto" style={{ maxHeight: 480 }}>
                {md ? (
                  <ReactMarkdown>{md}</ReactMarkdown>
                ) : (
                  <div className="text-gray-500 text-sm">Chưa có nội dung cho bài học đã chọn.</div>
                )}
              </div>
            </div>

            <div className="card card__pad">
              <h2 className="text-lg font-semibold mb-3">Khung kế hoạch</h2>
              {Array.isArray(skeleton?.lessons) && skeleton.lessons.length > 0 ? (
                <ul className="space-y-2">
                  {skeleton.lessons.map((ls: any, idx: number) => (
                    <li key={ls.id ?? ls.title}>
                      <div className="font-medium text-gray-800">{ls.title ?? `Bài học ${idx + 1}`}</div>
                      {Array.isArray(ls.chapters) && ls.chapters.length > 0 ? (
                        <ul className="mt-1 ml-4 list-disc text-sm text-gray-600">
                          {ls.chapters.map((ch: any) => (
                            <li key={ch.id ?? ch.title}>{ch.title ?? 'Chapter'}</li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-gray-500 text-sm">Chưa có chapters.</div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-gray-500">Chưa có danh sách bài/chương trong skeleton.</div>
              )}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default ResultPage