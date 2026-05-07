import api from '../Axios'

export const PaymentStatus = {
  Pending: 0,
  Success: 1,
  Failed: 2,
  Canceled: 3,
} as const

export type PaymentStatus = typeof PaymentStatus[keyof typeof PaymentStatus]

export interface BillingTransaction {
  paymentTransactionId: string
  userId: string
  username: string
  email: string
  subscriptionPlanId: string
  subscriptionPlanName: string
  amount: number
  provider: string
  txnRef: string
  status: PaymentStatus
  responseCode: string
  transactionNo: string
  bankCode: string
  orderInfo: string
  paidAt: string
  createdAt: string
  updatedAt: string
}

export interface BillingTransactionsQuery {
  pageNumber?: number
  pageSize?: number
  fromUtc?: string
  toUtc?: string
  status?: PaymentStatus
  userId?: string
  subscriptionPlanId?: string
  provider?: string
  search?: string
}

export interface BillingTransactionsPage {
  items: BillingTransaction[]
  pageNumber: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export interface BillingSummaryQuery {
  fromUtc?: string
  toUtc?: string
  provider?: string
}

export interface BillingSummaryDailyRevenue {
  date: string
  transactions: number
  successfulTransactions: number
  revenueVnd: number
}

export interface BillingSummary {
  fromUtc: string | null
  toUtc: string | null
  totalTransactions: number
  pendingTransactions: number
  successfulTransactions: number
  failedTransactions: number
  canceledTransactions: number
  totalRevenueVnd: number
  dailyRevenue: BillingSummaryDailyRevenue[]
}

export interface BillingMonthlyOverview {
  packageProfitVnd: number
  aiProfitUsd: number
}

type BillingTransactionsListCacheEntry = {
  expiresAt: number
  data: BillingTransactionsPage
}

type BillingTransactionDetailCacheEntry = {
  expiresAt: number
  data: BillingTransaction
}

type BillingSummaryCacheEntry = {
  expiresAt: number
  data: BillingSummary
}

const BILLING_LIST_CACHE_PREFIX = 'admin:billing:transactions:list:'
const BILLING_DETAIL_CACHE_PREFIX = 'admin:billing:transactions:detail:'
const BILLING_SUMMARY_CACHE_PREFIX = 'admin:billing:summary:'
const BILLING_CACHE_TTL_MS = 2 * 60 * 1000

const billingListMemoryCache = new Map<string, BillingTransactionsListCacheEntry>()
const billingDetailMemoryCache = new Map<string, BillingTransactionDetailCacheEntry>()
const billingSummaryMemoryCache = new Map<string, BillingSummaryCacheEntry>()

function normalizeStatus(value: unknown): PaymentStatus {
  const numeric = Number(value)
  if (numeric === PaymentStatus.Pending) return PaymentStatus.Pending
  if (numeric === PaymentStatus.Success) return PaymentStatus.Success
  if (numeric === PaymentStatus.Failed) return PaymentStatus.Failed
  if (numeric === PaymentStatus.Canceled) return PaymentStatus.Canceled

  const normalizedText = String(value ?? '').trim().toLowerCase()
  if (normalizedText === 'pending') return PaymentStatus.Pending
  if (normalizedText === 'success' || normalizedText === 'succeeded') return PaymentStatus.Success
  if (normalizedText === 'failed' || normalizedText === 'fail') return PaymentStatus.Failed
  if (normalizedText === 'canceled' || normalizedText === 'cancelled') return PaymentStatus.Canceled

  return PaymentStatus.Pending
}

function normalizeTransaction(raw: any): BillingTransaction {
  return {
    paymentTransactionId: String(raw?.paymentTransactionId ?? ''),
    userId: String(raw?.userId ?? ''),
    username: String(raw?.username ?? ''),
    email: String(raw?.email ?? ''),
    subscriptionPlanId: String(raw?.subscriptionPlanId ?? ''),
    subscriptionPlanName: String(raw?.subscriptionPlanName ?? ''),
    amount: Number.isFinite(Number(raw?.amount)) ? Number(raw?.amount) : 0,
    provider: String(raw?.provider ?? ''),
    txnRef: String(raw?.txnRef ?? ''),
    status: normalizeStatus(raw?.status ?? raw?.paymentStatus),
    responseCode: String(raw?.responseCode ?? ''),
    transactionNo: String(raw?.transactionNo ?? ''),
    bankCode: String(raw?.bankCode ?? ''),
    orderInfo: String(raw?.orderInfo ?? ''),
    paidAt: String(raw?.paidAt ?? ''),
    createdAt: String(raw?.createdAt ?? ''),
    updatedAt: String(raw?.updatedAt ?? ''),
  }
}

function unwrapPage(raw: unknown): BillingTransactionsPage {
  const data = (raw as { data?: unknown })?.data ?? raw
  const source = (data && typeof data === 'object' && (data as any).value)
    ? (data as any).value
    : data

  const record = (source && typeof source === 'object') ? source as Record<string, unknown> : {}
  const itemsRaw = Array.isArray(record.items)
    ? record.items
    : Array.isArray(record.data)
      ? record.data
      : []

  const pageNumber = Number(record.pageNumber)
  const pageSize = Number(record.pageSize)
  const totalCount = Number(record.totalCount)
  const totalPages = Number(record.totalPages)

  return {
    items: itemsRaw.map(normalizeTransaction),
    pageNumber: Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : 1,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : itemsRaw.length || 20,
    totalCount: Number.isFinite(totalCount) && totalCount >= 0 ? totalCount : itemsRaw.length,
    totalPages: Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 1,
    hasPreviousPage: Boolean(record.hasPreviousPage),
    hasNextPage: Boolean(record.hasNextPage),
  }
}

function unwrapObject(raw: unknown): unknown {
  const data = (raw as { data?: unknown })?.data ?? raw
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>
    if (record.value !== undefined) return record.value
  }
  return data
}

