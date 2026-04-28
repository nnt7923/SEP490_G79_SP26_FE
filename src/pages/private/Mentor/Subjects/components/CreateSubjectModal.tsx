import React, { useState, useRef, useEffect } from 'react'
import { X, Loader2, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import useNotificationStore from '../../../../../store/useNotificationStore'

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
  goals?: Array<{
    goalId?: string
    title: string
    description?: string
    duration?: string
    durationInDays?: number
  }>
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
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4',
  '#ef4444', '#f97316', '#6366f1', '#a78bfa', '#db2777', '#d97706',
  '#059669', '#0891b2', '#dc2626', '#ea580c', '#4f46e5', '#9333ea',
  '#be185d', '#b45309', '#047857', '#0e7490', '#b91c1c', '#c2410c',
]

// Devicon-based icon list — covers most programming languages & tools
const SUBJECT_ICONS: { name: string; icon: string; category: string }[] = [
  // Languages
  { name: 'JavaScript', icon: 'devicon-javascript-plain colored', category: 'Languages' },
  { name: 'TypeScript', icon: 'devicon-typescript-plain colored', category: 'Languages' },
  { name: 'Python', icon: 'devicon-python-plain colored', category: 'Languages' },
  { name: 'Java', icon: 'devicon-java-plain colored', category: 'Languages' },
  { name: 'C', icon: 'devicon-c-plain colored', category: 'Languages' },
  { name: 'C++', icon: 'devicon-cplusplus-plain colored', category: 'Languages' },
  { name: 'C#', icon: 'devicon-csharp-plain colored', category: 'Languages' },
  { name: 'Go', icon: 'devicon-go-original-wordmark colored', category: 'Languages' },
  { name: 'Rust', icon: 'devicon-rust-plain colored', category: 'Languages' },
  { name: 'PHP', icon: 'devicon-php-plain colored', category: 'Languages' },
  { name: 'Ruby', icon: 'devicon-ruby-plain colored', category: 'Languages' },
  { name: 'Swift', icon: 'devicon-swift-plain colored', category: 'Languages' },
  { name: 'Kotlin', icon: 'devicon-kotlin-plain colored', category: 'Languages' },
  { name: 'Scala', icon: 'devicon-scala-plain colored', category: 'Languages' },
  { name: 'Dart', icon: 'devicon-dart-plain colored', category: 'Languages' },
  { name: 'Lua', icon: 'devicon-lua-plain colored', category: 'Languages' },
  { name: 'Perl', icon: 'devicon-perl-plain colored', category: 'Languages' },
  { name: 'Haskell', icon: 'devicon-haskell-plain colored', category: 'Languages' },
  { name: 'Elixir', icon: 'devicon-elixir-plain colored', category: 'Languages' },
  { name: 'Clojure', icon: 'devicon-clojure-plain colored', category: 'Languages' },
  { name: 'R', icon: 'devicon-r-plain colored', category: 'Languages' },
  { name: 'MATLAB', icon: 'devicon-matlab-plain colored', category: 'Languages' },
  { name: 'Bash', icon: 'devicon-bash-plain colored', category: 'Languages' },
  { name: 'Groovy', icon: 'devicon-groovy-plain colored', category: 'Languages' },
  // Frontend
  { name: 'HTML5', icon: 'devicon-html5-plain colored', category: 'Frontend' },
  { name: 'CSS3', icon: 'devicon-css3-plain colored', category: 'Frontend' },
  { name: 'React', icon: 'devicon-react-original colored', category: 'Frontend' },
  { name: 'Vue', icon: 'devicon-vuejs-plain colored', category: 'Frontend' },
  { name: 'Angular', icon: 'devicon-angularjs-plain colored', category: 'Frontend' },
  { name: 'Svelte', icon: 'devicon-svelte-plain colored', category: 'Frontend' },
  { name: 'Next.js', icon: 'devicon-nextjs-plain colored', category: 'Frontend' },
  { name: 'Nuxt.js', icon: 'devicon-nuxtjs-plain colored', category: 'Frontend' },
  { name: 'Tailwind', icon: 'devicon-tailwindcss-plain colored', category: 'Frontend' },
  { name: 'Bootstrap', icon: 'devicon-bootstrap-plain colored', category: 'Frontend' },
  { name: 'Sass', icon: 'devicon-sass-plain colored', category: 'Frontend' },
  { name: 'jQuery', icon: 'devicon-jquery-plain colored', category: 'Frontend' },
  { name: 'Webpack', icon: 'devicon-webpack-plain colored', category: 'Frontend' },
  { name: 'Vite', icon: 'devicon-vitejs-plain colored', category: 'Frontend' },
  { name: 'Storybook', icon: 'devicon-storybook-plain colored', category: 'Frontend' },
  // Backend
  { name: 'Node.js', icon: 'devicon-nodejs-plain colored', category: 'Backend' },
  { name: 'Express', icon: 'devicon-express-original colored', category: 'Backend' },
  { name: 'NestJS', icon: 'devicon-nestjs-plain colored', category: 'Backend' },
  { name: 'Django', icon: 'devicon-django-plain colored', category: 'Backend' },
  { name: 'Flask', icon: 'devicon-flask-original colored', category: 'Backend' },
  { name: 'FastAPI', icon: 'devicon-fastapi-plain colored', category: 'Backend' },
  { name: 'Spring', icon: 'devicon-spring-plain colored', category: 'Backend' },
  { name: 'Laravel', icon: 'devicon-laravel-plain colored', category: 'Backend' },
  { name: 'Rails', icon: 'devicon-rails-plain colored', category: 'Backend' },
  { name: 'ASP.NET', icon: 'devicon-dot-net-plain colored', category: 'Backend' },
  { name: 'GraphQL', icon: 'devicon-graphql-plain colored', category: 'Backend' },
  // Database
  { name: 'MySQL', icon: 'devicon-mysql-plain colored', category: 'Database' },
  { name: 'PostgreSQL', icon: 'devicon-postgresql-plain colored', category: 'Database' },
  { name: 'MongoDB', icon: 'devicon-mongodb-plain colored', category: 'Database' },
  { name: 'Redis', icon: 'devicon-redis-plain colored', category: 'Database' },
  { name: 'SQLite', icon: 'devicon-sqlite-plain colored', category: 'Database' },
  { name: 'Oracle', icon: 'devicon-oracle-original colored', category: 'Database' },
  { name: 'Cassandra', icon: 'devicon-cassandra-plain colored', category: 'Database' },
  { name: 'CouchDB', icon: 'devicon-couchdb-plain colored', category: 'Database' },
  { name: 'Neo4j', icon: 'devicon-neo4j-plain colored', category: 'Database' },
  // DevOps & Cloud
  { name: 'Docker', icon: 'devicon-docker-plain colored', category: 'DevOps' },
  { name: 'Kubernetes', icon: 'devicon-kubernetes-plain colored', category: 'DevOps' },
  { name: 'Git', icon: 'devicon-git-plain colored', category: 'DevOps' },
  { name: 'GitHub', icon: 'devicon-github-original colored', category: 'DevOps' },
  { name: 'GitLab', icon: 'devicon-gitlab-plain colored', category: 'DevOps' },
  { name: 'Jenkins', icon: 'devicon-jenkins-plain colored', category: 'DevOps' },
  { name: 'Terraform', icon: 'devicon-terraform-plain colored', category: 'DevOps' },
  { name: 'Ansible', icon: 'devicon-ansible-plain colored', category: 'DevOps' },
  { name: 'AWS', icon: 'devicon-amazonwebservices-original colored', category: 'DevOps' },
  { name: 'Azure', icon: 'devicon-azure-plain colored', category: 'DevOps' },
  { name: 'GCP', icon: 'devicon-googlecloud-plain colored', category: 'DevOps' },
  { name: 'Nginx', icon: 'devicon-nginx-original colored', category: 'DevOps' },
  { name: 'Apache', icon: 'devicon-apache-plain colored', category: 'DevOps' },
  { name: 'Linux', icon: 'devicon-linux-plain colored', category: 'DevOps' },
  { name: 'Ubuntu', icon: 'devicon-ubuntu-plain colored', category: 'DevOps' },
  // Mobile
  { name: 'Android', icon: 'devicon-android-plain colored', category: 'Mobile' },
  { name: 'Flutter', icon: 'devicon-flutter-plain colored', category: 'Mobile' },
  { name: 'React Native', icon: 'devicon-react-original colored', category: 'Mobile' },
  { name: 'Ionic', icon: 'devicon-ionic-original colored', category: 'Mobile' },
  { name: 'Xamarin', icon: 'devicon-xamarin-original colored', category: 'Mobile' },
  // AI / Data
  { name: 'TensorFlow', icon: 'devicon-tensorflow-original colored', category: 'AI/Data' },
  { name: 'PyTorch', icon: 'devicon-pytorch-original colored', category: 'AI/Data' },
  { name: 'Pandas', icon: 'devicon-pandas-original colored', category: 'AI/Data' },
  { name: 'NumPy', icon: 'devicon-numpy-original colored', category: 'AI/Data' },
  { name: 'Jupyter', icon: 'devicon-jupyter-plain colored', category: 'AI/Data' },
  { name: 'Kaggle', icon: 'devicon-kaggle-original colored', category: 'AI/Data' },
  // Tools
  { name: 'VS Code', icon: 'devicon-vscode-plain colored', category: 'Tools' },
  { name: 'IntelliJ', icon: 'devicon-intellij-plain colored', category: 'Tools' },
  { name: 'Vim', icon: 'devicon-vim-plain colored', category: 'Tools' },
  { name: 'npm', icon: 'devicon-npm-original-wordmark colored', category: 'Tools' },
  { name: 'Yarn', icon: 'devicon-yarn-plain colored', category: 'Tools' },
  { name: 'Gradle', icon: 'devicon-gradle-plain colored', category: 'Tools' },
  { name: 'Maven', icon: 'devicon-maven-plain colored', category: 'Tools' },
  { name: 'Jira', icon: 'devicon-jira-plain colored', category: 'Tools' },
  { name: 'Figma', icon: 'devicon-figma-plain colored', category: 'Tools' },
  { name: 'Photoshop', icon: 'devicon-photoshop-plain colored', category: 'Tools' },
  { name: 'Postman', icon: 'devicon-postman-plain colored', category: 'Tools' },
  { name: 'Trello', icon: 'devicon-trello-plain colored', category: 'Tools' },
  { name: 'Slack', icon: 'devicon-slack-plain colored', category: 'Tools' },
]

