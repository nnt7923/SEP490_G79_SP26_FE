import React, { useEffect, useState } from 'react'
import Layout from '../../../../components/Layout'
import { getMentorSidebarConfig } from '../components/MentorSideBar'
import { BookOpen, Search, Grid3x3, List, Loader2, Plus } from 'lucide-react'
import SubjectCard from './components/SubjectCard'
import SubjectListItem from './components/SubjectListItem'
import CreateSubjectModal from './components/CreateSubjectModal'
import Toast from '../../../../components/Toast'
import ConfirmDialog from '../../../../components/ConfirmDialog'
import { SubjectService } from '../../../../services'
import useAuthStore from '../../../../store/useAuthStore'
import type { Subject } from './types'

export type { Subject }

const SubjectsPage: React.FC = () => {
  const { user } = useAuthStore()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null)
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null)

  const showToast = (message: string, type: 'success' | 'error' | 'warning') => {
    setToast({ message, type })
  }

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject)
    setShowCreateModal(true)
  }

  const handleDelete = (subject: Subject) => {
    setSubjectToDelete(subject)
  }

  const confirmDelete = async () => {
    if (!subjectToDelete) return

    try {
      await SubjectService.deleteSubject(subjectToDelete.subjectId)
      showToast('Subject deleted successfully!', 'success')
      fetchSubjects()
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || 'Failed to delete subject'
      showToast(errorMsg, 'error')
    } finally {
      setSubjectToDelete(null)
    }
  }

  const handleCloseModal = () => {
    setShowCreateModal(false)
    setEditingSubject(null)
  }

  const handleSuccess = (isEdit: boolean) => {
    showToast(isEdit ? 'Subject updated successfully!' : 'Subject created successfully!', 'success')
    fetchSubjects()
    setEditingSubject(null)
  }

  useEffect(() => {
    if (user) {
      fetchSubjects()
    }
  }, [user?.id]) // Re-fetch when user changes

  const fetchSubjects = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await SubjectService.listSubjects()

      const currentUserId = user?.id ? String(user.id) : null
      const firstName = user?.firstName || ''
      const lastName = user?.lastName || ''
      const fullName = `${firstName} ${lastName}`.trim()

      const mappedSubjects: Subject[] = data.map((s: any) => {
        let isMySubject = false
        if (s.createdByUserId && currentUserId) {
          isMySubject = String(s.createdByUserId) === currentUserId
        } else if (s.createdBy && fullName) {
          isMySubject = s.createdBy === fullName
        }

        return {
          subjectId: s.subjectId || s.id,
          name: s.name,
          description: s.description,
          color: s.color,
          icon: s.icon,
          createdBy: isMySubject ? 'Me' : (s.createdBy || 'Unknown'),
          createdByUserId: s.createdByUserId,
          createdAt: s.createdAt,
        }
      })

      setSubjects(mappedSubjects)
    } catch (err: any) {
      setError(err?.message || 'Unable to load subjects')
    } finally {
      setLoading(false)
    }
  }

  const filteredSubjects = subjects.filter(subject =>
    subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    subject.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const sidebarConfig = {
    navItems: getMentorSidebarConfig(),
    actions: [],
    brand: { name: 'Subjects', subtitle: 'Mentor' },
  }

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="min-h-screen bg-gradient-to-br from-[#F8FAFC] to-[#F1F5F9] px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#3B82F6] flex items-center justify-center shadow-lg">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-[#1E293B]">Subject Management</h1>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#2563EB] text-white rounded-lg hover:bg-[#1D4ED8] transition-colors shadow-md font-medium"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Create Subject</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              {/* Search */}
              <div className="relative flex-1 w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
                <input
                  type="text"
                  placeholder="Search subjects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all text-[#1E293B] placeholder:text-[#94A3B8]"
                  aria-label="Search subjects"
                />
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2.5 rounded-lg transition-all ${
                    viewMode === 'grid'
                      ? 'bg-[#2563EB] text-white shadow-md'
                      : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'
                  }`}
                  aria-label="Grid view"
                  aria-pressed={viewMode === 'grid'}
                >
                  <Grid3x3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2.5 rounded-lg transition-all ${
                    viewMode === 'list'
                      ? 'bg-[#2563EB] text-white shadow-md'
                      : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'
                  }`}
                  aria-label="List view"
                  aria-pressed={viewMode === 'list'}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Results Count */}
            <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
              <p className="text-sm text-[#64748B]">
                Showing <span className="font-semibold text-[#1E293B]">{filteredSubjects.length}</span> of{' '}
                <span className="font-semibold text-[#1E293B]">{subjects.length}</span> subjects
              </p>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 text-[#2563EB] animate-spin mb-4" />
              <p className="text-[#64748B] text-sm">Loading subjects...</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
              <p className="text-red-600 font-medium mb-2">Error</p>
              <p className="text-red-500 text-sm">{error}</p>
              <button
                onClick={fetchSubjects}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filteredSubjects.length === 0 && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 text-center">
              <BookOpen className="w-16 h-16 text-[#CBD5E1] mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-[#1E293B] mb-2">No subjects found</h3>
              <p className="text-sm text-[#64748B]">
                {searchQuery ? 'Try adjusting your search query' : 'No subjects available yet'}
              </p>
            </div>
          )}

          {/* Grid View */}
          {!loading && !error && viewMode === 'grid' && filteredSubjects.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSubjects.map((subject) => (
                <SubjectCard 
                  key={subject.subjectId} 
                  subject={subject} 
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}

          {/* List View */}
          {!loading && !error && viewMode === 'list' && filteredSubjects.length > 0 && (
            <div className="space-y-3">
              {filteredSubjects.map((subject) => (
                <SubjectListItem 
                  key={subject.subjectId} 
                  subject={subject} 
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Subject Modal */}
      <CreateSubjectModal
        isOpen={showCreateModal}
        onClose={handleCloseModal}
        onSuccess={() => handleSuccess(!!editingSubject)}
        editSubject={editingSubject}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!subjectToDelete}
        title="Delete Subject"
        message={`Are you sure you want to delete "${subjectToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setSubjectToDelete(null)}
      />

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </Layout>
  )
}

export default SubjectsPage