function toSafeNumber(value: unknown, fallback = 0): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function normalizeSummary(raw: unknown): BillingSummary {
  const source = unwrapObject(raw)
  const record = (source && typeof source === 'object') ? source as Record<string, unknown> : {}
  const dailyRevenueRaw = Array.isArray(record.dailyRevenue) ? record.dailyRevenue : []

  return {
    fromUtc: record.fromUtc ? String(record.fromUtc) : null,
    toUtc: record.toUtc ? String(record.toUtc) : null,
    totalTransactions: toSafeNumber(record.totalTransactions),
    pendingTransactions: toSafeNumber(record.pendingTransactions),
    successfulTransactions: toSafeNumber(record.successfulTransactions),
    failedTransactions: toSafeNumber(record.failedTransactions),
    canceledTransactions: toSafeNumber(record.canceledTransactions),
    totalRevenueVnd: toSafeNumber(record.totalRevenueVnd),
    dailyRevenue: dailyRevenueRaw.map((item) => {
      const row = (item && typeof item === 'object') ? item as Record<string, unknown> : {}
      return {
        date: String(row.date ?? ''),
        transactions: toSafeNumber(row.transactions),
        successfulTransactions: toSafeNumber(row.successfulTransactions),
        revenueVnd: toSafeNumber(row.revenueVnd),
      }
    }),
  }
}

