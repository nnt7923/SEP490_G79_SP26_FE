import React, { useEffect, useState, useCallback } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../../../../components/Layout'
import { useStudentSidebarConfig } from '../components/StudentSideBar'
import LearningPathService, { type MentorReviewDto, resolveMentorReviewError } from '../../../../services/LearningPathService'
import { ArrowLeft, Loader, Clock, CheckCircle, XCircle, Eye, X, Maximize2 } from 'lucide-react'
import { motion } from 'framer-motion'
import LessonContent from '../../Plans/components/LessonContent'
import { requestQuizQuestions } from '../../../../services/SignalR'

function StatusBadge({ status, t }: { status: string; t: (k: string) => string }) {
  const map: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    Pending: { label: t('mentorReview.statusPending'), color: 'var(--warning-primary)', bg: 'rgba(245,158,11,0.1)', icon: <Clock size={12} /> },
    Accepted: { label: t('mentorReview.statusAccepted'), color: 'var(--success-primary)', bg: 'rgba(34,197,94,0.1)', icon: <CheckCircle size={12} /> },
    Rejected: { label: t('mentorReview.statusRejected'), color: 'var(--danger-primary)', bg: 'rgba(220,38,38,0.1)', icon: <XCircle size={12} /> },
    WaitingStudentResponse: { label: t('mentorReview.statusWaitingStudentResponse'), color: '#7c3aed', bg: 'rgba(124,58,237,0.1)', icon: <Clock size={12} /> },
  }
  const s = map[status] || map.Pending
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, color: s.color, background: s.bg }}>
      {s.icon}{s.label}
    </span>
  )
}

// ── Lesson content modal ──────────────────────────────────────────────────────
function LessonFullModal({ lesson, onClose }: { lesson: any; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10100, padding: 24 }}
      onClick={onClose}>
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 8, maxWidth: 960, width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 48px rgba(0,0,0,0.25)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-base)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>Nội dung bài học</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{lesson.title}</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, display: 'flex', borderRadius: 4 }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
            <X size={16} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <LessonContent content={lesson.content ?? ''} />
        </div>
      </div>
    </div>
  )
}

