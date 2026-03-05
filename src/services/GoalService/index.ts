import api from '../Axios'
import { listGoalsUrl, createGoalUrl, goalUrl, basePath, myGoalsUrl } from './url'

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
  [key: string]: any
}

export async function listGoals(): Promise<Goal[]> {
  const res: any = await api.get(listGoalsUrl)

  // Unwrap various envelopes from backend
  const root: any = res?.data ?? res
  let items: any[] = []
  if (Array.isArray(root)) items = root
  else if (Array.isArray(root?.items)) items = root.items
  else if (Array.isArray(root?.goals)) items = root.goals
  else if (Array.isArray(root?.value)) items = root.value
  else if (Array.isArray(root?.data)) items = root.data
  else if (Array.isArray(root?.data?.items)) items = root.data.items
  else if (Array.isArray(root?.data?.value)) items = root.data.value
  else if (Array.isArray(root?.data?.goals)) items = root.data.goals

  // Normalize to consistent Goal shape
  return items.map((g: any) => ({
    goalId: g?.goalId ?? g?.id,
    title: g?.title ?? g?.name ?? 'Goal',
    description: g?.description ?? null,
    durationDays: g?.durationDays,
    isCompleted: g?.isCompleted,
    completedAt: g?.completedAt ?? null,
    createdAt: g?.createdAt,
    ...g,
  }))
}

export async function getUserGoals(): Promise<Goal[]> {
  // Use /goals/me endpoint to get current user's goals
  const res: any = await api.get(`${basePath}/me`)

  // Unwrap various envelopes from backend
  const root: any = res?.data ?? res
  let items: any[] = []
  if (Array.isArray(root)) items = root
  else if (Array.isArray(root?.items)) items = root.items
  else if (Array.isArray(root?.goals)) items = root.goals
  else if (Array.isArray(root?.value)) items = root.value
  else if (Array.isArray(root?.data)) items = root.data
  else if (Array.isArray(root?.data?.items)) items = root.data.items
  else if (Array.isArray(root?.data?.value)) items = root.data.value
  else if (Array.isArray(root?.data?.goals)) items = root.data.goals

  // Normalize to consistent Goal shape with all fields from API
  return items.map((g: any) => ({
    goalId: g?.goalId ?? g?.id,
    title: g?.title ?? g?.name ?? 'Goal',
    description: g?.description ?? null,
    isSystemDefined: g?.isSystemDefined ?? false,
    isActive: g?.isActive ?? true,
    createdAt: g?.createdAt,
    durationDays: g?.durationDays,
    isCompleted: g?.isCompleted,
    completedAt: g?.completedAt ?? null,
  }))
}

export async function getMyGoals(): Promise<Goal[]> {
  const res: any = await api.get(myGoalsUrl)

  // Unwrap response - backend returns { items: [...], pageNumber, pageSize, totalCount, hasNextPage, hasPreviousPage }
  const root: any = res?.data ?? res
  let items: any[] = []
  if (Array.isArray(root)) items = root
  else if (Array.isArray(root?.items)) items = root.items
  else if (Array.isArray(root?.goals)) items = root.goals
  else if (Array.isArray(root?.value)) items = root.value
  else if (Array.isArray(root?.data)) items = root.data
  else if (Array.isArray(root?.data?.items)) items = root.data.items
  else if (Array.isArray(root?.data?.value)) items = root.data.value
  else if (Array.isArray(root?.data?.goals)) items = root.data.goals

  // Normalize to consistent Goal shape with all fields from API
  return items.map((g: any) => ({
    goalId: g?.goalId ?? g?.id,
    title: g?.title ?? g?.name ?? 'Goal',
    description: g?.description ?? null,
    isSystemDefined: g?.isSystemDefined ?? false,
    isActive: g?.isActive ?? true,
    createdAt: g?.createdAt,
    durationDays: g?.durationDays,
    isCompleted: g?.isCompleted,
    completedAt: g?.completedAt ?? null,
  }))
}

export async function createGoal(payload: { title?: string; name?: string; description?: string }): Promise<Goal> {
  const send = {
    title: payload.title ?? payload.name,
    description: payload.description,
  }
  const res: any = await api.post(createGoalUrl, send)
  const data: any = res?.data ?? res
  return {
    goalId: data?.goalId ?? data?.id,
    title: data?.title ?? data?.name,
    description: data?.description ?? null,
    createdAt: data?.createdAt,
    ...data,
  }
}

export async function updateGoal(
  id: string | number,
  payload: { title?: string; name?: string; description?: string }
): Promise<Goal> {
  const send = {
    title: payload.title ?? payload.name,
    description: payload.description,
  }
  const res: any = await api.put(goalUrl(String(id)), send)
  const data: any = res?.data ?? res
  return {
    goalId: data?.goalId ?? data?.id ?? String(id),
    title: data?.title ?? data?.name,
    description: data?.description ?? null,
    createdAt: data?.createdAt,
    ...data,
  }
}

export async function deleteGoal(id: string | number): Promise<any> {
  const res: any = await api.delete(goalUrl(String(id)))
  return res?.data ?? res
}

export default { listGoals, getUserGoals, getMyGoals, createGoal, updateGoal, deleteGoal }
