import api from '../Axios'
import { configUrl } from './url'

export type AIConfig = {
  provider?: string
  apiKey?: string
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

export async function getAIConfig(): Promise<AIConfig | AIConfig[]> {
  const res: any = await api.get(configUrl)
  return unwrap<AIConfig | AIConfig[]>(res)
}

export async function updateAIConfig(payload: Partial<AIConfig>): Promise<AIConfig | AIConfig[]> {
  const res: any = await api.put(configUrl, payload)
  return unwrap<AIConfig | AIConfig[]>(res)
}

export default { getAIConfig, updateAIConfig }