const ICON_CATEGORIES = ['Languages', 'Frontend', 'Backend', 'Database', 'DevOps', 'Mobile', 'AI/Data', 'Tools']

type GoalDuration = 'OneWeek' | 'TwoWeeks' | 'OneMonth' | 'TwoMonths' | 'ThreeMonths' | 'SixMonths'

const GOAL_DURATION_OPTIONS: Array<{ value: GoalDuration; labelKey: string; days: number }> = [
  { value: 'OneWeek', labelKey: 'subjects.modal.duration.OneWeek', days: 7 },
  { value: 'TwoWeeks', labelKey: 'subjects.modal.duration.TwoWeeks', days: 14 },
  { value: 'OneMonth', labelKey: 'subjects.modal.duration.OneMonth', days: 30 },
  { value: 'TwoMonths', labelKey: 'subjects.modal.duration.TwoMonths', days: 60 },
  { value: 'ThreeMonths', labelKey: 'subjects.modal.duration.ThreeMonths', days: 90 },
  { value: 'SixMonths', labelKey: 'subjects.modal.duration.SixMonths', days: 180 },
]

const DURATION_ENUM_VALUES: GoalDuration[] = GOAL_DURATION_OPTIONS.map(o => o.value)

function mapToDurationEnum(raw: unknown): GoalDuration {
  // Already a valid enum string
  if (typeof raw === 'string' && DURATION_ENUM_VALUES.includes(raw as GoalDuration)) {
    return raw as GoalDuration
  }
  // Map from durationInDays number
  const days = Number(raw)
  if (Number.isFinite(days) && days > 0) {
    const match = GOAL_DURATION_OPTIONS.reduce((best, cur) =>
      Math.abs(cur.days - days) < Math.abs(best.days - days) ? cur : best
    )
    return match.value
  }
  return 'OneMonth'
}

