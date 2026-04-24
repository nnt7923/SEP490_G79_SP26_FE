import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../../../../components/Layout'
import { useStudentSidebarConfig } from '../components/StudentSideBar'
import LearningPathService, { type MentorReviewDto, resolveMentorReviewError } from '../../../../services/LearningPathService'
import useAuthStore from '../../../../store/useAuthStore'
import { Loader, Clock, CheckCircle, XCircle, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'

function StatusBadge({ status, t }: { status: string; t: any }) {
  const map: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    Pending: { label: t('mentorReview.statusPending', 'Đang chờ'), color: 'var(--warning-primary)', bg: 'rgba(245,158,11,0.1)', icon: <Clock size={11} /> },
    Accepted: { label: t('mentorReview.statusAccepted', 'Đã chấp nhận'), color: 'var(--success-primary)', bg: 'rgba(34,197,94,0.1)', icon: <CheckCircle size={11} /> },
    Rejected: { label: t('mentorReview.statusRejected', 'Đã từ chối'), color: 'var(--danger-primary)', bg: 'rgba(220,38,38,0.1)', icon: <XCircle size={11} /> },
  }
  const s = map[status] || map.Pending
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, color: s.color, background: s.bg }}>
      {s.icon}{s.label}
    </span>
  )
}

const StudentMentorReviewsPage: React.FC = () => {
  const navigate = useNavigate()
  const navItems = useStudentSidebarConfig()
  const { user } = useAuthStore()
  const { t } = useTranslation('student')

  const [items, setItems] = useState<Array<{ pathId: string; pathTitle: string; review: MentorReviewDto }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const sidebarConfig = {
    navItems,
    actions: [],
    brand: { name: t('mentorReviews.title', 'Mentor Reviews'), subtitle: 'CodeNexus' },
  }

  useEffect(() => {
    if (!user?.id) return
    const run = async () => {
      try {
        const plansRes = await LearningPathService.getUserLearningPaths(user.id, { pageSize: 50, useCache: false })
        const plans = plansRes.items || []
        const results: typeof items = []
        await Promise.allSettled(
          plans.map(async (plan) => {
            const pathId = plan.pathId || (plan as any).id
            if (!pathId) return
            try {
              const reviews = await LearningPathService.getMentorReviews(pathId)
              reviews.forEach(r => results.push({ pathId, pathTitle: (plan as any).title || pathId, review: r }))
            } catch { }
          })
        )
        results.sort((a, b) => {
          if (a.review.decisionStatus === 'Pending' && b.review.decisionStatus !== 'Pending') return -1
          if (b.review.decisionStatus === 'Pending' && a.review.decisionStatus !== 'Pending') return 1
          return new Date(b.review.createdAt || 0).getTime() - new Date(a.review.createdAt || 0).getTime()
        })
        setItems(results)
      } catch (e: any) {
        setError(resolveMentorReviewError(e))
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [user?.id])

  return (
    <Layout sidebar={sidebarConfig}>
      <div style={{ padding: 32, background: 'var(--bg-main)', minHeight: '100vh' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
                {t('mentorReviews.title', 'Mentor Reviews')}
              </h1>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                {t('mentorReviews.subtitle', 'Danh sách review từ mentor')}
              </p>
            </div>

            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
                <Loader className="w-8 h-8 animate-spin" style={{ color: 'var(--accent-primary)' }} />
              </div>
            )}

            {error && (
              <div style={{ padding: '12px 16px', background: 'rgba(220,38,38,0.06)', border: '1px solid var(--danger-primary)', borderRadius: 8, color: 'var(--danger-primary)', fontSize: 13 }}>{error}</div>
            )}

            {!loading && !error && items.length === 0 && (
              <div style={{ padding: '48px 20px', textAlign: 'center', border: '1px dashed var(--border-base)', borderRadius: 10, color: 'var(--text-secondary)', fontSize: 14 }}>
                {t('mentorReviews.empty', 'Chưa có review nào từ mentor.')}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {items.map(({ pathId, pathTitle, review }) => (
                <motion.div key={review.reviewId} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  style={{ background: 'var(--bg-surface)', border: `1px solid ${review.decisionStatus === 'Pending' ? 'rgba(59,130,246,0.3)' : 'var(--border-base)'}`, borderRadius: 10, padding: '16px 20px', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
                  onClick={() => navigate(`/learning-paths/${pathId}/mentor-review`)}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = 'none'}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {pathTitle}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <StatusBadge status={review.decisionStatus} t={t} />
                        {review.mentorName && (
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                            {t('mentorReviews.byMentor', 'bởi {{name}}', { name: review.mentorName })}
                          </span>
                        )}
                        {review.createdAt && (
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                            {new Date(new Date(review.createdAt).getTime() + 7 * 3600000).toLocaleDateString('vi-VN')}
                          </span>
                        )}
                      </div>
                      {review.changeSummary && (
                        <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {review.changeSummary}
                        </p>
                      )}
                    </div>
                    <ArrowRight size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0, marginTop: 2 }} />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  )
}

export default StudentMentorReviewsPage
