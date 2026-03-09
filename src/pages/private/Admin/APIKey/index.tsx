
import React, { useEffect, useState } from 'react'
import Layout from '../../../../components/Layout'
import { useAdminSidebarConfig } from '../components/AdminSideBar'
import { AIConfigService, AIUsageType } from '../../../../services'
import { LayoutTemplate, FileText, CheckCircle, MessageSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'

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
    AIUsageType.Assistant
  ]))

  // Add/Edit form state
  const [showForm, setShowForm] = useState<boolean>(false)
  const [isEditMode, setIsEditMode] = useState<boolean>(false)

  const [configId, setConfigId] = useState<string>('')
  const [providerName, setProviderName] = useState<string>('')
  const [apiKey, setApiKey] = useState<string>('')
  const [isActive, setIsActive] = useState<boolean>(true)
  const [aiUsageType, setAiUsageType] = useState<AIUsageType>(AIUsageType.StructureGeneration)
  const [additionalProps, setAdditionalProps] = useState<Array<{ key: string; value: string }>>([])

  const maskKey = (key?: string) => (key ? key.replace(/.(?=.{4})/g, '*') : '')
  
  // Map string usageType from backend to enum
  const mapUsageTypeToEnum = (usageType: any): AIUsageType => {
    if (typeof usageType === 'number') return usageType as AIUsageType
    
    const typeStr = String(usageType || '').toLowerCase()
    if (typeStr.includes('structure')) return AIUsageType.StructureGeneration
    if (typeStr.includes('content')) return AIUsageType.ContentGeneration
    if (typeStr.includes('verif')) return AIUsageType.Verification
    if (typeStr.includes('assistant')) return AIUsageType.Assistant
    
    return AIUsageType.StructureGeneration
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
      default:
        return { label: t('apiKey.unknown'), color: 'var(--text-secondary)', borderColor: 'var(--text-secondary)', icon: LayoutTemplate }
    }
  }
  
  const groupedItems = items.reduce((acc, item) => {
    const usageType = mapUsageTypeToEnum(item.usageType ?? item.aiUsageType)
    if (!acc[usageType]) acc[usageType] = []
    acc[usageType].push(item)
    return acc
  }, {} as Record<AIUsageType, any[]>)
  
  const handleSelectKey = async (providerName: string) => {
    // TODO: Call API to select this key
    setNotice(`Selected: ${providerName}`)
  }

  const resetForm = () => {
    setConfigId('')
    setProviderName('')
    setApiKey('')
    setIsActive(true)
    setAiUsageType(AIUsageType.StructureGeneration)
    setAdditionalProps([])
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

  const addAdditionalProp = () => {
    setAdditionalProps([...additionalProps, { key: '', value: '' }])
  }

  const removeAdditionalProp = (index: number) => {
    setAdditionalProps(additionalProps.filter((_, i) => i !== index))
  }

  const updateAdditionalProp = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...additionalProps]
    updated[index][field] = val
    setAdditionalProps(updated)
  }

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const payload = {
        providerName,
        apiKey,
        aiUsageType,
        isActive,
        additionalProps,
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
    setApiKey(it.apiKey ?? it.ApiKey ?? '')
    
    // Set aiUsageType - use mapUsageTypeToEnum to handle backend response
    const usageType = mapUsageTypeToEnum(it.usageType ?? it.aiUsageType)
    setAiUsageType(usageType)
    
    // Convert additionalProps or configJson to additionalProps
    const props = it.additionalProps ?? (it.configJson ?? it.GroqSettings ?? {})
    if (Array.isArray(props)) {
      setAdditionalProps(props)
    } else {
      const propsArray = Object.entries(props).map(([key, value]) => ({
        key,
        value: String(value)
      }))
      setAdditionalProps(propsArray)
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
      // Convert additionalProps array to configJson object
      const configJson: Record<string, string> = {}
      additionalProps.forEach(prop => {
        if (prop.key && prop.value) {
          configJson[prop.key] = prop.value
        }
      })
      
      // Map aiUsageType enum to string for backend
      const getUsageTypeString = (type: AIUsageType): string => {
        switch (type) {
          case AIUsageType.StructureGeneration: return 'StructureGeneration'
          case AIUsageType.ContentGeneration: return 'ContentGeneration'
          case AIUsageType.Verification: return 'Verification'
          case AIUsageType.Assistant: return 'Assistant'
          default: return 'StructureGeneration'
        }
      }
      
      const payload = {
        apiKey,
        providerName,
        configJson,
        usageType: getUsageTypeString(aiUsageType),
        isActive,
      }
      await AIConfigService.putAIConfigById(configId, payload as any)
      setShowForm(false)
      resetForm()
      await fetchList()
      setNotice('Configuration updated successfully')
      
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
    brand: { name: 'API Key', subtitle: 'Admin' },
  }

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="px-4 py-8 bg-[var(--gray-100)] min-h-screen font-mono">
        <div className="max-w-6xl mx-auto space-y-6">
           {/* ========== PAGE HEADER ========== */}
           <div className="mb-6 border-b border-bd pb-4">
             <div className="flex items-center justify-between gap-4">
               <div>
                 <h1 className="text-2xl font-bold text-heading border-none bg-transparent">
                   <span className="text-status-blue mr-2">{'>_'}</span>
                    {t('apiKey.title')}
                 </h1>
                 <p className="text-muted mt-2">
                   <span className="text-placeholder mr-2">{'//'}</span>
                    {t('apiKey.subtitle')}
                 </p>
               </div>
               <button
                 type="button"
                 onClick={() => { setShowForm((s) => !s); setIsEditMode(false); resetForm() }}
                 className="px-6 py-2 border border-blue-600 bg-th-card text-status-blue font-bold hover:bg-status-blue-bg transition-colors cursor-pointer"
                >{showForm && !isEditMode ? `[ ${t('apiKey.close')} ]` : `[ ${t('apiKey.addKey')} ]`}</button>
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
            <div className="bg-th-input px-6 py-4 border-b border-bd-strong">
              <h2 className="text-lg font-bold text-heading">
                {isEditMode ? `[ ${t('apiKey.editConfiguration')} ]` : `[ ${t('apiKey.addNewConfiguration')} ]`}
              </h2>
            </div>
            <form onSubmit={isEditMode ? onUpdate : onSave} className="p-6 space-y-6 lg:w-4/5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-body mb-2">{t('apiKey.providerName')}</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-bd-strong bg-th-card focus:outline-none focus:border-blue-500 transition-colors font-mono"
                    placeholder="e.g. Groq, OpenAI"
                    value={providerName}
                    onChange={(e) => setProviderName(e.target.value)}
                    disabled={isEditMode}
                    readOnly={isEditMode}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-body mb-2">{t('apiKey.apiKeyLabel')}</label>
                  <input
                    type="password"
                    className="w-full px-4 py-2 border border-bd-strong bg-th-card focus:outline-none focus:border-blue-500 transition-colors font-mono"
                    placeholder="secret_key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-body mb-2">{t('apiKey.aiUsageType')}</label>
                <select
                  className="w-full px-4 py-2 border border-bd-strong focus:outline-none focus:border-blue-500 transition-colors bg-th-card font-mono"
                  value={aiUsageType}
                  onChange={(e) => setAiUsageType(Number(e.target.value) as AIUsageType)}
                >
                  <option value={AIUsageType.StructureGeneration}>StructureGeneration</option>
                  <option value={AIUsageType.ContentGeneration}>ContentGeneration</option>
                  <option value={AIUsageType.Verification}>Verification</option>
                  <option value={AIUsageType.Assistant}>Assistant</option>
                </select>
                <p className="text-xs text-muted mt-2">{'//'} {t('apiKey.selectUsageType')}</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-bold text-body">{t('apiKey.additionalProps')}</label>
                  <button
                    type="button"
                    onClick={addAdditionalProp}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-status-blue border border-blue-600 hover:bg-status-blue-bg transition-colors"
                  >
                    [+] {t('apiKey.addProp')}
                  </button>
                </div>

                <div className="space-y-3 bg-th-page border border-bd-strong p-4">
                  {additionalProps.length === 0 ? (
                    <p className="text-sm text-muted font-bold">{'//'} {t('apiKey.noProperties')}</p>
                  ) : (
                    additionalProps.map((prop, idx) => (
                      <div key={idx} className="flex gap-3 items-end bg-th-card p-3 border border-bd">
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-muted mb-2">key:</label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-bd focus:outline-none focus:border-blue-500 text-sm transition-colors font-mono"
                            placeholder="e.g. Model"
                            value={prop.key}
                            onChange={(e) => updateAdditionalProp(idx, 'key', e.target.value)}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-muted mb-2">value:</label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-bd focus:outline-none focus:border-blue-500 text-sm transition-colors font-mono"
                            placeholder="e.g. gpt-4"
                            value={prop.value}
                            onChange={(e) => updateAdditionalProp(idx, 'value', e.target.value)}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAdditionalProp(idx)}
                          className="px-3 py-2 border border-red-500 text-status-red hover:bg-status-red-bg transition-colors font-bold text-sm"
                          title="Remove property"
                        >
                          [x]
                        </button>
                      </div>
                    ))
                  )}
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
                  className="px-6 py-2 border border-blue-600 bg-status-blue-solid text-white font-bold disabled:opacity-60 hover:bg-status-blue-solid-hover transition-colors cursor-pointer"
                >{saving ? `[ ${t('apiKey.saving')} ]` : (isEditMode ? `[ ${t('apiKey.update')} ]` : `[ ${t('apiKey.save')} ]`)}</button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetForm() }}
                  className="px-6 py-2 border border-bd-strong text-body font-bold hover:bg-th-input transition-colors cursor-pointer"
                >[ {t('apiKey.cancel')} ]</button>
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
            <p className="text-sm text-muted">{'//'} {t('apiKey.getStarted')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {[AIUsageType.StructureGeneration, AIUsageType.ContentGeneration, AIUsageType.Verification, AIUsageType.Assistant].map((usageType) => {
              const typeInfo = getUsageTypeInfo(usageType)
              const groupItems = groupedItems[usageType] || []
              const isExpanded = expandedGroups.has(usageType)
              
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
                           [{groupItems.length} cfg]
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="font-bold text-sm text-muted group-hover:text-black">
                        {isExpanded ? '[-]' : '[+]'}
                      </div>
                    </div>
                  </button>

                  {/* Group Content */}
                  {isExpanded && groupItems.length > 0 && (
                    <div className="border-t border-bd bg-th-page">
                      <div className="p-4 space-y-3">
                        {groupItems.map((it: any, idx: number) => {
                          const name = it.providerName ?? it.provider ?? '—'
                          const key = it.apiKey ?? it.ApiKey ?? ''
                          const masked = maskKey(key)
                          const cj = it.configJson ?? it.GroqSettings ?? {}
                          const itemExpanded = expandedIndex === `${usageType}-${idx}`
                          const enabled = typeof it.isActive === 'boolean' ? it.isActive : false
                          
                          return (
                            <div key={`${name}-${idx}`} className="bg-th-card border border-bd-strong transition-all">
                              <div className="p-3">
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                      <typeInfo.icon className="w-4 h-4 text-placeholder" />
                                      <h4 className="text-sm font-bold text-heading truncate">{name}</h4>
                                      <span className={`px-2 py-0.5 text-xs font-bold border ${enabled ? 'border-green-600 text-status-green-dark bg-status-green-bg' : 'border-bd-strong text-muted bg-th-input'}`}>
                                        {enabled ? `[${t('apiKey.active')}]` : `[${t('apiKey.inactive')}]`}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleSelectKey(name)}
                                      disabled={enabled}
                                      className={`px-2 py-1 text-xs font-bold border transition-colors ${
                                        enabled 
                                          ? 'border-bd-strong text-placeholder bg-th-input cursor-not-allowed' 
                                          : 'border-blue-600 text-status-blue hover:bg-status-blue-bg cursor-pointer'
                                      }`}
                                    >
                                      {enabled ? `[ ${t('apiKey.selected')} ]` : `[ ${t('apiKey.select')} ]`}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setExpandedIndex(itemExpanded ? null : `${usageType}-${idx}`)}
                                      className="px-2 py-1 border border-bd-strong text-label text-xs font-bold hover:bg-th-input cursor-pointer transition-colors"
                                    >
                                      {itemExpanded ? '[-]' : '[+]'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => startEdit(it)}
                                      className="px-2 py-1 border border-bd-strong text-body text-xs font-bold hover:bg-th-input cursor-pointer transition-colors"
                                    >
                                      [ {t('apiKey.edit')} ]
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => name !== '—' && onDelete(name)}
                                      className="px-2 py-1 border border-red-500 text-status-red text-xs font-bold hover:bg-status-red-bg cursor-pointer transition-colors"
                                    >
                                      [ {t('apiKey.delete')} ]
                                    </button>
                                  </div>
                                </div>
                              </div>
                              
                              {itemExpanded && (
                                <div className="border-t border-bd bg-th-card px-4 py-3">
                                  <div className="space-y-4">
                                    {/* API Key Section */}
                                    <div>
                                      <div className="text-xs font-bold text-muted uppercase mb-1">api_key:</div>
                                      <div className="bg-th-page px-3 py-2 border border-bd">
                                        <div className="font-mono text-xs text-heading break-all">{masked || '—'}</div>
                                      </div>
                                    </div>
                                    
                                    {/* Configuration Section */}
                                    {Object.keys(cj).length > 0 && (
                                      <div>
                                        <div className="text-xs font-bold text-muted uppercase mb-1">config_json:</div>
                                        <div className="grid grid-cols-2 gap-2">
                                          {Object.entries(cj).map(([key, value]) => (
                                            <div key={key} className="bg-th-page px-3 py-2 border border-bd">
                                              <div className="text-xs font-bold text-muted mb-0.5">{key}:</div>
                                              <div className="text-sm font-bold text-heading truncate">{String(value)}</div>
                                            </div>
                                          ))}
                                        </div>
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
