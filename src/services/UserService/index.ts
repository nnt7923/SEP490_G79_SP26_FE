// '/Auth/me' has been removed from the frontend.
// This module is kept intentionally empty to avoid unused endpoint references.
import api from '../Axios'
import { getProfileUrl, updateProfileUrl, updateAvatarProfile, changePasswordUrl, listUsersUrl, userUrl, banUserUrl, unbanUserUrl } from './url'

type UsersListCacheEntry = {
  expiresAt: number
  data: any[]
}

type UsersPagedCacheEntry = {
  expiresAt: number
  data: UsersPage
}

export interface UsersQuery {
  pageNumber?: number
  pageSize?: number
  role?: string
  searchTerm?: string
  sortBy?: string
  sortDescending?: boolean
}

export interface UsersListOptions {
  forceRefresh?: boolean
}

export interface UsersPage {
  items: any[]
  pageNumber: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

type UserDetailCacheEntry = {
  expiresAt: number
  data: any
}

const USERS_LIST_CACHE_KEY = 'admin:users:list'
const USERS_PAGED_CACHE_PREFIX = 'admin:users:paged:'
const USER_DETAIL_CACHE_PREFIX = 'admin:users:detail:'
const USERS_CACHE_TTL_MS = 2 * 60 * 1000
let usersListMemoryCache: UsersListCacheEntry | null = null
const usersPagedMemoryCache = new Map<string, UsersPagedCacheEntry>()
const userDetailMemoryCache = new Map<string, UserDetailCacheEntry>()

function readUsersListStorageCache(): UsersListCacheEntry | null {
  try {
    if (typeof window === 'undefined') return null
    const raw = window.sessionStorage.getItem(USERS_LIST_CACHE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as UsersListCacheEntry
    if (!parsed?.expiresAt || parsed.expiresAt <= Date.now() || !Array.isArray(parsed.data)) {
      window.sessionStorage.removeItem(USERS_LIST_CACHE_KEY)
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function writeUsersListStorageCache(entry: UsersListCacheEntry): void {
  try {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem(USERS_LIST_CACHE_KEY, JSON.stringify(entry))
  } catch {
    // ignore cache write errors
  }
}

function readUsersPagedStorageCache(cacheKey: string): UsersPagedCacheEntry | null {
  try {
    if (typeof window === 'undefined') return null
    const raw = window.sessionStorage.getItem(`${USERS_PAGED_CACHE_PREFIX}${cacheKey}`)
    if (!raw) return null

    const parsed = JSON.parse(raw) as UsersPagedCacheEntry
    if (!parsed?.expiresAt || parsed.expiresAt <= Date.now() || !Array.isArray(parsed?.data?.items)) {
      window.sessionStorage.removeItem(`${USERS_PAGED_CACHE_PREFIX}${cacheKey}`)
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function writeUsersPagedStorageCache(cacheKey: string, entry: UsersPagedCacheEntry): void {
  try {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem(`${USERS_PAGED_CACHE_PREFIX}${cacheKey}`, JSON.stringify(entry))
  } catch {
    // ignore cache write errors
  }
}

function readUserDetailStorageCache(userId: string): UserDetailCacheEntry | null {
  try {
    if (typeof window === 'undefined') return null
    const raw = window.sessionStorage.getItem(`${USER_DETAIL_CACHE_PREFIX}${userId}`)
    if (!raw) return null

    const parsed = JSON.parse(raw) as UserDetailCacheEntry
    if (!parsed?.expiresAt || parsed.expiresAt <= Date.now()) {
      window.sessionStorage.removeItem(`${USER_DETAIL_CACHE_PREFIX}${userId}`)
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function writeUserDetailStorageCache(userId: string, entry: UserDetailCacheEntry): void {
  try {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem(`${USER_DETAIL_CACHE_PREFIX}${userId}`, JSON.stringify(entry))
  } catch {
    // ignore cache write errors
  }
}

function extractUserItems(root: any): any[] {
  if (Array.isArray(root)) return root
  if (Array.isArray(root?.items)) return root.items
  if (Array.isArray(root?.results)) return root.results
  if (Array.isArray(root?.records)) return root.records
  if (Array.isArray(root?.value)) return root.value
  if (Array.isArray(root?.data)) return root.data
  if (Array.isArray(root?.data?.items)) return root.data.items
  if (Array.isArray(root?.data?.results)) return root.data.results
  if (Array.isArray(root?.data?.records)) return root.data.records
  if (Array.isArray(root?.data?.value)) return root.data.value
  return []
}

function toSafeNumber(value: unknown, fallback: number): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function normalizeUsersPage(root: any): UsersPage {
  const value = root?.data ?? root
  const source = value?.value ?? value
  const items = extractUserItems(source)

  const pageNumber = toSafeNumber(source?.pageNumber, 1)
  const pageSize = toSafeNumber(source?.pageSize, items.length || 10)
  const totalCount = toSafeNumber(source?.totalCount, items.length)
  const totalPages = toSafeNumber(source?.totalPages, 1)

  return {
    items,
    pageNumber: pageNumber > 0 ? pageNumber : 1,
    pageSize: pageSize > 0 ? pageSize : 10,
    totalCount: totalCount >= 0 ? totalCount : items.length,
    totalPages: totalPages > 0 ? totalPages : 1,
    hasPreviousPage: Boolean(source?.hasPreviousPage),
    hasNextPage: Boolean(source?.hasNextPage),
  }
}

function buildUsersQueryParams(query?: UsersQuery): URLSearchParams {
  const params = new URLSearchParams()
  if (!query) return params

  if (Number.isFinite(query.pageNumber) && Number(query.pageNumber) > 0) {
    params.set('PageNumber', String(query.pageNumber))
  }

  if (Number.isFinite(query.pageSize) && Number(query.pageSize) > 0) {
    params.set('PageSize', String(query.pageSize))
  }

  if (query.role) params.set('Role', query.role)
  if (query.searchTerm) params.set('SearchTerm', query.searchTerm)
  if (query.sortBy) params.set('SortBy', query.sortBy)
  if (typeof query.sortDescending === 'boolean') params.set('SortDescending', String(query.sortDescending))

  return params
}

export function clearUsersCache(): void {
  usersListMemoryCache = null
  usersPagedMemoryCache.clear()
  userDetailMemoryCache.clear()
  try {
    if (typeof window === 'undefined') return
    window.sessionStorage.removeItem(USERS_LIST_CACHE_KEY)
    const keys: string[] = []
    for (let index = 0; index < window.sessionStorage.length; index++) {
      const key = window.sessionStorage.key(index)
      if (key) keys.push(key)
    }
    keys
      .filter((key) => key.startsWith(USER_DETAIL_CACHE_PREFIX) || key.startsWith(USERS_PAGED_CACHE_PREFIX))
      .forEach((key) => window.sessionStorage.removeItem(key))
  } catch {
    // ignore cache clear errors
  }
}
export async function getProfile() {
  const res: any = await api.get(getProfileUrl)
  return res?.data ?? res
}
export async function updateProfile(payload: any) {
  const res: any = await api.put(updateProfileUrl, payload)
  return res?.data ?? res
}
export async function uploadAvatarProfile(
  payload: FormData,
  onProgress?: (progress: number) => void
) {
  const res = await api.post(updateAvatarProfile, payload, {
    onUploadProgress: (progressEvent) => {
      if (!onProgress) return

      const percent = Math.round(
        (progressEvent.loaded * 100) / (progressEvent.total || 1)
      )

      onProgress(percent)
    }
  })

  return res?.data ?? res
}
export async function changePassword(payload: any) {
  const res: any = await api.put(changePasswordUrl, payload)
  return res?.data ?? res
}

export async function listUsersPaged(query?: UsersQuery, options?: UsersListOptions): Promise<UsersPage> {
  const params = buildUsersQueryParams(query)
  const cacheKey = params.toString() || 'default'
  const forceRefresh = Boolean(options?.forceRefresh)

  if (!forceRefresh) {
    const memoryEntry = usersPagedMemoryCache.get(cacheKey)
    if (memoryEntry && memoryEntry.expiresAt > Date.now()) {
      return memoryEntry.data
    }

    const storageEntry = readUsersPagedStorageCache(cacheKey)
    if (storageEntry) {
      usersPagedMemoryCache.set(cacheKey, storageEntry)
      return storageEntry.data
    }
  }

  const queryString = params.toString()
  const res: any = await api.get(queryString ? `${listUsersUrl}?${queryString}` : listUsersUrl)
  const page = normalizeUsersPage(res)

  const cacheEntry: UsersPagedCacheEntry = {
    data: page,
    expiresAt: Date.now() + USERS_CACHE_TTL_MS,
  }
  usersPagedMemoryCache.set(cacheKey, cacheEntry)
  writeUsersPagedStorageCache(cacheKey, cacheEntry)

  return page
}

// New: GET /api/users (full list for dropdown/filter use-cases)
export async function listUsers(): Promise<any[]> {
  if (usersListMemoryCache && usersListMemoryCache.expiresAt > Date.now()) {
    return usersListMemoryCache.data
  }

  const storageEntry = readUsersListStorageCache()
  if (storageEntry) {
    usersListMemoryCache = storageEntry
    return storageEntry.data
  }

  const pageSize = 100
  let currentPage = 1
  let hasNextPage = true
  const allUsers: any[] = []

  while (hasNextPage) {
    const page = await listUsersPaged({
      pageNumber: currentPage,
      pageSize,
      sortBy: 'CreatedAt',
      sortDescending: true,
    })

    allUsers.push(...page.items)
    hasNextPage = page.hasNextPage
    currentPage += 1

    if (currentPage > (page.totalPages || 1) + 1) {
      hasNextPage = false
    }
  }

  const uniqueUsers = Array.from(
    new Map(
      allUsers.map((item, index) => [
        String(item?.id ?? item?.userId ?? item?.username ?? item?.email ?? `idx-${index}`),
        item,
      ])
    ).values()
  )

  const cacheEntry: UsersListCacheEntry = {
    data: uniqueUsers,
    expiresAt: Date.now() + USERS_CACHE_TTL_MS,
  }
  usersListMemoryCache = cacheEntry
  writeUsersListStorageCache(cacheEntry)

  return uniqueUsers
}

// New: GET /api/users/{userId}
export async function getUserById(userId: string | number): Promise<any> {
  const normalizedUserId = String(userId)
  const memoryEntry = userDetailMemoryCache.get(normalizedUserId)
  if (memoryEntry && memoryEntry.expiresAt > Date.now()) {
    return memoryEntry.data
  }

  const storageEntry = readUserDetailStorageCache(normalizedUserId)
  if (storageEntry) {
    userDetailMemoryCache.set(normalizedUserId, storageEntry)
    return storageEntry.data
  }

  const res: any = await api.get(userUrl(userId))
  const data = res?.data ?? res
  const cacheEntry: UserDetailCacheEntry = {
    data,
    expiresAt: Date.now() + USERS_CACHE_TTL_MS,
  }
  userDetailMemoryCache.set(normalizedUserId, cacheEntry)
  writeUserDetailStorageCache(normalizedUserId, cacheEntry)

  return data
}

// New: POST /api/users/{userId}/ban
export async function banUser(userId: string): Promise<any> {
  const res: any = await api.post(banUserUrl(userId))
  clearUsersCache()
  return res?.data ?? res
}

// New: POST /api/users/{userId}/unban
export async function unbanUser(userId: string): Promise<any> {
  const res: any = await api.post(unbanUserUrl(userId))
  clearUsersCache()
  return res?.data ?? res
}

export default { getProfile, updateProfile, uploadAvatarProfile, changePassword, listUsers, listUsersPaged, getUserById, banUser, unbanUser, clearUsersCache }