interface GoalDraft {
  id: string       // local React key only
  goalId?: string  // server goalId — present for existing goals, absent for new ones
  title: string
  description: string
  duration: GoalDuration
}

const CreateSubjectModal: React.FC<CreateSubjectModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editSubject = null,
}) => {
  const { t } = useTranslation('mentor')
  const showToast = useNotificationStore(s => s.showToast)
  const isEditMode = !!editSubject

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: PRESET_COLORS[0],
    icon: SUBJECT_ICONS[0].icon,
    category: '' as string,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [iconSearch, setIconSearch] = useState('')
  const [customIconInput, setCustomIconInput] = useState('')
  const [iconTab, setIconTab] = useState<'library' | 'custom'>('library')
  const iconPickerRef = useRef<HTMLDivElement>(null)

  // Goals state
  const [goals, setGoals] = useState<GoalDraft[]>([
    { id: crypto.randomUUID(), title: '', description: '', duration: 'OneMonth' },
  ])
  const [goalErrors, setGoalErrors] = useState<Record<string, Record<string, string>>>({})
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null)

  // Set active goal to first one on open — handled in main useEffect, this is a safety fallback
  useEffect(() => {
    if (goals.length > 0 && !activeGoalId) {
      setActiveGoalId(goals[0].id)
    }
  }, [goals, activeGoalId])

  const newGoal = (): GoalDraft => ({ id: crypto.randomUUID(), title: '', description: '', duration: 'OneMonth' })

  const addGoal = () => {
    const g = newGoal()
    setGoals(prev => [...prev, g])
    setActiveGoalId(g.id)
  }

  const removeGoal = (id: string) => {
    if (goals.length <= 1) return
    const idx = goals.findIndex(g => g.id === id)
    const next = goals.filter(g => g.id !== id)
    setGoals(next)
    setGoalErrors(prev => { const n = { ...prev }; delete n[id]; return n })
    // Move active to adjacent
    if (activeGoalId === id) {
      setActiveGoalId(next[Math.max(0, idx - 1)]?.id ?? null)
    }
  }

  const updateGoal = (id: string, field: keyof Omit<GoalDraft, 'id'>, value: string) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g))
    if (field === 'title' && goalErrors[id]?.title) {
      setGoalErrors(prev => ({ ...prev, [id]: { ...prev[id], title: '' } }))
    }
  }

  const activeGoal = goals.find(g => g.id === activeGoalId) ?? null

  useEffect(() => {
    if (editSubject) {
      setFormData({
        name: editSubject.name || '',
        description: editSubject.description || '',
        color: editSubject.color || PRESET_COLORS[0],
        icon: editSubject.icon || SUBJECT_ICONS[0].icon,
        category: editSubject.category || '',
      })
      // Load existing goals from subject
      const existingGoals: GoalDraft[] = Array.isArray(editSubject.goals) && editSubject.goals.length > 0
        ? editSubject.goals.map(g => ({
          id: g.goalId || crypto.randomUUID(),
          goalId: g.goalId || undefined,   // keep server goalId for update payload
          title: g.title || '',
          description: g.description || '',
          duration: mapToDurationEnum(g.duration ?? g.durationInDays),
        }))
        : [{ id: crypto.randomUUID(), title: '', description: '', duration: 'OneMonth' as GoalDuration }]
      setGoals(existingGoals)
      setActiveGoalId(existingGoals[0].id)
    } else {
      setFormData({ name: '', description: '', color: PRESET_COLORS[0], icon: SUBJECT_ICONS[0].icon, category: '' })
      const firstGoal = { id: crypto.randomUUID(), title: '', description: '', duration: 'OneMonth' as GoalDuration }
      setGoals([firstGoal])
      setActiveGoalId(firstGoal.id)
    }
    setErrors({})
    setGoalErrors({})
    setIconSearch('')
    setCustomIconInput('')
    setIconTab('library')
  }, [editSubject, isOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (iconPickerRef.current && !iconPickerRef.current.contains(event.target as Node)) {
        setShowIconPicker(false)
      }
    }
    if (showIconPicker) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showIconPicker])

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = t('subjects.modal.nameRequired')
    else if (formData.name.length < 3) newErrors.name = t('subjects.modal.nameMin')
    if (!formData.category) newErrors.category = t('subjects.modal.categoryRequired')
    if (formData.description && formData.description.length > 500) newErrors.description = t('subjects.modal.descMax')

    // Validate goals always
    const newGoalErrors: Record<string, Record<string, string>> = {}
    goals.forEach(g => {
      if (!g.title.trim()) newGoalErrors[g.id] = { title: t('subjects.modal.goalTitleRequired') }
    })

    setErrors(newErrors)
    setGoalErrors(newGoalErrors)
    return Object.keys(newErrors).length === 0 && Object.keys(newGoalErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const { SubjectService } = await import('../../../../../services')
      const payload: any = {
        name: formData.name,
        description: formData.description,
        color: formData.color,
        icon: formData.icon,
        category: formData.category,
        goals: goals.map(g => {
          const item: Record<string, string> = {
            title: g.title.trim(),
            description: g.description.trim(),
            duration: g.duration,
          }
          if (g.goalId) item.goalId = g.goalId  // existing goal → include goalId
          return item
        }),
      }
      if (isEditMode && editSubject) {
        await SubjectService.updateSubject(editSubject.subjectId, payload)
        showToast(t('subjects.updateSuccess'), 'success')
      } else {
        await SubjectService.createSubject(payload)
        showToast(t('subjects.createSuccess'), 'success')
      }
      setErrors({})
      setGoalErrors({})
      setShowIconPicker(false)
      onSuccess()
      onClose()
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.response?.data?.errors || error?.response?.data?.title || t('subjects.modal.submitFailed')
      const msgStr = typeof msg === 'string' ? msg : JSON.stringify(msg)
      setErrors({ submit: msgStr })
      showToast(msgStr, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) { setErrors({}); setShowIconPicker(false); onClose() }
  }

  const handleIconSelect = (icon: string) => {
    setFormData({ ...formData, icon })
    setShowIconPicker(false)
  }

  const applyCustomIcon = () => {
    if (customIconInput.trim()) {
      setFormData({ ...formData, icon: customIconInput.trim() })
      setShowIconPicker(false)
      setCustomIconInput('')
    }
  }

  const renderIcon = (icon: string, size = 'text-xl', color?: string) => {
    // devicon class
    if (icon.startsWith('devicon-')) {
      return <i className={`${icon} ${size}`} style={color ? { color } : undefined} />
    }
    // emoji or text
    return <span className={size}>{icon}</span>
  }

  const filteredIcons = iconSearch
    ? SUBJECT_ICONS.filter(i => i.name.toLowerCase().includes(iconSearch.toLowerCase()) || i.category.toLowerCase().includes(iconSearch.toLowerCase()))
    : null

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 font-mono">
      <div className="bg-th-card border-2 border-bd-dark w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-th-input border-b-2 border-bd-dark px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-heading">
              {isEditMode ? t('subjects.modal.editTitle') : t('subjects.modal.createTitle')}
            </h2>
            <p className="text-xs text-label mt-1">
              {isEditMode ? t('subjects.modal.editSubtitle') : t('subjects.modal.createSubtitle')}
            </p>
          </div>
          <button onClick={handleClose} disabled={loading} className="p-2 border border-transparent hover:border-bd-dark transition-colors disabled:opacity-50">
            <X className="w-5 h-5 text-heading" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-bold text-heading mb-2">
              {t('subjects.modal.nameLabel')} <span className="text-status-red-muted">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('subjects.modal.namePlaceholder')}
              className={`w-full px-4 py-2 border-2 bg-th-card focus:outline-none transition-colors text-heading ${errors.name ? 'border-red-500' : 'border-bd-strong focus:border-blue-600'}`}
              disabled={loading}
            />
            {errors.name && <p className="text-sm text-status-red mt-1">{errors.name}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-heading mb-2">{t('subjects.modal.descLabel')}</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('subjects.modal.descPlaceholder')}
              rows={3}
              className={`w-full px-4 py-2 border-2 bg-th-card focus:outline-none transition-colors resize-none text-heading ${errors.description ? 'border-red-500' : 'border-bd-strong focus:border-blue-600'}`}
              disabled={loading}
            />
            <div className="flex items-center justify-between mt-1">
              {errors.description && <p className="text-sm text-status-red">{errors.description}</p>}
              <p className="text-xs text-muted ml-auto">{formData.description.length}/500</p>
            </div>
          </div>

          {/* Category — required */}
          <div>
            <label className="block text-sm font-bold text-heading mb-2">
              {t('subjects.modal.categoryLabel')} <span className="text-status-red-muted">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              disabled={loading}
              className={`w-full px-4 py-2 border-2 bg-th-card focus:outline-none focus:border-blue-600 transition-colors text-heading font-mono ${errors.category ? 'border-red-500' : 'border-bd-strong'}`}
            >
              <option value="">{t('subjects.modal.categoryPlaceholder')}</option>
              {CATEGORY_OPTIONS.map(cat => (
                <option key={cat} value={cat}>{t(`subjects.modal.categories.${cat}`, { defaultValue: cat })}</option>
              ))}
            </select>
            {errors.category && <p className="text-sm text-status-red mt-1">{errors.category}</p>}
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-bold text-heading mb-3">{t('subjects.modal.colorLabel')}</label>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 border-2 border-bd-strong flex-shrink-0" style={{ backgroundColor: formData.color }} />
              <div className="flex-1">
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#3b82f6"
                  className="w-full px-3 py-2 border-2 border-bd-strong focus:outline-none focus:border-blue-600 text-heading"
                  disabled={loading}
                />
                <p className="text-xs text-muted mt-1">{t('subjects.modal.colorHint')}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button key={color} type="button" onClick={() => setFormData({ ...formData, color })} disabled={loading}
                  className={`w-7 h-7 border-2 transition-colors ${formData.color === color ? 'border-bd-dark scale-110' : 'border-bd-strong hover:border-bd-dark'}`}
                  style={{ backgroundColor: color }} title={color} />
              ))}
            </div>
          </div>

          {/* Icon */}
          <div>
            <label className="block text-sm font-bold text-heading mb-3">{t('subjects.modal.iconLabel')}</label>
            <div className="relative" ref={iconPickerRef}>
              <button
                type="button"
                onClick={() => setShowIconPicker(!showIconPicker)}
                disabled={loading}
                className="w-full flex items-center justify-between px-4 py-2 border-2 border-bd-strong hover:border-bd-dark transition-colors bg-th-card"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-th-input border border-bd flex items-center justify-center">
                    {renderIcon(formData.icon, 'text-lg', formData.color)}
                  </div>
                  <span className="text-sm font-bold text-heading">
                    {SUBJECT_ICONS.find(i => i.icon === formData.icon)?.name || t('subjects.modal.customIcon')}
                  </span>
                </div>
                <span className="text-muted font-bold">{showIconPicker ? '[-]' : '[+]'}</span>
              </button>

              {showIconPicker && (
                <div className="absolute z-20 mt-2 w-full bg-th-card border-2 border-bd-dark p-4 max-h-[420px] overflow-y-auto">
                  {/* Tabs */}
                  <div className="flex gap-2 mb-3 border-b border-bd pb-2">
                    <button type="button" onClick={() => setIconTab('library')}
                      className={`text-xs font-bold px-3 py-1 border transition-colors ${iconTab === 'library' ? 'bg-status-blue-solid text-white border-blue-600' : 'border-bd-strong text-muted hover:text-heading'}`}>
                      {t('subjects.modal.iconTabLibrary')}
                    </button>
                    <button type="button" onClick={() => setIconTab('custom')}
                      className={`text-xs font-bold px-3 py-1 border transition-colors ${iconTab === 'custom' ? 'bg-status-blue-solid text-white border-blue-600' : 'border-bd-strong text-muted hover:text-heading'}`}>
                      {t('subjects.modal.iconTabCustom')}
                    </button>
                  </div>

                  {iconTab === 'library' && (
                    <>
                      {/* Search */}
                      <input
                        type="text"
                        value={iconSearch}
                        onChange={(e) => setIconSearch(e.target.value)}
                        placeholder={t('subjects.modal.iconSearchPlaceholder')}
                        className="w-full px-3 py-1.5 border border-bd-strong bg-th-input text-heading text-xs mb-3 focus:outline-none focus:border-blue-600"
                      />

                      {filteredIcons ? (
                        <div>
                          <p className="text-xs font-bold text-label mb-2">{t('subjects.modal.iconSearchResults')} ({filteredIcons.length})</p>
                          <div className="grid grid-cols-8 gap-1.5">
                            {filteredIcons.map((iconItem) => {
                              const isSelected = formData.icon === iconItem.icon
                              return (
                                <button key={iconItem.icon} type="button" onClick={() => handleIconSelect(iconItem.icon)}
                                  className={`aspect-square border flex items-center justify-center transition-all ${isSelected ? 'bg-status-blue-solid border-blue-600' : 'bg-th-card border-bd hover:border-bd-dark'}`}
                                  title={iconItem.name}>
                                  {renderIcon(iconItem.icon, 'text-lg', isSelected ? 'white' : undefined)}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ) : (
                        ICON_CATEGORIES.map((cat) => {
                          const icons = SUBJECT_ICONS.filter(i => i.category === cat)
                          return (
                            <div key={cat} className="mb-4">
                              <p className="text-xs font-bold text-status-blue mb-1.5">{cat}</p>
                              <div className="grid grid-cols-8 gap-1.5">
                                {icons.map((iconItem) => {
                                  const isSelected = formData.icon === iconItem.icon
                                  return (
                                    <button key={iconItem.icon} type="button" onClick={() => handleIconSelect(iconItem.icon)}
                                      className={`aspect-square border flex items-center justify-center transition-all ${isSelected ? 'bg-status-blue-solid border-blue-600' : 'bg-th-card border-bd hover:border-bd-dark'}`}
                                      title={iconItem.name}>
                                      {renderIcon(iconItem.icon, 'text-lg', isSelected ? 'white' : undefined)}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })
                      )}
                    </>
                  )}

                  {iconTab === 'custom' && (
                    <div className="space-y-3">
                      <p className="text-xs text-muted">{t('subjects.modal.iconCustomHint')}</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customIconInput}
                          onChange={(e) => setCustomIconInput(e.target.value)}
                          placeholder={t('subjects.modal.iconCustomPlaceholder')}
                          className="flex-1 px-3 py-2 border border-bd-strong bg-th-input text-heading text-sm focus:outline-none focus:border-blue-600"
                        />
                        <button type="button" onClick={applyCustomIcon}
                          className="px-4 py-2 border border-blue-600 bg-status-blue-solid text-white text-sm font-bold hover:bg-status-blue-solid-hover transition-colors">
                          {t('subjects.modal.iconCustomApply')}
                        </button>
                      </div>
                      {customIconInput && (
                        <div className="flex items-center gap-3 p-3 border border-bd bg-th-page">
                          <div className="w-10 h-10 border border-bd flex items-center justify-center bg-th-card">
                            {renderIcon(customIconInput, 'text-2xl', formData.color)}
                          </div>
                          <span className="text-xs text-muted">{t('subjects.modal.iconCustomPreview')}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Goals — both create and edit mode */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-heading">
                {t('subjects.modal.goalsLabel')} <span className="text-status-red-muted">*</span>
                <span className="ml-2 text-xs font-normal text-muted">({goals.length} {t('subjects.modal.goalsCount')})</span>
              </label>
              <button
                type="button"
                onClick={addGoal}
                disabled={loading}
                className="flex items-center gap-1 px-3 py-1 border border-blue-600 text-status-blue text-xs font-bold hover:bg-status-blue-solid hover:text-white transition-colors disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('subjects.modal.addGoal')}
              </button>
            </div>

            {/* 2-column layout: list left, editor right */}
            <div className="border border-bd-strong flex" style={{ minHeight: 220 }}>
              {/* Left: scrollable goal list */}
              <div className="w-2/5 border-r border-bd-strong overflow-y-auto" style={{ maxHeight: 280 }}>
                {goals.map((goal, idx) => {
                  const isActive = goal.id === activeGoalId
                  const hasError = !!goalErrors[goal.id]?.title
                  const durLabel = t(GOAL_DURATION_OPTIONS.find(o => o.value === goal.duration)?.labelKey ?? '', { defaultValue: goal.duration })
                  return (
                    <div
                      key={goal.id}
                      onClick={() => setActiveGoalId(goal.id)}
                      className={`flex items-center justify-between px-3 py-2 cursor-pointer border-b border-bd transition-colors group ${isActive ? 'bg-status-blue-solid' : 'hover:bg-th-page'}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-bold truncate ${isActive ? 'text-white' : hasError ? 'text-status-red' : 'text-heading'}`}>
                          {goal.title.trim() || <span className="opacity-50">{t('subjects.modal.goalUntitled')}</span>}
                        </div>
                        <div className={`text-xs mt-0.5 ${isActive ? 'text-blue-100' : 'text-muted'}`}>
                          #{idx + 1} · {durLabel}
                        </div>
                      </div>
                      {goals.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeGoal(goal.id) }}
                          disabled={loading}
                          title={t('subjects.modal.removeGoal')}
                          style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}
                        >
                          <Trash2 style={{ color: '#ef4444', width: 20, height: 20, display: 'block' }} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Right: editor for active goal */}
              <div className="flex-1 p-4 bg-th-page">
                {activeGoal ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-heading mb-1">
                        {t('subjects.modal.goalTitle')} <span className="text-status-red-muted">*</span>
                      </label>
                      <input
                        type="text"
                        value={activeGoal.title}
                        onChange={(e) => updateGoal(activeGoal.id, 'title', e.target.value)}
                        placeholder={t('subjects.modal.goalTitlePlaceholder')}
                        disabled={loading}
                        className={`w-full px-3 py-2 border bg-th-card focus:outline-none transition-colors text-heading text-sm ${goalErrors[activeGoal.id]?.title ? 'border-red-500' : 'border-bd-strong focus:border-blue-600'}`}
                      />
                      {goalErrors[activeGoal.id]?.title && (
                        <p className="text-xs text-status-red mt-1">{goalErrors[activeGoal.id].title}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-heading mb-1">{t('subjects.modal.goalDesc')}</label>
                      <input
                        type="text"
                        value={activeGoal.description}
                        onChange={(e) => updateGoal(activeGoal.id, 'description', e.target.value)}
                        placeholder={t('subjects.modal.goalDescPlaceholder')}
                        disabled={loading}
                        className="w-full px-3 py-2 border border-bd-strong bg-th-card focus:outline-none focus:border-blue-600 transition-colors text-heading text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-heading mb-1">{t('subjects.modal.goalDuration')}</label>
                      <select
                        value={activeGoal.duration}
                        onChange={(e) => updateGoal(activeGoal.id, 'duration', e.target.value)}
                        disabled={loading}
                        className="w-full px-3 py-2 border border-bd-strong bg-th-card focus:outline-none focus:border-blue-600 transition-colors text-heading text-sm font-mono"
                      >
                        {GOAL_DURATION_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {t(opt.labelKey, { defaultValue: opt.value })}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted">{t('subjects.modal.goalSelectHint')}</p>
                )}
              </div>
            </div>

            {/* Global goal error (e.g. all titles empty) */}
            {Object.keys(goalErrors).length > 0 && (
              <p className="text-xs text-status-red mt-1">
                {t('subjects.modal.goalErrorSummary', { count: Object.keys(goalErrors).length })}
              </p>
            )}
          </div>

          {/* Preview */}
          <div>
            <label className="block text-sm font-bold text-heading mb-3">{t('subjects.modal.previewLabel')}</label>
            <div className="border border-bd-strong p-4 bg-th-page">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-th-card border border-bd flex items-center justify-center flex-shrink-0">
                  {renderIcon(formData.icon, 'text-2xl', formData.color)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-heading mb-1 truncate uppercase">
                    {formData.name || t('subjects.modal.previewNameFallback')}
                  </h3>
                  <p className="text-xs text-label line-clamp-1">
                    {formData.description || t('subjects.modal.previewDescFallback')}
                  </p>
                  {formData.category && (
                    <span className="text-xs text-status-blue font-bold mt-1 inline-block">
                      {t(`subjects.modal.categories.${formData.category}`, { defaultValue: formData.category })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {errors.submit && (
            <div className="border border-red-500 bg-status-red-bg p-4">
              <p className="text-sm font-bold text-status-red">{errors.submit}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-bd-strong">
            <button type="button" onClick={handleClose} disabled={loading}
              className="flex-1 px-6 py-2 border border-bd-strong text-body hover:bg-th-input transition-colors disabled:opacity-50 font-bold uppercase">
              {t('dashboard.cancel')}
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-6 py-2 border border-blue-600 bg-status-blue-solid text-white hover:bg-status-blue-solid-hover transition-colors disabled:opacity-50 font-bold flex items-center justify-center gap-2 uppercase">
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />{t('subjects.modal.saving')}</>
              ) : (
                isEditMode ? t('subjects.modal.update') : t('subjects.modal.create')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateSubjectModal
