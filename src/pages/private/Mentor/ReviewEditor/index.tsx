import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Layout from '../../../../components/Layout'
import { useMentorSidebarConfig } from '../components/MentorSideBar'
import LearningPathService, { type SkeletonResponse, resolveMentorReviewError } from '../../../../services/LearningPathService'
import { ArrowLeft, Loader, Save, Send, Plus, Trash2, ChevronDown, ChevronUp, X, Eye } from 'lucide-react'
import { motion } from 'framer-motion'
import LessonContent from '../../Plans/components/LessonContent'

interface EditQuiz { id: string; title: string; description: string }
interface EditTask { id: string; title: string; description: string; taskType: string }
interface EditLesson { id: string; title: string; content: string; quizzes: EditQuiz[] }
interface EditChapter { id: string; title: string; content: string; lessons: EditLesson[]; tasks: EditTask[] }

const uid = () => Math.random().toString(36).slice(2)

// Normalize raw API data - handle all possible field name variants
const TASK_TYPE_MAP: Record<number, string> = { 0: 'Practice', 1: 'Theory', 2: 'Quizz' }

function normalizeChapters(raw: any): EditChapter[] {
  const chs: any[] = raw?.chapters || raw?.chapterDtos || raw?.ChapterDtos || raw?.Chapters || []
  return chs.map((ch: any) => {
    const lessons: any[] = ch.lessons || ch.Lessons || ch.lessonDtos || ch.LessonDtos || []
    const tasks: any[] = ch.tasks || ch.Tasks || ch.taskDtos || ch.TaskDtos || []
    return {
      id: ch.id || ch.chapterId || ch.ChapterId || uid(),
      title: ch.title || ch.Title || '',
      content: ch.content || ch.Content || '',
      lessons: lessons.map((ls: any) => {
        const quizzes: any[] = ls.quizzes || ls.Quizzes || ls.quizDtos || ls.QuizDtos || []
        return {
          id: ls.id || ls.lessonId || ls.LessonId || uid(),
          title: ls.title || ls.Title || '',
          content: ls.content || ls.Content || '',
          quizzes: quizzes.map((q: any) => ({
            id: q.id || q.quizId || q.quizzId || q.QuizId || q.QuizzId || uid(),
            title: q.title || q.Title || '',
            description: q.description || q.Description || '',
          })),
        }
      }),
      tasks: tasks.map((t: any) => {
        const rawType = t.taskType ?? t.TaskType
        const taskType = typeof rawType === 'number'
          ? (TASK_TYPE_MAP[rawType] ?? 'Practice')
          : typeof rawType === 'string' ? rawType : 'Practice'
        return { id: t.id || t.taskId || t.TaskId || uid(), title: t.title || t.Title || '', description: t.description || t.Description || '', taskType }
      }),
    }
  })
}

const inp = (extra?: React.CSSProperties): React.CSSProperties => ({
  width: '100%', padding: '8px 12px', background: 'var(--bg-main)',
  border: '1px solid var(--border-base)', borderRadius: 6, color: 'var(--text-primary)',
  fontSize: 13, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s', ...extra,
})

