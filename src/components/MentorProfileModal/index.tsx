import React, { useEffect, useState } from 'react'
import { X, Star, MessageCircle, ArrowLeft, BookOpen, Loader2 } from 'lucide-react'
import MentorService from '../../services/MentorService'
import type { MentorDto, MentorReviewDto } from '../../services/MentorService'
import { useTranslation } from 'react-i18next'

interface MentorProfileModalProps {
  isOpen: boolean
  onClose: () => void
  mentorId: string
  /** If provided, shows a "Chat" button in footer */
  onChat?: () => void
  /** Label for back button — defaults to i18n backToList */
  backLabel?: string
}

const MentorProfileModal: React.FC<MentorProfileModalProps> = ({
  isOpen,
  onClose,
  mentorId,
  onChat,
  backLabel,
}) => {
  const { t } = useTranslation('student')
  const [mentor, setMentor] = useState<MentorDto | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen || !mentorId) return
    setLoading(true)
    MentorService.getMentorById(mentorId)
      .then(setMentor)
      .catch(() => setMentor(null))
      .finally(() => setLoading(false))
  }, [isOpen, mentorId])

  if (!isOpen) return null

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
          maxWidth: 560,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border-base)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none',
              color: 'var(--text-secondary)', cursor: 'pointer',
              padding: 6, borderRadius: 2,
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 11, fontFamily: 'monospace',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            <ArrowLeft size={14} />
            {backLabel ?? t('plans.backToList')}
          </button>
          <span style={{ fontSize: 9, color: 'var(--text-secondary)', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            / {t('plans.mentorProfile')}
          </span>
          <button
            onClick={onClose}
            style={{
              marginLeft: 'auto', background: 'transparent', border: 'none',
              color: 'var(--text-secondary)', cursor: 'pointer',
              padding: 4, borderRadius: 2, display: 'flex',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
            </div>
          )}

          {!loading && !mentor && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)', fontSize: 12, fontFamily: 'monospace' }}>
              {t('plans.noMentorsFound')}
            </div>
          )}

          {!loading && mentor && (
            <>
              {/* Avatar + basic info */}
              <div style={{ display: 'flex', gap: 20, marginBottom: 24 }}>
                {mentor.avatarUrl ? (
                  <img src={mentor.avatarUrl} alt={mentor.fullName}
                    style={{ width: 80, height: 80, borderRadius: 2, objectFit: 'cover', border: '1px solid var(--border-base)', flexShrink: 0 }}
                  />
                ) : (
                  <div style={{
                    width: 80, height: 80, borderRadius: 2, background: 'var(--accent-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontSize: 28, fontWeight: 700, fontFamily: 'monospace', flexShrink: 0,
                  }}>
                    {mentor.fullName?.charAt(0)?.toUpperCase() || 'M'}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <h2 style={{ margin: '0 0 4px 0', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {mentor.fullName}
                  </h2>
                  <p style={{ margin: '0 0 12px 0', fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                    @{mentor.username}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Star size={13} fill="var(--warning-primary)" color="var(--warning-primary)" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                      {mentor.averageRating > 0 ? mentor.averageRating.toFixed(1) : 'N/A'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                      ({mentor.totalReviews} {t('plans.reviews')})
                    </span>
                  </div>
                </div>
              </div>

              {/* Specializations */}
              {mentor.specializations && mentor.specializations.length > 0 && (
                <div style={{
                  marginBottom: 20, padding: 16,
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-base)',
                  borderLeft: '3px solid var(--accent-primary)',
                  borderRadius: 3,
                }}>
                  <div style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
                    color: 'var(--accent-primary)', textTransform: 'uppercase',
                    fontFamily: 'monospace', marginBottom: 10,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <BookOpen size={11} />
                    {t('plans.specializations')}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {mentor.specializations.map((spec) => (
                      <span key={spec} style={{
                        padding: '4px 10px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--accent-primary)',
                        borderRadius: 2, fontSize: 10, fontWeight: 600,
                        color: 'var(--accent-primary)', fontFamily: 'monospace',
                        textTransform: 'uppercase', letterSpacing: '0.03em',
                      }}>
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Bio */}
              {mentor.bio && (
                <div style={{
                  marginBottom: 24, padding: 16,
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-base)',
                  borderRadius: 4,
                }}>
                  <div style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
                    color: 'var(--text-secondary)', textTransform: 'uppercase',
                    fontFamily: 'monospace', marginBottom: 10,
                  }}>
                    {t('plans.biography')}
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.7, fontStyle: 'italic' }}>
                    "{mentor.bio}"
                  </p>
                </div>
              )}

              {/* Reviews */}
              <div style={{ marginBottom: 8 }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                  color: 'var(--text-secondary)', textTransform: 'uppercase',
                  fontFamily: 'monospace', marginBottom: 12,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <Star size={12} />
                  {t('plans.reviews')} ({mentor.totalReviews})
                </div>

                {(mentor.recentReviews ?? []).length === 0 ? (
                  <div style={{
                    padding: 16, background: 'var(--bg-main)',
                    border: '1px solid var(--border-base)', borderRadius: 3,
                    textAlign: 'center', fontSize: 11,
                    color: 'var(--text-secondary)', fontFamily: 'monospace',
                  }}>
                    {t('plans.noReviews')}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {(mentor.recentReviews ?? []).slice(0, 5).map((review: MentorReviewDto) => (
                      <div key={review.ratingId} style={{
                        padding: 12, background: 'var(--bg-main)',
                        border: '1px solid var(--border-base)', borderRadius: 3,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                              {review.studentName}
                            </div>
                            <div style={{ fontSize: 9, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                              {new Date(review.updatedAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 2 }}>
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} size={10}
                                fill={i < review.score ? 'var(--warning-primary)' : 'none'}
                                color={i < review.score ? 'var(--warning-primary)' : 'var(--text-disabled)'}
                              />
                            ))}
                          </div>
                        </div>
                        {review.comment && (
                          <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            {review.comment}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {onChat && mentor && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-base)', background: 'var(--bg-main)' }}>
            <button
              style={{
                width: '100%', padding: '10px 16px',
                background: 'var(--accent-primary)', color: 'white',
                border: 'none', borderRadius: 2,
                fontSize: 11, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9' }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
              onClick={onChat}
            >
              <MessageCircle size={14} />
              {t('plans.chatWithMentor')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default MentorProfileModal
