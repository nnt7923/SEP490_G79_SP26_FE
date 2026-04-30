import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Layout from '../../../components/Layout'
import useAuthStore from '../../../store/useAuthStore'
import { useStudentSidebarConfig } from '../Student/components/StudentSideBar'
import { useMentorSidebarConfig } from '../Mentor/components/MentorSideBar'
import TaskReviewService, { resolveTaskReviewError, type TaskReviewDetail } from '../../../services/TaskReviewService'
import TaskReviewStatusBadge from '../../../components/TaskReview/TaskReviewStatusBadge'
import { canCurrentUserSubmitTaskReview } from '../../../components/TaskReview/utils'

const formatDateTime = (value?: string | null) => {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'

  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(parsed)
}

const FieldBlock = ({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) => (
  <div style={{ border: '1px solid var(--border-base)', borderRadius: 10, padding: 12, background: 'var(--bg-main)' }}>
    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</div>
    <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' : undefined }}>
      {value}
    </div>
  </div>
)

const TextPanel = ({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) => {
  if (!String(value ?? '').trim()) return null

  return (
    <div style={{ border: '1px solid var(--border-base)', borderRadius: 12, padding: 14, background: 'var(--bg-surface)' }}>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>{label}</div>
      <pre
        style={{
          margin: 0,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          color: 'var(--text-primary)',
          fontSize: 13,
          lineHeight: 1.6,
          fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' : 'inherit',
        }}
      >
        {String(value)}
      </pre>
    </div>
  )
}

const TaskReviewDetailPage: React.FC = () => {
  const { reviewId = '' } = useParams<{ reviewId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation(['common', 'student', 'mentor'])
  const user = useAuthStore((state) => state.user)
  const studentNav = useStudentSidebarConfig()
  const mentorNav = useMentorSidebarConfig()
  const roleName = String(user?.role?.name || (user as any)?.roleName || (user as any)?.roles?.[0] || '').trim().toLowerCase()
  const currentUserId = String(user?.id ?? '')

  const sidebarConfig = React.useMemo(() => ({
    navItems: roleName === 'mentor' ? mentorNav : studentNav,
    actions: [],
    brand: {
      name: t('taskReview.title', { ns: 'common', defaultValue: 'Task Review' }),
      subtitle: roleName === 'mentor' ? 'Mentor' : 'Student',
    },
  }), [mentorNav, roleName, studentNav, t])

  const [detail, setDetail] = React.useState<TaskReviewDetail | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [score, setScore] = React.useState('80')
  const [feedback, setFeedback] = React.useState('')
  const [suggestions, setSuggestions] = React.useState('')

  const loadDetail = React.useCallback(async () => {
    if (!reviewId) {
      setError('Task review id is required.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    try {
      const response = await TaskReviewService.getTaskReviewById(reviewId)
      setDetail(response)
      setScore(response.score != null ? String(response.score) : '80')
      setFeedback(response.feedback ?? '')
      setSuggestions(response.suggestions ?? '')
    } catch (loadError: any) {
      setError(resolveTaskReviewError(loadError))
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [reviewId])

  React.useEffect(() => {
    void loadDetail()
  }, [loadDetail])

  const canSubmit = canCurrentUserSubmitTaskReview(detail, currentUserId, roleName)

  const handleSubmit = async () => {
    if (!detail) return
    const normalizedScore = Number(score)
    if (!Number.isFinite(normalizedScore) || normalizedScore < 0 || normalizedScore > 100) {
      setError('Score must be between 0 and 100.')
      return
    }
    if (!feedback.trim()) {
      setError('Feedback is required.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await TaskReviewService.submitTaskReview(detail.reviewId, {
        score: normalizedScore,
        feedback: feedback.trim(),
        suggestions: suggestions.trim() || null,
      })
      await loadDetail()
    } catch (submitError: any) {
      setError(resolveTaskReviewError(submitError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Layout sidebar={sidebarConfig}>
      <div style={{ padding: 24, background: 'var(--bg-main)', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            width: 'fit-content',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontWeight: 700,
            padding: 0,
          }}
        >
          <ArrowLeft size={16} />
          {t('taskReview.back', { ns: 'common', defaultValue: 'Back' })}
        </button>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 240 }}>
            <Loader2 className="animate-spin" size={26} style={{ color: 'var(--accent-primary)' }} />
          </div>
        ) : error && !detail ? (
          <div style={{ borderRadius: 12, border: '1px solid var(--danger-primary)', background: 'rgba(220, 38, 38, 0.08)', color: 'var(--danger-primary)', padding: 16 }}>
            {error}
          </div>
        ) : detail ? (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ border: '1px solid var(--border-base)', borderRadius: 16, background: 'var(--bg-surface)', padding: 20, display: 'grid', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    {t('taskReview.detailEyebrow', { ns: 'common', defaultValue: 'Focus Session Task Review' })}
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.25 }}>
                    {detail.taskTitle || detail.reviewId}
                  </div>
                </div>
                <TaskReviewStatusBadge
                  status={detail.status}
                  pendingLabel={t('taskReview.pending', { ns: 'common', defaultValue: 'Pending' })}
                  reviewedLabel={t('taskReview.reviewed', { ns: 'common', defaultValue: 'Reviewed' })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <FieldBlock label={t('taskReview.student', { ns: 'common', defaultValue: 'Student' })} value={detail.studentUserName || detail.studentId || '-'} />
                <FieldBlock label={t('taskReview.mentor', { ns: 'common', defaultValue: 'Mentor' })} value={detail.mentorUserName || detail.mentorId || '-'} />
                <FieldBlock label={t('taskReview.requestedAt', { ns: 'common', defaultValue: 'Requested at' })} value={formatDateTime(detail.requestedAt)} />
                <FieldBlock label={t('taskReview.reviewedAt', { ns: 'common', defaultValue: 'Reviewed at' })} value={formatDateTime(detail.reviewedAt)} />
                <FieldBlock label={t('taskReview.score', { ns: 'common', defaultValue: 'Score' })} value={detail.score ?? '-'} />
              </div>
            </div>

            {error && (
              <div style={{ borderRadius: 12, border: '1px solid var(--danger-primary)', background: 'rgba(220, 38, 38, 0.08)', color: 'var(--danger-primary)', padding: 16 }}>
                {error}
              </div>
            )}

            <TextPanel label={t('taskReview.studentRequestNote', { ns: 'common', defaultValue: 'Student request note' })} value={detail.studentRequestNote} />
            <TextPanel label={t('taskReview.mentorFeedback', { ns: 'common', defaultValue: 'Mentor feedback' })} value={detail.feedback} />
            <TextPanel label={t('taskReview.suggestions', { ns: 'common', defaultValue: 'Suggestions' })} value={detail.suggestions} />

            <div style={{ display: 'grid', gap: 12 }}>
              <TextPanel label={t('taskReview.submittedCode', { ns: 'common', defaultValue: 'Submitted code' })} value={detail.submittedCode} mono />
              <TextPanel label={t('taskReview.submittedSummary', { ns: 'common', defaultValue: 'Submitted summary' })} value={detail.submittedSummary} />
              <TextPanel label={t('taskReview.submittedQuizAnswers', { ns: 'common', defaultValue: 'Submitted quiz answers' })} value={detail.submittedQuizAnswers} />
              <TextPanel label={t('taskReview.aiFeedback', { ns: 'common', defaultValue: 'AI feedback' })} value={detail.aiFeedback} />
            </div>

            {canSubmit && (
              <div style={{ border: '1px solid var(--border-base)', borderRadius: 16, background: 'var(--bg-surface)', padding: 20, display: 'grid', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>
                    {t('taskReview.submitTitle', { ns: 'common', defaultValue: 'Submit review' })}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                    {t('taskReview.submitHint', { ns: 'common', defaultValue: 'Provide a score, feedback, and optional suggestions.' })}
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 6 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('taskReview.scoreLabel', { ns: 'common', defaultValue: 'Score (0-100)' })}</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={score}
                    onChange={(event) => setScore(event.target.value)}
                    style={{
                      border: '1px solid var(--border-base)',
                      borderRadius: 10,
                      padding: '10px 12px',
                      background: 'var(--bg-main)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gap: 6 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('taskReview.feedbackLabel', { ns: 'common', defaultValue: 'Feedback' })}</label>
                  <textarea
                    rows={6}
                    value={feedback}
                    onChange={(event) => setFeedback(event.target.value)}
                    style={{
                      border: '1px solid var(--border-base)',
                      borderRadius: 10,
                      padding: '10px 12px',
                      background: 'var(--bg-main)',
                      color: 'var(--text-primary)',
                      resize: 'vertical',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gap: 6 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('taskReview.suggestionsLabel', { ns: 'common', defaultValue: 'Suggestions' })}</label>
                  <textarea
                    rows={4}
                    value={suggestions}
                    onChange={(event) => setSuggestions(event.target.value)}
                    style={{
                      border: '1px solid var(--border-base)',
                      borderRadius: 10,
                      padding: '10px 12px',
                      background: 'var(--bg-main)',
                      color: 'var(--text-primary)',
                      resize: 'vertical',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    style={{
                      borderRadius: 10,
                      border: 'none',
                      background: submitting ? 'var(--text-disabled)' : 'var(--accent-primary)',
                      color: 'white',
                      padding: '10px 16px',
                      fontWeight: 700,
                      cursor: submitting ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {submitting
                      ? t('taskReview.submitting', { ns: 'common', defaultValue: 'Submitting...' })
                      : t('taskReview.submit', { ns: 'common', defaultValue: 'Submit review' })}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </Layout>
  )
}

export default TaskReviewDetailPage
