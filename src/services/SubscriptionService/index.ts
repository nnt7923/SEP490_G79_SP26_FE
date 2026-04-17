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
  subscriptionPlanId?: string
  tokenPackageId?: string
  topUpAmountVnd?: number
  orderInfo?: string
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

export interface TokenPackage {
  tokenPackageId: string
  name: string
  description: string
  priceVnd: number
  creditedTokens: number
  creditedBalanceVnd: number
  bonusVnd: number
  isActive: boolean
  displayOrder: number
  [key: string]: unknown
}

export interface TokenTopUpPricing {
  vndPerToken: number
  tokensPer1000Vnd: number
  minimumTopUpVnd: number
  maximumTopUpVnd: number
  [key: string]: unknown
}

export type PaymentTransactionStatus =
  | 'pending'
  | 'success'
  | 'already-processed'
  | 'failed'
  | 'canceled'

export interface PaymentTransactionItem {
  paymentTransactionId: string
  tokenPackageName?: string
  amount: number
  creditedTokens: number
  creditedAmountVnd: number
  status: string
  paidAt?: string
  createdAt?: string
  bankCode?: string
  txnRef?: string
  message?: string
  orderInfo?: string
  [key: string]: unknown
}

export interface PaymentTransactionDetail extends PaymentTransactionItem {
  updatedAt?: string
}

export interface MyTransactionsQuery {
  PageNumber: number
  PageSize: number
  FromUtc?: string
  ToUtc?: string
  Status?: 'pending' | 'success' | 'failed' | 'canceled'
}

