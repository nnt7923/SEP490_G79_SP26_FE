
import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../../../../components/Layout'
import { getStudentSidebarConfig } from '../components/StudentSideBar'
import { GoalService } from '../../../../services'
import useAuthStore from '../../../../store/useAuthStore'
import { ArrowLeft, Loader, AlertCircle, BookOpen, Calendar, Clock, CheckCircle2 } from 'lucide-react'

const GoalsDetailPage: React.FC = () => {
  const { goalId } = useParams<{ goalId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  
  const [goal, setGoal] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const sidebarConfig = {
    navItems: getStudentSidebarConfig(),
    actions: [],
    brand: { name: 'Goal Details', subtitle: 'Learning' },
  }

  useEffect(() => {
    fetchGoalDetail()
  }, [goalId])

  const fetchGoalDetail = async () => {
    if (!user?.id || !goalId) return

    setLoading(true)
    setError(null)
    try {
      // Fetch all goals and find the one matching goalId
      const data = await GoalService.listGoals()
      const foundGoal = (Array.isArray(data) ? data : []).find(g => (g.goalId || g.id) === goalId)
      
      if (foundGoal) {
        setGoal(foundGoal)
      } else {
        setError('Goal not found')
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to load goal'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Layout sidebar={sidebarConfig}>
        <div className="px-6 py-8 bg-gradient-to-br from-[#f9fafb] to-[#f3f4f6] min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader className="w-8 h-8 text-[#2f80ed] animate-spin mx-auto mb-3" />
            <p className="text-[#6b7280]">Loading goal details...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (error || !goal) {
    return (
      <Layout sidebar={sidebarConfig}>
        <div className="px-6 py-8 bg-gradient-to-br from-[#f9fafb] to-[#f3f4f6] min-h-screen">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-[#2f80ed] hover:text-[#1e5fb8] mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          
          <div className="bg-white rounded-lg border border-[#e5e7eb] p-8">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#ef4444] flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-[#111827]">Error loading goal</h3>
                <p className="text-sm text-[#6b7280] mt-1">{error || 'Goal not found'}</p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="px-6 py-8 bg-gradient-to-br from-[#f9fafb] to-[#f3f4f6] min-h-screen">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#2f80ed] hover:text-[#1e5fb8] mb-6 transition-colors font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Goals
        </button>

        {/* Header */}
        <div className="bg-white rounded-lg border border-[#e5e7eb] p-8 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-[#111827] mb-2">{goal.title || 'Untitled Goal'}</h1>
              <p className="text-[#6b7280] text-lg">{goal.description || 'No description available'}</p>
            </div>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
              goal.isCompleted 
                ? 'bg-[#d1fae5] text-[#065f46]' 
                : 'bg-[#fef3c7] text-[#92400e]'
            }`}>
              {goal.isCompleted ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Completed
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4" />
                  In Progress
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-[#e5e7eb]">
            <div className="stat-box">
              <div className="text-3xl font-bold text-[#2f80ed]">{goal.durationDays || 0}</div>
              <div className="text-sm text-[#6b7280] mt-1">Days Duration</div>
            </div>
            <div className="stat-box">
              <div className="text-3xl font-bold text-[#7c3aed]">{goal.isCompleted ? '100' : '0'}%</div>
              <div className="text-sm text-[#6b7280] mt-1">Progress</div>
            </div>
            <div className="stat-box">
              <div className="text-3xl font-bold text-[#059669]">{goal.isCompleted ? '✓' : '-'}</div>
              <div className="text-sm text-[#6b7280] mt-1">Status</div>
            </div>
            <div className="stat-box">
              <div className="text-3xl font-bold text-[#f59e0b]">0</div>
              <div className="text-sm text-[#6b7280] mt-1">Learning Paths</div>
            </div>
          </div>

          {/* Meta Info */}
          <div className="flex flex-col gap-3 mt-6 text-sm text-[#6b7280]">
            {goal.createdAt && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Created on {new Date(goal.createdAt).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            )}
            {goal.completedAt && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Completed on {new Date(goal.completedAt).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            )}
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-6">
          {/* Description Section */}
          <div className="bg-white rounded-lg border border-[#e5e7eb] p-6">
            <h2 className="text-xl font-bold text-[#111827] mb-4">About This Goal</h2>
            <p className="text-[#374151] leading-relaxed">
              {goal.description || 'No detailed description available for this goal.'}
            </p>
          </div>

          {/* Learning Paths Section */}
          <div className="bg-white rounded-lg border border-[#e5e7eb] p-6">
            <h2 className="text-xl font-bold text-[#111827] mb-4">Associated Learning Paths</h2>
            <div className="text-center py-8">
              <BookOpen className="w-12 h-12 text-[#d1d5db] mx-auto mb-3" />
              <p className="text-[#6b7280]">No learning paths associated with this goal yet</p>
              <button
                onClick={() => navigate('/my-plans')}
                className="mt-4 px-4 py-2 bg-[#2f80ed] text-white rounded-lg font-medium hover:bg-[#1e5fb8] transition-all duration-200"
              >
                Create Learning Path
              </button>
            </div>
          </div>

          {/* Timeline Section */}
          <div className="bg-white rounded-lg border border-[#e5e7eb] p-6">
            <h2 className="text-xl font-bold text-[#111827] mb-4">Timeline</h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-[#2f80ed] mt-1.5"></div>
                  <div className="w-0.5 h-12 bg-[#e5e7eb]"></div>
                </div>
                <div>
                  <p className="font-semibold text-[#111827]">Goal Created</p>
                  <p className="text-sm text-[#6b7280]">
                    {goal.createdAt ? new Date(goal.createdAt).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'Unknown date'}
                  </p>
                </div>
              </div>
              
              {goal.isCompleted && goal.completedAt && (
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-[#059669]"></div>
                  </div>
                  <div>
                    <p className="font-semibold text-[#111827]">Goal Completed</p>
                    <p className="text-sm text-[#6b7280]">
                      {new Date(goal.completedAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex gap-4">
          <button className="flex-1 px-6 py-3 bg-[#2f80ed] text-white rounded-lg font-medium hover:bg-[#1e5fb8] transition-all duration-200">
            Start Learning
          </button>
          <button
            onClick={() => navigate(-1)}
            className="flex-1 px-6 py-3 border border-[#e5e7eb] text-[#374151] rounded-lg font-medium hover:bg-[#f9fafb] transition-all duration-200"
          >
            Back
          </button>
        </div>
      </div>

      <style>{`
        .stat-box {
          padding: 1rem;
          background: #f9fafb;
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
        }
      `}</style>
    </Layout>
  )
}

export default GoalsDetailPage
