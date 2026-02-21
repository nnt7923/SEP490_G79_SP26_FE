import React, { useEffect, useState } from 'react'
import Layout from '../../../../components/Layout'
import { getAdminSidebarConfig } from '../components/AdminSideBar'
import { AIConfigService } from '../../../../services'

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
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingProvider, setEditingProvider] = useState<string>('')

  const [providerName, setProviderName] = useState<string>('')
  const [apiKey, setApiKey] = useState<string>('')
  const [model, setModel] = useState<string>('')
  const [maxTokens, setMaxTokens] = useState<string>('')
  const [temperature, setTemperature] = useState<string>('')
  const [maxRetries, setMaxRetries] = useState<string>('')
  const [isEnabel, setIsEnabel] = useState<boolean>(true)

  const maskKey = (key?: string) => (key ? key.replace(/.(?=.{4})/g, '*') : '')

  const resetForm = () => {
    setProviderName('')
    setApiKey('')
    setModel('')
    setMaxTokens('')
    setTemperature('')
    setMaxRetries('')
    setIsEnabel(true)
    setIsEditMode(false)
    setEditingIndex(null)
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

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const payload = {
        providerName,
        apiKey,
        configJson: {
          Model: model,
          MaxTokens: Number(maxTokens) || 0,
          Temperature: Number(temperature) || 0,
          MaxRetries: Number(maxRetries) || 0,
        },
        // keep legacy state for compatibility; backend canonical field is isEnabled
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
    setEditingIndex(idx)
    const name = it.providerName ?? it.provider ?? ''
    setEditingProvider(name)

    setProviderName(name)
    setApiKey(it.apiKey ?? it.ApiKey ?? '')
    const cj = it.configJson ?? it.GroqSettings ?? {}
    setModel(cj.Model ?? it.model ?? '')
    setMaxTokens(String(cj.MaxTokens ?? it.maxTokens ?? ''))
    setTemperature(String(cj.Temperature ?? it.temperature ?? ''))
    setMaxRetries(String(cj.MaxRetries ?? it.maxRetries ?? ''))
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
      const payload = {
        apiKey,
        configJson: {
          Model: model,
          MaxTokens: Number(maxTokens) || 0,
          Temperature: Number(temperature) || 0,
          MaxRetries: Number(maxRetries) || 0,
        },
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
      <div className="p-6 max-w-3xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">API Keys</h1>
          <button
            type="button"
            onClick={() => { setShowForm((s) => !s); setIsEditMode(false); resetForm() }}
            className="px-4 py-2 rounded-md bg-blue-600 text-white"
          >{showForm && !isEditMode ? 'Close' : 'Add API Key'}</button>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2" role="alert">{error}</div>
        )}
        {notice && (
          <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2" role="status">{notice}</div>
        )}

        {showForm && (
          <form onSubmit={isEditMode ? onUpdate : onSave} className="space-y-4 mb-6 border rounded-md p-4 bg-white">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Provider Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="e.g., Groq"
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  disabled={isEditMode}
                  readOnly={isEditMode}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">API Key</label>
                <input
                  type="password"
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Enter API Key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Model</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="e.g., openai/gpt-oss-120b"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Max Tokens</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="8192"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Temperature</label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="0.3"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Max Retries</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="3"
                  value={maxRetries}
                  onChange={(e) => setMaxRetries(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="isEnabel"
                type="checkbox"
                className="h-4 w-4"
                checked={isEnabel}
                onChange={(e) => setIsEnabel(e.target.checked)}
              />
              <label htmlFor="isEnabel" className="text-sm">Enabled (isEnabled)</label>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-60"
              >{saving ? 'Saving...' : (isEditMode ? 'Update' : 'Save Configuration')}</button>
              <button
                type="button"
                onClick={() => { setShowForm(false); resetForm() }}
                className="px-4 py-2 rounded-md border"
              >Cancel</button>
            </div>
          </form>
        )}

        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-600">Only Provider and API Key are shown. Click the info icon for details.</p>
          <button
            type="button"
            onClick={fetchList}
            className="px-3 py-1.5 rounded-md border"
          >Refresh</button>
        </div>

        {loading ? (
          <div className="text-sm text-gray-500">Loading data...</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-gray-500 border rounded-md p-4 bg-white">No API Key yet.</div>
        ) : (
          <div className="space-y-2">
            {items.map((it, idx) => {
              const name = it.providerName ?? it.provider ?? '—'
              const key = it.apiKey ?? it.ApiKey ?? ''
              const masked = maskKey(key)
              const cj = it.configJson ?? it.GroqSettings ?? {}
              const detail = {
                Model: cj.Model ?? it.model ?? '—',
                MaxTokens: cj.MaxTokens ?? it.maxTokens ?? '—',
                Temperature: cj.Temperature ?? it.temperature ?? '—',
                MaxRetries: cj.MaxRetries ?? it.maxRetries ?? '—',
                isEnabel: typeof it.isEnabel === 'boolean' ? it.isEnabel : (typeof it.isEnable === 'boolean' ? it.isEnable : (typeof it.isEnabled === 'boolean' ? it.isEnabled : undefined)),
              }
              const expanded = expandedIndex === idx
              return (
                <div key={`${name}-${idx}`} className="border rounded-md bg-white">
                  <div className="p-3 sm:flex sm:items-center sm:justify-between gap-3">
                    <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-8">
                      <div className="min-w-0">
                        <div className="text-xs text-gray-500 select-none">Provider</div>
                        <div className="font-medium truncate">{name}</div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs text-gray-500 select-none">API Key</div>
                        <div className="font-mono tracking-normal truncate max-w-full sm:max-w-[28rem] md:max-w-[36rem]">{masked || '—'}</div>
                      </div>
                    </div>
                    <div className="mt-2 sm:mt-0 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        title={expanded ? 'Hide details' : 'Show details'}
                        onClick={() => setExpandedIndex(expanded ? null : idx)}
                        className="p-2 rounded-md border hover:bg-gray-50"
                        aria-label="details"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${expanded ? 'text-blue-600' : 'text-gray-600'}`} viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10c0 4.418-3.582 8-8 8s-8-3.582-8-8 3.582-8 8-8 8 3.582 8 8zM9 9a1 1 0 112 0v6a1 1 0 11-2 0V9zm1-4a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        title="Edit configuration"
                        onClick={() => startEdit(it, idx)}
                        className="px-3 py-1.5 rounded-md border hover:bg-gray-50"
                      >Edit</button>
                      <button
                        type="button"
                        title="Delete configuration"
                        onClick={() => name !== '—' && onDelete(name)}
                        className="px-3 py-1.5 rounded-md border text-red-600 hover:bg-red-50"
                      >Delete</button>
                    </div>
                  </div>
                  {expanded && (
                    <div className="px-3 pb-3 text-sm text-gray-700">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <div className="text-gray-500">Model</div>
                          <div className="font-medium">{String(detail.Model)}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Max Tokens</div>
                          <div className="font-medium">{String(detail.MaxTokens)}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Temperature</div>
                          <div className="font-medium">{String(detail.Temperature)}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Max Retries</div>
                          <div className="font-medium">{String(detail.MaxRetries)}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Status</div>
                          <div className="font-medium">{detail.isEnabel === undefined ? '—' : (detail.isEnabel ? 'Enabled' : 'Disabled')}</div>
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