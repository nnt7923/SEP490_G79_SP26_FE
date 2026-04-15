import { LanguageSelection } from '../../../../services'
import type { ManualDraftPayload, SkeletonResponse } from '../../../../services/LearningPathService'
import { buildLessonContentFromSections, createEmptyLessonSections, parseLessonSections, type LessonSectionKey } from './lessonContentContract'
import type {
  DraftFormState,
  EditableChapter,
  EditableLesson,
  EditableMatchingPair,
  EditableQuestion,
  EditableQuiz,
  EditableTask,
  Level,
  ManualDraftVersionUpdateType,
  QuestionType,
  TaskPriority,
  TaskStatus,
  TaskType,
} from './editorTypes'

export const LEVEL_OPTIONS: Level[] = ['Beginner', 'Intermediate', 'Advanced']
export const TASK_TYPE_OPTIONS: TaskType[] = ['Practice', 'Theory', 'Quizz']
export const TASK_STATUS_OPTIONS: TaskStatus[] = ['Pending', 'InProgress', 'Completed']
export const PRIORITY_OPTIONS: TaskPriority[] = ['Low', 'Medium', 'High']
export const QUESTION_TYPE_OPTIONS: QuestionType[] = ['TrueFalse', 'MultipleChoice', 'SingleChoice', 'Matching', 'FillInTheBlank', 'Ordering']

