import React from 'react'
import useAuthStore from '../../../store/useAuthStore'
import ROUTER from '../../../router/ROUTER'
import { useNavigate } from 'react-router-dom'
import Layout from '../../../components/Layout'
import { getStudentSidebarConfig } from './components/StudentSideBar'
import { LogOut, Settings, HelpCircle, Target, BookMarked } from 'lucide-react'
import { listGoals } from '../../../services/GoalService'
import { getUserLearningPaths } from '../../../services/LearningPathService'

const StudentIndex: React.FC = () => {
  const { user, logout } = useAuthStore()
  const displayName = user?.name || user?.username || 'Student'
  const navigate = useNavigate()
  const [goalsCount, setGoalsCount] = React.useState(0)
  const [plansCount, setPlansCount] = React.useState(0)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchCounts = async () => {
      try {
        setLoading(true)
        const [goals, paths] = await Promise.all([
          listGoals(),
          getUserLearningPaths(user?.id || 'me', { pageSize: 1 })
        ])
        setGoalsCount(goals?.length || 0)
        setPlansCount(paths?.totalCount || 0)
      } catch (error) {
        console.error('Error fetching counts:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user?.id) {
      fetchCounts()
    }
  }, [user?.id])

  const handleLogout = async () => {
    await logout()
    navigate(ROUTER.LOGIN)
  }

  const handleSettings = () => {
    navigate(ROUTER.PROFILE)
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
    
      <div className="px-6 py-8 bg-gradient-to-br from-[#f9fafb] to-[#f3f4f6] min-h-screen">
        {/* ========== PROFILE HEADER ========== */}
        <div className="mb-8">
          <div className="bg-white border border-[#e5e7eb] rounded-2xl overflow-hidden shadow-sm">
            <div className="h-24 bg-gradient-to-r from-[#2f80ed] to-[#7c3aed]"></div>
            
            <div className="px-6 pb-6 -mt-12 relative">
              <div className="flex items-end gap-4 mb-6">
                <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-[#2f80ed] to-[#7c3aed] border-4 border-white shadow-lg flex items-center justify-center">
                  <span className="text-white font-bold text-2xl">{getInitials(displayName)}</span>
                </div>
                
                <div className="flex-1 pb-2">
                  <h1 className="text-2xl font-bold text-[#111827]">{displayName}</h1>
                  <p className="text-sm text-[#6b7280]">{user?.email ?? '—'}</p>
                </div>

                <button
                  type="button"
                  onClick={() => navigate(ROUTER.HOME)}
                  className="h-10 px-4 rounded-lg border border-[#e5e7eb] bg-white text-sm font-500 text-[#374151] hover:bg-[#f9fafb] transition-all duration-200 cursor-pointer"
                  title="Go back to home page"
                >
                  Back Home
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Goals Card */}
                <div className="bg-gradient-to-br from-[#fef3c7] to-[#fde68a] rounded-xl p-4 border border-[#fcd34d] shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-[#f59e0b] flex items-center justify-center">
                      <Target size={20} className="text-white" />
                    </div>
                    <span className="text-sm font-medium text-[#92400e]">Goals</span>
                  </div>
                  <div className="text-3xl font-bold text-[#78350f]">
                    {loading ? '—' : goalsCount}
                  </div>
                  <p className="text-xs text-[#b45309] mt-1">Learning objectives</p>
                </div>

                {/* Plans Card */}
                <div className="bg-gradient-to-br from-[#dbeafe] to-[#bfdbfe] rounded-xl p-4 border border-[#93c5fd] shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-[#2f80ed] flex items-center justify-center">
                      <BookMarked size={20} className="text-white" />
                    </div>
                    <span className="text-sm font-medium text-[#1e40af]">Plans</span>
                  </div>
                  <div className="text-3xl font-bold text-[#1e3a8a]">
                    {loading ? '—' : plansCount}
                  </div>
                  <p className="text-xs text-[#1e40af] mt-1">Learning paths</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Navigation */}
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => navigate(ROUTER.GOALS)}
            className="bg-white border border-[#e5e7eb] rounded-xl p-4 hover:shadow-md hover:border-[#2f80ed] transition-all duration-200 text-left group"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-[#fef3c7] group-hover:bg-[#fcd34d] transition-colors flex items-center justify-center">
                <Target size={20} className="text-[#f59e0b]" />
              </div>
              <span className="font-semibold text-[#111827] group-hover:text-[#2f80ed] transition-colors">View Goals</span>
            </div>
            <p className="text-xs text-[#6b7280]">Check your learning objectives</p>
          </button>

          <button
            type="button"
            onClick={() => navigate(ROUTER.MY_PLANS)}
            className="bg-white border border-[#e5e7eb] rounded-xl p-4 hover:shadow-md hover:border-[#2f80ed] transition-all duration-200 text-left group"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-[#dbeafe] group-hover:bg-[#bfdbfe] transition-colors flex items-center justify-center">
                <BookMarked size={20} className="text-[#2f80ed]" />
              </div>
              <span className="font-semibold text-[#111827] group-hover:text-[#2f80ed] transition-colors">View Plans</span>
            </div>
            <p className="text-xs text-[#6b7280]">Explore your learning paths</p>
          </button>
        </div>
      </div>
    
  )
}

export default StudentIndex