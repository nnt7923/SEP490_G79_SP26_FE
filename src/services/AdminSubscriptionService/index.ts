import api from '../Axios'

export interface AdminSubscriptionPlan {
  subscriptionPlanId: string
  planType: string
  name: string
  description: string
  priceVnd: number
  durationDays: number
  isActive: boolean
  displayOrder: number
}

export interface UpsertAdminSubscriptionPlanPayload {
  planType: string
  name: string
  description: string
  priceVnd: number
  durationDays: number
  isActive: boolean
  displayOrder: number
}

const baseUrl = '/admin/subscription-plans'

function unwrapCollection<T>(raw: unknown): T[] {
  const data = (raw as { data?: unknown })?.data ?? raw

  if (Array.isArray(data)) return data as T[]

  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    if (Array.isArray(obj.items)) return obj.items as T[]
    if (Array.isArray(obj.value)) return obj.value as T[]
    if (Array.isArray(obj.data)) return obj.data as T[]
    if (obj.data && typeof obj.data === 'object') {
      const nestedData = obj.data as Record<string, unknown>
      if (Array.isArray(nestedData.items)) return nestedData.items as T[]
      if (Array.isArray(nestedData.value)) return nestedData.value as T[]
    }
  }

  return []
}

function unwrapObject<T>(raw: unknown): T {
  const data = (raw as { data?: unknown })?.data ?? raw
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    if (obj.value && typeof obj.value === 'object') {
      return obj.value as T
    }
  }
  return data as T
}

class AdminSubscriptionService {
  async getPlans(): Promise<AdminSubscriptionPlan[]> {
    const response = await api.get(baseUrl)
    return unwrapCollection<AdminSubscriptionPlan>(response)
  }

  async createPlan(payload: UpsertAdminSubscriptionPlanPayload): Promise<AdminSubscriptionPlan> {
    const response = await api.post(baseUrl, payload)
    return unwrapObject<AdminSubscriptionPlan>(response)
  }

  async updatePlan(subscriptionPlanId: string, payload: UpsertAdminSubscriptionPlanPayload): Promise<AdminSubscriptionPlan> {
    const response = await api.put(`${baseUrl}/${subscriptionPlanId}`, payload)
    return unwrapObject<AdminSubscriptionPlan>(response)
  }

  async deletePlan(subscriptionPlanId: string): Promise<void> {
    await api.delete(`${baseUrl}/${subscriptionPlanId}`)
  }
}

export default new AdminSubscriptionService()
