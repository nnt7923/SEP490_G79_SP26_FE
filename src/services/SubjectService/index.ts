import api from '../Axios'
import { listSubjectsUrl, createSubjectUrl, basePath } from './url'

export type Subject = {
  id: string
  subjectId?: string
  name: string
  slug?: string
  description?: string
  color?: string
  icon?: string
  createdBy?: string
  createdByUserId?: string
  createdAt?: string
}

export async function listSubjects(): Promise<Subject[]> {
  const res: any = await api.get(listSubjectsUrl)
  
  let subjects: any[] = []
  
  // The API may wrap results as { isSuccess, value: [...] }
  if (Array.isArray(res)) subjects = res
  else if (Array.isArray(res?.value)) subjects = res.value
  else if (Array.isArray(res?.data)) subjects = res.data
  else if (Array.isArray(res?.data?.value)) subjects = res.data.value
  
  // Normalize: backend uses 'subjectId', frontend expects 'id'
  return subjects.map((s: any) => ({
    id: s.subjectId || s.id,
    subjectId: s.subjectId || s.id,
    name: s.name,
    slug: s.slug,
    description: s.description,
    color: s.color,
    icon: s.icon,
    createdBy: s.createdBy,
    createdByUserId: s.createdByUserId,
    createdAt: s.createdAt,
  }))
}

export async function createSubject(payload: { 
  name: string
  description?: string
  color?: string
  icon?: string
}): Promise<Subject> {
  const res: any = await api.post(createSubjectUrl, payload)
  // Unwrap common API envelope patterns
  const data = res?.data ?? res
  if (data?.value) return data.value as Subject
  return data as Subject
}

export async function updateSubject(subjectId: string, payload: { 
  name: string
  description?: string
  color?: string
  icon?: string
}): Promise<Subject> {
  const res: any = await api.put(`${basePath}/${subjectId}`, payload)
  const data = res?.data ?? res
  if (data?.value) return data.value as Subject
  return data as Subject
}

export async function deleteSubject(subjectId: string): Promise<void> {
  await api.delete(`${basePath}/${subjectId}`)
}

export default { listSubjects, createSubject, updateSubject, deleteSubject }