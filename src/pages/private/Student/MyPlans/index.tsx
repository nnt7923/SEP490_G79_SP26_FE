
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../../../components/Layout'
import { getStudentSidebarConfig } from '../components/StudentSideBar'
import LearningPathService, { type SkeletonResponse } from '../../../../services/LearningPathService'
import useAuthStore from '../../../../store/useAuthStore'
import { Search, ChevronRight, Loader, AlertCircle, BookOpen } from 'lucide-react'

const MyPlansPage: React.FC = () => {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [plans, setPlans] = useState<SkeletonResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize] = useState(10)
  const [totalCount, setTotalCount] = useState(0)

  const sidebarConfig = {
    navItems: getStudentSidebarConfig(),
    actions: [],
    brand: { name: 'My Plans', subtitle: 'Learning' },
  }

  useEffect(() => {
    fetchPlans()
  }, [pageNumber, searchTerm])

  const fetchPlans = async () => {
    if (!user?.id) return
    
    setLoading(true)
    setError(null)
    try {
      const response = await LearningPathService.getUserLearningPaths(user.id, {
        pageNumber,
        pageSize,
        searchTerm: searchTerm || undefined,
      })
      setPlans(response.items)
      setTotalCount(response.totalCount)
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to load learning paths'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const filteredPlans = plans.filter(plan => {
    const q = searchTerm.toLowerCase()
    return (plan?.title || '').toLowerCase().includes(q) || 
           (plan?.description || '').toLowerCase().includes(q)
  })

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="px-6 py-8 bg-gradient-to-br from-[#f9fafb] to-[#f3f4f6] min-h-screen">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#111827] mb-2">My Learning Plans</h1>
          <p className="text-[#6b7280]">View and manage your personalized learning paths</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#9ca3af] w-5 h-5" />
            <input
              type="text"
              placeholder="Search learning paths..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPageNumber(1)
              }}
              className="w-full pl-10 pr-4 py-3 border border-[#e5e7eb] rounded-lg bg-white text-[#111827] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#2f80ed] focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-6">
          {/* Plans List */}
          <div>
            {loading ? (
              <div className="bg-white rounded-lg border border-[#e5e7eb] p-8 flex items-center justify-center">
                <div className="text-center">
                  <Loader className="w-8 h-8 text-[#2f80ed] animate-spin mx-auto mb-3" />
                  <p className="text-[#6b7280]">Loading your learning paths...</p>
                </div>
              </div>
            ) : error ? (
              <div className="bg-white rounded-lg border border-[#e5e7eb] p-8">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-[#ef4444] flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-[#111827]">Error loading plans</h3>
                    <p className="text-sm text-[#6b7280] mt-1">{error}</p>
                  </div>
                </div>
              </div>
            ) : filteredPlans.length === 0 ? (
              <div className="bg-white rounded-lg border border-[#e5e7eb] p-12 text-center">
                <BookOpen className="w-12 h-12 text-[#d1d5db] mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[#111827] mb-2">No learning paths yet</h3>
                <p className="text-[#6b7280]">
                  {searchTerm ? 'No plans match your search.' : 'Start creating your first learning path!'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPlans.map((plan) => (
                  <div
                    key={plan.pathId || plan.id}
                    onClick={() => navigate(`/my-plans/${plan.pathId || plan.id}`)}
                    className={`bg-white rounded-lg border-2 p-4 cursor-pointer transition-all duration-200 border-[#e5e7eb] hover:border-[#d1d5db] hover:shadow-sm`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-[#111827] text-lg mb-1">{plan.title || 'Untitled Plan'}</h3>
                        <p className="text-sm text-[#6b7280] line-clamp-2">{plan.description || 'No description'}</p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-[#9ca3af]">
                          <span>📚 {plan.chapterCount || plan.chapters?.length || 0} chapters</span>
                          <span>📝 {plan.lessons?.length || 0} lessons</span>
                          {plan.createdAt && <span>📅 {new Date(plan.createdAt).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[#d1d5db] flex-shrink-0 ml-2" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <button
                  onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                  disabled={pageNumber === 1}
                  className="px-4 py-2 border border-[#e5e7eb] rounded-lg text-sm font-medium text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                <span className="text-sm text-[#6b7280]">
                  Page {pageNumber} of {totalPages}
                </span>
                <button
                  onClick={() => setPageNumber(Math.min(totalPages, pageNumber + 1))}
                  disabled={pageNumber === totalPages}
                  className="px-4 py-2 border border-[#e5e7eb] rounded-lg text-sm font-medium text-[#374151] hover:bg-[#f9fafb] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default MyPlansPage
