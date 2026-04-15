import axiosInstance from '../Axios'

type SubscriptionPlansCacheEntry = {
  expiresAt: number
  data: SubscriptionPlan[]
}

type CurrentSubscriptionCacheEntry = {
  expiresAt: number
  data: CurrentSubscriptionPlan | null
}

const SUBSCRIPTION_PLANS_CACHE_KEY = 'subscription:plans'
const SUBSCRIPTION_PLANS_CACHE_TTL_MS = 2 * 60 * 1000
let subscriptionPlansMemoryCache: SubscriptionPlansCacheEntry | null = null
const CURRENT_SUBSCRIPTION_CACHE_KEY = 'subscription:current'
const CURRENT_SUBSCRIPTION_CACHE_TTL_MS = 2 * 60 * 1000
let currentSubscriptionMemoryCache: CurrentSubscriptionCacheEntry | null = null

export interface SubscriptionPlanLimit {
  featureKey: number
  limitCount: number
  windowType: number
  isEnabled: boolean
}

export interface SubscriptionPlan {
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

export interface CreateVnpayPaymentRequest {
  subscriptionPlanId: string
  orderInfo: string
  returnUrl: string
}

export interface CreateVnpayPaymentResponse {
  paymentUrl?: string
  payUrl?: string
  url?: string
  [key: string]: unknown
}

export interface CurrentSubscriptionPlan {
  subscriptionPlanId?: string
  planType?: string
  name?: string
  description?: string
  priceVnd?: number
  durationDays?: number
  expiresAt?: string
  startedAt?: string
  startDate?: string
  expiredAt?: string
  endDate?: string
  isFreeFallback?: boolean
  isActive?: boolean
  status?: string
  [key: string]: unknown
}

function normalizeCurrentSubscription(raw: unknown): CurrentSubscriptionPlan | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  const record = raw as Record<string, unknown>

  if (record.data && typeof record.data === 'object') {
    return record.data as CurrentSubscriptionPlan
  }

  return record as CurrentSubscriptionPlan
}

function normalizeEnumValue(
  value: unknown,
  fallback: number,
  stringEnumMap?: Record<string, number>,
): number {
  const asNumber = Number(value)
  if (Number.isFinite(asNumber) && asNumber > 0) {
    return asNumber
  }

  if (typeof value === 'string' && stringEnumMap) {
    const normalized = stringEnumMap[value]
    if (typeof normalized === 'number') {
      return normalized
    }
  }

  return fallback
}

const featureKeyMap: Record<string, number> = {
  LearningPathCreation: 1,
  TutorMessages: 2,
  FocusSessionReview: 3,
}

const windowTypeMap: Record<string, number> = {
  Daily: 1,
  Monthly: 2,
  Lifetime: 3,
}

function normalizeLimit(raw: unknown): SubscriptionPlanLimit {
  const record = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {}

  return {
    featureKey: normalizeEnumValue(record.featureKey, 1, featureKeyMap),
    limitCount: Number.isFinite(Number(record.limitCount)) ? Number(record.limitCount) : 0,
    windowType: normalizeEnumValue(record.windowType, 1, windowTypeMap),
    isEnabled: Boolean(record.isEnabled ?? true),
  }
}

function normalizePlan(raw: unknown): SubscriptionPlan {
  const record = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {}

  return {
    subscriptionPlanId: String(record.subscriptionPlanId ?? record.id ?? ''),
    planType: String(record.planType ?? ''),
    name: String(record.name ?? ''),
    description: String(record.description ?? ''),
    priceVnd: Number.isFinite(Number(record.priceVnd)) ? Number(record.priceVnd) : 0,
    durationDays: Number.isFinite(Number(record.durationDays)) ? Number(record.durationDays) : 0,
    isActive: Boolean(record.isActive),
    displayOrder: Number.isFinite(Number(record.displayOrder)) ? Number(record.displayOrder) : 0,
    limits: Array.isArray(record.limits) ? record.limits.map(normalizeLimit) : [],
  }
}

function unwrapPlansResponse(raw: unknown): unknown[] {
  if (Array.isArray(raw)) {
    return raw
  }

  if (!raw || typeof raw !== 'object') {
    return []
  }

  const record = raw as Record<string, unknown>
  if (Array.isArray(record.data)) {
    return record.data
  }

  const nestedData = record.data
  if (nestedData && typeof nestedData === 'object') {
    const nested = nestedData as Record<string, unknown>
    if (Array.isArray(nested.items)) return nested.items
    if (Array.isArray(nested.value)) return nested.value
    if (Array.isArray(nested.data)) return nested.data
  }

  if (Array.isArray(record.items)) return record.items
  if (Array.isArray(record.value)) return record.value

  return []
}

