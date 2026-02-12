import api from '../Axios'
import { skeletonUrl, lessonContentUrl } from './url'

export type Chapter = {
  id: string
  title: string
  description?: string
}

export type Lesson = {
  id: string
  title: string
  description?: string
  chapters?: Chapter[]
}

export type SkeletonResponse = {
  subjects?: { id: string; name?: string }[]
  goals?: { id: string; name?: string }[]
  lessons: Lesson[]
}

// Normalize payload to backend-expected format
export async function generateSkeleton(payload: any): Promise<SkeletonResponse> {
  const subjectIds: string[] = Array.isArray(payload?.subjectIds)
    ? payload.subjectIds
    : Array.isArray(payload?.subjects)
    ? payload.subjects.map((s: any) => s?.id).filter(Boolean)
    : []

  const goalIds: string[] = Array.isArray(payload?.goalIds)
    ? payload.goalIds
    : Array.isArray(payload?.goals)
    ? payload.goals.map((g: any) => g?.id).filter(Boolean)
    : []

  const reqBody = { SubjectIds: subjectIds, GoalIds: goalIds }
  const res: any = await api.post(skeletonUrl, reqBody)
  return (res?.data ?? res) as SkeletonResponse
}

export async function generateLessonContent(lessonId: string, payload?: any): Promise<Lesson> {
  const subjectIds: string[] = Array.isArray(payload?.subjectIds)
    ? payload.subjectIds
    : Array.isArray(payload?.subjects)
    ? payload.subjects.map((s: any) => s?.id).filter(Boolean)
    : []

  const goalIds: string[] = Array.isArray(payload?.goalIds)
    ? payload.goalIds
    : Array.isArray(payload?.goals)
    ? payload.goals.map((g: any) => g?.id).filter(Boolean)
    : []

  const reqBody = { SubjectIds: subjectIds, GoalIds: goalIds }
  const res: any = await api.post(lessonContentUrl(lessonId), reqBody)
  return (res?.data ?? res) as Lesson
}

export default { generateSkeleton, generateLessonContent }