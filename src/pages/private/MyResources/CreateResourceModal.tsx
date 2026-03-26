import React, { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import { SubjectService, LearningPathService } from '../../../services'
import type { Subject } from '../../../services/SubjectService'
import useNotificationStore from '../../../store/useNotificationStore'
import useAuthStore from '../../../store/useAuthStore'

interface CreateResourceModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  onUploadStart?: (tempResource: any) => void
  onUploadProgress?: (uploadId: string, progress: number) => void
  onShowToast?: (message: string, type: 'success' | 'error') => void
  onShowProgressToast?: (message: string, progress: number, status: 'loading' | 'success' | 'error') => void
}

const CreateResourceModal: React.FC<CreateResourceModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  onUploadStart,
  onUploadProgress,
  onShowToast, 
  onShowProgressToast 
}) => {
  const { showProgress, hideProgress } = useNotificationStore()
  const { user } = useAuthStore()
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
      setError(null)
    }
  }, [isOpen])

  const fetchSubjects = async () => {
    if (!user?.id) return
    
    try {
      setLoadingSubjects(true)
      
      // Get user's learning paths to extract subjects
      const learningPaths = await LearningPathService.getUserLearningPaths(user.id, {
        pageNumber: 1,
        pageSize: 100, // Get all learning paths
      })
      
      // Extract unique subject IDs from learning paths
      const subjectIds = new Set<string>()
      learningPaths.items.forEach(path => {
        // Try different possible field names for subjectId
        const subjectId = path.subjectId || path.SubjectId || (path as any).subject?.id || (path as any).Subject?.id
        if (subjectId) {
          subjectIds.add(subjectId)
        }
      })
      
      if (subjectIds.size === 0) {
        // If no subjects found in learning paths, show empty list with message
        setSubjects([])
        return
      }
      
      // Get all subjects and filter by the ones used in learning paths
      const allSubjects = await SubjectService.listSubjects()
      const filteredSubjects = allSubjects.filter(subject => 
        subjectIds.has(subject.id)
      )
      
      setSubjects(filteredSubjects)
    } catch (err) {
      // silently ignore
      setSubjects([])
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

    if (!title.trim()) { setError('Title is required'); return }
    if (subjects.length === 0) { setError('No subjects available. Create a learning path first.'); return }
    if (!subjectId) { setError('Subject is required'); return }
    if (!file) { setError('File is required'); return }

    try {
      setLoading(true)

      const formData = new FormData()
      formData.append('Title', title)
      formData.append('Description', description)
      formData.append('SubjectId', subjectId)
      formData.append('File', file)

      const formDataToUpload = formData
      const uploadId = `upload-${Date.now()}`
      const selectedSubject = subjects.find(s => s.id === subjectId)

      const tempResource = {
        id: Date.now(),
        resourceId: uploadId,
        title: title,
        description: description,
        type: file.name.split('.').pop()?.toUpperCase() || 'FILE',
        originalFileName: file.name,
        subjectName: selectedSubject?.name,
        createdAt: new Date().toISOString(),
        uploading: true,
        uploadProgress: 0
      }

      setTitle('')
      setDescription('')
      setFile(null)
      setSubjectId('')
      setLoading(false)
      onClose()

      if (onUploadStart) onUploadStart(tempResource)
      showProgress(uploadId, 'Loading file...', 0, 'loading')
      setTimeout(() => hideProgress(uploadId), 1500)

      const { ResourceService } = await import('../../../services')
      
      await ResourceService.createResource(formDataToUpload, (progressEvent: any) => {
        const progress = Math.min((progressEvent.percent || 0), 100)
        if (onUploadProgress) onUploadProgress(uploadId, progress)
      })

      await new Promise(resolve => setTimeout(resolve, 300))
      showProgress(uploadId, 'Resource uploaded successfully!', 100, 'success')
      onSuccess()
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.response?.data?.msg || err?.response?.data?.title || err?.response?.data?.detail || err?.message || 'Failed to create resource'
      const uploadId = `upload-${Date.now()}`
      showProgress(uploadId, errorMsg, 0, 'error')
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
    <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
      <div style={{ background: 'var(--bg-surface-short)', border: '1px solid var(--border-base)', borderRadius: 0, maxWidth: 448, width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottom: '1px solid var(--border-base)', flexShrink: 0 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{'>'} Create New Resource</h2>
          <button onClick={handleClose} disabled={loading} style={{ background: 'none', border: 'none', fontSize: 16, color: 'var(--text-secondary)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div style={{ padding: 20, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && (
              <div style={{ border: '1px solid var(--danger-primary)', borderRadius: 0, padding: 12, color: 'var(--danger-primary)', fontSize: 13 }}>
                // error: {error}
              </div>
            )}

            {/* Title */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                $ title <span style={{ color: 'var(--danger-primary)' }}>*</span>
              </label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} disabled={loading} placeholder="resource title"
                style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid var(--border-base)', borderRadius: 0, background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s', opacity: loading ? 0.5 : 1 }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }} onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }} />
            </div>

            {/* Subject */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                $ subject <span style={{ color: 'var(--danger-primary)' }}>*</span>
              </label>
              {loadingSubjects ? (
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>// loading subjects...</div>
              ) : subjects.length === 0 ? (
                <div style={{ 
                  padding: '12px', 
                  border: '1px dashed var(--border-base)', 
                  borderRadius: 0, 
                  background: 'var(--bg-main)',
                  fontSize: 13, 
                  color: 'var(--text-secondary)',
                  textAlign: 'center'
                }}>
                  // no subjects available<br/>
                  <span style={{ fontSize: 11 }}>create a learning path first to upload resources</span>
                </div>
              ) : (
                <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} disabled={loading || loadingSubjects}
                  style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid var(--border-base)', borderRadius: 0, background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}>
                  <option value="">select a subject...</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
            </div>

            {/* File */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                $ file <span style={{ color: 'var(--danger-primary)' }}>*</span>
              </label>
              <input type="file" onChange={handleFileChange} disabled={loading} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                style={{ width: '100%', padding: '4px 0', fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer', opacity: loading ? 0.5 : 1 }} />
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '4px 0 0' }}>// supported: pdf, doc, xls, ppt, txt, zip, rar</p>
            </div>

            {/* Description */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                $ description
              </label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={loading} placeholder="resource description (optional)" rows={3}
                style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid var(--border-base)', borderRadius: 0, background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s', resize: 'none', opacity: loading ? 0.5 : 1 }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }} onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }} />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, padding: 20, borderTop: '1px solid var(--border-base)', flexShrink: 0, background: 'var(--bg-main)' }}>
            <button type="button" onClick={handleClose} disabled={loading}
              style={{ flex: 1, padding: '8px 16px', border: '1px solid var(--border-base)', borderRadius: 0, background: 'var(--bg-surface-short)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}
              onMouseEnter={(e) => { if(!loading) e.currentTarget.style.background = 'var(--gray-100)' }} onMouseLeave={(e) => { if(!loading) e.currentTarget.style.background = 'var(--bg-surface-short)' }}>
              cancel
            </button>
            <button type="submit" disabled={loading}
              style={{ flex: 1, padding: '8px 16px', background: loading ? 'var(--text-secondary)' : 'var(--text-primary)', color: 'var(--bg-surface-short)', border: 'none', borderRadius: 0, fontSize: 12, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.2s' }}
              onMouseEnter={(e) => { if(!loading) e.currentTarget.style.background = 'var(--text-strong)' }} onMouseLeave={(e) => { if(!loading) e.currentTarget.style.background = 'var(--text-primary)' }}>
              {loading && <Loader2 size={14} className="animate-spin" />}
              {'>'} {loading ? 'creating...' : 'create resource'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateResourceModal
