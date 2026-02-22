import React from 'react'
import useAuthStore from '../../../store/useAuthStore'
import Layout from '../../../components/Layout'
import { getMentorSidebarConfig } from './components/MentorSideBar'
import { BookOpen, Users, TrendingUp, Star, FileText, Clock, BarChart3, Settings } from 'lucide-react'

const MentorDashboard: React.FC = () => {
  const { user } = useAuthStore()
  const name = user?.name || user?.username || 'Mentor'
  const role = user?.role?.name || 'Mentor'

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

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="px-6 py-8 bg-gradient-to-br from-[#f9fafb] to-[#f3f4f6]">
        {/* ========== MENTOR PROFILE HEADER ========== */}
        <div className="mb-8">
          <div className="bg-white border border-[#e5e7eb] rounded-2xl overflow-hidden shadow-sm">
            <div className="h-24 bg-gradient-to-r from-[#7c3aed] to-[#2f80ed]"></div>
            
            <div className="px-6 pb-6 -mt-12 relative">
              <div className="flex items-end gap-4 mb-6">
                <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#2f80ed] border-4 border-white shadow-lg flex items-center justify-center">
                  <span className="text-white font-bold text-2xl">{getInitials(name)}</span>
                </div>
                
                <div className="flex-1 pb-2">
                  <h1 className="text-2xl font-bold text-[#111827]">{name}</h1>
                  <p className="text-sm text-[#6b7280]">{role} • Expert Instructor</p>
                </div>

                <button className="h-10 w-10 rounded-lg border border-[#e5e7eb] bg-white text-sm font-500 text-[#374151] hover:bg-[#f9fafb] transition-all duration-200 cursor-pointer flex items-center justify-center" title="Profile settings">
                  <Settings size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="stat-card">
                  <div className="stat-card__label">Email</div>
                  <div className="stat-card__value text-sm">{user?.email ?? '—'}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card__label">Students</div>
                  <div className="stat-card__value">0</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card__label">Courses</div>
                  <div className="stat-card__value">0</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card__label">Avg Rating</div>
                  <div className="stat-card__value">—</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card__label">Lessons</div>
                  <div className="stat-card__value">0</div>
                </div>
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
              <button className="action-button action-button--secondary">
                <FileText size={18} />
                <span>Upload Materials</span>
              </button>
              <button className="action-button action-button--secondary">
                <BarChart3 size={18} />
                <span>View Analytics</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default MentorDashboard