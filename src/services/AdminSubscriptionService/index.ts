import api from '../Axios'

export const SubscriptionFeatureKey = {
  LearningPathCreation: 1,
  TutorMessages: 2,
  FocusSessionReview: 3,
} as const

export type SubscriptionFeatureKey = typeof SubscriptionFeatureKey[keyof typeof SubscriptionFeatureKey]

export const SubscriptionWindowType = {
  Daily: 1,
  Monthly: 2,
  Lifetime: 3,
} as const

export type SubscriptionWindowType = typeof SubscriptionWindowType[keyof typeof SubscriptionWindowType]

export interface SubscriptionPlanLimit {
  featureKey: SubscriptionFeatureKey
  limitCount: number
  windowType: SubscriptionWindowType
  isEnabled: boolean
}

export interface AdminSubscriptionPlan {
  subscriptionPlanId: string
  planType: string
  name: string
  description: string
  priceVnd: number
  durationDays: number
  isActive: boolean
  displayOrder: number
  limits: SubscriptionPlanLimit[]
}

export interface UpsertAdminSubscriptionPlanPayload {
  planType: string
  name: string
  description: string
  priceVnd: number
  durationDays: number
  isActive: boolean
  displayOrder: number
  limits: SubscriptionPlanLimit[]
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

function normalizeFeatureKey(value: unknown): SubscriptionFeatureKey {
  if (typeof value === 'number' && value >= 1 && value <= 3) {
    return value as SubscriptionFeatureKey
  }

  if (typeof value === 'string') {
    const normalized = Number(value)
    if (Number.isFinite(normalized) && normalized >= 1 && normalized <= 3) {
      return normalized as SubscriptionFeatureKey
    }
    const enumValue = SubscriptionFeatureKey[value as keyof typeof SubscriptionFeatureKey]
    if (enumValue) return enumValue
  }

  return SubscriptionFeatureKey.LearningPathCreation
}

function normalizeWindowType(value: unknown): SubscriptionWindowType {
  if (typeof value === 'number' && value >= 1 && value <= 3) {
    return value as SubscriptionWindowType
  }

  if (typeof value === 'string') {
    const normalized = Number(value)
    if (Number.isFinite(normalized) && normalized >= 1 && normalized <= 3) {
      return normalized as SubscriptionWindowType
    }
    const enumValue = SubscriptionWindowType[value as keyof typeof SubscriptionWindowType]
    if (enumValue) return enumValue
  }

  return SubscriptionWindowType.Daily
}

function normalizeLimit(raw: any): SubscriptionPlanLimit {
  return {
    featureKey: normalizeFeatureKey(raw?.featureKey),
    limitCount: Number.isFinite(Number(raw?.limitCount)) ? Number(raw.limitCount) : 0,
    windowType: normalizeWindowType(raw?.windowType),
    isEnabled: Boolean(raw?.isEnabled ?? true),
  }
}

function normalizePlan(raw: any): AdminSubscriptionPlan {
  return {
    subscriptionPlanId: String(raw?.subscriptionPlanId ?? raw?.id ?? ''),
    planType: String(raw?.planType ?? ''),
    name: String(raw?.name ?? ''),
    description: String(raw?.description ?? ''),
    priceVnd: Number.isFinite(Number(raw?.priceVnd)) ? Number(raw.priceVnd) : 0,
    durationDays: Number.isFinite(Number(raw?.durationDays)) ? Number(raw.durationDays) : 0,
    isActive: Boolean(raw?.isActive),
    displayOrder: Number.isFinite(Number(raw?.displayOrder)) ? Number(raw.displayOrder) : 0,
    limits: Array.isArray(raw?.limits) ? raw.limits.map(normalizeLimit) : [],
  }
}

class AdminSubscriptionService {
  async getPlans(): Promise<AdminSubscriptionPlan[]> {
    const response = await api.get(baseUrl)
    return unwrapCollection<any>(response).map(normalizePlan)
  }

  async createPlan(payload: UpsertAdminSubscriptionPlanPayload): Promise<AdminSubscriptionPlan> {
    const response = await api.post(baseUrl, payload)
    return normalizePlan(unwrapObject<any>(response))
  }

  async updatePlan(subscriptionPlanId: string, payload: UpsertAdminSubscriptionPlanPayload): Promise<AdminSubscriptionPlan> {
    const response = await api.put(`${baseUrl}/${subscriptionPlanId}`, payload)
    return normalizePlan(unwrapObject<any>(response))
  }

  async deletePlan(subscriptionPlanId: string): Promise<void> {
    await api.delete(`${baseUrl}/${subscriptionPlanId}`)
  }
}

export default new AdminSubscriptionService()
