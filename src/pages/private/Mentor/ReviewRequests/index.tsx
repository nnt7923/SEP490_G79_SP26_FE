import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../../../components/Layout'
import { useMentorSidebarConfig } from '../components/MentorSideBar'
import LearningPathService, { type MentorReviewDto, resolveMentorReviewError } from '../../../../services/LearningPathService'
import useAuthStore from '../../../../store/useAuthStore'
import { Clock, CheckCircle, XCircle, ExternalLink } from 'lucide-react'
import { motion } from 'framer-motion'

function StatusDot({ status }: { status: string }) {
  const map: Record<string, { color: string; icon: React.ReactNode }> = {
    Pending: { color: 'var(--warning-primary)', icon: <Clock size={12} /> },
    Accepted: { color: 'var(--success-primary)', icon: <CheckCircle size={12} /> },
    Rejected: { color: 'var(--danger-primary)', icon: <XCircle size={12} /> },
  }
  const s = map[status] || map.Pending
  return <span style={{ color: s.color, display: 'flex', alignItems: 'center', gap: 4 }}>{s.icon}{status}</span>
}

// Fetch all reviews assigned to this mentor across all paths
// Since there's no "my review requests" endpoint, we use the chat-based approach:
// mentor navigates here from chat, we show a placeholder with manual path input
// OR we could store pathIds from chat messages - for now show a simple UI

const MentorReviewRequestsPage: React.FC = () => {
  const navigate = useNavigate()
  const navItems = useMentorSidebarConfig()
  const { user } = useAuthStore()
  const currentMentorId = String(user?.id ?? '')

  const [pathInput, setPathInput] = useState('')
  const [reviews, setReviews] = useState<(MentorReviewDto & { pathId: string })[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sidebarConfig = {
    navItems,
    actions: [],
    brand: { name: 'Review Requests', subtitle: 'Mentor' },
  }

  const handleLookup = async () => {
    const pid = pathInput.trim()
    if (!pid) return
    setLoading(true); setError(null)
    try {
      const list = await LearningPathService.getMentorReviews(pid)
      const mine = list.filter(r => r.mentorId === currentMentorId)
      if (mine.length === 0) {
        setError('Không tìm thấy review request nào cho bạn trên lộ trình này.')
        return
      }
      setReviews(prev => {
        const existing = new Set(prev.map(r => r.reviewId))
        const newItems = mine.filter(r => !existing.has(r.reviewId)).map(r => ({ ...r, pathId: pid }))
        return [...newItems, ...prev]
      })
      setPathInput('')
    } catch (e: any) {
      setError(resolveMentorReviewError(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout sidebar={sidebarConfig}>
      <div style={{ padding: 32, background: 'var(--bg-main)', minHeight: '100vh', fontFamily: 'monospace' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>// MENTOR</div>
            <h1 style={{ margin: '0 0 24px', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>Review Requests</h1>

            {/* Lookup by pathId */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4, padding: 20, marginBottom: 24 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Tra cứu theo Path ID</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={pathInput}
                  onChange={e => setPathInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLookup()}
                  placeholder="Paste pathId từ tin nhắn chat..."
                  style={{ flex: 1, padding: '8px 12px', background: 'var(--bg-main)', border: '1px solid var(--border-base)', borderRadius: 2, color: 'var(--text-primary)', fontSize: 12, fontFamily: 'monospace', outline: 'none' }}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border-base)'}
                />
                <button onClick={handleLookup} disabled={loading || !pathInput.trim()}
                  style={{ padding: '8px 18px', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: 2, fontSize: 11, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'monospace', textTransform: 'uppercase', opacity: loading ? 0.7 : 1 }}>
                  {loading ? '...' : 'Tìm'}
                </button>
              </div>
              {error && <div style={{ marginTop: 8, fontSize: 11, color: 'var(--danger-primary)', fontFamily: 'monospace' }}>{error}</div>}
            </div>

            {/* Review list */}
            {reviews.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', border: '1px dashed var(--border-base)', borderRadius: 4, color: 'var(--text-secondary)', fontSize: 12 }}>
                Nhập pathId từ tin nhắn chat để xem review request.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {reviews.map(review => (
                  <motion.div key={review.reviewId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace', marginBottom: 4 }}>
                        Path: <span style={{ color: 'var(--text-primary)' }}>{review.pathId}</span>
                      </div>
                      {review.studentRequestNote && (
                        <div style={{ fontSize: 12, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.5 }}>"{review.studentRequestNote}"</div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11 }}>
                        <StatusDot status={review.decisionStatus} />
                        {review.createdAt && (
                          <span style={{ color: 'var(--text-secondary)' }}>{new Date(review.createdAt).toLocaleDateString('vi-VN')}</span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => navigate(`/mentor/review/${review.pathId}`)}
                      style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: 2, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'monospace', textTransform: 'uppercase' }}>
                      <ExternalLink size={11} /> Mở review
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </Layout>
  )
}

export default MentorReviewRequestsPage
