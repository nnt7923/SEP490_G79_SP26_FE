import React, { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'

interface Resource {
  resourceId: string
  title: string
  description?: string
  url?: string
  filePath?: string
  type: string
  originalFilename?: string
}

interface EditResourceModalProps {
  isOpen: boolean
  resource: Resource | null
  onClose: () => void
  onSuccess: () => void
  onShowToast: (message: string, type: 'success' | 'error') => void
}

const EditResourceModal: React.FC<EditResourceModalProps> = ({ 
  isOpen, 
  resource, 
  onClose, 
  onSuccess, 
  onShowToast 
}) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (resource) {
      setTitle(resource.title || '')
      setDescription(resource.description || '')
      setUrl(resource.url || resource.filePath || '')
      setFile(null)
    }
  }, [resource])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!resource) return

    // Validation
    if (!title.trim()) {
      setError('Title is required')
      return
    }

    if (resource.type === 'Link' && !url.trim() && !file) {
      setError('URL is required for Link type')
      return
    }

    try {
      setLoading(true)

      const formData = new FormData()
      formData.append('Title', title)
      formData.append('Type', resource.type)
      formData.append('Description', description)

      if (resource.type === 'Link' && url) {
        formData.append('Url', url)
      } else if (file) {
        formData.append('File', file)
      }

      console.log('=== Update Resource Debug ===')
      console.log('ResourceId:', resource.resourceId)
      console.log('Title:', title)
      console.log('Description:', description)
      if (resource.type === 'Link') {
        console.log('Url:', url)
      }
      if (file) {
        console.log('New File:', file.name, file.type, file.size)
      }

      const { ResourceService } = await import('../../../services')
      await ResourceService.updateResource(resource.resourceId, formData)

      onShowToast('Resource updated successfully!', 'success')
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('=== Update Resource Error ===', err)
      
      const errorMsg = 
        err?.response?.data?.message || 
        err?.response?.data?.msg ||
        err?.response?.data?.title ||
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to update resource'
      
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
      setUrl('')
      setFile(null)
      setError(null)
      onClose()
    }
  }

  if (!isOpen || !resource) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Edit Resource
          </h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Type Badge (Read-only) */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">Type:</span>
            <span className="px-3 py-1 text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
              {resource.type}
            </span>
          </div>

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

          {/* URL (for Link type) or File Upload (for File type) */}
          {resource.type === 'Link' ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="https://example.com"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Replace File (Optional)
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
              {file ? (
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  New file: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              ) : resource.originalFilename ? (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-500">
                  Current: {resource.originalFilename}
                </p>
              ) : null}
            </div>
          )}

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

          {/* Actions */}
          <div className="flex gap-3 pt-4">
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
                  Updating...
                </>
              ) : (
                'Update Resource'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditResourceModal
