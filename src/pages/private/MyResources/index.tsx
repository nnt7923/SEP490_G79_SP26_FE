
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../../../components/Layout'
import ResourceService from '../../../services/ResourceService'
import { getStudentSidebarConfig } from '../Student/components/StudentSideBar'
import { LogOut, Settings, HelpCircle, FileText, Calendar, Loader2, Plus, Trash2, Edit, Eye } from 'lucide-react'
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

  useEffect(() => {
    fetchResources()
  }, [])

  const fetchResources = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await ResourceService.getMyResources()
      
      // Handle paginated response
      let resourcesList: any[] = []
      
      if (data?.items) {
        // If items is nested array [[...]], flatten it
        if (Array.isArray(data.items) && data.items.length > 0 && Array.isArray(data.items[0])) {
          resourcesList = data.items.flat()
        } else if (Array.isArray(data.items)) {
          resourcesList = data.items
        }
      } else if (Array.isArray(data)) {
        resourcesList = data
      } else if (Array.isArray(data?.data)) {
        resourcesList = data.data
      } else if (Array.isArray(data?.value)) {
        resourcesList = data.value
      }
      
      setResources(resourcesList)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load resources')
      setResources([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSuccess = () => {
    fetchResources()
  }

  const handleEditSuccess = () => {
    fetchResources()
  }

  const showToast = (message: string, type: 'success' | 'error' | 'warning') => {
    setToast({ message, type })
  }

  const handleEdit = (resource: Resource) => {
    setSelectedResource(resource)
    setIsEditModalOpen(true)
  }

  const handleDownload = (resource: Resource) => {
    const downloadUrl = resource.filePath || resource.url
    if (downloadUrl) {
      // Open ResourcePageViewer for all resources
      setResourceToView(resource)
      setIsPageViewerOpen(true)
    } else {
      showToast('No download URL available', 'warning')
    }
  }

  const handleDelete = async (resource: Resource) => {
    setResourceToDelete(resource)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!resourceToDelete) return

    try {
      await ResourceService.deleteResource(resourceToDelete.resourceId)
      showToast('Resource deleted successfully!', 'success')
      fetchResources()
    } catch (err: any) {
      const errorMsg = 
        err?.response?.data?.message || 
        err?.response?.data?.msg ||
        err?.message ||
        'Failed to delete resource'
      showToast(errorMsg, 'error')
    } finally {
      setIsDeleteDialogOpen(false)
      setResourceToDelete(null)
    }
  }

  const cancelDelete = () => {
    setIsDeleteDialogOpen(false)
    setResourceToDelete(null)
  }

  const handleLogout = async () => {
    await logout()
    navigate(ROUTER.LOGIN)
  }

  const handleSettings = () => {
    navigate(ROUTER.PROFILE)
  }

  const sidebarConfig = {
    navItems: getStudentSidebarConfig(),
    actions: [
      {
        label: 'Settings',
        icon: <Settings className="w-5 h-5" />,
        onClick: handleSettings,
      },
      {
        label: 'Help',
        icon: <HelpCircle className="w-5 h-5" />,
        onClick: () => {},
      },
      {
        label: 'Logout',
        icon: <LogOut className="w-5 h-5" />,
        onClick: handleLogout,
        variant: 'danger' as const,
      },
    ],
    brand: {
      name: 'Dashboard',
      subtitle: 'Learning',
    },
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—'
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return '—'
    }
  }

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="px-4 md:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
              {ROUTER_META[ROUTER.MY_RESOURCES]?.title || 'My Resources'}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              View and manage your learning resources
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm transition-colors duration-200 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create Resource
            </button>
            <button
              onClick={() => navigate(ROUTER.STUDENT_DASHBOARD)}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors duration-200 cursor-pointer"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {!loading && !error && resources.length === 0 && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-12 text-center">
            <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
              No resources yet
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Your learning resources will appear here once they're added
            </p>
          </div>
        )}

        {!loading && !error && resources.length > 0 && (
          <div className="grid grid-cols-1 gap-4">
            {resources.map((resource, index) => (
              <div
                key={resource.resourceId || resource.id || `resource-${index}`}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-6 hover:border-blue-300 dark:hover:border-blue-700 transition-colors duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                        {resource.title}
                      </h3>
                      {resource.type && (
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                          {resource.type}
                        </span>
                      )}
                      {resource.subjectName && (
                        <span className="px-2 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded">
                          {resource.subjectName}
                        </span>
                      )}
                    </div>
                    {resource.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                        {resource.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-500">
                      {resource.createdAt && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(resource.createdAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 ml-4">
                    {/* View button for all resources */}
                    {(resource.filePath || resource.url) && (
                      <button
                        onClick={() => handleDownload(resource)}
                        className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer"
                        title="View document"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(resource)}
                      className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-orange-600 dark:hover:text-orange-400 transition-colors cursor-pointer"
                      title="Edit resource"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(resource)}
                      className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                      title="Delete resource"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Resource Modal */}
        <CreateResourceModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleCreateSuccess}
          onShowToast={showToast}
        />

        {/* Edit Resource Modal */}
        <EditResourceModal
          isOpen={isEditModalOpen}
          resource={selectedResource}
          onClose={() => {
            setIsEditModalOpen(false)
            setSelectedResource(null)
          }}
          onSuccess={handleEditSuccess}
          onShowToast={showToast}
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={isDeleteDialogOpen}
          title="Delete Resource"
          message={`Are you sure you want to delete "${resourceToDelete?.title}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />

        {/* Resource Page Viewer (for all file types with backend page processing) */}
        {resourceToView && (
          <ResourcePageViewer
            isOpen={isPageViewerOpen}
            resourceId={resourceToView.resourceId}
            fileName={resourceToView.originalFileName || resourceToView.title}
            onClose={() => {
              setIsPageViewerOpen(false)
              setResourceToView(null)
            }}
          />
        )}

        {/* Toast Notification */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </Layout>
  )
}

export default MyResourcesPage
