import api from '../Axios'
import { skeletonUrl, lessonContentUrl, userLearningPathsUrl } from './url'
import { requestLearningPathGeneration, requestChapterSkeleton, requestLessonContent } from '../SignalR'

export type Quiz = {
  id: string
  quizId?: string
  quizzId?: string
  title: string
  description?: string | null
}

export type Lesson = {
  id: string
  title: string
  description?: string | null
  content?: string | null
  lessonDay?: string | null
  quizzes?: Quiz[]
  chapters?: Chapter[]
  quizSkeleton?: any
}

export type Task = {
  id: string
  title: string
  description?: string | null
  priority?: string | null
  taskStatus?: string | null
  dueDate?: string | null
}

export type Chapter = {
  id: string
  title: string
  content?: string | null
  orderIndex?: number
  lessons?: Lesson[]
  tasks?: Task[]
}

export type SkeletonResponse = {
  pathId?: string
  title?: string
  description?: string | null
  chapterDtos?: Array<{
    chapterId: string
    title: string
    content?: string | null
    orderIndex?: number
    lessons?: Array<{
      lessonId: string
      title: string
      content?: string | null
      lessonDay?: string | null
      quizzes?: Array<{ quizzId: string; title: string; description?: string | null }>
    }>
    tasks?: Array<{ 
      taskId: string; 
      title: string; 
      description?: string | null;
      priority?: string | null;
      taskStatus?: string | null;
      dueDate?: string | null;
    }>
  }>
  chapterCount?: number
  createdAt?: string
  isContentGenerating?: boolean
  lessons?: Lesson[]
  chapters?: Chapter[]
  [key: string]: any
}

function unwrap<T>(res: any): T {
  const data = (res?.data ?? res) as any
  if (data && typeof data === 'object') {
    if ('value' in data) return data.value as T
    if ('data' in data && data?.data && typeof data.data === 'object' && 'value' in data.data) {
      return data.data.value as T
    }
  }
  return data as T
}

function normalizeSkeleton(payload: any): SkeletonResponse {
  const hasChapterDtos = Array.isArray(payload?.chapterDtos)
  const chapters: Chapter[] | undefined = hasChapterDtos
    ? payload.chapterDtos.map((ch: any) => ({
      id: ch?.chapterId ?? ch?.id,
      title: ch?.title,
      content: ch?.content ?? null,
      orderIndex: ch?.orderIndex,
      lessons: Array.isArray(ch?.lessons)
        ? ch.lessons.map((ls: any) => ({
          id: ls?.lessonId ?? ls?.id,
          title: ls?.title,
          description: null,
          content: ls?.content ?? null,
          lessonDay: ls?.lessonDay ?? null,
          quizzes: Array.isArray(ls?.quizzes)
            ? ls.quizzes.map((q: any) => ({
              id: q?.quizzId ?? q?.id,
              title: q?.title,
              description: q?.description ?? null,
            }))
            : [],
        }))
        : [],
      tasks: Array.isArray(ch?.tasks)
        ? ch.tasks.map((t: any) => ({
          id: t?.taskId ?? t?.id,
          title: t?.title,
          description: t?.description ?? null,
          priority: t?.priority ?? null,
          taskStatus: t?.taskStatus ?? null,
          dueDate: t?.dueDate ?? null,
        }))
        : [],
    }))
    : payload?.chapters

  const lessons: Lesson[] | undefined = hasChapterDtos
    ? (chapters || []).flatMap((ch) => ch.lessons || [])
    : Array.isArray(payload?.lessons)
      ? payload.lessons.map((ls: any) => ({
        id: ls?.id ?? ls?.lessonId,
        title: ls?.title,
        description: ls?.description ?? null,
        content: ls?.content ?? null,
        lessonDay: ls?.lessonDay ?? null,
        quizzes: Array.isArray(ls?.quizzes)
          ? ls.quizzes.map((q: any) => ({
            id: q?.id ?? q?.quizzId,
            title: q?.title,
            description: q?.description ?? null,
          }))
          : [],
      }))
      : undefined

  return {
    ...payload,
    chapters,
    lessons,
  } as SkeletonResponse
}

