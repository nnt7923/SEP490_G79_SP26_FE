import React, { useEffect, useState } from 'react'
import Layout from '../../../../components/Layout'
import { useAdminSidebarConfig } from '../components/AdminSideBar'
import {
  getAllPolicies,
  createPolicy,
  updatePolicy,
  type SystemRuntimePolicyDto,
} from '../../../../services/SystemRuntimePolicyService'
import {
  Settings,
  Plus,
  X,
  Edit,
  ChevronDown,
  ChevronUp,
  Trash2,
} from 'lucide-react'
import ConfirmDialog from '../../../../components/ConfirmDialog'
import { useTranslation } from 'react-i18next'

// ─── Config JSON editor helpers (same pattern as AdminAPIKey) ────────────────

type ConfigEditorMode = 'builder' | 'json'
type ConfigFieldType = 'string' | 'number' | 'boolean' | 'null' | 'json'

interface ConfigField {
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

const normalizePathSegments = (path: string): string[] =>
  path
    .split('.')
    .map((p) => p.trim())
    .filter(Boolean)

const setValueAtPath = (target: Record<string, unknown>, path: string, value: unknown) => {
  const segments = normalizePathSegments(path)
  if (segments.length === 0) return
  let current: Record<string, unknown> = target
  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i]
    if (!current[key] || typeof current[key] !== 'object' || Array.isArray(current[key])) {
      current[key] = {}
    }
    current = current[key] as Record<string, unknown>
  }
  current[segments[segments.length - 1]] = value
}

