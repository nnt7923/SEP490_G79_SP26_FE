import React, { useState, useEffect } from 'react'
import { X, Loader2, BookOpen } from 'lucide-react'
import { SubjectService } from '../../../services'
import type { Subject } from '../../../services/SubjectService'

interface CreateResourceModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  onShowToast: (message: string, type: 'success' | 'error') => void
}

const CreateResourceModal: React.FC<CreateResourceModalProps> = ({ isOpen, onClose, onSuccess, onShowToast }) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [subjectId, setSubjectId] = useState('')
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchSubjects()
      setError(null) // Reset error when modal opens
    }
  }, [isOpen])

  const fetchSubjects = async () => {
    try {
      setLoadingSubjects(true)
      const data = await SubjectService.listSubjects()
      setSubjects(data)
    } catch (err) {
      console.error('Failed to load subjects:', err)
    } finally {
      setLoadingSubjects(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!title.trim()) {
      setError('Title is required')
      return
    }

    if (!subjectId) {
      setError('Subject is required')
      return
    }

    if (!file) {
      setError('File is required')
      return
    }

    try {
      setLoading(true)

      const formData = new FormData()
      formData.append('Title', title)
      formData.append('Type', 'PDF')
      formData.append('Description', description)
      formData.append('SubjectId', subjectId)
      formData.append('File', file)

      const { ResourceService } = await import('../../../services')
      await ResourceService.createResource(formData)

      // Reset form
      setTitle('')
      setDescription('')
      setFile(null)
      setSubjectId('')
      
      // Show success toast
      onShowToast('Resource created successfully!', 'success')
      
      onSuccess()
      onClose()
    } catch (err: any) {
      
      const errorMsg = 
        err?.response?.data?.message || 
        err?.response?.data?.msg ||
        err?.response?.data?.title ||
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to create resource'
      
      onShowToast(errorMsg, 'error')
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setTitle('')
      setDescription('')
      setFile(null)
      setSubjectId('')
      setError(null)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-700 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Create New Resource
          </h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form - Scrollable */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Enter resource title"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Subject <span className="text-red-500">*</span>
            </label>
            {loadingSubjects ? (
              <div className="flex items-center justify-center py-2 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Loading subjects...
              </div>
            ) : (
              <div className="relative">
                <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  disabled={loading || loadingSubjects}
                  className="w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed appearance-none cursor-pointer"
                >
                  <option key="empty" value="">Select a subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              File <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="file"
                onChange={handleFileChange}
                disabled={loading}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-300 dark:hover:file:bg-blue-900/50 file:cursor-pointer cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            {file && (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
              Supported: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, ZIP, RAR
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
              placeholder="Enter resource description (optional)"
            />
          </div>
        </div>

          {/* Actions */}
          <div className="flex gap-3 p-6 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Resource'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateResourceModal
