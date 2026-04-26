import api from '../Axios'
import { listSubjectsUrl, createSubjectUrl, basePath } from './url'

// Subject Category enum matching backend
export const SubjectCategory = {
  ProgrammingLanguage: 0,
  Frontend: 1,
  Backend: 2,
  Database: 3,
  Cloud: 5,
  DataScience: 6,
  MachineLearning: 7,
  Algorithms: 8,
  GameDevelopment: 9,
  Mobile: 10,
  Other: 11,
} as const

export type SubjectCategoryType = typeof SubjectCategory[keyof typeof SubjectCategory]

export type Subject = {
  id: string
  subjectId?: string
  name: string
  slug?: string
  description?: string
  color?: string
  icon?: string
  category?: SubjectCategoryType
  createdBy?: string
  createdByUserId?: string
  createdAt?: string
  goals?: any[] // Goals array from the new API structure
}

export interface ListSubjectsParams {
  category?: SubjectCategoryType
  forceRefresh?: boolean
}

const SUBJECT_CACHE_TTL_MS = 5 * 60 * 1000
type SubjectCacheEntry = {
  data: Subject[]
  expiresAt: number
}

const subjectListCache = new Map<string, SubjectCacheEntry>()
const subjectListInFlight = new Map<string, Promise<Subject[]>>()

function getListSubjectsCacheKey(params?: ListSubjectsParams): string {
  if (params?.category === undefined) return 'all'
  return `category:${String(params.category)}`
}

function cloneSubjects(subjects: Subject[]): Subject[] {
  return subjects.map((subject) => ({
    ...subject,
    goals: Array.isArray(subject.goals) ? [...subject.goals] : [],
  }))
}

function clearSubjectsCache(): void {
  subjectListCache.clear()
  subjectListInFlight.clear()
}

export { clearSubjectsCache }

export async function listSubjects(params?: ListSubjectsParams): Promise<Subject[]> {
  const cacheKey = getListSubjectsCacheKey(params)
  const shouldForceRefresh = params?.forceRefresh === true

  if (!shouldForceRefresh) {
    const cached = subjectListCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return cloneSubjects(cached.data)
    }

    const inFlightRequest = subjectListInFlight.get(cacheKey)
    if (inFlightRequest) {
      return inFlightRequest
    }
  }

  const queryParams = new URLSearchParams()

  if (params?.category !== undefined) {
    queryParams.append('category', String(params.category))
  }

  const url = `${listSubjectsUrl}${queryParams.toString() ? '?' + queryParams.toString() : ''}`

  if (shouldForceRefresh) {
    subjectListInFlight.delete(cacheKey)
  }

  const request = (async () => {
    const res: any = await api.get(url)

    let subjects: any[] = []

    // The API may wrap results as { isSuccess, value: [...] }
    if (Array.isArray(res)) subjects = res
    else if (Array.isArray(res?.value)) subjects = res.value
    else if (Array.isArray(res?.data)) subjects = res.data
    else if (Array.isArray(res?.data?.value)) subjects = res.data.value

    // Normalize: backend uses 'subjectId', frontend expects 'id'
    const normalizedSubjects = subjects.map((s: any) => ({
      id: s.subjectId || s.id,
      subjectId: s.subjectId || s.id,
      name: s.name,
      slug: s.slug,
      description: s.description,
      color: s.color,
      icon: s.icon,
      category: s.category,
      createdBy: s.createdBy,
      createdByUserId: s.createdByUserId,
      createdAt: s.createdAt,
      goals: s.goals || [], // Include goals array from API response
    }))

    subjectListCache.set(cacheKey, {
      data: normalizedSubjects,
      expiresAt: Date.now() + SUBJECT_CACHE_TTL_MS,
    })

    return cloneSubjects(normalizedSubjects)
  })()

  subjectListInFlight.set(cacheKey, request)

  try {
    return await request
  } finally {
    subjectListInFlight.delete(cacheKey)
  }
}

export async function createSubject(payload: {
  name: string
  description?: string
  color?: string
  icon?: string
  category?: string
}): Promise<Subject> {
  const res: any = await api.post(createSubjectUrl, payload)
  clearSubjectsCache()
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
  category?: string
}): Promise<Subject> {
  const res: any = await api.put(`${basePath}/${subjectId}`, payload)
  clearSubjectsCache()
  const data = res?.data ?? res
  if (data?.value) return data.value as Subject
  return data as Subject
}

export async function deleteSubject(subjectId: string): Promise<void> {
  await api.delete(`${basePath}/${subjectId}`)
  clearSubjectsCache()
}

export default { listSubjects, createSubject, updateSubject, deleteSubject, SubjectCategory }