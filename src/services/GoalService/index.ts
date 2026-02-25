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

export async function listGoals(): Promise<Goal[]> {
  // Backend doesn't support GET /goals or /users/me/goals
  // Using mock data for now - in production, this should come from backend
  try {
    // Try to fetch from backend first
    const res: any = await api.get(userGoalsUrl('me'))
    return (res?.data ?? res) as Goal[]
  } catch {
    // Fallback to mock data
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