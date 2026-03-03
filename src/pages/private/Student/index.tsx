import React from 'react'
import useAuthStore from '../../../store/useAuthStore'
import ROUTER from '../../../router/ROUTER'
import { useNavigate } from 'react-router-dom'
import Layout from '../../../components/Layout'
import { getStudentSidebarConfig } from './components/StudentSideBar'
import { LogOut, Target, BookMarked, ChevronRight, Loader, Calendar, BookOpen } from 'lucide-react'
import { getMyGoals } from '../../../services/GoalService'
import type { Goal } from '../../../services/GoalService'
import { getUserLearningPaths } from '../../../services/LearningPathService'
import type { SkeletonResponse } from '../../../services/LearningPathService'

const StudentIndex: React.FC = () => {
  const { user, logout } = useAuthStore()
  const displayName = user?.name || user?.username || 'Student'
  const navigate = useNavigate()
  const [goals, setGoals] = React.useState<Goal[]>([])
  const [plans, setPlans] = React.useState<SkeletonResponse[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [goalsData, plansData] = await Promise.all([
          getMyGoals(),
          getUserLearningPaths(user?.id || 'me', { pageSize: 3 })
        ])
        
        setGoals(goalsData.slice(0, 3))
        setPlans(plansData.items.slice(0, 3))
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user?.id])

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
          <div className="bg-blue-500 rounded-xl overflow-hidden shadow-md">
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
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Goals Card */}
          <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
                <Target size={20} className="text-yellow-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">Goals</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? '—' : goals.length}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500">Learning objectives</p>
          </div>

          {/* Plans Card */}
          <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <BookMarked size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">Plans</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? '—' : plans.length}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500">Learning paths</p>
          </div>
        </div>

        {/* Recent Goals Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">Recent Goals</h2>
            <button
              type="button"
              onClick={() => navigate(ROUTER.GOALS)}
              className="text-sm text-blue-500 hover:text-blue-600 font-medium flex items-center gap-1"
            >
              View All
              <ChevronRight size={16} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : goals.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
              <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 mb-2">No goals yet</p>
              <p className="text-sm text-gray-500 mb-4">Create your first learning goal to get started</p>
              <button
                type="button"
                onClick={() => navigate(ROUTER.GOALS)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
              >
                Create Goal
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {goals.map((goal) => (
                <div
                  key={goal.goalId}
                  onClick={() => navigate(`${ROUTER.GOALS}/${goal.goalId}`)}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0 group-hover:bg-yellow-200 transition-colors">
                      <Target size={18} className="text-yellow-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 mb-1 truncate group-hover:text-blue-500 transition-colors">
                        {goal.title}
                      </h3>
                      {goal.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{goal.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Calendar size={14} className="text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {new Date(goal.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Plans Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">Recent Learning Paths</h2>
            <button
              type="button"
              onClick={() => navigate(ROUTER.MY_PLANS)}
              className="text-sm text-blue-500 hover:text-blue-600 font-medium flex items-center gap-1"
            >
              View All
              <ChevronRight size={16} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : plans.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 mb-2">No learning paths yet</p>
              <p className="text-sm text-gray-500 mb-4">Generate your first learning path to start your journey</p>
              <button
                type="button"
                onClick={() => navigate(ROUTER.PLANS)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
              >
                Create Learning Path
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {plans.map((plan) => (
                <div
                  key={plan.pathId}
                  onClick={() => navigate(`${ROUTER.MY_PLANS}/${plan.pathId}`)}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                      <BookMarked size={18} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 mb-1 truncate group-hover:text-blue-500 transition-colors">
                        {plan.title || 'Learning Path'}
                      </h3>
                      {plan.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{plan.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1">
                          <BookOpen size={14} className="text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {plan.chapterCount || plan.chapters?.length || 0} chapters
                          </span>
                        </div>
                        {plan.createdAt && (
                          <div className="flex items-center gap-1">
                            <Calendar size={14} className="text-gray-400" />
                            <span className="text-xs text-gray-500">
                              {new Date(plan.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => navigate(ROUTER.PLANS)}
              className="bg-white border border-blue-200 rounded-lg p-3 hover:shadow-md hover:border-blue-400 transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-1">
                <BookOpen size={16} className="text-blue-500" />
                <span className="font-medium text-gray-900 text-sm">New Path</span>
              </div>
              <p className="text-xs text-gray-600">Generate learning path</p>
            </button>

            <button
              type="button"
              onClick={() => navigate(ROUTER.GOALS)}
              className="bg-white border border-blue-200 rounded-lg p-3 hover:shadow-md hover:border-blue-400 transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-1">
                <Target size={16} className="text-blue-500" />
                <span className="font-medium text-gray-900 text-sm">New Goal</span>
              </div>
              <p className="text-xs text-gray-600">Set learning objective</p>
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default StudentIndex
