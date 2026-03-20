import React, { useEffect, useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Layout from '../../../../components/Layout'
import { useStudentSidebarConfig } from '../components/StudentSideBar'
import LearningPathService, { type SkeletonResponse } from '../../../../services/LearningPathService'
import useAuthStore from '../../../../store/useAuthStore'
import { ArrowLeft, Loader, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import QuizStatusBadge from '../../../../components/Quiz/QuizStatusBadge'
import ChapterTasks from '../../Plans/components/ChapterTasks'
import { motion } from 'framer-motion'
import Tilt from 'react-parallax-tilt'
import { mergeSkeletonWithCachedQuizzes } from '../../../../utils/quizCache'
import type { LearningPathProgressResponse } from '../../../../services/LearningPathService'

const clampPercent = (value: unknown) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return Math.min(100, Math.max(0, numeric))
}

const getProgressStatusStyles = (status?: string) => {
  if (status === 'Completed') {
    return {
      color: 'var(--success-primary)',
      background: 'rgba(34, 197, 94, 0.08)',
      borderColor: 'rgba(34, 197, 94, 0.3)',
    }
  }

  if (status === 'InProgress') {
    return {
      color: 'var(--accent-primary)',
      background: 'rgba(59, 130, 246, 0.08)',
      borderColor: 'rgba(59, 130, 246, 0.3)',
    }
  }

  return {
    color: 'var(--text-secondary)',
    background: 'var(--bg-main)',
    borderColor: 'var(--border-base)',
  }
}

const getProgressStatusLabel = (
  t: any,
  status?: string | null
) => {
  if (!status) return 'N/A'
  return t(`quizStatus.${status}`, status)
}

const MyPlansDetailPage: React.FC = () => {
  const location = useLocation() as any
  const pathId = location.state?.pathId
  const initialSkeleton = location.state?.skeleton
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { t } = useTranslation('student')
  const [plan, setPlan] = useState<SkeletonResponse | null>(() => {
    return initialSkeleton ? mergeSkeletonWithCachedQuizzes(initialSkeleton) : null
  })
  const [progress, setProgress] = useState<LearningPathProgressResponse | null>(null)
  const [loading, setLoading] = useState(!initialSkeleton)
  const [error, setError] = useState<string | null>(null)

  const [activeChapterId, setActiveChapterId] = useState<string | null>(location.state?.activeChapterId || null)
  const detailScrollRef = useRef<HTMLDivElement>(null)
  // Track chapter completion status
  const [chapterCompletionStatus, setChapterCompletionStatus] = useState<Record<string, boolean>>({})

  const sidebarConfig = {
    navItems: useStudentSidebarConfig(),
    actions: [],
    brand: { name: t('dashboard.learningPaths'), subtitle: t('plansResult.brandSubtitle') },
  }

  useEffect(() => {
    fetchPlanDetail()
  }, [pathId, location?.key, user?.id])

  const fetchPlanDetail = async () => {
    if (!user?.id || !pathId) return

    if (!initialSkeleton && !plan) setLoading(true)
    setError(null)
    setProgress(null)
    try {
      const [plansResult, progressResult] = await Promise.allSettled([
        LearningPathService.getUserLearningPaths(user.id, {
          pageNumber: 1,
          pageSize: 100,
        }),
        LearningPathService.getLearningPathProgress(pathId),
      ])

      if (progressResult.status === 'fulfilled') {
        setProgress(progressResult.value)
      }

      if (plansResult.status !== 'fulfilled') {
        throw plansResult.reason
      }

      const foundPlan = plansResult.value.items.find(p => (p.pathId || p.id) === pathId)
      if (foundPlan) {
        const merged = mergeSkeletonWithCachedQuizzes(foundPlan)
        setPlan(merged)
        setActiveChapterId(prev => prev || (foundPlan.chapters && foundPlan.chapters.length > 0 ? foundPlan.chapters[0].id : null))
      } else {
        setError('Learning path not found')
      }
    } catch (err: any) {
      if (!initialSkeleton && !plan) {
        const msg = err?.response?.data?.message || err?.message || 'Failed to load learning path'
        setError(msg)
      }
    } finally {
      if (!initialSkeleton && !plan) setLoading(false)
      // Always turn off loading at the end anyway just to be safe
      setLoading(false)
    }
  }

  // Scroll details pane to top when chapter changes
  useEffect(() => {
    if (detailScrollRef.current) {
      detailScrollRef.current.scrollTop = 0
    }
  }, [activeChapterId])

  const handleChapterTasksCompleted = (chapterId: string, completed: boolean) => {
    setChapterCompletionStatus(prev => ({
      ...prev,
      [chapterId]: completed
    }))
  }

  const hasProgress = progress !== null
  const progressPercent = clampPercent(progress?.progressPercent)
  const progressStatusStyles = getProgressStatusStyles(progress?.status)

  if (loading) {
    return (
      <Layout sidebar={sidebarConfig}>
        <div style={{ padding: 40, background: 'var(--bg-main)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
          <div style={{ textAlign: 'center', color: 'var(--accent-primary)' }}>
            <Loader className="w-8 h-8 animate-spin mx-auto mb-3" />
            <p>{t('goals.loading')}</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (error || !plan) {
    return (
      <Layout sidebar={sidebarConfig}>
        <div style={{ padding: 32, background: 'var(--bg-main)', minHeight: '100vh', fontFamily: 'monospace' }}>
          <button
            onClick={() => navigate(-1)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', marginBottom: 24, fontSize: 14 }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            <ArrowLeft className="w-4 h-4" /> {t('plansResult.back').toUpperCase()}
          </button>

          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--error-primary)', borderRadius: 4, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <AlertCircle className="w-5 h-5" style={{ color: 'var(--error-primary)' }} />
              <div>
                <h3 style={{ margin: '0 0 8px 0', fontWeight: 700, color: 'var(--text-primary)' }}>ERROR</h3>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--error-primary)' }}>{error || 'Learning path not found'}</p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout sidebar={sidebarConfig}>
      <div style={{
        padding: 32,
        background: 'var(--bg-main)',
        minHeight: '100vh',
        fontFamily: 'monospace',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', position: 'relative', zIndex: 1 }}>

          {/* Back Button */}
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate(-1)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', marginBottom: 24, fontSize: 14, fontWeight: 700 }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            whileHover={{ x: -2 }}
          >
            <ArrowLeft className="w-4 h-4" /> {t('plansResult.back').toUpperCase()}
          </motion.button>

          {/* Hero frame */}
          <Tilt tiltMaxAngleX={2} tiltMaxAngleY={2} scale={1.01} transitionSpeed={400}>
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              data-aos="fade-up"
              data-aos-duration="450"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-base)',
                borderRadius: 4,
                padding: 32,
                marginBottom: 32,
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Terminal decorative top bar */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 4,
                background: 'linear-gradient(90deg, var(--accent-primary) 0%, transparent 100%)'
              }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h1 style={{
                    color: 'var(--text-primary)', fontSize: 24, fontWeight: 700, margin: '0 0 16px 0',
                    display: 'flex', alignItems: 'center', gap: 12
                  }}>
                    {plan.title || t('myPlans.untitled')}
                  </h1>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '0 0 24px 0', lineHeight: 1.6 }}>
                    {plan.description || t('myPlans.noDescription')}
                  </p>
                </div>
              </div>

              <div style={{
                display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-primary)',
                fontWeight: 600, flexWrap: 'wrap'
              }}>
                <span style={{
                  background: 'var(--bg-main)', padding: '6px 12px', borderRadius: 2, border: '1px dashed var(--border-base)'
                }}>
                  {t('plansResult.chaptersFormat', { count: plan.chapterCount || plan.chapters?.length || 0 })}
                </span>
                <span style={{
                  background: 'var(--bg-main)', padding: '6px 12px', borderRadius: 2, border: '1px dashed var(--border-base)'
                }}>
                  {t('plansResult.lessonsFormat', { count: plan.lessons?.length || 0 })}
                </span>
                <span style={{
                  background: progressStatusStyles.background,
                  padding: '6px 12px',
                  borderRadius: 2,
                  border: `1px dashed ${progressStatusStyles.borderColor}`,
                  color: progressStatusStyles.color
                }}>
                  {hasProgress ? `${progressPercent.toFixed(2)}%` : '--'} {t('task.progress').toUpperCase()}
                </span>
                {plan.createdAt && (
                  <span style={{
                    background: 'var(--bg-main)', padding: '6px 12px', borderRadius: 2, border: '1px dashed var(--border-base)'
                  }}>
                    {new Date(plan.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              <div style={{ marginTop: 20 }}>
                <div style={{
                  height: 10,
                  background: 'var(--bg-main)',
                  borderRadius: 999,
                  border: '1px solid var(--border-base)',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${progressPercent}%`,
                    background: progress?.status === 'Completed'
                      ? 'var(--success-primary)'
                      : 'var(--accent-primary)',
                    transition: 'width 0.3s ease'
                  }} />
                </div>

                <div style={{
                  marginTop: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                  fontSize: 12,
                  color: 'var(--text-secondary)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span>{t('task.quiz')}: {hasProgress ? `${progress?.completedQuizzes ?? 0}/${progress?.totalQuizzes ?? 0}` : '--/--'}</span>
                    <span>{t('task.taskLabel')}: {hasProgress ? `${progress?.completedTasks ?? 0}/${progress?.totalTasks ?? 0}` : '--/--'}</span>
                  </div>
                  <span style={{ color: progressStatusStyles.color, fontWeight: 700 }}>
                    {getProgressStatusLabel(t, progress?.status)}
                  </span>
                </div>
              </div>
            </motion.section>
          </Tilt>

          {/* Chapters & Lessons Display (Master-Detail Grid) */}
          {plan.chapters && plan.chapters.length > 0 ? (
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.1 }
                }
              }}
              data-aos="fade-up"
              data-aos-duration="450"
              style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 30%) 1fr', gap: 24, marginBottom: 32, alignItems: 'start' }}
            >
              <style>
                {`
                  @keyframes blink { 50% { opacity: 0; } }
                  .chapter-btn { transition: all 0.2s ease; border-left: 2px solid transparent; }
                  .chapter-btn:hover { background: var(--gray-100); }
                  .chapter-btn.active { background: var(--bg-surface); border-left-color: var(--accent-primary); border-top: 1px solid var(--border-base); border-right: 1px solid var(--border-base); border-bottom: 1px solid var(--border-base); }
                  .lesson-link { transition: all 0.2s ease; }
                  .lesson-link:hover { padding-left: 8px; color: var(--accent-primary)!important; text-decoration: underline; }
                  
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
                  {t('plansResult.contentTree')}
                </h2>

                {plan.chapters.map((chapter, chapterIdx) => {
                  const isActive = activeChapterId === chapter.id
                  const isCompleted = chapterCompletionStatus[chapter.id] === true

                  return (
                    <motion.div
                      key={chapter.id || chapterIdx}
                      variants={{
                        hidden: { opacity: 0, x: -16 },
                        visible: { opacity: 1, x: 0 }
                      }}
                      transition={{ duration: 0.35 }}
                    >
                      <button
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
                          background: isCompleted ? 'var(--success-primary)' : 'var(--bg-main)',
                          border: `1px solid ${isCompleted ? 'transparent' : 'var(--border-base)'}`,
                          color: isCompleted ? 'var(--bg-surface)' : 'var(--text-primary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12
                        }}>
                          {isCompleted ? '✓' : (chapterIdx + 1)}
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <h3 style={{ margin: 0, fontSize: 14, fontWeight: isActive ? 700 : 600, color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {chapter.title}
                          </h3>
                        </div>
                      </button>
                    </motion.div>
                  )
                })}
              </div>

              {/* Right Column: Selected Chapter Detail */}
              <motion.div 
                ref={detailScrollRef} 
                className="term-scroll"
                key={activeChapterId}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-base)',
                  borderRadius: 4,
                  height: '600px',
                  display: 'flex',
                  flexDirection: 'column',
                  overflowY: 'auto',
                  overflowX: 'hidden'
                }}
              >
                {(() => {
                  const chapter = plan.chapters?.find(c => c.id === activeChapterId)
                  if (!chapter) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-disabled)' }}>SELECT CHAPTER</div>

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
                            {t('plansResult.lessonsCount', { count: chapter.lessons.length })}
                          </h4>
                          <motion.div 
                            initial="hidden"
                            animate="visible"
                            variants={{
                              hidden: { opacity: 0 },
                              visible: {
                                opacity: 1,
                                transition: { staggerChildren: 0.05 }
                              }
                            }}
                            style={{ display: 'grid', gap: 16 }}
                          >
                            {chapter.lessons.map((lesson, lessonIdx) => (
                              <motion.div 
                                key={lesson.id || lessonIdx} 
                                variants={{
                                  hidden: { opacity: 0, y: 10 },
                                  visible: { opacity: 1, y: 0 }
                                }}
                                transition={{ duration: 0.3 }}
                                style={{ 
                                  display: 'flex', 
                                  alignItems: 'flex-start', 
                                  gap: 16, 
                                  padding: '16px', 
                                  background: 'var(--bg-main)', 
                                  border: '1px solid var(--border-base)', 
                                  borderRadius: 4 
                                }}
                              >
                                <div style={{
                                  width: 24, height: 24, borderRadius: '50%', background: 'var(--text-disabled)', color: 'var(--bg-surface)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0
                                }}>
                                  {lessonIdx + 1}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <motion.button
                                    className="lesson-link"
                                    onClick={() => {
                                      try { sessionStorage.setItem('learningPathSkeleton', JSON.stringify(plan)) } catch { }
                                      navigate(`/lesson/${lesson.id}`, { state: { skeleton: plan } })
                                    }}
                                    whileHover={{ x: 4 }}
                                    style={{
                                      background: 'none', border: 'none', padding: 0, margin: '0 0 8px 0',
                                      fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer',
                                      textDecoration: 'none', textAlign: 'left', display: 'block'
                                    }}
                                  >
                                    {lesson.title}
                                  </motion.button>
                                  
                                  {/* Lesson Day */}
                                  {lesson.lessonDay && (
                                    <div style={{ 
                                      display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
                                      fontSize: 12, color: 'var(--accent-primary)', fontWeight: 600
                                    }}>
                                      <span>📅</span>
                                      <span>{new Date(lesson.lessonDay).toLocaleDateString('vi-VN', { 
                                        weekday: 'short', 
                                        year: 'numeric', 
                                        month: 'short', 
                                        day: 'numeric' 
                                      })}</span>
                                    </div>
                                  )}
                                  
                                  {lesson.description && (
                                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                      {lesson.description}
                                    </p>
                                  )}

                                  {/* Quizzes */}
                                  {lesson.quizzes && lesson.quizzes.length > 0 && (
                                    <div style={{ marginTop: 12, padding: '12px', background: 'var(--bg-surface)', border: '1px dashed var(--border-base)', borderRadius: 2 }}>
                                      <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                                        {t('plansResult.quizzes')}
                                      </span>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                                        {lesson.quizzes.map((quiz, quizIdx) => {
                                          const quizId = quiz?.id ?? quiz?.quizId ?? quiz?.quizzId
                                          return (
                                            <motion.button
                                              key={quizId || quizIdx}
                                              whileHover={{ x: 2 }}
                                              onClick={() => {
                                                if (!quizId) {
                                                  alert('Quiz ID is missing! Cannot navigate to quiz.')
                                                  return
                                                }
                                                navigate(`/quiz/${quizId}`, {
                                                  state: { quizTitle: quiz.title, skeleton: plan }
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
                                            </motion.button>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            ))}
                          </motion.div>
                        </div>
                      )}

                      {/* Chapter Tasks */}
                      <div style={{ marginTop: 'auto' }}>
                        <ChapterTasks
                          chapterId={chapter.id!}
                          onAllTasksCompleted={handleChapterTasksCompleted}
                        />
                      </div>
                    </>
                  )
                })()}
              </motion.div>
            </motion.div>
          ) : (
            <div style={{
              padding: 40, textAlign: 'center', color: 'var(--text-disabled)', fontFamily: 'monospace',
              background: 'var(--bg-surface)', border: '1px dashed var(--border-base)', borderRadius: 2, marginBottom: 32
            }}
            data-aos="fade-up"
            data-aos-duration="450"
            >
              {t('plansResult.noChapters')}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default MyPlansDetailPage
