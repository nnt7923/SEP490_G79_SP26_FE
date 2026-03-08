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
  'var(--blue-500)',
  'var(--color-hex-42)',
  'var(--color-hex-37)',
  'var(--color-hex-28)',
  'var(--color-hex-44)',
  'var(--color-hex-33)',
  'var(--color-hex-85)',
  'var(--color-hex-31)',
  'var(--color-hex-35)',
  'var(--color-hex-86)',
  'var(--color-hex-87)',
  'var(--color-hex-57)',
  'var(--color-hex-58)',
  'var(--color-hex-88)',
  'var(--red-600)',
  'var(--color-hex-89)',
  'var(--color-hex-9)',
  'var(--color-hex-90)',
  'var(--color-hex-91)',
  'var(--warning-primary)',
  'var(--color-hex-92)',
  'var(--color-hex-93)',
  'var(--color-hex-94)',
  'var(--color-hex-95)',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 font-mono">
      <div className="bg-white border-2 border-gray-900 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-100 border-b-2 border-gray-900 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              <span className="text-blue-600">{'>_ '}</span>
              {isEditMode ? 'edit_subject' : 'create_new_subject'}
            </h2>
            <p className="text-xs text-gray-600 mt-1">
              {'//'} {isEditMode ? 'update subject parameters' : 'initialize a new subject instance'}
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 border border-transparent hover:border-gray-900 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-900" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              subject_name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., JavaScript & TypeScript"
              className={`w-full px-4 py-2 border-2 bg-white focus:outline-none transition-colors text-gray-900 ${
                errors.name
                  ? 'border-red-500'
                  : 'border-gray-400 focus:border-blue-600'
              }`}
              disabled={loading}
            />
            {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of what this subject covers..."
              rows={4}
              className={`w-full px-4 py-2 border-2 bg-white focus:outline-none transition-colors resize-none text-gray-900 ${
                errors.description
                  ? 'border-red-500'
                  : 'border-gray-400 focus:border-blue-600'
              }`}
              disabled={loading}
            />
            <div className="flex items-center justify-between mt-1">
              {errors.description && <p className="text-sm text-red-600">{errors.description}</p>}
              <p className="text-xs text-gray-500 ml-auto">{formData.description.length}/500</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-3">color_theme</label>

            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-16 h-16 border-2 border-gray-400 cursor-pointer"
                  disabled={loading}
                />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-gray-700 mb-1">selected_color:</p>
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="var(--blue-500)"
                  className="w-full px-3 py-2 border-2 border-gray-400 focus:outline-none focus:border-blue-600 uppercase text-gray-900"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {'//'} click the color box or enter a hex code
                </p>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs font-bold text-gray-600 mb-2">quick_presets:</p>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.slice(0, 12).map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    disabled={loading}
                    className="w-8 h-8 border-2 border-gray-400 hover:border-gray-900 transition-colors"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-3">icon_select</label>

            <div className="relative" ref={iconPickerRef}>
              <button
                type="button"
                onClick={() => setShowIconPicker(!showIconPicker)}
                disabled={loading}
                className="w-full flex items-center justify-between px-4 py-2 border-2 border-gray-400 hover:border-gray-900 transition-colors bg-white"
              >
                <div className="flex items-center gap-3">
                  {(() => {
                    const selectedIcon = getSelectedIcon()
                    const IconComponent = selectedIcon.icon
                    return (
                      <>
                        <div className="w-8 h-8 bg-gray-100 border border-gray-300 flex items-center justify-center">
                          <IconComponent className="w-5 h-5 text-blue-600" strokeWidth={2} />
                        </div>
                        <span className="text-sm font-bold text-gray-900">{selectedIcon.name}</span>
                      </>
                    )
                  })()}
                </div>
                <span className="text-gray-500 font-bold">{showIconPicker ? '[-]' : '[+]'}</span>
              </button>

              {showIconPicker && (
                <div className="absolute z-10 mt-2 w-full bg-white border-2 border-gray-900 p-4 max-h-96 overflow-y-auto">
                  <div className="mb-4">
                    <p className="text-xs font-bold text-gray-600 mb-2">quick_presets:</p>
                    <div className="grid grid-cols-8 gap-2">
                      {QUICK_PRESET_ICONS.map((iconItem) => {
                        const IconComponent = iconItem.icon
                        const isSelected = formData.icon === iconItem.emoji

                        return (
                          <button
                            key={iconItem.name}
                            type="button"
                            onClick={() => handleIconSelect(iconItem.emoji)}
                            className={`aspect-square border flex items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-gray-900'
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
                    <p className="text-xs font-bold text-gray-600 mb-2">all_icons:</p>
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
                          <p className="text-xs font-bold text-blue-600 mb-1.5">{'// '} {category}</p>
                          <div className="grid grid-cols-6 gap-2">
                            {categoryIcons.map((iconItem) => {
                              const IconComponent = iconItem.icon
                              const isSelected = formData.icon === iconItem.emoji

                              return (
                                <button
                                  key={iconItem.name}
                                  type="button"
                                  onClick={() => handleIconSelect(iconItem.emoji)}
                                  className={`aspect-square border flex items-center justify-center transition-all ${
                                    isSelected
                                      ? 'bg-blue-600 text-white border-blue-600'
                                      : 'bg-white text-gray-700 border-gray-300 hover:border-gray-900'
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
            <label className="block text-sm font-bold text-gray-900 mb-3">preview</label>
            <div className="border border-gray-400 p-4 bg-gray-50">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="w-12 h-12 bg-white border border-gray-300 flex items-center justify-center flex-shrink-0">
                  {(() => {
                    const selectedIcon = getSelectedIcon()
                    const IconComponent = selectedIcon.icon
                    return <IconComponent className="w-6 h-6 text-blue-600" strokeWidth={2} />
                  })()}
                </div>
                <div className="flex-1 min-w-0 w-full">
                  <h3 className="text-sm font-bold text-gray-900 mb-1 truncate uppercase">
                    {formData.name || 'SUBJECT_NAME'}
                  </h3>
                  <p className="text-xs text-gray-600 line-clamp-1">
                    {'// '} {formData.description || 'no_description( )'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {errors.submit && (
            <div className="border border-red-500 bg-red-50 p-4">
              <p className="text-sm font-bold text-red-600">{'// '} {errors.submit}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-gray-400">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-6 py-2 border border-gray-400 text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 font-bold uppercase"
            >
              [ cancel ]
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-2 border border-blue-600 bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 font-bold flex items-center justify-center gap-2 uppercase"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  [ wait ]
                </>
              ) : (
                isEditMode ? '[ update ]' : '[ create ]'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateSubjectModal
