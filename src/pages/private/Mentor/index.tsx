import React from 'react'
import useAuthStore from '../../../store/useAuthStore'
import Layout from '../../../components/Layout'
import { getMentorSidebarConfig } from './components/MentorSideBar'
import { BookOpen, Users, TrendingUp, Star, FileText, Clock, BarChart3, Settings, Plus } from 'lucide-react'
import { SubjectService } from '../../../services'

const MentorDashboard: React.FC = () => {
  const { user } = useAuthStore()
  const name = user?.name || user?.username || 'Mentor'
  const role = user?.role?.name || 'Mentor'

  // Subject modal state
  const [showSubjectModal, setShowSubjectModal] = React.useState(false)
  const [newSubjectName, setNewSubjectName] = React.useState('')
  const [newSubjectSlug, setNewSubjectSlug] = React.useState('')
  const [creatingSubject, setCreatingSubject] = React.useState(false)
  const [subjectError, setSubjectError] = React.useState<string | null>(null)
  const [subjectSuccess, setSubjectSuccess] = React.useState<string | null>(null)

  const sidebarConfig = {
    navItems: getMentorSidebarConfig(),
    actions: [
      { label: 'Profile', icon: <></>, onClick: () => {} },
    ],
    brand: { name: 'Overview', subtitle: 'Mentor' },
  }

  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const slugify = (v: string) => v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

  const openSubjectModal = () => {
    setShowSubjectModal(true)
    setSubjectError(null)
    setSubjectSuccess(null)
    setNewSubjectName('')
    setNewSubjectSlug('')
  }

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubjectError(null)
    setSubjectSuccess(null)
    const name = newSubjectName.trim()
    if (!name) {
      setSubjectError('Vui lòng nhập tên subject')
      return
    }
    const slug = newSubjectSlug.trim() || slugify(name)

    try {
      setCreatingSubject(true)
      const created = await SubjectService.createSubject({ name, slug })
      setSubjectSuccess(`Tạo subject "${created?.name || name}" thành công`)
      // Đóng modal sau một chút để người dùng thấy thông báo
      setTimeout(() => setShowSubjectModal(false), 800)
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể tạo subject'
      setSubjectError(msg)
    } finally {
      setCreatingSubject(false)
    }
  }

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="px-6 py-8 bg-gradient-to-br from-[#f9fafb] to-[#f3f4f6] min-h-screen">
        {/* ========== MENTOR PROFILE HEADER ========== */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-[#2f80ed] via-[#7c3aed] to-[#2f80ed] rounded-2xl overflow-hidden shadow-lg">
            <div className="px-8 py-8">
              <div className="flex items-center gap-6">
                <div className="w-28 h-28 rounded-2xl bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <span className="text-white font-bold text-4xl">{getInitials(name)}</span>
                </div>

                <div className="flex-1">
                  <h1 className="text-4xl font-bold text-white mb-2">{name}</h1>
                  <p className="text-white/80 text-base mb-1">{user?.email ?? '—'}</p>
                  <p className="text-white/70 text-sm">{role}</p>
                </div>

                <button
                  className="hidden md:inline-flex h-10 px-4 rounded-lg border border-white/30 bg-white/10 text-white/90 hover:bg-white/20 transition-all duration-200 cursor-pointer items-center gap-2"
                  title="Profile settings"
                >
                  <Settings size={18} />
                  <span className="text-sm font-semibold">Settings</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ========== OVERVIEW GRID ========== */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* MY STUDENTS */}
          <div className="dashboard-card">
            <div className="dashboard-card__header">
              <div className="flex items-center gap-3">
                <div className="icon-badge icon-badge--primary">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-600 text-[#6b7280]">My Students</h3>
                </div>
              </div>
            </div>
            <div className="dashboard-card__body">
              <div className="metric-large">
                <span className="metric-large__value">0</span>
                <span className="metric-large__label">Active learners</span>
              </div>
            </div>
          </div>

          {/* MY COURSES */}
          <div className="dashboard-card">
            <div className="dashboard-card__header">
              <div className="flex items-center gap-3">
                <div className="icon-badge icon-badge--info">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-600 text-[#6b7280]">My Courses</h3>
                </div>
              </div>
            </div>
            <div className="dashboard-card__body">
              <div className="metric-large">
                <span className="metric-large__value">0</span>
                <span className="metric-large__label">Courses taught</span>
              </div>
            </div>
          </div>

          {/* STUDENT PROGRESS */}
          <div className="dashboard-card">
            <div className="dashboard-card__header">
              <div className="flex items-center gap-3">
                <div className="icon-badge icon-badge--success">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-600 text-[#6b7280]">Progress</h3>
                </div>
              </div>
            </div>
            <div className="dashboard-card__body">
              <div className="metric-large">
                <span className="metric-large__value">0%</span>
                <span className="metric-large__label">Avg completion</span>
              </div>
            </div>
          </div>

          {/* FEEDBACK RATING */}
          <div className="dashboard-card">
            <div className="dashboard-card__header">
              <div className="flex items-center gap-3">
                <div className="icon-badge icon-badge--warning">
                  <Star size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-600 text-[#6b7280]">Rating</h3>
                </div>
              </div>
            </div>
            <div className="dashboard-card__body">
              <div className="metric-large">
                <span className="metric-large__value">—</span>
                <span className="metric-large__label">Student feedback</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========== MAIN CONTENT SECTIONS ========== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* MY LESSONS */}
          <div className="dashboard-card">
            <div className="dashboard-card__header">
              <div className="flex items-center gap-3">
                <div className="icon-badge icon-badge--primary">
                  <Clock size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#111827]">My Lessons</h2>
                  <p className="text-xs text-[#6b7280]">Track & provide feedback</p>
                </div>
              </div>
            </div>
            
            <div className="dashboard-card__body">
              <div className="empty-state">
                <Clock size={32} className="text-[#d1d5db]" />
                <p className="text-sm text-[#6b7280]">No lessons scheduled</p>
                <p className="text-xs text-[#9ca3af]">Create courses to start teaching</p>
              </div>
            </div>
          </div>

          {/* RESOURCES & MATERIALS */}
          <div className="dashboard-card">
            <div className="dashboard-card__header">
              <div className="flex items-center gap-3">
                <div className="icon-badge icon-badge--success">
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#111827]">Resources</h2>
                  <p className="text-xs text-[#6b7280]">Manage materials & notes</p>
                </div>
              </div>
            </div>
            
            <div className="dashboard-card__body">
              <div className="empty-state">
                <FileText size={32} className="text-[#d1d5db]" />
                <p className="text-sm text-[#6b7280]">No resources yet</p>
                <p className="text-xs text-[#9ca3af]">Upload learning materials when you create courses</p>
              </div>
            </div>
          </div>
        </div>

        {/* ========== STUDENT PERFORMANCE & ANALYTICS ========== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* STUDENT REVIEWS */}
          <div className="dashboard-card">
            <div className="dashboard-card__header">
              <div className="flex items-center gap-3">
                <div className="icon-badge icon-badge--warning">
                  <Star size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#111827]">Student Reviews</h2>
                </div>
              </div>
            </div>
            
            <div className="dashboard-card__body">
              <div className="empty-state">
                <Star size={32} className="text-[#d1d5db]" />
                <p className="text-sm text-[#6b7280]">No reviews yet</p>
                <p className="text-xs text-[#9ca3af]">Students will rate your teaching</p>
              </div>
            </div>
          </div>

          {/* ANALYTICS */}
          <div className="lg:col-span-2 dashboard-card">
            <div className="dashboard-card__header">
              <div className="flex items-center gap-3">
                <div className="icon-badge icon-badge--info">
                  <BarChart3 size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#111827]">Analytics</h2>
                  <p className="text-xs text-[#6b7280]">Teaching performance overview</p>
                </div>
              </div>
            </div>
            
            <div className="dashboard-card__body">
              <div className="analytics-grid">
                <div className="analytics-item">
                  <div className="analytics-item__label">Total Teaching Hours</div>
                  <div className="analytics-item__value">0h</div>
                </div>
                <div className="analytics-item">
                  <div className="analytics-item__label">Lessons Conducted</div>
                  <div className="analytics-item__value">0</div>
                </div>
                <div className="analytics-item">
                  <div className="analytics-item__label">Student Satisfaction</div>
                  <div className="analytics-item__value">—</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========== QUICK ACTIONS ========== */}
        <div className="dashboard-card">
          <div className="dashboard-card__header">
            <h2 className="text-lg font-bold text-[#111827]">Quick Actions</h2>
          </div>
          
          <div className="dashboard-card__body">
            <div className="action-buttons">
              <button className="action-button action-button--primary">
                <BookOpen size={18} />
                <span>Create Course</span>
              </button>
              <button className="action-button action-button--secondary">
                <Users size={18} />
                <span>View Students</span>
              </button>
              <button className="action-button action-button--secondary" onClick={openSubjectModal}>
                <Plus size={18} />
                <span>Add Subject</span>
              </button>
            </div>
          </div>
        </div>

        {/* ========== SUBJECT CREATE MODAL ========== */}
        {showSubjectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl border border-[#e5e7eb] shadow-lg w-full max-w-md mx-4 p-6">
              <h3 className="text-xl font-bold text-[#111827] mb-4">Tạo Subject mới</h3>
              <form onSubmit={handleCreateSubject} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-1">Tên Subject</label>
                  <input
                    type="text"
                    value={newSubjectName}
                    onChange={(e) => {
                      setNewSubjectName(e.target.value)
                    }}
                    onBlur={() => {
                      if (!newSubjectSlug.trim() && newSubjectName.trim()) {
                        setNewSubjectSlug(slugify(newSubjectName))
                      }
                    }}
                    placeholder="Ví dụ: JavaScript"
                    className="w-full border border-[#e5e7eb] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2f80ed]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#374151] mb-1">Slug (tùy chọn)</label>
                  <input
                    type="text"
                    value={newSubjectSlug}
                    onChange={(e) => setNewSubjectSlug(slugify(e.target.value))}
                    placeholder="vd: javascript"
                    className="w-full border border-[#e5e7eb] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2f80ed]"
                  />
                </div>

                {subjectError && (
                  <div className="text-sm text-[#b91c1c] bg-[#fee2e2] border border-[#fecaca] rounded-lg px-3 py-2">
                    {subjectError}
                  </div>
                )}
                {subjectSuccess && (
                  <div className="text-sm text-[#065f46] bg-[#ecfdf5] border border-[#d1fae5] rounded-lg px-3 py-2">
                    {subjectSuccess}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg border border-[#e5e7eb] bg-white text-[#374151] hover:bg-[#f9fafb]"
                    onClick={() => setShowSubjectModal(false)}
                    disabled={creatingSubject}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#2f80ed] text-white hover:bg-[#1d5ed4] disabled:opacity-60"
                    disabled={creatingSubject}
                  >
                    {creatingSubject ? 'Đang tạo...' : 'Tạo Subject'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default MentorDashboard