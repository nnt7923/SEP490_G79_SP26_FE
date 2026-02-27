import api from '../Axios'
import { listGoalsUrl, createGoalUrl, goalUrl, userGoalsUrl, mockGoals } from './url'

export interface Goal {
  goalId: string
  title: string
  description: string | null
  durationDays: number
  isCompleted: boolean
  completedAt: string | null
  createdAt: string
}

// Feature toggle: disable real goals API by default to avoid 404 noise
const ENABLE_GOALS_API = (import.meta as any)?.env?.VITE_ENABLE_GOALS_API?.toString()?.toLowerCase() === 'true'

export async function listGoals(): Promise<Goal[]> {
  // When backend endpoint is unavailable, use mock without making a network request
  if (!ENABLE_GOALS_API) return mockGoals as Goal[]

  try {
    const res: any = await api.get(userGoalsUrl('me'))
    return (res?.data ?? res) as Goal[]
  } catch {
    return mockGoals as Goal[]
  }
}

export async function createGoal(payload: { title?: string; name?: string; description?: string }): Promise<Goal> {
  const send = {
    title: payload.title ?? payload.name,
    description: payload.description,
  }
  const res: any = await api.post(createGoalUrl, send)
  return (res?.data ?? res) as Goal
}

export async function updateGoal(
  id: string | number,
  payload: { title?: string; name?: string; description?: string }
): Promise<Goal> {
  const send = {
    title: payload.title ?? payload.name,
    description: payload.description,
  }
  const res: any = await api.put(goalUrl(id), send)
  return (res?.data ?? res) as Goal
}

export async function deleteGoal(id: string | number): Promise<any> {
  const res: any = await api.delete(goalUrl(id))
  return res?.data ?? res
}

export default { listGoals, createGoal, updateGoal, deleteGoal }