const flattenConfigObject = (obj: Record<string, unknown>, prefix = ''): ConfigField[] => {
  const fields: ConfigField[] = []
  Object.entries(obj || {}).forEach(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const nested = flattenConfigObject(value as Record<string, unknown>, path)
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

const parseBuilderValue = (field: ConfigField): unknown => {
  if (field.type === 'number') {
    const n = Number(field.value)
    if (!Number.isFinite(n)) throw new Error(`Invalid number value for key "${field.path}"`)
    return n
  }
  if (field.type === 'boolean') {
    if (field.value === 'true') return true
    if (field.value === 'false') return false
    throw new Error(`Boolean value must be true or false for key "${field.path}"`)
  }
  if (field.type === 'null') return null
  if (field.type === 'json') {
    const v = field.value.trim()
    if (!v) return {}
    try { return JSON.parse(v) } catch { throw new Error(`Invalid nested JSON for key "${field.path}"`) }
  }
  return field.value
}

const buildConfigJsonFromFields = (fields: ConfigField[]): Record<string, unknown> => {
  const result: Record<string, unknown> = {}
  fields.forEach((field) => {
    if (!field.path.trim()) return
    setValueAtPath(result, field.path.trim(), parseBuilderValue(field))
  })
  return result
}

const parseJsonTextToObject = (rawText: string): Record<string, unknown> => {
  const raw = rawText.trim()
  if (!raw) return {}
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { throw new Error('configJson must be valid JSON') }
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error('configJson must be a JSON object')
  }
  return parsed as Record<string, unknown>
}

// ─── Config JSON editor sub-component ────────────────────────────────────────

interface ConfigEditorProps {
  mode: ConfigEditorMode
  fields: ConfigField[]
  jsonText: string
  onModeChange: (m: ConfigEditorMode) => void
  onFieldsChange: (fields: ConfigField[]) => void
  onJsonTextChange: (text: string) => void
}

const ConfigEditor: React.FC<ConfigEditorProps> = ({
  mode,
  fields,
  jsonText,
  onModeChange,
  onFieldsChange,
  onJsonTextChange,
}) => {
  const { t } = useTranslation('admin')
  const switchMode = (next: ConfigEditorMode) => {
    if (next === mode) return
    if (next === 'json') {
      try {
        const built = buildConfigJsonFromFields(fields)
        onJsonTextChange(JSON.stringify(built, null, 2))
      } catch { /* keep existing json text */ }
      onModeChange('json')
    } else {
      try {
        const parsed = parseJsonTextToObject(jsonText)
        onFieldsChange(flattenConfigObject(parsed))
      } catch {
        onFieldsChange([])
      }
      onModeChange('builder')
    }
  }

  const addField = () => onFieldsChange([...fields, createConfigField()])
  const removeField = (id: string) => onFieldsChange(fields.filter((f) => f.id !== id))
  const updateField = (id: string, patch: Partial<ConfigField>) =>
    onFieldsChange(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)))

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-bold text-body">{t('apiKey.configJsonLabel')}</label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => switchMode('builder')}
            className={`px-3 py-1.5 text-xs font-bold border rounded-sm transition-colors ${mode === 'builder' ? 'border-blue-600 text-status-blue bg-status-blue-bg' : 'border-bd-strong text-body hover:bg-th-input'}`}
          >{t('apiKey.builderMode')}</button>
          <button
            type="button"
            onClick={() => switchMode('json')}
            className={`px-3 py-1.5 text-xs font-bold border rounded-sm transition-colors ${mode === 'json' ? 'border-blue-600 text-status-blue bg-status-blue-bg' : 'border-bd-strong text-body hover:bg-th-input'}`}
          >{t('apiKey.jsonMode')}</button>
        </div>
      </div>

      <div className="bg-th-page border border-bd-strong p-4 space-y-3">
        {mode === 'builder' ? (
          <>
            <div className="space-y-3">
              {fields.length === 0 ? (
                <p className="text-sm text-muted font-bold">{t('apiKey.noBuilderRows')}</p>
              ) : (
                fields.map((field) => (
                  <div key={field.id} className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-end bg-th-card p-3 border border-bd">
                    <div className="lg:col-span-5">
                      <label className="block text-xs font-bold text-muted mb-2">{t('apiKey.pathLabel')}</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-bd focus:outline-none focus:border-blue-500 text-sm transition-colors font-mono"
                        placeholder={t('apiKey.pathPlaceholder')}
                        value={field.path}
                        onChange={(e) => updateField(field.id, { path: e.target.value })}
                      />
                    </div>
                    <div className="lg:col-span-3">
                      <label className="block text-xs font-bold text-muted mb-2">{t('apiKey.typeLabel')}</label>
                      <select
                        className="w-full px-3 py-2 border border-bd focus:outline-none focus:border-blue-500 text-sm transition-colors bg-th-card font-mono"
                        value={field.type}
                        onChange={(e) =>
                          updateField(field.id, {
                            type: e.target.value as ConfigFieldType,
                            value: e.target.value === 'boolean' ? 'false' : e.target.value === 'null' ? '' : field.value,
                          })
                        }
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
                          onChange={(e) => updateField(field.id, { value: e.target.value })}
                        >
                          <option value="true">true</option>
                          <option value="false">false</option>
                        </select>
                      ) : field.type === 'null' ? (
                        <input disabled type="text" className="w-full px-3 py-2 border border-bd text-sm bg-th-input text-muted font-mono" value="null" />
                          ) : (
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-bd focus:outline-none focus:border-blue-500 text-sm transition-colors font-mono"
                          placeholder={field.type === 'json' ? '{...} or [...]' : t('apiKey.additionalPropValuePlaceholder')}
                          value={field.value}
                          onChange={(e) => updateField(field.id, { value: e.target.value })}
                        />
                      )}
                    </div>
                    <div className="lg:col-span-1">
                      <button
                        type="button"
                        onClick={() => removeField(field.id)}
                        className="w-full px-2 py-2 border border-red-500 text-status-red hover:bg-status-red-bg transition-colors font-bold text-sm flex items-center justify-center"
                        title={t('apiKey.removeProperty')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button
              type="button"
              onClick={addField}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-status-blue border border-blue-600 hover:bg-status-blue-bg transition-colors rounded-sm"
            >
              <Plus size={16} /> {t('apiKey.addRow')}
            </button>
          </>
        ) : (
          <textarea
            className="w-full min-h-[220px] px-4 py-3 border border-bd-strong bg-th-card focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm leading-6"
            value={jsonText}
            onChange={(e) => onJsonTextChange(e.target.value)}
            spellCheck={false}
            placeholder={t('apiKey.configJsonPlaceholder')}
          />
        )}
        <p className="text-xs text-muted">{t('apiKey.configJsonHint')}</p>
      </div>
    </div>
  )
}

// ─── Inline edit panel ────────────────────────────────────────────────────────

interface EditPanelProps {
  policy: SystemRuntimePolicyDto
  onSaved: (updated: SystemRuntimePolicyDto) => void
  onCancel: () => void
}

const EditPanel: React.FC<EditPanelProps> = ({ policy, onSaved, onCancel }) => {
  const [description, setDescription] = useState(policy.description ?? '')
  const [isActive, setIsActive] = useState(policy.isActive)
  const [mode, setMode] = useState<ConfigEditorMode>('builder')
  const [fields, setFields] = useState<ConfigField[]>(() =>
    flattenConfigObject(policy.configJson as Record<string, unknown>)
  )
  const [jsonText, setJsonText] = useState(() =>
    JSON.stringify(policy.configJson, null, 2)
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { t } = useTranslation('admin')

  const getConfigJson = (): Record<string, unknown> => {
    if (mode === 'json') return parseJsonTextToObject(jsonText)
    return buildConfigJsonFromFields(fields)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const configJson = getConfigJson()
      const updated = await updatePolicy(policy.policyKey, { description: description || null, configJson, isActive })
      onSaved(updated)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('systemRuntimePolicy.saveFailed')
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border-t border-bd bg-th-page px-6 py-6">
      <form onSubmit={handleSave} className="space-y-6 lg:w-4/5">
        {error && (
          <div className="text-sm text-status-red-dark bg-status-red-bg border-l-4 border-red-500 rounded-r-lg px-4 py-3">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-bold text-body mb-2">{t('systemRuntimePolicy.policyKeyLabel')}</label>
          <input
            type="text"
            disabled
            className="w-full px-4 py-2 border border-bd-strong bg-th-input text-muted font-mono text-sm"
            value={policy.policyKey}
          />
          <p className="text-xs text-muted mt-1">{t('systemRuntimePolicy.policyKeyCannotChange')}</p>
        </div>

        <div>
          <label className="block text-sm font-bold text-body mb-2">{t('systemRuntimePolicy.descriptionLabel')}</label>
          <input
            type="text"
            className="w-full px-4 py-2 border border-bd-strong bg-th-card focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
            placeholder="Optional description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <ConfigEditor
          mode={mode}
          fields={fields}
          jsonText={jsonText}
          onModeChange={setMode}
          onFieldsChange={setFields}
          onJsonTextChange={setJsonText}
        />

        <div className="flex items-center gap-3 bg-th-card p-4 border border-bd-strong">
          <input
            id={`isActive-${policy.policyKey}`}
            type="checkbox"
            className="h-4 w-4 border-bd-strong focus:ring-blue-500"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          <label htmlFor={`isActive-${policy.policyKey}`} className="text-sm font-bold text-heading">
            {t('systemRuntimePolicy.activeLabel')}
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 border border-blue-600 bg-status-blue-solid text-white font-bold disabled:opacity-60 hover:bg-status-blue-solid-hover transition-colors cursor-pointer rounded-sm"
          >
            {saving ? t('systemRuntimePolicy.saving') : t('systemRuntimePolicy.savePolicy')}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-bd-strong text-body font-bold hover:bg-th-input transition-colors cursor-pointer rounded-sm"
          >
            {t('systemRuntimePolicy.cancel')}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Create modal ─────────────────────────────────────────────────────────────

interface CreateModalProps {
  onCreated: (policy: SystemRuntimePolicyDto) => void
  onClose: () => void
}

const CreateModal: React.FC<CreateModalProps> = ({ onCreated, onClose }) => {
  const [policyKey, setPolicyKey] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [mode, setMode] = useState<ConfigEditorMode>('builder')
  const [fields, setFields] = useState<ConfigField[]>([])
  const [jsonText, setJsonText] = useState('{}')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { t } = useTranslation('admin')

  const getConfigJson = (): Record<string, unknown> => {
    if (mode === 'json') return parseJsonTextToObject(jsonText)
    return buildConfigJsonFromFields(fields)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!policyKey.trim()) { setError('Policy key is required.'); return }
    setSaving(true)
    setError('')
    try {
      const configJson = getConfigJson()
      const created = await createPolicy({ policyKey: policyKey.trim(), description: description || null, configJson, isActive })
      onCreated(created)
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { errorCode?: string; message?: string } } })?.response?.data
      if (code?.errorCode === 'POLICY_ALREADY_EXISTS') {
        setError(`Policy key "${policyKey.trim()}" already exists. Use a different key or edit the existing policy.`)
      } else {
        setError(code?.message ?? (err instanceof Error ? err.message : t('systemRuntimePolicy.createFailed')))
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-th-card border border-bd-strong w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="bg-th-input px-6 py-4 border-b border-bd-strong flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plus className="text-status-blue" size={20} />
            <h2 className="text-lg font-bold text-heading">{t('systemRuntimePolicy.newPolicyTitle')}</h2>
          </div>
          <button type="button" onClick={onClose} className="text-muted hover:text-body transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          {error && (
            <div className="text-sm text-status-red-dark bg-status-red-bg border-l-4 border-red-500 rounded-r-lg px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-body mb-2">{t('systemRuntimePolicy.policyKeyLabel')} <span className="text-status-red">*</span></label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-bd-strong bg-th-card focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
              placeholder="e.g. runtime_policy"
              value={policyKey}
              onChange={(e) => setPolicyKey(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-muted mt-1">{t('systemRuntimePolicy.policyKeyHint')}</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-body mb-2">{t('systemRuntimePolicy.descriptionLabel')}</label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-bd-strong bg-th-card focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
              placeholder="Optional description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <ConfigEditor
            mode={mode}
            fields={fields}
            jsonText={jsonText}
            onModeChange={setMode}
            onFieldsChange={setFields}
            onJsonTextChange={setJsonText}
          />

          <div className="flex items-center gap-3 bg-th-card p-4 border border-bd-strong">
            <input
              id="create-isActive"
              type="checkbox"
              className="h-4 w-4 border-bd-strong focus:ring-blue-500"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <label htmlFor="create-isActive" className="text-sm font-bold text-heading">{t('systemRuntimePolicy.activeLabel')}</label>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 border border-blue-600 bg-status-blue-solid text-white font-bold disabled:opacity-60 hover:bg-status-blue-solid-hover transition-colors cursor-pointer rounded-sm"
            >
              {saving ? t('systemRuntimePolicy.creating') : t('systemRuntimePolicy.createPolicy')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-bd-strong text-body font-bold hover:bg-th-input transition-colors cursor-pointer rounded-sm"
            >
              {t('systemRuntimePolicy.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const AdminSystemRuntimePolicyPage: React.FC = () => {
  const [policies, setPolicies] = useState<SystemRuntimePolicyDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set())
  const [showCreate, setShowCreate] = useState(false)
  const { t } = useTranslation('admin')
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null)
  const [confirmDeleteName, setConfirmDeleteName] = useState<string | null>(null)

  const sidebarConfig = {
    navItems: useAdminSidebarConfig() as unknown[],
    brand: { name: 'Admin', subtitle: t('systemRuntimePolicy.title') },
  }

  const fetchPolicies = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getAllPolicies()
      setPolicies(data)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? (err instanceof Error ? err.message : 'Failed to load policies'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPolicies() }, [])

  const handleSaved = (updated: SystemRuntimePolicyDto) => {
    setPolicies((prev) => prev.map((p) => (p.policyKey === updated.policyKey ? updated : p)))
    setEditingKey(null)
    setNotice(t('systemRuntimePolicy.savedSuccess', { key: updated.policyKey }))
    setTimeout(() => setNotice(''), 4000)
  }

  const handleCreated = (created: SystemRuntimePolicyDto) => {
    setPolicies((prev) => [created, ...prev])
    setShowCreate(false)
    setNotice(t('systemRuntimePolicy.createdSuccess', { key: created.policyKey }))
    setTimeout(() => setNotice(''), 4000)
  }

  const handleDelete = async (policyKey: string, name?: string) => {
    setConfirmDeleteKey(policyKey)
    setConfirmDeleteName(name ?? policyKey)
  }


  const toggleDetails = (key: string) => {
    setExpandedDetails((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleString() } catch { return iso }
  }

  return (
    <Layout sidebar={sidebarConfig as unknown as Parameters<typeof Layout>[0]['sidebar']}>
      <div className="px-4 py-8 bg-[var(--gray-100)] min-h-screen font-mono">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* ── PAGE HEADER ── */}
          <div className="mb-6 border-b border-bd pb-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-heading flex items-center gap-2">
                  <Settings className="text-status-blue flex-shrink-0" size={28} />
                  {t('systemRuntimePolicy.title')}
                </h1>
                <p className="text-muted mt-2">{t('systemRuntimePolicy.subtitle')}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="px-6 py-2 border border-blue-600 bg-th-card text-status-blue font-bold hover:bg-status-blue-bg transition-colors cursor-pointer rounded-sm flex items-center gap-2"
              >
                <Plus size={18} />
                {t('systemRuntimePolicy.newPolicyButton')}
              </button>
            </div>
          </div>

          {/* ── ALERTS ── */}
          {error && (
            <div className="text-sm text-status-red-dark bg-status-red-bg border-l-4 border-red-500 rounded-r-lg px-4 py-3" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className="text-sm text-status-green-dark bg-status-green-bg border-l-4 border-green-500 rounded-r-lg px-4 py-3" role="status">
              {notice}
            </div>
          )}

          {/* ── POLICY LIST ── */}
          {loading ? (
            <div className="text-center py-16">
              <span className="text-sm font-bold text-muted">{t('status.loading')}</span>
            </div>
          ) : policies.length === 0 ? (
            <div className="text-center py-16 bg-th-card border border-bd-strong">
              <p className="text-heading font-bold text-lg mb-1">{t('systemRuntimePolicy.noPoliciesTitle')}</p>
              <p className="text-sm text-muted">{t('systemRuntimePolicy.noPoliciesHint')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {policies.map((policy) => {
                const isEditing = editingKey === policy.policyKey
                const isDetailsExpanded = expandedDetails.has(policy.policyKey)
                const configEntries = Object.entries(policy.configJson ?? {})

                return (
                  <div key={policy.policyKey} className="bg-th-card border border-bd-strong">
                    {/* Card header */}
                    <div className="px-5 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="text-base font-bold text-heading font-mono">{policy.policyKey}</h3>
                            <span
                              className={`px-2 py-0.5 text-xs font-bold border rounded-sm ${
                                policy.isActive
                                  ? 'border-green-600 text-status-green-dark bg-status-green-bg'
                                  : 'border-bd-strong text-muted bg-th-input'
                              }`}
                            >
                              {policy.isActive ? t('apiKey.active') : t('apiKey.inactive')}
                            </span>
                          </div>
                          {policy.description && (
                            <p className="text-sm text-muted">{policy.description}</p>
                          )}
                          <p className="text-xs text-muted mt-1">
                            {t('systemRuntimePolicy.updatedAt')}: {formatDate(policy.updatedAt)} · {configEntries.length} {t('systemRuntimePolicy.configKeys', { count: configEntries.length })}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {configEntries.length > 0 && (
                            <button
                              type="button"
                              onClick={() => toggleDetails(policy.policyKey)}
                              className="px-3 py-1 border border-bd-strong text-label text-xs font-bold hover:bg-th-input cursor-pointer transition-colors rounded-sm flex items-center gap-1"
                            >
                              {isDetailsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              {t('systemRuntimePolicy.details')}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setEditingKey(isEditing ? null : policy.policyKey)}
                            className="px-3 py-1 border border-bd-strong text-body text-xs font-bold hover:bg-th-input cursor-pointer transition-colors rounded-sm flex items-center gap-1"
                          >
                            {isEditing ? <X size={14} /> : <Edit size={14} />}
                            {isEditing ? t('systemRuntimePolicy.close') : t('systemRuntimePolicy.edit')}
                          </button>
                          
                        </div>
                      </div>
                    </div>

                    {/* Expanded configJson details */}
                    {isDetailsExpanded && !isEditing && (
                      <div className="border-t border-bd px-5 py-4 bg-th-page">
                                  <div className="text-xs font-bold text-muted uppercase mb-2">{t('apiKey.configJsonLabel')}</div>
                        <pre className="bg-th-card px-4 py-3 border border-bd text-xs leading-6 text-heading overflow-x-auto whitespace-pre-wrap break-words">
                          {JSON.stringify(policy.configJson, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Inline edit panel */}
                    {isEditing && (
                      <EditPanel
                        policy={policy}
                        onSaved={handleSaved}
                        onCancel={() => setEditingKey(null)}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <CreateModal
          onCreated={handleCreated}
          onClose={() => setShowCreate(false)}
        />
      )}
    </Layout>
  )
}

export default AdminSystemRuntimePolicyPage
