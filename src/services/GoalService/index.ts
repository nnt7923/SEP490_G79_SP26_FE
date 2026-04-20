import api from '../Axios'
import { listGoalsUrl, createGoalUrl, goalUrl, basePath, myGoalsUrl, goalDashboardUrl } from './url'

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

export type GoalDashboardPathStatus = 'Active' | 'InProgress' | 'Completed' | 'Draft' | 'Cancelled'

export interface GoalDashboardQuery {
  pageNumber?: number
  pageSize?: number
  searchTerm?: string
  pathStatus?: GoalDashboardPathStatus
  sortDescending?: boolean
}

export interface PersonalGoalDashboardItem {
  goalId: string
  title: string
  description: string | null
  progressPercent: number
  status: 'NotStarted' | 'InProgress' | 'Completed' | string
  lastUpdatedAt?: string | null
}

export interface PathGoalDashboardItem {
  learningPathId: string
  learningPathTitle: string
  learningPathStatus: string
  subjectName?: string | null
  goalId: string
  goalTitle: string
  isSystemDefined: boolean
  weight?: number | null
  targetPercent?: number | null
  progressPercent?: number | null
  completionPercent?: number | null
  goalStatus?: string | null
  completedAt?: string | null
  lastUpdatedAt?: string | null
}

export interface GoalDashboardPathGoalsPage {
  items: PathGoalDashboardItem[]
  pageNumber: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export interface GoalDashboardResponse {
  personalGoals: PersonalGoalDashboardItem[]
  pathGoals: GoalDashboardPathGoalsPage
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

function normalizePersonalGoalDashboardItem(goal: any): PersonalGoalDashboardItem {
  return {
    goalId: String(goal?.goalId ?? goal?.id ?? ''),
    title: String(goal?.title ?? goal?.name ?? 'Goal'),
    description: goal?.description ?? null,
    progressPercent: Number(goal?.progressPercent ?? 0),
    status: String(goal?.status ?? 'NotStarted'),
    lastUpdatedAt: goal?.lastUpdatedAt ?? null,
  }
}

function normalizePathGoalDashboardItem(item: any): PathGoalDashboardItem {
  return {
    learningPathId: String(item?.learningPathId ?? ''),
    learningPathTitle: String(item?.learningPathTitle ?? ''),
    learningPathStatus: String(item?.learningPathStatus ?? ''),
    subjectName: item?.subjectName ?? null,
    goalId: String(item?.goalId ?? item?.id ?? ''),
    goalTitle: String(item?.goalTitle ?? item?.title ?? 'Goal'),
    isSystemDefined: Boolean(item?.isSystemDefined),
    weight: item?.weight == null ? null : Number(item.weight),
    targetPercent: item?.targetPercent == null ? null : Number(item.targetPercent),
    progressPercent: item?.progressPercent == null ? null : Number(item.progressPercent),
    completionPercent: item?.completionPercent == null ? null : Number(item.completionPercent),
    goalStatus: item?.goalStatus ?? null,
    completedAt: item?.completedAt ?? null,
    lastUpdatedAt: item?.lastUpdatedAt ?? null,
  }
}

function normalizeGoalDashboardResponse(root: any, fallbackPageNumber: number, fallbackPageSize: number): GoalDashboardResponse {
  const personalGoalsRaw = Array.isArray(root?.personalGoals) ? root.personalGoals : []
  const pathGoalsRoot = root?.pathGoals ?? {}
  const pathGoalItemsRaw = Array.isArray(pathGoalsRoot?.items) ? pathGoalsRoot.items : []

  return {
    personalGoals: personalGoalsRaw.map(normalizePersonalGoalDashboardItem),
    pathGoals: {
      items: pathGoalItemsRaw.map(normalizePathGoalDashboardItem),
      pageNumber: Number(pathGoalsRoot?.pageNumber ?? fallbackPageNumber),
      pageSize: Number(pathGoalsRoot?.pageSize ?? fallbackPageSize),
      totalCount: Number(pathGoalsRoot?.totalCount ?? pathGoalItemsRaw.length),
      totalPages: Number(pathGoalsRoot?.totalPages ?? 1),
      hasPreviousPage: Boolean(pathGoalsRoot?.hasPreviousPage),
      hasNextPage: Boolean(pathGoalsRoot?.hasNextPage),
    },
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

export async function getGoalsDashboard(query: GoalDashboardQuery = {}): Promise<GoalDashboardResponse> {
  const params: Record<string, any> = {
    pageNumber: query.pageNumber ?? 1,
    pageSize: query.pageSize ?? 20,
    sortDescending: query.sortDescending ?? true,
  }

  if (query.searchTerm && query.searchTerm.trim().length > 0) {
    params.searchTerm = query.searchTerm.trim()
  }

  if (query.pathStatus) {
    params.pathStatus = query.pathStatus
  }

  const res: any = await api.get(goalDashboardUrl, { params })
  const root: any = res?.data ?? res
  return normalizeGoalDashboardResponse(root, params.pageNumber, params.pageSize)
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

export default { listGoals, getUserGoals, getMyGoals, getGoalsDashboard, createGoal, updateGoal, deleteGoal, clearMyGoalsCache }
