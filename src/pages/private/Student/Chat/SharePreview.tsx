import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, AlertCircle, Check, Loader, X } from 'lucide-react'
import { motion } from 'framer-motion'
import Tilt from 'react-parallax-tilt'
import Layout from '../../../../components/Layout'
import Toast from '../../../../components/Toast'
import LessonContent from '../../Plans/components/LessonContent'
import { useStudentSidebarConfig } from '../components/StudentSideBar'
import ROUTER from '../../../../router/ROUTER'
import {
  acceptShare,
  getSharePreview,
  rejectShare,
} from '../../../../services/LearningPathShareService'
import { clearUserLearningPathsCache } from '../../../../services/LearningPathService'
import useChatStore from '../../../../store/useChatStore'
import useAuthStore from '../../../../store/useAuthStore'
import { useTranslation } from 'react-i18next'
import { getGoalTitle } from '../../../../utils/goalTranslation'
import type {
  LearningPathSharePreviewDto,
  ShareStatus,
} from '../../../../types/chat'

type ToastState = { message: string; type: 'success' | 'error' | 'warning' | 'info' }
type PreviewLocationState = { from?: 'chat' | 'invites'; conversationId?: string }

const formatDateTime = (value?: string | null) => value ? new Date(value).toLocaleString() : '-'
const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString() : '-'