// ── Quiz questions modal ──────────────────────────────────────────────────────
function QuizQuestionsModal({ quiz, onClose }: { quiz: any; onClose: () => void }) {
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const quizId = quiz?.quizzId || quiz?.quizId || quiz?.id

  useEffect(() => {
    if (!quizId) { setLoading(false); return }
    const existing = quiz?.questions || quiz?.Questions || []
    if (existing.length > 0) { setQuestions(existing); setLoading(false); return }
    requestQuizQuestions(quizId)
      .then((data: any) => setQuestions(data?.questions || data?.Questions || (Array.isArray(data) ? data : [])))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [quizId])

  const TYPE_LABELS: Record<number, string> = { 0: 'True/False', 1: 'Multiple Choice', 2: 'Single Choice', 3: 'Matching', 4: 'Fill in Blank', 5: 'Ordering' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10100, padding: 24 }}
      onClick={onClose}>
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 8, maxWidth: 680, width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 48px rgba(0,0,0,0.25)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-base)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>Câu hỏi quiz</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{quiz?.title}</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, display: 'flex', borderRadius: 4 }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
            <X size={16} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {loading && <div style={{ textAlign: 'center', padding: 32 }}><Loader className="w-6 h-6 animate-spin" style={{ color: 'var(--accent-primary)', margin: '0 auto' }} /></div>}
          {!loading && questions.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13, padding: 32 }}>Chưa có câu hỏi.</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {questions.map((q: any, qi: number) => {
              const options: string[] = q.options || q.Options || []
              const correct = q.correctAnswer || q.CorrectAnswer || ''
              const qType = q.type ?? q.Type ?? q.questionType ?? q.QuestionType
              return (
                <div key={q.id || q.questionId || qi} style={{ padding: '14px 16px', background: 'var(--bg-main)', border: '1px solid var(--border-base)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>
                      <span style={{ color: 'var(--accent-primary)', marginRight: 6 }}>Q{qi + 1}.</span>
                      {q.questionText || q.QuestionText}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {qType != null && <span style={{ fontSize: 10, padding: '2px 8px', background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 999, color: 'var(--text-secondary)' }}>{typeof qType === 'number' ? TYPE_LABELS[qType] : qType}</span>}
                      <span style={{ fontSize: 10, padding: '2px 8px', background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 999, color: 'var(--text-secondary)' }}>{q.points ?? q.Points ?? 0} pts</span>
                    </div>
                  </div>
                  {options.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {options.map((opt: string, oi: number) => {
                        const isCorrect = correct === opt || correct === String(oi) || correct === String.fromCharCode(65 + oi)
                        return (
                          <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 6, background: isCorrect ? 'rgba(34,197,94,0.08)' : 'var(--bg-surface)', border: `1px solid ${isCorrect ? 'rgba(34,197,94,0.35)' : 'var(--border-base)'}` }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: isCorrect ? 'var(--success-primary)' : 'var(--text-secondary)', minWidth: 20 }}>{String.fromCharCode(65 + oi)}.</span>
                            <span style={{ fontSize: 13, color: isCorrect ? 'var(--success-primary)' : 'var(--text-primary)', flex: 1 }}>{opt}</span>
                            {isCorrect && <span style={{ fontSize: 10, color: 'var(--success-primary)', fontWeight: 700 }}>✓</span>}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {options.length === 0 && correct && (
                    <div style={{ fontSize: 12, color: 'var(--success-primary)', fontWeight: 600, padding: '6px 10px', background: 'rgba(34,197,94,0.08)', borderRadius: 6 }}>Đáp án: {correct}</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Lesson card with view content + quiz ──────────────────────────────────────
function PreviewLessonCard({ lesson, index }: { lesson: any; index: number }) {
  const [lessonOpen, setLessonOpen] = useState(false)
  const [quizOpen, setQuizOpen] = useState<any>(null)
  const hasContent = !!(lesson.content || lesson.Content)

  return (
    <>
      <article style={{ border: '1px solid var(--border-base)', borderRadius: 6, background: 'var(--bg-surface)', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 3 }}>Bài học {index + 1}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>{lesson.title}</div>
            {lesson.description && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3, lineHeight: 1.5 }}>{lesson.description}</div>}
          </div>
          {hasContent && (
            <button type="button" onClick={() => setLessonOpen(true)}
              style={{ background: 'transparent', border: '1px solid var(--border-base)', borderRadius: 4, cursor: 'pointer', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0 }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.color = 'var(--accent-primary)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-base)'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
              <Maximize2 size={11} /> Xem nội dung
            </button>
          )}
        </div>
        {(lesson.quizzes || []).length > 0 && (
          <div style={{ borderTop: '1px solid var(--border-base)', padding: '10px 16px', background: 'var(--bg-main)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Quiz ({lesson.quizzes.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {lesson.quizzes.map((q: any, qi: number) => (
                <div key={q.quizzId || q.quizId || qi} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-primary)', padding: '6px 10px', background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4 }}>
                  <span>{q.title}</span>
                  <button type="button" onClick={() => setQuizOpen(q)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent-primary)', padding: '2px 6px', display: 'flex', alignItems: 'center', gap: 3, fontSize: 11 }}>
                    <Eye size={11} /> Xem câu hỏi
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </article>
      {lessonOpen && <LessonFullModal lesson={lesson} onClose={() => setLessonOpen(false)} />}
      {quizOpen && <QuizQuestionsModal quiz={quizOpen} onClose={() => setQuizOpen(null)} />}
    </>
  )
}

// ── Preview modal ─────────────────────────────────────────────────────────────
function PathPreviewModal({ revisedPathId, onClose }: { revisedPathId: string; onClose: () => void }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeChIdx, setActiveChIdx] = useState(0)

  useEffect(() => {
    if (!revisedPathId) { setLoading(false); return }
    import('../../../../services/Axios').then(m => m.default.get(`/learningpaths/${revisedPathId}/preview`))
      .then((res: any) => { const d = res?.data ?? res; setData(d?.value ?? d) })
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [revisedPathId])

  const chapters: any[] = data?.chapterDtos || data?.chapters || []
  const activeCh = chapters[activeChIdx] ?? null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}
      onClick={onClose}>
      <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-base)', borderRadius: 8, maxWidth: 1060, width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 48px rgba(0,0,0,0.18)' }}
        onClick={e => e.stopPropagation()}>
        {/* Top accent */}
        <div style={{ height: 3, background: 'linear-gradient(90deg, var(--accent-primary) 0%, transparent 100%)', flexShrink: 0 }} />
        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-base)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent-primary)' }}>
            Preview bản mentor sửa
            {data?.title && <span style={{ color: 'var(--text-secondary)', fontWeight: 400, marginLeft: 8, textTransform: 'none', letterSpacing: 0 }}>/ {data.title}</span>}
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, display: 'flex', borderRadius: 4 }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
            <X size={16} />
          </button>
        </div>
        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 14 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid var(--accent-primary)', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Đang tải xem trước...</span>
            </div>
          )}
          {!loading && !data && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)', fontSize: 13 }}>
              Không thể tải bản sửa.
            </div>
          )}
          {!loading && data && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Title card */}
              <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 8, padding: 24, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, var(--accent-primary) 0%, transparent 100%)' }} />
                <h2 style={{ margin: '0 0 8px 0', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>{data.title}</h2>
                {data.description && <p style={{ margin: '0 0 14px 0', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{data.description}</p>}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 12 }}>
                  {chapters.length > 0 && <span style={{ padding: '4px 10px', background: 'var(--bg-main)', border: '1px dashed var(--border-base)', borderRadius: 4 }}>{chapters.length} chương</span>}
                  {(() => { const t = chapters.reduce((s: number, ch: any) => s + (ch.lessons?.length || 0), 0); return t > 0 ? <span style={{ padding: '4px 10px', background: 'var(--bg-main)', border: '1px dashed var(--border-base)', borderRadius: 4 }}>{t} bài học</span> : null })()}
                </div>
              </div>
              {/* Chapters 2-col */}
              {chapters.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '220px minmax(0,1fr)', gap: 14, height: 480 }}>
                  {/* Sidebar */}
                  <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 8, padding: 12, overflowY: 'auto' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 10, padding: '0 4px' }}>
                      Nội dung ({chapters.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {chapters.map((ch: any, i: number) => (
                        <button key={ch.chapterId || ch.id || i} type="button" onClick={() => setActiveChIdx(i)}
                          style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 6, cursor: 'pointer', width: '100%', border: `1px solid ${i === activeChIdx ? 'var(--accent-primary)' : 'transparent'}`, background: i === activeChIdx ? 'rgba(59,130,246,0.08)' : 'transparent', transition: 'all 0.15s' }}
                          onMouseEnter={e => { if (i !== activeChIdx) e.currentTarget.style.background = 'var(--bg-main)' }}
                          onMouseLeave={e => { if (i !== activeChIdx) e.currentTarget.style.background = 'transparent' }}>
                          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 2 }}>Chương {i + 1}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>{ch.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                            {ch.lessons?.length || 0} bài · {ch.tasks?.length || 0} task
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Chapter detail */}
                  {activeCh && (
                    <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 8, padding: 18, flexShrink: 0 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Chương {activeChIdx + 1}</div>
                        <h3 style={{ margin: '0 0 6px 0', fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>{activeCh.title}</h3>
                        {activeCh.content && <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{activeCh.content}</p>}
                      </div>
                      {(activeCh.lessons || []).length > 0 && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8 }}>
                            Bài học ({activeCh.lessons.length})
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {activeCh.lessons.map((ls: any, li: number) => (
                              <PreviewLessonCard key={ls.lessonId || ls.id || li} lesson={ls} index={li} />
                            ))}
                          </div>
                        </div>
                      )}
                      {(activeCh.tasks || []).length > 0 && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8 }}>
                            Tasks ({activeCh.tasks.length})
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {activeCh.tasks.map((task: any, ti: number) => (
                              <div key={task.taskId || task.id || ti} style={{ padding: '10px 14px', border: '1px solid var(--border-base)', borderRadius: 6, background: 'var(--bg-surface)' }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: task.description ? 4 : 0 }}>
                                  {task.title}
                                  {task.taskType && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-secondary)', fontWeight: 400 }}>· {task.taskType}</span>}
                                </div>
                                {task.description && <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{task.description}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Decision buttons ──────────────────────────────────────────────────────────
function DecisionButtons({ pathId, review, t, onDecided }: {
  pathId: string; review: MentorReviewDto
  t: (k: string, opts?: any) => string
  onDecided: (r: MentorReviewDto) => void
}) {
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const decide = async (status: 'Accepted' | 'Rejected') => {
    setSubmitting(true); setError(null)
    try {
      const result = await LearningPathService.decideMentorReview(pathId, review.reviewId, {
        decisionStatus: status, studentDecisionNote: note.trim() || null,
      })
      onDecided(result)
    } catch (e: any) {
      setError(resolveMentorReviewError(e))
    } finally { setSubmitting(false) }
  }

  const rejectionsLeft = (review.maxRejections ?? 3) - (review.rejectionCount ?? 0)
  const canReject = review.canRequestRevision !== false

  return (
    <div style={{ padding: 20, background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{t('mentorReview.decisionTitle')}</div>
      {review.maxRejections != null && (
        <div style={{ fontSize: 12, color: rejectionsLeft <= 1 ? 'var(--danger-primary)' : 'var(--text-secondary)', marginBottom: 12 }}>
          {t('mentorReview.rejectionsLeft', { left: rejectionsLeft, max: review.maxRejections })}
        </div>
      )}
      <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
        placeholder={t('mentorReview.noteHint')}
        style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-main)', border: '1px solid var(--border-base)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, resize: 'none', outline: 'none', marginBottom: 12, boxSizing: 'border-box', lineHeight: 1.5 }}
        onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
        onBlur={e => e.currentTarget.style.borderColor = 'var(--border-base)'} />
      {error && <div style={{ fontSize: 12, color: 'var(--danger-primary)', marginBottom: 12, padding: '8px 12px', background: 'rgba(220,38,38,0.06)', borderRadius: 6 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => decide('Accepted')} disabled={submitting}
          style={{ flex: 1, padding: '11px 16px', background: 'var(--success-primary)', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: submitting ? 0.7 : 1 }}>
          <CheckCircle size={15} /> {t('mentorReview.acceptBtn')}
        </button>
        <button onClick={() => decide('Rejected')} disabled={submitting || !canReject}
          title={!canReject ? t('mentorReview.rejectDisabled') : undefined}
          style={{ flex: 1, padding: '11px 16px', background: 'transparent', color: canReject ? 'var(--danger-primary)' : 'var(--text-disabled)', border: `1px solid ${canReject ? 'var(--danger-primary)' : 'var(--border-base)'}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: (submitting || !canReject) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <XCircle size={15} /> {t('mentorReview.rejectBtn')}
        </button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
const MentorReviewStatusPage: React.FC = () => {
  const { pathId } = useParams<{ pathId: string }>()
  const location = useLocation() as any
  const navigate = useNavigate()
  const navItems = useStudentSidebarConfig()
  const { t } = useTranslation('student')

  const [review, setReview] = useState<MentorReviewDto | null>(location.state?.review ?? null)
  const [loading, setLoading] = useState(!review)
  const [error, setError] = useState<string | null>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)

  const sidebarConfig = { navItems, actions: [], brand: { name: 'Mentor Review', subtitle: 'CodeNexus' } }

  const loadReview = useCallback(async () => {
    if (!pathId) return
    setLoading(true)
    try {
      const reviews = await LearningPathService.getMentorReviews(pathId)
      const sorted = [...reviews].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      setReview(sorted[0] ?? null)
    } catch (e: any) {
      setError(resolveMentorReviewError(e))
    } finally { setLoading(false) }
  }, [pathId])

  useEffect(() => { if (!review) loadReview() }, [review, loadReview])

  const hasContent = !!(review?.changeSummary || review?.changeReason || review?.feedback)

  if (loading) return (
    <Layout sidebar={sidebarConfig}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-main)' }}>
        <Loader className="w-8 h-8 animate-spin" style={{ color: 'var(--accent-primary)' }} />
      </div>
    </Layout>
  )

  return (
    <Layout sidebar={sidebarConfig}>
      <div style={{ padding: 32, background: 'var(--bg-main)', minHeight: '100vh' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <motion.button initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate('/my-plans/detail', { state: { pathId } })}
            style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', marginBottom: 24, fontSize: 13, fontWeight: 600 }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            whileHover={{ x: -2 }}>
            <ArrowLeft size={15} /> {t('mentorReview.backToPath')}
          </motion.button>

          {error && <div style={{ padding: '12px 16px', background: 'rgba(220,38,38,0.06)', border: '1px solid var(--danger-primary)', borderRadius: 8, color: 'var(--danger-primary)', fontSize: 13, marginBottom: 20 }}>{error}</div>}

          {!review ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)', border: '1px dashed var(--border-base)', borderRadius: 8 }}>{t('mentorReview.noReview')}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Status + info card */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 12, padding: 24, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, var(--accent-primary) 0%, transparent 100%)' }} />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <StatusBadge status={review.decisionStatus} t={t} />
                  {review.createdAt && (
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {new Date(new Date(review.createdAt).getTime() + 7 * 3600000).toLocaleString('vi-VN')}
                    </span>
                  )}
                </div>

                {/* Mentor info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '10px 14px', background: 'var(--bg-main)', borderRadius: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--accent-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
                    {(review.mentorName || 'M').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{review.mentorName || 'Mentor'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Mentor</div>
                  </div>
                </div>

                {/* studentRequestNote */}
                {review.studentRequestNote && (
                  <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--bg-main)', borderRadius: 8, borderLeft: '3px solid var(--accent-primary)' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('mentorReview.yourNote')}</div>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6 }}>{review.studentRequestNote}</p>
                  </div>
                )}

                {/* changeSummary + changeReason */}
                {(review.changeSummary || review.changeReason) && (
                  <div style={{ display: 'grid', gridTemplateColumns: review.changeSummary && review.changeReason ? '1fr 1fr' : '1fr', gap: 12, marginBottom: 16 }}>
                    {review.changeSummary && (
                      <div style={{ padding: '10px 14px', background: 'var(--bg-main)', borderRadius: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('mentorReview.changeSummary')}</div>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6 }}>{review.changeSummary}</p>
                      </div>
                    )}
                    {review.changeReason && (
                      <div style={{ padding: '10px 14px', background: 'var(--bg-main)', borderRadius: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('mentorReview.changeReason')}</div>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6 }}>{review.changeReason}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Preview button - only active when WaitingStudentResponse */}
                {review.revisedPathId && (
                  <button
                    onClick={() => review.decisionStatus === 'WaitingStudentResponse' && setShowPreviewModal(true)}
                    disabled={review.decisionStatus !== 'WaitingStudentResponse'}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
                      background: review.decisionStatus === 'WaitingStudentResponse' ? 'var(--accent-primary)' : 'var(--bg-main)',
                      color: review.decisionStatus === 'WaitingStudentResponse' ? 'white' : 'var(--text-secondary)',
                      border: review.decisionStatus === 'WaitingStudentResponse' ? 'none' : '1px dashed var(--border-base)',
                      borderRadius: 8, fontSize: 13, fontWeight: 600,
                      cursor: review.decisionStatus === 'WaitingStudentResponse' ? 'pointer' : 'not-allowed',
                      width: '100%', justifyContent: 'center',
                      opacity: review.decisionStatus === 'WaitingStudentResponse' ? 1 : 0.5,
                    }}>
                    <Eye size={15} /> {t('mentorReview.previewBtn')}
                    {review.decisionStatus !== 'WaitingStudentResponse' && (
                      <span style={{ fontSize: 11, marginLeft: 4 }}>({t('mentorReview.waitingMentor', 'Đang chờ mentor')})</span>
                    )}
                  </button>
                )}
              </motion.div>

              {/* Waiting for mentor */}
              {review.decisionStatus === 'Pending' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ padding: '24px 20px', background: 'var(--bg-surface)', border: '1px dashed var(--border-base)', borderRadius: 10, textAlign: 'center' }}>
                  <Clock size={28} style={{ color: 'var(--warning-primary)', margin: '0 auto 10px' }} />
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{t('mentorReview.waitingMentor')}</div>
                </motion.div>
              )}

              {/* Decision buttons - show when WaitingStudentResponse */}
              {review.decisionStatus === 'WaitingStudentResponse' && pathId && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <DecisionButtons pathId={pathId} review={review} t={t}
                    onDecided={updated => {
                      setReview(updated)
                      if (updated.decisionStatus === 'Accepted') {
                        setTimeout(() => navigate('/my-plans/detail', { state: { pathId } }), 1200)
                      }
                    }} />
                </motion.div>
              )}

              {/* Accepted */}
              {review.decisionStatus === 'Accepted' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ padding: '16px 20px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckCircle size={18} style={{ color: 'var(--success-primary)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--success-primary)' }}>{t('mentorReview.acceptedMsg')}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{t('mentorReview.acceptedDesc')}</div>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>

      {showPreviewModal && review?.revisedPathId && (
        <PathPreviewModal revisedPathId={review.revisedPathId} onClose={() => setShowPreviewModal(false)} />
      )}
    </Layout>
  )
}

export default MentorReviewStatusPage
