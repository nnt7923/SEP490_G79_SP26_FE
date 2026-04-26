import api from '../Axios'
import {
  skeletonUrl,
  lessonContentUrl,
  lessonReadUrl,
  lessonReadStatusUrl,
  userLearningPathsUrl,
  userLearningPathsSummaryUrl,
  userLearningPathDetailUrl,
  aiDraftUrl,
  manualDraftUrl,
  manualDraftDetailUrl,
  publishManualDraftUrl,
  myDraftsUrl,
  myDraftDetailUrl,
  learningPathProgressUrl,
  publishedPathsUrl,
  publishedPathPreviewUrl,
  enrollPathUrl,
  myPublishedUrl,
  myPublishedDetailUrl,
  unpublishLearningPathUrl,
  republishLearningPathUrl,
  studentLearningPathUrl,
  mentorReviewUrl,
  mentorReviewsUrl,
  mentorReviewRequestUrl,
  mentorReviewDecisionUrl,
} from './url'
import {
  requestLearningPathGeneration,
  requestChapterMentorSkeleton,
  requestChapterSkeleton,
  requestLessonContent,
  requestMentorLessonContent,
  requestLessonQuizSkeleton,
  requestSingleQuizSkeleton,
  requestSingleQuizQuestion,
  requestSingleTask,
  requestLearningPathSuggestions,
  requestMultipleLessonContents,
  requestMultipleMentorLessonContents,
  requestMultipleTasks,
  requestMultipleChapterTasks,
  requestMultipleQuizSkeletons,
  requestMultipleQuizQuestions,
  requestMultipleQuizQuestionsForQuiz,
} from '../SignalR'
import type { BatchSettledEntry, MultiTaskRequest, MultiQuizRequest } from '../SignalR'

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

export type ManualDraftVersionUpdateType = 'Minor' | 'Major'

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
  increaseVersion?: boolean
  versionUpdateType?: ManualDraftVersionUpdateType | null
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

export type PublishedLearningPathItem = {
  pathId: string
  title: string
  description?: string | null
  subjectId: string
  subjectName: string
  complexityLevel: number
  language: number
  versionNumber: number
  mentorId: string
  mentorName: string
  chapterCount: number
  lessonCount: number
  startDate?: string | null
  endDate?: string | null
  isEnrolled: boolean
}

export type PublishedPathsResponse = {
  items: PublishedLearningPathItem[]
  totalCount: number
  pageNumber: number
  pageSize: number
  totalPages: number
}

export type PublishedPathGoal = {
  goalId: string
  title: string
  weight: number
  durationInDays: number
  status: string
  completedAt: string | null
  progressPercent: number
  targetPercent: number
}

export type PublishedPathLesson = {
  lessonId: string
  title: string
  lessonDay?: string | null
  quizCount: number
}

export type PublishedPathTask = {
  taskId: string
  title: string
  taskType: number
  priority: number
  dueDate?: string | null
}

export type PublishedPathChapter = {
  chapterId: string
  title: string
  content?: string | null
  orderIndex: number
  lessons: PublishedPathLesson[]
  tasks: PublishedPathTask[]
}

export type PublishedPathPreviewDto = {
  pathId: string
  title: string
  description?: string | null
  subjectId: string
  subjectName: string
  complexityLevel: number
  language: number
  versionNumber: number
  mentorId: string
  mentorName: string
  startDate?: string | null
  endDate?: string | null
  goals: PublishedPathGoal[]
  chapters: PublishedPathChapter[]
  totalChapters: number
  totalLessons: number
  isEnrolled: boolean
}

export type EnrollResponse = {
  shareId: string
  enrolledPathId: string
  versionNumber: number
}

export type PublishedPathsParams = {
  pageNumber?: number
  pageSize?: number
  searchTerm?: string
  subjectId?: string
  complexityLevel?: number | string
  sortDescending?: boolean
}

