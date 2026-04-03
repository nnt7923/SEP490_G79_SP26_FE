import api from '../Axios'
import { listGoalsUrl, createGoalUrl, goalUrl, basePath, myGoalsUrl } from './url'

type GoalCacheEntry = {
  expiresAt: number
  data: Goal[]
}

const GOAL_CACHE_PREFIX = 'goal:myGoals:'
const GOAL_CACHE_TTL_MS = 2 * 60 * 1000
const goalMemoryCache = new Map<string, GoalCacheEntry>()

export const LanguageSelection = {
  Vietnamese: 1,
  English: 2,
} as const

export type LanguageSelection = typeof LanguageSelection[keyof typeof LanguageSelection]

export interface Goal {
  goalId: string
  title: string
  description: string | null
  isSystemDefined: boolean
  isActive: boolean
  createdAt: string
  durationDays?: number
  [key: string]: any
}

function normalizeDurationDays(goal: any): number {
  const raw = goal?.durationDays ?? goal?.durationInDays ?? goal?.days
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : 0
}

function extractGoalItems(root: any): any[] {
  if (Array.isArray(root)) return root
  if (Array.isArray(root?.items)) return root.items
  if (Array.isArray(root?.goals)) return root.goals
  if (Array.isArray(root?.value)) return root.value
  if (Array.isArray(root?.data)) return root.data
  if (Array.isArray(root?.data?.items)) return root.data.items
  if (Array.isArray(root?.data?.value)) return root.data.value
  if (Array.isArray(root?.data?.goals)) return root.data.goals
  return []
}

function normalizeGoal(goal: any): Goal {
  return {
    ...goal,
    goalId: goal?.goalId ?? goal?.id,
    title: goal?.title ?? goal?.name ?? 'Goal',
    description: goal?.description ?? null,
    isSystemDefined: goal?.isSystemDefined ?? false,
    isActive: goal?.isActive ?? true,
    createdAt: goal?.createdAt,
    durationDays: normalizeDurationDays(goal),
    isCompleted: goal?.isCompleted,
    completedAt: goal?.completedAt ?? null,
  }
}

function buildGoalCacheKey(source: 'user' | 'my'): string {
  return source
}

