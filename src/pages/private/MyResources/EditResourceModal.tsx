import React, { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'

interface Resource {
  resourceId: string
  title: string
  description?: string
  url?: string
  filePath?: string
  type: string
  originalFileName?: string
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
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (resource) {
      setTitle(resource.title || '')
      setDescription(resource.description || '')
      setFile(null)
      setError(null)
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

    if (!title.trim()) {
      setError('Title is required')
      return
    }

    try {
      setLoading(true)

      const formData = new FormData()
      formData.append('Title', title)
      formData.append('Description', description)

      if (file) {
        formData.append('File', file)
      }

      const { ResourceService } = await import('../../../services')
      await ResourceService.updateResource(resource.resourceId, formData)

      onShowToast('Resource updated successfully!', 'success')
      onSuccess()
      onClose()
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.response?.data?.msg || err?.response?.data?.title || err?.response?.data?.detail || err?.message || 'Failed to update resource'
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
      setError(null)
      onClose()
    }
  }

  if (!isOpen || !resource) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
      <div style={{ background: 'var(--bg-surface-short)', border: '1px solid var(--border-base)', borderRadius: 2, maxWidth: 448, width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottom: '1px solid var(--border-base)', flexShrink: 0 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{'>'} Edit Resource</h2>
          <button onClick={handleClose} disabled={loading} style={{ background: 'none', border: 'none', fontSize: 16, color: 'var(--text-secondary)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div style={{ padding: 20, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && (
              <div style={{ border: '1px solid var(--danger-primary)', borderRadius: 2, padding: 12, color: 'var(--danger-primary)', fontSize: 13 }}>
                // error: {error}
              </div>
            )}

            {/* Title */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                $ title <span style={{ color: 'var(--danger-primary)' }}>*</span>
              </label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} disabled={loading} placeholder="resource title"
                style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s', opacity: loading ? 0.5 : 1 }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }} onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }} />
            </div>

            {/* File */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                $ replace file (optional)
              </label>
              <input type="file" onChange={handleFileChange} disabled={loading} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                style={{ width: '100%', padding: '4px 0', fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer', opacity: loading ? 0.5 : 1 }} />
              {file ? (
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '4px 0 0' }}>// new file: {file.name}</p>
              ) : resource.originalFileName ? (
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '4px 0 0' }}>// current file: {resource.originalFileName}</p>
              ) : null}
            </div>

            {/* Description */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
                $ description
              </label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={loading} placeholder="resource description (optional)" rows={3}
                style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s', resize: 'none', opacity: loading ? 0.5 : 1 }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }} onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }} />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, padding: 20, borderTop: '1px solid var(--border-base)', flexShrink: 0, background: 'var(--bg-main)' }}>
            <button type="button" onClick={handleClose} disabled={loading}
              style={{ flex: 1, padding: '8px 16px', border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-surface-short)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}
              onMouseEnter={(e) => { if(!loading) e.currentTarget.style.background = 'var(--gray-100)' }} onMouseLeave={(e) => { if(!loading) e.currentTarget.style.background = 'var(--bg-surface-short)' }}>
              cancel
            </button>
            <button type="submit" disabled={loading}
              style={{ flex: 1, padding: '8px 16px', background: loading ? 'var(--text-secondary)' : 'var(--text-primary)', color: 'var(--bg-surface-short)', border: 'none', borderRadius: 2, fontSize: 12, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.2s' }}
              onMouseEnter={(e) => { if(!loading) e.currentTarget.style.background = 'var(--text-strong)' }} onMouseLeave={(e) => { if(!loading) e.currentTarget.style.background = 'var(--text-primary)' }}>
              {loading && <Loader2 size={14} className="animate-spin" />}
              {'>'} {loading ? 'updating...' : 'update resource'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditResourceModal
