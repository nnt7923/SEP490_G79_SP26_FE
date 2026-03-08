
import React, { useEffect, useState } from 'react'
import Layout from '../../../../components/Layout'
import { getAdminSidebarConfig } from '../components/AdminSideBar'
import { AIConfigService, AIUsageType } from '../../../../services'
import { LayoutTemplate, FileText, CheckCircle, MessageSquare } from 'lucide-react'

const AdminApiKeyPage: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>('')
  const [notice, setNotice] = useState<string>('')

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
        return { label: 'Structure Generation', color: 'var(--color-hex-42)', borderColor: 'var(--color-hex-42)', icon: LayoutTemplate }
      case AIUsageType.ContentGeneration:
        return { label: 'Content Generation', color: 'var(--blue-500)', borderColor: 'var(--blue-500)', icon: FileText }
      case AIUsageType.Verification:
        return { label: 'Verification', color: 'var(--color-hex-44)', borderColor: 'var(--color-hex-44)', icon: CheckCircle }
      case AIUsageType.Assistant:
        return { label: 'Assistant', color: 'var(--color-hex-28)', borderColor: 'var(--color-hex-28)', icon: MessageSquare }
      default:
        return { label: 'Unknown', color: 'var(--text-secondary)', borderColor: 'var(--text-secondary)', icon: LayoutTemplate }
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
      setError(e?.message || 'Failed to load API keys')
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
      setNotice('Configuration added successfully')
    } catch (e: any) {
      setError(e?.message || 'Create failed')
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
    
    // Set aiUsageType
    const usageType = it.aiUsageType ?? AIUsageType.StructureGeneration
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
      const payload = {
        providerName,
        apiKey,
        aiUsageType,
        isActive,
        additionalProps,
      }
      await AIConfigService.putAIConfigById(configId, payload as any)
      setShowForm(false)
      resetForm()
      await fetchList()
      setNotice('Configuration updated successfully')
    } catch (e: any) {
      setError(e?.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (name: string) => {
    setError('')
    setNotice('Deleting configuration...')
    try {
      await AIConfigService.deleteAIConfig(name)
      if (expandedIndex !== null) setExpandedIndex(null)
      await fetchList()
      setNotice('Configuration deleted successfully')
    } catch (e: any) {
      setError(e?.message || 'Delete failed')
      setNotice('')
    }
  }

  const sidebarConfig = {
    navItems: getAdminSidebarConfig() as any,
    brand: { name: 'API Key', subtitle: 'Admin' },
  }

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="px-4 py-8 bg-[var(--gray-100)] min-h-screen font-mono">
        <div className="max-w-6xl mx-auto space-y-6">
           {/* ========== PAGE HEADER ========== */}
           <div className="mb-6 border-b border-gray-300 pb-4">
             <div className="flex items-center justify-between gap-4">
               <div>
                 <h1 className="text-2xl font-bold text-gray-900 border-none bg-transparent">
                   <span className="text-blue-600 mr-2">{'>_'}</span>
                   api_keys
                 </h1>
                 <p className="text-gray-500 mt-2">
                   <span className="text-gray-400 mr-2">{'//'}</span>
                   manage AI provider configurations
                 </p>
               </div>
               <button
                 type="button"
                 onClick={() => { setShowForm((s) => !s); setIsEditMode(false); resetForm() }}
                 className="px-6 py-2 border border-blue-600 bg-white text-blue-600 font-bold hover:bg-blue-50 transition-colors cursor-pointer"
               >{showForm && !isEditMode ? '[ close ]' : '[ + add_key ]'}</button>
             </div>
           </div>

        {/* ========== ALERTS ========== */}
        {error && (
          <div className="mb-6 text-sm text-red-700 bg-red-50 border-l-4 border-red-500 rounded-r-lg px-4 py-3" role="alert">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}
        {notice && (
          <div className="mb-6 text-sm text-green-700 bg-green-50 border-l-4 border-green-500 rounded-r-lg px-4 py-3" role="status">
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
          <div className="mb-8 bg-white border border-gray-400">
            <div className="bg-gray-100 px-6 py-4 border-b border-gray-400">
              <h2 className="text-lg font-bold text-gray-900">
                {isEditMode ? '[ edit_configuration ]' : '[ add_new_configuration ]'}
              </h2>
            </div>
            <form onSubmit={isEditMode ? onUpdate : onSave} className="p-6 space-y-6 lg:w-4/5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">provider_name:</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-400 bg-white focus:outline-none focus:border-blue-500 transition-colors font-mono"
                    placeholder="e.g. Groq, OpenAI"
                    value={providerName}
                    onChange={(e) => setProviderName(e.target.value)}
                    disabled={isEditMode}
                    readOnly={isEditMode}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">api_key:</label>
                  <input
                    type="password"
                    className="w-full px-4 py-2 border border-gray-400 bg-white focus:outline-none focus:border-blue-500 transition-colors font-mono"
                    placeholder="secret_key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">ai_usage_type:</label>
                <select
                  className="w-full px-4 py-2 border border-gray-400 focus:outline-none focus:border-blue-500 transition-colors bg-white font-mono"
                  value={aiUsageType}
                  onChange={(e) => setAiUsageType(Number(e.target.value) as AIUsageType)}
                >
                  <option value={AIUsageType.StructureGeneration}>StructureGeneration</option>
                  <option value={AIUsageType.ContentGeneration}>ContentGeneration</option>
                  <option value={AIUsageType.Verification}>Verification</option>
                  <option value={AIUsageType.Assistant}>Assistant</option>
                </select>
                <p className="text-xs text-gray-500 mt-2">{'//'} Select primary usage type</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-bold text-gray-700">additional_props:</label>
                  <button
                    type="button"
                    onClick={addAdditionalProp}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-blue-600 border border-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    [+] prop
                  </button>
                </div>

                <div className="space-y-3 bg-gray-50 border border-gray-400 p-4">
                  {additionalProps.length === 0 ? (
                    <p className="text-sm text-gray-500 font-bold">{'//'} no_properties. click_to_add()</p>
                  ) : (
                    additionalProps.map((prop, idx) => (
                      <div key={idx} className="flex gap-3 items-end bg-white p-3 border border-gray-300">
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-gray-500 mb-2">key:</label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-500 text-sm transition-colors font-mono"
                            placeholder="e.g. Model"
                            value={prop.key}
                            onChange={(e) => updateAdditionalProp(idx, 'key', e.target.value)}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-gray-500 mb-2">value:</label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-blue-500 text-sm transition-colors font-mono"
                            placeholder="e.g. gpt-4"
                            value={prop.value}
                            onChange={(e) => updateAdditionalProp(idx, 'value', e.target.value)}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAdditionalProp(idx)}
                          className="px-3 py-2 border border-red-500 text-red-600 hover:bg-red-50 transition-colors font-bold text-sm"
                          title="Remove property"
                        >
                          [x]
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white p-4 border border-gray-400">
                <input
                  id="isActive"
                  type="checkbox"
                  className="h-4 w-4 border-gray-400 focus:ring-blue-500"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <label htmlFor="isActive" className="text-sm font-bold text-gray-900">enable_config</label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 border border-blue-600 bg-blue-600 text-white font-bold disabled:opacity-60 hover:bg-blue-700 transition-colors cursor-pointer"
                >{saving ? '[ saving... ]' : (isEditMode ? '[ update ]' : '[ save ]')}</button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetForm() }}
                  className="px-6 py-2 border border-gray-400 text-gray-700 font-bold hover:bg-gray-100 transition-colors cursor-pointer"
                >[ cancel ]</button>
              </div>
            </form>
          </div>
        )}

        {/* ========== LIST SECTION ========== */}
        <div className="mb-6">
          <p className="text-sm text-[var(--text-secondary)]">API keys organized by usage type. Expand each category to view and manage configurations.</p>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <span className="text-sm font-bold text-gray-500">loading_configs...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 bg-white border border-gray-400">
            <p className="text-gray-900 font-bold text-lg mb-1">no_api_keys_configured()</p>
            <p className="text-sm text-gray-500">{'//'} Get started by adding your first AI provider configuration</p>
          </div>
        ) : (
          <div className="space-y-3">
            {[AIUsageType.StructureGeneration, AIUsageType.ContentGeneration, AIUsageType.Verification, AIUsageType.Assistant].map((usageType) => {
              const typeInfo = getUsageTypeInfo(usageType)
              const groupItems = groupedItems[usageType] || []
              const isExpanded = expandedGroups.has(usageType)
              
              return (
                <div key={usageType} className="bg-white border border-gray-400 mb-4 transition-colors">
                  {/* Group Header */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(usageType)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <typeInfo.icon className="w-5 h-5 flex-shrink-0" style={{ color: typeInfo.color }} />
                      <div className="text-left flex items-center gap-2">
                        <h3 className="text-sm font-bold text-gray-900 uppercase">{typeInfo.label}</h3>
                        <p className="text-xs text-gray-500">
                           [{groupItems.length} cfg]
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="font-bold text-sm text-gray-500 group-hover:text-black">
                        {isExpanded ? '[-]' : '[+]'}
                      </div>
                    </div>
                  </button>

                  {/* Group Content */}
                  {isExpanded && groupItems.length > 0 && (
                    <div className="border-t border-gray-300 bg-gray-50">
                      <div className="p-4 space-y-3">
                        {groupItems.map((it: any, idx: number) => {
                          const name = it.providerName ?? it.provider ?? '—'
                          const key = it.apiKey ?? it.ApiKey ?? ''
                          const masked = maskKey(key)
                          const cj = it.configJson ?? it.GroqSettings ?? {}
                          const itemExpanded = expandedIndex === `${usageType}-${idx}`
                          const enabled = typeof it.isActive === 'boolean' ? it.isActive : false
                          
                          return (
                            <div key={`${name}-${idx}`} className="bg-white border border-gray-400 transition-all">
                              <div className="p-3">
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                      <typeInfo.icon className="w-4 h-4 text-gray-400" />
                                      <h4 className="text-sm font-bold text-gray-900 truncate">{name}</h4>
                                      <span className={`px-2 py-0.5 text-xs font-bold border ${enabled ? 'border-green-600 text-green-700 bg-green-50' : 'border-gray-400 text-gray-500 bg-gray-100'}`}>
                                        {enabled ? '[active]' : '[inactive]'}
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
                                          ? 'border-gray-400 text-gray-400 bg-gray-100 cursor-not-allowed' 
                                          : 'border-blue-600 text-blue-600 hover:bg-blue-50 cursor-pointer'
                                      }`}
                                    >
                                      {enabled ? '[ selected ]' : '[ select ]'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setExpandedIndex(itemExpanded ? null : `${usageType}-${idx}`)}
                                      className="px-2 py-1 border border-gray-400 text-gray-600 text-xs font-bold hover:bg-gray-100 cursor-pointer transition-colors"
                                    >
                                      {itemExpanded ? '[-]' : '[+]'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => startEdit(it)}
                                      className="px-2 py-1 border border-gray-400 text-gray-700 text-xs font-bold hover:bg-gray-100 cursor-pointer transition-colors"
                                    >
                                      [ edit ]
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => name !== '—' && onDelete(name)}
                                      className="px-2 py-1 border border-red-500 text-red-600 text-xs font-bold hover:bg-red-50 cursor-pointer transition-colors"
                                    >
                                      [ delete ]
                                    </button>
                                  </div>
                                </div>
                              </div>
                              
                              {itemExpanded && (
                                <div className="border-t border-gray-300 bg-white px-4 py-3">
                                  <div className="space-y-4">
                                    {/* API Key Section */}
                                    <div>
                                      <div className="text-xs font-bold text-gray-500 uppercase mb-1">api_key:</div>
                                      <div className="bg-gray-50 px-3 py-2 border border-gray-300">
                                        <div className="font-mono text-xs text-gray-800 break-all">{masked || '—'}</div>
                                      </div>
                                    </div>
                                    
                                    {/* Configuration Section */}
                                    {Object.keys(cj).length > 0 && (
                                      <div>
                                        <div className="text-xs font-bold text-gray-500 uppercase mb-1">config_json:</div>
                                        <div className="grid grid-cols-2 gap-2">
                                          {Object.entries(cj).map(([key, value]) => (
                                            <div key={key} className="bg-gray-50 px-3 py-2 border border-gray-300">
                                              <div className="text-xs font-bold text-gray-500 mb-0.5">{key}:</div>
                                              <div className="text-sm font-bold text-gray-900 truncate">{String(value)}</div>
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
