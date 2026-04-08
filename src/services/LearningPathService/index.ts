import api from '../Axios'
import {
  skeletonUrl,
  lessonContentUrl,
  lessonReadUrl,
  lessonReadStatusUrl,
  userLearningPathsUrl,
  aiDraftUrl,
  manualDraftUrl,
  manualDraftDetailUrl,
  myDraftsUrl,
  myDraftDetailUrl,
  learningPathProgressUrl,
} from './url'
import {
  requestLearningPathGeneration,
  requestChapterMentorSkeleton,
  requestChapterSkeleton,
  requestLessonContent,
  requestLessonQuizSkeleton,
  requestLearningPathSuggestions,
} from '../SignalR'

export type Quiz = {
  id: string
  quizId?: string
  quizzId?: string
  title: string
  description?: string | null
  dueDate?: string | null
  questions?: Question[]
  quizQuestionsJson?: string | null
  [key: string]: any
}

export type Question = {
  id?: string
  questionId?: string
  questionText: string
  type: string | number
  options?: string[] | null
  correctAnswer?: string | null
  points: number | string
  [key: string]: any
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
  [key: string]: any
}

export type Task = {
  id: string
  title: string
  description?: string | null
  priority?: string | null
  taskStatus?: string | null
  dueDate?: string | null
  taskType?: string | number | null
  quizQuestionsJson?: string | null
  [key: string]: any
}

export type Chapter = {
  id: string
  title: string
  content?: string | null
  orderIndex?: number
  startDate?: string | null
  endDate?: string | null
  estimatedDays?: number | null
  lessons?: Lesson[]
  tasks?: Task[]
  [key: string]: any
}

export type ManualDraftGoalInput = {
  goalId: string
  weight: number
}

export type ManualDraftQuizInput = {
  id?: string
  quizId?: string
  quizzId?: string
  title: string
  description?: string | null
  dueDate?: string | null
  questions?: ManualDraftQuestionInput[]
  quizQuestionsJson?: string | null
  [key: string]: any
}

export type ManualDraftQuestionInput = {
  id?: string
  questionId?: string
  questionText: string
  type: number | string
  options?: string[] | null
  correctAnswer?: string | null
  points: number
  [key: string]: any
}

export type ManualDraftLessonInput = {
  id?: string
  lessonId?: string
  title: string
  lessonDay?: string | null
  content?: string | null
  quizzes?: ManualDraftQuizInput[]
  [key: string]: any
}

export type ManualDraftTaskInput = {
  id?: string
  taskId?: string
  title: string
  description?: string | null
  priority?: string | number | null
  taskStatus?: string | number | null
  dueDate?: string | null
  taskType?: string | number | null
  quizQuestionsJson?: string | null
  [key: string]: any
}

export type ManualDraftChapterInput = {
  id?: string
  chapterId?: string
  title: string
  content?: string | null
  startDate?: string | null
  endDate?: string | null
  estimatedDays?: number | null
  lessons: ManualDraftLessonInput[]
  tasks?: ManualDraftTaskInput[]
  [key: string]: any
}

export type ManualDraftPayload = {
  subjectId: string
  goals: ManualDraftGoalInput[]
  complexityLevel: string | number
  languageSelection: number | string
  title: string
  description?: string | null
  startDate?: string | null
  endDate?: string | null
  chapters: ManualDraftChapterInput[]
  [key: string]: any
}

export type SkeletonResponse = {
  pathId?: string
  title?: string
  description?: string | null
  version?: number | null
  previousVersion?: number | null
  hasMeaningfulChange?: boolean
  sharedByUserId?: string | null
  sharedByUserName?: string | null
  sourceLearningPathId?: string | null
  sourceVersion?: number | null
  sourceLatestVersion?: number | null
  hasSourceUpdate?: boolean
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

function normalizeNumber(value: unknown, fallback = 0): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
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

function pickArray<T = any>(...candidates: unknown[]): T[] | undefined {
  let firstArray: T[] | undefined
  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue
    const arrayCandidate = candidate as T[]
    if (!firstArray) firstArray = arrayCandidate
    if (arrayCandidate.length > 0) return arrayCandidate
  }
  return firstArray
}

