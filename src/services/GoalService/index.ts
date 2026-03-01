import api from '../Axios'
import { listGoalsUrl, createGoalUrl, goalUrl } from './url'

export interface Goal {
  goalId: string
  title: string
  description: string | null
  durationDays?: number
  isCompleted?: boolean
  completedAt?: string | null
  createdAt?: string
  [key: string]: any
}

export async function listGoals(): Promise<Goal[]> {
  const res: any = await api.get(listGoalsUrl)

  // Unwrap various envelopes from backend
  const root: any = res?.data ?? res
  let items: any[] = []
  if (Array.isArray(root)) items = root
  else if (Array.isArray(root?.goals)) items = root.goals
  else if (Array.isArray(root?.value)) items = root.value
  else if (Array.isArray(root?.data)) items = root.data
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

export default { listGoals, createGoal, updateGoal, deleteGoal }