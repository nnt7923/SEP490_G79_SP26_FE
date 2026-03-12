import React, { useEffect, useState } from 'react'
import Layout from '../../../../components/Layout'
import { useMentorSidebarConfig } from '../components/MentorSideBar'
import { BookOpen, Search, Grid3x3, List, Loader2, Plus } from 'lucide-react'
import SubjectCard from './components/SubjectCard'
import SubjectListItem from './components/SubjectListItem'
import CreateSubjectModal from './components/CreateSubjectModal'
import Toast from '../../../../components/Toast'
import ConfirmDialog from '../../../../components/ConfirmDialog'
import { SubjectService } from '../../../../services'
import useAuthStore from '../../../../store/useAuthStore'
import type { Subject } from './types'
import { useTranslation } from 'react-i18next'

export type { Subject }

const SubjectsPage: React.FC = () => {
  const { user } = useAuthStore()
  const { t } = useTranslation('mentor')
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
      showToast(t('subjects.deleteSuccess'), 'success')
      fetchSubjects()
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || t('subjects.deleteFailed')
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
    showToast(isEdit ? t('subjects.updateSuccess') : t('subjects.createSuccess'), 'success')
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
      setError(err?.message || t('subjects.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const filteredSubjects = subjects.filter(subject =>
    subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    subject.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const sidebarConfig = {
    navItems: useMentorSidebarConfig(),
    actions: [],
    brand: { name: 'Subjects', subtitle: 'Mentor' },
  }

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="min-h-screen bg-[var(--gray-100)] px-4 py-8 font-mono">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="mb-6 border-b border-bd pb-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <BookOpen className="w-6 h-6 text-status-blue" />
                <div>
                  <h1 className="text-2xl font-bold text-heading border-none bg-transparent flex items-center">
                    {t('subjects.title')}
                  </h1>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-6 py-2 border border-blue-600 bg-status-blue-solid text-white font-bold hover:bg-status-blue-solid-hover transition-colors rounded-sm"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">{t('subjects.createSubject')}</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-th-card border border-bd-strong p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              {/* Search */}
              <div className="relative flex-1 w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                <input
                  type="text"
                  placeholder={t('subjects.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-bd-strong focus:outline-none focus:border-blue-600 transition-colors text-heading placeholder:text-placeholder font-mono"
                  aria-label="Search subjects"
                />
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 border transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-status-blue-solid text-white border-blue-600'
                      : 'bg-th-card text-muted border-bd-strong hover:bg-th-page'
                  }`}
                  aria-label="Grid view"
                  aria-pressed={viewMode === 'grid'}
                >
                  <Grid3x3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 border transition-colors ${
                    viewMode === 'list'
                      ? 'bg-status-blue-solid text-white border-blue-600'
                      : 'bg-th-card text-muted border-bd-strong hover:bg-th-page'
                  }`}
                  aria-label="List view"
                  aria-pressed={viewMode === 'list'}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Results Count */}
            <div className="mt-4 pt-4 border-t border-bd">
              <p className="text-sm font-bold text-muted">
               {t('subjects.showing', { filtered: filteredSubjects.length, total: subjects.length })}
              </p>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 text-[var(--blue-600)] animate-spin mb-4" />
              <p className="text-[var(--text-slate)] text-sm">{t('subjects.loading')}</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="bg-status-red-bg border border-red-500 p-6 text-center rounded-md">
              <p className="text-status-red-dark font-bold mb-2">{t('subjects.error')}</p>
              <p className="text-status-red text-sm font-mono">{error}</p>
              <button
                onClick={fetchSubjects}
                className="mt-4 px-6 py-2 border border-red-600 bg-th-card text-status-red font-bold hover:bg-status-red-bg transition-colors rounded-sm"
              >
                {t('subjects.retry')}
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filteredSubjects.length === 0 && (
            <div className="bg-th-card border border-bd-strong p-12 text-center rounded-md">
              <BookOpen className="w-12 h-12 text-disabled mx-auto mb-4" />
              <h3 className="text-lg font-bold text-heading mb-2">{t('subjects.noSubjectsFound')}</h3>
              <p className="text-sm text-muted font-mono">
                {searchQuery ? t('subjects.adjustSearch') : t('subjects.noSubjectsAvailable')}
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
        title={t('subjects.deleteSubject')}
        message={t('subjects.deleteConfirm', { name: subjectToDelete?.name })}
        confirmText={t('subjects.delete')}
        cancelText={t('dashboard.cancel')}
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
