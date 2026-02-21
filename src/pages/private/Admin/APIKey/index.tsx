import React, { useEffect, useState } from 'react'
import Layout from '../../../../components/Layout'
import { getAdminSidebarConfig } from '../components/AdminSideBar'
import { AIConfigService } from '../../../../services'

const AdminApiKeyPage: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>('')

  // List of configs from backend
  const [items, setItems] = useState<any[]>([])
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  // Add form state
  const [showAddForm, setShowAddForm] = useState<boolean>(false)
  const [providerName, setProviderName] = useState<string>('')
  const [apiKey, setApiKey] = useState<string>('')
  const [model, setModel] = useState<string>('')
  const [maxTokens, setMaxTokens] = useState<string>('')
  const [temperature, setTemperature] = useState<string>('')
  const [maxRetries, setMaxRetries] = useState<string>('')
  const [isEnabel, setIsEnabel] = useState<boolean>(true)

  const maskKey = (key?: string) => (key ? key.replace(/.(?=.{4})/g, '*') : '')

  const fetchList = async () => {
    setLoading(true)
    setError('')
    try {
      const cfg = await AIConfigService.getAIConfig()
      const list = Array.isArray(cfg) ? cfg : cfg ? [cfg] : []
      setItems(list)
    } catch (e: any) {
      setError(e?.message || 'Không tải được danh sách API key')
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
        isEnabel,
      }
      await AIConfigService.updateAIConfig(payload as any)
      setShowAddForm(false)
      // Reset form
      setProviderName('')
      setApiKey('')
      setModel('')
      setMaxTokens('')
      setTemperature('')
      setMaxRetries('')
      setIsEnabel(true)
      // Refresh list
      fetchList()
    } catch (e: any) {
      setError(e?.message || 'Cập nhật thất bại')
    } finally {
      setSaving(false)
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
          <h1 className="text-2xl font-semibold">Danh sách API Keys</h1>
          <button
            type="button"
            onClick={() => setShowAddForm((s) => !s)}
            className="px-4 py-2 rounded-md bg-blue-600 text-white"
          >{showAddForm ? 'Đóng' : 'Thêm API Key'}</button>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2" role="alert">{error}</div>
        )}

        {showAddForm && (
          <form onSubmit={onSave} className="space-y-4 mb-6 border rounded-md p-4 bg-white">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Provider Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="vd: Groq"
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">API Key</label>
                <input
                  type="password"
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Nhập API Key"
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
                  placeholder="vd: openai/gpt-oss-120b"
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
              <label htmlFor="isEnabel" className="text-sm">Kích hoạt (isEnabel)</label>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-60"
              >{saving ? 'Đang lưu...' : 'Lưu cấu hình'}</button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 rounded-md border"
              >Hủy</button>
            </div>
          </form>
        )}

        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-600">Chỉ hiển thị Provider và API Key. Bấm icon để xem chi tiết.</p>
          <button
            type="button"
            onClick={fetchList}
            className="px-3 py-1.5 rounded-md border"
          >Tải lại</button>
        </div>

        {loading ? (
          <div className="text-sm text-gray-500">Đang tải dữ liệu...</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-gray-500 border rounded-md p-4 bg-white">Chưa có API Key nào.</div>
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
                isEnabel: typeof it.isEnabel === 'boolean' ? it.isEnabel : (typeof it.isEnable === 'boolean' ? it.isEnable : undefined),
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
                    <div className="mt-2 sm:mt-0 flex items-center justify-end">
                      <button
                        type="button"
                        title={expanded ? 'Ẩn chi tiết' : 'Xem chi tiết'}
                        onClick={() => setExpandedIndex(expanded ? null : idx)}
                        className="p-2 rounded-md border hover:bg-gray-50"
                        aria-label="details"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${expanded ? 'text-blue-600' : 'text-gray-600'}`} viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10c0 4.418-3.582 8-8 8s-8-3.582-8-8 3.582-8 8-8 8 3.582 8 8zM9 9a1 1 0 112 0v6a1 1 0 11-2 0V9zm1-4a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd" />
                        </svg>
                      </button>
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
                          <div className="text-gray-500">Trạng thái</div>
                          <div className="font-medium">{detail.isEnabel === undefined ? '—' : (detail.isEnabel ? 'Đang bật' : 'Tắt')}</div>
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