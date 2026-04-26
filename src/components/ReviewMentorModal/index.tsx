import React, { useState, useEffect } from 'react'
import { X, Star, Send, Loader2 } from 'lucide-react'
import MentorService from '../../services/MentorService'
import type { MentorReviewDto } from '../../services/MentorService'
import { useTranslation } from 'react-i18next'

interface ReviewMentorModalProps {
  isOpen: boolean
  onClose: () => void
  mentorId: string
  mentorName: string
  existingReview?: MentorReviewDto | null
  onSuccess?: () => void
}

const ReviewMentorModal: React.FC<ReviewMentorModalProps> = ({
  isOpen,
  onClose,
  mentorId,
  mentorName,
  existingReview,
  onSuccess,
}) => {
  const { t } = useTranslation('student')
  const [score, setScore] = useState(existingReview?.score ?? 0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState(existingReview?.comment ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sync when existingReview changes (e.g. modal reopened)
  useEffect(() => {
    setScore(existingReview?.score ?? 0)
    setComment(existingReview?.comment ?? '')
    setError(null)
  }, [existingReview, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (score === 0) return
    setLoading(true)
    setError(null)
    try {
      await MentorService.reviewMentor(mentorId, {
        score,
        comment: comment.trim() || null,
      })
      setScore(0)
      setComment('')
      onSuccess?.()
      onClose()
    } catch (err: any) {
      const errorCode = err?.response?.data?.errorCode || err?.response?.data?.code
      const msg =
        errorCode === 'MENTOR_INTERACTION_REQUIRED'
          ? t('review.interactionRequired')
          : err?.response?.data?.message ||
            err?.response?.data?.title ||
            err?.message ||
            t('review.failed')
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const displayScore = hovered || score

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-base)',
          borderRadius: 2,
          width: '100%',
          maxWidth: 440,
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border-base)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              {existingReview ? t('review.editTitle') : t('review.title')}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace', marginTop: 2 }}>
              {mentorName}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, borderRadius: 2, display: 'flex' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Form */}
        <form id="review-mentor-form" onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Star rating */}
          <div>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.07em',
              textTransform: 'uppercase', color: 'var(--text-secondary)',
              fontFamily: 'monospace', marginBottom: 10,
            }}>
              {t('review.score')} *
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setScore(star)}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 2,
                    display: 'flex',
                    transition: 'transform 0.1s',
                    transform: hovered >= star ? 'scale(1.15)' : 'scale(1)',
                  }}
                >
                  <Star
                    size={28}
                    fill={displayScore >= star ? 'var(--warning-primary)' : 'none'}
                    color={displayScore >= star ? 'var(--warning-primary)' : 'var(--text-disabled, #cbd5e1)'}
                    strokeWidth={1.5}
                  />
                </button>
              ))}
              {score > 0 && (
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace', marginLeft: 4 }}>
                  {score}/5
                </span>
              )}
            </div>
            {score === 0 && (
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'monospace', marginTop: 4 }}>
                {t('review.selectScore')}
              </div>
            )}
          </div>

          {/* Comment */}
          <div>
            <label style={{
              display: 'block', fontSize: 9, fontWeight: 700, letterSpacing: '0.07em',
              textTransform: 'uppercase', color: 'var(--text-secondary)',
              fontFamily: 'monospace', marginBottom: 6,
            }}>
              {t('review.comment')}
            </label>
            <textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('review.commentPlaceholder')}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid var(--border-base)',
                borderRadius: 2,
                background: 'var(--bg-main)',
                color: 'var(--text-primary)',
                fontSize: 12,
                fontFamily: 'monospace',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '8px 12px',
              background: 'var(--bg-main)',
              border: '1px solid var(--danger-primary, #ef4444)',
              borderRadius: 2,
              color: 'var(--danger-primary, #ef4444)',
              fontSize: 11,
              fontFamily: 'monospace',
            }}>
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--border-base)',
          display: 'flex', gap: 8, justifyContent: 'flex-end',
          background: 'var(--bg-main)',
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '7px 16px',
              background: 'transparent',
              border: '1px solid var(--border-base)',
              borderRadius: 2,
              fontSize: 11, fontWeight: 600,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontFamily: 'monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            {t('review.cancel')}
          </button>
          <button
            type="submit"
            form="review-mentor-form"
            disabled={loading || score === 0}
            style={{
              padding: '7px 16px',
              background: score === 0 ? 'var(--bg-surface)' : 'var(--accent-primary)',
              border: 'none',
              borderRadius: 2,
              fontSize: 11, fontWeight: 700,
              color: score === 0 ? 'var(--text-disabled)' : 'white',
              cursor: loading || score === 0 ? 'not-allowed' : 'pointer',
              fontFamily: 'monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              display: 'flex', alignItems: 'center', gap: 6,
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.15s',
            }}
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            {loading ? t('review.submitting') : t('review.submit')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ReviewMentorModal