const SharePreviewPage: React.FC = () => {
  const { shareId = '' } = useParams()
  const location = useLocation() as { state?: PreviewLocationState }
  const navigate = useNavigate()
  const { t } = useTranslation('student')
  const { user } = useAuthStore()
  const { patchShareMessage, removePendingShare, upsertReceivedShare } = useChatStore()
  const [preview, setPreview] = useState<LearningPathSharePreviewDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [actionLoading, setActionLoading] = useState<ShareStatus | null>(null)
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null)
  const detailScrollRef = useRef<HTMLDivElement>(null)

  const sidebarConfig = {
    navItems: useStudentSidebarConfig(),
    actions: [],
    brand: { name: t('chat.previewTitle', { defaultValue: 'Share Preview' }), subtitle: t('chat.title') },
  }

  const chapters = useMemo(() => preview?.learningPath?.chapterDtos ?? [], [preview?.learningPath?.chapterDtos])
  const activeChapter = useMemo(
    () => chapters.find((chapter) => chapter.chapterId === activeChapterId) ?? chapters[0] ?? null,
    [activeChapterId, chapters]
  )
  const isSupersededShare =
    preview?.status === 'Rejected' &&
    String(preview?.invalidatedReason || '').trim().toUpperCase() === 'SUPERSEDED_BY_NEW_VERSION'

  const syncShareState = (source: LearningPathSharePreviewDto, nextStatus: ShareStatus, respondedAt?: string | null) => {
    const normalizedRespondedAt = respondedAt ?? source.respondedAt ?? null

    patchShareMessage(source.shareId, {
      shareStatus: nextStatus,
      respondedAt: normalizedRespondedAt,
      learningPathTitle: source.learningPath?.title ?? null,
      learningPathDescription: source.learningPath?.description ?? null,
      pathId: source.learningPath?.pathId ?? null,
      mentorName: source.mentorName,
      studentName: source.studentName,
    })

    upsertReceivedShare({
      shareId: source.shareId,
      pathId: source.learningPath?.pathId ?? '',
      learningPathTitle: source.learningPath?.title ?? t('myPlans.untitled'),
      learningPathDescription: source.learningPath?.description ?? null,
      mentorId: source.mentorId,
      mentorName: source.mentorName,
      status: nextStatus,
      sentAt: source.sentAt,
      respondedAt: normalizedRespondedAt,
    })

    if (nextStatus !== 'Pending') removePendingShare(source.shareId)
  }

  const fetchPreview = async () => {
    if (!shareId) {
      setError(t('chat.previewInvalid', { defaultValue: 'Invalid learning path share.' }))
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const response = await getSharePreview(shareId)
      setPreview(response)
      setActiveChapterId(response.learningPath?.chapterDtos?.[0]?.chapterId ?? null)
      if (response.status !== 'Pending') {
        syncShareState(response, response.status, response.respondedAt)
      } else {
        syncShareState(response, 'Pending', null)
      }
    } catch (err: any) {
      const status = err?.response?.status
      const code = err?.response?.data?.errorCode || err?.response?.data?.code
      if (status === 403 || code === 'ACCESS_DENIED') {
        setError(t('chat.previewAccessDenied', { defaultValue: 'You do not have access to this share preview.' }))
      } else if (status === 404 || code === 'SHARE_NOT_FOUND' || code === 'LEARNING_PATH_NOT_FOUND') {
        setError(t('chat.previewNotFound', { defaultValue: 'Learning path share preview not found.' }))
      } else {
        setError(err?.response?.data?.message || err?.message || t('chat.previewLoadError', { defaultValue: 'Failed to load share preview.' }))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPreview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareId])

  useEffect(() => {
    if (detailScrollRef.current) detailScrollRef.current.scrollTop = 0
  }, [activeChapterId])

  const handleBack = () => {
    if (location.state?.from) {
      navigate(ROUTER.CHAT, {
        state: {
          activeTab: location.state.from === 'invites' ? 'invites' : 'conversations',
          conversationId: location.state.conversationId,
        },
      })
      return
    }
    navigate(-1)
  }

  const handleDecision = async (decision: 'accept' | 'reject') => {
    if (!preview || preview.status !== 'Pending') return
    const nextStatus: ShareStatus = decision === 'accept' ? 'Accepted' : 'Rejected'
    const respondedAt = new Date().toISOString()
    setActionLoading(nextStatus)
    try {
      if (decision === 'accept') {
        await acceptShare(preview.shareId)
        clearUserLearningPathsCache(user?.id)
      } else {
        await rejectShare(preview.shareId)
      }
      setPreview((prev) => prev ? { ...prev, status: nextStatus, respondedAt } : prev)
      syncShareState(preview, nextStatus, respondedAt)
      navigate(ROUTER.CHAT, {
        state: {
          activeTab: location.state?.from === 'invites' ? 'invites' : 'conversations',
          conversationId: location.state?.conversationId,
          toast: {
            message: decision === 'accept'
              ? t('chat.inviteAccepted', { defaultValue: 'Accepted' })
              : t('chat.inviteRejected', { defaultValue: 'Rejected' }),
            type: 'success',
          } satisfies ToastState,
        },
      })
    } catch (err: any) {
      setToast({
        message: err?.response?.data?.message || err?.message || t('chat.inviteError', { defaultValue: 'Unable to update share status.' }),
        type: 'error',
      })
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <Layout sidebar={sidebarConfig}>
        <div style={{ padding: 40, background: 'var(--bg-main)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
          <div style={{ textAlign: 'center', color: 'var(--accent-primary)' }}>
            <Loader className="w-8 h-8 animate-spin mx-auto mb-3" />
            <p>{t('chat.previewLoading', { defaultValue: 'Loading share preview...' })}</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (error || !preview) {
    return (
      <Layout sidebar={sidebarConfig}>
        <div style={{ padding: 32, background: 'var(--bg-main)', minHeight: '100vh', fontFamily: 'monospace' }}>
          <button
            onClick={handleBack}
            style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', marginBottom: 24, fontSize: 14 }}
          >
            <ArrowLeft className="w-4 h-4" /> {t('plansResult.back').toUpperCase()}
          </button>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--error-primary)', borderRadius: 4, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <AlertCircle className="w-5 h-5" style={{ color: 'var(--error-primary)' }} />
              <div>
                <h3 style={{ margin: '0 0 8px 0', fontWeight: 700, color: 'var(--text-primary)' }}>ERROR</h3>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--error-primary)' }}>{error}</p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout sidebar={sidebarConfig}>
      <div style={{ padding: 32, background: 'var(--bg-main)', minHeight: '100vh', fontFamily: 'monospace' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={handleBack}
            style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', marginBottom: 24, fontSize: 14, fontWeight: 700 }}
          >
            <ArrowLeft className="w-4 h-4" /> {t('plansResult.back').toUpperCase()}
          </motion.button>

          <Tilt tiltMaxAngleX={2} tiltMaxAngleY={2} scale={1.01} transitionSpeed={400}>
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-base)',
                borderRadius: 4,
                padding: 32,
                marginBottom: 28,
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, var(--accent-primary) 0%, transparent 100%)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h1 style={{ color: 'var(--text-primary)', fontSize: 24, fontWeight: 700, margin: '0 0 12px 0' }}>
                    {preview.learningPath?.title || t('myPlans.untitled')}
                  </h1>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '0 0 20px 0', lineHeight: 1.6 }}>
                    {preview.learningPath?.description || t('myPlans.noDescription')}
                  </p>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-primary)' }}>
                    <span style={{ background: 'var(--bg-main)', padding: '6px 12px', borderRadius: 2, border: '1px dashed var(--border-base)' }}>
                      {preview.learningPath?.subjectName || '-'}
                    </span>
                    <span style={{ background: 'var(--bg-main)', padding: '6px 12px', borderRadius: 2, border: '1px dashed var(--border-base)' }}>
                      {t('plansResult.chaptersFormat', { count: preview.learningPath?.chapterCount || chapters.length || 0 })}
                    </span>
                    <span style={{ background: 'var(--bg-main)', padding: '6px 12px', borderRadius: 2, border: '1px dashed var(--border-base)' }}>
                      {formatDate(preview.learningPath?.startDate)} - {formatDate(preview.learningPath?.endDate)}
                    </span>
                  </div>
                </div>

                <div style={{ minWidth: 280, display: 'grid', gap: 10 }}>
                  <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-base)', borderRadius: 4, padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>{t('chat.previewShareStatus', { defaultValue: 'Share status' })}</strong>
                      <span className={`chat-kit-share-status chat-kit-share-status--${preview.status.toLowerCase()}`}>{preview.status}</span>
                    </div>
                    <div style={{ display: 'grid', gap: 6, marginTop: 10, fontSize: 12, color: 'var(--text-secondary)' }}>
                      <span>{t('chat.inviteFrom', { mentorName: preview.mentorName })}</span>
                      <span>{t('chat.previewSentAt', { defaultValue: 'Sent at' })}: {formatDateTime(preview.sentAt)}</span>
                      <span>{t('chat.previewRespondedAt', { defaultValue: 'Responded at' })}: {preview.respondedAt ? formatDateTime(preview.respondedAt) : t('chat.previewWaitingResponse', { defaultValue: 'Waiting for response' })}</span>
                    </div>
                  </div>

                  {isSupersededShare && (
                    <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.35)', borderRadius: 4, padding: 12, fontSize: 12, color: '#92400e', lineHeight: 1.5 }}>
                      {t('chat.previewSupersededByNewVersion', {
                        defaultValue: 'This share was replaced by a newer version from your mentor. Please review the latest version update notification.',
                      })}
                    </div>
                  )}

                  {preview.status === 'Pending' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <button
                        type="button"
                        onClick={() => handleDecision('accept')}
                        disabled={!!actionLoading}
                        style={{ padding: '10px 12px', borderRadius: 4, border: 'none', background: 'var(--success-primary)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <Check size={14} />
                          {actionLoading === 'Accepted' ? t('chat.accepting') : t('chat.accept')}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDecision('reject')}
                        disabled={!!actionLoading}
                        style={{ padding: '10px 12px', borderRadius: 4, border: '1px solid var(--danger-primary)', background: 'transparent', color: 'var(--danger-primary)', fontWeight: 700, cursor: 'pointer' }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <X size={14} />
                          {actionLoading === 'Rejected' ? t('chat.rejecting') : t('chat.reject')}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.section>
          </Tilt>

          {!!preview.learningPath?.goals?.length && (
            <section style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4, padding: 20, marginBottom: 24 }}>
              <h2 style={{ margin: '0 0 12px', fontSize: 16, color: 'var(--text-primary)' }}>{t('chat.previewGoals', { defaultValue: 'Goals' })}</h2>
              <div style={{ display: 'grid', gap: 10 }}>
                {preview.learningPath.goals.map((goal) => (
                  <div key={goal.goalId} style={{ padding: 12, border: '1px solid var(--border-base)', borderRadius: 4, background: 'var(--bg-main)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>{getGoalTitle(t, goal.goalId, goal.title)}</strong>
                      <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{goal.weight}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {chapters.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr)', gap: 20 }}>
              <aside style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4, padding: 18, height: 'fit-content', position: 'sticky', top: 24 }}>
                <h2 style={{ margin: '0 0 14px', fontSize: 16, color: 'var(--text-primary)' }}>{t('plansResult.contentTree')}</h2>
                <div style={{ display: 'grid', gap: 10 }}>
                  {chapters.map((chapter, chapterIndex) => (
                    <button
                      key={chapter.chapterId}
                      type="button"
                      onClick={() => setActiveChapterId(chapter.chapterId)}
                      style={{
                        textAlign: 'left',
                        padding: 12,
                        borderRadius: 4,
                        border: `1px solid ${chapter.chapterId === activeChapter?.chapterId ? 'var(--accent-primary)' : 'var(--border-base)'}`,
                        background: chapter.chapterId === activeChapter?.chapterId ? 'var(--bg-blue-hover)' : 'var(--bg-main)',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>Chapter {chapterIndex + 1}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{chapter.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>
                        {(chapter.lessons?.length || 0)} {t('myPlans.lessons', { count: chapter.lessons?.length || 0 })}
                      </div>
                    </button>
                  ))}
                </div>
              </aside>

              <main ref={detailScrollRef} style={{ display: 'grid', gap: 18 }}>
                {activeChapter && (
                  <section style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4, padding: 22 }}>
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>{t('chat.previewChapter', { defaultValue: 'Chapter' })}</div>
                      <h2 style={{ margin: 0, fontSize: 22, color: 'var(--text-primary)' }}>{activeChapter.title}</h2>
                      {activeChapter.content && (
                        <p style={{ margin: '12px 0 0', fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)' }}>{activeChapter.content}</p>
                      )}
                    </div>

                    {!!activeChapter.tasks?.length && (
                      <div style={{ marginBottom: 18 }}>
                        <h3 style={{ margin: '0 0 10px', fontSize: 15, color: 'var(--text-primary)' }}>{t('chat.previewTasks', { defaultValue: 'Tasks' })}</h3>
                        <div style={{ display: 'grid', gap: 10 }}>
                          {activeChapter.tasks.map((task) => (
                            <div key={task.taskId || task.id || task.title} style={{ padding: 12, borderRadius: 4, border: '1px solid var(--border-base)', background: 'var(--bg-main)' }}>
                              <strong style={{ display: 'block', color: 'var(--text-primary)', marginBottom: 6 }}>{task.title}</strong>
                              {task.description && <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{task.description}</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'grid', gap: 16 }}>
                      {(activeChapter.lessons || []).map((lesson, lessonIndex) => (
                        <article key={lesson.lessonId} style={{ border: '1px solid var(--border-base)', borderRadius: 4, background: 'var(--bg-main)', padding: 16 }}>
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>Lesson {lessonIndex + 1}</div>
                            <h3 style={{ margin: 0, fontSize: 17, color: 'var(--text-primary)' }}>{lesson.title}</h3>
                            {lesson.lessonDay && <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-secondary)' }}>{formatDate(lesson.lessonDay)}</div>}
                          </div>
                          {lesson.content ? (
                            <LessonContent content={lesson.content} />
                          ) : (
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t('plansResult.noDescription')}</div>
                          )}
                        </article>
                      ))}
                    </div>
                  </section>
                )}
              </main>
            </div>
          ) : (
            <section style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4, padding: 22, color: 'var(--text-secondary)' }}>
              {t('plansResult.noChapters')}
            </section>
          )}
        </div>

        {toast && <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 120 }}><Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} /></div>}
      </div>
    </Layout>
  )
}

export default SharePreviewPage
