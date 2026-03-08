
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../../components/Layout'
import ResourceService from '../../../services/ResourceService'
import { getStudentSidebarConfig } from '../Student/components/StudentSideBar'
import { LogOut } from 'lucide-react'
import useAuthStore from '../../../store/useAuthStore'
// @ts-ignore - JS module without types
import ROUTER from '../../../router/ROUTER'
// @ts-ignore - JS module without types
import ROUTER_META from '../../../router/ROUTER_META'
import CreateResourceModal from './CreateResourceModal'
import EditResourceModal from './EditResourceModal'
import Toast from '../../../components/Toast'
import ConfirmDialog from '../../../components/ConfirmDialog'
import ResourcePageViewer from '../../../components/ResourcePageViewer'

interface Resource {
  id: number
  resourceId: string
  title: string
  description?: string
  url?: string
  filePath?: string
  originalFileName?: string
  type: string
  createdAt?: string
  updatedAt?: string
  subjectName?: string
  uploading?: boolean
  uploadProgress?: number
}

const MyResourcesPage: React.FC = () => {
  const { logout } = useAuthStore()
  const navigate = useNavigate()
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isPageViewerOpen, setIsPageViewerOpen] = useState(false)
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null)
  const [resourceToDelete, setResourceToDelete] = useState<Resource | null>(null)
  const [resourceToView, setResourceToView] = useState<Resource | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('UploadedAt')
  const [sortDescending, setSortDescending] = useState(true)

  useEffect(() => { fetchResources() }, [searchTerm, sortBy, sortDescending])

  const fetchResources = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await ResourceService.getMyResources({ SearchTerm: searchTerm || undefined, SortBy: sortBy, SortDescending: sortDescending })
      let resourcesList: any[] = []
      if (data?.items) {
        if (Array.isArray(data.items) && data.items.length > 0 && Array.isArray(data.items[0])) resourcesList = data.items.flat()
        else if (Array.isArray(data.items)) resourcesList = data.items
      } else if (Array.isArray(data)) resourcesList = data
      else if (Array.isArray(data?.data)) resourcesList = data.data
      else if (Array.isArray(data?.value)) resourcesList = data.value
      setResources(resourcesList)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load resources')
      setResources([])
    } finally { setLoading(false) }
  }

  const handleCreateSuccess = () => { fetchResources() }
  const handleUploadStart = (tempResource: Resource) => { setResources(prev => [tempResource, ...prev]) }
  const handleUploadProgress = (uploadId: string, progress: number) => {
    setResources(prev => prev.map(r => r.resourceId === uploadId ? { ...r, uploadProgress: progress } : r))
  }
  const handleEditSuccess = () => { fetchResources() }
  const showToast = (message: string, type: 'success' | 'error' | 'warning') => { setToast({ message, type }) }
  const handleEdit = (resource: Resource) => { setSelectedResource(resource); setIsEditModalOpen(true) }
  const handleDownload = (resource: Resource) => {
    if (resource.filePath || resource.url) { setResourceToView(resource); setIsPageViewerOpen(true) }
    else showToast('No download URL available', 'warning')
  }
  const handleDelete = (resource: Resource) => { setResourceToDelete(resource); setIsDeleteDialogOpen(true) }
  const confirmDelete = async () => {
    if (!resourceToDelete) return
    try { await ResourceService.deleteResource(resourceToDelete.resourceId); showToast('Resource deleted successfully!', 'success'); fetchResources() }
    catch (err: any) { showToast(err?.response?.data?.message || err?.message || 'Failed to delete resource', 'error') }
    finally { setIsDeleteDialogOpen(false); setResourceToDelete(null) }
  }
  const cancelDelete = () => { setIsDeleteDialogOpen(false); setResourceToDelete(null) }
  const handleLogout = async () => { await logout(); navigate(ROUTER.LOGIN) }

  const sidebarConfig = {
    navItems: getStudentSidebarConfig(),
    actions: [{ label: 'Logout', icon: <LogOut className="w-5 h-5" />, onClick: handleLogout, variant: 'danger' as const }],
    brand: { name: 'Dashboard', subtitle: 'Learning' },
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—'
    try { return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) }
    catch { return '—' }
  }

  return (
    <Layout sidebar={sidebarConfig}>
      <div style={{ padding: '24px', background: 'var(--bg-surface)', minHeight: '100vh' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>// {ROUTER_META[ROUTER.MY_RESOURCES]?.title || 'My Resources'}</h1>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 0' }}>View and manage your learning resources</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setIsModalOpen(true)} style={{ padding: '6px 14px', background: 'var(--text-primary)', color: 'var(--bg-surface-short)', border: '1px solid var(--text-primary)', borderRadius: 2, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {'>'} create
            </button>
            <button onClick={() => navigate(ROUTER.STUDENT_DASHBOARD)} style={{ padding: '6px 14px', background: 'var(--bg-surface-short)', color: 'var(--text-primary)', border: '1px solid var(--border-base)', borderRadius: 2, fontSize: 12, cursor: 'pointer' }}>
              back
            </button>
          </div>
        </div>

        {/* Search & Sort */}
        <div style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>$ search</label>
              <input type="text" placeholder="search by title or description..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' as const, transition: 'border-color 0.2s' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)' }} onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)' }}
              />
            </div>
            <div style={{ minWidth: 140 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>$ sort by</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-main)', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}>
                <option value="UploadedAt">uploaded date</option>
                <option value="Title">title</option>
              </select>
            </div>
            <div style={{ minWidth: 100 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>$ order</label>
              <div style={{ display: 'flex', border: '1px solid var(--border-base)', borderRadius: 2, overflow: 'hidden' }}>
                <button onClick={() => setSortDescending(false)}
                  style={{ flex: 1, padding: '8px 12px', fontSize: 12, border: 'none', cursor: 'pointer', background: !sortDescending ? 'var(--text-primary)' : 'var(--bg-main)', color: !sortDescending ? 'var(--bg-surface-short)' : 'var(--text-secondary)', transition: 'all 0.2s' }}>
                  asc
                </button>
                <button onClick={() => setSortDescending(true)}
                  style={{ flex: 1, padding: '8px 12px', fontSize: 12, border: 'none', borderLeft: '1px solid var(--border-base)', cursor: 'pointer', background: sortDescending ? 'var(--text-primary)' : 'var(--bg-main)', color: sortDescending ? 'var(--bg-surface-short)' : 'var(--text-secondary)', transition: 'all 0.2s' }}>
                  desc
                </button>
              </div>
            </div>
          </div>
          {!loading && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--gray-200)' }}>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>
                {resources.length === 0 ? '// no resources found' : `// showing ${resources.length} ${resources.length === 1 ? 'resource' : 'resources'}`}
              </p>
            </div>
          )}
        </div>

        {/* Content */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-secondary)', fontSize: 13 }}>// loading resources...</div>
        )}
        {error && (
          <div style={{ border: '1px solid var(--danger-primary)', borderRadius: 2, padding: 16, marginBottom: 20, color: 'var(--danger-primary)', fontSize: 13 }}>// ERROR: {error}</div>
        )}
        {!loading && !error && resources.length === 0 && (
          <div style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 48, textAlign: 'center' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>// No resources yet</p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Your learning resources will appear here once they're added</p>
          </div>
        )}
        {!loading && !error && resources.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {resources.map((resource, index) => (
              <div key={resource.resourceId || resource.id || `resource-${index}`}
                style={{ border: `1px solid ${resource.uploading ? 'var(--accent-primary)' : 'var(--border-base)'}`, borderRadius: 2, padding: 16, transition: 'border-color 0.2s', background: resource.uploading ? 'var(--bg-blue-hover)' : 'var(--bg-surface-short)' }}
                onMouseEnter={(e) => { if (!resource.uploading) e.currentTarget.style.borderColor = 'var(--accent-primary)' }}
                onMouseLeave={(e) => { if (!resource.uploading) e.currentTarget.style.borderColor = 'var(--border-base)' }}
              >
                <div style={{ display: 'flex', alignItems: 'start', gap: 12 }}>
                  <span style={{ flexShrink: 0, fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, minWidth: 24, textAlign: 'right' }}>{String(index + 1).padStart(2, '0')}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{resource.title}</h3>
                      {resource.type && <span style={{ fontSize: 11, padding: '1px 6px', border: '1px solid var(--border-base)', borderRadius: 2, color: 'var(--text-secondary)' }}>{resource.type}</span>}
                      {resource.subjectName && <span style={{ fontSize: 11, padding: '1px 6px', border: '1px solid var(--border-base)', borderRadius: 2, color: 'var(--text-secondary)' }}>{resource.subjectName}</span>}
                      {resource.uploading && <span style={{ fontSize: 11, color: 'var(--accent-primary)' }}>uploading...</span>}
                    </div>
                    {resource.description && <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 4px' }}>{resource.description}</p>}
                    {!resource.uploading && resource.createdAt && <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>{formatDate(resource.createdAt)}</span>}
                  </div>
                  {!resource.uploading && (
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      {(resource.filePath || resource.url) && (
                        <button onClick={() => handleDownload(resource)} title="View" style={{ padding: '4px 8px', border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-surface-short)', color: 'var(--text-secondary)', fontSize: 11, cursor: 'pointer', transition: 'border-color 0.2s' }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.color = 'var(--accent-primary)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
                          view
                        </button>
                      )}
                      <button onClick={() => handleEdit(resource)} title="Edit" style={{ padding: '4px 8px', border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-surface-short)', color: 'var(--text-secondary)', fontSize: 11, cursor: 'pointer', transition: 'border-color 0.2s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.color = 'var(--accent-primary)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
                        edit
                      </button>
                      <button onClick={() => handleDelete(resource)} title="Delete" style={{ padding: '4px 8px', border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-surface-short)', color: 'var(--text-secondary)', fontSize: 11, cursor: 'pointer', transition: 'border-color 0.2s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--danger-primary)'; e.currentTarget.style.color = 'var(--danger-primary)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-base)'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
                        del
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <CreateResourceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={handleCreateSuccess} onUploadStart={handleUploadStart} onUploadProgress={handleUploadProgress} />
        <EditResourceModal isOpen={isEditModalOpen} resource={selectedResource} onClose={() => { setIsEditModalOpen(false); setSelectedResource(null) }} onSuccess={handleEditSuccess} onShowToast={showToast} />
        <ConfirmDialog isOpen={isDeleteDialogOpen} title="Delete Resource" message={`Are you sure you want to delete "${resourceToDelete?.title}"? This action cannot be undone.`} confirmText="Delete" cancelText="Cancel" variant="danger" onConfirm={confirmDelete} onCancel={cancelDelete} />
        {resourceToView && (
          <ResourcePageViewer isOpen={isPageViewerOpen} resourceId={resourceToView.resourceId} fileName={resourceToView.originalFileName || resourceToView.title} onClose={() => { setIsPageViewerOpen(false); setResourceToView(null) }} />
        )}
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    </Layout>
  )
}

export default MyResourcesPage
