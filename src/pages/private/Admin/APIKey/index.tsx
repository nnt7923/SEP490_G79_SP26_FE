
import React, { useEffect, useState } from 'react'
import Layout from '../../../../components/Layout'
import { getAdminSidebarConfig } from '../components/AdminSideBar'
import { AIConfigService, AIUsageType } from '../../../../services'
import { X, Plus, ChevronDown, ChevronRight, Sparkles, FileText, CheckCircle, Bot } from 'lucide-react'

const AdminApiKeyPage: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>('')
  const [notice, setNotice] = useState<string>('')

  // List of configs from backend
  const [items, setItems] = useState<any[]>([])
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  
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
  const [editingProvider, setEditingProvider] = useState<string>('')

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
        return { label: 'Structure Generation', icon: Sparkles, color: '#8b5cf6', bgColor: '#f5f3ff', borderColor: '#e9d5ff' }
      case AIUsageType.ContentGeneration:
        return { label: 'Content Generation', icon: FileText, color: '#3b82f6', bgColor: '#eff6ff', borderColor: '#dbeafe' }
      case AIUsageType.Verification:
        return { label: 'Verification', icon: CheckCircle, color: '#10b981', bgColor: '#f0fdf4', borderColor: '#d1fae5' }
      case AIUsageType.Assistant:
        return { label: 'Assistant', icon: Bot, color: '#f59e0b', bgColor: '#fffbeb', borderColor: '#fef3c7' }
      default:
        return { label: 'Unknown', icon: Sparkles, color: '#6b7280', bgColor: '#f9fafb', borderColor: '#e5e7eb' }
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
    setEditingProvider('')
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
    setEditingProvider(name)

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
    navItems: getAdminSidebarConfig(),
    brand: { name: 'API Key', subtitle: 'Admin' },
  }

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="px-4 py-6 bg-gradient-to-br from-[#f9fafb] to-[#f3f4f6] min-h-screen max-w-6xl mx-auto">
           {/* ========== PAGE HEADER ========== */}
           <div className="mb-8">
             <div className="bg-gradient-to-r from-[#2f80ed] via-[#7c3aed] to-[#2f80ed] rounded-2xl overflow-hidden shadow-lg">
               <div className="px-8 py-8">
                 <div className="flex items-center justify-between">
                   <div>
                     <h1 className="text-3xl font-bold text-white mb-2">API Keys</h1>
                     <p className="text-white/80 text-sm">Manage AI provider configurations</p>
                   </div>
                   <button
                     type="button"
                     onClick={() => { setShowForm((s) => !s); setIsEditMode(false); resetForm() }}
                     className="px-6 py-3 rounded-lg bg-white text-[#2f80ed] font-semibold hover:bg-white/90 transition-all duration-200 shadow-md hover:shadow-lg"
                   >{showForm && !isEditMode ? 'Close' : '+ Add API Key'}</button>
                 </div>
               </div>
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
          <div className="mb-8 bg-white rounded-2xl shadow-lg border border-[#e5e7eb] overflow-hidden">
            <div className="bg-gradient-to-r from-[#f0f4ff] to-[#f5f0ff] px-8 py-6 border-b border-[#e5e7eb]">
              <h2 className="text-xl font-bold text-[#111827]">{isEditMode ? 'Edit Configuration' : 'Add New Configuration'}</h2>
            </div>
            <form onSubmit={isEditMode ? onUpdate : onSave} className="p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-[#111827] mb-2">Provider Name</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2f80ed] focus:border-transparent transition-all"
                    placeholder="e.g., Groq, OpenAI, Claude"
                    value={providerName}
                    onChange={(e) => setProviderName(e.target.value)}
                    disabled={isEditMode}
                    readOnly={isEditMode}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#111827] mb-2">API Key</label>
                  <input
                    type="password"
                    className="w-full px-4 py-2.5 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2f80ed] focus:border-transparent transition-all"
                    placeholder="Enter API Key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#111827] mb-2">AI Usage Type</label>
                <select
                  className="w-full px-4 py-2.5 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2f80ed] focus:border-transparent transition-all bg-white"
                  value={aiUsageType}
                  onChange={(e) => setAiUsageType(Number(e.target.value) as AIUsageType)}
                >
                  <option value={AIUsageType.StructureGeneration}>Structure Generation</option>
                  <option value={AIUsageType.ContentGeneration}>Content Generation</option>
                  <option value={AIUsageType.Verification}>Verification</option>
                  <option value={AIUsageType.Assistant}>Assistant</option>
                </select>
                <p className="text-xs text-[#6b7280] mt-1.5">Select the primary usage type for this AI configuration</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-semibold text-[#111827]">Additional Properties</label>
                  <button
                    type="button"
                    onClick={addAdditionalProp}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border-2 border-[#2f80ed] text-[#2f80ed] hover:bg-[#f0f4ff] transition-all"
                  >
                    <Plus size={18} />
                    Add Property
                  </button>
                </div>

                <div className="space-y-3 bg-[#f9fafb] p-4 rounded-xl border border-[#e5e7eb]">
                  {additionalProps.length === 0 ? (
                    <p className="text-sm text-[#6b7280] text-center py-4">No properties yet. Click "Add Property" to configure model-specific settings.</p>
                  ) : (
                    additionalProps.map((prop, idx) => (
                      <div key={idx} className="flex gap-3 items-end bg-white p-3 rounded-lg border border-[#e5e7eb]">
                        <div className="flex-1">
                          <label className="block text-xs font-semibold text-[#6b7280] mb-1.5">Key</label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2f80ed] focus:border-transparent text-sm transition-all"
                            placeholder="e.g., Model, MaxTokens"
                            value={prop.key}
                            onChange={(e) => updateAdditionalProp(idx, 'key', e.target.value)}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-semibold text-[#6b7280] mb-1.5">Value</label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2f80ed] focus:border-transparent text-sm transition-all"
                            placeholder="e.g., gpt-4, 8192"
                            value={prop.value}
                            onChange={(e) => updateAdditionalProp(idx, 'value', e.target.value)}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAdditionalProp(idx)}
                          className="p-2.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-all"
                          title="Remove property"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 bg-[#f0f4ff] p-4 rounded-lg border border-[#dbeafe]">
                <input
                  id="isActive"
                  type="checkbox"
                  className="h-5 w-5 rounded border-[#2f80ed] text-[#2f80ed] focus:ring-[#2f80ed]"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <label htmlFor="isActive" className="text-sm font-medium text-[#111827]">Enable this configuration</label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-[#2f80ed] to-[#7c3aed] text-white font-semibold disabled:opacity-60 hover:shadow-lg transition-all"
                >{saving ? 'Saving...' : (isEditMode ? 'Update Configuration' : 'Save Configuration')}</button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetForm() }}
                  className="px-6 py-2.5 rounded-lg border border-[#e5e7eb] text-[#374151] font-semibold hover:bg-[#f9fafb] transition-all"
                >Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* ========== LIST SECTION ========== */}
        <div className="mb-6">
          <p className="text-sm text-[#6b7280]">API keys organized by usage type. Expand each category to view and manage configurations.</p>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="inline-flex flex-col items-center gap-4">
              <svg className="animate-spin h-8 w-8 text-[#2f80ed]" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-sm font-medium text-[#6b7280]">Loading configurations...</span>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-[#e5e7eb]">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#f3f4f6] flex items-center justify-center">
              <svg className="w-8 h-8 text-[#9ca3af]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <p className="text-[#111827] font-semibold text-lg mb-1">No API keys configured</p>
            <p className="text-sm text-[#6b7280]">Get started by adding your first AI provider configuration</p>
          </div>
        ) : (
          <div className="space-y-3">
            {[AIUsageType.StructureGeneration, AIUsageType.ContentGeneration, AIUsageType.Verification, AIUsageType.Assistant].map((usageType) => {
              const typeInfo = getUsageTypeInfo(usageType)
              const Icon = typeInfo.icon
              const groupItems = groupedItems[usageType] || []
              const isExpanded = expandedGroups.has(usageType)
              
              return (
                <div key={usageType} className="bg-white rounded-2xl border border-gray-200 shadow-sm transition-all hover:border-gray-300 hover:shadow-md">
                  {/* Group Header */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(usageType)}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-all cursor-pointer group rounded-t-2xl"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-2.5 rounded-2xl transition-all group-hover:scale-105"
                        style={{ 
                          backgroundColor: typeInfo.bgColor,
                          boxShadow: `0 0 0 1px ${typeInfo.borderColor}`
                        }}
                      >
                        <Icon size={20} style={{ color: typeInfo.color }} strokeWidth={2.5} />
                      </div>
                      <div className="text-left">
                        <h3 className="text-base font-bold text-gray-900">{typeInfo.label}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {groupItems.length === 0 ? 'No configurations' : `${groupItems.length} ${groupItems.length === 1 ? 'configuration' : 'configurations'}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {groupItems.length > 0 && (
                        <span 
                          className="px-2.5 py-1 rounded-full text-xs font-bold min-w-[28px] text-center"
                          style={{ 
                            backgroundColor: typeInfo.bgColor,
                            color: typeInfo.color
                          }}
                        >
                          {groupItems.length}
                        </span>
                      )}
                      <div className="p-1 rounded-lg group-hover:bg-gray-100 transition-colors">
                        {isExpanded ? (
                          <ChevronDown size={18} className="text-gray-500" />
                        ) : (
                          <ChevronRight size={18} className="text-gray-500" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Group Content */}
                  {isExpanded && groupItems.length > 0 && (
                    <div className="border-t border-gray-100 bg-gradient-to-b from-gray-50/30 to-white rounded-b-2xl">
                      <div className="p-4 space-y-3">
                        {groupItems.map((it, idx) => {
                          const name = it.providerName ?? it.provider ?? '—'
                          const key = it.apiKey ?? it.ApiKey ?? ''
                          const masked = maskKey(key)
                          const cj = it.configJson ?? it.GroqSettings ?? {}
                          const itemExpanded = expandedIndex === `${usageType}-${idx}`
                          const enabled = typeof it.isActive === 'boolean' ? it.isActive : false
                          
                          return (
                            <div key={`${name}-${idx}`} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:border-gray-300 hover:shadow-md transition-all">
                              <div className="p-4 rounded-t-2xl">
                                <div className="flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <h4 className="text-sm font-bold text-gray-900 truncate">{name}</h4>
                                        <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold flex-shrink-0 ${enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                          {enabled ? 'Active' : 'Inactive'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleSelectKey(name)}
                                      disabled={enabled}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                        enabled 
                                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                          : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                                      }`}
                                      title={enabled ? 'Already selected' : 'Select this configuration'}
                                    >
                                      {enabled ? 'Selected' : 'Select'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setExpandedIndex(itemExpanded ? null : `${usageType}-${idx}`)}
                                      className={`p-2 rounded-lg transition-all ${itemExpanded ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
                                      title={itemExpanded ? 'Hide details' : 'Show details'}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M18 10c0 4.418-3.582 8-8 8s-8-3.582-8-8 3.582-8 8-8 8 3.582 8 8zM9 9a1 1 0 112 0v6a1 1 0 11-2 0V9zm1-4a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd" />
                                      </svg>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => startEdit(it)}
                                      className="px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 text-xs font-medium hover:bg-gray-100 hover:text-gray-700 transition-all"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => name !== '—' && onDelete(name)}
                                      className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 hover:text-red-700 transition-all"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              </div>
                              
                              {itemExpanded && (
                                <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3 rounded-b-2xl">
                                  <div className="space-y-3">
                                    {/* API Key Section */}
                                    <div>
                                      <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">API Key</div>
                                      <div className="bg-white px-3 py-2 rounded-xl border border-gray-200">
                                        <div className="font-mono text-xs text-gray-600 tracking-wide break-all">{masked || '—'}</div>
                                      </div>
                                    </div>
                                    
                                    {/* Configuration Section */}
                                    {Object.keys(cj).length > 0 && (
                                      <div>
                                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Configuration</div>
                                        <div className="grid grid-cols-2 gap-2">
                                          {Object.entries(cj).map(([key, value]) => (
                                            <div key={key} className="bg-white px-3 py-2 rounded-xl border border-gray-200">
                                              <div className="text-xs font-semibold text-gray-500 mb-0.5 truncate">{key}</div>
                                              <div className="text-sm font-medium text-gray-900 truncate">{String(value)}</div>
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
    </Layout>
  )
}

export default AdminApiKeyPage
