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
  Binary,
  CircuitBoard,
  HardDrive,
  MemoryStick,
  Blocks,
  Box,
  Sparkles
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
  category?: string
  createdBy?: string
  createdByUserId?: string
  createdAt?: string
}

const CATEGORY_OPTIONS = [
  'ProgrammingLanguage',
  'Frontend',
  'Backend',
  'Database',
  'Cloud',
  'DataScience',
  'MachineLearning',
  'Algorithms',
  'GameDevelopment',
  'Mobile',
  'Other',
] as const

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#ef4444', // red
  '#f97316', // orange
  '#6366f1', // indigo
  '#a78bfa', // purple-400
  '#db2777', // pink-600
  '#d97706', // amber-700
  '#059669', // emerald-600
  '#0891b2', // cyan-600
  '#dc2626', // red-600
  '#ea580c', // orange-600
  '#4f46e5', // indigo-600
  '#9333ea', // purple-600
  '#be185d', // pink-700
  '#b45309', // amber-700
  '#047857', // emerald-700
  '#0e7490', // cyan-700
  '#b91c1c', // red-700
  '#c2410c', // orange-700
]

const SUBJECT_ICONS = [
  { name: 'Code', icon: Code2, emoji: '💻', category: 'Languages' },
  { name: 'JavaScript', icon: FileCode, emoji: 'devicon-javascript-plain', category: 'Languages' },
  { name: 'TypeScript', icon: FileJson, emoji: 'devicon-typescript-plain', category: 'Languages' },
  { name: 'Python', icon: Terminal, emoji: 'devicon-python-plain', category: 'Languages' },
  { name: 'Java', icon: Braces, emoji: 'devicon-java-plain', category: 'Languages' },
  { name: 'C/C++', icon: Binary, emoji: 'devicon-cplusplus-plain', category: 'Languages' },
  { name: 'C#', icon: Box, emoji: 'devicon-csharp-plain', category: 'Languages' },
  { name: 'Go', icon: Zap, emoji: 'devicon-go-original-wordmark', category: 'Languages' },
  { name: 'Rust', icon: Settings, emoji: 'devicon-rust-plain', category: 'Languages' },
  { name: 'PHP', icon: Globe, emoji: 'devicon-php-plain', category: 'Languages' },
  { name: 'Ruby', icon: Sparkles, emoji: 'devicon-ruby-plain', category: 'Languages' },
  { name: 'Swift', icon: Rocket, emoji: 'devicon-swift-plain', category: 'Languages' },
  { name: 'HTML5', icon: Layout, emoji: 'devicon-html5-plain', category: 'Frontend' },
  { name: 'CSS3', icon: Layout, emoji: 'devicon-css3-plain', category: 'Frontend' },
  { name: 'React', icon: Component, emoji: 'devicon-react-original', category: 'Frontend' },
  { name: 'Vue', icon: Layers, emoji: 'devicon-vuejs-plain', category: 'Frontend' },
  { name: 'Angular', icon: Boxes, emoji: 'devicon-angularjs-plain', category: 'Frontend' },
  { name: 'UI/UX', icon: Monitor, emoji: '🖥️', category: 'Frontend' },
  { name: 'Responsive Design', icon: Smartphone, emoji: '📱', category: 'Frontend' },
  { name: 'Node.js', icon: Server, emoji: 'devicon-nodejs-plain', category: 'Backend' },
  { name: 'Database', icon: Database, emoji: '🗄️', category: 'Backend' },
  { name: 'SQL', icon: HardDrive, emoji: 'devicon-mysql-plain', category: 'Backend' },
  { name: 'NoSQL', icon: MemoryStick, emoji: 'devicon-mongodb-plain', category: 'Backend' },
  { name: 'API', icon: Network, emoji: '🔌', category: 'Backend' },
  { name: 'GraphQL', icon: Workflow, emoji: 'devicon-graphql-plain', category: 'Backend' },
  { name: 'Docker', icon: Container, emoji: 'devicon-docker-plain', category: 'DevOps' },
  { name: 'Git', icon: GitBranch, emoji: 'devicon-git-plain', category: 'DevOps' },
  { name: 'Cloud', icon: Cloud, emoji: '☁️', category: 'DevOps' },
  { name: 'Testing', icon: TestTube, emoji: '🧪', category: 'DevOps' },
  { name: 'Debugging', icon: Bug, emoji: '🐛', category: 'DevOps' },
  { name: 'Security', icon: Lock, emoji: '🔒', category: 'Security' },
  { name: 'Authentication', icon: Shield, emoji: '🛡️', category: 'Security' },
  { name: 'System Design', icon: CircuitBoard, emoji: '🏗️', category: 'Architecture' },
  { name: 'Algorithms', icon: Blocks, emoji: '🧮', category: 'Architecture' },
  { name: 'Data Structures', icon: Cpu, emoji: '📦', category: 'Architecture' },
  { name: 'Package Manager', icon: Package, emoji: 'devicon-npm-original-wordmark', category: 'Tools' },
  { name: 'VS Code', icon: FileCode, emoji: 'devicon-vscode-plain', category: 'Tools' },
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
    category: 'Other' as string,
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
        category: editSubject.category || 'Other',
      })
    } else {
      setFormData({
        name: '',
        description: '',
        color: PRESET_COLORS[0],
        icon: SUBJECT_ICONS[0].emoji,
        category: 'Other',
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

      const payload = {
        name: formData.name,
        description: formData.description,
        color: formData.color,
        icon: formData.icon,
        category: formData.category,
      }

      if (isEditMode && editSubject) {
        await SubjectService.updateSubject(editSubject.subjectId, payload)
      } else {
        await SubjectService.createSubject(payload)
      }

      setFormData({
        name: '',
        description: '',
        color: PRESET_COLORS[0],
        icon: SUBJECT_ICONS[0].emoji,
        category: 'Other',
      })
      setErrors({})
      setShowIconPicker(false)

      onSuccess()
      onClose()
    } catch (error: any) {
      const msg = error?.response?.data?.message
        || error?.response?.data?.errors
        || error?.response?.data?.title
        || `Failed to ${isEditMode ? 'update' : 'create'} subject`
      setErrors({ submit: typeof msg === 'string' ? msg : JSON.stringify(msg) })
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
        category: 'Other',
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
      <div className="bg-th-card border-2 border-bd-dark w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-th-input border-b-2 border-bd-dark px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-heading">
              {isEditMode ? 'Edit Subject' : 'Create New Subject'}
            </h2>
            <p className="text-xs text-label mt-1">
              {isEditMode ? 'Update subject parameters' : 'Initialize a new subject instance'}
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 border border-transparent hover:border-bd-dark transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-heading" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-bold text-heading mb-2">
              Subject Name <span className="text-status-red-muted">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., JavaScript & TypeScript"
              className={`w-full px-4 py-2 border-2 bg-th-card focus:outline-none transition-colors text-heading ${errors.name
                  ? 'border-red-500'
                  : 'border-bd-strong focus:border-blue-600'
                }`}
              disabled={loading}
            />
            {errors.name && <p className="text-sm text-status-red mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-heading mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of what this subject covers..."
              rows={4}
              className={`w-full px-4 py-2 border-2 bg-th-card focus:outline-none transition-colors resize-none text-heading ${errors.description
                  ? 'border-red-500'
                  : 'border-bd-strong focus:border-blue-600'
                }`}
              disabled={loading}
            />
            <div className="flex items-center justify-between mt-1">
              {errors.description && <p className="text-sm text-status-red">{errors.description}</p>}
              <p className="text-xs text-muted ml-auto">{formData.description.length}/500</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-heading mb-2">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              disabled={loading}
              className="w-full px-4 py-2 border-2 border-bd-strong bg-th-card focus:outline-none focus:border-blue-600 transition-colors text-heading font-mono"
            >
              {CATEGORY_OPTIONS.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-heading mb-3">Color Theme</label>

            <div className="flex items-center gap-4">
              <div className="relative">
                <div
                  className="w-16 h-16 border-2 border-bd-strong"
                  style={{ backgroundColor: formData.color }}
                />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-body mb-1">Selected Color:</p>
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#3b82f6"
                  className="w-full px-3 py-2 border-2 border-bd-strong focus:outline-none focus:border-blue-600 text-heading rounded-sm"
                  disabled={loading}
                />
                <p className="text-xs text-muted mt-1">
                  Enter a hex color value (e.g. #3b82f6)
                </p>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs font-bold text-label mb-2">quick_presets:</p>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.slice(0, 12).map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    disabled={loading}
                    className="w-8 h-8 border-2 border-bd-strong hover:border-bd-dark transition-colors"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-heading mb-3">Icon Selection</label>

            <div className="relative" ref={iconPickerRef}>
              <button
                type="button"
                onClick={() => setShowIconPicker(!showIconPicker)}
                disabled={loading}
                className="w-full flex items-center justify-between px-4 py-2 border-2 border-bd-strong hover:border-bd-dark transition-colors bg-th-card"
              >
                <div className="flex items-center gap-3">
                  {(() => {
                    const selectedIcon = getSelectedIcon()
                    const IconComponent = selectedIcon.icon
                    return (
                      <>
                        <div className="w-8 h-8 bg-th-input border border-bd flex items-center justify-center">
                          {selectedIcon.emoji.startsWith('devicon-') ? (
                            <i className={`${selectedIcon.emoji} text-lg`} style={{ color: formData.color }}></i>
                          ) : (
                            <IconComponent className="w-5 h-5" style={{ color: formData.color }} strokeWidth={2} />
                          )}
                        </div>
                        <span className="text-sm font-bold text-heading">{selectedIcon.name}</span>
                      </>
                    )
                  })()}
                </div>
                <span className="text-muted font-bold">{showIconPicker ? '[-]' : '[+]'}</span>
              </button>

              {showIconPicker && (
                <div className="absolute z-10 mt-2 w-full bg-th-card border-2 border-bd-dark p-4 max-h-96 overflow-y-auto">
                  <div className="mb-4">
                    <p className="text-xs font-bold text-label mb-2">quick_presets:</p>
                    <div className="grid grid-cols-8 gap-2">
                      {QUICK_PRESET_ICONS.map((iconItem) => {
                        const IconComponent = iconItem.icon
                        const isSelected = formData.icon === iconItem.emoji

                        return (
                          <button
                            key={iconItem.name}
                            type="button"
                            onClick={() => handleIconSelect(iconItem.emoji)}
                            className={`aspect-square border flex items-center justify-center transition-all ${isSelected
                                ? 'bg-status-blue-solid text-white border-blue-600'
                                : 'bg-th-card text-body border-bd hover:border-bd-dark'
                              }`}
                            title={iconItem.name}
                          >
                            {iconItem.emoji.startsWith('devicon-') ? (
                              <i className={`${iconItem.emoji} text-lg`} style={{ color: isSelected ? 'white' : formData.color }}></i>
                            ) : (
                              <IconComponent className="w-5 h-5" style={{ color: isSelected ? 'white' : formData.color }} strokeWidth={2} />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-label mb-2">all_icons:</p>
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
                          <p className="text-xs font-bold text-status-blue mb-1.5">{category}</p>
                          <div className="grid grid-cols-6 gap-2">
                            {categoryIcons.map((iconItem) => {
                              const IconComponent = iconItem.icon
                              const isSelected = formData.icon === iconItem.emoji

                              return (
                                <button
                                  key={iconItem.name}
                                  type="button"
                                  onClick={() => handleIconSelect(iconItem.emoji)}
                                  className={`aspect-square border flex items-center justify-center transition-all ${isSelected
                                      ? 'bg-status-blue-solid text-white border-blue-600'
                                      : 'bg-th-card text-body border-bd hover:border-bd-dark'
                                    }`}
                                  title={iconItem.name}
                                >
                                  {iconItem.emoji.startsWith('devicon-') ? (
                                    <i className={`${iconItem.emoji} text-lg`} style={{ color: isSelected ? 'white' : formData.color }}></i>
                                  ) : (
                                    <IconComponent className="w-5 h-5" style={{ color: isSelected ? 'white' : formData.color }} strokeWidth={2} />
                                  )}
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
            <label className="block text-sm font-bold text-heading mb-3">Preview</label>
            <div className="border border-bd-strong p-4 bg-th-page rounded-md">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="w-12 h-12 bg-th-card border border-bd flex items-center justify-center flex-shrink-0">
                  {(() => {
                    const selectedIcon = getSelectedIcon()
                    const IconComponent = selectedIcon.icon
                    return selectedIcon.emoji.startsWith('devicon-') ? (
                      <i className={`${selectedIcon.emoji} text-2xl`} style={{ color: formData.color }}></i>
                    ) : (
                      <IconComponent className="w-6 h-6" style={{ color: formData.color }} strokeWidth={2} />
                    )
                  })()}
                </div>
                <div className="flex-1 min-w-0 w-full">
                  <h3 className="text-sm font-bold text-heading mb-1 truncate uppercase">
                    {formData.name || 'SUBJECT NAME'}
                  </h3>
                  <p className="text-xs text-label line-clamp-1">
                    {formData.description || 'No description provided'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {errors.submit && (
            <div className="border border-red-500 bg-status-red-bg p-4 rounded-md">
              <p className="text-sm font-bold text-status-red">{errors.submit}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-bd-strong">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-6 py-2 border border-bd-strong text-body hover:bg-th-input transition-colors disabled:opacity-50 font-bold uppercase rounded-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-2 border border-blue-600 bg-status-blue-solid text-white hover:bg-status-blue-solid-hover transition-colors disabled:opacity-50 font-bold flex items-center justify-center gap-2 uppercase rounded-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                isEditMode ? 'Update' : 'Create'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateSubjectModal
