import React, { useEffect, useState } from 'react'
import Layout from '../../../../components/Layout'
import { getAdminSidebarConfig } from '../components/AdminSideBar'
import { AIConfigService, type AIConfig } from '../../../../services'
import { Eye, EyeOff, Save, RotateCcw, AlertCircle, Plus, Trash2 } from 'lucide-react'

const AdminApiKeyPage: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>('')
  const [providerName, setProviderName] = useState<string>('')
  const [apiKey, setApiKey] = useState<string>('')
  const [configJson, setConfigJson] = useState<Array<{ key: string; value: string }>>([])
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true)
      setError('')
      try {
        const cfg = await AIConfigService.getAIConfig()
        const first = Array.isArray(cfg) ? cfg[0] : cfg
        if (first) {
          setProviderName(first.providerName || '')
          setApiKey(first.apiKey || '')
          const config = first.configJson || {}
          const items = Object.entries(config).map(([key, value]) => ({
            key,
            value: String(value),
          }))
          setConfigJson(items)
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load AI configuration')
      } finally {
        setLoading(false)
      }
    }
    fetchConfig()
  }, [])

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const configObj = configJson.reduce((acc, item) => {
        if (item.key.trim()) {
          acc[item.key] = item.value
        }
        return acc
      }, {} as Record<string, string>)

      await AIConfigService.updateAIConfig({
        providerName,
        apiKey,
        configJson: configObj,
      })
      setError('')  // Success
    } catch (e: any) {
      setError(e?.message || 'Failed to add API key')
    } finally {
      setSaving(false)
    }
  }

  const sidebarConfig = {
    navItems: getAdminSidebarConfig(),
    brand: { name: 'API Configuration', subtitle: 'Admin' },
  }

  const maskedKey = apiKey ? apiKey.replace(/.(?=.{4})/g, '*') : ''

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-4xl mx-auto w-full">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">AI Provider Configuration</h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">Configure your AI provider, API key, and model settings.</p>
        </div>

        {error && (
          <div className="mb-4 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex gap-3 items-start" role="alert">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-red-600 dark:text-red-400 break-words">{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-300 border-t-slate-900 dark:border-t-white"></div>
            <span className="text-xs sm:text-sm font-medium">Loading configuration...</span>
          </div>
        ) : (
          <>
            {/* Summary card (read-only) */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-4 sm:p-6 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Provider</p>
                  <p className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white truncate">{providerName || '—'}</p>
                </div>
                <div className="min-w-0 sm:col-span-2 lg:col-span-1">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">API Key</p>
                  <p className="text-sm sm:text-base font-mono text-slate-900 dark:text-slate-300 tracking-wide truncate">{maskedKey || '—'}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {configJson.length > 0 ? (
                  configJson.map((item, idx) => (
                    <div key={idx}>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">{item.key}</p>
                      <p className="text-base font-semibold text-slate-900 dark:text-white truncate">{item.value || '—'}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400 col-span-full">No configuration items</p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-6 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="inline-flex items-center justify-center sm:justify-start gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-900 text-sm"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showPassword ? 'Hide' : 'Show'} Full Key
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setLoading(true)
                      const cfg = await AIConfigService.getAIConfig()
                      const first = Array.isArray(cfg) ? cfg[0] : cfg
                      if (first) {
                        setProviderName(first.providerName || '')
                        setApiKey(first.apiKey || '')
                        const config = first.configJson || {}
                        const items = Object.entries(config).map(([key, value]) => ({
                          key,
                          value: String(value),
                        }))
                        setConfigJson(items)
                      }
                    } catch (e: any) {
                      setError(e?.message || 'Failed to reload')
                    } finally {
                      setLoading(false)
                    }
                  }}
                  className="inline-flex items-center justify-center sm:justify-start gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-900 text-sm"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reload
                </button>
              </div>
            </div>

            {/* Configuration Form */}
            <form onSubmit={onSave} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-4 sm:p-6 space-y-5">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white mb-6">Add API Key</h2>

              <div>
                <label htmlFor="provider" className="block text-xs sm:text-sm font-semibold text-slate-900 dark:text-white mb-2">
                  Provider Name
                </label>
                <input
                  id="provider"
                  type="text"
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors text-sm"
                  placeholder="openai, anthropic, gemini, groq, or ollama"
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="apikey" className="block text-xs sm:text-sm font-semibold text-slate-900 dark:text-white mb-2">
                  API Key
                </label>
                <div className="relative">
                  <input
                    id="apikey"
                    type={showPassword ? 'text' : 'password'}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors pr-10 text-sm"
                    placeholder="Enter your API key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 focus:outline-none"
                    aria-label={showPassword ? 'Hide API key' : 'Show API key'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                    Configuration
                  </label>
                  <button
                    type="button"
                    onClick={() => setConfigJson([...configJson, { key: '', value: '' }])}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-sm font-medium transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-900"
                    aria-label="Add configuration item"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>

                <div className="space-y-3">
                  {configJson.length > 0 ? (
                    configJson.map((item, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Key (e.g., Model, MaxTokens)"
                          value={item.key}
                          onChange={(e) => {
                            const updated = [...configJson]
                            updated[idx].key = e.target.value
                            setConfigJson(updated)
                          }}
                          className="flex-1 min-w-0 px-3 sm:px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Value"
                          value={item.value}
                          onChange={(e) => {
                            const updated = [...configJson]
                            updated[idx].value = e.target.value
                            setConfigJson(updated)
                          }}
                          className="flex-1 min-w-0 px-3 sm:px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setConfigJson(configJson.filter((_, i) => i !== idx))}
                          className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-slate-900"
                          aria-label="Remove configuration item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400 py-2">No configuration items. Click "Add" to create one.</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-6 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-900 disabled:cursor-not-allowed text-sm"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Adding...' : 'Add API Key'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </Layout>
  )
}

export default AdminApiKeyPage