function readSubscriptionPlansStorageCache(): SubscriptionPlansCacheEntry | null {
  try {
    if (typeof window === 'undefined') return null
    const raw = window.sessionStorage.getItem(SUBSCRIPTION_PLANS_CACHE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as SubscriptionPlansCacheEntry
    if (!parsed?.expiresAt || parsed.expiresAt <= Date.now() || !Array.isArray(parsed.data)) {
      window.sessionStorage.removeItem(SUBSCRIPTION_PLANS_CACHE_KEY)
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function writeSubscriptionPlansStorageCache(entry: SubscriptionPlansCacheEntry): void {
  try {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem(SUBSCRIPTION_PLANS_CACHE_KEY, JSON.stringify(entry))
  } catch {
    // ignore cache write errors
  }
}

export function clearSubscriptionPlansCache(): void {
  subscriptionPlansMemoryCache = null
  try {
    if (typeof window === 'undefined') return
    window.sessionStorage.removeItem(SUBSCRIPTION_PLANS_CACHE_KEY)
  } catch {
    // ignore cache clear errors
  }
}

function readCurrentSubscriptionStorageCache(): CurrentSubscriptionCacheEntry | null {
  try {
    if (typeof window === 'undefined') return null
    const raw = window.sessionStorage.getItem(CURRENT_SUBSCRIPTION_CACHE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as CurrentSubscriptionCacheEntry
    if (!parsed?.expiresAt || parsed.expiresAt <= Date.now()) {
      window.sessionStorage.removeItem(CURRENT_SUBSCRIPTION_CACHE_KEY)
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function writeCurrentSubscriptionStorageCache(entry: CurrentSubscriptionCacheEntry): void {
  try {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem(CURRENT_SUBSCRIPTION_CACHE_KEY, JSON.stringify(entry))
  } catch {
    // ignore cache write errors
  }
}

export function clearCurrentSubscriptionCache(): void {
  currentSubscriptionMemoryCache = null
  try {
    if (typeof window === 'undefined') return
    window.sessionStorage.removeItem(CURRENT_SUBSCRIPTION_CACHE_KEY)
  } catch {
    // ignore cache clear errors
  }
}

export function clearSubscriptionCaches(): void {
  clearSubscriptionPlansCache()
  clearCurrentSubscriptionCache()
}

class SubscriptionService {
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    if (subscriptionPlansMemoryCache && subscriptionPlansMemoryCache.expiresAt > Date.now()) {
      return subscriptionPlansMemoryCache.data
    }

    const storageEntry = readSubscriptionPlansStorageCache()
    if (storageEntry) {
      subscriptionPlansMemoryCache = storageEntry
      return storageEntry.data
    }

    const response = await axiosInstance.get('/subscription-plans')
    const normalizedPlans = unwrapPlansResponse(response).map(normalizePlan)
    const cacheEntry: SubscriptionPlansCacheEntry = {
      data: normalizedPlans,
      expiresAt: Date.now() + SUBSCRIPTION_PLANS_CACHE_TTL_MS,
    }

    subscriptionPlansMemoryCache = cacheEntry
    writeSubscriptionPlansStorageCache(cacheEntry)

    return normalizedPlans
  }

  async createVnpayPayment(payload: CreateVnpayPaymentRequest): Promise<CreateVnpayPaymentResponse> {
    const response = await axiosInstance.post('/payments/vnpay/create', payload)
    return response as unknown as CreateVnpayPaymentResponse
  }

  async getCurrentSubscription(): Promise<CurrentSubscriptionPlan | null> {
    const response = await axiosInstance.get('/subscription-plans/me') as unknown
    const normalizedData = normalizeCurrentSubscription(response)

    const cacheEntry: CurrentSubscriptionCacheEntry = {
      data: normalizedData,
      expiresAt: Date.now() + CURRENT_SUBSCRIPTION_CACHE_TTL_MS,
    }
    currentSubscriptionMemoryCache = cacheEntry
    writeCurrentSubscriptionStorageCache(cacheEntry)

    return normalizedData
  }
}

export default new SubscriptionService()