export type SkeletonResponse = {
  pathId?: string
  title?: string
  description?: string | null
  version?: number | null
  previousVersion?: number | null
  hasMeaningfulChange?: boolean
  shareId?: string | null
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
            id: quiz?.quizId ?? quiz?.quizzId ?? quiz?.id,
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

export async function publishLearningPath(pathId: string, payload: ManualDraftPayload): Promise<SkeletonResponse> {
  const res: any = await api.post(publishManualDraftUrl(pathId), payload)
  const raw = unwrap<SkeletonResponse>(res)
  clearUserLearningPathsCache()
  return normalizeSkeleton(raw)
}

export async function unpublishLearningPath(pathId: string): Promise<boolean> {
  const res: any = await api.put(unpublishLearningPathUrl(pathId))
  clearUserLearningPathsCache()
  return unwrap<boolean>(res)
}

export type RepublishPayload = {
  increaseVersion: boolean
  versionUpdateType?: number | null
}

export async function republishLearningPath(pathId: string, payload: RepublishPayload): Promise<boolean> {
  const res: any = await api.put(republishLearningPathUrl(pathId), payload)
  clearUserLearningPathsCache()
  return unwrap<boolean>(res)
}

export async function getPublishedPaths(params?: PublishedPathsParams): Promise<PublishedPathsResponse> {
  const queryParams = new URLSearchParams()
  if (params?.pageNumber !== undefined) queryParams.append('PageNumber', String(params.pageNumber))
  if (params?.pageSize !== undefined) queryParams.append('PageSize', String(params.pageSize))
  if (params?.searchTerm) queryParams.append('SearchTerm', params.searchTerm)
  if (params?.subjectId) queryParams.append('SubjectId', params.subjectId)
  if (params?.complexityLevel !== undefined) queryParams.append('ComplexityLevel', String(params.complexityLevel))
  if (params?.sortDescending !== undefined) queryParams.append('SortDescending', String(params.sortDescending))
  const url = `${publishedPathsUrl}${queryParams.toString() ? '?' + queryParams.toString() : ''}`
  const res: any = await api.get(url)
  const data = unwrap<PublishedPathsResponse>(res)
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    totalCount: data?.totalCount ?? 0,
    pageNumber: data?.pageNumber ?? 1,
    pageSize: data?.pageSize ?? 10,
    totalPages: data?.totalPages ?? 1,
  }
}

export async function getPublishedPathPreview(pathId: string): Promise<PublishedPathPreviewDto> {
  const res: any = await api.get(publishedPathPreviewUrl(pathId))
  return unwrap<PublishedPathPreviewDto>(res)
}

