import React, { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, ExternalLink, Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LearningPathService, {
  type MentorReviewDto,
  type MentorReviewDecisionStatus,
  resolveMentorReviewError,
} from '../../services/LearningPathService'

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
          <Star size={18} fill={n <= value ? 'var(--warning-primary, #f59e0b)' : 'none'}
            color={n <= value ? 'var(--warning-primary, #f59e0b)' : 'var(--text-secondary)'} />
        </button>
      ))}
    </div>
  )
}

interface MentorReviewSectionProps {
  pathId: string
  isMentor?: boolean
  currentMentorId?: string
}

function DecisionBadge({ status }: { status: MentorReviewDecisionStatus }) {
  const { t } = useTranslation('student')
  const map: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    Pending: { label: t('mentorReview.statusPending', 'Chờ mentor phản hồi'), color: '#1e40af', bg: 'rgba(59,130,246,0.10)', icon: <Clock size={11} /> },
    Accepted: { label: t('mentorReview.statusAccepted', 'Đã chấp nhận'), color: 'var(--success-primary)', bg: 'rgba(34,197,94,0.1)', icon: <CheckCircle size={11} /> },
    Rejected: { label: t('mentorReview.statusRejected', 'Đã từ chối'), color: 'var(--danger-primary)', bg: 'rgba(220,38,38,0.1)', icon: <XCircle size={11} /> },
    WaitingStudentResponse: { label: t('mentorReview.statusWaitingStudentResponse', 'Chờ phản hồi của bạn'), color: 'var(--warning-primary)', bg: 'rgba(245,158,11,0.1)', icon: <Clock size={11} /> },
  }
  const s = map[status] || map.Pending
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, color: s.color, background: s.bg }}>
      {s.icon}{s.label}
    </span>
  )
}

// ── Mentor submit form ──────────────────────────────────────────────────────
function MentorReviewForm({ pathId, onSubmitted }: { pathId: string; onSubmitted: (r: MentorReviewDto) => void }) {
  const [score, setScore] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [suggestions, setSuggestions] = useState('')
  const [changeSummary, setChangeSummary] = useState('')
  const [changeReason, setChangeReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (score === 0) { setError('Vui lòng chọn điểm đánh giá.'); return }
    if (!feedback.trim()) { setError('Vui lòng nhập feedback.'); return }
    setSubmitting(true); setError(null)
    try {
      const result = await LearningPathService.submitMentorReview(pathId, {
        score, feedback: feedback.trim(),
        suggestions: suggestions.trim() || null,
        changeSummary: changeSummary.trim() || null,
        changeReason: changeReason.trim() || null,
      })
      onSubmitted(result)
    } catch (e: any) {
      setError(resolveMentorReviewError(e))
    } finally {
      setSubmitting(false)
    }
  }

  const ta = (extra?: React.CSSProperties): React.CSSProperties => ({
    width: '100%', padding: '8px 10px', background: 'var(--bg-surface)',
    border: '1px solid var(--border-base)', borderRadius: 2, color: 'var(--text-primary)',
    fontSize: 12, fontFamily: 'monospace', resize: 'vertical', outline: 'none',
    boxSizing: 'border-box', ...extra,
  })
  const lbl: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6, fontFamily: 'monospace' }

  return (
    <div style={{ padding: 20, background: 'var(--bg-main)', border: '1px solid var(--border-base)', borderRadius: 4, marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14, fontFamily: 'monospace' }}>// SUBMIT_REVIEW</div>
      <div style={{ marginBottom: 12 }}>
        <label style={lbl}>Điểm đánh giá *</label>
        <StarRating value={score} onChange={setScore} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={lbl}>Feedback *</label>
        <textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={3} placeholder="Nhận xét về lộ trình học..." style={ta()}
          onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
          onBlur={e => e.currentTarget.style.borderColor = 'var(--border-base)'} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={lbl}>Gợi ý cải thiện</label>
        <textarea value={suggestions} onChange={e => setSuggestions(e.target.value)} rows={2} placeholder="Đề xuất thêm chapter, bài học..." style={ta()}
          onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
          onBlur={e => e.currentTarget.style.borderColor = 'var(--border-base)'} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label style={lbl}>Tóm tắt thay đổi</label>
          <textarea value={changeSummary} onChange={e => setChangeSummary(e.target.value)} rows={2} placeholder="Đổi thứ tự chapter..." style={ta()}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border-base)'} />
        </div>
        <div>
          <label style={lbl}>Lý do thay đổi</label>
          <textarea value={changeReason} onChange={e => setChangeReason(e.target.value)} rows={2} placeholder="Để student có output sớm..." style={ta()}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border-base)'} />
        </div>
      </div>
      {error && <div style={{ fontSize: 11, color: 'var(--danger-primary)', marginBottom: 10, fontFamily: 'monospace', padding: '6px 10px', background: 'rgba(220,38,38,0.06)', borderRadius: 2 }}>{error}</div>}
      <button onClick={handleSubmit} disabled={submitting}
        style={{ padding: '8px 20px', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: 2, fontSize: 11, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'monospace', textTransform: 'uppercase', opacity: submitting ? 0.7 : 1 }}>
        {submitting ? 'Đang gửi...' : 'Gửi review'}
      </button>
    </div>
  )
}

