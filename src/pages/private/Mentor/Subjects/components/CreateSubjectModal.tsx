import React, { useState, useRef, useEffect } from 'react'
import {
  X,
  Loader2,
  Code2,
  Database,
  Server,
  Cloud,
  Smartphone,
  Monitor,
  Terminal,
  GitBranch,
  Package,
  Boxes,
  Braces,
  FileCode,
  FileJson,
  Globe,
  Layout,
  Layers,
  Component,
  Cpu,
  Zap,
  Lock,
  Shield,
  Bug,
  TestTube,
  Workflow,
  Network,
  Container,
  Rocket,
  Settings,
  Wrench,
  Hammer,
  Binary,
  CircuitBoard,
  HardDrive,
  MemoryStick,
  Blocks,
  Box,
  Puzzle,
  Sparkles,
  ChevronDown,
} from 'lucide-react'

interface CreateSubjectModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  editSubject?: Subject | null
}

interface Subject {
  subjectId: string
  name: string
  description?: string
  color?: string
  icon?: string | null
  createdBy?: string
  createdByUserId?: string
  createdAt?: string
}

const PRESET_COLORS = [
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#F59E0B',
  '#10B981',
  '#06B6D4',
  '#EF4444',
  '#F97316',
  '#6366F1',
  '#A855F7',
  '#DB2777',
  '#D97706',
  '#059669',
  '#0891B2',
  '#DC2626',
  '#EA580C',
  '#4F46E5',
  '#9333EA',
  '#BE185D',
  '#CA8A04',
  '#047857',
  '#0E7490',
  '#B91C1C',
  '#C2410C',
]

const SUBJECT_ICONS = [
  { name: 'Code', icon: Code2, emoji: '💻', category: 'Languages' },
  { name: 'JavaScript', icon: FileCode, emoji: '📜', category: 'Languages' },
  { name: 'TypeScript', icon: FileJson, emoji: '📘', category: 'Languages' },
  { name: 'Python', icon: Terminal, emoji: '🐍', category: 'Languages' },
  { name: 'Java', icon: Braces, emoji: '☕', category: 'Languages' },
  { name: 'C/C++', icon: Binary, emoji: '⚙️', category: 'Languages' },
  { name: 'C#', icon: Box, emoji: '🔷', category: 'Languages' },
  { name: 'Go', icon: Zap, emoji: '🔵', category: 'Languages' },
  { name: 'Rust', icon: Settings, emoji: '🦀', category: 'Languages' },
  { name: 'PHP', icon: Globe, emoji: '🐘', category: 'Languages' },
  { name: 'Ruby', icon: Sparkles, emoji: '💎', category: 'Languages' },
  { name: 'Swift', icon: Rocket, emoji: '🚀', category: 'Languages' },
  { name: 'HTML/CSS', icon: Layout, emoji: '🎨', category: 'Frontend' },
  { name: 'React', icon: Component, emoji: '⚛️', category: 'Frontend' },
  { name: 'Vue', icon: Layers, emoji: '💚', category: 'Frontend' },
  { name: 'Angular', icon: Boxes, emoji: '🅰️', category: 'Frontend' },
  { name: 'UI/UX', icon: Monitor, emoji: '🖥️', category: 'Frontend' },
  { name: 'Responsive Design', icon: Smartphone, emoji: '📱', category: 'Frontend' },
  { name: 'Node.js', icon: Server, emoji: '🟢', category: 'Backend' },
  { name: 'Database', icon: Database, emoji: '🗄️', category: 'Backend' },
  { name: 'SQL', icon: HardDrive, emoji: '📊', category: 'Backend' },
  { name: 'NoSQL', icon: MemoryStick, emoji: '🍃', category: 'Backend' },
  { name: 'API', icon: Network, emoji: '🔌', category: 'Backend' },
  { name: 'GraphQL', icon: Workflow, emoji: '📡', category: 'Backend' },
  { name: 'Microservices', icon: Puzzle, emoji: '🧩', category: 'Backend' },
  { name: 'Git', icon: GitBranch, emoji: '🌿', category: 'DevOps' },
  { name: 'Docker', icon: Container, emoji: '🐳', category: 'DevOps' },
  { name: 'Cloud', icon: Cloud, emoji: '☁️', category: 'DevOps' },
  { name: 'CI/CD', icon: Workflow, emoji: '🔄', category: 'DevOps' },
  { name: 'Testing', icon: TestTube, emoji: '🧪', category: 'DevOps' },
  { name: 'Debugging', icon: Bug, emoji: '🐛', category: 'DevOps' },
  { name: 'Security', icon: Lock, emoji: '🔒', category: 'Security' },
  { name: 'Authentication', icon: Shield, emoji: '🛡️', category: 'Security' },
  { name: 'System Design', icon: CircuitBoard, emoji: '🏗️', category: 'Architecture' },
  { name: 'Algorithms', icon: Blocks, emoji: '🧮', category: 'Architecture' },
  { name: 'Data Structures', icon: Cpu, emoji: '📦', category: 'Architecture' },
  { name: 'Package Manager', icon: Package, emoji: '📦', category: 'Tools' },
  { name: 'Build Tools', icon: Hammer, emoji: '🔨', category: 'Tools' },
  { name: 'Configuration', icon: Wrench, emoji: '🔧', category: 'Tools' },
]

