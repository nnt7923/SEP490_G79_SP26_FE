import api from '../Axios'

export interface AIUsageSummary {
  usageType: string
  totalRequests: number
  totalInputTokens: number
  totalOutputTokens: number
  totalTokens: number
  totalCostUsd: number
}

export async function getAIUsageSummary(): Promise<AIUsageSummary[]> {
  const res: any = await api.get('/admin/ai-usage-logs/summary')
  const data: any = res?.data ?? res
  
  // Handle array response
  if (Array.isArray(data)) {
    return data
  }
  
  // Handle single object response
  if (data && typeof data === 'object') {
    return [data]
  }
  
  return []
}

export default { getAIUsageSummary }