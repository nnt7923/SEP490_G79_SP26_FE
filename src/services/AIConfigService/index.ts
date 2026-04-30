import api from '../Axios'
import { configUrl, addConfigUrl, providerConfigUrl, configIdUrl, setActiveUrl } from './url'

type AIConfigCacheEntry = {
  expiresAt: number
  data: AIConfig | AIConfig[]
}

const AI_CONFIG_CACHE_KEY = 'admin:ai-configs:list'
const AI_CONFIG_CACHE_TTL_MS = 2 * 60 * 1000
let aiConfigMemoryCache: AIConfigCacheEntry | null = null

export type ConfigJson = {
  Model?: string
  MaxTokens?: number
  Temperature?: number
  MaxRetries?: number
  [key: string]: any
}

export const AIUsageType = {
  StructureGeneration: 1,
  ContentGeneration: 2,
  Verification: 3,
  Assistant: 4,
  DocumentExtraction: 5,
} as const

export type AIUsageType = typeof AIUsageType[keyof typeof AIUsageType]

export type AIConfig = {
  apiKey?: string
  providerName?: string
  isEnabled?: boolean
  aiUsageType?: AIUsageType
  accessTier?: number
  lastUpdated?: string
  configJson?: ConfigJson
  provider?: string // fallback field
  model?: string
  temperature?: number
  maxTokens?: number
  baseUrl?: string
  [key: string]: any
}

export type ApiEnvelope<T> = {
  value?: T
  isSuccess?: boolean
  errorCode?: string | number | null
  errorMessage?: string | null
  [k: string]: any
}

function unwrap<T>(res: any): T {
  // Axios instance already returns response.data; still be defensive
  const data = (res?.data ?? res) as ApiEnvelope<T> | T
  // Prefer envelope.value if it exists, else fallback to data
  if (data && typeof data === 'object' && 'value' in (data as any)) {
    return (data as ApiEnvelope<T>).value as T
  }
  return data as T
}

function readAIConfigStorageCache(): AIConfigCacheEntry | null {
  try {
    if (typeof window === 'undefined') return null
    const raw = window.sessionStorage.getItem(AI_CONFIG_CACHE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as AIConfigCacheEntry
    if (!parsed?.expiresAt || parsed.expiresAt <= Date.now()) {
      window.sessionStorage.removeItem(AI_CONFIG_CACHE_KEY)
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function writeAIConfigStorageCache(entry: AIConfigCacheEntry): void {
  try {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem(AI_CONFIG_CACHE_KEY, JSON.stringify(entry))
  } catch {
    // ignore cache write errors
  }
}

export function clearAIConfigCache(): void {
  aiConfigMemoryCache = null
  try {
    if (typeof window === 'undefined') return
    window.sessionStorage.removeItem(AI_CONFIG_CACHE_KEY)
  } catch {
    // ignore cache clear errors
  }
}

export async function getAIConfig(): Promise<AIConfig | AIConfig[]> {
  if (aiConfigMemoryCache && aiConfigMemoryCache.expiresAt > Date.now()) {
    return aiConfigMemoryCache.data
  }

  const storageEntry = readAIConfigStorageCache()
  if (storageEntry) {
    aiConfigMemoryCache = storageEntry
    return storageEntry.data
  }

  const res: any = await api.get(configUrl)
  const data = unwrap<AIConfig | AIConfig[]>(res)
  const cacheEntry: AIConfigCacheEntry = {
    data,
    expiresAt: Date.now() + AI_CONFIG_CACHE_TTL_MS,
  }
  aiConfigMemoryCache = cacheEntry
  writeAIConfigStorageCache(cacheEntry)
  return data
}

export async function updateAIConfig(payload: Partial<AIConfig>): Promise<AIConfig | AIConfig[]> {
  const res: any = await api.post(addConfigUrl, payload)
  clearAIConfigCache()
  return unwrap<AIConfig | AIConfig[]>(res)
}

// PUT /admin/ai-configs/{providerName}
export async function putAIConfig(providerName: string, payload: Partial<AIConfig>): Promise<AIConfig> {
  const res: any = await api.put(providerConfigUrl(providerName), payload)
  clearAIConfigCache()
  return unwrap<AIConfig>(res)
}

// PUT /admin/ai-configs/{configId}
export async function putAIConfigById(configId: string, payload: Partial<AIConfig>): Promise<AIConfig> {
  const res: any = await api.put(configIdUrl(configId), payload)
  clearAIConfigCache()
  return unwrap<AIConfig>(res)
}

// DELETE /admin/ai-configs/{configId}
export async function deleteAIConfig(configId: string): Promise<any> {
  const res: any = await api.delete(configIdUrl(configId))
  clearAIConfigCache()
  return unwrap<any>(res)
}

// POST /admin/ai-configs/{configId}/set-active
export async function setActiveAIConfig(configId: string, usageType: string, accessTier?: number): Promise<any> {
  const payload: Record<string, unknown> = { usageType }
  if (accessTier !== undefined) {
    payload.accessTier = accessTier
  }
  const res: any = await api.post(setActiveUrl(configId), payload)
  clearAIConfigCache()
  return unwrap<any>(res)
}

export default { getAIConfig, updateAIConfig, putAIConfig, putAIConfigById, deleteAIConfig, setActiveAIConfig, clearAIConfigCache }