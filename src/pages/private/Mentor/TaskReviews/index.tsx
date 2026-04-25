import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../../../components/Layout'
import { useMentorSidebarConfig } from '../components/MentorSideBar'
import TaskReviewService, { type TaskReviewListItem, resolveTaskReviewError } from '../../../../services/TaskReviewService'
import { Clock, CheckCircle, ExternalLink, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'

function StatusDot({ status }: { status: string }) {
  const map: Record<string, { color: string; icon: React.ReactNode }> = {
    Pending: { color: 'var(--warning-primary)', icon: <Clock size={12} /> },
    Reviewed: { color: 'var(--success-primary)', icon: <CheckCircle size={12} /> },
  }
  const s = map[status] || map.Pending
  return <span style={{ color: s.color, display: 'flex', alignItems: 'center', gap: 4 }}>{s.icon}{status}</span>
}

const MentorTaskReviewsPage: React.FC = () => {
  const navigate = useNavigate()
  const navItems = useMentorSidebarConfig()
  const [reviews, setReviews] = useState<TaskReviewListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Pagination
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  const sidebarConfig = {
    navItems,
    actions: [],
    brand: { name: 'Task Reviews', subtitle: 'Mentor' },
  }

  const fetchReviews = async (pageNum: number = 1, isLoadMore = false) => {
    setLoading(true)
    setError(null)
    try {
      const res = await TaskReviewService.getTaskReviews({
        status: 'Pending',
        pageNumber: pageNum,
        pageSize: 20
      })
      if (isLoadMore) {
        setReviews(prev => [...prev, ...res.items])
      } else {
        setReviews(res.items)
      }
      setHasMore(res.hasNextPage)
      setPage(pageNum)
    } catch (e: any) {
      setError(resolveTaskReviewError(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReviews()
  }, [])

  return (
    <Layout sidebar={sidebarConfig}>
      <div style={{ padding: 32, background: 'var(--bg-main)', minHeight: '100vh', fontFamily: 'monospace' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>// MENTOR</div>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>Task Reviews</h1>
              </div>
              <button onClick={() => fetchReviews(1, false)} disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-base)', borderRadius: 4, fontSize: 11, cursor: loading ? 'not-allowed' : 'pointer' }}>
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>

            {error && <div style={{ marginBottom: 16, padding: 12, background: 'rgba(var(--danger-primary-rgb), 0.1)', color: 'var(--danger-primary)', borderRadius: 4, fontSize: 12 }}>{error}</div>}

            {!loading && reviews.length === 0 && !error ? (
              <div style={{ padding: '48px 20px', textAlign: 'center', border: '1px dashed var(--border-base)', borderRadius: 4, color: 'var(--text-secondary)', fontSize: 13 }}>
                Không có request review task nào đang chờ xử lý.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {reviews.map(review => (
                  <motion.div key={review.reviewId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{review.taskTitle || 'Untitled Task'}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', background: 'var(--bg-main)', padding: '2px 6px', borderRadius: 2 }}>{review.studentUserName || 'Unknown Student'}</span>
                      </div>
                      
                      {review.studentRequestNote && (
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.5 }}>
                          "{review.studentRequestNote}"
                        </div>
                      )}
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11 }}>
                        <StatusDot status={review.status} />
                        {review.requestedAt && (
                          <span style={{ color: 'var(--text-tertiary)' }}>{new Date(review.requestedAt).toLocaleString('vi-VN')}</span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => navigate(`/task-reviews/${review.reviewId}`)}
                      style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: 2, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'monospace', textTransform: 'uppercase' }}>
                      <ExternalLink size={11} /> Mở Review
                    </button>
                  </motion.div>
                ))}

                {hasMore && (
                  <button onClick={() => fetchReviews(page + 1, true)} disabled={loading}
                    style={{ padding: '10px', background: 'transparent', border: '1px dashed var(--border-base)', color: 'var(--text-secondary)', borderRadius: 4, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 12, marginTop: 8 }}>
                    {loading ? 'Đang tải...' : 'Tải thêm'}
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </Layout>
  )
}

export default MentorTaskReviewsPage