// ── Student decision form ───────────────────────────────────────────────────
function DecisionForm({ pathId, review, onDecided }: { pathId: string; review: MentorReviewDto; onDecided: (r: MentorReviewDto) => void }) {
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
    } finally {
      setSubmitting(false)
    }
  }

  const rejectionsLeft = (review.maxRejections ?? 3) - (review.rejectionCount ?? 0)
  const canReject = review.canRequestRevision !== false

  return (
    <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-surface)', border: '1px dashed var(--border-base)', borderRadius: 2 }}>
      <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 8, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', justifyContent: 'space-between' }}>
        <span>Quyết định của bạn</span>
        {review.maxRejections != null && (
          <span style={{ color: rejectionsLeft <= 1 ? 'var(--danger-primary)' : 'var(--text-secondary)' }}>
            Còn {rejectionsLeft} lượt từ chối
          </span>
        )}
      </div>
      <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Ghi chú thêm (tuỳ chọn)..."
        style={{ width: '100%', padding: '6px 8px', background: 'var(--bg-main)', border: '1px solid var(--border-base)', borderRadius: 2, color: 'var(--text-primary)', fontSize: 11, fontFamily: 'monospace', resize: 'none', outline: 'none', marginBottom: 8, boxSizing: 'border-box' }} />
      {error && <div style={{ fontSize: 11, color: 'var(--danger-primary)', marginBottom: 8, fontFamily: 'monospace', padding: '4px 8px', background: 'rgba(220,38,38,0.06)', borderRadius: 2 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => decide('Accepted')} disabled={submitting}
          style={{ flex: 1, padding: '7px 12px', background: 'var(--success-primary)', color: 'white', border: 'none', borderRadius: 2, fontSize: 10, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'monospace', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <CheckCircle size={11} /> Chấp nhận
        </button>
        <button onClick={() => decide('Rejected')} disabled={submitting || !canReject}
          title={!canReject ? 'Đã hết lượt từ chối' : undefined}
          style={{ flex: 1, padding: '7px 12px', background: 'transparent', color: canReject ? 'var(--danger-primary)' : 'var(--text-disabled)', border: `1px solid ${canReject ? 'var(--danger-primary)' : 'var(--border-base)'}`, borderRadius: 2, fontSize: 10, fontWeight: 700, cursor: (submitting || !canReject) ? 'not-allowed' : 'pointer', fontFamily: 'monospace', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <XCircle size={11} /> Từ chối
        </button>
      </div>
    </div>
  )
}

function ReviewCard({ review, pathId, isMentor, onUpdated }: {
  review: MentorReviewDto; pathId: string; isMentor?: boolean; onUpdated: (r: MentorReviewDto) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const navigate = useNavigate()
  const { t } = useTranslation('student')
  const hasContent = !!(review.feedback || review.changeSummary || review.changeReason)

  return (
    <div style={{ border: '1px solid var(--border-base)', borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
      <button type="button" onClick={() => setExpanded(v => !v)}
        style={{ width: '100%', padding: '12px 16px', background: 'var(--bg-main)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Avatar */}
          {review.mentorAvatarUrl ? (
            <img src={review.mentorAvatarUrl} alt={review.mentorName || 'M'} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
              {(review.mentorName || 'M').charAt(0).toUpperCase()}
            </div>
          )}
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{review.mentorName || 'Mentor'}</div>
          </div>
          <DecisionBadge status={review.decisionStatus} />
        </div>
        {expanded ? <ChevronUp size={14} color="var(--text-secondary)" /> : <ChevronDown size={14} color="var(--text-secondary)" />}
      </button>

      {expanded && (
        <div style={{ padding: '14px 16px', background: 'var(--bg-surface)', borderTop: '1px solid var(--border-base)' }}>
          {/* Student request note */}
          {review.studentRequestNote && (
            <div style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--bg-main)', border: '1px dashed var(--border-base)', borderRadius: 6 }}>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{t('mentorReview.yourNote', 'Yêu cầu từ student')}</div>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>{review.studentRequestNote}</p>
            </div>
          )}

          {/* Mentor workspace button */}
          {isMentor && review.revisedPathId && (
            <button onClick={() => navigate(`/mentor/drafts/${review.revisedPathId}`)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 14, padding: '7px 14px', background: 'var(--bg-main)', border: '1px solid var(--accent-primary)', borderRadius: 2, color: 'var(--accent-primary)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'monospace', textTransform: 'uppercase' }}>
              <ExternalLink size={11} /> Mở workspace chỉnh sửa
            </button>
          )}

          {/* Review content */}
          {hasContent ? (
            <>
              {review.feedback && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, fontFamily: 'monospace' }}>Feedback</div>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6 }}>{review.feedback}</p>
                </div>
              )}
              {review.suggestions && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, fontFamily: 'monospace' }}>Gợi ý</div>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6 }}>{review.suggestions}</p>
                </div>
              )}
              {(review.changeSummary || review.changeReason) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  {review.changeSummary && (
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, fontFamily: 'monospace' }}>Tóm tắt thay đổi</div>
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5 }}>{review.changeSummary}</p>
                    </div>
                  )}
                  {review.changeReason && (
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, fontFamily: 'monospace' }}>Lý do thay đổi</div>
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.5 }}>{review.changeReason}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}

          {review.studentDecisionNote && (
            <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--bg-main)', border: '1px dashed var(--border-base)', borderRadius: 6 }}>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{t('mentorReview.decisionTitle', 'Ghi chú của student')}</div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic' }}>{review.studentDecisionNote}</p>
            </div>
          )}

          {/* Student decision - only if WaitingStudentResponse */}
          {!isMentor && review.decisionStatus === 'WaitingStudentResponse' && (
            <DecisionForm pathId={pathId} review={review} onDecided={onUpdated} />
          )}
        </div>
      )}
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────
const MentorReviewSection: React.FC<MentorReviewSectionProps> = ({ pathId, isMentor, currentMentorId }) => {
  const [reviews, setReviews] = useState<MentorReviewDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    if (!pathId) return
    setLoading(true)
    LearningPathService.getMentorReviews(pathId)
      .then(setReviews)
      .catch(e => setError(resolveMentorReviewError(e)))
      .finally(() => setLoading(false))
  }, [pathId])

  const handleReviewSubmitted = (r: MentorReviewDto) => {
    setReviews(prev => {
      const idx = prev.findIndex(x => x.reviewId === r.reviewId)
      if (idx >= 0) { const next = [...prev]; next[idx] = r; return next }
      return [r, ...prev]
    })
    setShowForm(false)
  }

  const handleDecided = (r: MentorReviewDto) => {
    setReviews(prev => prev.map(x => x.reviewId === r.reviewId ? r : x))
  }

  // For mentor: check if they already have a review (to show workspace button in header)
  const myReview = isMentor && currentMentorId
    ? reviews.find(r => r.mentorId === currentMentorId)
    : null

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--accent-primary)' }}>//</span> MENTOR_REVIEWS
          {reviews.length > 0 && (
            <span style={{ fontSize: 10, padding: '2px 6px', background: 'var(--bg-main)', border: '1px solid var(--border-base)', borderRadius: 999, color: 'var(--text-secondary)', fontWeight: 600 }}>
              {reviews.length}
            </span>
          )}
        </div>
        {isMentor && (
          <button onClick={() => setShowForm(v => !v)}
            style={{ padding: '6px 14px', background: showForm ? 'var(--bg-main)' : 'var(--accent-primary)', color: showForm ? 'var(--text-primary)' : 'white', border: '1px solid var(--border-base)', borderRadius: 2, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'monospace', textTransform: 'uppercase' }}>
            {showForm ? 'Huỷ' : myReview ? 'Cập nhật review' : '+ Viết review'}
          </button>
        )}
      </div>

      {isMentor && showForm && <MentorReviewForm pathId={pathId} onSubmitted={handleReviewSubmitted} />}

      {loading && <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'monospace', padding: '12px 0' }}>Đang tải reviews...</div>}
      {error && <div style={{ fontSize: 12, color: 'var(--danger-primary)', fontFamily: 'monospace', padding: '8px 12px', background: 'rgba(220,38,38,0.06)', borderRadius: 2 }}>{error}</div>}

      {!loading && !error && reviews.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'monospace', padding: '20px 0', textAlign: 'center', border: '1px dashed var(--border-base)', borderRadius: 2 }}>
          [ CHƯA CÓ REVIEW ]
        </div>
      )}

      {reviews.map(review => (
        <ReviewCard key={review.reviewId} review={review} pathId={pathId} isMentor={isMentor} onUpdated={handleDecided} />
      ))}
    </div>
  )
}

export default MentorReviewSection