export async function generateSkeleton(
  payload: any,
  options?: {
    useSignalR?: boolean
    onLoading?: () => void
    onProgress?: (progress: number) => void
  }
): Promise<SkeletonResponse> {
  const subjectId: string | undefined =
    payload?.subjectId ??
    payload?.SubjectId ??
    (Array.isArray(payload?.subjectIds) ? payload.subjectIds[0] : undefined) ??
    (Array.isArray(payload?.subjects) ? (payload.subjects[0]?.id ?? payload.subjects[0]?.subjectId) : undefined)

  // Handle both old goalId format and new goals array format
  const goals: Array<{ goalId: string; weight: number }> = Array.isArray(payload?.goals) 
    ? payload.goals 
    : payload?.goalId 
      ? [{ goalId: payload.goalId, weight: 100 }]
      : []

  const complexityLevel: string | undefined =
    payload?.complexityLevel ?? payload?.ComplexityLevel ?? payload?.level ?? payload?.Level

  const languageSelection: number | undefined =
    payload?.languageSelection ?? payload?.LanguageSelection

  const reqBody: any = {
    subjectId,
    goals,
    complexityLevel,
    languageSelection,
  }

  // Use SignalR if requested
  if (options?.useSignalR) {
    if (!subjectId || !goals || goals.length === 0 || !complexityLevel || languageSelection === undefined) {
      throw new Error('Missing required parameters for SignalR learning path generation')
    }

    const raw = await requestLearningPathGeneration(
      {
        subjectId,
        goals,
        complexityLevel,
        languageSelection,
      },
      options.onLoading,
      options.onProgress
    )
    const normalized = normalizeSkeleton(raw)
    return normalized
  }

  // Fallback to REST API - convert goals array to single goalId for backward compatibility
  const legacyReqBody = {
    subjectId,
    goalId: goals[0]?.goalId,
    complexityLevel,
    languageSelection,
  }
  const res: any = await api.post(skeletonUrl, legacyReqBody)
  const raw = unwrap<SkeletonResponse>(res)
  return normalizeSkeleton(raw)
}

export async function generateLessonContent(
  lessonId: string,
  payload?: any,
  onQuizSkeleton?: (quizSkeleton: any) => void
): Promise<Lesson> {
  // Use SignalR by default for lesson content generation (includes quiz skeleton)
  if (!payload || payload.useSignalR !== false) {
    return await requestLessonContent(lessonId, payload?.onLoading, {
      onSuccess: onQuizSkeleton
    })
  }

  // Fallback to REST API
  const body = payload && typeof payload === 'object' ? payload : {}
  const res: any = await api.post(lessonContentUrl(lessonId), body)
  return unwrap<Lesson>(res)
}

export async function generateChapterSkeleton(
  pathId: string,
  orderIndex: number,
  options?: {
    useSignalR?: boolean
    onLoading?: () => void
  }
): Promise<any> {
  // Use SignalR if requested
  if (options?.useSignalR) {
    return await requestChapterSkeleton(pathId, orderIndex, options.onLoading)
  }

  // Fallback to REST API (if available)
  throw new Error('REST API for chapter skeleton generation not implemented. Use SignalR instead.')
}

export interface UserLearningPathsParams {
  pageNumber?: number
  pageSize?: number
  searchTerm?: string
  subjectId?: string
  status?: string
  sortDescending?: boolean
}

export interface UserLearningPathsResponse {
  items: SkeletonResponse[]
  totalCount: number
  pageNumber: number
  pageSize: number
}

export async function getUserLearningPaths(
  userId: string | number,
  params?: UserLearningPathsParams
): Promise<UserLearningPathsResponse> {
  const queryParams = new URLSearchParams()

  if (params?.pageNumber !== undefined) queryParams.append('PageNumber', String(params.pageNumber))
  if (params?.pageSize !== undefined) queryParams.append('PageSize', String(params.pageSize))
  if (params?.searchTerm) queryParams.append('SearchTerm', params.searchTerm)
  if (params?.subjectId) queryParams.append('SubjectId', params.subjectId)
  if (params?.status) queryParams.append('Status', params.status)
  if (params?.sortDescending !== undefined) queryParams.append('SortDescending', String(params.sortDescending))

  const url = `${userLearningPathsUrl(userId)}${queryParams.toString() ? '?' + queryParams.toString() : ''}`
  const res: any = await api.get(url)
  const data = unwrap<UserLearningPathsResponse>(res)

  return {
    items: Array.isArray(data?.items) ? data.items.map(normalizeSkeleton) : [],
    totalCount: data?.totalCount ?? 0,
    pageNumber: data?.pageNumber ?? 1,
    pageSize: data?.pageSize ?? 10,
  }
}

export default { generateSkeleton, generateLessonContent, generateChapterSkeleton, getUserLearningPaths }