function normalizeQuestion(question: any): Question {
  return {
    ...question,
    id: question?.questionId ?? question?.id,
    questionId: question?.questionId ?? question?.QuestionId ?? question?.id,
    questionText: question?.questionText ?? question?.QuestionText ?? '',
    type: question?.type ?? question?.Type,
    options: question?.options ?? question?.Options ?? [],
    correctAnswer: question?.correctAnswer ?? question?.CorrectAnswer ?? null,
    points: question?.points ?? question?.Points ?? 0,
  }
}

function toNullableNumber(value: unknown): number | null {
  if (value == null || value === '') return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function toNullableBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true') return true
    if (normalized === 'false') return false
  }
  return null
}

function normalizeSkeleton(payload: any): SkeletonResponse {
  const chapterDtos = pickArray<any>(payload?.chapterDtos, payload?.ChapterDtos)
  const chapterItems = chapterDtos ?? pickArray<any>(payload?.chapters, payload?.Chapters)
  const hasChapterDtos = Array.isArray(chapterDtos)

  const chapters: Chapter[] | undefined = chapterItems?.map((chapter: any) => {
    const lessonItems = pickArray<any>(
      chapter?.lessons,
      chapter?.Lessons,
      chapter?.lessonDtos,
      chapter?.LessonDtos,
    )
    const taskItems = pickArray<any>(
      chapter?.tasks,
      chapter?.Tasks,
      chapter?.taskDtos,
      chapter?.TaskDtos,
    )

    return {
      ...chapter,
      id: chapter?.chapterId ?? chapter?.id,
      title: chapter?.title ?? chapter?.Title,
      content: chapter?.content ?? chapter?.Content ?? null,
      orderIndex: chapter?.orderIndex ?? chapter?.OrderIndex,
      startDate: chapter?.startDate ?? chapter?.StartDate ?? null,
      endDate: chapter?.endDate ?? chapter?.EndDate ?? null,
      estimatedDays: chapter?.estimatedDays ?? chapter?.EstimatedDays ?? null,
      lessons: lessonItems?.map((lesson: any) => {
        const quizItems = pickArray<any>(
          lesson?.quizzes,
          lesson?.Quizzes,
          lesson?.quizDtos,
          lesson?.QuizDtos,
        )
        return {
          ...lesson,
          id: lesson?.lessonId ?? lesson?.id,
          title: lesson?.title ?? lesson?.Title,
          description: lesson?.description ?? lesson?.Description ?? null,
          content: lesson?.content ?? lesson?.Content ?? null,
          lessonDay: lesson?.lessonDay ?? lesson?.LessonDay ?? null,
          quizzes: quizItems?.map((quiz: any) => ({
            ...quiz,
            id: quiz?.quizzId ?? quiz?.quizId ?? quiz?.id,
            quizId: quiz?.quizId ?? quiz?.quizzId ?? quiz?.id,
            quizzId: quiz?.quizzId ?? quiz?.quizId ?? quiz?.id,
            title: quiz?.title ?? quiz?.Title,
            description: quiz?.description ?? quiz?.Description ?? null,
            dueDate: quiz?.dueDate ?? quiz?.DueDate ?? null,
            questions: pickArray<any>(
              quiz?.questions,
              quiz?.Questions,
              quiz?.questionDtos,
              quiz?.QuestionDtos,
            )?.map((question: any) => normalizeQuestion(question)),
            quizQuestionsJson: quiz?.quizQuestionsJson ?? quiz?.QuizQuestionsJson ?? quiz?.quizQuestions ?? quiz?.QuizQuestions ?? null,
          })),
        }
      }) ?? [],
      tasks: taskItems?.map((task: any) => ({
        ...task,
        id: task?.taskId ?? task?.id,
        title: task?.title ?? task?.Title,
        description: task?.description ?? task?.Description ?? null,
        priority: task?.priority ?? task?.Priority ?? null,
        taskStatus: task?.taskStatus ?? task?.TaskStatus ?? null,
        dueDate: task?.dueDate ?? task?.DueDate ?? null,
        taskType: task?.taskType ?? task?.TaskType ?? null,
        quizQuestionsJson: task?.quizQuestionsJson ?? task?.QuizQuestionsJson ?? task?.quizQuestions ?? task?.QuizQuestions ?? null,
      })) ?? [],
    }
  })

  const lessons: Lesson[] | undefined = hasChapterDtos
    ? (chapters || []).flatMap((chapter) => chapter.lessons || [])
    : pickArray<any>(payload?.lessons, payload?.Lessons)?.map((lesson: any) => {
      const quizItems = pickArray<any>(
        lesson?.quizzes,
        lesson?.Quizzes,
        lesson?.quizDtos,
        lesson?.QuizDtos,
      )
      return {
        ...lesson,
        id: lesson?.id ?? lesson?.lessonId,
        title: lesson?.title ?? lesson?.Title,
        description: lesson?.description ?? lesson?.Description ?? null,
        content: lesson?.content ?? lesson?.Content ?? null,
        lessonDay: lesson?.lessonDay ?? lesson?.LessonDay ?? null,
        quizzes: quizItems?.map((quiz: any) => ({
          ...quiz,
          id: quiz?.id ?? quiz?.quizId ?? quiz?.quizzId,
          quizId: quiz?.quizId ?? quiz?.id ?? quiz?.quizzId,
          quizzId: quiz?.quizzId ?? quiz?.id ?? quiz?.quizId,
          title: quiz?.title ?? quiz?.Title,
          description: quiz?.description ?? quiz?.Description ?? null,
          dueDate: quiz?.dueDate ?? quiz?.DueDate ?? null,
          questions: pickArray<any>(
            quiz?.questions,
            quiz?.Questions,
            quiz?.questionDtos,
            quiz?.QuestionDtos,
          )?.map((question: any) => normalizeQuestion(question)),
          quizQuestionsJson: quiz?.quizQuestionsJson ?? quiz?.QuizQuestionsJson ?? quiz?.quizQuestions ?? quiz?.QuizQuestions ?? null,
        })),
      }
    })

  const normalizedVersion = toNullableNumber(payload?.version ?? payload?.Version)
  const normalizedPreviousVersion = toNullableNumber(payload?.previousVersion ?? payload?.PreviousVersion)
  const normalizedMeaningfulChange = toNullableBoolean(payload?.hasMeaningfulChange ?? payload?.HasMeaningfulChange)

  return {
    ...payload,
    version: normalizedVersion,
    previousVersion: normalizedPreviousVersion,
    hasMeaningfulChange: normalizedMeaningfulChange ?? undefined,
    sharedByUserId: payload?.sharedByUserId ?? payload?.SharedByUserId ?? null,
    sharedByUserName: payload?.sharedByUserName ?? payload?.SharedByUserName ?? null,
    sourceLearningPathId: payload?.sourceLearningPathId ?? payload?.SourceLearningPathId ?? null,
    sourceVersion: payload?.sourceVersion ?? payload?.SourceVersion ?? null,
    sourceLatestVersion: payload?.sourceLatestVersion ?? payload?.SourceLatestVersion ?? null,
    hasSourceUpdate: Boolean(payload?.hasSourceUpdate ?? payload?.HasSourceUpdate),
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
    clearUserLearningPathsCache()
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
  clearUserLearningPathsCache()
  return normalizeSkeleton(raw)
}

export async function generateAiDraft(payload: any): Promise<SkeletonResponse> {
  const subjectId: string | undefined =
    payload?.subjectId ??
    payload?.SubjectId ??
    (Array.isArray(payload?.subjectIds) ? payload.subjectIds[0] : undefined) ??
    (Array.isArray(payload?.subjects) ? (payload.subjects[0]?.id ?? payload.subjects[0]?.subjectId) : undefined)

  const goals: Array<{ goalId: string; weight: number }> = Array.isArray(payload?.goals)
    ? payload.goals
    : payload?.goalId
      ? [{ goalId: payload.goalId, weight: 100 }]
      : []

  const complexityLevel: string | undefined =
    payload?.complexityLevel ?? payload?.ComplexityLevel ?? payload?.level ?? payload?.Level

  const languageSelection: number | undefined =
    payload?.languageSelection ?? payload?.LanguageSelection

  const reqBody = {
    subjectId,
    goals,
    complexityLevel,
    languageSelection,
  }

  const res: any = await api.post(aiDraftUrl, reqBody)
  const raw = unwrap<SkeletonResponse>(res)
  clearUserLearningPathsCache()
  return normalizeSkeleton(raw)
}

export async function createManualDraft(payload: ManualDraftPayload): Promise<SkeletonResponse> {
  const res: any = await api.post(manualDraftUrl, payload)
  const raw = unwrap<SkeletonResponse>(res)
  clearUserLearningPathsCache()
  return normalizeSkeleton(raw)
}

export async function updateManualDraft(pathId: string, payload: ManualDraftPayload): Promise<SkeletonResponse> {
  const res: any = await api.put(manualDraftDetailUrl(pathId), payload)
  const raw = unwrap<SkeletonResponse>(res)
  clearUserLearningPathsCache()
  return normalizeSkeleton(raw)
}

export async function generateLessonContent(
  lessonId: string,
  payload?: any,
  onQuizEvent?: ((quizSkeleton: any) => void) | {
    onLoading?: () => void
    onSuccess?: (quizSkeleton: any) => void
    onError?: (err: any) => void
  }
): Promise<Lesson> {
  const quizHandlers = typeof onQuizEvent === 'function'
    ? { onSuccess: onQuizEvent }
    : onQuizEvent

  // Use SignalR by default for lesson content generation (includes quiz skeleton)
  if (!payload || payload.useSignalR !== false) {
    return await requestLessonContent(lessonId, payload?.onLoading, {
      onLoading: quizHandlers?.onLoading,
      onSuccess: quizHandlers?.onSuccess,
      onError: quizHandlers?.onError,
    })
  }

  // Fallback to REST API
  const body = payload && typeof payload === 'object' ? payload : {}
  const res: any = await api.post(lessonContentUrl(lessonId), body)
  return unwrap<Lesson>(res)
}

type LessonQuizSkeletonOptions = {
  onLoading?: () => void
}

function resolveServiceError(err: any, fallback: string): Error {
  if (err instanceof Error) return err

  return new Error(
    err?.ErrorMessage
    || err?.errorMessage
    || err?.message
    || err?.Message
    || fallback,
  )
}

export async function generateLessonQuizSkeleton(
  lessonId: string,
  options?: LessonQuizSkeletonOptions,
): Promise<any> {
  try {
    return await requestLessonQuizSkeleton(lessonId, options?.onLoading)
  } catch (err) {
    throw resolveServiceError(err, 'Failed to load lesson quiz skeleton')
  }
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

export async function generateChapterMentorSkeleton(
  pathId: string,
  chapterTitle: string,
  chapterDescription: string,
  options?: {
    useSignalR?: boolean
    onLoading?: () => void
  },
): Promise<any> {
  if (!options || options.useSignalR !== false) {
    return await requestChapterMentorSkeleton(pathId, chapterTitle, chapterDescription, options?.onLoading)
  }

  throw new Error('REST API for chapter mentor skeleton generation not implemented. Use SignalR instead.')
}

export interface UserLearningPathsParams {
  pageNumber?: number
  pageSize?: number
  searchTerm?: string
  subjectId?: string
  status?: string
  sortDescending?: boolean
  useCache?: boolean
}

export interface UserLearningPathsResponse {
  items: SkeletonResponse[]
  totalCount: number
  pageNumber: number
  pageSize: number
}

export interface LearningPathProgressResponse {
  pathId: string
  completedLessonContents: number
  totalLessonContents: number
  contentProgressPercent: number
  completedQuizzes: number
  totalQuizzes: number
  quizProgressPercent: number
  completedTasks: number
  totalTasks: number
  progressPercent: number
  status: string
}

export interface LessonReadStatusResponse {
  lessonId: string
  isLessonContentRead: boolean
  readAt: string | null
}

export interface MyDraftsParams {
  pageNumber?: number
  pageSize?: number
  searchTerm?: string
  subjectId?: string
  sortDescending?: boolean
}

type UserLearningPathsCacheEntry = {
  expiresAt: number
  data: UserLearningPathsResponse
}

const USER_LEARNING_PATHS_CACHE_PREFIX = 'learningPath:userPaths:'
const USER_LEARNING_PATHS_CACHE_TTL_MS = 2 * 60 * 1000
const userLearningPathsMemoryCache = new Map<string, UserLearningPathsCacheEntry>()

function buildUserLearningPathsCacheKey(
  userId: string | number,
  params?: UserLearningPathsParams
): string {
  const normalized = {
    pageNumber: params?.pageNumber ?? 1,
    pageSize: params?.pageSize ?? 10,
    searchTerm: params?.searchTerm ?? '',
    subjectId: params?.subjectId ?? '',
    status: params?.status ?? '',
    sortDescending: params?.sortDescending ?? false,
  }
  return `${userId}:${JSON.stringify(normalized)}`
}

function readUserLearningPathsStorageCache(key: string): UserLearningPathsCacheEntry | null {
  try {
    const raw = sessionStorage.getItem(`${USER_LEARNING_PATHS_CACHE_PREFIX}${key}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as UserLearningPathsCacheEntry
    if (!parsed?.expiresAt || parsed.expiresAt <= Date.now()) {
      sessionStorage.removeItem(`${USER_LEARNING_PATHS_CACHE_PREFIX}${key}`)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function writeUserLearningPathsStorageCache(key: string, entry: UserLearningPathsCacheEntry): void {
  try {
    sessionStorage.setItem(`${USER_LEARNING_PATHS_CACHE_PREFIX}${key}`, JSON.stringify(entry))
  } catch {
    // ignore cache write errors
  }
}

export function clearUserLearningPathsCache(userId?: string | number): void {
  if (userId !== undefined) {
    const userKeyPrefix = `${userId}:`
    Array.from(userLearningPathsMemoryCache.keys())
      .filter((key) => key.startsWith(userKeyPrefix))
      .forEach((key) => userLearningPathsMemoryCache.delete(key))

    try {
      const storageKeys: string[] = []
      for (let index = 0; index < sessionStorage.length; index++) {
        const storageKey = sessionStorage.key(index)
        if (storageKey) storageKeys.push(storageKey)
      }
      storageKeys
        .filter((storageKey) => storageKey.startsWith(`${USER_LEARNING_PATHS_CACHE_PREFIX}${userKeyPrefix}`))
        .forEach((storageKey) => sessionStorage.removeItem(storageKey))
    } catch {
      // ignore cache clear errors
    }
    return
  }

  userLearningPathsMemoryCache.clear()
  try {
    const storageKeys: string[] = []
    for (let index = 0; index < sessionStorage.length; index++) {
      const storageKey = sessionStorage.key(index)
      if (storageKey) storageKeys.push(storageKey)
    }
    storageKeys
      .filter((storageKey) => storageKey.startsWith(USER_LEARNING_PATHS_CACHE_PREFIX))
      .forEach((storageKey) => sessionStorage.removeItem(storageKey))
  } catch {
    // ignore cache clear errors
  }
}

export async function getUserLearningPaths(
  userId: string | number,
  params?: UserLearningPathsParams
): Promise<UserLearningPathsResponse> {
  const useCache = params?.useCache !== false
  const cacheKey = buildUserLearningPathsCacheKey(userId, params)

  if (useCache) {
    const memoryEntry = userLearningPathsMemoryCache.get(cacheKey)
    if (memoryEntry && memoryEntry.expiresAt > Date.now()) {
      return memoryEntry.data
    }

    const storageEntry = readUserLearningPathsStorageCache(cacheKey)
    if (storageEntry) {
      userLearningPathsMemoryCache.set(cacheKey, storageEntry)
      return storageEntry.data
    }
  }

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

  const normalizedResponse = {
    items: Array.isArray(data?.items) ? data.items.map(normalizeSkeleton) : [],
    totalCount: data?.totalCount ?? 0,
    pageNumber: data?.pageNumber ?? 1,
    pageSize: data?.pageSize ?? 10,
  }

  if (useCache) {
    const entry: UserLearningPathsCacheEntry = {
      data: normalizedResponse,
      expiresAt: Date.now() + USER_LEARNING_PATHS_CACHE_TTL_MS,
    }
    userLearningPathsMemoryCache.set(cacheKey, entry)
    writeUserLearningPathsStorageCache(cacheKey, entry)
  }

  return normalizedResponse
}

export async function getLearningPathProgress(pathId: string): Promise<LearningPathProgressResponse> {
  const res: any = await api.get(learningPathProgressUrl(pathId))
  const data = unwrap<LearningPathProgressResponse>(res)

  return {
    pathId: data?.pathId ?? pathId,
    completedLessonContents: normalizeNumber(data?.completedLessonContents),
    totalLessonContents: normalizeNumber(data?.totalLessonContents),
    contentProgressPercent: normalizeNumber(data?.contentProgressPercent),
    completedQuizzes: normalizeNumber(data?.completedQuizzes),
    totalQuizzes: normalizeNumber(data?.totalQuizzes),
    quizProgressPercent: normalizeNumber(data?.quizProgressPercent),
    completedTasks: normalizeNumber(data?.completedTasks),
    totalTasks: normalizeNumber(data?.totalTasks),
    progressPercent: normalizeNumber(data?.progressPercent),
    status: data?.status ?? 'NotStarted',
  }
}

export async function getLessonReadStatus(lessonId: string): Promise<LessonReadStatusResponse> {
  const res: any = await api.get(lessonReadStatusUrl(lessonId))
  const data = unwrap<LessonReadStatusResponse>(res)

  return {
    lessonId: data?.lessonId ?? lessonId,
    isLessonContentRead: Boolean(data?.isLessonContentRead),
    readAt: data?.readAt ?? null,
  }
}

export async function markLessonContentRead(lessonId: string): Promise<string | unknown> {
  const res: any = await api.post(lessonReadUrl(lessonId))
  return unwrap<string | unknown>(res)
}

export async function getMyDraftDetail(pathId: string): Promise<SkeletonResponse> {
  const res: any = await api.get(myDraftDetailUrl(pathId))
  const raw = unwrap<SkeletonResponse>(res)
  return normalizeSkeleton(raw)
}

export async function getMyDrafts(
  params?: MyDraftsParams
): Promise<UserLearningPathsResponse> {
  const queryParams = new URLSearchParams()

  if (params?.pageNumber !== undefined) queryParams.append('PageNumber', String(params.pageNumber))
  if (params?.pageSize !== undefined) queryParams.append('PageSize', String(params.pageSize))
  if (params?.searchTerm) queryParams.append('SearchTerm', params.searchTerm)
  if (params?.subjectId) queryParams.append('SubjectId', params.subjectId)
  if (params?.sortDescending !== undefined) queryParams.append('SortDescending', String(params.sortDescending))

  const url = `${myDraftsUrl}${queryParams.toString() ? '?' + queryParams.toString() : ''}`
  const res: any = await api.get(url)
  const data = unwrap<UserLearningPathsResponse>(res)

  return {
    items: Array.isArray(data?.items) ? data.items.map(normalizeSkeleton) : [],
    totalCount: data?.totalCount ?? 0,
    pageNumber: data?.pageNumber ?? 1,
    pageSize: data?.pageSize ?? 10,
  }
}

export async function getSuggestions(
  payload: any,
  options?: {
    useSignalR?: boolean
    onLoading?: () => void
    onSuggestionsLoaded?: (suggestions: any[]) => void
  }
): Promise<any> {
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

  // Use SignalR by default
  if (!options || options.useSignalR !== false) {
    if (!subjectId || !goals || goals.length === 0 || !complexityLevel || languageSelection === undefined) {
      throw new Error('Missing required parameters for SignalR learning path suggestions')
    }

    const raw = await requestLearningPathSuggestions(
      {
        subjectId,
        goals,
        complexityLevel,
        languageSelection,
      },
      options?.onLoading,
      options?.onSuggestionsLoaded
    )
    return raw
  }

  // Fallback to REST API (if implemented)
  throw new Error('REST API for learning path suggestions not implemented. Use SignalR instead.')
}

export default {
  generateSkeleton,
  generateAiDraft,
  createManualDraft,
  updateManualDraft,
  generateLessonContent,
  generateLessonQuizSkeleton,
  generateChapterSkeleton,
  generateChapterMentorSkeleton,
  getUserLearningPaths,
  clearUserLearningPathsCache,
  getLearningPathProgress,
  getLessonReadStatus,
  markLessonContentRead,
  getMyDrafts,
  getMyDraftDetail,
  getSuggestions,
}
