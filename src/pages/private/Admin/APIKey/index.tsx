
import React, { useEffect, useState } from 'react'
import Layout from '../../../../components/Layout'
import { useAdminSidebarConfig } from '../components/AdminSideBar'
import { AIConfigService, AIUsageType } from '../../../../services'
import { LayoutTemplate, FileText, CheckCircle, MessageSquare, Plus, X, ChevronDown, ChevronUp, ChevronRight, Edit, Trash2, Settings, Key } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const AccessTier = {
  Free: 0,
  Paid: 1,
} as const

type AccessTier = typeof AccessTier[keyof typeof AccessTier]
type ConfigEditorMode = 'builder' | 'json'
type ConfigFieldType = 'string' | 'number' | 'boolean' | 'null' | 'json'

type ConfigField = {
  id: string
  path: string
  type: ConfigFieldType
  value: string
}

const createConfigField = (): ConfigField => ({
  id: `${Date.now()}-${Math.random()}`,
  path: '',
  type: 'string',
  value: '',
})

const normalizePathSegments = (path: string): string[] => {
  return path
    .split('.')
    .map((part) => part.trim())
    .filter(Boolean)
}

const setValueAtPath = (target: Record<string, any>, path: string, value: any) => {
  const segments = normalizePathSegments(path)
  if (segments.length === 0) return

  let current: Record<string, any> = target
  for (let i = 0; i < segments.length - 1; i += 1) {
    const key = segments[i]
    if (!current[key] || typeof current[key] !== 'object' || Array.isArray(current[key])) {
      current[key] = {}
    }
    current = current[key]
  }

  current[segments[segments.length - 1]] = value
}

const flattenConfigObject = (obj: Record<string, any>, prefix = ''): ConfigField[] => {
  const fields: ConfigField[] = []

  Object.entries(obj || {}).forEach(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const nested = flattenConfigObject(value, path)
      if (nested.length > 0) {
        fields.push(...nested)
      } else {
        fields.push({ id: `${Date.now()}-${Math.random()}`, path, type: 'json', value: '{}' })
      }
      return
    }

    if (typeof value === 'number') {
      fields.push({ id: `${Date.now()}-${Math.random()}`, path, type: 'number', value: String(value) })
      return
    }

    if (typeof value === 'boolean') {
      fields.push({ id: `${Date.now()}-${Math.random()}`, path, type: 'boolean', value: value ? 'true' : 'false' })
      return
    }

    if (value === null) {
      fields.push({ id: `${Date.now()}-${Math.random()}`, path, type: 'null', value: '' })
      return
    }

    if (Array.isArray(value)) {
      fields.push({ id: `${Date.now()}-${Math.random()}`, path, type: 'json', value: JSON.stringify(value) })
      return
    }

    fields.push({ id: `${Date.now()}-${Math.random()}`, path, type: 'string', value: String(value) })
  })

  return fields
}

