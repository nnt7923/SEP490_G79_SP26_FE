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
        
        console.log('Goals fetched:', goals)
        console.log('Paths fetched:', paths)
        
        const goalsLength = Array.isArray(goals) ? goals.length : 0
        const plansTotal = paths?.totalCount || 0
        
        console.log('Setting goals count to:', goalsLength)
        console.log('Setting plans count to:', plansTotal)
        
        setGoalsCount(goalsLength)
        setPlansCount(plansTotal)
      } catch (error) {
        console.error('Error fetching counts:', error)
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
      <div className="px-6 py-8 bg-gradient-to-br from-[#f9fafb] to-[#f3f4f6] min-h-screen">
        {/* ========== PROFILE HEADER ========== */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-[#2f80ed] via-[#7c3aed] to-[#2f80ed] rounded-2xl overflow-hidden shadow-lg">
            <div className="px-8 py-8">
              <div className="flex items-center gap-6">
                <div className="w-28 h-28 rounded-2xl bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <span className="text-white font-bold text-4xl">{getInitials(displayName)}</span>
                </div>
                
                <div className="flex-1">
                  <h1 className="text-4xl font-bold text-white mb-2">{displayName}</h1>
                  <p className="text-white/80 text-base mb-4">{user?.email ?? '—'}</p>
                  
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* Goals Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border border-[#e5e7eb]">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#fef3c7] to-[#fde68a] flex items-center justify-center">
                <Target size={24} className="text-[#f59e0b]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#6b7280]">Goals</p>
                <p className="text-3xl font-bold text-[#111827]">
                  {loading ? '—' : goalsCount}
                </p>
              </div>
            </div>
            <p className="text-xs text-[#6b7280]">Learning objectives</p>
          </div>

          {/* Plans Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border border-[#e5e7eb]">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#dbeafe] to-[#bfdbfe] flex items-center justify-center">
                <BookMarked size={24} className="text-[#2f80ed]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#6b7280]">Plans</p>
                <p className="text-3xl font-bold text-[#111827]">
                  {loading ? '—' : plansCount}
                </p>
              </div>
            </div>
            <p className="text-xs text-[#6b7280]">Learning paths</p>
          </div>
        </div>

        {/* Quick Navigation */}
        <div className="grid grid-cols-2 gap-6">
          <button
            type="button"
            onClick={() => navigate(ROUTER.GOALS)}
            className="bg-white border border-[#e5e7eb] rounded-2xl p-6 hover:shadow-lg hover:border-[#2f80ed] transition-all duration-200 text-left group"
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 rounded-xl bg-[#fef3c7] group-hover:bg-[#fcd34d] transition-colors flex items-center justify-center">
                <Target size={20} className="text-[#f59e0b]" />
              </div>
              <span className="font-semibold text-[#111827] group-hover:text-[#2f80ed] transition-colors text-lg">View Goals</span>
            </div>
            <p className="text-sm text-[#6b7280]">Check your learning objectives</p>
          </button>

          <button
            type="button"
            onClick={() => navigate(ROUTER.MY_PLANS)}
            className="bg-white border border-[#e5e7eb] rounded-2xl p-6 hover:shadow-lg hover:border-[#2f80ed] transition-all duration-200 text-left group"
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 rounded-xl bg-[#dbeafe] group-hover:bg-[#bfdbfe] transition-colors flex items-center justify-center">
                <BookMarked size={20} className="text-[#2f80ed]" />
              </div>
              <span className="font-semibold text-[#111827] group-hover:text-[#2f80ed] transition-colors text-lg">View Plans</span>
            </div>
            <p className="text-sm text-[#6b7280]">Explore your learning paths</p>
          </button>
        </div>
      </div>
    </Layout>
  )
}

export default StudentIndex