function readGoalStorageCache(key: string): GoalCacheEntry | null {
  try {
    const raw = sessionStorage.getItem(`${GOAL_CACHE_PREFIX}${key}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as GoalCacheEntry
    if (!parsed?.expiresAt || parsed.expiresAt <= Date.now()) {
      sessionStorage.removeItem(`${GOAL_CACHE_PREFIX}${key}`)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function writeGoalStorageCache(key: string, entry: GoalCacheEntry): void {
  try {
    sessionStorage.setItem(`${GOAL_CACHE_PREFIX}${key}`, JSON.stringify(entry))
  } catch {
    // ignore cache write errors
  }
}

export function clearMyGoalsCache(): void {
  goalMemoryCache.clear()
  try {
    const storageKeys: string[] = []
    for (let index = 0; index < sessionStorage.length; index++) {
      const storageKey = sessionStorage.key(index)
      if (storageKey) storageKeys.push(storageKey)
    }
    storageKeys
      .filter((storageKey) => storageKey.startsWith(GOAL_CACHE_PREFIX))
      .forEach((storageKey) => sessionStorage.removeItem(storageKey))
  } catch {
    // ignore cache clear errors
  }
}

export async function listGoals(): Promise<Goal[]> {
  const res: any = await api.get(listGoalsUrl)

  // Unwrap various envelopes from backend
  const root: any = res?.data ?? res
  const items = extractGoalItems(root)

  // Normalize to consistent Goal shape
  return items.map((g: any) => ({
    ...g,
    goalId: g?.goalId ?? g?.id,
    title: g?.title ?? g?.name ?? 'Goal',
    description: g?.description ?? null,
    durationDays: normalizeDurationDays(g),
    isCompleted: g?.isCompleted,
    completedAt: g?.completedAt ?? null,
    createdAt: g?.createdAt,
  }))
}

export async function getUserGoals(): Promise<Goal[]> {
  const cacheKey = buildGoalCacheKey('user')
  const memoryEntry = goalMemoryCache.get(cacheKey)
  if (memoryEntry && memoryEntry.expiresAt > Date.now()) {
    return memoryEntry.data
  }

  const storageEntry = readGoalStorageCache(cacheKey)
  if (storageEntry) {
    goalMemoryCache.set(cacheKey, storageEntry)
    return storageEntry.data
  }

  // Use /goals/me endpoint to get current user's goals
  const res: any = await api.get(`${basePath}/me`)

  // Unwrap various envelopes from backend
  const root: any = res?.data ?? res
  const items = extractGoalItems(root)

  const normalizedGoals = items.map((g: any) => normalizeGoal(g))
  const entry: GoalCacheEntry = {
    data: normalizedGoals,
    expiresAt: Date.now() + GOAL_CACHE_TTL_MS,
  }
  goalMemoryCache.set(cacheKey, entry)
  writeGoalStorageCache(cacheKey, entry)

  return normalizedGoals
}

export async function getMyGoals(): Promise<Goal[]> {
  const cacheKey = buildGoalCacheKey('my')
  const memoryEntry = goalMemoryCache.get(cacheKey)
  if (memoryEntry && memoryEntry.expiresAt > Date.now()) {
    return memoryEntry.data
  }

  const storageEntry = readGoalStorageCache(cacheKey)
  if (storageEntry) {
    goalMemoryCache.set(cacheKey, storageEntry)
    return storageEntry.data
  }

  const res: any = await api.get(myGoalsUrl)

  // Unwrap response - backend returns { items: [...], pageNumber, pageSize, totalCount, hasNextPage, hasPreviousPage }
  const root: any = res?.data ?? res
  const items = extractGoalItems(root)

  const normalizedGoals = items.map((g: any) => normalizeGoal(g))
  const entry: GoalCacheEntry = {
    data: normalizedGoals,
    expiresAt: Date.now() + GOAL_CACHE_TTL_MS,
  }
  goalMemoryCache.set(cacheKey, entry)
  writeGoalStorageCache(cacheKey, entry)

  return normalizedGoals
}

export async function createGoal(payload: { 
  subjectId: string; 
  title: string; 
  description?: string; 
  duration: string 
}): Promise<Goal> {
  const send = {
    subjectId: payload.subjectId,
    title: payload.title,
    description: payload.description || '',
    duration: payload.duration
  }
  const res: any = await api.post(createGoalUrl, send)
  const data: any = res?.data ?? res
  clearMyGoalsCache()
  return {
    ...data,
    goalId: data?.goalId ?? data?.id,
    title: data?.title ?? data?.name,
    description: data?.description ?? null,
    isSystemDefined: data?.isSystemDefined ?? false,
    isActive: data?.isActive ?? true,
    createdAt: data?.createdAt,
    durationDays: normalizeDurationDays(data),
  }
}

export async function updateGoal(
  id: string | number,
  payload: { 
    subjectId: string;
    title: string; 
    description?: string; 
    isActive?: boolean;
    duration: string;
  }
): Promise<Goal> {
  const send = {
    subjectId: payload.subjectId,
    title: payload.title,
    description: payload.description || '',
    isActive: payload.isActive ?? true,
    duration: payload.duration
  }
  const res: any = await api.put(goalUrl(String(id)), send)
  const data: any = res?.data ?? res
  clearMyGoalsCache()
  return {
    ...data,
    goalId: data?.goalId ?? data?.id ?? String(id),
    title: data?.title ?? data?.name,
    description: data?.description ?? null,
    isSystemDefined: data?.isSystemDefined ?? false,
    isActive: data?.isActive ?? true,
    createdAt: data?.createdAt,
    durationDays: normalizeDurationDays(data),
  }
}

export async function deleteGoal(id: string | number): Promise<any> {
  const res: any = await api.delete(goalUrl(String(id)))
  clearMyGoalsCache()
  return res?.data ?? res
}

export default { listGoals, getUserGoals, getMyGoals, createGoal, updateGoal, deleteGoal, clearMyGoalsCache }
