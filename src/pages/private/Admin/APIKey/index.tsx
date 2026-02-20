import React, { useEffect, useState } from 'react'
import Layout from '../../../../components/Layout'
import { getAdminSidebarConfig } from '../components/AdminSideBar'
import { AIConfigService } from '../../../../services'

const AdminApiKeyPage: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>('')
  const [provider, setProvider] = useState<string>('')
  const [apiKey, setApiKey] = useState<string>('')
  const [model, setModel] = useState<string>('')

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true)
      setError('')
      try {
        const cfg = await AIConfigService.getAIConfig()
        const first = Array.isArray(cfg) ? cfg[0] : cfg
        if (first) {
          setProvider((first as any)?.provider ?? '')
          setApiKey((first as any)?.apiKey ?? '')
          setModel((first as any)?.model ?? '')
        }
      } catch (e: any) {
        setError(e?.message || 'Không tải được AI config')
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
      await AIConfigService.updateAIConfig({ provider, apiKey, model })
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
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-semibold mb-4">AI Provider API Key</h1>
        <p className="text-sm text-gray-600 mb-6">Quản lý nhà cung cấp AI, API Key và model sử dụng cho hệ thống.</p>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2" role="alert">{error}</div>
        )}

        {loading ? (
          <div className="text-sm text-gray-500">Đang tải cấu hình...</div>
        ) : (
          <form onSubmit={onSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Provider</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-md"
                placeholder="openai | azure-openai | anthropic | gemini | ollama"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
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

            <div>
              <label className="block text-sm font-medium mb-1">Model</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-md"
                placeholder="vd: gpt-4o, claude-3-opus, gemini-1.5-pro"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-60"
              >{saving ? 'Đang lưu...' : 'Lưu cấu hình'}</button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    setLoading(true)
                    const cfg = await AIConfigService.getAIConfig()
                    const first = Array.isArray(cfg) ? cfg[0] : cfg
                    if (first) {
                      setProvider((first as any)?.provider ?? '')
                      setApiKey((first as any)?.apiKey ?? '')
                      setModel((first as any)?.model ?? '')
                    }
                  } finally {
                    setLoading(false)
                  }
                }}
                className="px-4 py-2 rounded-md border"
              >Tải lại</button>
            </div>
          </form>
        )}
      </div>
    </Layout>
  )
}

export default AdminApiKeyPage