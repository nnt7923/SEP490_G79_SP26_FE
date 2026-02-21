import api from '../Axios'
import { listGoalsUrl, createGoalUrl, goalUrl } from './url'

export async function listGoals(): Promise<Goal[]> {
  const res: any = await api.get(listGoalsUrl)
  return (res?.data ?? res) as Goal[]
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