const QUICK_PRESET_ICONS = [
  SUBJECT_ICONS[0],
  SUBJECT_ICONS[1],
  SUBJECT_ICONS[2],
  SUBJECT_ICONS[3],
  SUBJECT_ICONS[12],
  SUBJECT_ICONS[13],
  SUBJECT_ICONS[18],
  SUBJECT_ICONS[19],
]

const CreateSubjectModal: React.FC<CreateSubjectModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editSubject = null,
}) => {
  const isEditMode = !!editSubject
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: PRESET_COLORS[0],
    icon: SUBJECT_ICONS[0].emoji,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [showIconPicker, setShowIconPicker] = useState(false)
  const iconPickerRef = useRef<HTMLDivElement>(null)

  // Load edit data when editSubject changes
  useEffect(() => {
    if (editSubject) {
      setFormData({
        name: editSubject.name || '',
        description: editSubject.description || '',
        color: editSubject.color || PRESET_COLORS[0],
        icon: editSubject.icon || SUBJECT_ICONS[0].emoji,
      })
    } else {
      setFormData({
        name: '',
        description: '',
        color: PRESET_COLORS[0],
        icon: SUBJECT_ICONS[0].emoji,
      })
    }
  }, [editSubject])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (iconPickerRef.current && !iconPickerRef.current.contains(event.target as Node)) {
        setShowIconPicker(false)
      }
    }

    if (showIconPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showIconPicker])

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Subject name is required'
    } else if (formData.name.length < 3) {
      newErrors.name = 'Name must be at least 3 characters'
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    setLoading(true)
    try {
      const { SubjectService } = await import('../../../../../services')
      
      if (isEditMode && editSubject) {
        await SubjectService.updateSubject(editSubject.subjectId, formData)
      } else {
        await SubjectService.createSubject(formData)
      }

      setFormData({
        name: '',
        description: '',
        color: PRESET_COLORS[0],
        icon: SUBJECT_ICONS[0].emoji,
      })
      setErrors({})
      setShowIconPicker(false)

      onSuccess()
      onClose()
    } catch (error: any) {
      setErrors({ submit: error?.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} subject` })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setFormData({
        name: '',
        description: '',
        color: PRESET_COLORS[0],
        icon: SUBJECT_ICONS[0].emoji,
      })
      setErrors({})
      setShowIconPicker(false)
      onClose()
    }
  }

  const handleIconSelect = (emoji: string) => {
    setFormData({ ...formData, icon: emoji })
    setShowIconPicker(false)
  }

  const getSelectedIcon = () => {
    return SUBJECT_ICONS.find((i) => i.emoji === formData.icon) || SUBJECT_ICONS[0]
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10 shadow-sm">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">
              {isEditMode ? 'Edit Subject' : 'Create New Subject'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {isEditMode ? 'Update subject information' : 'Add a new subject to your teaching portfolio'}
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Subject Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., JavaScript & TypeScript"
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                errors.name
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              disabled={loading}
            />
            {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of what this subject covers..."
              rows={4}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all resize-none ${
                errors.description
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              disabled={loading}
            />
            <div className="flex items-center justify-between mt-1">
              {errors.description && <p className="text-sm text-red-600">{errors.description}</p>}
              <p className="text-xs text-gray-500 ml-auto">{formData.description.length}/500</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">Color Theme</label>

            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-24 h-24 rounded-xl border-2 border-gray-200 cursor-pointer"
                  disabled={loading}
                />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700 mb-1">Selected Color</p>
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#3B82F6"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Click the color box or enter a hex code
                </p>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs font-medium text-gray-600 mb-2">Quick Presets</p>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.slice(0, 12).map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    disabled={loading}
                    className="w-10 h-10 rounded-lg border-2 border-gray-200 hover:border-gray-400 transition-colors"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">Icon</label>

            <div className="relative" ref={iconPickerRef}>
              <button
                type="button"
                onClick={() => setShowIconPicker(!showIconPicker)}
                disabled={loading}
                className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors bg-white"
              >
                <div className="flex items-center gap-3">
                  {(() => {
                    const selectedIcon = getSelectedIcon()
                    const IconComponent = selectedIcon.icon
                    return (
                      <>
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <IconComponent className="w-5 h-5 text-gray-700" strokeWidth={2} />
                        </div>
                        <span className="text-sm text-gray-700">{selectedIcon.name}</span>
                      </>
                    )
                  })()}
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 transition-transform ${showIconPicker ? 'rotate-180' : ''}`}
                />
              </button>

              {showIconPicker && (
                <div className="absolute z-10 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-lg p-4 max-h-96 overflow-y-auto">
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-600 mb-2">Quick Presets</p>
                    <div className="grid grid-cols-8 gap-2">
                      {QUICK_PRESET_ICONS.map((iconItem) => {
                        const IconComponent = iconItem.icon
                        const isSelected = formData.icon === iconItem.emoji

                        return (
                          <button
                            key={iconItem.name}
                            type="button"
                            onClick={() => handleIconSelect(iconItem.emoji)}
                            className={`aspect-square rounded-lg flex items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-blue-500 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                            title={iconItem.name}
                          >
                            <IconComponent className="w-5 h-5" strokeWidth={2} />
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-2">All Icons</p>
                    {[
                      'Languages',
                      'Frontend',
                      'Backend',
                      'DevOps',
                      'Security',
                      'Architecture',
                      'Tools',
                    ].map((category) => {
                      const categoryIcons = SUBJECT_ICONS.filter((i) => i.category === category)
                      if (categoryIcons.length === 0) return null

                      return (
                        <div key={category} className="mb-3">
                          <p className="text-xs text-gray-500 mb-1.5">{category}</p>
                          <div className="grid grid-cols-6 gap-2">
                            {categoryIcons.map((iconItem) => {
                              const IconComponent = iconItem.icon
                              const isSelected = formData.icon === iconItem.emoji

                              return (
                                <button
                                  key={iconItem.name}
                                  type="button"
                                  onClick={() => handleIconSelect(iconItem.emoji)}
                                  className={`aspect-square rounded-lg flex items-center justify-center transition-all ${
                                    isSelected
                                      ? 'bg-blue-500 text-white shadow-md'
                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  }`}
                                  title={iconItem.name}
                                >
                                  <IconComponent className="w-5 h-5" strokeWidth={2} />
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">Preview</label>
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div
                className="h-24 flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${formData.color} 0%, ${formData.color}dd 100%)`,
                }}
              >
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                  {(() => {
                    const selectedIcon = getSelectedIcon()
                    const IconComponent = selectedIcon.icon
                    return <IconComponent className="w-6 h-6 text-white" strokeWidth={2} />
                  })()}
                </div>
              </div>
              <div className="p-4 bg-white">
                <h3 className="font-semibold text-gray-900 mb-1">
                  {formData.name || 'Subject Name'}
                </h3>
                <p className="text-sm text-gray-600">
                  {formData.description || 'No description provided'}
                </p>
              </div>
            </div>
          </div>

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEditMode ? 'Update Subject' : 'Create Subject'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateSubjectModal
