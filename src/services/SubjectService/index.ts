import api from '../Axios'
import { listSubjectsUrl, createSubjectUrl } from './url'

export type Subject = {
  id: string
  name: string
  slug?: string
}

export async function listSubjects(): Promise<Subject[]> {
  const res: any = await api.get(listSubjectsUrl)
  // The API may wrap results as { isSuccess, value: [...] }
  if (Array.isArray(res)) return res as Subject[]
  if (Array.isArray(res?.value)) return res.value as Subject[]
  if (Array.isArray(res?.data)) return res.data as Subject[]
  if (Array.isArray(res?.data?.value)) return res.data.value as Subject[]
  return []
}

export async function createSubject(payload: { name: string; slug?: string }): Promise<Subject> {
  const res: any = await api.post(createSubjectUrl, payload)
  // Unwrap common API envelope patterns
  const data = res?.data ?? res
  if (data?.value) return data.value as Subject
  return data as Subject
}

export default { listSubjects, createSubject }