export async function enrollInPath(pathId: string): Promise<EnrollResponse> {
  const res: any = await api.post(enrollPathUrl(pathId))
  return unwrap<EnrollResponse>(res)
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

export async function generateSingleQuizSkeleton(
  lessonId: string,
  options?: LessonQuizSkeletonOptions,
): Promise<any> {
  try {
    return await requestSingleQuizSkeleton(lessonId, options?.onLoading)
  } catch (err) {
    throw resolveServiceError(err, 'Failed to generate single quiz skeleton')
  }
}

export async function generateSingleQuizQuestion(
  quizId: string,
  questionType: number,
  options?: LessonQuizSkeletonOptions,
): Promise<any> {
  try {
    return await requestSingleQuizQuestion(quizId, questionType, options?.onLoading)
  } catch (err) {
    throw resolveServiceError(err, 'Failed to generate single quiz question')
  }
}

export async function generateMentorLessonContent(
  lessonId: string,
  options?: LessonQuizSkeletonOptions,
): Promise<any> {
  try {
    return await requestMentorLessonContent(lessonId, options?.onLoading)
  } catch (err) {
    throw resolveServiceError(err, 'Failed to generate mentor lesson content')
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

export async function generateSingleTask(
  chapterId: string,
  title: string | null,
  taskType: number,
  options?: {
    useSignalR?: boolean
    onLoading?: () => void
  },
): Promise<any> {
  if (!options || options.useSignalR !== false) {
    return await requestSingleTask(chapterId, title, taskType, options?.onLoading)
  }

  throw new Error('REST API for single task generation not implemented. Use SignalR instead.')
}

// ===========================================================================
// === BATCH / CONCURRENT GENERATION SERVICE WRAPPERS ========================
// ===========================================================================
// Re-export and wrap the SignalR batch helpers so components only need to
// import from LearningPathService (same pattern as single-item functions).

export type { BatchSettledEntry, MultiTaskRequest, MultiQuizRequest }

export async function generateMultipleLessonContents(
  lessonIds: string[],
  callbacks?: {
    onItemLoading?: (lessonId: string) => void
    onItemSuccess?: (lessonId: string, result: any) => void
    onItemError?: (lessonId: string, err: Error) => void
    onQuizEvent?: {
      onLoading?: (lessonId: string) => void
      onSuccess?: (lessonId: string, quizData: any) => void
      onError?: (lessonId: string, err: any) => void
    }
  }
): Promise<Map<string, BatchSettledEntry>> {
  try {
    return await requestMultipleLessonContents(lessonIds, callbacks)
  } catch (err) {
    throw resolveServiceError(err, 'Failed to generate multiple lesson contents')
  }
}

export async function generateMultipleMentorLessonContents(
  lessonIds: string[],
  callbacks?: {
    onItemLoading?: (lessonId: string) => void
    onItemSuccess?: (lessonId: string, result: any) => void
    onItemError?: (lessonId: string, err: Error) => void
  }
): Promise<Map<string, BatchSettledEntry>> {
  try {
    return await requestMultipleMentorLessonContents(lessonIds, callbacks)
  } catch (err) {
    throw resolveServiceError(err, 'Failed to generate multiple mentor lesson contents')
  }
}

export async function generateMultipleTasks(
  requests: MultiTaskRequest[],
  callbacks?: {
    onItemLoading?: (chapterId: string, taskType: number) => void
    onItemSuccess?: (key: string, chapterId: string, result: any) => void
    onItemError?: (key: string, chapterId: string, err: Error) => void
  }
): Promise<Map<string, BatchSettledEntry>> {
  try {
    return await requestMultipleTasks(requests, callbacks)
  } catch (err) {
    throw resolveServiceError(err, 'Failed to generate multiple tasks')
  }
}

export async function generateMultipleChapterTasks(
  chapterIds: string[],
  callbacks?: {
    onItemLoading?: (chapterId: string) => void
    onItemSuccess?: (chapterId: string, result: any) => void
    onItemError?: (chapterId: string, err: Error) => void
  }
): Promise<Map<string, BatchSettledEntry>> {
  try {
    return await requestMultipleChapterTasks(chapterIds, callbacks)
  } catch (err) {
    throw resolveServiceError(err, 'Failed to generate multiple chapter tasks')
  }
}

export async function generateMultipleQuizSkeletons(
  lessonIds: string[],
  callbacks?: {
    onItemLoading?: (lessonId: string) => void
    onItemSuccess?: (lessonId: string, result: any) => void
    onItemError?: (lessonId: string, err: Error) => void
  }
): Promise<Map<string, BatchSettledEntry>> {
  try {
    return await requestMultipleQuizSkeletons(lessonIds, callbacks)
  } catch (err) {
    throw resolveServiceError(err, 'Failed to generate multiple quiz skeletons')
  }
}

export async function generateMultipleQuizQuestions(
  requests: MultiQuizRequest[],
  callbacks?: {
    onItemLoading?: (quizId: string, questionType: number) => void
    onItemSuccess?: (key: string, quizId: string, result: any) => void
    onItemError?: (key: string, quizId: string, err: Error) => void
  }
): Promise<Map<string, BatchSettledEntry>> {
  try {
    return await requestMultipleQuizQuestions(requests, callbacks)
  } catch (err) {
    throw resolveServiceError(err, 'Failed to generate multiple quiz questions')
  }
}

export async function generateMultipleQuizQuestionsForQuiz(
  quizId: string,
  questionTypes: number[] = [0, 1, 2, 3, 4, 5],
  callbacks?: {
    onItemLoading?: (questionType: number) => void
    onItemSuccess?: (questionType: number, result: any) => void
    onItemError?: (questionType: number, err: Error) => void
  }
): Promise<Map<number, BatchSettledEntry>> {
  try {
    return await requestMultipleQuizQuestionsForQuiz(quizId, questionTypes, callbacks)
  } catch (err) {
    throw resolveServiceError(err, 'Failed to generate multiple quiz questions for quiz')
  }
}

export interface UserLearningPathsParams {
  pageNumber?: number
  pageSize?: number
  searchTerm?: string
  subjectId?: string
  status?: string
  sortDescending?: boolean
  useCache?: boolean
  includeDetails?: boolean
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
    includeDetails: params?.includeDetails ?? false,
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

  const items = Array.isArray(data?.items)
    ? data.items.map((item) =>
        params?.includeDetails ? normalizeSkeleton(item) : normalizeSkeletonListItem(item)
      )
    : []

  const normalizedResponse = {
    items,
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

export interface LearningPathSummaryItem {
  pathId: string
  title: string
  description: string | null
  status: string
  chapterCount: number
  progressPercent: number
  startDate: string | null
  endDate: string | null
  createdAt: string
  complexityLevel: string | null
  languageSelection: string | null
  shareId?: string | null
  sharedByUserName?: string | null
}

export interface UserLearningPathsSummaryResponse {
  items: LearningPathSummaryItem[]
  totalCount: number
  pageNumber: number
  pageSize: number
  totalPages: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export async function getUserLearningPathsSummary(
  userId: string | number,
  params?: { pageNumber?: number; pageSize?: number; searchTerm?: string; subjectId?: string }
): Promise<UserLearningPathsSummaryResponse> {
  const queryParams = new URLSearchParams()
  if (params?.pageNumber !== undefined) queryParams.append('PageNumber', String(params.pageNumber))
  if (params?.pageSize !== undefined) queryParams.append('PageSize', String(params.pageSize))
  if (params?.searchTerm) queryParams.append('SearchTerm', params.searchTerm)
  if (params?.subjectId) queryParams.append('SubjectId', params.subjectId)

  const url = `${userLearningPathsSummaryUrl(userId)}${queryParams.toString() ? '?' + queryParams.toString() : ''}`
  const res: any = await api.get(url)
  const data = unwrap<UserLearningPathsSummaryResponse>(res)

  return {
    items: Array.isArray(data?.items) ? data.items : [],
    totalCount: data?.totalCount ?? 0,
    pageNumber: data?.pageNumber ?? 1,
    pageSize: data?.pageSize ?? 10,
    totalPages: data?.totalPages ?? 1,
    hasPreviousPage: data?.hasPreviousPage ?? false,
    hasNextPage: data?.hasNextPage ?? false,
  }
}

export async function getUserLearningPathDetail(
  userId: string | number,
  pathId: string
): Promise<SkeletonResponse> {
  const res: any = await api.get(userLearningPathDetailUrl(userId, pathId))
  const raw = unwrap<SkeletonResponse>(res)
  return normalizeSkeleton(raw)
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

export async function getMyPublishedDetail(pathId: string): Promise<SkeletonResponse> {
  const res: any = await api.get(myPublishedDetailUrl(pathId))
  const raw = unwrap<SkeletonResponse>(res)
  return normalizeSkeleton(raw)
}

export async function getMyPublished(
  params?: MyDraftsParams
): Promise<UserLearningPathsResponse> {
  const queryParams = new URLSearchParams()

  if (params?.pageNumber !== undefined) queryParams.append('PageNumber', String(params.pageNumber))
  if (params?.pageSize !== undefined) queryParams.append('PageSize', String(params.pageSize))
  if (params?.searchTerm) queryParams.append('SearchTerm', params.searchTerm)
  if (params?.subjectId) queryParams.append('SubjectId', params.subjectId)
  if (params?.sortDescending !== undefined) queryParams.append('SortDescending', String(params.sortDescending))

  const url = `${myPublishedUrl}${queryParams.toString() ? '?' + queryParams.toString() : ''}`
  const res: any = await api.get(url)
  const data = unwrap<UserLearningPathsResponse>(res)

  return {
    items: Array.isArray(data?.items) ? data.items.map(normalizeSkeletonListItem) : [],
    totalCount: data?.totalCount ?? 0,
    pageNumber: data?.pageNumber ?? 1,
    pageSize: data?.pageSize ?? 10,
  }
}

export async function updateMyPublished(pathId: string, payload: ManualDraftPayload): Promise<SkeletonResponse> {
  const res: any = await api.put(myPublishedDetailUrl(pathId), payload)
  const raw = unwrap<SkeletonResponse>(res)
  clearUserLearningPathsCache()
  return normalizeSkeleton(raw)
}

export type StudentPathEditPayload = {
  chapters: Array<{
    title: string
    startDate?: string | null
    endDate?: string | null
    estimatedDays?: number | null
    lessons: Array<{
      title: string
      lessonDay: string
      content?: string | null
    }>
  }>
}

export async function getStudentLearningPath(pathId: string): Promise<SkeletonResponse> {
  const res: any = await api.get(studentLearningPathUrl(pathId))
  const raw = unwrap<SkeletonResponse>(res)
  return normalizeSkeleton(raw)
}

export async function updateStudentLearningPath(
  pathId: string,
  payload: StudentPathEditPayload,
): Promise<SkeletonResponse> {
  const res: any = await api.put(studentLearningPathUrl(pathId), payload)
  const raw = unwrap<SkeletonResponse>(res)
  clearUserLearningPathsCache()
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
    items: Array.isArray(data?.items) ? data.items.map(normalizeSkeletonListItem) : [],
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

export function normalizeSkeletonListItem(payload: any): SkeletonResponse {
  const normalizedVersion = toNullableNumber(payload?.version ?? payload?.Version)
  const normalizedPreviousVersion = toNullableNumber(payload?.previousVersion ?? payload?.PreviousVersion)
  const normalizedMeaningfulChange = toNullableBoolean(payload?.hasMeaningfulChange ?? payload?.HasMeaningfulChange)

  const chapterDtos = pickArray<any>(payload?.chapterDtos, payload?.ChapterDtos)
  const chapterItems = chapterDtos ?? pickArray<any>(payload?.chapters, payload?.Chapters) ?? []

  const lessonItems = pickArray<any>(payload?.lessons, payload?.Lessons) ?? []
  let totalLessonsLength = lessonItems.length
  if (totalLessonsLength === 0 && chapterItems.length > 0) {
    totalLessonsLength = chapterItems.reduce((acc: number, chapter: any) => {
      const cLessons = pickArray<any>(chapter?.lessons, chapter?.Lessons, chapter?.lessonDtos, chapter?.LessonDtos) ?? []
      return acc + cLessons.length
    }, 0)
  }

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
    shareId: payload?.shareId ?? payload?.ShareId ?? null,
    chapters: undefined,
    lessons: undefined,
    chapterCount: payload?.chapterCount ?? chapterItems.length ?? 0,
    lessonCount: payload?.lessonCount ?? totalLessonsLength
  } as SkeletonResponse
}

export async function generateBulkLearningPathContent(
  pathId: string,
  options?: {
    lessonConcurrency?: number
    quizConcurrency?: number
    onStarted?: (data: any) => void
    onProgress?: (data: any) => void
    onCompleted?: (data: any) => void
    onError?: (data: any) => void
    onCancelled?: (data: any) => void
    onLessonSuccess?: (lesson: any) => void
    onLessonError?: (data: any) => void
    onQuizSuccess?: (data: any) => void
    onQuizError?: (data: any) => void
  }
): Promise<any> {
  const { requestBulkLearningPathContent } = await import('../SignalR')
  return requestBulkLearningPathContent(
    pathId,
    options?.lessonConcurrency ?? 4,
    options?.quizConcurrency ?? 6,
    {
      onStarted: options?.onStarted,
      onProgress: options?.onProgress,
      onCompleted: options?.onCompleted,
      onError: options?.onError,
      onCancelled: options?.onCancelled,
      onLessonSuccess: options?.onLessonSuccess,
      onLessonError: options?.onLessonError,
      onQuizSuccess: options?.onQuizSuccess,
      onQuizError: options?.onQuizError,
    },
  )
}

// ===========================================================================
// === MENTOR REVIEW =========================================================
// ===========================================================================

export type MentorReviewDecisionStatus = 'Pending' | 'Accepted' | 'Rejected' | 'WaitingStudentResponse'

export interface MentorReviewDto {
  reviewId: string
  pathId: string
  mentorId: string
  studentId: string
  revisedPathId?: string | null
  studentRequestNote?: string | null
  score?: number | null
  feedback?: string | null
  suggestions?: string | null
  changeSummary?: string | null
  changeReason?: string | null
  decisionStatus: MentorReviewDecisionStatus
  studentDecisionNote?: string | null
  studentDecidedAt?: string | null
  rejectionCount?: number
  maxRejections?: number
  canRequestRevision?: boolean
  averageScore?: number | null
  totalReviews?: number | null
  mentorName?: string | null
  mentorAvatarUrl?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export interface RequestMentorReviewPayload {
  mentorId: string
  studentRequestNote?: string | null
}

export interface SubmitMentorReviewPayload {
  score: number
  feedback: string
  suggestions?: string | null
  changeSummary?: string | null
  changeReason?: string | null
}

export interface MentorReviewDecisionPayload {
  decisionStatus: 'Accepted' | 'Rejected'
  studentDecisionNote?: string | null
}

const MENTOR_REVIEW_ERROR_CODES: Record<string, string> = {
  REVIEW_REQUEST_NOT_FOUND: 'Mentor chưa nhận được yêu cầu review từ student.',
  REVISED_PATH_NOT_FOUND: 'Workspace chỉnh sửa của mentor không tồn tại.',
  MENTOR_REVIEW_REJECT_LIMIT_REACHED: 'Đã hết lượt từ chối. Không thể từ chối thêm.',
  LEARNING_PATH_NOT_FOUND: 'Không tìm thấy lộ trình học.',
  LEARNING_PATH_NOT_AI_GENERATED: 'Chỉ có thể review lộ trình được tạo bởi AI.',
  SELF_REVIEW_NOT_ALLOWED: 'Không thể review lộ trình của chính mình.',
  INVALID_FEEDBACK: 'Nội dung feedback không hợp lệ.',
  ACCESS_DENIED: 'Bạn không có quyền thực hiện thao tác này.',
  REVIEW_NOT_FOUND: 'Không tìm thấy review.',
  UNAUTHORIZED: 'Vui lòng đăng nhập lại.',
}

export function resolveMentorReviewError(err: any): string {
  const code = err?.response?.data?.errorCode || err?.response?.data?.ErrorCode || err?.errorCode
  if (code && MENTOR_REVIEW_ERROR_CODES[code]) return MENTOR_REVIEW_ERROR_CODES[code]
  if (err?.response?.status === 429) return MENTOR_REVIEW_ERROR_CODES.MENTOR_REVIEW_REJECT_LIMIT_REACHED
  return err?.response?.data?.message || err?.message || 'Đã xảy ra lỗi.'
}

function unwrapReview(res: any): any {
  const data = res?.data ?? res
  if (data && typeof data === 'object' && 'value' in data) return data.value
  return data
}

export async function requestMentorReview(
  pathId: string,
  payload: RequestMentorReviewPayload
): Promise<MentorReviewDto> {
  const res = await api.post(mentorReviewRequestUrl(pathId), payload)
  return unwrapReview(res) as MentorReviewDto
}

export async function submitMentorReview(
  pathId: string,
  payload: SubmitMentorReviewPayload
): Promise<MentorReviewDto> {
  const res = await api.put(mentorReviewUrl(pathId), payload)
  return unwrapReview(res) as MentorReviewDto
}

export async function getMentorReviews(pathId: string): Promise<MentorReviewDto[]> {
  const res: any = await api.get(mentorReviewsUrl(pathId))
  const data = res?.data ?? res
  let arr: any[] = []
  if (Array.isArray(data)) arr = data
  else if (Array.isArray(data?.value)) arr = data.value
  else if (Array.isArray(data?.value?.reviews)) arr = data.value.reviews
  else if (Array.isArray(data?.reviews)) arr = data.reviews
  else if (Array.isArray(data?.items)) arr = data.items
  // Normalize PascalCase → camelCase for key fields
  return arr.map((r: any) => ({
    ...r,
    reviewId: r.reviewId || r.ReviewId,
    pathId: r.pathId || r.PathId,
    mentorId: r.mentorId || r.MentorId,
    studentId: r.studentId || r.StudentId,
    revisedPathId: r.revisedPathId || r.RevisedPathId || null,
    decisionStatus: r.decisionStatus || r.DecisionStatus || 'Pending',
    studentRequestNote: r.studentRequestNote || r.StudentRequestNote || null,
    score: r.score ?? r.Score ?? null,
    feedback: r.feedback || r.Feedback || null,
    suggestions: r.suggestions || r.Suggestions || null,
    changeSummary: r.changeSummary || r.ChangeSummary || null,
    changeReason: r.changeReason || r.ChangeReason || null,
    mentorName: r.mentorName || r.MentorName || null,
    createdAt: r.createdAt || r.CreatedAt || null,
  }))
}

export async function decideMentorReview(
  pathId: string,
  reviewId: string,
  payload: MentorReviewDecisionPayload
): Promise<MentorReviewDto> {
  const res = await api.put(mentorReviewDecisionUrl(pathId, reviewId), payload)
  return unwrapReview(res) as MentorReviewDto
}

export default {
  generateSkeleton,
  generateAiDraft,
  createManualDraft,
  updateManualDraft,
  publishLearningPath,
  unpublishLearningPath,
  republishLearningPath,
  getPublishedPaths,
  getPublishedPathPreview,
  enrollInPath,
  generateLessonContent,
  generateMentorLessonContent,
  generateLessonQuizSkeleton,
  generateSingleQuizSkeleton,
  generateSingleQuizQuestion,
  generateChapterSkeleton,
  generateChapterMentorSkeleton,
  generateSingleTask,
  generateMultipleLessonContents,
  generateMultipleMentorLessonContents,
  generateMultipleTasks,
  generateMultipleChapterTasks,
  generateMultipleQuizSkeletons,
  generateMultipleQuizQuestions,
  generateMultipleQuizQuestionsForQuiz,
  generateBulkLearningPathContent,
  getUserLearningPaths,
  getUserLearningPathsSummary,
  getUserLearningPathDetail,
  clearUserLearningPathsCache,
  getLearningPathProgress,
  getLessonReadStatus,
  markLessonContentRead,
  getMyDrafts,
  getMyDraftDetail,
  getMyPublished,
  getMyPublishedDetail,
  updateMyPublished,
  getStudentLearningPath,
  updateStudentLearningPath,
  getSuggestions,
  submitMentorReview,
  getMentorReviews,
  decideMentorReview,
  requestMentorReview,
}