export interface MyTransactionsResult {
  items: PaymentTransactionItem[]
  totalCount: number
  pageNumber: number
  pageSize: number
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

function normalizeTokenPackage(raw: unknown): TokenPackage {
  const record = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {}

  const priceVnd = Number.isFinite(Number(record.priceVnd ?? record.PriceVnd))
    ? Number(record.priceVnd ?? record.PriceVnd)
    : 0
  const creditedTokens = Number.isFinite(Number(record.creditedTokens ?? record.CreditedTokens ?? record.creditedBalanceVnd ?? record.CreditedBalanceVnd))
    ? Number(record.creditedTokens ?? record.CreditedTokens ?? record.creditedBalanceVnd ?? record.CreditedBalanceVnd)
    : 0
  const bonusVnd = Math.max(0, creditedTokens - priceVnd)

  return {
    tokenPackageId: String(record.tokenPackageId ?? record.id ?? ''),
    name: String(record.name ?? ''),
    description: String(record.description ?? ''),
    priceVnd,
    creditedTokens,
    creditedBalanceVnd: creditedTokens,
    bonusVnd,
    isActive: Boolean(record.isActive ?? true),
    displayOrder: Number.isFinite(Number(record.displayOrder)) ? Number(record.displayOrder) : 0,
    ...record,
  }
}

function normalizeTokenTopUpPricing(raw: unknown): TokenTopUpPricing {
  const record = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {}

  return {
    vndPerToken: toNumberValue(record.vndPerToken ?? record.VndPerToken),
    tokensPer1000Vnd: toNumberValue(record.tokensPer1000Vnd ?? record.TokensPer1000Vnd),
    minimumTopUpVnd: Math.max(0, Math.round(toNumberValue(record.minimumTopUpVnd ?? record.MinimumTopUpVnd))),
    maximumTopUpVnd: Math.max(0, Math.round(toNumberValue(record.maximumTopUpVnd ?? record.MaximumTopUpVnd))),
    ...record,
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

function toNumberValue(raw: unknown): number {
  const value = Number(raw)
  return Number.isFinite(value) ? value : 0
}

function normalizePaymentTransaction(raw: unknown): PaymentTransactionItem {
  const record = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {}
  const amountRaw = toNumberValue(record.amount ?? record.amountVnd ?? record.vnpAmount)
  const creditedRaw = toNumberValue(
    record.creditedTokens
    ?? record.CreditedTokens
    ?? record.creditedAmountVnd
    ?? record.CreditedAmountVnd
    ?? record.creditedAmount
    ?? record.creditAmountVnd
    ?? record.creditedBalanceVnd
    ?? record.CreditedBalanceVnd,
  )
  const normalizedCreditedTokens = Math.max(0, Math.round(creditedRaw))

  return {
    paymentTransactionId: String(record.paymentTransactionId ?? record.id ?? ''),
    tokenPackageName: String(record.tokenPackageName ?? record.packageName ?? '').trim() || undefined,
    amount: Math.max(0, Math.round(amountRaw)),
    creditedTokens: normalizedCreditedTokens,
    // Backward-compatible alias to avoid breaking old UI branches.
    creditedAmountVnd: normalizedCreditedTokens,
    txnRef: String(record.txnRef ?? record.vnpTxnRef ?? ''),
    status: String(record.status ?? record.paymentStatus ?? '').trim(),
    paidAt: String(record.paidAt ?? record.paymentTime ?? '').trim() || undefined,
    createdAt: String(record.createdAt ?? '').trim() || undefined,
    message: String(record.message ?? record.description ?? '').trim() || undefined,
    bankCode: String(record.bankCode ?? record.vnpBankCode ?? '').trim() || undefined,
    orderInfo: String(record.orderInfo ?? record.vnpOrderInfo ?? '').trim() || undefined,
    ...record,
  }
}

function unwrapPaymentTransactionList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw
  if (!raw || typeof raw !== 'object') return []

  const record = raw as Record<string, unknown>
  if (Array.isArray(record.data)) return record.data
  if (Array.isArray(record.items)) return record.items

  if (record.data && typeof record.data === 'object') {
    const nested = record.data as Record<string, unknown>
    if (Array.isArray(nested.items)) return nested.items
    if (Array.isArray(nested.data)) return nested.data
    if (Array.isArray(nested.value)) return nested.value
  }

  return []
}

function unwrapPaginationMeta(raw: unknown): {
  totalCount: number
  pageNumber: number
  pageSize: number
} {
  const fallback = { totalCount: 0, pageNumber: 1, pageSize: 10 }
  if (!raw || typeof raw !== 'object') return fallback

  const record = raw as Record<string, unknown>
  const rootData = record.data && typeof record.data === 'object'
    ? record.data as Record<string, unknown>
    : null
  const paging = (record.pagination && typeof record.pagination === 'object'
    ? record.pagination
    : rootData?.pagination) as Record<string, unknown> | undefined

  const totalCount = toNumberValue(
    record.totalCount
    ?? rootData?.totalCount
    ?? paging?.totalCount
    ?? paging?.TotalCount,
  )
  const pageNumber = Math.max(1, Math.round(toNumberValue(
    record.pageNumber
    ?? rootData?.pageNumber
    ?? paging?.pageNumber
    ?? paging?.PageNumber
    ?? 1,
  )))
  const pageSize = Math.max(1, Math.round(toNumberValue(
    record.pageSize
    ?? rootData?.pageSize
    ?? paging?.pageSize
    ?? paging?.PageSize
    ?? 10,
  )))

  return { totalCount, pageNumber, pageSize }
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

  async getTokenPackages(): Promise<TokenPackage[]> {
    const response = await axiosInstance.get('/token-packages')
    return unwrapPlansResponse(response).map(normalizeTokenPackage)
  }

  async getTokenTopUpPricing(): Promise<TokenTopUpPricing> {
    const response = await axiosInstance.get('/token-packages/pricing')
    const source = (response as any)?.data ?? (response as any)?.value ?? response
    return normalizeTokenTopUpPricing(source)
  }

  async verifyVnpayCallback(query: Record<string, string>): Promise<Record<string, unknown>> {
    try {
      const response = await axiosInstance.get('/payments/vnpay/callback', { params: query })
      return (response ?? {}) as Record<string, unknown>
    } catch (error: any) {
      const status = Number(error?.response?.status)
      if (status === 404 || status === 405) {
        const response = await axiosInstance.post('/payments/vnpay/callback', query)
        return (response ?? {}) as Record<string, unknown>
      }
      throw error
    }
  }

  async getMyTransactions(query: MyTransactionsQuery): Promise<MyTransactionsResult> {
    const response = await axiosInstance.get('/payments/my-transactions', {
      params: query,
    })
    const items = unwrapPaymentTransactionList(response).map(normalizePaymentTransaction)
    const meta = unwrapPaginationMeta(response)

    return {
      items,
      totalCount: meta.totalCount,
      pageNumber: meta.pageNumber,
      pageSize: meta.pageSize,
    }
  }

  async getMyTransactionById(paymentTransactionId: string): Promise<PaymentTransactionDetail> {
    const response = await axiosInstance.get(`/payments/my-transactions/${paymentTransactionId}`)
    const normalized = normalizePaymentTransaction(
      (response as any)?.data ?? (response as any)?.value ?? response,
    )

    return normalized as PaymentTransactionDetail
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
