import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../../../components/Layout'
import { getStudentSidebarConfig } from '../components/StudentSideBar'
import { GoalService } from '../../../../services'
import { Search, ChevronRight, Loader, AlertCircle, BookOpen } from 'lucide-react'

const GoalsPage: React.FC = () => {
  const navigate = useNavigate()
  const [goals, setGoals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGoal, setSelectedGoal] = useState<any | null>(null)

  const sidebarConfig = {
    navItems: getStudentSidebarConfig(),
    actions: [],
    brand: { name: 'Goals', subtitle: 'Learning' },
  }

  useEffect(() => {
    fetchGoals()
  }, [])

  const fetchGoals = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await GoalService.listGoals()
      setGoals(Array.isArray(data) ? data : [])
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to load goals'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const filteredGoals = goals.filter(goal => {
    const q = searchTerm.toLowerCase()
    return (goal?.title || '').toLowerCase().includes(q) || 
           (goal?.description || '').toLowerCase().includes(q)
  })

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="px-6 py-8 bg-gradient-to-br from-[#f9fafb] to-[#f3f4f6] min-h-screen">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#111827] mb-2">My Goals</h1>
          <p className="text-[#6b7280]">View and manage your learning goals</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#9ca3af] w-5 h-5" />
            <input
              type="text"
              placeholder="Search goals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-[#e5e7eb] rounded-lg bg-white text-[#111827] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#2f80ed] focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Goals List */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="bg-white rounded-lg border border-[#e5e7eb] p-8 flex items-center justify-center">
                <div className="text-center">
                  <Loader className="w-8 h-8 text-[#2f80ed] animate-spin mx-auto mb-3" />
                  <p className="text-[#6b7280]">Loading your goals...</p>
                </div>
              </div>
            ) : error ? (
              <div className="bg-white rounded-lg border border-[#e5e7eb] p-8">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-[#ef4444] flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-[#111827]">Error loading goals</h3>
                    <p className="text-sm text-[#6b7280] mt-1">{error}</p>
                  </div>
                </div>
              </div>
            ) : filteredGoals.length === 0 ? (
              <div className="bg-white rounded-lg border border-[#e5e7eb] p-12 text-center">
                <BookOpen className="w-12 h-12 text-[#d1d5db] mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[#111827] mb-2">No goals yet</h3>
                <p className="text-[#6b7280]">
                  {searchTerm ? 'No goals match your search.' : 'Start creating your first goal!'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredGoals.map((goal) => (
                  <div
                    key={goal.goalId || goal.id}
                    onClick={() => setSelectedGoal(goal)}
                    className={`bg-white rounded-lg border-2 p-4 cursor-pointer transition-all duration-200 ${
                      selectedGoal?.goalId === goal.goalId || selectedGoal?.id === goal.id
                        ? 'border-[#2f80ed] shadow-md'
                        : 'border-[#e5e7eb] hover:border-[#d1d5db] hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-[#111827] text-lg mb-1">{goal.title || 'Untitled Goal'}</h3>
                        <p className="text-sm text-[#6b7280] line-clamp-2">{goal.description || 'No description'}</p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-[#9ca3af]">
                          <span>⏱️ {goal.durationDays || 0} days</span>
                          <span>{goal.isCompleted ? '✅ Completed' : '⏳ In Progress'}</span>
                          {goal.createdAt && <span>📅 {new Date(goal.createdAt).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[#d1d5db] flex-shrink-0 ml-2" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Goal Details */}
          <div className="lg:col-span-1">
            {selectedGoal ? (
              <div className="bg-white rounded-lg border border-[#e5e7eb] p-6 sticky top-6">
                <h2 className="text-xl font-bold text-[#111827] mb-4">{selectedGoal.title || 'Goal Details'}</h2>
                
                <div className="space-y-4">
                  {/* Description */}
                  <div>
                    <h3 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wide mb-2">Description</h3>
                    <p className="text-sm text-[#374151]">{selectedGoal.description || 'No description available'}</p>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[#e5e7eb]">
                    <div className="bg-[#f3f4f6] rounded-lg p-3">
                      <div className="text-2xl font-bold text-[#2f80ed]">{selectedGoal.durationDays || 0}</div>
                      <div className="text-xs text-[#6b7280] mt-1">Days</div>
                    </div>
                    <div className="bg-[#f3f4f6] rounded-lg p-3">
                      <div className="text-2xl font-bold text-[#7c3aed]">{selectedGoal.isCompleted ? '100' : '0'}%</div>
                      <div className="text-xs text-[#6b7280] mt-1">Progress</div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="pt-4 border-t border-[#e5e7eb]">
                    <h3 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wide mb-2">Status</h3>
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                      selectedGoal.isCompleted 
                        ? 'bg-[#d1fae5] text-[#065f46]' 
                        : 'bg-[#fef3c7] text-[#92400e]'
                    }`}>
                      {selectedGoal.isCompleted ? '✅ Completed' : '⏳ In Progress'}
                    </div>
                  </div>

                  {/* Created Date */}
                  {selectedGoal.createdAt && (
                    <div className="pt-4 border-t border-[#e5e7eb]">
                      <h3 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wide mb-2">Created</h3>
                      <p className="text-sm text-[#374151]">
                        {new Date(selectedGoal.createdAt).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                  )}

                  {/* Completed Date */}
                  {selectedGoal.completedAt && (
                    <div className="pt-4 border-t border-[#e5e7eb]">
                      <h3 className="text-sm font-semibold text-[#6b7280] uppercase tracking-wide mb-2">Completed</h3>
                      <p className="text-sm text-[#374151]">
                        {new Date(selectedGoal.completedAt).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                  )}

                  {/* Action Button */}
                  <button
                    onClick={() => navigate(`/goals/${selectedGoal.goalId || selectedGoal.id}`)}
                    className="w-full mt-4 px-4 py-2 bg-[#2f80ed] text-white rounded-lg font-medium hover:bg-[#1e5fb8] transition-all duration-200"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-[#e5e7eb] p-6 text-center sticky top-6">
                <BookOpen className="w-12 h-12 text-[#d1d5db] mx-auto mb-3" />
                <p className="text-[#6b7280]">Select a goal to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default GoalsPage
