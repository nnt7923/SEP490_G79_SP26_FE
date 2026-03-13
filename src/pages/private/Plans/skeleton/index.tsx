import React, { useEffect, useMemo, useState, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Layout from '../../../../components/Layout'
import { useStudentSidebarConfig } from '../../Student/components/StudentSideBar'
import ROUTER from '../../../../router/ROUTER'
import { requestLessonContent } from '../../../../services/SignalR'
import { generateAllContent } from '../../../../services/ContentGenerator'
import LessonContent from '../components/LessonContent'
import ChapterTasks from '../components/ChapterTasks'
import { useTranslation } from 'react-i18next'
import QuizStatusBadge from '../../../../components/Quiz/QuizStatusBadge'
import { mergeSkeletonWithCachedQuizzes } from '../../../../utils/quizCache'

const ResultPage: React.FC = () => {
  const location = useLocation() as any
  const navigate = useNavigate()
  const { t } = useTranslation('student')

  const readStoredSkeleton = () => {
    try {
      const raw = sessionStorage.getItem('learningPathSkeleton')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }

  const [skeleton, setSkeleton] = useState<any | null>(() => {
    const fromState = location?.state?.skeleton
    const base = fromState || readStoredSkeleton()
    return mergeSkeletonWithCachedQuizzes(base)
  })

  useEffect(() => {
    if (!skeleton) navigate(ROUTER.PLANS)
  }, [skeleton, navigate])

  useEffect(() => {
    const fromState = location?.state?.skeleton
    const base = fromState || readStoredSkeleton()
    setSkeleton(mergeSkeletonWithCachedQuizzes(base))
  }, [location?.key])

  // Dev-only: initialize hubs and generate content in background
  useEffect(() => {
    const run = async () => {
      if (!import.meta.env.DEV || !skeleton) return
      const lessonCount = Array.isArray(skeleton?.lessons) ? skeleton.lessons.length : 0
      if (lessonCount === 0) {
        return
      }
      try {
        await generateAllContent(skeleton, { concurrency: 2 })
      } catch (err: any) { } // eslint-disable-line no-empty
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
        try { sessionStorage.setItem(`lessonContent:${selectedLessonId}`, JSON.stringify(found?.content)) } catch { }
        return
      }

      // 2) Fallback to SignalR request
      try {
        const content = await requestLessonContent(selectedLessonId, () => {
          if (!disposed) setLoading(true)
        })
        if (disposed) return
        try { sessionStorage.setItem(`lessonContent:${selectedLessonId}`, JSON.stringify(content)) } catch { }
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

  // Header info
  const pathTitle: string = skeleton?.title || skeleton?.path?.title || t('plansResult.title')
  const pathDescription: string = skeleton?.description || skeleton?.path?.description || ''
  const createdAt: string | undefined = (skeleton?.createdAt ?? skeleton?.CreatedAt) as any

  // Chapters tree (new API)
  const chapters = useMemo(() => {
    return Array.isArray(skeleton?.chapters) ? skeleton.chapters : []
  }, [skeleton])

  const [activeChapterId, setActiveChapterId] = useState<string | null>(null)
  const detailScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chapters.length > 0 && !activeChapterId) {
      setActiveChapterId(chapters[0].id)
    }
  }, [chapters, activeChapterId])

  // Scroll details pane to top when chapter changes
  useEffect(() => {
    if (detailScrollRef.current) {
      detailScrollRef.current.scrollTop = 0
    }
  }, [activeChapterId])

  // Handle lesson click - navigate to lesson detail page
  const handleLessonClick = (lessonId: string, lessonTitle: string) => {
    // Navigate to lesson detail page with skeleton data
    navigate(`/lesson/${lessonId}`, { state: { skeleton } })
  }

  // Focus session dialog states - removed, using ChapterTasks component for focus sessions
  const [showLessonContent, setShowLessonContent] = useState(false)

  const navItems = useStudentSidebarConfig()
  const sidebarConfig = {
    navItems,
    actions: [],
    brand: { name: t('plansResult.brandName'), subtitle: t('plansResult.brandSubtitle') },
  }

  return (
    <Layout sidebar={sidebarConfig}>
      <div style={{
        padding: 32,
        background: 'var(--bg-main)',
        minHeight: '100vh',
        fontFamily: 'monospace'
      }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>

          {/* Hero frame */}
          <section style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-base)',
            borderRadius: 4,
            padding: 32,
            marginBottom: 32,
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Terminal decorative top bar */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 4,
              background: 'linear-gradient(90deg, var(--accent-primary) 0%, transparent 100%)'
            }} />

            <h1 style={{
              color: 'var(--text-primary)', fontSize: 24, fontWeight: 700, margin: '0 0 16px 0',
              display: 'flex', alignItems: 'center', gap: 12
            }}>
              <span style={{ color: 'var(--accent-primary)' }}>{'>'}</span>
              {pathTitle}
              <span style={{ animation: 'blink 1s step-end infinite', color: 'var(--accent-primary)', fontWeight: 300 }}>_</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '0 0 24px 0', lineHeight: 1.6 }}>
              // {pathDescription || t('plansResult.noDescription')}
            </p>

            <div style={{
              display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-primary)',
              fontWeight: 600, flexWrap: 'wrap'
            }}>
              <span style={{
                background: 'var(--bg-main)', padding: '6px 12px', borderRadius: 2, border: '1px dashed var(--border-base)'
              }}>
                [ {t('plansResult.chaptersFormat', { count: chapters.length })} ]
              </span>
              <span style={{
                background: 'var(--bg-main)', padding: '6px 12px', borderRadius: 2, border: '1px dashed var(--border-base)'
              }}>
                [ {t('plansResult.lessonsFormat', { count: lessons.length })} ]
              </span>
              {createdAt && (
                <span style={{
                  background: 'var(--bg-main)', padding: '6px 12px', borderRadius: 2, border: '1px dashed var(--border-base)'
                }}>
                  [ {new Date(createdAt).toLocaleDateString()} ]
                </span>
              )}
            </div>
          </section>

          {/* Chapters & Lessons Display */}
          {chapters.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 30%) 1fr', gap: 24, marginBottom: 32, alignItems: 'start' }}>
              <style>
                {`
                  @keyframes blink { 50% { opacity: 0; } }
                  .chapter-btn { transition: all 0.2s ease; border-left: 2px solid transparent; }
                  .chapter-btn:hover { background: var(--gray-100); }
                  .chapter-btn.active { background: var(--bg-surface); border-left-color: var(--accent-primary); border-top: 1px solid var(--border-base); border-right: 1px solid var(--border-base); border-bottom: 1px solid var(--border-base); }
                  .lesson-link { transition: all 0.2s ease; }
                  .lesson-link:hover { padding-left: 8px; color: var(--accent-primary) !important; text-decoration: underline; }
                  
                  .term-scroll::-webkit-scrollbar { width: 6px; }
                  .term-scroll::-webkit-scrollbar-track { background: transparent; }
                  .term-scroll::-webkit-scrollbar-thumb { background: var(--border-base); border-radius: 3px; }
                  .term-scroll::-webkit-scrollbar-thumb:hover { background: var(--text-disabled); }
                  .term-scroll { scrollbar-width: thin; scrollbar-color: var(--border-base) transparent; }
                `}
              </style>

              {/* Left Column: Chapters List */}
              <div className="term-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '600px', overflowY: 'auto', paddingRight: '8px' }}>
                <h2 style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 8, marginTop: 0, textTransform: 'uppercase', letterSpacing: 1 }}>
                  {'// '} {t('plansResult.contentTree')}
                </h2>

                {chapters.map((chapter: any, chapterIdx: number) => {
                  const isActive = activeChapterId === chapter.id

                  return (
                    <button
                      key={chapter.id || chapterIdx}
                      className={`chapter-btn ${isActive ? 'active' : ''}`}
                      onClick={() => setActiveChapterId(chapter.id)}
                      style={{
                        width: '100%', padding: '16px', display: 'flex', alignItems: 'center', gap: 12,
                        background: isActive ? 'var(--bg-surface)' : 'transparent',
                        border: isActive ? '1px solid var(--border-base)' : '1px solid transparent',
                        borderLeft: isActive ? '3px solid var(--accent-primary)' : '3px solid transparent',
                        borderRadius: 4, cursor: 'pointer', textAlign: 'left'
                      }}
                    >
                      <div style={{
                        width: 28, height: 28, borderRadius: 2, flexShrink: 0,
                        background: 'var(--bg-main)',
                        border: '1px solid var(--border-base)',
                        color: 'var(--text-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12
                      }}>
                        {chapterIdx + 1}
                      </div>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <h3 style={{ margin: 0, fontSize: 14, fontWeight: isActive ? 700 : 600, color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {chapter.title}
                        </h3>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Right Column: Selected Chapter Detail */}
              <div ref={detailScrollRef} className="term-scroll" style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-base)',
                borderRadius: 4,
                height: '600px',
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
                overflowX: 'hidden'
              }}>
                {(() => {
                  const chapter = chapters.find((c: any) => c.id === activeChapterId)
                  if (!chapter) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-disabled)' }}>[ SELECT_CHAPTER ]</div>

                  return (
                    <>
                      {/* Detail Header */}
                      <div style={{ padding: '24px', borderBottom: '1px dashed var(--border-base)', background: 'var(--bg-main)' }}>
                        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
                          {chapter.title}
                        </h3>
                        {chapter.content && (
                          <p style={{ margin: '12px 0 0', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            {chapter.content}
                          </p>
                        )}
                      </div>

                      {/* Lessons List */}
                      {chapter.lessons && chapter.lessons.length > 0 && (
                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                          <h4 style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1 }}>
                            {'//'} {t('plansResult.lessonsCount', { count: chapter.lessons.length })}
                          </h4>
                          <div style={{ display: 'grid', gap: 16 }}>
                            {chapter.lessons.map((lesson: any, lessonIdx: number) => (
                              <div key={lesson.id || lessonIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '16px', background: 'var(--bg-main)', border: '1px solid var(--border-base)', borderRadius: 4 }}>
                                <div style={{
                                  width: 24, height: 24, borderRadius: '50%', background: 'var(--text-disabled)', color: 'var(--bg-surface)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0
                                }}>
                                  {lessonIdx + 1}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <button
                                    className="lesson-link"
                                    onClick={() => handleLessonClick(lesson.id, lesson.title)}
                                    style={{
                                      background: 'none', border: 'none', padding: 0, margin: '0 0 8px 0',
                                      fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer',
                                      textDecoration: 'none', textAlign: 'left', display: 'block'
                                    }}
                                  >
                                    {lesson.title}
                                  </button>
                                  {lesson.description && (
                                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                      {'>'} {lesson.description}
                                    </p>
                                  )}

                                  {lesson.quizzes && lesson.quizzes.length > 0 && (
                                    <div style={{ marginTop: 12, padding: '12px', background: 'var(--bg-surface)', border: '1px dashed var(--border-base)', borderRadius: 2 }}>
                                      <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                                        {t('plansResult.quizzes')}
                                      </span>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                                        {lesson.quizzes.map((quiz: any, quizIdx: number) => {
                                          const quizId = quiz?.id ?? quiz?.quizId ?? quiz?.quizzId
                                          return (
                                            <button
                                              key={quizId || quizIdx}
                                              onClick={() => {
                                                if (!quizId) return
                                                navigate(`/quiz/${quizId}`, {
                                                  state: { quizTitle: quiz.title, skeleton }
                                                })
                                              }}
                                              style={{
                                                background: 'transparent', border: 'none', padding: 0, fontSize: 13, color: 'var(--accent-primary)',
                                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, textAlign: 'left'
                                              }}
                                              onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline' }}
                                              onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none' }}
                                            >
                                              <span style={{ color: 'var(--success-primary)' }}>➔</span>
                                              <span style={{ display: 'flex', alignItems: 'center' }}>
                                                {quiz.title}
                                                {quizId && <QuizStatusBadge quizId={quizId} />}
                                              </span>
                                            </button>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Chapter Tasks */}
                      <div style={{ marginTop: 'auto' }}>
                        <ChapterTasks chapterId={chapter.id} />
                      </div>
                    </>
                  )
                })()}
              </div>
            </div>
          ) : (
            <div style={{
              padding: 40, textAlign: 'center', color: 'var(--text-disabled)', fontFamily: 'monospace',
              background: 'var(--bg-surface)', border: '1px dashed var(--border-base)', borderRadius: 2, marginBottom: 32
            }}>
              [ {t('plansResult.noChapters')} ]
            </div>
          )}

          {/* Lesson Content Viewer (shown when user clicks a lesson, if active in state) */}
          {showLessonContent && (
            <section style={{
              background: 'var(--bg-surface)', border: '1px solid var(--accent-primary)', borderRadius: 4, padding: 32,
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 16, borderBottom: '1px dashed var(--border-base)' }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--accent-primary)' }}>{'//'}</span> {t('plansResult.lessonContent')}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <select
                    style={{
                      padding: '6px 16px', background: 'var(--bg-main)', border: '1px solid var(--border-base)',
                      borderRadius: 2, color: 'var(--text-primary)', fontSize: 13, outline: 'none', cursor: 'pointer'
                    }}
                    value={selectedLessonId || ''}
                    onChange={(e) => setSelectedLessonId(e.target.value || undefined)}
                  >
                    {lessons.map((ls: any) => (
                      <option key={ls.id} value={ls.id}>{ls.title}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowLessonContent(false)}
                    style={{
                      padding: '6px 16px', background: 'var(--bg-main)', border: '1px solid var(--border-base)',
                      borderRadius: 2, color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer', fontWeight: 600
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-primary)'; e.currentTarget.style.borderColor = 'var(--accent-primary)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-base)' }}
                  >
                    [ {t('plansResult.close').toUpperCase()} ]
                  </button>
                </div>
              </div>
              <LessonContent content={md} loading={loading} error={error || undefined} />
            </section>
          )}

        </div>
      </div>
    </Layout>
  )
}

export default ResultPage
