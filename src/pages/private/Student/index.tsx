import React from 'react'
import useAuthStore from '../../../store/useAuthStore'
import ROUTER_META from '../../../router/ROUTER_META'
import ROUTER from '../../../router/ROUTER'
import { useNavigate } from 'react-router-dom'
import Layout from '../../../components/Layout'
import { getStudentSidebarConfig } from './components/StudentSideBar'
import { LogOut, Settings, HelpCircle, BookOpen, TrendingUp, Award, Calendar, Clock } from 'lucide-react'

const StudentIndex: React.FC = () => {
  const { user, logout } = useAuthStore()
  const displayName = user?.name || user?.username || 'Student'
  const roleName = typeof user?.role === 'string' ? user.role : user?.role?.name ?? '—'
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate(ROUTER.LOGIN)
  }

  const handleSettings = () => {
    navigate(ROUTER.PROFILE)
  }

  const sidebarConfig = {
    navItems: getStudentSidebarConfig(),
    actions: [
      {
        label: 'Settings',
        icon: <Settings className="w-5 h-5" />,
        onClick: handleSettings,
      },
      {
        label: 'Help',
        icon: <HelpCircle className="w-5 h-5" />,
        onClick: () => {
          console.log('Help clicked')
        },
      },
      {
        label: 'Logout',
        icon: <LogOut className="w-5 h-5" />,
        onClick: handleLogout,
        variant: 'danger' as const,
      },
    ],
    brand: {
      name: 'Dashboard',
      subtitle: 'Learning',
    },
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="px-6 py-8 bg-gradient-to-br from-[#f9fafb] to-[#f3f4f6]">
        {/* ========== PROFILE HEADER ========== */}
        <div className="mb-8">
          <div className="bg-white border border-[#e5e7eb] rounded-2xl overflow-hidden shadow-sm">
            <div className="h-24 bg-gradient-to-r from-[#2f80ed] to-[#7c3aed]"></div>
            
            <div className="px-6 pb-6 -mt-12 relative">
              <div className="flex items-end gap-4 mb-4">
                <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-[#2f80ed] to-[#7c3aed] border-4 border-white shadow-lg flex items-center justify-center">
                  <span className="text-white font-bold text-2xl">{getInitials(displayName)}</span>
                </div>
                
                <div className="flex-1 pb-2">
                  <h1 className="text-2xl font-bold text-[#111827]">{displayName}</h1>
                  <p className="text-sm text-[#6b7280]">{roleName} • Learning Platform</p>
                </div>

                <button
                  onClick={() => navigate(ROUTER.HOME)}
                  className="h-10 px-4 rounded-lg border border-[#e5e7eb] bg-white text-sm font-500 text-[#374151] hover:bg-[#f9fafb] transition-all duration-200 cursor-pointer"
                  title="Go back to home page"
                >
                  Back Home
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="stat-card">
                  <div className="stat-card__label">Email</div>
                  <div className="stat-card__value">{user?.email ?? '—'}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card__label">Courses Enrolled</div>
                  <div className="stat-card__value">0</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card__label">Learning Hours</div>
                  <div className="stat-card__value">0h</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card__label">Completion Rate</div>
                  <div className="stat-card__value">0%</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========== MAIN CONTENT GRID ========== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* STUDY PROGRESS */}
          <div className="lg:col-span-2 dashboard-card">
            <div className="dashboard-card__header">
              <div className="flex items-center gap-3">
                <div className="icon-badge icon-badge--primary">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#111827]">Study Progress</h2>
                  <p className="text-xs text-[#6b7280]">Your learning performance</p>
                </div>
              </div>
            </div>
            
            <div className="dashboard-card__body">
              <div className="progress-stub">
                <p className="text-sm text-[#6b7280]">📊 No courses yet. Enroll to start tracking progress.</p>
              </div>
              
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="progress-metric">
                  <div className="metric-value">0</div>
                  <div className="metric-label">Courses</div>
                </div>
                <div className="progress-metric">
                  <div className="metric-value">0</div>
                  <div className="metric-label">Lessons</div>
                </div>
                <div className="progress-metric">
                  <div className="metric-value">0%</div>
                  <div className="metric-label">Avg Score</div>
                </div>
              </div>
            </div>
          </div>

          {/* QUICK STATS */}
          <div className="dashboard-card">
            <div className="dashboard-card__header">
              <div className="flex items-center gap-3">
                <div className="icon-badge icon-badge--warning">
                  <Award size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#111827]">Achievements</h2>
                </div>
              </div>
            </div>
            
            <div className="dashboard-card__body">
              <div className="achievement-stub">
                <p className="text-xs text-[#6b7280]">Complete courses to earn badges and certificates.</p>
              </div>
              <div className="achievement-badges">
                <div className="badge-placeholder">🏆</div>
                <div className="badge-placeholder">⭐</div>
                <div className="badge-placeholder">🎯</div>
              </div>
            </div>
          </div>
        </div>

        {/* ========== UPCOMING & RESOURCES ========== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* UPCOMING CLASSES */}
          <div className="dashboard-card">
            <div className="dashboard-card__header">
              <div className="flex items-center gap-3">
                <div className="icon-badge icon-badge--info">
                  <Calendar size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#111827]">Upcoming Classes</h2>
                  <p className="text-xs text-[#6b7280]">What's coming up</p>
                </div>
              </div>
            </div>
            
            <div className="dashboard-card__body">
              <div className="empty-state">
                <Calendar size={32} className="text-[#d1d5db]" />
                <p className="text-sm text-[#6b7280]">No scheduled classes yet</p>
                <p className="text-xs text-[#9ca3af]">Enroll in courses to see class schedules</p>
              </div>
            </div>
          </div>

          {/* LEARNING RESOURCES */}
          <div className="dashboard-card">
            <div className="dashboard-card__header">
              <div className="flex items-center gap-3">
                <div className="icon-badge icon-badge--success">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#111827]">Learning Resources</h2>
                  <p className="text-xs text-[#6b7280]">Available materials</p>
                </div>
              </div>
            </div>
            
            <div className="dashboard-card__body">
              <div className="empty-state">
                <BookOpen size={32} className="text-[#d1d5db]" />
                <p className="text-sm text-[#6b7280]">No resources available</p>
                <p className="text-xs text-[#9ca3af]">Check back after enrolling in courses</p>
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
                <span>Explore Courses</span>
              </button>
              <button className="action-button action-button--secondary">
                <Calendar size={18} />
                <span>View Schedule</span>
              </button>
              <button className="action-button action-button--secondary">
                <Clock size={18} />
                <span>Set Goals</span>
              </button>
              <button className="action-button action-button--secondary">
                <Settings size={18} />
                <span>Update Profile</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default StudentIndex