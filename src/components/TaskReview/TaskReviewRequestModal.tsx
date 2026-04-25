import React from 'react'
import { Loader2, Send, X } from 'lucide-react'
import type { FocusSessionHistoryItem } from '../../services/FocusSessionService'
import SubscriptionService from '../../services/SubscriptionService'
import type { MentorDto } from '../../services/MentorService'
import SelectMentorModal from '../SelectMentorModal'
import TaskReviewService, {
  resolveTaskReviewError,
  type RequestTaskReviewResult,
} from '../../services/TaskReviewService'
import { isTaskReviewQuotaReached } from './utils'

export type TaskReviewRequestSession = Pick<
  FocusSessionHistoryItem,
  'sessionId' | 'taskId' | 'taskTitle' | 'title' | 'submittedCode' | 'submittedSummary' | 'submittedQuizAnswers'
>

interface TaskReviewRequestModalProps {
  isOpen: boolean
  session: TaskReviewRequestSession | null
  onClose: () => void
  onSubmitted: (result: RequestTaskReviewResult, mentor: MentorDto) => void
}

const TaskReviewRequestModal: React.FC<TaskReviewRequestModalProps> = ({
  isOpen,
  session,
  onClose,
  onSubmitted,
}) => {
  // Quota check
  const [quotaLoading, setQuotaLoading] = React.useState(false)
  const [quotaChecked, setQuotaChecked] = React.useState(false)
  const [taskReviewsRemaining, setTaskReviewsRemaining] = React.useState<number | null>(null)
  const [quotaError, setQuotaError] = React.useState(false)

  // Confirm / submit state
  const [selectedMentor, setSelectedMentor] = React.useState<MentorDto | null>(null)
  const [note, setNote] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [submitError, setSubmitError] = React.useState('')

  // Reset + load quota when modal opens
  React.useEffect(() => {
    if (!isOpen || !session) {
      setQuotaChecked(false)
      setQuotaLoading(false)
      setTaskReviewsRemaining(null)
      setQuotaError(false)
      setSelectedMentor(null)
      setNote('')
      setSubmitError('')
      return
    }

    let active = true
    setQuotaLoading(true)
    setQuotaChecked(false)
    setQuotaError(false)

    SubscriptionService.getMentorQuota()
      .then((quota) => {
        if (!active) return
        setTaskReviewsRemaining(quota?.taskReviewsRemaining ?? 0)
      })
      .catch(() => {
        if (active) setQuotaError(true)
      })
      .finally(() => {
        if (active) {
          setQuotaLoading(false)
          setQuotaChecked(true)
        }
      })

    return () => { active = false }
  }, [isOpen, session?.sessionId])

  if (!isOpen || !session) return null

  const quotaReached = isTaskReviewQuotaReached(taskReviewsRemaining)
  const showSelectMentor = quotaChecked && !quotaLoading && !quotaReached && !quotaError && !selectedMentor

  // ── Confirm form (mentor already picked) ─────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedMentor || !session?.sessionId) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const result = await TaskReviewService.requestSessionReview(session.sessionId, {
        mentorId: selectedMentor.mentorId,
        studentRequestNote: note.trim() || null,
      })
      onSubmitted(result, selectedMentor)
    } catch (err: any) {
      setSubmitError(resolveTaskReviewError(err))
    } finally {
      setSubmitting(false)
    }
  }

  // ── Quota loading / blocked state ──────────────────────────────────────────
  const renderQuotaGate = () => {
    if (quotaLoading || !quotaChecked) {
      return (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.58)',
            zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
          onClick={onClose}
        >
          <div
            style={{
              width: 'min(400px,100%)', borderRadius: 14, padding: 40,
              border: '1px solid var(--border-base)', background: 'var(--bg-surface)',
              boxShadow: '0 24px 64px rgba(15,23,42,0.24)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Loader2 size={20} style={{ color: 'var(--accent-primary)', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Đang kiểm tra quota...</span>
          </div>
        </div>
      )
    }

    if (quotaError || quotaReached) {
      return (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.58)',
            zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
          onClick={onClose}
        >
          <div
            style={{
              width: 'min(420px,100%)', borderRadius: 14, overflow: 'hidden',
              border: '1px solid var(--border-base)', background: 'var(--bg-surface)',
              boxShadow: '0 24px 64px rgba(15,23,42,0.24)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-base)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>Mentor Review</div>
              <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: 20, display: 'grid', gap: 10 }}>
              {quotaError ? (
                <div style={{ fontSize: 14, color: 'var(--danger-primary)' }}>
                  Không thể kiểm tra quota. Vui lòng thử lại.
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Đã hết lượt Task Review</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    Bạn đã dùng hết số lần nhờ mentor review trong gói hiện tại. Nâng cấp gói để tiếp tục.
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Còn lại: <strong style={{ color: 'var(--danger-primary)' }}>
                      {taskReviewsRemaining ?? 0}
                    </strong>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )
    }

    return null
  }

  // ── SelectMentorModal (browse + pick) ─────────────────────────────────────
  if (showSelectMentor) {
    return (
      <SelectMentorModal
        isOpen
        onClose={onClose}
        onMentorSelected={(mentor) => {
          setSelectedMentor(mentor)
          setNote('')
          setSubmitError('')
        }}
      />
    )
  }

  // ── Confirm form overlay ───────────────────────────────────────────────────
  if (selectedMentor) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.58)',
          zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}
        onClick={() => setSelectedMentor(null)}
      >
        <div
          style={{
            width: 'min(460px,100%)', borderRadius: 14, overflow: 'hidden',
            border: '1px solid var(--border-base)', background: 'var(--bg-surface)',
            boxShadow: '0 24px 64px rgba(15,23,42,0.24)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-base)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>Gửi yêu cầu review</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                {session.taskTitle || session.title || session.sessionId}
              </div>
            </div>
            <button type="button" onClick={() => setSelectedMentor(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4 }}>
              <X size={16} />
            </button>
          </div>

          <div style={{ padding: 18, display: 'grid', gap: 14 }}>
            {/* Mentor info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg-main)', border: '1px solid var(--border-base)', borderRadius: 10 }}>
              {selectedMentor.avatarUrl ? (
                <img src={selectedMentor.avatarUrl} alt={selectedMentor.fullName} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
                  {selectedMentor.fullName?.charAt(0)?.toUpperCase() || 'M'}
                </div>
              )}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{selectedMentor.fullName}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>@{selectedMentor.username}</div>
              </div>
            </div>

            {/* Note */}
            <div>
              <label style={{ display: 'block', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Lời nhắn cho mentor <span style={{ opacity: 0.6 }}>(tuỳ chọn)</span>
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                rows={4}
                placeholder="Nhờ mentor xem lại phần logic xử lý async..."
                style={{
                  width: '100%', boxSizing: 'border-box',
                  border: '1px solid var(--border-base)', borderRadius: 10,
                  padding: '10px 12px', background: 'var(--bg-main)',
                  color: 'var(--text-primary)', resize: 'vertical', outline: 'none',
                }}
              />
            </div>

            {submitError && (
              <div style={{ borderRadius: 10, padding: '10px 12px', background: 'rgba(220,38,38,0.08)', color: 'var(--danger-primary)', fontSize: 12 }}>
                {submitError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                onClick={() => setSelectedMentor(null)}
                style={{ borderRadius: 10, border: '1px solid var(--border-base)', background: 'var(--bg-main)', color: 'var(--text-primary)', padding: '10px 14px', fontWeight: 700, cursor: 'pointer' }}
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  borderRadius: 10, border: 'none',
                  background: submitting ? 'var(--text-disabled)' : 'var(--accent-primary)',
                  color: 'white', padding: '10px 14px', fontWeight: 700,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <Send size={14} />
                {submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Quota gate (loading / blocked)
  return renderQuotaGate()
}

export default TaskReviewRequestModal