function readBillingListStorageCache(cacheKey: string): BillingTransactionsListCacheEntry | null {
  try {
    if (typeof window === 'undefined') return null
    const raw = window.sessionStorage.getItem(`${BILLING_LIST_CACHE_PREFIX}${cacheKey}`)
    if (!raw) return null

    const parsed = JSON.parse(raw) as BillingTransactionsListCacheEntry
    if (!parsed?.expiresAt || parsed.expiresAt <= Date.now() || !Array.isArray(parsed?.data?.items)) {
      window.sessionStorage.removeItem(`${BILLING_LIST_CACHE_PREFIX}${cacheKey}`)
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function writeBillingListStorageCache(cacheKey: string, entry: BillingTransactionsListCacheEntry): void {
  try {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem(`${BILLING_LIST_CACHE_PREFIX}${cacheKey}`, JSON.stringify(entry))
  } catch {
    // ignore cache write errors
  }
}

function readBillingDetailStorageCache(transactionId: string): BillingTransactionDetailCacheEntry | null {
  try {
    if (typeof window === 'undefined') return null
    const raw = window.sessionStorage.getItem(`${BILLING_DETAIL_CACHE_PREFIX}${transactionId}`)
    if (!raw) return null

    const parsed = JSON.parse(raw) as BillingTransactionDetailCacheEntry
    if (!parsed?.expiresAt || parsed.expiresAt <= Date.now() || !parsed?.data?.paymentTransactionId) {
      window.sessionStorage.removeItem(`${BILLING_DETAIL_CACHE_PREFIX}${transactionId}`)
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function writeBillingDetailStorageCache(transactionId: string, entry: BillingTransactionDetailCacheEntry): void {
  try {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem(`${BILLING_DETAIL_CACHE_PREFIX}${transactionId}`, JSON.stringify(entry))
  } catch {
    // ignore cache write errors
  }
}

function readBillingSummaryStorageCache(cacheKey: string): BillingSummaryCacheEntry | null {
  try {
    if (typeof window === 'undefined') return null
    const raw = window.sessionStorage.getItem(`${BILLING_SUMMARY_CACHE_PREFIX}${cacheKey}`)
    if (!raw) return null

    const parsed = JSON.parse(raw) as BillingSummaryCacheEntry
    if (!parsed?.expiresAt || parsed.expiresAt <= Date.now()) {
      window.sessionStorage.removeItem(`${BILLING_SUMMARY_CACHE_PREFIX}${cacheKey}`)
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function writeBillingSummaryStorageCache(cacheKey: string, entry: BillingSummaryCacheEntry): void {
  try {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem(`${BILLING_SUMMARY_CACHE_PREFIX}${cacheKey}`, JSON.stringify(entry))
  } catch {
    // ignore cache write errors
  }
}

function writeBillingDetailCache(transaction: BillingTransaction): void {
  const transactionId = String(transaction.paymentTransactionId || '')
  if (!transactionId) return

  const cacheEntry: BillingTransactionDetailCacheEntry = {
    data: transaction,
    expiresAt: Date.now() + BILLING_CACHE_TTL_MS,
  }

  billingDetailMemoryCache.set(transactionId, cacheEntry)
  writeBillingDetailStorageCache(transactionId, cacheEntry)
}

export function clearAdminBillingCache(): void {
  billingListMemoryCache.clear()
  billingDetailMemoryCache.clear()
  billingSummaryMemoryCache.clear()
  try {
    if (typeof window === 'undefined') return
    const keys: string[] = []
    for (let index = 0; index < window.sessionStorage.length; index++) {
      const key = window.sessionStorage.key(index)
      if (key) keys.push(key)
    }
    keys
      .filter((key) => key.startsWith(BILLING_LIST_CACHE_PREFIX) || key.startsWith(BILLING_DETAIL_CACHE_PREFIX) || key.startsWith(BILLING_SUMMARY_CACHE_PREFIX))
      .forEach((key) => window.sessionStorage.removeItem(key))
  } catch {
    // ignore cache clear errors
  }
}

function buildSummaryQueryParams(query: BillingSummaryQuery): URLSearchParams {
  const params = new URLSearchParams()

  if (query.fromUtc) params.set('FromUtc', query.fromUtc)
  if (query.toUtc) params.set('ToUtc', query.toUtc)
  if (query.provider) params.set('Provider', query.provider)

  return params
}

function buildQueryParams(query: BillingTransactionsQuery): URLSearchParams {
  const params = new URLSearchParams()

  if (Number.isFinite(query.pageNumber) && Number(query.pageNumber) > 0) {
    params.set('PageNumber', String(query.pageNumber))
  }

  if (Number.isFinite(query.pageSize) && Number(query.pageSize) > 0) {
    params.set('PageSize', String(query.pageSize))
  }

  if (query.fromUtc) params.set('FromUtc', query.fromUtc)
  if (query.toUtc) params.set('ToUtc', query.toUtc)

  if (query.status !== undefined && query.status !== null) {
    params.set('Status', String(query.status))
  }

  if (query.userId) params.set('UserId', query.userId)
  if (query.subscriptionPlanId) params.set('SubscriptionPlanId', query.subscriptionPlanId)
  if (query.provider) params.set('Provider', query.provider)
  if (query.search) params.set('Search', query.search)

  return params
}

class AdminBillingService {
  async getTransactions(query: BillingTransactionsQuery): Promise<BillingTransactionsPage> {
    const params = buildQueryParams(query)
    const cacheKey = params.toString() || 'default'

    const memoryEntry = billingListMemoryCache.get(cacheKey)
    if (memoryEntry && memoryEntry.expiresAt > Date.now()) {
      return memoryEntry.data
    }

    const storageEntry = readBillingListStorageCache(cacheKey)
    if (storageEntry) {
      billingListMemoryCache.set(cacheKey, storageEntry)
      storageEntry.data.items.forEach(writeBillingDetailCache)
      return storageEntry.data
    }

    const response = await api.get(`/admin/billing/transactions?${params.toString()}`)
    const data = unwrapPage(response)

    const cacheEntry: BillingTransactionsListCacheEntry = {
      data,
      expiresAt: Date.now() + BILLING_CACHE_TTL_MS,
    }
    billingListMemoryCache.set(cacheKey, cacheEntry)
    writeBillingListStorageCache(cacheKey, cacheEntry)

    data.items.forEach(writeBillingDetailCache)

    return data
  }

  async getTransactionById(transactionId: string): Promise<BillingTransaction> {
    const normalizedTransactionId = String(transactionId)
    const memoryEntry = billingDetailMemoryCache.get(normalizedTransactionId)
    if (memoryEntry && memoryEntry.expiresAt > Date.now()) {
      return memoryEntry.data
    }

    const storageEntry = readBillingDetailStorageCache(normalizedTransactionId)
    if (storageEntry) {
      billingDetailMemoryCache.set(normalizedTransactionId, storageEntry)
      return storageEntry.data
    }

    const response = await api.get(`/admin/billing/transactions/${transactionId}`)
    const data = normalizeTransaction(unwrapObject(response))
    writeBillingDetailCache(data)
    return data
  }

  async getSummary(query: BillingSummaryQuery): Promise<BillingSummary> {
    const params = buildSummaryQueryParams(query)
    const cacheKey = params.toString() || 'default'

    const memoryEntry = billingSummaryMemoryCache.get(cacheKey)
    if (memoryEntry && memoryEntry.expiresAt > Date.now()) {
      return memoryEntry.data
    }

    const storageEntry = readBillingSummaryStorageCache(cacheKey)
    if (storageEntry) {
      billingSummaryMemoryCache.set(cacheKey, storageEntry)
      return storageEntry.data
    }

    const queryString = params.toString()
    const response = await api.get(queryString ? `/admin/billing/summary?${queryString}` : '/admin/billing/summary')
    const data = normalizeSummary(response)

    const cacheEntry: BillingSummaryCacheEntry = {
      data,
      expiresAt: Date.now() + BILLING_CACHE_TTL_MS,
    }

    billingSummaryMemoryCache.set(cacheKey, cacheEntry)
    writeBillingSummaryStorageCache(cacheKey, cacheEntry)

    return data
  }

  async getMonthlyOverview(year: number, month: number): Promise<BillingMonthlyOverview> {
    const response = await api.get(`/admin/billing/monthly-overview?year=${year}&month=${month}`)
    return {
      packageProfitVnd: Number(response?.packageProfitVnd ?? 0),
      aiProfitUsd: Number(response?.aiProfitUsd ?? 0),
    }
  }
}

export default new AdminBillingService()
