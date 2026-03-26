import React, { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import Header from '../../../../components/Layout/Header'
import Footer from '../../../../components/Layout/Footer'
import TutorChatbot from '../../../../components/TutorChatbot'
import { requestLessonContent, requestResolveTutorConversation } from '../../../../services/SignalR'
import LearningPathService from '../../../../services/LearningPathService'
import LessonContent from '../components/LessonContent'
import ROUTER from '../../../../router/ROUTER'
import { ArrowLeft, Maximize2, Minimize2, BookOpen, AlertCircle, ArrowUp, ArrowDown, CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

// Helper to extract headings (## and ###) from markdown
const extractHeadings = (md: string) => {
  if (!md) return []
  const matches = [...md.matchAll(/^(##|###)\s+(.+)$/gm)]
  let h2Counter = 0
  let h3Counter = 0
  return matches.map(m => {
    const level = m[1].length // 2 for ##, 3 for ###
    let numberPrefix = ''
    if (level === 2) {
      h2Counter++
      h3Counter = 0
      numberPrefix = `${h2Counter}.`
    } else if (level === 3) {
      h3Counter++
      numberPrefix = `${h2Counter}.${h3Counter}.`
    }
    const rawText = m[2].trim()
    const text = `${numberPrefix} ${rawText}`
    const id = rawText.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
    return { level, text, id, element: null as HTMLElement | null }
  })
}

const SECTION_KEYS = [
  'overview',
  'core-concepts',
  'code-examples',
  'common-mistakes',
  'best-practices',
  'summary',
] as const

type LessonSectionKey = (typeof SECTION_KEYS)[number]

const HEADING: Record<LessonSectionKey, string> = {
  overview: '## Overview',
  'core-concepts': '## Core Concepts',
  'code-examples': '## Code Examples',
  'common-mistakes': '## Common Mistakes',
  'best-practices': '## Best Practices',
  summary: '## Summary',
}

const ORDER: LessonSectionKey[] = [
  'overview',
  'core-concepts',
  'code-examples',
  'common-mistakes',
  'best-practices',
  'summary',
]

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const extractSectionByMarkers = (markdown: string, key: LessonSectionKey): string => {
  const start = `<!-- SECTION:${key}:start -->`
  const end = `<!-- SECTION:${key}:end -->`

  const startIndex = markdown.indexOf(start)
  const endIndex = markdown.indexOf(end)

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) return ''

  return markdown.slice(startIndex + start.length, endIndex).trim()
}

const extractSectionByHeading = (markdown: string, heading: string): string => {
  const pattern = new RegExp(`^${escapeRegExp(heading)}\\s*\\n([\\s\\S]*?)(?=^##\\s|\\Z)`, 'im')
  const match = markdown.match(pattern)
  return match ? match[1].trim() : ''
}

const normalizeSectionContent = (section: string, key: LessonSectionKey): string => {
  const heading = HEADING[key]
  const pattern = new RegExp(`^${escapeRegExp(heading)}\\s*\\n+`, 'i')
  return section.replace(pattern, '').trim()
}

const buildTocSource = (markdown: string) => {
  if (!markdown) return ''

  const hasAnyMarker = SECTION_KEYS.some((key) =>
    markdown.includes(`<!-- SECTION:${key}:start -->`)
  )

  const sections = {} as Record<LessonSectionKey, string>
  SECTION_KEYS.forEach((key) => {
    const markerContent = hasAnyMarker ? extractSectionByMarkers(markdown, key) : ''
    if (markerContent) {
      sections[key] = normalizeSectionContent(markerContent, key)
      return
    }

    sections[key] = extractSectionByHeading(markdown, HEADING[key])
  })

  return ORDER.map((key) => {
    const content = sections[key]?.trim()
    if (!content) return null
    return `${HEADING[key]}\n\n${content}`
  })
    .filter(Boolean)
    .join('\n\n')
}

const LessonDetailPage: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>()
  const navigate = useNavigate()
  const location = useLocation() as any
  const { t } = useTranslation('student')
  
  const [skeleton] = useState<any | null>(() => {
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
  const [lessonReadStatusLoading, setLessonReadStatusLoading] = useState(false)
  const [markLessonReadLoading, setMarkLessonReadLoading] = useState(false)
  const [isLessonRead, setIsLessonRead] = useState(false)
  const [lessonReadAt, setLessonReadAt] = useState<string | null>(null)
  const [lessonReadError, setLessonReadError] = useState<string | null>(null)
  
  const [isFocusMode, setIsFocusMode] = useState(false)

  // Tutor conversation state
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversationCreated, setConversationCreated] = useState<boolean>(false)
  const [conversationLoading, setConversationLoading] = useState<boolean>(false)

  const toggleFocusMode = async () => {
    if (!isFocusMode) {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen().catch(() => {})
      }
      setIsFocusMode(true)
    } else {
      if (document.exitFullscreen && document.fullscreenElement) {
        await document.exitFullscreen().catch(() => {})
      }
      setIsFocusMode(false)
    }
  }

  // Handle ESC key or exiting fullscreen manually
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFocusMode) {
        setIsFocusMode(false)
      }
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [isFocusMode])

  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null)

  // Extract all lessons from chapters
  const allLessons = useMemo(() => {
    if (!skeleton?.chapters) return []
    return skeleton.chapters.flatMap((chapter: any, chapterIdx: number) => 
      (chapter.lessons || []).map((lesson: any, lessonIdx: number) => ({
        ...lesson,
        chapterTitle: chapter.title,
        chapterIndex: chapterIdx,
        chapterId: chapter.id,
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
  const currentChapterId = currentLesson?.chapterId
  const canShowMarkRead = !loading && !error && md.trim().length > 0
  const lessonReadLabel = isLessonRead
    ? t('lessonDetail.readCompleted', 'Marked as completed')
    : t('lessonDetail.markRead', 'Mark lesson as completed')

  const handleBack = () => {
    if (skeleton?.pathId || skeleton?.id) {
      navigate('/my-plans/detail', { 
        state: { 
          pathId: skeleton.pathId || skeleton.id, 
          selectedLessonId: lessonId, 
          activeChapterId: currentChapterId,
          skeleton: skeleton
        } 
      })
    } else {
      navigate(ROUTER.PLANS_RESULT, { state: { skeleton, selectedLessonId: lessonId, activeChapterId: currentChapterId } })
    }
  }

  useEffect(() => {
    if (!lessonId || !currentLesson) return

    let cancelled = false

    const loadLessonReadStatus = async () => {
      setLessonReadStatusLoading(true)
      setLessonReadError(null)
      setIsLessonRead(false)
      setLessonReadAt(null)

      try {
        const result = await LearningPathService.getLessonReadStatus(lessonId)
        if (cancelled) return
        setIsLessonRead(result.isLessonContentRead)
        setLessonReadAt(result.readAt)
      } catch (error: any) {
        if (cancelled) return
        const message = error?.response?.data?.message || error?.message || t('lessonDetail.readStatusError', 'Unable to check lesson completion status.')
        setLessonReadError(message)
      } finally {
        if (!cancelled) setLessonReadStatusLoading(false)
      }
    }

    loadLessonReadStatus()
    return () => {
      cancelled = true
    }
  }, [lessonId, currentLesson, t])

  const handleMarkLessonRead = async () => {
    if (!lessonId || isLessonRead || markLessonReadLoading) return

    setMarkLessonReadLoading(true)
    setLessonReadError(null)
    try {
      await LearningPathService.markLessonContentRead(lessonId)
      const now = new Date().toISOString()
      setIsLessonRead(true)
      setLessonReadAt((prev) => prev ?? now)
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || t('lessonDetail.markReadError', 'Unable to mark this lesson as completed.')
      setLessonReadError(message)
    } finally {
      setMarkLessonReadLoading(false)
    }
  }

  // Table of Contents
  const tocSource = useMemo(() => buildTocSource(md), [md])
  const headings = useMemo(() => extractHeadings(tocSource || md), [tocSource, md])

  // Scroll spy to highlight active TOC item
  useEffect(() => {
    if (!headings.length || isFocusMode) return

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100 // Offset for fixed header
      
      for (let i = headings.length - 1; i >= 0; i--) {
        const element = document.getElementById(headings[i].id)
        if (element && element.offsetTop <= scrollPosition) {
          setActiveHeadingId(headings[i].id)
          break
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    // Call once to set initial state
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [headings, isFocusMode])

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

  // Resolve tutor conversation when entering lesson
  useEffect(() => {
    if (!lessonId || !skeleton?.pathId) return

    const resolveConversation = async () => {
      setConversationLoading(true)
      try {
        const result = await requestResolveTutorConversation(
          skeleton.pathId, // learningPathId
          currentChapterId, // chapterId
          lessonId, // lessonId
          true, // createIfMissing
          () => {
            // onLoading - already set loading above
          },
          (data) => {
            // onResolved
            setConversationId(data.conversationId)
            setConversationCreated(data.created || false)
          }
        )

        // Set conversation data from result
        if (result?.conversationId) {
          setConversationId(result.conversationId)
          setConversationCreated(result.created || false)
        }
      } catch (error: any) {
        console.warn('Failed to resolve tutor conversation:', error.message)
        // Don't show error to user, just continue without conversation
      } finally {
        setConversationLoading(false)
      }
    }

    resolveConversation()
  }, [lessonId, skeleton?.pathId, currentChapterId])

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
        const content = await requestLessonContent(
          lessonId,
          () => {
            if (!disposed) setLoading(true)
          }
        )
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

  const scrollToHeading = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      window.scrollTo({ top: el.offsetTop - 80, behavior: 'smooth' })
    }
  }
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const scrollToBottom = () => {
    const height = document.documentElement?.scrollHeight || document.body?.scrollHeight || 0
    window.scrollTo({ top: height, behavior: 'smooth' })
  }

  if (!skeleton) {
    return (
      <div className="layout min-h-screen" style={{ background: 'var(--bg-main)', fontFamily: 'monospace' }}>
        <Header />
        <main className="page-main py-12">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <p style={{ color: 'var(--text-secondary)' }} className="mb-4">{t('lessonDetail.noPathFound', 'No learning path found. Please generate a learning path first.')}</p>
            <button
              onClick={() => navigate(ROUTER.PLANS)}
              style={{
                background: 'var(--accent-primary)', color: 'var(--bg-surface)', border: 'none',
                padding: '8px 16px', borderRadius: 4, fontWeight: 700, cursor: 'pointer'
              }}
            >
              {t('lessonDetail.goToPlans', 'Go to Plans')}
            </button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!currentLesson) {
    return (
      <div className="layout min-h-screen" style={{ background: 'var(--bg-main)', fontFamily: 'monospace' }}>
        <Header />
        <main className="page-main py-12">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <p style={{ color: 'var(--error-primary)' }} className="mb-4">{t('lessonDetail.lessonNotFound', 'Lesson not found.')}</p>
            <button
              onClick={handleBack}
              style={{
                background: 'var(--bg-surface)', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)',
                padding: '8px 16px', borderRadius: 4, fontWeight: 600, cursor: 'pointer'
              }}
            >
              {t('lessonDetail.backToPath', 'Back to Learning Path')}
            </button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="layout min-h-screen" style={{ background: 'var(--bg-main)', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
      {!isFocusMode && <Header />}
      
      {/* Top Banner specific for Lessons */}
      {!isFocusMode && (
        <div style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-base)', position: 'sticky', top: 0, zIndex: 40 }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={handleBack}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', background: 'transparent',
                border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700 
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              <ArrowLeft className="w-4 h-4" /> <span>{t('lessonDetail.backToPlan')}</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
               <button
                 onClick={toggleFocusMode}
                 style={{
                   display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-main)', border: '1px dashed var(--border-base)',
                   color: 'var(--accent-primary)', padding: '6px 12px', borderRadius: 2, cursor: 'pointer', fontSize: 12, fontWeight: 600
                 }}
                 onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                 onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-base)'}
                 title="Toggle Distraction-Free Reading"
               >
                 <Maximize2 className="w-4 h-4" />
                 <span>{t('lessonDetail.enableFocus')}</span>
               </button>
            </div>
          </div>
          
          {/* Progress Bar inside banner */}
          <div style={{ height: 2, width: '100%', background: 'var(--bg-main)' }}>
             <div style={{ height: '100%', background: 'var(--accent-primary)', width: `${((currentLessonIndex + 1) / allLessons.length) * 100}%`, transition: 'width 0.3s ease' }} />
          </div>
        </div>
      )}

      {/* Floating Exit Focus Button in Focus Mode */}
      {isFocusMode && (
        <button
          onClick={toggleFocusMode}
          style={{
            position: 'fixed', top: 24, right: 24, zIndex: 100000,
            display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-main)', border: '1px dashed var(--border-base)',
            color: 'var(--text-primary)', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 700
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.color = 'var(--accent-primary)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-base)'; e.currentTarget.style.color = 'var(--text-primary)' }}
        >
          <Minimize2 className="w-4 h-4" /> <span>{t('lessonDetail.exitFocus')}</span>
        </button>
      )}

      <main style={{ padding: isFocusMode ? '100px 0 64px' : '32px 0' }}>
        <div style={{ 
          maxWidth: 1280, 
          margin: '0 auto', 
          padding: '0 24px',
          display: 'grid',
          gridTemplateColumns: isFocusMode ? '1fr' : '1fr 300px',
          gap: 40,
          alignItems: 'start',
          transition: 'all 0.3s ease'
        }}>
          
          {/* Main Reading Column */}
          <div style={{ minWidth: 0 }}>
            {/* Lesson Title Header */}
            <div style={{ marginBottom: 40, maxWidth: isFocusMode ? 800 : '100%', marginLeft: 'auto', marginRight: 'auto' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
                 <BookOpen className="w-4 h-4" />
                 {currentLesson.chapterTitle} <span style={{ color: 'var(--border-strong)' }}>/</span> {String(currentLessonIndex + 1).padStart(2, '0')}
              </div>
              <h1 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 16px 0', lineHeight: 1.3, color: 'var(--text-primary)' }}>
                {currentLesson.title}
              </h1>
              {currentLesson.description && (
                <p style={{ fontSize: 16, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6, borderLeft: '3px solid var(--accent-primary)', paddingLeft: 16 }}>
                  {currentLesson.description}
                </p>
              )}
            </div>

            {/* Lesson Content Render */}
            <LessonContent content={md} loading={loading} error={error || undefined} isFocusMode={isFocusMode} />

            {canShowMarkRead && (
              <div style={{ marginTop: 24, maxWidth: isFocusMode ? 800 : '100%', marginLeft: 'auto', marginRight: 'auto' }}>
                <div style={{
                  background: 'var(--bg-surface)',
                  border: `1px solid ${isLessonRead ? 'var(--success-primary)' : 'var(--border-base)'}`,
                  borderRadius: 6,
                  padding: '16px 18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 16,
                  flexWrap: 'wrap'
                }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                      {t('lessonDetail.readProgress', 'Lesson reading progress')}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: isLessonRead ? 'var(--success-primary)' : 'var(--text-primary)', fontWeight: 700 }}>
                      {isLessonRead && <CheckCircle2 className="w-4 h-4" />}
                      <span>
                        {lessonReadStatusLoading
                          ? t('lessonDetail.readStatusLoading', 'Checking completion status...')
                          : lessonReadLabel}
                      </span>
                    </div>
                    {isLessonRead && lessonReadAt && (
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>
                        {t('lessonDetail.readAt', {
                          defaultValue: 'Completed at {{date}}',
                          date: new Date(lessonReadAt).toLocaleString(),
                        })}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleMarkLessonRead}
                    disabled={lessonReadStatusLoading || markLessonReadLoading || isLessonRead}
                    style={{
                      background: isLessonRead ? 'rgba(34, 197, 94, 0.12)' : 'var(--accent-primary)',
                      color: isLessonRead ? 'var(--success-primary)' : 'white',
                      border: isLessonRead ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid var(--accent-primary)',
                      padding: '10px 16px',
                      borderRadius: 4,
                      cursor: lessonReadStatusLoading || markLessonReadLoading || isLessonRead ? 'not-allowed' : 'pointer',
                      fontSize: 13,
                      fontWeight: 700,
                      opacity: lessonReadStatusLoading ? 0.7 : 1,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {markLessonReadLoading
                      ? t('lessonDetail.markReadLoading', 'Saving completion...')
                      : lessonReadLabel}
                  </button>
                </div>

                {lessonReadError && (
                  <div style={{
                    marginTop: 12,
                    padding: '10px 12px',
                    background: 'var(--error-surface)',
                    border: '1px solid var(--error-primary)',
                    borderRadius: 4,
                    color: 'var(--error-primary)',
                    fontSize: 13
                  }}>
                    {lessonReadError}
                  </div>
                )}
              </div>
            )}

            {/* Interactive Footer & Actions */}
            <div style={{ marginTop: 64, borderTop: '1px solid var(--border-base)', paddingTop: 32, maxWidth: isFocusMode ? 800 : '100%', marginLeft: 'auto', marginRight: 'auto' }}>
               
               {/* Next / Prev Lessons */}
               <div style={{ display: 'flex', gap: 24, justifyContent: 'space-between' }}>
                  {prevLesson ? (
                    <button
                      onClick={() => navigate(`/lesson/${prevLesson.id}`, { state: { skeleton } })}
                      style={{
                        flex: 1, padding: 24, background: 'var(--bg-surface)', border: '1px solid var(--border-base)',
                        borderRadius: 6, cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 8
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-base)'}
                    >
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{t('lessonDetail.prevLesson')}</span>
                      <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', transition: '0.2s' }}>{prevLesson.title}</span>
                    </button>
                  ) : <div style={{ flex: 1 }} />}

                  {nextLesson ? (
                    <button
                      onClick={() => navigate(`/lesson/${nextLesson.id}`, { state: { skeleton } })}
                      style={{
                        flex: 1, padding: 24, background: 'var(--bg-surface)', border: '1px solid var(--border-base)',
                        borderRadius: 6, cursor: 'pointer', textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 8
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-base)'}
                    >
                      <span style={{ fontSize: 12, color: 'var(--accent-primary)', fontWeight: 600 }}>{t('lessonDetail.nextLesson')}</span>
                      <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', transition: '0.2s' }}>{nextLesson.title}</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleBack}
                      style={{
                        flex: 1, padding: 24, background: 'var(--success-primary)', border: '1px solid var(--success-primary)',
                        borderRadius: 6, cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8,
                        alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                      <span style={{ fontSize: 12, color: 'var(--bg-surface)', fontWeight: 600, textTransform: 'uppercase' }}>{t('lessonDetail.completePlan')}</span>
                      <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--bg-surface)' }}>{t('lessonDetail.returnToPlan')}</span>
                    </button>
                  )}
               </div>
            </div>
          </div>

          {/* Right Sidebar: Table of Contents */}
          {!isFocusMode && (
            <div style={{ position: 'sticky', top: 96, maxHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
               <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ borderBottom: '1px dashed var(--border-base)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
                     <BookOpen className="w-4 h-4 text-[var(--accent-primary)]" />
                     <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: 1, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                       {t('lessonDetail.tableOfContents')}
                     </h3>
                  </div>
                  
                  <div style={{ padding: '16px 20px', overflowY: 'auto', maxHeight: '500px' }} className="term-scroll">
                     {headings.length > 0 ? (
                       <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                         {headings.map((h, i) => (
                           <li key={i} style={{ paddingLeft: h.level === 3 ? 16 : 0 }}>
                             <button
                               onClick={() => scrollToHeading(h.id)}
                               style={{
                                 background: 'none', border: 'none', padding: 0, margin: 0,
                                 textAlign: 'left', cursor: 'pointer', fontSize: 13, lineHeight: 1.4,
                                 color: activeHeadingId === h.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                 fontWeight: activeHeadingId === h.id ? 600 : 400,
                                 textDecoration: 'none',
                                 transition: 'color 0.2s',
                                 display: 'block',
                                 width: '100%'
                               }}
                               onMouseEnter={e => { if (activeHeadingId !== h.id) e.currentTarget.style.color = 'var(--text-primary)' }}
                               onMouseLeave={e => { if (activeHeadingId !== h.id) e.currentTarget.style.color = 'var(--text-secondary)' }}
                             >
                               {h.text}
                             </button>
                           </li>
                         ))}
                       </ul>
                     ) : (
                       <div style={{ fontSize: 13, color: 'var(--text-disabled)', display: 'flex', gap: 8, alignItems: 'center' }}>
                         <AlertCircle className="w-4 h-4" /> <span>{t('lessonDetail.noHeadings')}</span>
                       </div>
                     )}
                     
                     <style>
                       {`
                         .term-scroll::-webkit-scrollbar { width: 4px; }
                         .term-scroll::-webkit-scrollbar-track { background: transparent; }
                         .term-scroll::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 2px; }
                       `}
                     </style>
                  </div>
               </div>
            </div>
          )}
        </div>
      </main>
      
      {/* Scroll Controls */}
      <div style={{
        position: 'fixed',
        right: 24,
        bottom: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 60
      }}>
        <button
          onClick={scrollToTop}
          style={{
            width: 36, height: 36, borderRadius: 4,
            background: 'var(--bg-surface)', border: '1px solid var(--border-base)',
            color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          title="Scroll to top"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
        <button
          onClick={scrollToBottom}
          style={{
            width: 36, height: 36, borderRadius: 4,
            background: 'var(--bg-surface)', border: '1px solid var(--border-base)',
            color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          title="Scroll to bottom"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      </div>
      
      {/* AI Tutor Chatbot - Only show in lesson pages */}
      <TutorChatbot
        conversationId={conversationId}
        learningPathId={skeleton?.pathId || null}
        chapterId={currentChapterId || null}
        lessonId={lessonId || null}
      />
      
      {!isFocusMode && <Footer />}
    </div>
  )
}

export default LessonDetailPage
