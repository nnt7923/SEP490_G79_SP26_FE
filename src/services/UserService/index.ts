// '/Auth/me' has been removed from the frontend.
// This module is kept intentionally empty to avoid unused endpoint references.
import api from '../Axios'
import { getProfileUrl, updateProfileUrl, updateAvatarProfile, changePasswordUrl, listUsersUrl, userUrl, banUserUrl, unbanUserUrl } from './url'

type UsersListCacheEntry = {
  expiresAt: number
  data: any[]
}

type UserDetailCacheEntry = {
  expiresAt: number
  data: any
}

const USERS_LIST_CACHE_KEY = 'admin:users:list'
const USER_DETAIL_CACHE_PREFIX = 'admin:users:detail:'
const USERS_CACHE_TTL_MS = 2 * 60 * 1000
let usersListMemoryCache: UsersListCacheEntry | null = null
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

export function clearUsersCache(): void {
  usersListMemoryCache = null
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
      .filter((key) => key.startsWith(USER_DETAIL_CACHE_PREFIX))
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

// New: GET /api/users
export async function listUsers(): Promise<any[]> {
  if (usersListMemoryCache && usersListMemoryCache.expiresAt > Date.now()) {
    return usersListMemoryCache.data
  }

  const storageEntry = readUsersListStorageCache()
  if (storageEntry) {
    usersListMemoryCache = storageEntry
    return storageEntry.data
  }

  const res: any = await api.get(listUsersUrl)
  const data = res?.data ?? res
  const list = extractUserItems(data)

  const cacheEntry: UsersListCacheEntry = {
    data: list,
    expiresAt: Date.now() + USERS_CACHE_TTL_MS,
  }
  usersListMemoryCache = cacheEntry
  writeUsersListStorageCache(cacheEntry)

  return list
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

export default { getProfile, updateProfile, uploadAvatarProfile, changePassword, listUsers, getUserById, banUser, unbanUser, clearUsersCache }