const AdminApiKeyPage: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>('')
  const [notice, setNotice] = useState<string>('')
  const { t } = useTranslation('admin')

  // List of configs from backend
  const [items, setItems] = useState<any[]>([])
  const [expandedIndex, setExpandedIndex] = useState<string | null>(null)
  
  // Collapsible groups by AI Usage Type
  const [expandedGroups, setExpandedGroups] = useState<Set<AIUsageType>>(new Set([
    AIUsageType.StructureGeneration,
    AIUsageType.ContentGeneration,
    AIUsageType.Verification,
    AIUsageType.Assistant,
    AIUsageType.DocumentExtraction,
  ]))

  // Add/Edit form state
  const [showForm, setShowForm] = useState<boolean>(false)
  const [isEditMode, setIsEditMode] = useState<boolean>(false)

  const [configId, setConfigId] = useState<string>('')
  const [providerName, setProviderName] = useState<string>('')
  const [apiKey, setApiKey] = useState<string>('')
  const [isActive, setIsActive] = useState<boolean>(true)
  const [aiUsageType, setAiUsageType] = useState<AIUsageType>(AIUsageType.StructureGeneration)
  const [accessTier, setAccessTier] = useState<AccessTier>(AccessTier.Free)
  const [configEditorMode, setConfigEditorMode] = useState<ConfigEditorMode>('builder')
  const [configFields, setConfigFields] = useState<ConfigField[]>([])
  const [configJsonText, setConfigJsonText] = useState<string>('{}')
  
  // Map string usageType from backend to enum
  const mapUsageTypeToEnum = (usageType: any): AIUsageType => {
    if (typeof usageType === 'number') return usageType as AIUsageType
    
    const typeStr = String(usageType || '').toLowerCase()
    if (typeStr.includes('structure')) return AIUsageType.StructureGeneration
    if (typeStr.includes('content')) return AIUsageType.ContentGeneration
    if (typeStr.includes('verif')) return AIUsageType.Verification
    if (typeStr.includes('assistant')) return AIUsageType.Assistant
    if (typeStr.includes('document') || typeStr.includes('extract')) return AIUsageType.DocumentExtraction
    
    return AIUsageType.StructureGeneration
  }

  const mapAccessTier = (tier: any): AccessTier => {
    if (typeof tier === 'number') return tier === AccessTier.Paid ? AccessTier.Paid : AccessTier.Free
    const tierStr = String(tier || '').toLowerCase()
    if (tierStr.includes('paid') || tierStr === '1') return AccessTier.Paid
    return AccessTier.Free
  }
  
  const toggleGroup = (usageType: AIUsageType) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(usageType)) {
      newExpanded.delete(usageType)
    } else {
      newExpanded.add(usageType)
    }
    setExpandedGroups(newExpanded)
  }
  
  const getUsageTypeInfo = (usageType: AIUsageType) => {
    switch (usageType) {
      case AIUsageType.StructureGeneration:
        return { label: t('apiKey.structureGeneration'), color: 'var(--icon-violet-to)', borderColor: 'var(--icon-violet-to)', icon: LayoutTemplate }
      case AIUsageType.ContentGeneration:
        return { label: t('apiKey.contentGeneration'), color: 'var(--blue-500)', borderColor: 'var(--blue-500)', icon: FileText }
      case AIUsageType.Verification:
        return { label: t('apiKey.verification'), color: 'var(--color-emerald-500)', borderColor: 'var(--color-emerald-500)', icon: CheckCircle }
      case AIUsageType.Assistant:
        return { label: t('apiKey.assistant'), color: 'var(--color-amber-500)', borderColor: 'var(--color-amber-500)', icon: MessageSquare }
      case AIUsageType.DocumentExtraction:
        return { label: t('apiKey.documentExtraction'), color: 'var(--color-cyan-500)', borderColor: 'var(--color-cyan-500)', icon: FileText }
      default:
        return { label: t('apiKey.unknown'), color: 'var(--text-secondary)', borderColor: 'var(--text-secondary)', icon: LayoutTemplate }
    }
  }

  const getUsageTypeString = (type: AIUsageType): string => {
    switch (type) {
      case AIUsageType.StructureGeneration: return 'StructureGeneration'
      case AIUsageType.ContentGeneration: return 'ContentGeneration'
      case AIUsageType.Verification: return 'Verification'
      case AIUsageType.Assistant: return 'Assistant'
      case AIUsageType.DocumentExtraction: return 'DocumentExtraction'
      default: return 'StructureGeneration'
    }
  }
  
  const groupedItems = items.reduce((acc, item) => {
    const usageType = mapUsageTypeToEnum(item.usageType ?? item.aiUsageType)
    if (!acc[usageType]) acc[usageType] = { free: [], paid: [] }
    const tier = mapAccessTier(item.accessTier)
    if (tier === AccessTier.Paid) acc[usageType].paid.push(item)
    else acc[usageType].free.push(item)
    return acc
  }, {} as Record<AIUsageType, { free: any[]; paid: any[] }>)
  
  const handleSelectKey = async (configId: string, usageType: AIUsageType, selectedAccessTier: AccessTier) => {
    setError('')
    setNotice('')
    try {
      await AIConfigService.setActiveAIConfig(configId, getUsageTypeString(usageType), selectedAccessTier)
      await fetchList()
      setNotice(t('apiKey.setActiveSuccess'))
    } catch (e: any) {
      setError(e?.message || t('apiKey.setActiveFailed'))
    }
  }

  const resetForm = () => {
    setConfigId('')
    setProviderName('')
    setApiKey('')
    setIsActive(true)
    setAiUsageType(AIUsageType.StructureGeneration)
    setAccessTier(AccessTier.Free)
    setConfigEditorMode('builder')
    setConfigFields([])
    setConfigJsonText('{}')
    setIsEditMode(false)
  }

  const fetchList = async () => {
    setLoading(true)
    setError('')
    setNotice('')
    try {
      const cfg = await AIConfigService.getAIConfig()
      const list = Array.isArray(cfg) ? cfg : cfg ? [cfg] : []
      setItems(list)
    } catch (e: any) {
      setError(e?.message || t('apiKey.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchList()
  }, [])

  const addConfigField = () => {
    setConfigFields((prev) => [...prev, createConfigField()])
  }

  const removeConfigField = (id: string) => {
    setConfigFields((prev) => prev.filter((f) => f.id !== id))
  }

  const updateConfigField = (id: string, patch: Partial<ConfigField>) => {
    setConfigFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  }

  const applyStarterTemplate = () => {
    const starter = {
      model: 'mistral-small-latest',
      contextWindow: 200000,
      chatPolicy: {
        runtimeContextBudget: 24000,
        reservedOutputRatio: 0.08,
      },
    }
    setConfigJsonText(JSON.stringify(starter, null, 2))
    setConfigFields(flattenConfigObject(starter))
  }

  const parseJsonTextToObject = (rawText: string): Record<string, any> => {
    const raw = rawText.trim()
    if (!raw) return {}

    let parsed: any
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw new Error(t('apiKey.invalidJsonMessage', 'config_json must be valid JSON'))
    }

    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
      throw new Error(t('apiKey.invalidJsonObjectMessage', 'config_json must be a JSON object'))
    }

    return parsed as Record<string, any>
  }

  const parseBuilderValue = (field: ConfigField): any => {
    if (field.type === 'number') {
      const numeric = Number(field.value)
      if (!Number.isFinite(numeric)) {
        throw new Error(t('apiKey.invalidNumberMessage', 'Invalid number value in config_json builder'))
      }
      return numeric
    }

    if (field.type === 'boolean') {
      if (field.value === 'true') return true
      if (field.value === 'false') return false
      throw new Error(t('apiKey.invalidBooleanMessage', 'Boolean value must be true or false'))
    }

    if (field.type === 'null') {
      return null
    }

    if (field.type === 'json') {
      const valueText = field.value.trim()
      if (!valueText) return {}
      try {
        return JSON.parse(valueText)
      } catch {
        throw new Error(t('apiKey.invalidNestedJsonMessage', 'Invalid nested JSON value in config_json builder'))
      }
    }

    return field.value
  }

  const buildConfigJsonFromFields = (): Record<string, any> => {
    const result: Record<string, any> = {}

    configFields.forEach((field) => {
      if (!field.path.trim()) return
      const value = parseBuilderValue(field)
      setValueAtPath(result, field.path.trim(), value)
    })

    return result
  }

  const getConfigJsonFromEditor = (): Record<string, any> => {
    if (configEditorMode === 'json') {
      return parseJsonTextToObject(configJsonText)
    }
    return buildConfigJsonFromFields()
  }

  const switchEditorMode = (mode: ConfigEditorMode) => {
    if (mode === configEditorMode) return

    if (mode === 'json') {
      try {
        const built = buildConfigJsonFromFields()
        setConfigJsonText(JSON.stringify(built, null, 2))
      } catch {
        // Keep existing JSON text when builder contains temporary invalid values.
      }
      setConfigEditorMode('json')
      return
    }

    try {
      const parsed = parseJsonTextToObject(configJsonText)
      setConfigFields(flattenConfigObject(parsed))
    } catch {
      setConfigFields([])
    }
    setConfigEditorMode('builder')
  }

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const configJson = getConfigJsonFromEditor()

      const payload = {
        providerName,
        apiKey,
        configJson,
        isEnabled: isActive, // Backend uses isEnabled instead of isActive
        aiUsageType: getUsageTypeString(aiUsageType), // Send as string
        accessTier,
      }

      await AIConfigService.updateAIConfig(payload as any)
      setShowForm(false)
      resetForm()
      await fetchList()
      setNotice(t('apiKey.addSuccess'))
    } catch (e: any) {
      setError(e?.message || t('apiKey.createFailed'))
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (it: any) => {
    setShowForm(true)
    setIsEditMode(true)
    const name = it.providerName ?? it.provider ?? ''

    setConfigId(it.configId ?? it.id ?? '')
    setProviderName(name)
    setApiKey('')
    
    // Set aiUsageType - use mapUsageTypeToEnum to handle backend response
    const usageType = mapUsageTypeToEnum(it.usageType ?? it.aiUsageType)
    setAiUsageType(usageType)
    setAccessTier(mapAccessTier(it.accessTier))
    
    // Convert additionalProps or configJson to additionalProps
    const props = it.additionalProps ?? (it.configJson ?? it.GroqSettings ?? {})
    if (props && typeof props === 'object' && !Array.isArray(props)) {
      setConfigJsonText(JSON.stringify(props, null, 2))
      setConfigFields(flattenConfigObject(props as Record<string, any>))
    } else {
      setConfigJsonText('{}')
      setConfigFields([])
    }
    
    const active = typeof it.isActive === 'boolean' ? it.isActive : true
    setIsActive(Boolean(active))
    
    // Scroll to top to show form
    setTimeout(() => {
      window.scrollTo({ top: 200, behavior: 'smooth' })
    }, 200)
  }

  const onUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!configId) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const configJson = getConfigJsonFromEditor()

      const payload: Record<string, any> = {
        providerName,
        configJson,
        usageType: getUsageTypeString(aiUsageType), // Backend uses usageType for update
        accessTier,
        isActive, // Keep isActive for update
      }

      if (apiKey.trim()) {
        payload.apiKey = apiKey.trim()
      }

      await AIConfigService.putAIConfigById(configId, payload as any)
      setShowForm(false)
      resetForm()
      await fetchList()
      setNotice(t('apiKey.updateSuccess'))
      
      // Scroll to top to show success message
      setTimeout(() => {
        window.scrollTo({ top: 200, behavior: 'smooth' })
      }, 100)
    } catch (e: any) {
      setError(e?.message || t('apiKey.updateFailed'))
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (name: string) => {
    setError('')
    setNotice(t('apiKey.deletingConfig'))
    try {
      await AIConfigService.deleteAIConfig(name)
      if (expandedIndex !== null) setExpandedIndex(null)
      await fetchList()
      setNotice(t('apiKey.deleteSuccess'))
    } catch (e: any) {
      setError(e?.message || t('apiKey.deleteFailed'))
      setNotice('')
    }
  }

  const sidebarConfig = {
    navItems: useAdminSidebarConfig() as any,
    brand: { name: 'Admin', subtitle: 'API Key' },
  }

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="px-4 py-8 bg-[var(--gray-100)] min-h-screen font-mono">
        <div className="max-w-6xl mx-auto space-y-6">
           {/* ========== PAGE HEADER ========== */}
           <div className="mb-6 border-b border-bd pb-4">
             <div className="flex items-center justify-between gap-4">
               <div>
                 <h1 className="text-2xl font-bold text-heading border-none bg-transparent flex items-center gap-2">
                   <Key className="text-status-blue flex-shrink-0" size={28} />
                    {t('apiKey.title')}
                 </h1>
                 <p className="text-muted mt-2">
                    {t('apiKey.subtitle')}
                 </p>
               </div>
               <button
                 type="button"
                 onClick={() => { setShowForm((s) => !s); setIsEditMode(false); resetForm() }}
                 className="px-6 py-2 border border-blue-600 bg-th-card text-status-blue font-bold hover:bg-status-blue-bg transition-colors cursor-pointer rounded-sm flex items-center gap-2"
                >
                  {showForm && !isEditMode ? <X size={18} /> : <Plus size={18} />}
                  {showForm && !isEditMode ? t('apiKey.close') : t('apiKey.addKey')}
                </button>
             </div>
           </div>

        {/* ========== ALERTS ========== */}
        {error && (
          <div className="mb-6 text-sm text-status-red-dark bg-status-red-bg border-l-4 border-red-500 rounded-r-lg px-4 py-3" role="alert">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}
        {notice && (
          <div className="mb-6 text-sm text-status-green-dark bg-status-green-bg border-l-4 border-green-500 rounded-r-lg px-4 py-3" role="status">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>{notice}</span>
            </div>
          </div>
        )}

        {/* ========== ADD/EDIT FORM ========== */}
        {showForm && (
          <div className="mb-8 bg-th-card border border-bd-strong">
            <div className="bg-th-input px-6 py-4 border-b border-bd-strong flex items-center gap-2">
              <Settings className="text-status-blue" size={20} />
              <h2 className="text-lg font-bold text-heading">
                {isEditMode ? t('apiKey.editConfiguration') : t('apiKey.addNewConfiguration')}
              </h2>
            </div>
            <form onSubmit={isEditMode ? onUpdate : onSave} className="p-6 space-y-6 lg:w-4/5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-body mb-2">{t('apiKey.providerName')}</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-bd-strong bg-th-card focus:outline-none focus:border-blue-500 transition-colors font-mono"
                    placeholder={t('apiKey.providerPlaceholder')}
                    value={providerName}
                    onChange={(e) => setProviderName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-body mb-2">{t('apiKey.apiKeyLabel')}</label>
                  <input
                    type="password"
                    className="w-full px-4 py-2 border border-bd-strong bg-th-card focus:outline-none focus:border-blue-500 transition-colors font-mono"
                    placeholder={isEditMode ? t('apiKey.apiKeyUpdatePlaceholder', 'Enter new API key (optional)') : t('apiKey.apiKeyPlaceholder')}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  {isEditMode && (
                    <p className="text-xs text-muted mt-2">{t('apiKey.apiKeyNotShownHint', 'Current API key is hidden. Leave empty to keep existing key.')}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-body mb-2">{t('apiKey.aiUsageType')}</label>
                <select
                  className="w-full px-4 py-2 border border-bd-strong focus:outline-none focus:border-blue-500 transition-colors bg-th-card font-mono"
                  value={aiUsageType}
                  onChange={(e) => setAiUsageType(Number(e.target.value) as AIUsageType)}
                >
                  <option value={AIUsageType.StructureGeneration}>{t('apiKey.structureGeneration')}</option>
                  <option value={AIUsageType.ContentGeneration}>{t('apiKey.contentGeneration')}</option>
                  <option value={AIUsageType.Verification}>{t('apiKey.verification')}</option>
                  <option value={AIUsageType.Assistant}>{t('apiKey.assistant')}</option>
                  <option value={AIUsageType.DocumentExtraction}>{t('apiKey.documentExtraction')}</option>
                </select>
                <p className="text-xs text-muted mt-2">{t('apiKey.selectUsageType')}</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-body mb-2">{t('apiKey.accessTier')}</label>
                <select
                  className="w-full px-4 py-2 border border-bd-strong focus:outline-none focus:border-blue-500 transition-colors bg-th-card font-mono"
                  value={accessTier}
                  onChange={(e) => setAccessTier(Number(e.target.value) as AccessTier)}
                >
                  <option value={AccessTier.Free}>{t('apiKey.tierFree')}</option>
                  <option value={AccessTier.Paid}>{t('apiKey.tierPaid')}</option>
                </select>
                <p className="text-xs text-muted mt-2">{t('apiKey.selectTier')}</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-bold text-body">{t('apiKey.configJsonLabel')}</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={applyStarterTemplate}
                      className="px-3 py-1.5 text-xs font-bold text-status-blue border border-blue-600 hover:bg-status-blue-bg transition-colors rounded-sm"
                    >
                      {t('apiKey.useTemplate', 'Use template')}
                    </button>
                    <button
                      type="button"
                      onClick={() => switchEditorMode('builder')}
                      className={`px-3 py-1.5 text-xs font-bold border rounded-sm transition-colors ${configEditorMode === 'builder' ? 'border-blue-600 text-status-blue bg-status-blue-bg' : 'border-bd-strong text-body hover:bg-th-input'}`}
                    >
                      {t('apiKey.builderMode', 'Builder')}
                    </button>
                    <button
                      type="button"
                      onClick={() => switchEditorMode('json')}
                      className={`px-3 py-1.5 text-xs font-bold border rounded-sm transition-colors ${configEditorMode === 'json' ? 'border-blue-600 text-status-blue bg-status-blue-bg' : 'border-bd-strong text-body hover:bg-th-input'}`}
                    >
                      {t('apiKey.jsonMode', 'JSON')}
                    </button>
                  </div>
                </div>

                <div className="space-y-3 bg-th-page border border-bd-strong p-4">
                  {configEditorMode === 'builder' ? (
                    <>
                      <div className="space-y-3">
                        {configFields.length === 0 ? (
                          <p className="text-sm text-muted font-bold">{t('apiKey.noBuilderRows', 'No config rows yet. Click Add row.')}</p>
                        ) : (
                          configFields.map((field) => (
                            <div key={field.id} className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-end bg-th-card p-3 border border-bd">
                              <div className="lg:col-span-5">
                                <label className="block text-xs font-bold text-muted mb-2">{t('apiKey.pathLabel', 'Path')}</label>
                                <input
                                  type="text"
                                  className="w-full px-3 py-2 border border-bd focus:outline-none focus:border-blue-500 text-sm transition-colors font-mono"
                                  placeholder={t('apiKey.pathPlaceholder', 'e.g. chatPolicy.runtimeContextBudget')}
                                  value={field.path}
                                  onChange={(e) => updateConfigField(field.id, { path: e.target.value })}
                                />
                              </div>
                              <div className="lg:col-span-3">
                                <label className="block text-xs font-bold text-muted mb-2">{t('apiKey.typeLabel', 'Type')}</label>
                                <select
                                  className="w-full px-3 py-2 border border-bd focus:outline-none focus:border-blue-500 text-sm transition-colors bg-th-card font-mono"
                                  value={field.type}
                                  onChange={(e) => updateConfigField(field.id, { type: e.target.value as ConfigFieldType, value: e.target.value === 'boolean' ? 'false' : (e.target.value === 'null' ? '' : field.value) })}
                                >
                                  <option value="string">string</option>
                                  <option value="number">number</option>
                                  <option value="boolean">boolean</option>
                                  <option value="null">null</option>
                                  <option value="json">json</option>
                                </select>
                              </div>
                              <div className="lg:col-span-3">
                                <label className="block text-xs font-bold text-muted mb-2">{t('apiKey.value')}</label>
                                {field.type === 'boolean' ? (
                                  <select
                                    className="w-full px-3 py-2 border border-bd focus:outline-none focus:border-blue-500 text-sm transition-colors bg-th-card font-mono"
                                    value={field.value || 'false'}
                                    onChange={(e) => updateConfigField(field.id, { value: e.target.value })}
                                  >
                                    <option value="true">true</option>
                                    <option value="false">false</option>
                                  </select>
                                ) : field.type === 'null' ? (
                                  <input
                                    type="text"
                                    disabled
                                    className="w-full px-3 py-2 border border-bd text-sm bg-th-input text-muted font-mono"
                                    value="null"
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-bd focus:outline-none focus:border-blue-500 text-sm transition-colors font-mono"
                                    placeholder={field.type === 'json' ? '{...} or [...]' : t('apiKey.value')}
                                    value={field.value}
                                    onChange={(e) => updateConfigField(field.id, { value: e.target.value })}
                                  />
                                )}
                              </div>
                              <div className="lg:col-span-1">
                                <button
                                  type="button"
                                  onClick={() => removeConfigField(field.id)}
                                  className="w-full px-2 py-2 border border-red-500 text-status-red hover:bg-status-red-bg transition-colors font-bold text-sm"
                                  title={t('apiKey.removeProperty')}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={addConfigField}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-status-blue border border-blue-600 hover:bg-status-blue-bg transition-colors rounded-sm"
                        >
                          <Plus size={16} /> {t('apiKey.addRow', 'Add row')}
                        </button>
                      </div>
                    </>
                  ) : (
                    <textarea
                      className="w-full min-h-[220px] px-4 py-3 border border-bd-strong bg-th-card focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm leading-6"
                      value={configJsonText}
                      onChange={(e) => setConfigJsonText(e.target.value)}
                      spellCheck={false}
                      placeholder={t(
                        'apiKey.configJsonPlaceholder',
                        '{\n  "model": "mistral-small-latest",\n  "contextWindow": 200000,\n  "chatPolicy": {\n    "runtimeContextBudget": 24000,\n    "reservedOutputRatio": 0.08\n  }\n}'
                      )}
                    />
                  )}
                  <p className="text-xs text-muted">
                    {t('apiKey.configJsonHint', 'Supports nested JSON objects. Numbers and booleans are preserved as JSON types.')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-th-card p-4 border border-bd-strong">
                <input
                  id="isActive"
                  type="checkbox"
                  className="h-4 w-4 border-bd-strong focus:ring-blue-500"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <label htmlFor="isActive" className="text-sm font-bold text-heading">{t('apiKey.enableConfig')}</label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 border border-blue-600 bg-status-blue-solid text-white font-bold disabled:opacity-60 hover:bg-status-blue-solid-hover transition-colors cursor-pointer rounded-sm"
                >{saving ? t('apiKey.saving') : (isEditMode ? t('apiKey.update') : t('apiKey.save'))}</button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetForm() }}
                  className="px-6 py-2 border border-bd-strong text-body font-bold hover:bg-th-input transition-colors cursor-pointer rounded-sm"
                >{t('apiKey.cancel')}</button>
              </div>
            </form>
          </div>
        )}

        {/* ========== LIST SECTION ========== */}
        <div className="mb-6">
          <p className="text-sm text-[var(--text-secondary)]">{t('apiKey.apiKeysOrganized')}</p>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <span className="text-sm font-bold text-muted">{t('apiKey.loading')}</span>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 bg-th-card border border-bd-strong">
            <p className="text-heading font-bold text-lg mb-1">{t('apiKey.noApiKeys')}</p>
            <p className="text-sm text-muted">{t('apiKey.getStarted')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {[AIUsageType.StructureGeneration, AIUsageType.ContentGeneration, AIUsageType.Verification, AIUsageType.Assistant, AIUsageType.DocumentExtraction].map((usageType) => {
              const typeInfo = getUsageTypeInfo(usageType)
              const tieredItems = groupedItems[usageType] || { free: [], paid: [] }
              const totalConfigs = tieredItems.free.length + tieredItems.paid.length
              const isExpanded = expandedGroups.has(usageType)
              const tierSections: Array<{ key: 'free' | 'paid'; label: string; value: AccessTier; items: any[] }> = [
                { key: 'free', label: t('apiKey.tierFree'), value: AccessTier.Free, items: tieredItems.free },
                { key: 'paid', label: t('apiKey.tierPaid'), value: AccessTier.Paid, items: tieredItems.paid },
              ]
              
              return (
                <div key={usageType} className="bg-th-card border border-bd-strong mb-4 transition-colors">
                  {/* Group Header */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(usageType)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-th-page transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <typeInfo.icon className="w-5 h-5 flex-shrink-0" style={{ color: typeInfo.color }} />
                      <div className="text-left flex items-center gap-2">
                        <h3 className="text-sm font-bold text-heading uppercase">{typeInfo.label}</h3>
                        <p className="text-xs text-muted">
                          [{totalConfigs} {t('apiKey.cfg')}]
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="font-bold text-sm text-muted group-hover:text-black">
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>
                  </button>

                  {/* Group Content */}
                  {isExpanded && totalConfigs > 0 && (
                    <div className="border-t border-bd bg-th-page">
                      <div className="p-4 space-y-3">
                        {tierSections.map((tierSection) => (
                          <div key={tierSection.key} className="bg-th-card border border-bd-strong">
                            <div className="px-3 py-2 border-b border-bd flex items-center justify-between bg-th-input">
                              <h4 className="text-xs font-bold text-heading uppercase">{tierSection.label}</h4>
                              <span className="text-xs text-muted">[{tierSection.items.length} {t('apiKey.cfg')}]</span>
                            </div>

                            <div className="p-3 space-y-3">
                              {tierSection.items.length === 0 && (
                                <p className="text-xs text-muted">{t('apiKey.noConfigsInTier')}</p>
                              )}

                              {tierSection.items.map((it: any, idx: number) => {
                                const name = it.providerName ?? it.provider ?? '—'
                                const cj = it.configJson ?? it.GroqSettings ?? {}
                                const itemExpanded = expandedIndex === `${usageType}-${tierSection.key}-${idx}`
                                const enabled = typeof it.isActive === 'boolean' ? it.isActive : false

                                return (
                                  <div key={`${tierSection.key}-${name}-${idx}`} className="bg-th-card border border-bd-strong transition-all">
                                    <div className="p-3">
                                      <div className="flex flex-wrap items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                          <div className="flex items-center gap-2">
                                            <typeInfo.icon className="w-4 h-4 text-placeholder" />
                                            <h4 className="text-sm font-bold text-heading truncate">{name}</h4>
                                            <span className={`px-2 py-0.5 text-xs font-bold border rounded-sm ${enabled ? 'border-green-600 text-status-green-dark bg-status-green-bg' : 'border-bd-strong text-muted bg-th-input'}`}>
                                              {enabled ? t('apiKey.active') : t('apiKey.inactive')}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => handleSelectKey(it.configId ?? it.id ?? '', usageType, tierSection.value)}
                                            disabled={enabled}
                                            className={`px-3 py-1 text-xs font-bold border transition-colors rounded-sm flex items-center gap-1 ${
                                              enabled
                                                ? 'border-bd-strong text-placeholder bg-th-input cursor-not-allowed'
                                                : 'border-blue-600 text-status-blue hover:bg-status-blue-bg cursor-pointer'
                                            }`}
                                          >
                                            {enabled ? <CheckCircle size={14} /> : <ChevronRight size={14} />}
                                            {enabled ? t('apiKey.selected') : t('apiKey.select')}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setExpandedIndex(itemExpanded ? null : `${usageType}-${tierSection.key}-${idx}`)}
                                            className="px-3 py-1 border border-bd-strong text-label text-xs font-bold hover:bg-th-input cursor-pointer transition-colors rounded-sm flex items-center gap-1"
                                          >
                                            {itemExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            {t('apiKey.details')}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => startEdit(it)}
                                            className="px-3 py-1 border border-bd-strong text-body text-xs font-bold hover:bg-th-input cursor-pointer transition-colors rounded-sm flex items-center gap-1"
                                          >
                                            <Edit size={14} />
                                            {t('apiKey.edit')}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => name !== '—' && onDelete(name)}
                                            className="px-3 py-1 border border-red-500 text-status-red text-xs font-bold hover:bg-status-red-bg cursor-pointer transition-colors rounded-sm flex items-center gap-1"
                                          >
                                            <Trash2 size={14} />
                                            {t('apiKey.delete')}
                                          </button>
                                        </div>
                                      </div>
                                    </div>

                                    {itemExpanded && (
                                      <div className="border-t border-bd bg-th-card px-4 py-3">
                                        <div className="space-y-4">
                                          {Object.keys(cj).length > 0 && (
                                            <div>
                                              <div className="text-xs font-bold text-muted uppercase mb-1">{t('apiKey.configJsonLabel')}</div>
                                              <pre className="bg-th-page px-3 py-3 border border-bd text-xs leading-6 text-heading overflow-x-auto whitespace-pre-wrap break-words">
{JSON.stringify(cj, null, 2)}
                                              </pre>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      </div>
    </Layout>
  )
}

export default AdminApiKeyPage