// ── Lesson Content Modal ─────────────────────────────────────────────────────
function LessonContentModal({ title, content, onSave, onClose }: {
  title: string; content: string
  onSave: (c: string) => void; onClose: () => void
}) {
  const [val, setVal] = useState(content)
  const [preview, setPreview] = useState(true)
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}
      onClick={onClose}>
      <div style={{ background: 'var(--bg-surface)', borderRadius: 8, width: '100%', maxWidth: 820, maxHeight: '92vh', display: 'flex', flexDirection: 'column', border: '1px solid var(--border-base)' }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-base)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexShrink: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title || 'Nội dung bài học'}</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            <button onClick={() => setPreview(v => !v)}
              style={{ padding: '5px 14px', background: preview ? 'var(--accent-primary)' : 'transparent', color: preview ? 'white' : 'var(--text-secondary)', border: '1px solid var(--border-base)', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {preview ? '✏️ Chỉnh sửa' : '👁 Preview'}
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, display: 'flex', borderRadius: 4 }}><X size={16} /></button>
          </div>
        </div>
        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: preview ? 0 : 20 }}>
          {preview ? (
            <LessonContent content={val} />
          ) : (
            <textarea value={val} onChange={e => setVal(e.target.value)}
              style={{ width: '100%', height: '100%', minHeight: 400, padding: '12px 16px', background: 'var(--bg-main)', border: 'none', color: 'var(--text-primary)', fontSize: 13, resize: 'none', outline: 'none', boxSizing: 'border-box', lineHeight: 1.7, fontFamily: 'monospace' }}
              placeholder="Nhập nội dung markdown..." />
          )}
        </div>
        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-base)', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-base)', borderRadius: 6, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>Huỷ</button>
          <button onClick={() => { onSave(val); onClose() }}
            style={{ padding: '8px 20px', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Quiz Detail Modal ─────────────────────────────────────────────────────────
function QuizDetailModal({ quiz, onClose }: { quiz: any; onClose: () => void }) {
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const quizId = quiz?.id || quiz?.quizId || quiz?.quizzId

  useEffect(() => {
    if (!quizId) { setLoading(false); return }
    // Try to get questions from quiz object first
    const existing = quiz?.questions || quiz?.Questions || []
    if (existing.length > 0) {
      setQuestions(existing)
      setLoading(false)
      return
    }
    // Fetch via SignalR
    import('../../../../services/SignalR').then(({ requestQuizQuestions }) => {
      requestQuizQuestions(quizId)
        .then((data: any) => {
          const qs = data?.questions || data?.Questions || (Array.isArray(data) ? data : [])
          setQuestions(qs)
        })
        .catch((e: any) => setError(e?.message || 'Không thể tải câu hỏi.'))
        .finally(() => setLoading(false))
    })
  }, [quizId])

  const QUESTION_TYPE_LABELS: Record<number, string> = {
    0: 'True/False', 1: 'Multiple Choice', 2: 'Single Choice',
    3: 'Matching', 4: 'Fill in Blank', 5: 'Ordering',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}
      onClick={onClose}>
      <div style={{ background: 'var(--bg-surface)', borderRadius: 8, width: '100%', maxWidth: 700, maxHeight: '90vh', display: 'flex', flexDirection: 'column', border: '1px solid var(--border-base)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-base)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{quiz?.title || 'Quiz'}</div>
            {quiz?.description && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{quiz.description}</div>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, display: 'flex', borderRadius: 4 }}><X size={16} /></button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
              <Loader className="w-6 h-6 animate-spin" style={{ color: 'var(--accent-primary)' }} />
            </div>
          )}
          {error && <div style={{ color: 'var(--danger-primary)', fontSize: 13, padding: '8px 12px', background: 'rgba(220,38,38,0.06)', borderRadius: 6 }}>{error}</div>}
          {!loading && !error && questions.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-secondary)', fontSize: 13 }}>Chưa có câu hỏi nào.</div>
          )}
          {!loading && questions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {questions.map((q: any, qi: number) => {
                const options: string[] = q.options || q.Options || []
                const correct = q.correctAnswer || q.CorrectAnswer || ''
                const qType = q.type ?? q.Type ?? q.questionType ?? q.QuestionType
                const typeLabel = typeof qType === 'number' ? QUESTION_TYPE_LABELS[qType] : String(qType || '')
                return (
                  <div key={q.id || q.questionId || qi} style={{ padding: '14px 16px', background: 'var(--bg-main)', border: '1px solid var(--border-base)', borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>
                        <span style={{ color: 'var(--accent-primary)', marginRight: 6 }}>Q{qi + 1}.</span>
                        {q.questionText || q.QuestionText || ''}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        {typeLabel && <span style={{ fontSize: 10, padding: '2px 8px', background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 999, color: 'var(--text-secondary)', fontWeight: 600 }}>{typeLabel}</span>}
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
                      <div style={{ fontSize: 12, color: 'var(--success-primary)', fontWeight: 600, padding: '6px 10px', background: 'rgba(34,197,94,0.08)', borderRadius: 6 }}>
                        Đáp án: {correct}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Submit Review Modal ───────────────────────────────────────────────────────
function SubmitReviewModal({ onClose, onSubmit, submitting, error, success }: {
  onClose: () => void
  onSubmit: (data: { score: number; feedback: string; suggestions: string; changeSummary: string; changeReason: string }) => void
  submitting: boolean; error: string | null; success: boolean
}) {
  const [score, setScore] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [suggestions, setSuggestions] = useState('')
  const [changeSummary, setChangeSummary] = useState('')
  const [changeReason, setChangeReason] = useState('')
  const [localErr, setLocalErr] = useState<string | null>(null)

  const ta: React.CSSProperties = { width: '100%', padding: '8px 12px', background: 'var(--bg-main)', border: '1px solid var(--border-base)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13, resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.5 }
  const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 6 }

  const handleSubmit = () => {
    if (score === 0) { setLocalErr('Vui lòng chọn điểm.'); return }
    if (!feedback.trim()) { setLocalErr('Vui lòng nhập feedback.'); return }
    setLocalErr(null)
    onSubmit({ score, feedback: feedback.trim(), suggestions: suggestions.trim(), changeSummary: changeSummary.trim(), changeReason: changeReason.trim() })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}
      onClick={onClose}>
      <div style={{ background: 'var(--bg-surface)', borderRadius: 4, maxWidth: 520, width: '100%', border: '1px solid var(--border-base)', fontFamily: 'monospace', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-base)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Gửi review cho student</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, borderRadius: 4, display: 'flex' }}><X size={16} /></button>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>Điểm đánh giá *</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} type="button" onClick={() => setScore(s)}
                  style={{ width: 40, height: 40, border: `2px solid ${score >= s ? 'var(--warning-primary)' : 'var(--border-base)'}`, borderRadius: 8, background: score >= s ? 'var(--warning-primary)' : 'transparent', color: score >= s ? 'white' : 'var(--text-secondary)', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
                  {s}
                </button>
              ))}
              {score > 0 && <span style={{ alignSelf: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>{score}/5 ⭐</span>}
            </div>
          </div>
          {[
            { label: 'Feedback *', val: feedback, set: setFeedback, ph: 'Nhận xét về lộ trình...', rows: 3 },
            { label: 'Gợi ý cải thiện', val: suggestions, set: setSuggestions, ph: 'Ưu tiên làm mini-project...', rows: 2 },
            { label: 'Tóm tắt thay đổi', val: changeSummary, set: setChangeSummary, ph: 'Đổi thứ tự chapter...', rows: 2 },
            { label: 'Lý do thay đổi', val: changeReason, set: setChangeReason, ph: 'Để student có output sớm...', rows: 2 },
          ].map(({ label, val, set, ph, rows }) => (
            <div key={label} style={{ marginBottom: 12 }}>
              <label style={lbl}>{label}</label>
              <textarea value={val} onChange={e => (set as any)(e.target.value)} rows={rows} placeholder={ph} style={ta}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--border-base)'} />
            </div>
          ))}
          {(localErr || error) && <div style={{ fontSize: 11, color: 'var(--danger-primary)', marginBottom: 12, padding: '6px 10px', background: 'rgba(220,38,38,0.06)', borderRadius: 2 }}>{localErr || error}</div>}
          {success && <div style={{ fontSize: 11, color: 'var(--success-primary)', marginBottom: 12, padding: '6px 10px', background: 'rgba(34,197,94,0.08)', borderRadius: 2 }}>✓ Đã gửi review thành công!</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '9px 18px', background: 'transparent', border: '1px solid var(--border-base)', borderRadius: 6, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>Huỷ</button>
            <button onClick={handleSubmit} disabled={submitting || success}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: (submitting || success) ? 'not-allowed' : 'pointer', opacity: (submitting || success) ? 0.7 : 1 }}>
              <Send size={13} /> {submitting ? 'Đang gửi...' : 'Gửi review'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Chapter Editor ────────────────────────────────────────────────────────────
function ChapterEditor({ chapter, idx, onChange, onDelete, onViewLesson, onViewQuiz }: {
  chapter: EditChapter; idx: number
  onChange: (c: EditChapter) => void; onDelete: () => void
  onViewLesson: (chIdx: number, lsIdx: number) => void
  onViewQuiz: (quiz: any) => void
}) {
  const [open, setOpen] = useState(true)
  const [tab, setTab] = useState<'lessons' | 'tasks'>('lessons')
  const totalQuizzes = chapter.lessons.reduce((s, l) => s + l.quizzes.length, 0)

  return (
    <div style={{ border: '1px solid var(--border-base)', borderRadius: 8, overflow: 'hidden', marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      {/* Chapter header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'var(--bg-surface)', borderBottom: open ? '1px solid var(--border-base)' : 'none' }}>
        <button type="button" onClick={() => setOpen(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 0, display: 'flex', flexShrink: 0 }}>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-primary)', minWidth: 28, flexShrink: 0 }}>CH{idx + 1}</span>
        <input value={chapter.title} onChange={e => onChange({ ...chapter, title: e.target.value })}
          style={inp({ flex: 1, fontWeight: 600, fontSize: 14, background: 'transparent', border: '1px solid transparent', padding: '4px 8px' })}
          onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
          onBlur={e => e.currentTarget.style.borderColor = 'transparent'} />
        <div style={{ display: 'flex', gap: 8, fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0 }}>
          <span>{chapter.lessons.length} bài học</span>
          {totalQuizzes > 0 && <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{totalQuizzes} quiz</span>}
          {chapter.tasks.length > 0 && <span style={{ color: 'var(--warning-primary)', fontWeight: 600 }}>{chapter.tasks.length} task</span>}
        </div>
        <button type="button" onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, display: 'flex', flexShrink: 0, borderRadius: 4 }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--danger-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
          <Trash2 size={14} />
        </button>
      </div>

      {open && (
        <div style={{ padding: '12px 14px', background: 'var(--bg-surface)' }}>
          <textarea value={chapter.content} onChange={e => onChange({ ...chapter, content: e.target.value })}
            rows={2} placeholder="Mô tả chương..."
            style={inp({ resize: 'vertical', marginBottom: 14 })}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border-base)'} />

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-base)', marginBottom: 12 }}>
            {(['lessons', 'tasks'] as const).map(t => (
              <button key={t} type="button" onClick={() => setTab(t)}
                style={{ padding: '6px 16px', background: 'none', border: 'none', borderBottom: tab === t ? '2px solid var(--accent-primary)' : '2px solid transparent', color: tab === t ? 'var(--accent-primary)' : 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginBottom: -1 }}>
                {t === 'lessons' ? `Bài học (${chapter.lessons.length})` : `Tasks (${chapter.tasks.length})`}
              </button>
            ))}
          </div>

          {/* Lessons tab */}
          {tab === 'lessons' && (
            <>
              {chapter.lessons.map((ls, li) => (
                <div key={ls.id} style={{ marginBottom: 12, paddingLeft: 14, borderLeft: '3px solid var(--border-base)' }}>
                  {/* Lesson row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', minWidth: 22 }}>L{li + 1}</span>
                    <input value={ls.title}
                      onChange={e => onChange({ ...chapter, lessons: chapter.lessons.map((l, i) => i === li ? { ...l, title: e.target.value } : l) })}
                      placeholder="Tên bài học" style={inp({ flex: 1 })}
                      onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                      onBlur={e => e.currentTarget.style.borderColor = 'var(--border-base)'} />
                    <button type="button" title="Xem/sửa nội dung" onClick={() => onViewLesson(idx, li)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-primary)', padding: 4, borderRadius: 4, display: 'flex' }}>
                      <Eye size={14} />
                    </button>
                    <button type="button" onClick={() => onChange({ ...chapter, lessons: chapter.lessons.filter((_, i) => i !== li) })}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, borderRadius: 4 }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--danger-primary)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                  {/* Lesson content */}
                  <div style={{ paddingLeft: 30, marginBottom: 6 }}>
                    <textarea value={ls.content}
                      onChange={e => onChange({ ...chapter, lessons: chapter.lessons.map((l, i) => i === li ? { ...l, content: e.target.value } : l) })}
                      rows={3} placeholder="Nội dung bài học..."
                      style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-main)', border: '1px solid var(--border-base)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 12, resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6 }}
                      onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                      onBlur={e => e.currentTarget.style.borderColor = 'var(--border-base)'} />
                  </div>
                  {/* Quizzes under lesson */}
                  <div style={{ paddingLeft: 30 }}>
                    {ls.quizzes.map((q, qi) => (
                      <div key={q.id} style={{ marginBottom: 8, padding: '8px 10px', background: 'var(--bg-main)', border: '1px solid var(--border-base)', borderRadius: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: q.description !== undefined ? 6 : 0 }}>
                          <span style={{ fontSize: 10, color: 'var(--accent-primary)', fontWeight: 700, minWidth: 20 }}>Q{qi + 1}</span>
                          <input value={q.title}
                            onChange={e => onChange({ ...chapter, lessons: chapter.lessons.map((l, i) => i === li ? { ...l, quizzes: l.quizzes.map((x, j) => j === qi ? { ...x, title: e.target.value } : x) } : l) })}
                            placeholder="Tên quiz" style={inp({ flex: 1, fontSize: 12, background: 'var(--bg-surface)' })}
                            onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                            onBlur={e => e.currentTarget.style.borderColor = 'var(--border-base)'} />
                          <button type="button" title="Xem câu hỏi" onClick={() => onViewQuiz(q)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-primary)', padding: 4, borderRadius: 4, display: 'flex' }}>
                            <Eye size={13} />
                          </button>
                          <button type="button"
                            onClick={() => onChange({ ...chapter, lessons: chapter.lessons.map((l, i) => i === li ? { ...l, quizzes: l.quizzes.filter((_, j) => j !== qi) } : l) })}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, borderRadius: 4 }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--danger-primary)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <textarea value={q.description}
                          onChange={e => onChange({ ...chapter, lessons: chapter.lessons.map((l, i) => i === li ? { ...l, quizzes: l.quizzes.map((x, j) => j === qi ? { ...x, description: e.target.value } : x) } : l) })}
                          rows={2} placeholder="Mô tả quiz..."
                          style={{ width: '100%', padding: '6px 8px', background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4, color: 'var(--text-primary)', fontSize: 11, resize: 'none', outline: 'none', boxSizing: 'border-box' }}
                          onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                          onBlur={e => e.currentTarget.style.borderColor = 'var(--border-base)'} />
                      </div>
                    ))}
                    <button type="button"
                      onClick={() => onChange({ ...chapter, lessons: chapter.lessons.map((l, i) => i === li ? { ...l, quizzes: [...l.quizzes, { id: uid(), title: '', description: '' }] } : l) })}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: 'transparent', border: '1px dashed var(--border-base)', borderRadius: 4, color: 'var(--text-secondary)', fontSize: 11, cursor: 'pointer', marginBottom: 2 }}>
                      <Plus size={10} /> Thêm quiz
                    </button>
                  </div>
                </div>
              ))}
              <button type="button"
                onClick={() => onChange({ ...chapter, lessons: [...chapter.lessons, { id: uid(), title: '', content: '', quizzes: [] }] })}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'transparent', border: '1px dashed var(--border-base)', borderRadius: 6, color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500, cursor: 'pointer', marginTop: 4 }}>
                <Plus size={13} /> Thêm bài học
              </button>
            </>
          )}

          {/* Tasks tab */}
          {tab === 'tasks' && (
            <>
              {chapter.tasks.map((task, ti) => (
                <div key={task.id} style={{ marginBottom: 10, padding: '10px 14px', background: 'var(--bg-main)', borderRadius: 6, border: '1px solid var(--border-base)' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--warning-primary)', minWidth: 24 }}>T{ti + 1}</span>
                    <input value={task.title}
                      onChange={e => onChange({ ...chapter, tasks: chapter.tasks.map((t, i) => i === ti ? { ...t, title: e.target.value } : t) })}
                      placeholder="Tên task" style={inp({ flex: 1, background: 'var(--bg-surface)' })}
                      onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                      onBlur={e => e.currentTarget.style.borderColor = 'var(--border-base)'} />
                    <select value={task.taskType}
                      onChange={e => onChange({ ...chapter, tasks: chapter.tasks.map((t, i) => i === ti ? { ...t, taskType: e.target.value } : t) })}
                      style={inp({ width: 110, cursor: 'pointer', background: 'var(--bg-surface)' })}>
                      <option value="Practice">Practice</option>
                      <option value="Theory">Theory</option>
                      <option value="Quizz">Quizz</option>
                    </select>
                    <button type="button" onClick={() => onChange({ ...chapter, tasks: chapter.tasks.filter((_, i) => i !== ti) })}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, borderRadius: 4 }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--danger-primary)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <textarea value={task.description}
                    onChange={e => onChange({ ...chapter, tasks: chapter.tasks.map((t, i) => i === ti ? { ...t, description: e.target.value } : t) })}
                    rows={2} placeholder="Mô tả task..."
                    style={{ width: '100%', padding: '6px 10px', background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4, color: 'var(--text-primary)', fontSize: 12, resize: 'none', outline: 'none', boxSizing: 'border-box' }}
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--border-base)'} />
                </div>
              ))}
              <button type="button"
                onClick={() => onChange({ ...chapter, tasks: [...chapter.tasks, { id: uid(), title: '', description: '', taskType: 'Practice' }] })}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'transparent', border: '1px dashed var(--border-base)', borderRadius: 6, color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500, cursor: 'pointer', marginTop: 4 }}>
                <Plus size={13} /> Thêm task
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
const MentorReviewEditorPage: React.FC = () => {
  const { revisedPathId } = useParams<{ revisedPathId: string }>()
  const [searchParams] = useSearchParams()
  const originalPathId = searchParams.get('pathId') || ''
  const navigate = useNavigate()
  const navItems = useMentorSidebarConfig()

  const [chapters, setChapters] = useState<EditChapter[]>([])
  const [planTitle, setPlanTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [reviewSuccess, setReviewSuccess] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  // Content/quiz view modals
  const [lessonModal, setLessonModal] = useState<{ chIdx: number; lsIdx: number } | null>(null)
  const [quizModal, setQuizModal] = useState<any | null>(null)

  const sidebarConfig = { navItems, actions: [], brand: { name: 'Review Editor', subtitle: 'Mentor' } }

  useEffect(() => {
    if (!revisedPathId) { setLoadError('Thiếu revisedPathId.'); setLoading(false); return }
    LearningPathService.getMyDraftDetail(revisedPathId)
      .then((draft: SkeletonResponse) => {
        setPlanTitle((draft as any).title || '')
        const normalized = normalizeChapters(draft)
        setChapters(normalized)
      })
      .catch((e: any) => setLoadError(e?.message || 'Không thể tải lộ trình.'))
      .finally(() => setLoading(false))
  }, [revisedPathId])

  const buildPayload = () => ({
    title: planTitle, description: null, subjectId: '', goals: [], complexityLevel: 1, languageSelection: 1,
    chapters: chapters.map((ch, ci) => ({
      id: ch.id, chapterId: ch.id, title: ch.title, content: ch.content || null, orderIndex: ci + 1,
      lessons: ch.lessons.map(ls => ({
        id: ls.id, lessonId: ls.id, title: ls.title, content: ls.content || null, lessonDay: null,
        quizzes: ls.quizzes.map(q => ({ id: q.id, quizId: q.id, title: q.title, description: q.description || null })),
      })),
      tasks: ch.tasks.map(t => ({ id: t.id, taskId: t.id, title: t.title, description: t.description || null, taskType: t.taskType })),
    })),
  })

  const handleSave = async () => {
    if (!revisedPathId) return
    setSaving(true)
    try { await LearningPathService.updateManualDraft(revisedPathId, buildPayload() as any) }
    catch (e: any) { alert(e?.message || 'Lưu thất bại.') }
    finally { setSaving(false) }
  }

  const handleSubmitReview = async (data: { score: number; feedback: string; suggestions: string; changeSummary: string; changeReason: string }) => {
    if (!originalPathId) { setReviewError('Thiếu pathId gốc của student.'); return }
    setSubmitting(true); setReviewError(null)
    try {
      if (revisedPathId) await LearningPathService.updateManualDraft(revisedPathId, buildPayload() as any).catch(() => {})
      await LearningPathService.submitMentorReview(originalPathId, {
        score: data.score, feedback: data.feedback,
        suggestions: data.suggestions || null,
        changeSummary: data.changeSummary || null,
        changeReason: data.changeReason || null,
      })
      setReviewSuccess(true)
      setTimeout(() => { setShowSubmitModal(false); navigate(-1) }, 1500)
    } catch (e: any) {
      setReviewError(resolveMentorReviewError(e))
    } finally { setSubmitting(false) }
  }

  if (loading) return (
    <Layout sidebar={sidebarConfig}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-main)' }}>
        <Loader className="w-8 h-8 animate-spin" style={{ color: 'var(--accent-primary)' }} />
      </div>
    </Layout>
  )
  if (loadError) return (
    <Layout sidebar={sidebarConfig}>
      <div style={{ padding: 32, fontFamily: 'monospace', color: 'var(--danger-primary)' }}>{loadError}</div>
    </Layout>
  )

  return (
    <Layout sidebar={sidebarConfig}>
      <div style={{ padding: '24px 32px', background: 'var(--bg-main)', minHeight: '100vh', fontFamily: 'monospace' }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 16 }}>
          <button onClick={() => navigate(-1)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
            <ArrowLeft size={16} /> Quay lại
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleSave} disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: 'transparent', border: '1px solid var(--border-base)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              <Save size={14} /> {saving ? 'Đang lưu...' : 'Lưu nháp'}
            </button>
            <button onClick={() => setShowSubmitModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
              <Send size={14} /> Gửi review cho student
            </button>
          </div>
        </motion.div>

        {/* Title */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4, padding: '16px 20px', marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, var(--accent-primary) 0%, transparent 100%)' }} />
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Chỉnh sửa lộ trình</div>
          <input value={planTitle} onChange={e => setPlanTitle(e.target.value)} placeholder="Tiêu đề lộ trình..."
            style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-main)', border: '1px solid var(--border-base)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 18, fontWeight: 700, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border-base)'} />
        </motion.div>

        {/* Chapters - full width */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          {chapters.map((ch, ci) => (
            <ChapterEditor key={ch.id} chapter={ch} idx={ci}
              onChange={updated => setChapters(prev => prev.map((c, i) => i === ci ? updated : c))}
              onDelete={() => setChapters(prev => prev.filter((_, i) => i !== ci))}
              onViewLesson={(chIdx, lsIdx) => setLessonModal({ chIdx, lsIdx })}
              onViewQuiz={quiz => setQuizModal(quiz)} />
          ))}
          <button onClick={() => setChapters(prev => [...prev, { id: uid(), title: `Chương ${prev.length + 1}`, content: '', lessons: [], tasks: [] }])}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'transparent', border: '2px dashed var(--border-base)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, cursor: 'pointer', width: '100%', justifyContent: 'center', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.color = 'var(--accent-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-base)'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
            <Plus size={15} /> Thêm chương
          </button>
        </motion.div>
      </div>

      {/* Submit modal */}
      {showSubmitModal && (
        <SubmitReviewModal
          onClose={() => { if (!submitting) setShowSubmitModal(false) }}
          onSubmit={handleSubmitReview}
          submitting={submitting}
          error={reviewError}
          success={reviewSuccess}
        />
      )}

      {/* Lesson content modal */}
      {lessonModal && chapters[lessonModal.chIdx]?.lessons[lessonModal.lsIdx] && (
        <LessonContentModal
          title={chapters[lessonModal.chIdx].lessons[lessonModal.lsIdx].title}
          content={chapters[lessonModal.chIdx].lessons[lessonModal.lsIdx].content}
          onSave={newContent => setChapters(prev => prev.map((ch, ci) =>
            ci !== lessonModal.chIdx ? ch : {
              ...ch, lessons: ch.lessons.map((ls, li) =>
                li !== lessonModal.lsIdx ? ls : { ...ls, content: newContent }
              )
            }
          ))}
          onClose={() => setLessonModal(null)}
        />
      )}

      {/* Quiz detail modal */}
      {quizModal && (
        <QuizDetailModal quiz={quizModal} onClose={() => setQuizModal(null)} />
      )}
    </Layout>
  )
}

export default MentorReviewEditorPage
