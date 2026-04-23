import api from '../Axios'

type AdminTokenPackagesCacheEntry = {
  expiresAt: number
  data: AdminTokenPackage[]
}

type AdminMentorPackagesCacheEntry = {
  expiresAt: number
  data: AdminMentorPackage[]
}

const ADMIN_TOKEN_PACKAGES_CACHE_KEY = 'admin:token-packages:list'
const ADMIN_MENTOR_PACKAGES_CACHE_KEY = 'admin:mentor-packages:list'
const ADMIN_TOKEN_PACKAGES_CACHE_TTL_MS = 2 * 60 * 1000
let adminTokenPackagesMemoryCache: AdminTokenPackagesCacheEntry | null = null
let adminMentorPackagesMemoryCache: AdminMentorPackagesCacheEntry | null = null

export interface AdminTokenPackage {
  tokenPackageId: string
  name: string
  description: string
  priceVnd: number
  creditedTokens: number
  isActive: boolean
  displayOrder: number
  [key: string]: unknown
}

export interface UpsertAdminTokenPackagePayload {
  name: string
  description: string
  priceVnd: number
  creditedTokens: number
  isActive: boolean
  displayOrder: number
}

export interface AdminMentorPackage {
  mentorPackageId: string
  name: string
  description: string
  priceVnd: number
  sharesFromMentorLimit: number
  validationRequestLimit: number
  taskReviewLimit: number
  isActive: boolean
  displayOrder: number
  [key: string]: unknown
}

export interface UpsertAdminMentorPackagePayload {
  name: string
  description: string
  priceVnd: number
  sharesFromMentorLimit: number
  validationRequestLimit: number
  taskReviewLimit: number
  isActive: boolean
  displayOrder: number
}

const tokenBaseUrl = '/admin/token-packages'
const mentorBaseUrl = '/admin/mentor-packages'

