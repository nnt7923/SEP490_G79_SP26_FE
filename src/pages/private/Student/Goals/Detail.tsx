
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
      const data = await GoalService.getMyGoals()
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
        <div className="px-6 py-8 bg-gradient-to-br from-[var(--color-hex-12)] to-[var(--gray-100)] min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader className="w-8 h-8 text-[var(--color-hex-48)] animate-spin mx-auto mb-3" />
            <p className="text-[var(--text-secondary)]">Loading goal details...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (error || !goal) {
    return (
      <Layout sidebar={sidebarConfig}>
        <div className="px-6 py-8 bg-gradient-to-br from-[var(--color-hex-12)] to-[var(--gray-100)] min-h-screen">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-[var(--color-hex-48)] hover:text-[var(--color-hex-101)] mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          
          <div className="bg-white rounded-lg border border-[var(--gray-200)] p-8">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[var(--color-hex-85)] flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-[var(--gray-900)]">Error loading goal</h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1">{error || 'Goal not found'}</p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="px-6 py-8 bg-gradient-to-br from-[var(--color-hex-12)] to-[var(--gray-100)] min-h-screen">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[var(--color-hex-48)] hover:text-[var(--color-hex-101)] mb-6 transition-colors font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Goals
        </button>

        {/* Header */}
        <div className="bg-white rounded-lg border border-[var(--gray-200)] p-8 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-[var(--gray-900)] mb-2">{goal.title || 'Untitled Goal'}</h1>
              <p className="text-[var(--text-secondary)] text-lg">{goal.description || 'No description available'}</p>
            </div>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
              goal.isCompleted 
                ? 'bg-[var(--color-hex-59)] text-[var(--color-hex-102)]' 
                : 'bg-[var(--color-hex-54)] text-[var(--color-hex-83)]'
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-[var(--gray-200)]">
            <div className="stat-box">
              <div className="text-3xl font-bold text-[var(--color-hex-48)]">{goal.durationDays || 0}</div>
              <div className="text-sm text-[var(--text-secondary)] mt-1">Days Duration</div>
            </div>
            <div className="stat-box">
              <div className="text-3xl font-bold text-[var(--color-hex-50)]">{goal.isCompleted ? '100' : '0'}%</div>
              <div className="text-sm text-[var(--text-secondary)] mt-1">Progress</div>
            </div>
            <div className="stat-box">
              <div className="text-3xl font-bold text-[var(--color-hex-58)]">{goal.isCompleted ? '✓' : '-'}</div>
              <div className="text-sm text-[var(--text-secondary)] mt-1">Status</div>
            </div>
            <div className="stat-box">
              <div className="text-3xl font-bold text-[var(--color-hex-28)]">0</div>
              <div className="text-sm text-[var(--text-secondary)] mt-1">Learning Paths</div>
            </div>
          </div>

          {/* Meta Info */}
          <div className="flex flex-col gap-3 mt-6 text-sm text-[var(--text-secondary)]">
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
          <div className="bg-white rounded-lg border border-[var(--gray-200)] p-6">
            <h2 className="text-xl font-bold text-[var(--gray-900)] mb-4">About This Goal</h2>
            <p className="text-[var(--gray-700)] leading-relaxed">
              {goal.description || 'No detailed description available for this goal.'}
            </p>
          </div>

          {/* Learning Paths Section */}
          <div className="bg-white rounded-lg border border-[var(--gray-200)] p-6">
            <h2 className="text-xl font-bold text-[var(--gray-900)] mb-4">Associated Learning Paths</h2>
            <div className="text-center py-8">
              <BookOpen className="w-12 h-12 text-[var(--gray-300)] mx-auto mb-3" />
              <p className="text-[var(--text-secondary)]">No learning paths associated with this goal yet</p>
              <button
                onClick={() => navigate('/my-plans')}
                className="mt-4 px-4 py-2 bg-[var(--color-hex-48)] text-white rounded-lg font-medium hover:bg-[var(--color-hex-101)] transition-all duration-200"
              >
                Create Learning Path
              </button>
            </div>
          </div>

          {/* Timeline Section */}
          <div className="bg-white rounded-lg border border-[var(--gray-200)] p-6">
            <h2 className="text-xl font-bold text-[var(--gray-900)] mb-4">Timeline</h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-[var(--color-hex-48)] mt-1.5"></div>
                  <div className="w-0.5 h-12 bg-[var(--gray-200)]"></div>
                </div>
                <div>
                  <p className="font-semibold text-[var(--gray-900)]">Goal Created</p>
                  <p className="text-sm text-[var(--text-secondary)]">
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
                    <div className="w-3 h-3 rounded-full bg-[var(--color-hex-58)]"></div>
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--gray-900)]">Goal Completed</p>
                    <p className="text-sm text-[var(--text-secondary)]">
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
          <button className="flex-1 px-6 py-3 bg-[var(--color-hex-48)] text-white rounded-lg font-medium hover:bg-[var(--color-hex-101)] transition-all duration-200">
            Start Learning
          </button>
          <button
            onClick={() => navigate(-1)}
            className="flex-1 px-6 py-3 border border-[var(--gray-200)] text-[var(--gray-700)] rounded-lg font-medium hover:bg-[var(--color-hex-12)] transition-all duration-200"
          >
            Back
          </button>
        </div>
      </div>

      <style>{`
        .stat-box {
          padding: 1rem;
          background: var(--color-hex-12);
          border-radius: 0.5rem;
          border: 1px solid var(--gray-200);
        }
      `}</style>
    </Layout>
  )
}

export default GoalsDetailPage
