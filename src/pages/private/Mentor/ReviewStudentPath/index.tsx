import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import Layout from '../../../../components/Layout'
import { ArrowLeft, Loader, AlertCircle, ExternalLink } from 'lucide-react'
import LearningPathService, { type MentorReviewDto, resolveMentorReviewError } from '../../../../services/LearningPathService'
import MentorReviewSection from '../../../../components/MentorReviewSection'
import useAuthStore from '../../../../store/useAuthStore'
import { motion } from 'framer-motion'
import { useMentorSidebarConfig } from '../components/MentorSideBar'

const MentorReviewStudentPathPage: React.FC = () => {
  const location = useLocation() as any
  const { pathId: pathIdParam } = useParams<{ pathId: string }>()
  const pathId = pathIdParam || location.state?.pathId
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const currentMentorId = String(user?.id ?? '')

  const [planTitle, setPlanTitle] = useState<string>('')
  const [planDesc, setPlanDesc] = useState<string>('')
  const [chapters, setChapters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [myReview, setMyReview] = useState<MentorReviewDto | null>(null)

  const navItems = useMentorSidebarConfig()
  const sidebarConfig = {
    navItems,
    actions: [],
    brand: { name: 'Review Request', subtitle: 'Mentor' },
  }

  useEffect(() => {
    if (!pathId) { setError('Không tìm thấy pathId.'); setLoading(false); return }
    const run = async () => {
      try {
        // Load reviews first - always works for mentor
        const reviews = await LearningPathService.getMentorReviews(pathId)
        const mine = reviews.find(r => r.mentorId === currentMentorId)
        if (mine) setMyReview(mine)

        // Try to load plan info - may fail if mentor can't access student path directly
        // In that case, we still show the review section
        try {
          const api = (await import('../../../../services/Axios')).default
          const res: any = await api.get(`/learningpaths/${pathId}`)
          const data = res?.data ?? res
          const plan = data?.value ?? data
          setPlanTitle(plan?.title || '')
          setPlanDesc(plan?.description || '')
          const chs = plan?.chapters || plan?.chapterDtos || []
          setChapters(chs)
        } catch {
          // Plan info not accessible - still show review section
        }
      } catch (e: any) {
        setError(resolveMentorReviewError(e))
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [pathId, currentMentorId])

  if (loading) {
    return (
      <Layout sidebar={sidebarConfig}>
        <div style={{ padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-main)' }}>
          <Loader className="w-8 h-8 animate-spin" style={{ color: 'var(--accent-primary)' }} />
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout sidebar={sidebarConfig}>
        <div style={{ padding: 32, background: 'var(--bg-main)', minHeight: '100vh', fontFamily: 'monospace' }}>
          <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', marginBottom: 24, fontSize: 14 }}>
            <ArrowLeft size={16} /> Quay lại
          </button>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--danger-primary)', borderRadius: 4, padding: 24 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <AlertCircle size={20} style={{ color: 'var(--danger-primary)', flexShrink: 0 }} />
              <p style={{ margin: 0, color: 'var(--danger-primary)', fontSize: 14 }}>{error}</p>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  const totalLessons = chapters.reduce((sum: number, ch: any) => sum + (ch.lessons?.length || 0), 0)

  return (
    <Layout sidebar={sidebarConfig}>
      <div style={{ padding: 32, background: 'var(--bg-main)', minHeight: '100vh', fontFamily: 'monospace' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <motion.button initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate(-1)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', marginBottom: 24, fontSize: 14, fontWeight: 700 }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            whileHover={{ x: -2 }}>
            <ArrowLeft size={16} /> QUAY LẠI
          </motion.button>

          {/* Plan info */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4, padding: 28, marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, var(--accent-primary) 0%, transparent 100%)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, fontFamily: 'monospace' }}>// STUDENT LEARNING PATH</div>
                <h1 style={{ margin: '0 0 8px 0', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {planTitle || `Path: ${pathId}`}
                </h1>
                {planDesc && <p style={{ margin: '0 0 14px 0', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{planDesc}</p>}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 11, fontWeight: 600 }}>
                  {chapters.length > 0 && (
                    <span style={{ padding: '4px 10px', background: 'var(--bg-main)', border: '1px dashed var(--border-base)', borderRadius: 2 }}>{chapters.length} chương</span>
                  )}
                  {totalLessons > 0 && (
                    <span style={{ padding: '4px 10px', background: 'var(--bg-main)', border: '1px dashed var(--border-base)', borderRadius: 2 }}>{totalLessons} bài học</span>
                  )}
                  <span style={{ padding: '4px 10px', background: 'var(--bg-main)', border: '1px dashed var(--border-base)', borderRadius: 2, color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 10 }}>
                    {pathId}
                  </span>
                </div>
              </div>
              {/* Workspace button */}
              {myReview?.revisedPathId && (
                <button onClick={() => navigate(`/mentor/drafts/${myReview.revisedPathId}`)}
                  style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: 2, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'monospace', textTransform: 'uppercase' }}>
                  <ExternalLink size={12} /> Mở workspace chỉnh sửa
                </button>
              )}
            </div>
          </motion.section>

          {/* Chapters overview - only if available */}
          {chapters.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4, padding: 20, marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, fontFamily: 'monospace' }}>// STRUCTURE</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {chapters.map((ch: any, idx: number) => (
                  <div key={ch.id || idx} style={{ padding: '10px 12px', background: 'var(--bg-main)', border: '1px solid var(--border-base)', borderRadius: 2 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{idx + 1}. {ch.title}</div>
                    {ch.lessons?.length > 0 && (
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                        {ch.lessons.length} bài: {ch.lessons.slice(0, 3).map((l: any) => l.title).join(', ')}{ch.lessons.length > 3 ? '...' : ''}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Review section */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <MentorReviewSection pathId={pathId!} isMentor currentMentorId={currentMentorId} />
          </motion.div>
        </div>
      </div>
    </Layout>
  )
}

export default MentorReviewStudentPathPage
