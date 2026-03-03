import React from 'react'
import useAuthStore from '../../../store/useAuthStore'
import ROUTER from '../../../router/ROUTER'
import { useNavigate } from 'react-router-dom'
import Layout from '../../../components/Layout'
import { getStudentSidebarConfig } from './components/StudentSideBar'
import { LogOut, Target, BookMarked } from 'lucide-react'
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
        const goals = await listGoals()
        const paths = await getUserLearningPaths(user?.id || 'me', { pageSize: 1 })
        
        const goalsLength = Array.isArray(goals) ? goals.length : 0
        const plansTotal = paths?.totalCount || 0
        
        setGoalsCount(goalsLength)
        setPlansCount(plansTotal)
      } catch (error) {
        // Removed console.error in counts fetch catch
      } finally {
        setLoading(false)
      }
    }

    fetchCounts()
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate(ROUTER.LOGIN)
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const sidebarConfig = {
    navItems: getStudentSidebarConfig(),
    actions: [
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

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="px-4 py-4 bg-gray-50 min-h-screen">
        {/* ========== PROFILE HEADER ========== */}
        <div className="mb-4">
          <div className="bg-gradient-to-r from-blue-500 via-purple-600 to-blue-500 rounded-xl overflow-hidden shadow-md">
            <div className="px-5 py-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center flex-shrink-0 shadow-md">
                  <span className="text-white font-bold text-2xl">{getInitials(displayName)}</span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-bold text-white mb-1 truncate">{displayName}</h1>
                  <p className="text-white/80 text-sm truncate">{user?.email ?? '—'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Goals Card */}
          <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-100 to-yellow-200 flex items-center justify-center flex-shrink-0">
                <Target size={20} className="text-yellow-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">Goals</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? '—' : goalsCount}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500">Learning objectives</p>
          </div>

          {/* Plans Card */}
          <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center flex-shrink-0">
                <BookMarked size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">Plans</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? '—' : plansCount}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500">Learning paths</p>
          </div>
        </div>

        {/* Quick Navigation */}
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => navigate(ROUTER.GOALS)}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-blue-500 transition-all duration-200 text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-yellow-100 group-hover:bg-yellow-200 transition-colors flex items-center justify-center">
                <Target size={18} className="text-yellow-600" />
              </div>
              <span className="font-semibold text-gray-900 group-hover:text-blue-500 transition-colors text-base">View Goals</span>
            </div>
            <p className="text-xs text-gray-600">Check your learning objectives</p>
          </button>

          <button
            type="button"
            onClick={() => navigate(ROUTER.MY_PLANS)}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-blue-500 transition-all duration-200 text-left group cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-blue-100 group-hover:bg-blue-200 transition-colors flex items-center justify-center">
                <BookMarked size={18} className="text-blue-600" />
              </div>
              <span className="font-semibold text-gray-900 group-hover:text-blue-500 transition-colors text-base">View Plans</span>
            </div>
            <p className="text-xs text-gray-600">Explore your learning paths</p>
          </button>
        </div>
      </div>
    </Layout>
  )
}

export default StudentIndex
