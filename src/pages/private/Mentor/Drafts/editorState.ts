import { LanguageSelection } from '../../../../services'
import type { ManualDraftPayload, SkeletonResponse } from '../../../../services/LearningPathService'
import { buildLessonContentFromSections, createEmptyLessonSections, parseLessonSections, type LessonSectionKey } from './lessonContentContract'
import type { DraftFormState, EditableChapter, EditableLesson, EditableQuiz, EditableTask, Level } from './editorTypes'

export const LEVEL_OPTIONS: Level[] = ['Beginner', 'Intermediate', 'Advanced']
export const TASK_TYPE_OPTIONS = ['Practice', 'Theory', 'Quizz']
export const TASK_STATUS_OPTIONS = ['Pending', 'InProgress', 'Completed']

const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`
const toDateInput = (value?: string | null) => value ? new Date(value).toISOString().slice(0, 10) : ''
const toIsoDate = (value?: string) => value ? new Date(`${value}T00:00:00.000Z`).toISOString() : undefined
const extractMarkdown = (payload: any): string => typeof payload === 'string' ? payload : payload?.content ?? payload?.markdown ?? payload?.body ?? payload?.text ?? ''

export const normalizeJsonField = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (value == null || value === '') return ''
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

type GenericObject = Record<string, unknown>

const asObject = (value: unknown): GenericObject | null => (
  value != null && typeof value === 'object' && !Array.isArray(value)
    ? value as GenericObject
    : null
)

const QUIZ_ARRAY_KEYS = ['quizzes', 'Quizzes', 'quizDtos', 'QuizDtos', 'quizList', 'QuizList', 'items', 'Items'] as const
const QUIZ_WRAPPER_KEYS = ['value', 'Value', 'data', 'Data', 'result', 'Result', 'payload', 'Payload', 'quizSkeleton', 'QuizSkeleton'] as const

const pickArray = (...candidates: unknown[]): unknown[] => {
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate
  }
  return []
}

const pickOptionalArray = (...candidates: unknown[]): unknown[] | undefined => {
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate
  }
  return undefined
}

const unwrapQuizPayloadCandidates = (payload: unknown): unknown[] => {
  const payloadObject = asObject(payload)
  return [
    payload,
    ...QUIZ_WRAPPER_KEYS.map((key) => payloadObject?.[key]),
  ]
}

const isQuizItemLike = (value: unknown): boolean => {
  if (typeof value === 'string') return value.trim().length > 0

  const valueObject = asObject(value)
  if (!valueObject) return false

  return [
    valueObject.id,
    valueObject.quizId,
    valueObject.quizzId,
    valueObject.QuizId,
    valueObject.QuizzId,
    valueObject.title,
    valueObject.Title,
    valueObject.name,
    valueObject.Name,
    valueObject.description,
    valueObject.Description,
    valueObject.desc,
    valueObject.Desc,
  ].some((item) => item != null && String(item).trim() !== '')
}

const findNestedQuizItems = (
  payload: unknown,
  visited = new Set<unknown>(),
  depth = 0,
): { quizItems: unknown[]; hasQuizArray: boolean } => {
  if (depth > 5 || payload == null) return { quizItems: [], hasQuizArray: false }
  if (typeof payload === 'object') {
    if (visited.has(payload)) return { quizItems: [], hasQuizArray: false }
    visited.add(payload)
  }

  if (Array.isArray(payload)) {
    if (payload.length === 0) return { quizItems: payload, hasQuizArray: true }
    if (payload.some((item) => isQuizItemLike(item))) {
      return { quizItems: payload, hasQuizArray: true }
    }
    for (const item of payload) {
      const nested = findNestedQuizItems(item, visited, depth + 1)
      if (nested.hasQuizArray) return nested
    }
    return { quizItems: [], hasQuizArray: false }
  }

  const payloadObject = asObject(payload)
  if (!payloadObject) return { quizItems: [], hasQuizArray: false }

  const directQuizItems = pickArray(...QUIZ_ARRAY_KEYS.map((key) => payloadObject[key]))
  const hasDirectQuizArray = QUIZ_ARRAY_KEYS.some((key) => Array.isArray(payloadObject[key]))
  if (hasDirectQuizArray) {
    return {
      quizItems: directQuizItems,
      hasQuizArray: true,
    }
  }

  for (const key of QUIZ_WRAPPER_KEYS) {
    const nested = findNestedQuizItems(payloadObject[key], visited, depth + 1)
    if (nested.hasQuizArray) return nested
  }

  for (const value of Object.values(payloadObject)) {
    const nested = findNestedQuizItems(value, visited, depth + 1)
    if (nested.hasQuizArray) return nested
  }

  return { quizItems: [], hasQuizArray: false }
}

const extractQuizItems = (payload: unknown): { quizItems: unknown[]; hasQuizArray: boolean } => {
  const candidates = unwrapQuizPayloadCandidates(payload)

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return {
        quizItems: candidate,
        hasQuizArray: true,
      }
    }

    const candidateObject = asObject(candidate)
    if (!candidateObject) continue

    const nestedQuizItems = pickArray(...QUIZ_ARRAY_KEYS.map((key) => candidateObject[key]))
    const hasNestedQuizArray = QUIZ_ARRAY_KEYS.some((key) => Array.isArray(candidateObject[key]))
    if (hasNestedQuizArray) {
      return {
        quizItems: nestedQuizItems,
        hasQuizArray: true,
      }
    }
  }

  return findNestedQuizItems(payload)
}

const toPersistedId = (value: unknown): string | null => {
  if (value == null || value === '') return null
  return String(value)
}

export type NormalizedQuizSkeletonItem = {
  persistedId: string | null
  title: string
  description: string
}

export type QuizSkeletonParseResult = {
  items: NormalizedQuizSkeletonItem[]
  hasQuizArray: boolean
  rawItemCount: number
}

export const parseQuizSkeletonPayload = (payload: unknown): QuizSkeletonParseResult => {
  const { quizItems, hasQuizArray } = extractQuizItems(payload)

  const items = quizItems
    .map((item) => {
      const itemObject = asObject(item)
      if (!itemObject) {
        const fallbackTitle = typeof item === 'string' ? item : ''
        return {
          persistedId: null,
          title: fallbackTitle,
          description: '',
        }
      }

      return {
        persistedId: toPersistedId(itemObject.id ?? itemObject.quizId ?? itemObject.quizzId ?? itemObject.QuizId ?? itemObject.QuizzId),
        title: String(itemObject.title ?? itemObject.Title ?? itemObject.name ?? itemObject.Name ?? ''),
        description: String(itemObject.description ?? itemObject.Description ?? itemObject.desc ?? itemObject.Desc ?? ''),
      }
    })

  // Keep structured object rows even if title/description/id are empty to avoid false-empty classification.
  const normalizedItems = items.filter((item, index) => {
    const source = quizItems[index]
    const sourceObject = asObject(source)
    if (sourceObject) return true
    return !!(item.persistedId || item.title.trim() || item.description.trim())
  })

  return {
    items: normalizedItems,
    hasQuizArray,
    rawItemCount: quizItems.length,
  }
}

export const normalizeQuizSkeletonPayload = (payload: unknown): NormalizedQuizSkeletonItem[] => parseQuizSkeletonPayload(payload).items

export const mergeLessonQuizzesWithSkeleton = (
  existingQuizzes: EditableQuiz[],
  skeletonItems: NormalizedQuizSkeletonItem[],
): EditableQuiz[] => {
  if (skeletonItems.length === 0) return existingQuizzes

  const usedQuizIds = new Set<string>()

  const merged = skeletonItems.map((skeletonQuiz, index) => {
    const matchByPersistedId = skeletonQuiz.persistedId
      ? existingQuizzes.find((quiz) => quiz.persistedId === skeletonQuiz.persistedId && !usedQuizIds.has(quiz.id))
      : undefined
    const matchByIndex = existingQuizzes[index] && !usedQuizIds.has(existingQuizzes[index].id)
      ? existingQuizzes[index]
      : undefined
    const matchedQuiz = matchByPersistedId ?? matchByIndex

    if (matchedQuiz) usedQuizIds.add(matchedQuiz.id)

    return {
      id: matchedQuiz?.id ?? uid('quiz'),
      persistedId: skeletonQuiz.persistedId ?? matchedQuiz?.persistedId ?? null,
      title: skeletonQuiz.title.trim() || matchedQuiz?.title || '',
      description: skeletonQuiz.description.trim() || matchedQuiz?.description || '',
      // Keep existing question JSON so manual edits are not lost when skeleton is regenerated.
      quizQuestionsJson: matchedQuiz?.quizQuestionsJson ?? '',
    }
  })

  const remaining = existingQuizzes.filter((quiz) => !usedQuizIds.has(quiz.id))
  return [...merged, ...remaining]
}

export const extractQuizQuestionsJsonPayload = (payload: unknown): string => {
  if (typeof payload === 'string') return payload
  if (payload == null || payload === '') return ''

  const payloadObject = asObject(payload)
  if (!payloadObject) return normalizeJsonField(payload)

  const directQuestions =
    payloadObject.quizQuestionsJson
    ?? payloadObject.QuizQuestionsJson
    ?? payloadObject.quizQuestions
    ?? payloadObject.QuizQuestions
    ?? payloadObject.questions
    ?? payloadObject.Questions
    ?? payloadObject.value
    ?? payloadObject.Value

  if (directQuestions != null) return normalizeJsonField(directQuestions)

  return normalizeJsonField(payloadObject)
}

export const normalizeTaskType = (value: unknown): string => {
  if (value === 0 || String(value).trim() === '0') return 'Practice'
  if (value === 1 || String(value).trim() === '1') return 'Theory'
  if (value === 2 || String(value).trim() === '2') return 'Quizz'
  const normalized = String(value ?? '').trim()
  return TASK_TYPE_OPTIONS.includes(normalized) ? normalized : 'Practice'
}

export const normalizeTaskStatus = (value: unknown): string => {
  if (value === 0 || String(value).trim() === '0') return 'Pending'
  if (value === 1 || String(value).trim() === '1') return 'InProgress'
  if (value === 2 || String(value).trim() === '2') return 'Completed'
  const normalized = String(value ?? '').trim()
  return TASK_STATUS_OPTIONS.includes(normalized) ? normalized : 'Pending'
}

const normalizeLanguage = (value: unknown) =>
  value === 'English'
    ? LanguageSelection.English
    : value === 'VietNamese' || value === 'Vietnamese'
      ? LanguageSelection.Vietnamese
      : typeof value === 'number'
        ? value
        : LanguageSelection.Vietnamese

export const emptyQuiz = (): EditableQuiz => ({ id: uid('quiz'), persistedId: null, title: '', description: '', quizQuestionsJson: '' })
export const emptyTask = (): EditableTask => ({ id: uid('task'), persistedId: null, title: '', description: '', priority: '', taskStatus: 'Pending', dueDate: '', taskType: 'Practice', quizQuestionsJson: '' })
export const emptyLesson = (): EditableLesson => ({ id: uid('lesson'), persistedId: null, title: '', lessonDay: '', sections: createEmptyLessonSections(), quizzes: [] })
export const emptyChapter = (): EditableChapter => ({ id: uid('chapter'), persistedId: null, title: '', content: '', startDate: '', endDate: '', estimatedDays: '', lessons: [emptyLesson()], tasks: [] })
export const emptyForm = (): DraftFormState => ({
  subjectId: '',
  goals: [],
  complexityLevel: 'Beginner',
  languageSelection: LanguageSelection.Vietnamese,
  title: '',
  description: '',
  startDate: '',
  endDate: '',
  chapters: [emptyChapter()],
})

const normalizeGoalWeightValue = (value: unknown) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 100
  const normalized = numeric >= 0 && numeric <= 1 ? numeric * 100 : numeric
  return Math.max(0, Math.min(100, Math.round(normalized)))
}

const extractGoals = (payload: any) => {
  const source = Array.isArray(payload?.goals)
    ? payload.goals
    : Array.isArray(payload?.goalDtos)
      ? payload.goalDtos
      : payload?.goalId
        ? [{ goalId: payload.goalId, weight: 100 }]
        : []
  const extractedGoals = source
    .map((goal: any) => ({ goalId: String(goal?.goalId ?? goal?.id ?? ''), weight: normalizeGoalWeightValue(goal?.weight ?? 100) }))
    .filter((goal: any) => goal.goalId)
    .slice(0, 2)

  if (extractedGoals.length === 1) {
    extractedGoals[0] = { ...extractedGoals[0], weight: 100 }
  }

  if (extractedGoals.length === 2) {
    const firstWeight = Math.max(10, Math.min(90, extractedGoals[0].weight))
    extractedGoals[0] = { ...extractedGoals[0], weight: firstWeight }
    extractedGoals[1] = { ...extractedGoals[1], weight: 100 - firstWeight }
  }

  return extractedGoals
}

export const hydrateDraftForm = (payload?: SkeletonResponse | null, fallback?: DraftFormState | null): DraftFormState => {
  if (!payload) return fallback ? { ...fallback } : emptyForm()
  const chapters = Array.isArray(payload?.chapters) && payload.chapters.length > 0
    ? payload.chapters.map((chapter: any, chapterIndex: number) => {
      const fallbackChapter = fallback?.chapters.find((item) => item.persistedId && item.persistedId === String(chapter?.id ?? chapter?.chapterId))
        ?? fallback?.chapters[chapterIndex]

      const lessons = Array.isArray(chapter?.lessons) && chapter.lessons.length > 0
        ? chapter.lessons.map((lesson: any, lessonIndex: number) => {
          const lessonPersistedId = lesson?.id ?? lesson?.lessonId
          const fallbackLesson = fallbackChapter?.lessons.find((item) => item.persistedId && item.persistedId === String(lessonPersistedId))
            ?? fallbackChapter?.lessons[lessonIndex]
          const quizItems = pickOptionalArray(lesson?.quizzes, lesson?.Quizzes, lesson?.quizDtos, lesson?.QuizDtos)
          const hasLessonContent = lesson?.content != null || lesson?.Content != null

          return {
            id: String(lessonPersistedId ?? fallbackLesson?.id ?? uid('lesson')),
            persistedId: lessonPersistedId != null ? String(lessonPersistedId) : (fallbackLesson?.persistedId ?? null),
            title: lesson?.title ?? fallbackLesson?.title ?? '',
            lessonDay: toDateInput(lesson?.lessonDay ?? lesson?.LessonDay ?? fallbackLesson?.lessonDay),
            sections: hasLessonContent
              ? parseLessonSections(extractMarkdown(lesson?.content ?? lesson?.Content))
              : (fallbackLesson?.sections ?? createEmptyLessonSections()),
            quizzes: quizItems
              ? quizItems.map((quiz: any, quizIndex: number) => {
                const quizPersistedId = quiz?.id ?? quiz?.quizId ?? quiz?.quizzId
                const fallbackQuiz = fallbackLesson?.quizzes.find((item) => item.persistedId && item.persistedId === String(quizPersistedId))
                  ?? fallbackLesson?.quizzes[quizIndex]

                return {
                  id: String(quizPersistedId ?? fallbackQuiz?.id ?? uid('quiz')),
                  persistedId: quizPersistedId != null ? String(quizPersistedId) : (fallbackQuiz?.persistedId ?? null),
                  title: String(quiz?.title ?? quiz?.Title ?? fallbackQuiz?.title ?? ''),
                  description: String(quiz?.description ?? quiz?.Description ?? fallbackQuiz?.description ?? ''),
                  quizQuestionsJson: normalizeJsonField(
                    quiz?.quizQuestionsJson
                    ?? quiz?.QuizQuestionsJson
                    ?? quiz?.quizQuestions
                    ?? quiz?.QuizQuestions
                    ?? fallbackQuiz?.quizQuestionsJson
                    ?? '',
                  ),
                }
              })
              : (fallbackLesson?.quizzes ?? []),
          }
        })
        : (fallbackChapter?.lessons?.length ? fallbackChapter.lessons : [emptyLesson()])

      return {
        id: String(chapter?.id ?? chapter?.chapterId ?? fallbackChapter?.id ?? uid('chapter')),
        persistedId: chapter?.id != null || chapter?.chapterId != null ? String(chapter?.id ?? chapter?.chapterId) : (fallbackChapter?.persistedId ?? null),
        title: chapter?.title ?? fallbackChapter?.title ?? '',
        content: chapter?.content ?? fallbackChapter?.content ?? '',
        startDate: toDateInput(chapter?.startDate ?? chapter?.StartDate ?? fallbackChapter?.startDate),
        endDate: toDateInput(chapter?.endDate ?? chapter?.EndDate ?? fallbackChapter?.endDate),
        estimatedDays: chapter?.estimatedDays != null ? String(chapter.estimatedDays) : (fallbackChapter?.estimatedDays ?? ''),
        lessons,
        tasks: Array.isArray(chapter?.tasks) ? chapter.tasks.map((task: any) => ({
        id: String(task?.id ?? task?.taskId ?? uid('task')),
        persistedId: task?.id != null || task?.taskId != null ? String(task?.id ?? task?.taskId) : null,
        title: task?.title ?? '',
        description: task?.description ?? '',
        priority: task?.priority != null ? String(task.priority) : '',
        taskStatus: normalizeTaskStatus(task?.taskStatus ?? task?.TaskStatus),
        dueDate: toDateInput(task?.dueDate ?? task?.DueDate),
        taskType: normalizeTaskType(task?.taskType ?? task?.TaskType),
        quizQuestionsJson: normalizeJsonField(task?.quizQuestionsJson ?? task?.QuizQuestionsJson),
      })) : [],
      }
    })
    : fallback?.chapters?.length
      ? fallback.chapters
      : [emptyChapter()]

  const extractedGoals = extractGoals(payload)
  const nextSubjectId = String(payload?.subjectId ?? payload?.SubjectId ?? fallback?.subjectId ?? '')
  const nextTitle = payload?.title ?? fallback?.title ?? ''
  const nextDescription = payload?.description ?? fallback?.description ?? ''
  const nextStartDateRaw = payload?.startDate ?? payload?.StartDate
  const nextEndDateRaw = payload?.endDate ?? payload?.EndDate

  return {
    subjectId: nextSubjectId,
    goals: extractedGoals.length > 0 ? extractedGoals : (fallback?.goals ?? []),
    complexityLevel: (payload?.complexityLevel ?? payload?.ComplexityLevel ?? fallback?.complexityLevel ?? 'Beginner') as Level,
    languageSelection: normalizeLanguage(payload?.languageSelection ?? payload?.LanguageSelection ?? fallback?.languageSelection),
    title: nextTitle,
    description: nextDescription,
    startDate: nextStartDateRaw ? toDateInput(nextStartDateRaw) : (fallback?.startDate ?? ''),
    endDate: nextEndDateRaw ? toDateInput(nextEndDateRaw) : (fallback?.endDate ?? ''),
    chapters,
  }
}

export const validateDraftForm = (form: DraftFormState): string | null => {
  if (!form.subjectId) return 'Subject is required.'
  if (!form.title.trim()) return 'Title is required.'
  if (form.goals.length === 0) return 'Select at least one goal.'
  if (form.goals.length === 1 && form.goals[0].weight !== 100) return 'Single goal must have weight 100.'
  if (form.goals.length === 2 && form.goals[0].weight + form.goals[1].weight !== 100) return 'Goal weights must total 100.'
  for (const chapter of form.chapters) {
    if (!chapter.title.trim()) return 'Every chapter needs a title.'
    if (!chapter.lessons.length) return `Chapter "${chapter.title || 'Untitled'}" needs at least one lesson.`
    for (const lesson of chapter.lessons) {
      if (!lesson.title.trim()) return `Every lesson needs a title in chapter "${chapter.title || 'Untitled'}".`
    }
  }
  return null
}

export const validateAiDraftInput = (form: DraftFormState): string | null => {
  if (!form.subjectId) return 'Subject is required.'
  if (form.goals.length === 0) return 'Select at least one goal.'
  if (!form.complexityLevel) return 'Level is required.'
  if (form.languageSelection === undefined || form.languageSelection === null) return 'Language is required.'
  return null
}

export const buildPayload = (form: DraftFormState): ManualDraftPayload => ({
  subjectId: form.subjectId,
  goals: form.goals,
  complexityLevel: form.complexityLevel,
  languageSelection: form.languageSelection,
  title: form.title.trim(),
  description: form.description.trim() || undefined,
  startDate: toIsoDate(form.startDate),
  endDate: toIsoDate(form.endDate),
  chapters: form.chapters.map((chapter) => ({
    id: chapter.persistedId ?? undefined,
    chapterId: chapter.persistedId ?? undefined,
    title: chapter.title.trim(),
    content: chapter.content.trim() || undefined,
    startDate: toIsoDate(chapter.startDate),
    endDate: toIsoDate(chapter.endDate),
    estimatedDays: chapter.estimatedDays ? Number(chapter.estimatedDays) : undefined,
    tasks: chapter.tasks.map((task) => ({
      id: task.persistedId ?? undefined,
      taskId: task.persistedId ?? undefined,
      title: task.title.trim(),
      description: task.description.trim() || undefined,
      priority: task.priority.trim() || undefined,
      taskStatus: task.taskStatus.trim() || undefined,
      dueDate: toIsoDate(task.dueDate),
      taskType: task.taskType.trim() || undefined,
      quizQuestionsJson: task.quizQuestionsJson.trim() || undefined,
    })),
    lessons: chapter.lessons.map((lesson) => ({
      id: lesson.persistedId ?? undefined,
      lessonId: lesson.persistedId ?? undefined,
      title: lesson.title.trim(),
      lessonDay: toIsoDate(lesson.lessonDay),
      content: buildLessonContentFromSections(lesson.sections as Record<LessonSectionKey, string>),
      quizzes: lesson.quizzes.map((quiz) => ({
        id: quiz.persistedId ?? undefined,
        quizId: quiz.persistedId ?? undefined,
        quizzId: quiz.persistedId ?? undefined,
        title: quiz.title.trim(),
        description: quiz.description.trim() || undefined,
        quizQuestionsJson: quiz.quizQuestionsJson.trim() || undefined,
      })),
    })),
  })),
})

type SelectionSnapshot = {
  chapterId: string | null
  chapterPersistedId: string | null
  lessonId: string | null
  lessonPersistedId: string | null
  chapterIndex: number
  lessonIndex: number
}

export const createSelectionSnapshot = (
  form: DraftFormState,
  activeChapterId: string | null,
  activeLessonId: string | null,
): SelectionSnapshot => {
  const chapterIndex = Math.max(0, form.chapters.findIndex((chapter) => chapter.id === activeChapterId))
  const activeChapter = form.chapters[chapterIndex] ?? form.chapters[0] ?? null
  const lessonIndex = Math.max(0, activeChapter?.lessons.findIndex((lesson) => lesson.id === activeLessonId) ?? 0)
  const activeLesson = activeChapter?.lessons[lessonIndex] ?? activeChapter?.lessons[0] ?? null

  return {
    chapterId: activeChapter?.id ?? null,
    chapterPersistedId: activeChapter?.persistedId ?? null,
    lessonId: activeLesson?.id ?? null,
    lessonPersistedId: activeLesson?.persistedId ?? null,
    chapterIndex,
    lessonIndex,
  }
}

export const restoreSelectionSnapshot = (
  form: DraftFormState,
  snapshot: SelectionSnapshot,
): { chapterId: string | null; lessonId: string | null } => {
  const chapter = form.chapters.find((item) => item.persistedId && item.persistedId === snapshot.chapterPersistedId)
    ?? form.chapters.find((item) => item.id === snapshot.chapterId)
    ?? form.chapters[snapshot.chapterIndex]
    ?? form.chapters[0]
    ?? null

  const lesson = chapter?.lessons.find((item) => item.persistedId && item.persistedId === snapshot.lessonPersistedId)
    ?? chapter?.lessons.find((item) => item.id === snapshot.lessonId)
    ?? chapter?.lessons[snapshot.lessonIndex]
    ?? chapter?.lessons[0]
    ?? null

  return {
    chapterId: chapter?.id ?? null,
    lessonId: lesson?.id ?? null,
  }
}
