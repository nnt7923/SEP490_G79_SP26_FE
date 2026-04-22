import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronRight, BookOpen, CheckCircle2 } from 'lucide-react'
import Layout from '../../../../components/Layout'
import Toast from '../../../../components/Toast'
import { useStudentSidebarConfig } from '../components/StudentSideBar'
import ROUTER from '../../../../router/ROUTER'
import LearningPathService, { type PublishedPathPreviewDto } from '../../../../services/LearningPathService'
import { listSubjects, type Subject } from '../../../../services/SubjectService'
import { useTranslation } from 'react-i18next'
import './explore-paths.css'

type ToastState = { message: string; type: 'success' | 'error' | 'warning' | 'info' }

const COMPLEXITY_LABELS: Record<number, string> = {
  0: 'Beginner',
  1: 'Intermediate',
  2: 'Advanced',
}

const complexityColor: Record<number, string> = {
  0: 'var(--success-primary)',
  1: 'var(--warning-primary)',
  2: 'var(--danger-primary)',
}

const ExplorePathPreviewPage: React.FC = () => {
  const { pathId = '' } = useParams<{ pathId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation('student')
  const navItems = useStudentSidebarConfig()

  const [preview, setPreview] = useState<PublishedPathPreviewDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [enrolling, setEnrolling] = useState(false)
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({})
  const [subjects, setSubjects] = useState<Subject[]>([])

  useEffect(() => {
    listSubjects().then(setSubjects).catch(() => { /* silent */ })
  }, [])

  const sidebarConfig = {
    navItems,
    actions: [],
    brand: {
      name: t('explorePaths.previewTitle', { defaultValue: 'Preview' }),
      subtitle: t('explorePaths.title', { defaultValue: 'Explore Learning Paths' }),
    },
  }

  useEffect(() => {
    if (!pathId) return
    setLoading(true)
    LearningPathService.getPublishedPathPreview(pathId)
      .then((data) => {
        setPreview(data)
        // Expand first chapter by default
        if (data.chapters && data.chapters.length > 0) {
          setExpandedChapters({ [data.chapters[0].chapterId]: true })
        }
      })
      .catch(() => {
        setError(t('explorePaths.previewLoadFailed', { defaultValue: 'Failed to load path preview' }))
      })
      .finally(() => setLoading(false))
  }, [pathId, t])

  const handleEnroll = async () => {
    if (!pathId) return
    setEnrolling(true)
    try {
      await LearningPathService.enrollInPath(pathId)
      setToast({ message: t('explorePaths.enrollSuccess', { defaultValue: 'Enrolled successfully!' }), type: 'success' })
      setTimeout(() => navigate(ROUTER.MY_PLANS), 1500)
    } catch (err: any) {
      const code = err?.response?.data?.errorCode || err?.response?.data?.code
      if (code === 'ALREADY_ENROLLED') {
        setToast({ message: t('explorePaths.alreadyEnrolled', { defaultValue: 'You are already enrolled.' }), type: 'info' })
        if (preview) setPreview({ ...preview, isEnrolled: true })
      } else {
        setToast({ message: t('explorePaths.enrollFailed', { defaultValue: 'Failed to enroll. Please try again.' }), type: 'error' })
      }
    } finally {
      setEnrolling(false)
    }
  }

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters((prev) => ({ ...prev, [chapterId]: !prev[chapterId] }))
  }

  const subject = preview ? subjects.find(s => s.id === preview.subjectId || s.subjectId === preview.subjectId) : null

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="explore-paths-container">
        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}

        {/* Hero Section */}
        {!loading && !error && preview && (
          <div className="ep-detail-hero">
            <div className="ep-hero-content" style={{ flexWrap: 'wrap' }}>
              {/* Back Button */}
              <div style={{ flex: '1 1 100%' }}>
                <button
                  type="button"
                  onClick={() => navigate(ROUTER.EXPLORE_PATHS)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
                    color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 20,
                  }}
                >
                  <ArrowLeft size={15} />
                  {t('explorePaths.previewBack', { defaultValue: 'Back to explore' })}
                </button>
              </div>
              
              <div className="ep-hero-icon">
                 {subject?.icon ? (
                    subject.icon.startsWith('devicon-') ? (
                      <i className={subject.icon}></i>
                    ) : (
                      subject.icon
                    )
                  ) : (
                    <BookOpen size={40} />
                  )}
              </div>
              <div className="ep-hero-info">
                <h1 className="ep-hero-title">{preview.title}</h1>
                <p className="ep-hero-desc">{preview.description}</p>
                <div className="ep-hero-stats">
                  <span className="ep-stat-item">
                    {preview.complexityLevel !== undefined && (
                      <span className="ep-card-badge" style={{ color: complexityColor[preview.complexityLevel] ?? 'var(--text-secondary)', background: 'var(--bg-muted)' }}>
                        {COMPLEXITY_LABELS[preview.complexityLevel] ?? String(preview.complexityLevel)}
                      </span>
                    )}
                  </span>
                  <span className="ep-stat-item">
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {t('explorePaths.mentorLabel', { name: preview.mentorName, defaultValue: `by ${preview.mentorName}` })}
                    </span>
                  </span>
                  <span className="ep-stat-item">
                     {t('explorePaths.chapters', { count: preview.totalChapters, defaultValue: `${preview.totalChapters} chapters` })}
                  </span>
                  <span className="ep-stat-item">
                     {t('explorePaths.lessons', { count: preview.totalLessons, defaultValue: `${preview.totalLessons} lessons` })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div style={{ padding: '40px' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, textAlign: 'center' }}>
              {t('explorePaths.loading', { defaultValue: 'Loading...' })}
            </p>
          </div>
        )}

        {error && !loading && (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ color: 'var(--danger-primary)', fontSize: 14 }}>{error}</p>
          </div>
        )}

        {!loading && !error && preview && (
          <div className="ep-detail-layout">
            <div className="ep-detail-main">
               {/* Goals */}
               {preview.goals && preview.goals.length > 0 && (
                <section style={{ marginBottom: 40 }}>
                  <h2 className="ep-section-title">
                    {t('explorePaths.previewGoals', { defaultValue: 'Learning Goals' })}
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {preview.goals.map((goal) => (
                      <div key={goal.goalId} style={{
                        background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
                        borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 12
                      }}>
                        <CheckCircle2 size={20} color="var(--success-primary)" style={{ flexShrink: 0, marginTop: 2 }} />
                        <div>
                          <span style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 500 }}>{goal.title}</span>
                          {goal.durationInDays > 0 && (
                            <span style={{ fontSize: 13, color: 'var(--text-secondary)', marginLeft: 10 }}>
                              ({goal.durationInDays}d)
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
               )}

               {/* Chapters */}
               <section>
                <h2 className="ep-section-title">
                  {t('explorePaths.previewChapters', { defaultValue: 'Course Content' })}
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {preview.chapters.map((chapter) => {
                    const isExpanded = expandedChapters[chapter.chapterId] ?? false
                    return (
                      <div key={chapter.chapterId} className="ep-chapter-item">
                        <button
                          type="button"
                          className="ep-chapter-header"
                          onClick={() => toggleChapter(chapter.chapterId)}
                        >
                          <span className="ep-chapter-title">{chapter.title}</span>
                          <span className="ep-chapter-meta">
                            {chapter.lessons.length} lessons
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </span>
                        </button>
                        
                        {isExpanded && (
                          <div className="ep-lesson-list">
                            {chapter.lessons.map((lesson) => (
                              <div key={lesson.lessonId} className="ep-lesson-item">
                                <span className="ep-lesson-title">
                                  {lesson.title}
                                </span>
                                <div className="ep-lesson-meta">
                                  {lesson.lessonDay && (
                                    <span>
                                      {t('explorePaths.previewLessonDay', { day: lesson.lessonDay, defaultValue: `Day ${lesson.lessonDay}` })}
                                    </span>
                                  )}
                                  {lesson.quizCount > 0 && (
                                    <span>
                                      {t('explorePaths.previewQuizCount', { count: lesson.quizCount, defaultValue: `${lesson.quizCount} quiz` })}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                            {chapter.lessons.length === 0 && (
                              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '10px 0 0' }}>
                                {t('explorePaths.previewContentHidden', { defaultValue: 'Enroll to view lesson content' })}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
               </section>
            </div>

            <div className="ep-detail-sidebar">
              <div className="ep-sidebar-card">
                 <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px', color: 'var(--text-primary)' }}>
                   {t('explorePaths.enrollInfo', { defaultValue: 'Enrollment' })}
                 </h3>
                 <div style={{ marginBottom: 24 }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                     <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{t('explorePaths.chapters', { count: preview.totalChapters, defaultValue: `${preview.totalChapters} chapters` })}</span>
                     <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>{preview.totalChapters}</span>
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                     <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{t('explorePaths.lessons', { count: preview.totalLessons, defaultValue: `${preview.totalLessons} lessons` })}</span>
                     <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>{preview.totalLessons}</span>
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                     <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{t('explorePaths.version', { version: preview.versionNumber, defaultValue: `Version` })}</span>
                     <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>{preview.versionNumber}</span>
                   </div>
                 </div>

                 {preview.isEnrolled ? (
                    <button
                      type="button"
                      className="ep-enroll-btn ep-enrolled-btn"
                      onClick={() => navigate(ROUTER.MY_PLANS)}
                    >
                      <CheckCircle2 size={18} />
                      {t('explorePaths.previewGoToPath', { defaultValue: 'Go to My Path' })}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="ep-enroll-btn"
                      disabled={enrolling}
                      onClick={handleEnroll}
                    >
                      {enrolling
                        ? t('explorePaths.enrolling', { defaultValue: 'Enrolling...' })
                        : t('explorePaths.previewEnrollCta', { defaultValue: 'Tham gia lộ trình' })}
                    </button>
                  )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default ExplorePathPreviewPage