const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`
const toDateInput = (value?: string | null) => value ? new Date(value).toISOString().slice(0, 10) : ''
const toIsoDate = (value?: string) => value ? new Date(`${value}T00:00:00.000Z`).toISOString() : undefined
const extractMarkdown = (payload: any): string => typeof payload === 'string' ? payload : payload?.content ?? payload?.markdown ?? payload?.body ?? payload?.text ?? ''

const TASK_TYPE_TO_API: Record<TaskType, number> = {
  Practice: 0,
  Theory: 1,
  Quizz: 2,
}

const TASK_PRIORITY_TO_API: Record<TaskPriority, number> = {
  Low: 1,
  Medium: 2,
  High: 3,
}

const QUESTION_TYPE_TO_API: Record<QuestionType, number> = {
  TrueFalse: 0,
  MultipleChoice: 1,
  SingleChoice: 2,
  Matching: 3,
  FillInTheBlank: 4,
  Ordering: 5,
}

const LEVEL_FROM_API: Record<number, Level> = {
  1: 'Beginner',
  2: 'Intermediate',
  3: 'Advanced',
}

const TASK_TYPE_FROM_API: Record<number, TaskType> = {
  0: 'Practice',
  1: 'Theory',
  2: 'Quizz',
}

const TASK_PRIORITY_FROM_API: Record<number, TaskPriority> = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
}

const QUESTION_TYPE_FROM_API: Record<number, QuestionType> = {
  0: 'TrueFalse',
  1: 'MultipleChoice',
  2: 'SingleChoice',
  3: 'Matching',
  4: 'FillInTheBlank',
  5: 'Ordering',
}

const CHAPTER_TITLE_PREFIX_PATTERN = /^chapter\s+\d+\s*:\s*/i

type GenericObject = Record<string, unknown>

const asObject = (value: unknown): GenericObject | null => (
  value != null && typeof value === 'object' && !Array.isArray(value)
    ? value as GenericObject
    : null
)

const parseMaybeJsonString = (value: unknown): unknown => {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) return value
  try {
    return JSON.parse(trimmed)
  } catch {
    return value
  }
}

const toPersistedId = (value: unknown): string | null => {
  if (value == null || value === '') return null
  return String(value)
}

const sanitizeStringArray = (value: unknown[] | undefined): string[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => String(item ?? '').trim())
    .filter((item) => item.length > 0)
}

const parseCommaSeparated = (value: string): string[] => (
  value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
)

const parseSelectedAnswers = (correctAnswer: string, options: string[], fallback: string[] = []): string[] => {
  const normalizedOptions = sanitizeStringArray(options)
  const matchedOptions = normalizedOptions.filter((option) => correctAnswer.includes(option))
  if (matchedOptions.length > 0) return matchedOptions

  const parsedAnswers = parseCommaSeparated(correctAnswer)
  return parsedAnswers.length > 0 ? parsedAnswers : fallback
}

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

export const normalizeJsonField = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (value == null || value === '') return ''
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const QUIZ_ARRAY_KEYS = ['quizzes', 'Quizzes', 'quizDtos', 'QuizDtos', 'quizList', 'QuizList', 'items', 'Items'] as const
const QUIZ_WRAPPER_KEYS = ['value', 'Value', 'data', 'Data', 'result', 'Result', 'payload', 'Payload', 'quizSkeleton', 'QuizSkeleton'] as const
const QUESTION_ARRAY_KEYS = ['questions', 'Questions', 'questionDtos', 'QuestionDtos', 'quizQuestions', 'QuizQuestions', 'items', 'Items'] as const
const QUESTION_WRAPPER_KEYS = ['value', 'Value', 'data', 'Data', 'result', 'Result', 'payload', 'Payload', 'quizQuestionsJson', 'QuizQuestionsJson'] as const

const unwrapQuizPayloadCandidates = (payload: unknown): unknown[] => {
  const parsedPayload = parseMaybeJsonString(payload)
  const payloadObject = asObject(parsedPayload)
  return [
    parsedPayload,
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
  const parsedPayload = parseMaybeJsonString(payload)
  if (depth > 5 || parsedPayload == null) return { quizItems: [], hasQuizArray: false }
  if (typeof parsedPayload === 'object') {
    if (visited.has(parsedPayload)) return { quizItems: [], hasQuizArray: false }
    visited.add(parsedPayload)
  }

  if (Array.isArray(parsedPayload)) {
    if (parsedPayload.length === 0) return { quizItems: parsedPayload, hasQuizArray: true }
    if (parsedPayload.some((item) => isQuizItemLike(item))) {
      return { quizItems: parsedPayload, hasQuizArray: true }
    }
    for (const item of parsedPayload) {
      const nested = findNestedQuizItems(item, visited, depth + 1)
      if (nested.hasQuizArray) return nested
    }
    return { quizItems: [], hasQuizArray: false }
  }

  const payloadObject = asObject(parsedPayload)
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
    const parsedCandidate = parseMaybeJsonString(candidate)
    if (Array.isArray(parsedCandidate)) {
      return {
        quizItems: parsedCandidate,
        hasQuizArray: true,
      }
    }

    const candidateObject = asObject(parsedCandidate)
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

const isQuestionItemLike = (value: unknown): boolean => {
  const parsedValue = parseMaybeJsonString(value)
  if (typeof parsedValue === 'string') return parsedValue.trim().length > 0
  const valueObject = asObject(parsedValue)
  if (!valueObject) return false

  return [
    valueObject.id,
    valueObject.questionId,
    valueObject.QuestionId,
    valueObject.questionText,
    valueObject.QuestionText,
    valueObject.correctAnswer,
    valueObject.CorrectAnswer,
    valueObject.points,
    valueObject.Points,
  ].some((item) => item != null && String(item).trim() !== '')
}

const unwrapQuestionPayloadCandidates = (payload: unknown): unknown[] => {
  const parsedPayload = parseMaybeJsonString(payload)
  const payloadObject = asObject(parsedPayload)

  return [
    parsedPayload,
    payloadObject?.questions,
    payloadObject?.Questions,
    payloadObject?.quizQuestions,
    payloadObject?.QuizQuestions,
    payloadObject?.quizQuestionsJson,
    payloadObject?.QuizQuestionsJson,
    ...QUESTION_WRAPPER_KEYS.map((key) => payloadObject?.[key]),
  ]
}

const findNestedQuestionItems = (
  payload: unknown,
  visited = new Set<unknown>(),
  depth = 0,
): { questionItems: unknown[]; hasQuestionArray: boolean } => {
  const parsedPayload = parseMaybeJsonString(payload)
  if (depth > 6 || parsedPayload == null) return { questionItems: [], hasQuestionArray: false }
  if (typeof parsedPayload === 'object') {
    if (visited.has(parsedPayload)) return { questionItems: [], hasQuestionArray: false }
    visited.add(parsedPayload)
  }

  if (Array.isArray(parsedPayload)) {
    if (parsedPayload.length === 0) return { questionItems: parsedPayload, hasQuestionArray: true }
    if (parsedPayload.some((item) => isQuestionItemLike(item))) {
      return { questionItems: parsedPayload, hasQuestionArray: true }
    }
    for (const item of parsedPayload) {
      const nested = findNestedQuestionItems(item, visited, depth + 1)
      if (nested.hasQuestionArray) return nested
    }
    return { questionItems: [], hasQuestionArray: false }
  }

  const payloadObject = asObject(parsedPayload)
  if (!payloadObject) return { questionItems: [], hasQuestionArray: false }

  const directQuestionItems = pickArray(...QUESTION_ARRAY_KEYS.map((key) => payloadObject[key]))
  const hasDirectQuestionArray = QUESTION_ARRAY_KEYS.some((key) => Array.isArray(payloadObject[key]))
  if (hasDirectQuestionArray) {
    return {
      questionItems: directQuestionItems,
      hasQuestionArray: true,
    }
  }

  for (const key of QUESTION_WRAPPER_KEYS) {
    const nested = findNestedQuestionItems(payloadObject[key], visited, depth + 1)
    if (nested.hasQuestionArray) return nested
  }

  for (const value of Object.values(payloadObject)) {
    const nested = findNestedQuestionItems(value, visited, depth + 1)
    if (nested.hasQuestionArray) return nested
  }

  return { questionItems: [], hasQuestionArray: false }
}

type QuestionCollectionParseResult = {
  items: EditableQuestion[]
  hasQuestionArray: boolean
  rawItemCount: number
}

const extractQuestionItems = (payload: unknown): { questionItems: unknown[]; hasQuestionArray: boolean } => {
  const candidates = unwrapQuestionPayloadCandidates(payload)

  for (const candidate of candidates) {
    const parsedCandidate = parseMaybeJsonString(candidate)
    if (Array.isArray(parsedCandidate)) {
      return {
        questionItems: parsedCandidate,
        hasQuestionArray: true,
      }
    }

    const candidateObject = asObject(parsedCandidate)
    if (!candidateObject) continue

    const nestedQuestionItems = pickArray(...QUESTION_ARRAY_KEYS.map((key) => candidateObject[key]))
    const hasNestedQuestionArray = QUESTION_ARRAY_KEYS.some((key) => Array.isArray(candidateObject[key]))
    if (hasNestedQuestionArray) {
      return {
        questionItems: nestedQuestionItems,
        hasQuestionArray: true,
      }
    }
  }

  return findNestedQuestionItems(payload)
}

export const normalizeTaskType = (value: unknown): TaskType => {
  if (typeof value === 'number' && value in TASK_TYPE_FROM_API) return TASK_TYPE_FROM_API[value]
  const trimmed = String(value ?? '').trim()
  if (trimmed && Number.isFinite(Number(trimmed)) && Number(trimmed) in TASK_TYPE_FROM_API) {
    return TASK_TYPE_FROM_API[Number(trimmed)]
  }
  if (trimmed === 'Quiz') return 'Quizz'
  return TASK_TYPE_OPTIONS.includes(trimmed as TaskType) ? trimmed as TaskType : 'Practice'
}

export const normalizeTaskPriority = (value: unknown): TaskPriority | '' => {
  if (value == null || value === '') return ''
  if (typeof value === 'number' && value in TASK_PRIORITY_FROM_API) return TASK_PRIORITY_FROM_API[value]
  const trimmed = String(value ?? '').trim()
  if (trimmed && Number.isFinite(Number(trimmed)) && Number(trimmed) in TASK_PRIORITY_FROM_API) {
    return TASK_PRIORITY_FROM_API[Number(trimmed)]
  }
  return PRIORITY_OPTIONS.includes(trimmed as TaskPriority) ? trimmed as TaskPriority : ''
}

export const normalizeTaskStatus = (value: unknown): TaskStatus => {
  if (value === 0 || String(value).trim() === '0') return 'Pending'
  if (value === 1 || String(value).trim() === '1') return 'InProgress'
  if (value === 2 || String(value).trim() === '2') return 'Completed'
  const normalized = String(value ?? '').trim()
  return TASK_STATUS_OPTIONS.includes(normalized as TaskStatus) ? normalized as TaskStatus : 'Pending'
}

export const normalizeQuestionType = (value: unknown): QuestionType => {
  if (typeof value === 'number' && value in QUESTION_TYPE_FROM_API) return QUESTION_TYPE_FROM_API[value]
  const trimmed = String(value ?? '').trim()
  if (trimmed && Number.isFinite(Number(trimmed)) && Number(trimmed) in QUESTION_TYPE_FROM_API) {
    return QUESTION_TYPE_FROM_API[Number(trimmed)]
  }
  return QUESTION_TYPE_OPTIONS.includes(trimmed as QuestionType) ? trimmed as QuestionType : 'SingleChoice'
}

const normalizeLevel = (value: unknown): Level => {
  if (typeof value === 'number' && value in LEVEL_FROM_API) return LEVEL_FROM_API[value]
  const trimmed = String(value ?? '').trim()
  if (trimmed && Number.isFinite(Number(trimmed)) && Number(trimmed) in LEVEL_FROM_API) {
    return LEVEL_FROM_API[Number(trimmed)]
  }
  return LEVEL_OPTIONS.includes(trimmed as Level) ? trimmed as Level : 'Beginner'
}

const normalizeLanguage = (value: unknown) =>
  value === 'English'
    ? LanguageSelection.English
    : value === 'VietNamese' || value === 'Vietnamese'
      ? LanguageSelection.Vietnamese
      : typeof value === 'number'
        ? value
        : LanguageSelection.Vietnamese

const normalizeGoalWeightValue = (value: unknown) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 100
  const normalized = numeric >= 0 && numeric <= 1 ? numeric * 100 : numeric
  return Math.max(0, Math.min(100, Math.round(normalized)))
}

const normalizePointsString = (value: unknown): string => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return '1'
  return String(numeric)
}

const stripChapterTitlePrefix = (value: string): string => value.replace(CHAPTER_TITLE_PREFIX_PATTERN, '').trim()

const formatChapterTitleForSave = (value: string, index: number): string => {
  const normalized = stripChapterTitlePrefix(value)
  if (!normalized) return ''
  return `Chapter ${index + 1}: ${normalized}`
}

const serializeLanguageSelection = (value: number): 'VietNamese' | 'English' => (
  value === LanguageSelection.English ? 'English' : 'VietNamese'
)

const buildTodayIsoDate = (): string => {
  const today = new Date().toISOString().slice(0, 10)
  return new Date(`${today}T00:00:00.000Z`).toISOString()
}

const createMatchingPairs = (entries: string[], fallback: EditableMatchingPair[] = []): EditableMatchingPair[] => {
  const pairs = entries
    .map((entry) => String(entry ?? ''))
    .map((entry, index) => {
      const separatorIndex = entry.indexOf('::')
      const left = separatorIndex >= 0 ? entry.slice(0, separatorIndex).trim() : entry.trim()
      const right = separatorIndex >= 0 ? entry.slice(separatorIndex + 2).trim() : ''
      const fallbackPair = fallback[index]

      return {
        id: fallbackPair?.id ?? uid('pair'),
        left: left || fallbackPair?.left || '',
        right: right || fallbackPair?.right || '',
      }
    })
    .filter((pair) => pair.left || pair.right)

  if (pairs.length > 0) return pairs
  return fallback
}

const serializeMatchingPair = (pair: Pick<EditableMatchingPair, 'left' | 'right'>): string => `${pair.left.trim()}::${pair.right.trim()}`

export const emptyMatchingPair = (): EditableMatchingPair => ({ id: uid('pair'), left: '', right: '' })

export const emptyQuestion = (type: QuestionType = 'SingleChoice'): EditableQuestion => ({
  id: uid('question'),
  persistedId: null,
  questionText: '',
  type,
  options: type === 'TrueFalse' ? ['True', 'False'] : [],
  correctAnswer: type === 'TrueFalse' ? 'True' : '',
  points: '1',
  selectedAnswers: [],
  matchingPairs: [],
  orderingSequence: [],
})

const withNormalizedQuestionTypeState = (question: EditableQuestion): EditableQuestion => {
  if (question.type === 'TrueFalse') {
    return {
      ...question,
      options: ['True', 'False'],
      selectedAnswers: [],
      matchingPairs: [],
      orderingSequence: [],
      correctAnswer: question.correctAnswer === 'False' ? 'False' : 'True',
    }
  }

  if (question.type === 'MultipleChoice') {
    return {
      ...question,
      matchingPairs: [],
      orderingSequence: [],
    }
  }

  if (question.type === 'SingleChoice') {
    return {
      ...question,
      selectedAnswers: [],
      matchingPairs: [],
      orderingSequence: [],
    }
  }

  if (question.type === 'Matching') {
    return {
      ...question,
      selectedAnswers: [],
      orderingSequence: [],
      options: question.options,
    }
  }

  if (question.type === 'FillInTheBlank') {
    return {
      ...question,
      options: [],
      selectedAnswers: [],
      matchingPairs: [],
      orderingSequence: [],
    }
  }

  return {
    ...question,
    selectedAnswers: [],
    matchingPairs: [],
  }
}

const hydrateQuestion = (question: unknown, fallback?: EditableQuestion): EditableQuestion => {
  const parsedQuestion = parseMaybeJsonString(question)
  const questionObject = asObject(parsedQuestion)
  const questionPersistedId = toPersistedId(questionObject?.id ?? questionObject?.questionId ?? questionObject?.QuestionId)
  const type = normalizeQuestionType(questionObject?.type ?? questionObject?.Type ?? fallback?.type)
  const rawOptions = sanitizeStringArray(pickOptionalArray(questionObject?.options, questionObject?.Options) ?? fallback?.options)
  const correctAnswer = String(questionObject?.correctAnswer ?? questionObject?.CorrectAnswer ?? fallback?.correctAnswer ?? '')
  const baseQuestion: EditableQuestion = {
    id: String(questionPersistedId ?? fallback?.id ?? uid('question')),
    persistedId: questionPersistedId ?? fallback?.persistedId ?? null,
    questionText: String(questionObject?.questionText ?? questionObject?.QuestionText ?? fallback?.questionText ?? ''),
    type,
    options: type === 'TrueFalse' ? ['True', 'False'] : rawOptions,
    correctAnswer,
    points: normalizePointsString(questionObject?.points ?? questionObject?.Points ?? fallback?.points),
    selectedAnswers: type === 'MultipleChoice'
      ? parseSelectedAnswers(correctAnswer, rawOptions, fallback?.selectedAnswers ?? [])
      : [],
    matchingPairs: type === 'Matching'
      ? createMatchingPairs(
        parseCommaSeparated(correctAnswer).length > 0
          ? parseCommaSeparated(correctAnswer)
          : rawOptions,
        fallback?.matchingPairs,
      )
      : [],
    orderingSequence: type === 'Ordering'
      ? (parseCommaSeparated(correctAnswer).length > 0 ? parseCommaSeparated(correctAnswer) : (fallback?.orderingSequence ?? []))
      : [],
  }

  return withNormalizedQuestionTypeState(baseQuestion)
}

const parseQuestionCollection = (payload: unknown): QuestionCollectionParseResult => {
  const { questionItems, hasQuestionArray } = extractQuestionItems(payload)
  const items = questionItems.map((item) => hydrateQuestion(item))

  return {
    items,
    hasQuestionArray,
    rawItemCount: questionItems.length,
  }
}

export const parseGeneratedQuizQuestionsPayload = (payload: unknown): QuestionCollectionParseResult => parseQuestionCollection(payload)

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
      dueDate: matchedQuiz?.dueDate ?? '',
      questions: matchedQuiz?.questions ?? [],
    }
  })

  const remaining = existingQuizzes.filter((quiz) => !usedQuizIds.has(quiz.id))
  return [...merged, ...remaining]
}

export const emptyQuiz = (): EditableQuiz => ({ id: uid('quiz'), persistedId: null, title: '', description: '', dueDate: '', questions: [] })
export const emptyTask = (): EditableTask => ({ id: uid('task'), persistedId: null, title: '', description: '', priority: '', taskStatus: 'Pending', dueDate: '', taskType: 'Practice', quizQuestionsJson: '' })
export const emptyLesson = (): EditableLesson => ({ id: uid('lesson'), persistedId: null, title: '', lessonDay: '', sections: createEmptyLessonSections(), quizzes: [] })
export const emptyChapter = (): EditableChapter => ({ id: uid('chapter'), persistedId: null, title: '', content: '', startDate: '', endDate: '', estimatedDays: '', lessons: [], tasks: [] })
export const emptyForm = (): DraftFormState => ({
  subjectId: '',
  goals: [],
  complexityLevel: 'Beginner',
  languageSelection: LanguageSelection.Vietnamese,
  version: null,
  title: '',
  description: '',
  startDate: '',
  endDate: '',
  chapters: [emptyChapter()],
})

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

const hydrateQuiz = (quiz: any, fallbackQuiz?: EditableQuiz): EditableQuiz => {
  const quizPersistedId = toPersistedId(quiz?.id ?? quiz?.quizId ?? quiz?.quizzId ?? quiz?.QuizId ?? quiz?.QuizzId)
  const parsedQuestions = parseQuestionCollection(quiz)

  return {
    id: String(quizPersistedId ?? fallbackQuiz?.id ?? uid('quiz')),
    persistedId: quizPersistedId ?? fallbackQuiz?.persistedId ?? null,
    title: String(quiz?.title ?? quiz?.Title ?? fallbackQuiz?.title ?? ''),
    description: String(quiz?.description ?? quiz?.Description ?? fallbackQuiz?.description ?? ''),
    dueDate: toDateInput(quiz?.dueDate ?? quiz?.DueDate ?? fallbackQuiz?.dueDate),
    questions: parsedQuestions.hasQuestionArray ? parsedQuestions.items : (fallbackQuiz?.questions ?? []),
  }
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
                return hydrateQuiz(quiz, fallbackQuiz)
              })
              : (fallbackLesson?.quizzes ?? []),
          }
        })
        : (fallbackChapter?.lessons ?? [])

      return {
        id: String(chapter?.id ?? chapter?.chapterId ?? fallbackChapter?.id ?? uid('chapter')),
        persistedId: chapter?.id != null || chapter?.chapterId != null ? String(chapter?.id ?? chapter?.chapterId) : (fallbackChapter?.persistedId ?? null),
        title: stripChapterTitlePrefix(chapter?.title ?? fallbackChapter?.title ?? ''),
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
          priority: normalizeTaskPriority(task?.priority ?? task?.Priority),
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
  const rawVersion = payload?.version ?? payload?.Version ?? payload?.versionNumber ?? payload?.VersionNumber ?? fallback?.version
  const parsedVersion = Number(rawVersion)

  return {
    subjectId: nextSubjectId,
    goals: extractedGoals.length > 0 ? extractedGoals : (fallback?.goals ?? []),
    complexityLevel: normalizeLevel(payload?.complexityLevel ?? payload?.ComplexityLevel ?? fallback?.complexityLevel),
    languageSelection: normalizeLanguage(payload?.languageSelection ?? payload?.LanguageSelection ?? fallback?.languageSelection),
    version: Number.isFinite(parsedVersion) && parsedVersion > 0 ? parsedVersion : (fallback?.version ?? null),
    title: nextTitle,
    description: nextDescription,
    startDate: nextStartDateRaw ? toDateInput(nextStartDateRaw) : (fallback?.startDate ?? ''),
    endDate: nextEndDateRaw ? toDateInput(nextEndDateRaw) : (fallback?.endDate ?? ''),
    chapters,
  }
}

const isValidQuestionType = (value: string): value is QuestionType => QUESTION_TYPE_OPTIONS.includes(value as QuestionType)

export const validateDraftForm = (form: DraftFormState): string | null => {
  if (!form.subjectId) return 'Subject is required.'
  if (!form.title.trim()) return 'Title is required.'
  if (form.goals.length === 0) return 'Select at least one goal.'
  if (form.goals.length === 1 && form.goals[0].weight !== 100) return 'Single goal must have weight 100.'
  if (form.goals.length === 2 && form.goals[0].weight + form.goals[1].weight !== 100) return 'Goal weights must total 100.'
  if (!form.startDate) return 'Start date is required.'
  if (!form.endDate) return 'End date is required.'
  if (!LEVEL_OPTIONS.includes(form.complexityLevel)) return 'Level is required.'
  if (!Object.values(LanguageSelection).includes(form.languageSelection as (typeof LanguageSelection)[keyof typeof LanguageSelection])) {
    return 'Language is required.'
  }

  for (const chapter of form.chapters) {
    const chapterTitle = chapter.title.trim()
    if (chapterTitle && chapterTitle.length > 200) return `Chapter title must be 200 characters or fewer in chapter "${chapterTitle}".`

    for (const task of chapter.tasks) {
      const taskTitle = task.title.trim()
      if (taskTitle && taskTitle.length > 200) return `Task title must be 200 characters or fewer in chapter "${chapterTitle || 'Untitled'}".`
      if (task.taskType && !TASK_TYPE_OPTIONS.includes(task.taskType)) return `Task type is invalid for task "${taskTitle || 'Untitled'}".`
    }

    for (const lesson of chapter.lessons) {
      const lessonTitle = lesson.title.trim()
      if (lessonTitle && lessonTitle.length > 200) return `Lesson title must be 200 characters or fewer in chapter "${chapterTitle || 'Untitled'}".`

      for (const quiz of lesson.quizzes) {
        const quizTitle = quiz.title.trim()
        if (quizTitle && quizTitle.length > 200) return `Quiz title must be 200 characters or fewer in lesson "${lessonTitle || 'Untitled'}".`

        for (const question of quiz.questions) {
          const questionText = question.questionText.trim()
          if (questionText && questionText.length > 2000) return `Question text must be 2000 characters or fewer in quiz "${quizTitle || 'Untitled'}".`
          if (question.type && !isValidQuestionType(question.type)) return `Question type is invalid in quiz "${quizTitle || 'Untitled'}".`

          const normalizedPoints = String(question.points ?? '').trim()
          if (normalizedPoints) {
            const points = Number(normalizedPoints)
            if (!Number.isFinite(points) || points <= 0) {
              return `Question points must be greater than 0 in quiz "${quizTitle || 'Untitled'}".`
            }
          }
        }
      }
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

const serializeQuestion = (question: EditableQuestion) => {
  const questionText = question.questionText.trim()
  const points = Number(question.points)
  const normalizedPoints = Number.isFinite(points) && points > 0 ? points : 1

  if (question.type === 'TrueFalse') {
    return {
      id: question.persistedId ?? undefined,
      questionId: question.persistedId ?? undefined,
      questionText,
      type: QUESTION_TYPE_TO_API[question.type],
      options: ['True', 'False'],
      correctAnswer: question.correctAnswer.trim() === 'False' ? 'False' : 'True',
      points: normalizedPoints,
    }
  }

  if (question.type === 'MultipleChoice') {
    return {
      id: question.persistedId ?? undefined,
      questionId: question.persistedId ?? undefined,
      questionText,
      type: QUESTION_TYPE_TO_API[question.type],
      options: sanitizeStringArray(question.options),
      correctAnswer: sanitizeStringArray(question.selectedAnswers).join(', '),
      points: normalizedPoints,
    }
  }

  if (question.type === 'SingleChoice') {
    return {
      id: question.persistedId ?? undefined,
      questionId: question.persistedId ?? undefined,
      questionText,
      type: QUESTION_TYPE_TO_API[question.type],
      options: sanitizeStringArray(question.options),
      correctAnswer: question.correctAnswer.trim(),
      points: normalizedPoints,
    }
  }

  if (question.type === 'Matching') {
    const validPairs = question.matchingPairs
      .filter((pair) => pair.left.trim() && pair.right.trim())
      .map((pair) => ({ left: pair.left.trim(), right: pair.right.trim() }))
    const serializedPairs = validPairs.map((pair) => serializeMatchingPair(pair))

    return {
      id: question.persistedId ?? undefined,
      questionId: question.persistedId ?? undefined,
      questionText,
      type: QUESTION_TYPE_TO_API[question.type],
      options: serializedPairs,
      correctAnswer: serializedPairs.join(','),
      points: normalizedPoints,
    }
  }

  if (question.type === 'FillInTheBlank') {
    return {
      id: question.persistedId ?? undefined,
      questionId: question.persistedId ?? undefined,
      questionText,
      type: QUESTION_TYPE_TO_API[question.type],
      options: [],
      correctAnswer: question.correctAnswer.trim(),
      points: normalizedPoints,
    }
  }

  return {
    id: question.persistedId ?? undefined,
    questionId: question.persistedId ?? undefined,
    questionText,
    type: QUESTION_TYPE_TO_API[question.type],
    options: sanitizeStringArray(question.options),
    correctAnswer: sanitizeStringArray(question.orderingSequence).join(','),
    points: normalizedPoints,
  }
}

const serializeLessonContent = (sections: Record<LessonSectionKey, string>): string | null => {
  const hasManualContent = Object.values(sections).some((section) => section.trim().length > 0)
  if (!hasManualContent) return null
  return buildLessonContentFromSections(sections)
}

export const buildPayload = (
  form: DraftFormState,
  versionOptions?: {
    increaseVersion: boolean
    versionUpdateType: ManualDraftVersionUpdateType | null
  },
): ManualDraftPayload => ({
  ...(versionOptions
    ? {
      increaseVersion: versionOptions.increaseVersion,
      versionUpdateType: versionOptions.increaseVersion ? versionOptions.versionUpdateType : null,
    }
    : {}),
  subjectId: form.subjectId,
  goals: form.goals.map((goal) => ({
    goalId: goal.goalId,
    weight: goal.weight,
  })),
  complexityLevel: form.complexityLevel,
  languageSelection: serializeLanguageSelection(form.languageSelection),
  title: form.title.trim(),
  description: form.description.trim() || null,
  startDate: toIsoDate(form.startDate) ?? null,
  endDate: toIsoDate(form.endDate) ?? null,
  // Keep full snapshot semantics so backend can decide how to ignore fully empty draft nodes.
  chapters: form.chapters.map((chapter, chapterIndex) => {
    const chapterStartDate = toIsoDate(chapter.startDate) ?? null

    return {
      id: chapter.persistedId ?? undefined,
      chapterId: chapter.persistedId ?? undefined,
      title: formatChapterTitleForSave(chapter.title, chapterIndex),
      content: chapter.content.trim() || null,
      startDate: chapterStartDate,
      endDate: toIsoDate(chapter.endDate) ?? null,
      estimatedDays: chapter.estimatedDays.trim() ? Number(chapter.estimatedDays) : null,
      lessons: chapter.lessons.map((lesson) => ({
        id: lesson.persistedId ?? undefined,
        lessonId: lesson.persistedId ?? undefined,
        title: lesson.title.trim(),
        lessonDay: toIsoDate(lesson.lessonDay) ?? chapterStartDate ?? buildTodayIsoDate(),
        content: serializeLessonContent(lesson.sections),
        quizzes: lesson.quizzes.map((quiz) => ({
          id: quiz.persistedId ?? undefined,
          quizId: quiz.persistedId ?? undefined,
          quizzId: quiz.persistedId ?? undefined,
          title: quiz.title.trim(),
          description: quiz.description.trim() || null,
          dueDate: toIsoDate(quiz.dueDate) ?? null,
          questions: quiz.questions.map((question) => serializeQuestion(question)),
        })),
      })),
      tasks: chapter.tasks.map((task) => ({
        id: task.persistedId ?? undefined,
        taskId: task.persistedId ?? undefined,
        title: task.title.trim(),
        description: task.description.trim() || null,
        priority: task.priority ? TASK_PRIORITY_TO_API[task.priority] : null,
        taskStatus: task.taskStatus,
        dueDate: toIsoDate(task.dueDate) ?? null,
        taskType: TASK_TYPE_TO_API[task.taskType],
        quizQuestionsJson: task.quizQuestionsJson.trim() || null,
      })),
    }
  }),
})

export type SelectionSnapshot = {
  activeChapterPersistedId: string | null
  activeChapterId: string | null
  activeLessonPersistedId: string | null
  activeLessonId: string | null
}

export const createSelectionSnapshot = (
  form: DraftFormState,
  activeChapterId: string | null,
  activeLessonId: string | null,
): SelectionSnapshot => {
  const activeChapter = form.chapters.find((chapter) => chapter.id === activeChapterId) ?? null
  const activeLesson = activeChapter?.lessons.find((lesson) => lesson.id === activeLessonId) ?? null

  return {
    activeChapterPersistedId: activeChapter?.persistedId ?? null,
    activeChapterId: activeChapter?.id ?? activeChapterId ?? null,
    activeLessonPersistedId: activeLesson?.persistedId ?? null,
    activeLessonId: activeLesson?.id ?? activeLessonId ?? null,
  }
}

export const restoreSelectionSnapshot = (
  form: DraftFormState,
  snapshot: SelectionSnapshot,
): { chapterId: string | null; lessonId: string | null } => {
  const matchedChapter = (snapshot.activeChapterPersistedId
    ? form.chapters.find((chapter) => chapter.persistedId === snapshot.activeChapterPersistedId)
    : undefined)
    ?? (snapshot.activeChapterId ? form.chapters.find((chapter) => chapter.id === snapshot.activeChapterId) : undefined)
    ?? form.chapters[0]
    ?? null

  const matchedLesson = (snapshot.activeLessonPersistedId
    ? matchedChapter?.lessons.find((lesson) => lesson.persistedId === snapshot.activeLessonPersistedId)
    : undefined)
    ?? (snapshot.activeLessonId ? matchedChapter?.lessons.find((lesson) => lesson.id === snapshot.activeLessonId) : undefined)
    ?? matchedChapter?.lessons[0]
    ?? null

  return {
    chapterId: matchedChapter?.id ?? null,
    lessonId: matchedLesson?.id ?? null,
  }
}