function readAdminTokenPackagesStorageCache(): AdminTokenPackagesCacheEntry | null {
  try {
    if (typeof window === 'undefined') return null
    const raw = window.sessionStorage.getItem(ADMIN_TOKEN_PACKAGES_CACHE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as AdminTokenPackagesCacheEntry
    if (!parsed?.expiresAt || parsed.expiresAt <= Date.now() || !Array.isArray(parsed?.data)) {
      window.sessionStorage.removeItem(ADMIN_TOKEN_PACKAGES_CACHE_KEY)
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function writeAdminTokenPackagesStorageCache(entry: AdminTokenPackagesCacheEntry): void {
  try {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem(ADMIN_TOKEN_PACKAGES_CACHE_KEY, JSON.stringify(entry))
  } catch {
    // ignore cache write errors
  }
}

function readAdminMentorPackagesStorageCache(): AdminMentorPackagesCacheEntry | null {
  try {
    if (typeof window === 'undefined') return null
    const raw = window.sessionStorage.getItem(ADMIN_MENTOR_PACKAGES_CACHE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as AdminMentorPackagesCacheEntry
    if (!parsed?.expiresAt || parsed.expiresAt <= Date.now() || !Array.isArray(parsed?.data)) {
      window.sessionStorage.removeItem(ADMIN_MENTOR_PACKAGES_CACHE_KEY)
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function writeAdminMentorPackagesStorageCache(entry: AdminMentorPackagesCacheEntry): void {
  try {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem(ADMIN_MENTOR_PACKAGES_CACHE_KEY, JSON.stringify(entry))
  } catch {
    // ignore cache write errors
  }
}

export function clearAdminSubscriptionPlansCache(): void {
  adminTokenPackagesMemoryCache = null
  adminMentorPackagesMemoryCache = null
  try {
    if (typeof window === 'undefined') return
    window.sessionStorage.removeItem(ADMIN_TOKEN_PACKAGES_CACHE_KEY)
    window.sessionStorage.removeItem(ADMIN_MENTOR_PACKAGES_CACHE_KEY)
  } catch {
    // ignore cache clear errors
  }
}

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

function normalizeTokenPackage(raw: any): AdminTokenPackage {
  const priceVnd = Number.isFinite(Number(raw?.priceVnd ?? raw?.PriceVnd)) ? Number(raw.priceVnd ?? raw.PriceVnd) : 0
  const creditedTokens = Number.isFinite(Number(raw?.creditedTokens ?? raw?.CreditedTokens ?? raw?.creditedAmountVnd ?? raw?.creditedBalanceVnd ?? raw?.CreditedAmountVnd ?? raw?.CreditedBalanceVnd))
    ? Number(raw.creditedTokens ?? raw.CreditedTokens ?? raw.creditedAmountVnd ?? raw.creditedBalanceVnd ?? raw.CreditedAmountVnd ?? raw.CreditedBalanceVnd)
    : 0

  return {
    tokenPackageId: String(raw?.tokenPackageId ?? raw?.id ?? ''),
    name: String(raw?.name ?? ''),
    description: String(raw?.description ?? ''),
    priceVnd,
    creditedTokens,
    isActive: Boolean(raw?.isActive),
    displayOrder: Number.isFinite(Number(raw?.displayOrder)) ? Number(raw.displayOrder) : 0,
    ...raw,
  }
}

function normalizeMentorPackage(raw: any): AdminMentorPackage {
  return {
    mentorPackageId: String(raw?.mentorPackageId ?? raw?.id ?? ''),
    name: String(raw?.name ?? ''),
    description: String(raw?.description ?? ''),
    priceVnd: Number.isFinite(Number(raw?.priceVnd ?? raw?.PriceVnd)) ? Number(raw?.priceVnd ?? raw?.PriceVnd) : 0,
    sharesFromMentorLimit: Number.isFinite(Number(raw?.sharesFromMentorLimit ?? raw?.SharesFromMentorLimit))
      ? Number(raw?.sharesFromMentorLimit ?? raw?.SharesFromMentorLimit)
      : 0,
    validationRequestLimit: Number.isFinite(Number(raw?.validationRequestLimit ?? raw?.ValidationRequestLimit))
      ? Number(raw?.validationRequestLimit ?? raw?.ValidationRequestLimit)
      : 0,
    taskReviewLimit: Number.isFinite(Number(raw?.taskReviewLimit ?? raw?.TaskReviewLimit))
      ? Number(raw?.taskReviewLimit ?? raw?.TaskReviewLimit)
      : 0,
    isActive: Boolean(raw?.isActive),
    displayOrder: Number.isFinite(Number(raw?.displayOrder)) ? Number(raw.displayOrder) : 0,
    ...raw,
  }
}

class AdminSubscriptionService {
  async getTokenPackages(): Promise<AdminTokenPackage[]> {
    if (adminTokenPackagesMemoryCache && adminTokenPackagesMemoryCache.expiresAt > Date.now()) {
      return adminTokenPackagesMemoryCache.data
    }

    const storageEntry = readAdminTokenPackagesStorageCache()
    if (storageEntry) {
      adminTokenPackagesMemoryCache = storageEntry
      return storageEntry.data
    }

    const response = await api.get(tokenBaseUrl)
    const tokenPackages = unwrapCollection<any>(response).map(normalizeTokenPackage)
    const cacheEntry: AdminTokenPackagesCacheEntry = {
      data: tokenPackages,
      expiresAt: Date.now() + ADMIN_TOKEN_PACKAGES_CACHE_TTL_MS,
    }
    adminTokenPackagesMemoryCache = cacheEntry
    writeAdminTokenPackagesStorageCache(cacheEntry)

    return tokenPackages
  }

  async createTokenPackage(payload: UpsertAdminTokenPackagePayload): Promise<AdminTokenPackage> {
    const response = await api.post(tokenBaseUrl, payload)
    clearAdminSubscriptionPlansCache()
    return normalizeTokenPackage(unwrapObject<any>(response))
  }

  async updateTokenPackage(tokenPackageId: string, payload: UpsertAdminTokenPackagePayload): Promise<AdminTokenPackage> {
    const response = await api.put(`${tokenBaseUrl}/${tokenPackageId}`, payload)
    clearAdminSubscriptionPlansCache()
    return normalizeTokenPackage(unwrapObject<any>(response))
  }

  async deleteTokenPackage(tokenPackageId: string): Promise<void> {
    await api.delete(`${tokenBaseUrl}/${tokenPackageId}`)
    clearAdminSubscriptionPlansCache()
  }

  async getMentorPackages(): Promise<AdminMentorPackage[]> {
    if (adminMentorPackagesMemoryCache && adminMentorPackagesMemoryCache.expiresAt > Date.now()) {
      return adminMentorPackagesMemoryCache.data
    }

    const storageEntry = readAdminMentorPackagesStorageCache()
    if (storageEntry) {
      adminMentorPackagesMemoryCache = storageEntry
      return storageEntry.data
    }

    const response = await api.get(mentorBaseUrl)
    const mentorPackages = unwrapCollection<any>(response).map(normalizeMentorPackage)
    const cacheEntry: AdminMentorPackagesCacheEntry = {
      data: mentorPackages,
      expiresAt: Date.now() + ADMIN_TOKEN_PACKAGES_CACHE_TTL_MS,
    }
    adminMentorPackagesMemoryCache = cacheEntry
    writeAdminMentorPackagesStorageCache(cacheEntry)

    return mentorPackages
  }

  async createMentorPackage(payload: UpsertAdminMentorPackagePayload): Promise<AdminMentorPackage> {
    const response = await api.post(mentorBaseUrl, payload)
    clearAdminSubscriptionPlansCache()
    return normalizeMentorPackage(unwrapObject<any>(response))
  }

  async updateMentorPackage(mentorPackageId: string, payload: UpsertAdminMentorPackagePayload): Promise<AdminMentorPackage> {
    const response = await api.put(`${mentorBaseUrl}/${mentorPackageId}`, payload)
    clearAdminSubscriptionPlansCache()
    return normalizeMentorPackage(unwrapObject<any>(response))
  }

  async deleteMentorPackage(mentorPackageId: string): Promise<void> {
    await api.delete(`${mentorBaseUrl}/${mentorPackageId}`)
    clearAdminSubscriptionPlansCache()
  }

  // Backward-compatible wrappers
  async getPlans(): Promise<AdminTokenPackage[]> {
    return this.getTokenPackages()
  }

  async createPlan(payload: UpsertAdminTokenPackagePayload): Promise<AdminTokenPackage> {
    return this.createTokenPackage(payload)
  }

  async updatePlan(tokenPackageId: string, payload: UpsertAdminTokenPackagePayload): Promise<AdminTokenPackage> {
    return this.updateTokenPackage(tokenPackageId, payload)
  }

  async deletePlan(tokenPackageId: string): Promise<void> {
    return this.deleteTokenPackage(tokenPackageId)
  }
}

export default new AdminSubscriptionService()
