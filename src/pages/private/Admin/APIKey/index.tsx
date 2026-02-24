import React, { useEffect, useState } from 'react'
import Layout from '../../../../components/Layout'
import { getAdminSidebarConfig } from '../components/AdminSideBar'
import { AIConfigService } from '../../../../services'
import { X, Plus } from 'lucide-react'

const AdminApiKeyPage: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>('')
  const [notice, setNotice] = useState<string>('')

  // List of configs from backend
  const [items, setItems] = useState<any[]>([])
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  // Add/Edit form state
  const [showForm, setShowForm] = useState<boolean>(false)
  const [isEditMode, setIsEditMode] = useState<boolean>(false)
  const [editingProvider, setEditingProvider] = useState<string>('')

  const [providerName, setProviderName] = useState<string>('')
  const [apiKey, setApiKey] = useState<string>('')
  const [isEnabel, setIsEnabel] = useState<boolean>(true)
  const [additionalProps, setAdditionalProps] = useState<Array<{ key: string; value: string }>>([])

  const maskKey = (key?: string) => (key ? key.replace(/.(?=.{4})/g, '*') : '')

  const resetForm = () => {
    setProviderName('')
    setApiKey('')
    setIsEnabel(true)
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
      // Build configJson from additional properties
      const configJson: Record<string, any> = {}
      additionalProps.forEach(prop => {
        if (prop.key.trim()) {
          // Try to parse as number, otherwise keep as string
          const numValue = Number(prop.value)
          configJson[prop.key] = isNaN(numValue) ? prop.value : numValue
        }
      })

      const payload = {
        providerName,
        apiKey,
        configJson,
        isEnabled: isEnabel,
        isEnabel,
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

  const startEdit = (it: any, idx: number) => {
    setShowForm(true)
    setIsEditMode(true)
    const name = it.providerName ?? it.provider ?? ''
    setEditingProvider(name)

    setProviderName(name)
    setApiKey(it.apiKey ?? it.ApiKey ?? '')
    
    // Convert configJson to additionalProps
    const cj = it.configJson ?? it.GroqSettings ?? {}
    const props = Object.entries(cj).map(([key, value]) => ({
      key,
      value: String(value)
    }))
    setAdditionalProps(props)
    
    const enabled = typeof it.isEnabel === 'boolean' ? it.isEnabel : (typeof it.isEnable === 'boolean' ? it.isEnable : (typeof it.isEnabled === 'boolean' ? it.isEnabled : true))
    setIsEnabel(Boolean(enabled))
  }

  const onUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProvider) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      // Build configJson from additional properties
      const configJson: Record<string, any> = {}
      additionalProps.forEach(prop => {
        if (prop.key.trim()) {
          const numValue = Number(prop.value)
          configJson[prop.key] = isNaN(numValue) ? prop.value : numValue
        }
      })

      const payload = {
        apiKey,
        configJson,
        isEnabled: isEnabel,
        isEnabel,
      }
      await AIConfigService.putAIConfig(editingProvider, payload as any)
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
      <div className="px-6 py-8 bg-gradient-to-br from-[#f9fafb] to-[#f3f4f6] min-h-screen">
        {/* ========== PAGE HEADER ========== */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-[#2f80ed] via-[#7c3aed] to-[#2f80ed] rounded-2xl overflow-hidden shadow-lg">
            <div className="px-8 py-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-bold text-white mb-2">API Keys</h1>
                  <p className="text-white/80 text-base">Manage AI provider configurations</p>
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
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
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
                  id="isEnabel"
                  type="checkbox"
                  className="h-5 w-5 rounded border-[#2f80ed] text-[#2f80ed] focus:ring-[#2f80ed]"
                  checked={isEnabel}
                  onChange={(e) => setIsEnabel(e.target.checked)}
                />
                <label htmlFor="isEnabel" className="text-sm font-medium text-[#111827]">Enable this configuration</label>
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
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-[#6b7280]">Manage your AI provider configurations. Click the info icon to view all properties.</p>
          <button
            type="button"
            onClick={fetchList}
            className="px-4 py-2 rounded-lg border border-[#e5e7eb] text-[#374151] font-medium hover:bg-[#f9fafb] transition-all"
          >Refresh</button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-3 text-[#6b7280]">
              <svg className="animate-spin h-5 w-5 text-[#2f80ed]" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="font-medium">Loading configurations...</span>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-[#e5e7eb]">
            <svg className="w-12 h-12 mx-auto mb-3 text-[#d1d5db]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m0 0h6m-6-6H6m0 0H0" />
            </svg>
            <p className="text-[#6b7280] font-medium">No API keys configured yet</p>
            <p className="text-sm text-[#9ca3af] mt-1">Click "Add API Key" to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((it, idx) => {
              const name = it.providerName ?? it.provider ?? '—'
              const key = it.apiKey ?? it.ApiKey ?? ''
              const masked = maskKey(key)
              const cj = it.configJson ?? it.GroqSettings ?? {}
              const expanded = expandedIndex === idx
              return (
                <div key={`${name}-${idx}`} className="bg-white rounded-2xl border border-[#e5e7eb] shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div>
                            <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Provider</div>
                            <div className="text-lg font-bold text-[#111827] truncate">{name}</div>
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-1">API Key</div>
                            <div className="font-mono text-sm text-[#374151] truncate">{masked || '—'}</div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          title={expanded ? 'Hide details' : 'Show details'}
                          onClick={() => setExpandedIndex(expanded ? null : idx)}
                          className={`p-2.5 rounded-lg border transition-all ${expanded ? 'bg-[#f0f4ff] border-[#2f80ed] text-[#2f80ed]' : 'border-[#e5e7eb] text-[#6b7280] hover:bg-[#f9fafb]'}`}
                          aria-label="details"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10c0 4.418-3.582 8-8 8s-8-3.582-8-8 3.582-8 8-8 8 3.582 8 8zM9 9a1 1 0 112 0v6a1 1 0 11-2 0V9zm1-4a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          title="Edit configuration"
                          onClick={() => startEdit(it, idx)}
                          className="px-4 py-2 rounded-lg border border-[#e5e7eb] text-[#374151] font-medium hover:bg-[#f9fafb] transition-all"
                        >Edit</button>
                        <button
                          type="button"
                          title="Delete configuration"
                          onClick={() => name !== '—' && onDelete(name)}
                          className="px-4 py-2 rounded-lg border border-red-300 text-red-600 font-medium hover:bg-red-50 transition-all"
                        >Delete</button>
                      </div>
                    </div>
                  </div>
                  {expanded && (
                    <div className="px-6 pb-6 border-t border-[#e5e7eb] bg-[#f9fafb]">
                      <div className="py-4">
                        <div className="text-sm font-bold text-[#111827] mb-4">Configuration Properties</div>
                        {Object.keys(cj).length === 0 ? (
                          <p className="text-sm text-[#9ca3af]">No additional properties configured</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {Object.entries(cj).map(([key, value]) => (
                              <div key={key} className="bg-white p-3 rounded-lg border border-[#e5e7eb]">
                                <div className="text-xs font-semibold text-[#6b7280] mb-1">{key}</div>
                                <div className="text-sm font-medium text-[#111827] break-words">{String(value)}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="pt-4 border-t border-[#e5e7eb]">
                        <div className="text-xs font-semibold text-[#6b7280] mb-1">Status</div>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium" style={{
                          backgroundColor: (typeof it.isEnabel === 'boolean' ? it.isEnabel : (typeof it.isEnabled === 'boolean' ? it.isEnabled : false)) ? '#dcfce7' : '#fee2e2',
                          color: (typeof it.isEnabel === 'boolean' ? it.isEnabel : (typeof it.isEnabled === 'boolean' ? it.isEnabled : false)) ? '#166534' : '#991b1b'
                        }}>
                          {typeof it.isEnabel === 'boolean' ? (it.isEnabel ? '✓ Enabled' : '✗ Disabled') : (typeof it.isEnabled === 'boolean' ? (it.isEnabled ? '✓ Enabled' : '✗ Disabled') : '—')}
                        </div>
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
