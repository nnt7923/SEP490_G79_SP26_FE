import React from 'react'
import useAuthStore from '../../../store/useAuthStore'
import ROUTER from '../../../router/ROUTER'
import { useNavigate } from 'react-router-dom'
import Header from '../../../components/Layout/Header'
import Footer from '../../../components/Layout/Footer'
import { Target, BookMarked, TrendingUp, Award, BookOpen, CheckCircle2, Loader2, ArrowRight } from 'lucide-react'
import { listGoals } from '../../../services/GoalService'
import { getUserLearningPaths } from '../../../services/LearningPathService'

const StudentOverview: React.FC = () => {
  const { user } = useAuthStore()
  const displayName = user?.name || user?.username || 'Student'
  const navigate = useNavigate()
  const [plansCount, setPlansCount] = React.useState(0)
  const [recentPlans, setRecentPlans] = React.useState<any[]>([])
  const [recentGoals, setRecentGoals] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [stats, setStats] = React.useState({
    totalLessons: 0,
    completedLessons: 0,
    totalChapters: 0,
    activeGoals: 0
  })

  React.useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        const [goals, pathsResponse] = await Promise.all([
          listGoals(),
          getUserLearningPaths(user?.id || 'me', { pageNumber: 1, pageSize: 10 })
        ])
        
        const goalsArray = Array.isArray(goals) ? goals : []
        const plansArray = pathsResponse?.items || []
        
        setPlansCount(pathsResponse?.totalCount || 0)
        setRecentPlans(plansArray.slice(0, 3))
        setRecentGoals(goalsArray.slice(0, 3))

        // Calculate stats
        let totalLessons = 0
        let totalChapters = 0
        plansArray.forEach((plan: any) => {
          totalChapters += plan.chapterCount || plan.chapters?.length || 0
          if (plan.chapters) {
            plan.chapters.forEach((chapter: any) => {
              totalLessons += chapter.lessons?.length || 0
            })
          }
        })

        const activeGoals = goalsArray.filter((g: any) => g.status !== 'Completed').length

        setStats({
          totalLessons,
          completedLessons: 0,
          totalChapters,
          activeGoals
        })
      } catch (error) {
        // Error handling
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [user?.id])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const progressPercentage = stats.totalLessons > 0 
    ? Math.round((stats.completedLessons / stats.totalLessons) * 100) 
    : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Compact Welcome Header with Quick Actions */}
          <div className="mb-4">
            <div className="bg-white rounded-xl p-3 border border-gray-200">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-base">{getInitials(displayName)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-base font-semibold text-gray-900 truncate">Welcome back, {displayName}</h1>
                  <p className="text-xs text-gray-600">Continue your learning journey</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(ROUTER.PLANS)}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200 cursor-pointer text-xs font-medium"
                  >
                    <BookMarked className="w-3.5 h-3.5" />
                    <span>New Plan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(ROUTER.MY_RESOURCES)}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 hover:border-blue-500 text-gray-700 hover:text-blue-500 rounded-lg transition-all duration-200 cursor-pointer text-xs font-medium"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Resources</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div className="bg-white rounded-lg p-3.5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <BookMarked className="w-4.5 h-4.5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Plans</p>
                    <p className="text-2xl font-bold text-gray-900">{plansCount}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-3.5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <Target className="w-4.5 h-4.5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Goals</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.activeGoals}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-3.5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-4.5 h-4.5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Chapters</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalChapters}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-3.5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Award className="w-4.5 h-4.5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Lessons</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalLessons}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Card */}
            <div className="bg-white rounded-lg p-4 border border-gray-200 mb-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-bold text-gray-900">Overall Progress</h2>
                  <p className="text-xs text-gray-600 mt-0.5">Track your learning journey</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  <span className="text-2xl font-bold text-blue-500">{progressPercentage}%</span>
                </div>
              </div>
              <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-xs font-medium text-gray-600">
                <span>{stats.completedLessons} completed</span>
                <span>{stats.totalLessons} total lessons</span>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid lg:grid-cols-2 gap-4">
              {/* Recent Learning Plans */}
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-bold text-gray-900">Recent Learning Plans</h2>
                  <button
                    type="button"
                    onClick={() => navigate(ROUTER.MY_PLANS)}
                    className="text-xs text-blue-500 hover:text-blue-600 font-semibold flex items-center gap-1 cursor-pointer transition-colors duration-200"
                  >
                    View all
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {recentPlans.length > 0 ? (
                  <div className="space-y-2">
                    {recentPlans.map((plan, idx) => (
                      <button
                        key={plan.pathId || plan.id || idx}
                        type="button"
                        onClick={() => navigate(`/my-plans/${plan.pathId || plan.id}`)}
                        className="w-full p-3 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 text-left group cursor-pointer"
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="w-9 h-9 rounded-lg bg-blue-100 group-hover:bg-blue-500 flex items-center justify-center flex-shrink-0 transition-colors duration-200">
                            <BookMarked className="w-4.5 h-4.5 text-blue-500 group-hover:text-white transition-colors duration-200" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm text-gray-900 group-hover:text-blue-500 transition-colors duration-200 truncate mb-0.5">
                              {plan.title || 'Untitled Plan'}
                            </h3>
                            <p className="text-xs text-gray-600 line-clamp-1 mb-1">
                              {plan.description || 'No description'}
                            </p>
                            <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                              <span>{plan.chapterCount || plan.chapters?.length || 0} chapters</span>
                              {plan.createdAt && (
                                <span>{new Date(plan.createdAt).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                      <BookMarked className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600 mb-3 font-medium">No learning plans yet</p>
                    <button
                      type="button"
                      onClick={() => navigate(ROUTER.PLANS)}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 text-xs font-semibold cursor-pointer"
                    >
                      Create Your First Plan
                    </button>
                  </div>
                )}
              </div>

              {/* Recent Goals */}
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-bold text-gray-900">Active Goals</h2>
                  <button
                    type="button"
                    onClick={() => navigate(ROUTER.GOALS)}
                    className="text-xs text-blue-500 hover:text-blue-600 font-semibold flex items-center gap-1 cursor-pointer transition-colors duration-200"
                  >
                    View all
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {recentGoals.length > 0 ? (
                  <div className="space-y-2">
                    {recentGoals.map((goal, idx) => (
                      <button
                        key={goal.id || idx}
                        type="button"
                        onClick={() => navigate(`/goals/${goal.id}`)}
                        className="w-full p-3 rounded-lg border border-gray-200 hover:border-orange-500 hover:bg-orange-50 transition-all duration-200 text-left group cursor-pointer"
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-200 ${
                            goal.status === 'Completed' 
                              ? 'bg-green-100 group-hover:bg-green-500' 
                              : 'bg-orange-100 group-hover:bg-orange-500'
                          }`}>
                            {goal.status === 'Completed' ? (
                              <CheckCircle2 className={`w-4.5 h-4.5 transition-colors duration-200 ${
                                goal.status === 'Completed'
                                  ? 'text-green-600 group-hover:text-white'
                                  : 'text-orange-600 group-hover:text-white'
                              }`} />
                            ) : (
                              <Target className="w-4.5 h-4.5 text-orange-600 group-hover:text-white transition-colors duration-200" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm text-gray-900 group-hover:text-orange-600 transition-colors duration-200 truncate mb-0.5">
                              {goal.title || goal.name || 'Untitled Goal'}
                            </h3>
                            <p className="text-xs text-gray-600 line-clamp-1 mb-1">
                              {goal.description || 'No description'}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                                goal.status === 'Completed'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-orange-100 text-orange-700'
                              }`}>
                                {goal.status || 'In Progress'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                      <Target className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600 mb-3 font-medium">No goals set yet</p>
                    <button
                      type="button"
                      onClick={() => navigate(ROUTER.GOALS)}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 text-xs font-semibold cursor-pointer"
                    >
                      Set Your First Goal
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default StudentOverview
