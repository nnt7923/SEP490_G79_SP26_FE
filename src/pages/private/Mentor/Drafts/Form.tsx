import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../../../../components/Layout'
import Toast from '../../../../components/Toast'
import ROUTER from '../../../../router/ROUTER'
import { SubjectService } from '../../../../services'
import LearningPathService, { type SkeletonResponse, resolveMentorReviewError } from '../../../../services/LearningPathService'
import { useMentorSidebarConfig } from '../components/MentorSideBar'
import ShareLearningPathModal from '../../../../components/Chat/ShareLearningPathModal'
import { createOrGetConversation, getContacts } from '../../../../services/DirectChatService'
import { shareToStudent } from '../../../../services/LearningPathShareService'
import { resolveShareToStudentErrorMessage } from '../../../../services/LearningPathShareService/shareErrorMessage'
import { useResponsive } from '../../../../hook/useResponsive'
import OverviewStep from './components/OverviewStep'
import ChaptersStep from './components/ChaptersStep'
import LessonStudioStep from './components/LessonStudioStep'
import AssessmentsStep from './components/AssessmentsStep'
import { ContentNavigator, DraftEditorHeader } from './components/EditorChrome'
import VersionUpdateModal from './components/VersionUpdateModal'
import PublishModal from './components/PublishModal'
import { cardStyle, shellStyle } from './components/editorUi'
import { buildLessonContentFromSections, parseLessonSections, type LessonSectionKey } from './lessonContentContract'
import {
  LEVEL_OPTIONS,
  buildPayload,
  createSelectionSnapshot,
  emptyChapter,
  emptyLesson,
  emptyQuestion,
  emptyQuiz,
  emptyTask,
  hydrateDraftForm,
  normalizeJsonField,
  parseGeneratedQuizQuestionsPayload,
  normalizeTaskPriority,
  normalizeTaskStatus,
  normalizeTaskType,
  parseQuizSkeletonPayload,
  restoreSelectionSnapshot,
  validateAiDraftInput,
  validateDraftForm,
} from './editorState'
import { resolveDraftUpdateSuccessMessage } from './saveDraftMessage'
import type {
  AssessmentTab,
  DraftFormState,
  EditableChapter,
  EditableLesson,
  EditableQuiz,
  EditableTask,
  EditorStep,
  ManualDraftVersionUpdateType,
  QuestionType,
  SubjectOption,
  ToastState,
} from './editorTypes'

const getApiErrorMessage = (err: any, fallback: string) =>
  err?.response?.data?.message
  || err?.response?.data?.errorMessage
  || err?.ErrorMessage
  || err?.errorMessage
  || err?.message
  || fallback

const TASK_TYPE_TO_SIGNALR: Record<EditableTask['taskType'], 0 | 1 | 2> = {
  Practice: 0,
  Theory: 1,
  Quizz: 2,
}

const QUESTION_TYPE_TO_SIGNALR: Record<QuestionType, 0 | 1 | 2 | 3 | 4 | 5> = {
  TrueFalse: 0,
  MultipleChoice: 1,
  SingleChoice: 2,
  Matching: 3,
  FillInTheBlank: 4,
  Ordering: 5,
}

const toPersistedId = (value: unknown): string | null => {
  if (value == null || value === '') return null
  return String(value)
}

const isSameIdentifier = (left: string, right: string): boolean => left.trim().toLowerCase() === right.trim().toLowerCase()

const parseMaybeJsonValue = (value: unknown): unknown => {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) return value
  try {
    return JSON.parse(trimmed)
  } catch {
    return value
  }
}

const asObject = (value: unknown): Record<string, unknown> | null => {
  if (value != null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

const extractSingleTaskPayload = (payload: unknown): Record<string, unknown> | null => {
  const unwrapKeys = [
    'value', 'Value',
    'data', 'Data',
    'result', 'Result',
    'payload', 'Payload',
    'task', 'Task',
    'taskItem', 'TaskItem',
    'taskDto', 'TaskDto',
    'taskItemDto', 'TaskItemDto',
    'singleTask', 'SingleTask',
  ] as const

  const visited = new Set<unknown>()
  const queue: unknown[] = [payload]

  while (queue.length > 0) {
    const current = parseMaybeJsonValue(queue.shift())
    if (current == null) continue
    if (typeof current === 'object') {
      if (visited.has(current)) continue
      visited.add(current)
    }

    if (Array.isArray(current)) {
      for (const item of current) queue.push(item)
      continue
    }

    const currentObject = asObject(current)
    if (!currentObject) continue

    const hasTaskFields = [
      currentObject.taskId,
      currentObject.TaskId,
      currentObject.id,
      currentObject.Id,
      currentObject.title,
      currentObject.Title,
      currentObject.description,
      currentObject.Description,
      currentObject.taskType,
      currentObject.TaskType,
      currentObject.priority,
      currentObject.Priority,
      currentObject.taskStatus,
      currentObject.TaskStatus,
      currentObject.quizQuestionsJson,
      currentObject.QuizQuestionsJson,
      currentObject.quizQuestions,
      currentObject.QuizQuestions,
    ].some((value) => value != null)

    if (hasTaskFields) return currentObject

    for (const key of unwrapKeys) {
      if (key in currentObject) queue.push(currentObject[key])
    }
  }

  return null
}

const extractSingleQuizSkeletonPayload = (
  payload: unknown,
): { persistedId: string | null; title: string; description: string } | null => {
  const parsedQuizSkeleton = parseQuizSkeletonPayload(payload)
  if (parsedQuizSkeleton.hasQuizArray && parsedQuizSkeleton.items.length > 0) {
    const firstItem = parsedQuizSkeleton.items[0]
    return {
      persistedId: firstItem.persistedId,
      title: firstItem.title.trim(),
      description: firstItem.description.trim(),
    }
  }

  const unwrapKeys = [
    'value', 'Value',
    'data', 'Data',
    'result', 'Result',
    'payload', 'Payload',
    'quiz', 'Quiz',
    'singleQuizSkeleton', 'SingleQuizSkeleton',
    'quizSkeleton', 'QuizSkeleton',
    'quizzes', 'Quizzes',
    'items', 'Items',
  ] as const

  const visited = new Set<unknown>()
  const queue: unknown[] = [payload]

  while (queue.length > 0) {
    const current = parseMaybeJsonValue(queue.shift())
    if (current == null) continue

    if (typeof current === 'object') {
      if (visited.has(current)) continue
      visited.add(current)
    }

    if (Array.isArray(current)) {
      for (const item of current) queue.push(item)
      continue
    }

    const currentObject = asObject(current)
    if (!currentObject) continue

    const title = String(currentObject.title ?? currentObject.Title ?? '').trim()
    const description = String(currentObject.description ?? currentObject.Description ?? '').trim()
    const hasQuizIdentity = currentObject.quizId != null
      || currentObject.QuizId != null
      || currentObject.quizzId != null
      || currentObject.QuizzId != null
      || currentObject.id != null
      || currentObject.Id != null

    if (title || description || hasQuizIdentity) {
      return {
        persistedId: toPersistedId(
          currentObject.quizId
          ?? currentObject.QuizId
          ?? currentObject.quizzId
          ?? currentObject.QuizzId
          ?? currentObject.id
          ?? currentObject.Id,
        ),
        title,
        description,
      }
    }

    for (const key of unwrapKeys) {
      if (key in currentObject) queue.push(currentObject[key])
    }
  }

  return null
}

const extractSingleQuizQuestionPayload = (
  payload: unknown,
): {
  quizPersistedId: string | null
  question: EditableQuiz['questions'][number]
  hasExplicitType: boolean
} | null => {
  const unwrapKeys = [
    'value', 'Value',
    'data', 'Data',
    'result', 'Result',
    'payload', 'Payload',
    'singleQuizQuestion', 'SingleQuizQuestion',
    'question', 'Question',
    'questionDto', 'QuestionDto',
  ] as const

  const visited = new Set<unknown>()
  const queue: unknown[] = [payload]

  while (queue.length > 0) {
    const current = parseMaybeJsonValue(queue.shift())
    if (current == null) continue

    if (typeof current === 'object') {
      if (visited.has(current)) continue
      visited.add(current)
    }

    if (Array.isArray(current)) {
      for (const item of current) queue.push(item)
      continue
    }

    const currentObject = asObject(current)
    if (!currentObject) continue

    const questionCandidates: unknown[] = [
      currentObject.question,
      currentObject.Question,
      currentObject.questionDto,
      currentObject.QuestionDto,
    ]

    const hasStandaloneQuestionShape = [
      currentObject.questionText,
      currentObject.QuestionText,
      currentObject.correctAnswer,
      currentObject.CorrectAnswer,
      currentObject.options,
      currentObject.Options,
      currentObject.points,
      currentObject.Points,
    ].some((value) => value != null)

    if (hasStandaloneQuestionShape) {
      questionCandidates.push(currentObject)
    }

    for (const questionCandidate of questionCandidates) {
      if (questionCandidate == null) continue
      const parsedQuestionPayload = parseMaybeJsonValue(questionCandidate)
      const questionObject = asObject(parsedQuestionPayload)
      if (!questionObject) continue

      const parsedQuestions = parseGeneratedQuizQuestionsPayload({ questions: [questionObject] })
      if (parsedQuestions.items.length === 0) continue

      const firstQuestion = parsedQuestions.items[0]

      return {
        quizPersistedId: toPersistedId(
          currentObject.quizId
          ?? currentObject.QuizId
          ?? questionObject.quizId
          ?? questionObject.QuizId,
        ),
        question: firstQuestion,
        hasExplicitType: questionObject.type != null || questionObject.Type != null,
      }
    }

    for (const key of unwrapKeys) {
      if (key in currentObject) queue.push(currentObject[key])
    }
  }

  return null
}

const extractMentorLessonGeneratedContent = (payload: unknown): string => {
  const unwrapKeys = [
    'value', 'Value',
    'data', 'Data',
    'result', 'Result',
    'payload', 'Payload',
    'lesson', 'Lesson',
    'lessonContent', 'LessonContent',
    'lessonResult', 'LessonResult',
  ] as const

  const toText = (value: unknown): string => typeof value === 'string' ? value.trim() : ''

  const visited = new Set<unknown>()
  const queue: unknown[] = [payload]

  while (queue.length > 0) {
    const current = parseMaybeJsonValue(queue.shift())
    if (current == null) continue

    if (typeof current === 'string') {
      const content = current.trim()
      if (content) return content
      continue
    }

    if (typeof current === 'object') {
      if (visited.has(current)) continue
      visited.add(current)
    }

    if (Array.isArray(current)) {
      for (const item of current) queue.push(item)
      continue
    }

    const currentObject = asObject(current)
    if (!currentObject) continue

    const contentCandidate = [
      currentObject.content,
      currentObject.Content,
      currentObject.markdown,
      currentObject.Markdown,
      currentObject.body,
      currentObject.Body,
      currentObject.text,
      currentObject.Text,
      currentObject.generatedContent,
      currentObject.GeneratedContent,
      currentObject.lessonText,
      currentObject.LessonText,
      currentObject.lessonMarkdown,
      currentObject.LessonMarkdown,
    ]

    const firstStringContent = contentCandidate.find((value) => typeof value === 'string' && value.trim().length > 0)
    if (typeof firstStringContent === 'string') return firstStringContent.trim()

    const sectionLikeContent: Record<LessonSectionKey, string> = {
      overview: toText(currentObject.overview ?? currentObject.Overview),
      'core-concepts': toText(
        currentObject['core-concepts']
        ?? currentObject.coreConcepts
        ?? currentObject.CoreConcepts,
      ),
      'code-examples': toText(
        currentObject['code-examples']
        ?? currentObject.codeExamples
        ?? currentObject.CodeExamples,
      ),
      'common-mistakes': toText(
        currentObject['common-mistakes']
        ?? currentObject.commonMistakes
        ?? currentObject.CommonMistakes,
      ),
      'best-practices': toText(
        currentObject['best-practices']
        ?? currentObject.bestPractices
        ?? currentObject.BestPractices,
      ),
      summary: toText(currentObject.summary ?? currentObject.Summary),
    }

    if (Object.values(sectionLikeContent).some((item) => item.length > 0)) {
      return buildLessonContentFromSections(sectionLikeContent)
    }

    for (const key of unwrapKeys) {
      if (key in currentObject) queue.push(currentObject[key])
    }
  }

  return ''
}

const getSingleTaskErrorCode = (err: any): string => String(
  err?.code
  ?? err?.errorCode
  ?? err?.ErrorCode
  ?? err?.response?.data?.errorCode
  ?? err?.response?.data?.code
  ?? '',
).trim().toUpperCase()

const resolveSingleTaskGenerationErrorToast = (
  err: any,
  t: (key: string) => string,
): { message: string; type: ToastState['type'] } => {
  const code = getSingleTaskErrorCode(err)
  if (code === 'CHAPTER_NOT_FOUND') return { message: t('drafts.singleTaskErrorChapterNotFound'), type: 'error' }
  if (code === 'UNAUTHORIZED') return { message: t('drafts.singleTaskErrorUnauthorized'), type: 'error' }
  if (code === 'CHAPTER_NO_LESSONS') return { message: t('drafts.singleTaskErrorChapterNoLessons'), type: 'warning' }
  if (code === 'CHAPTER_TITLE_REQUIRED') return { message: t('drafts.singleTaskErrorChapterTitleRequired'), type: 'warning' }
  if (code === 'LESSON_TITLE_REQUIRED') return { message: t('drafts.singleTaskErrorLessonTitleRequired'), type: 'warning' }
  if (code === 'TASK_TYPE_INVALID') return { message: t('drafts.singleTaskErrorTaskTypeInvalid'), type: 'warning' }
  if (code === 'NO_VALID_TASKS') return { message: t('drafts.singleTaskErrorNoValidTasks'), type: 'warning' }
  if (code === 'INVALID_AI_RESPONSE') return { message: t('drafts.singleTaskErrorInvalidAiResponse'), type: 'warning' }
  if (code === 'TASK_GENERATION_FAILED') return { message: t('drafts.singleTaskErrorGenerationFailed'), type: 'error' }
  return {
    message: getApiErrorMessage(err, t('drafts.singleTaskGenerateFailed')),
    type: 'error',
  }
}

const getSingleQuizSkeletonErrorCode = (err: any): string => String(
  err?.code
  ?? err?.errorCode
  ?? err?.ErrorCode
  ?? err?.response?.data?.errorCode
  ?? err?.response?.data?.code
  ?? '',
).trim().toUpperCase()

const resolveSingleQuizSkeletonErrorToast = (
  err: any,
  t: (key: string) => string,
): { message: string; type: ToastState['type'] } => {
  const code = getSingleQuizSkeletonErrorCode(err)
  if (code === 'LESSON_NOT_FOUND') return { message: t('drafts.singleQuizSkeletonErrorLessonNotFound'), type: 'error' }
  if (code === 'UNAUTHORIZED') return { message: t('drafts.singleQuizSkeletonErrorUnauthorized'), type: 'error' }
  if (code === 'LESSON_TITLE_REQUIRED') return { message: t('drafts.singleQuizSkeletonErrorLessonTitleRequired'), type: 'warning' }
  if (code === 'LESSON_CONTENT_REQUIRED') return { message: t('drafts.singleQuizSkeletonErrorLessonContentRequired'), type: 'warning' }
  if (code === 'INVALID_AI_RESPONSE') return { message: t('drafts.singleQuizSkeletonErrorInvalidAiResponse'), type: 'warning' }
  if (code === 'DUPLICATE_QUIZ_SKELETON') return { message: t('drafts.singleQuizSkeletonErrorDuplicate'), type: 'warning' }
  if (code === 'QUIZ_GENERATION_FAILED') return { message: t('drafts.singleQuizSkeletonErrorGenerationFailed'), type: 'error' }
  if (code === 'UNEXPECTED_ERROR') return { message: t('drafts.singleQuizSkeletonErrorUnexpected'), type: 'error' }
  return {
    message: getApiErrorMessage(err, t('drafts.singleQuizSkeletonGenerateFailed')),
    type: 'error',
  }
}

const getSingleQuizQuestionErrorCode = (err: any): string => String(
  err?.code
  ?? err?.errorCode
  ?? err?.ErrorCode
  ?? err?.response?.data?.errorCode
  ?? err?.response?.data?.code
  ?? '',
).trim().toUpperCase()

const resolveSingleQuizQuestionErrorToast = (
  err: any,
  t: (key: string) => string,
): { message: string; type: ToastState['type'] } => {
  const code = getSingleQuizQuestionErrorCode(err)
  if (code === 'QUIZ_NOT_FOUND') return { message: t('drafts.singleQuizQuestionErrorQuizNotFound'), type: 'error' }
  if (code === 'QUIZ_NO_LESSON') return { message: t('drafts.singleQuizQuestionErrorQuizNoLesson'), type: 'warning' }
  if (code === 'UNAUTHORIZED' || code === 'ACCESS_DENIED') return { message: t('drafts.singleQuizQuestionErrorUnauthorized'), type: 'error' }
  if (code === 'QUESTION_TYPE_INVALID') return { message: t('drafts.singleQuizQuestionErrorQuestionTypeInvalid'), type: 'warning' }
  if (code === 'INVALID_AI_RESPONSE') return { message: t('drafts.singleQuizQuestionErrorInvalidAiResponse'), type: 'warning' }
  if (code === 'QUESTION_TYPE_MISMATCH') return { message: t('drafts.singleQuizQuestionErrorQuestionTypeMismatch'), type: 'warning' }
  if (code === 'DUPLICATE_QUESTION') return { message: t('drafts.singleQuizQuestionErrorDuplicate'), type: 'warning' }
  if (code === 'QUESTION_GENERATION_FAILED') return { message: t('drafts.singleQuizQuestionErrorGenerationFailed'), type: 'error' }
  return {
    message: getApiErrorMessage(err, t('drafts.singleQuizQuestionGenerateFailed')),
    type: 'error',
  }
}

const getMentorLessonContentErrorCode = (err: any): string => String(
  err?.code
  ?? err?.errorCode
  ?? err?.ErrorCode
  ?? err?.response?.data?.errorCode
  ?? err?.response?.data?.code
  ?? '',
).trim().toUpperCase()

const resolveMentorLessonContentErrorToast = (
  err: any,
  t: (key: string) => string,
): { message: string; type: ToastState['type'] } => {
  const code = getMentorLessonContentErrorCode(err)
  if (code === 'LESSON_NOT_FOUND') return { message: t('drafts.lessonContentErrorLessonNotFound'), type: 'error' }
  if (code === 'UNAUTHORIZED' || code === 'ACCESS_DENIED') return { message: t('drafts.lessonContentErrorUnauthorized'), type: 'error' }
  if (code === 'LESSON_TITLE_REQUIRED') return { message: t('drafts.lessonContentErrorLessonTitleRequired'), type: 'warning' }
  if (code === 'INVALID_AI_RESPONSE') return { message: t('drafts.lessonContentErrorInvalidAiResponse'), type: 'warning' }
  if (code === 'LESSON_CONTENT_GENERATION_FAILED') return { message: t('drafts.lessonContentErrorGenerationFailed'), type: 'error' }
  if (code === 'UNEXPECTED_ERROR') return { message: t('drafts.lessonContentErrorUnexpected'), type: 'error' }
  return {
    message: getApiErrorMessage(err, t('drafts.lessonContentGenerateFailed')),
    type: 'error',
  }
}

const sortGoalsBySubjectOrder = (
  goals: DraftFormState['goals'],
  subject: SubjectOption | null,
) => {
  if (!subject || goals.length < 2) return goals
  const order = new Map(subject.goals.map((goal, index) => [goal.goalId, index]))
  return [...goals].sort((a, b) => (order.get(a.goalId) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.goalId) ?? Number.MAX_SAFE_INTEGER))
}

const parseChapterMentorSkeletonLessons = (payload: unknown): Array<{ title: string; orderIndex: number }> => {
  const source = payload as any
  const lessons = Array.isArray(source?.lessons)
    ? source.lessons
    : Array.isArray(source?.Lessons)
      ? source.Lessons
      : []

  return lessons
    .map((lesson: any, index: number) => {
      const title = String(lesson?.title ?? lesson?.Title ?? '').trim()
      const numericOrder = Number(lesson?.orderIndex ?? lesson?.OrderIndex)
      return {
        title,
        orderIndex: Number.isFinite(numericOrder) ? numericOrder : index,
      }
    })
    .filter((lesson: { title: string }) => lesson.title.length > 0)
    .sort((a: { orderIndex: number }, b: { orderIndex: number }) => a.orderIndex - b.orderIndex)
}

const getChapterMentorSkeletonErrorCode = (err: any): string => String(
  err?.code
  ?? err?.errorCode
  ?? err?.ErrorCode
  ?? err?.response?.data?.errorCode
  ?? err?.response?.data?.code
  ?? '',
).trim().toUpperCase()

const resolveChapterMentorSkeletonErrorToast = (
  err: any,
  t: (key: string) => string,
): { message: string; type: ToastState['type'] } => {
  const code = getChapterMentorSkeletonErrorCode(err)
  if (code === 'INVALID_CHAPTER_TITLE') {
    return { message: t('drafts.chapterMentorSkeletonErrorInvalidTitle'), type: 'warning' }
  }
  if (code === 'LEARNING_PATH_NOT_FOUND') {
    return { message: t('drafts.chapterMentorSkeletonErrorPathNotFound'), type: 'error' }
  }
  if (code === 'UNAUTHORIZED' || code === 'ACCESS_DENIED') {
    return { message: t('drafts.chapterMentorSkeletonErrorUnauthorized'), type: 'error' }
  }
  if (code === 'INVALID_AI_RESPONSE') {
    return { message: t('drafts.chapterMentorSkeletonErrorInvalidAiResponse'), type: 'warning' }
  }
  if (code === 'GENERATION_FAILED') {
    return { message: t('drafts.chapterMentorSkeletonErrorGenerationFailed'), type: 'error' }
  }
  return {
    message: getApiErrorMessage(err, t('drafts.chapterMentorSkeletonGenerateFailed')),
    type: 'error',
  }
}

const resolveSelectionAfterHydrate = (
  previousForm: DraftFormState,
  nextForm: DraftFormState,
  activeChapterId: string | null,
  activeLessonId: string | null,
) => {
  const chapterIndex = previousForm.chapters.findIndex((chapter) => chapter.id === activeChapterId)
  const lessonIndex = chapterIndex >= 0
    ? previousForm.chapters[chapterIndex]?.lessons.findIndex((lesson) => lesson.id === activeLessonId)
    : -1

  const snapshot = createSelectionSnapshot(previousForm, activeChapterId, activeLessonId)
  const restored = restoreSelectionSnapshot(nextForm, snapshot)

  const resolvedChapterId = !snapshot.activeChapterPersistedId && chapterIndex >= 0
    ? (nextForm.chapters[chapterIndex]?.id ?? restored.chapterId)
    : restored.chapterId

  const resolvedChapter = nextForm.chapters.find((chapter) => chapter.id === resolvedChapterId) ?? nextForm.chapters[0] ?? null
  const resolvedLessonId = !snapshot.activeLessonPersistedId && lessonIndex >= 0
    ? (resolvedChapter?.lessons[lessonIndex]?.id ?? restored.lessonId)
    : restored.lessonId

  return {
    chapterId: resolvedChapter?.id ?? resolvedChapterId ?? null,
    lessonId: resolvedChapter?.lessons.find((lesson) => lesson.id === resolvedLessonId)?.id
      ?? resolvedChapter?.lessons[0]?.id
      ?? null,
  }
}

const MentorDraftFormPage: React.FC = () => {
  const { pathId } = useParams()
  const isCreateMode = !pathId
  const navigate = useNavigate()
  const location = useLocation() as { state?: { draft?: SkeletonResponse; toast?: ToastState } }
  const [searchParams] = useSearchParams()
  const reviewPathId = searchParams.get('reviewPathId') || null // original student pathId
  const { t } = useTranslation('mentor')
  const { isSmallScreen } = useResponsive()
  const sidebarConfig = { navItems: useMentorSidebarConfig(), actions: [], brand: { name: t('drafts.brandName'), subtitle: t('drafts.brandSubtitle') } }

  const [subjects, setSubjects] = useState<SubjectOption[]>([])
  const [subjectSearch, setSubjectSearch] = useState('')
  const [isSubjectMenuOpen, setIsSubjectMenuOpen] = useState(false)
  const [form, setForm] = useState<DraftFormState>(hydrateDraftForm(location.state?.draft))
  const [loading, setLoading] = useState(!isCreateMode)
  const [saving, setSaving] = useState(false)
  const [generatingAiDraft, setGeneratingAiDraft] = useState(false)
  const [generatingMentorLessonContentId, setGeneratingMentorLessonContentId] = useState<string | null>(null)
  const [generatingChapterSkeletonId, setGeneratingChapterSkeletonId] = useState<string | null>(null)
  const [generatingChapterSkeletonPathId, setGeneratingChapterSkeletonPathId] = useState<string | null>(null)
  const [isQuizSkeletonLoading, setIsQuizSkeletonLoading] = useState(false)
  const [hasQuizSkeleton, setHasQuizSkeleton] = useState(false)
  const [quizSkeletonError, setQuizSkeletonError] = useState<string | null>(null)
  const [generatingSingleQuizSkeletonLessonId, setGeneratingSingleQuizSkeletonLessonId] = useState<string | null>(null)
  const [generatingSingleQuizQuestionQuizId, setGeneratingSingleQuizQuestionQuizId] = useState<string | null>(null)
  const [generatingTaskId, setGeneratingTaskId] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState | null>(location.state?.toast ?? null)
  const [currentStep, setCurrentStep] = useState<EditorStep>('overview')
  const [assessmentTab, setAssessmentTab] = useState<AssessmentTab>('tasks')
  const [activeChapterId, setActiveChapterId] = useState<string | null>(form.chapters[0]?.id ?? null)
  const [activeLessonId, setActiveLessonId] = useState<string | null>(form.chapters[0]?.lessons[0]?.id ?? null)
  const [studentOptions, setStudentOptions] = useState<Array<{ id: string; label: string }>>([])
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [shareError, setShareError] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [isVersionUpdateModalOpen, setIsVersionUpdateModalOpen] = useState(false)
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [isNavigatorOpen, setIsNavigatorOpen] = useState(!isSmallScreen)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const chapterSkeletonPendingByPathRef = useRef<Map<string, string>>(new Map())
  const chapterSkeletonRequestCounterRef = useRef(0)
  const subjectPickerRef = useRef<HTMLDivElement | null>(null)
  const currentPathId = String(pathId ?? location.state?.draft?.pathId ?? '')
  const canShare = !!currentPathId

  useEffect(() => {
    setIsNavigatorOpen(!isSmallScreen)
  }, [isSmallScreen])

  useEffect(() => {
    let active = true

    const load = async () => {
      setLoading(!isCreateMode)
      setLoadError(null)
      try {
        const [subjectList, draft, contacts] = await Promise.all([
          SubjectService.listSubjects(),
          isCreateMode ? Promise.resolve(location.state?.draft ?? null) : LearningPathService.getMyDraftDetail(pathId as string),
          getContacts().catch(() => []),
        ])
        if (!active) return
        setSubjects(subjectList.map((subject: any) => ({
          id: String(subject?.id ?? subject?.subjectId),
          name: subject?.name ?? 'Subject',
          goals: Array.isArray(subject?.goals) ? subject.goals.map((goal: any) => ({ goalId: String(goal?.goalId ?? goal?.id), title: goal?.title ?? goal?.name ?? 'Goal' })) : [],
        })))
        setStudentOptions(
          contacts
            .filter((item: any) => item?.roleName === 'Student')
            .map((item: any) => ({ id: String(item?.userId), label: item?.username ?? 'Student' })),
        )
        const hydrated = hydrateDraftForm(draft)
        setForm(hydrated)
        setActiveChapterId(hydrated.chapters[0]?.id ?? null)
        setActiveLessonId(hydrated.chapters[0]?.lessons[0]?.id ?? null)
      } catch (err: any) {
        if (!active) return
        const status = err?.response?.status
        const code = err?.response?.data?.errorCode || err?.response?.data?.code
        if (!isCreateMode && (status === 403 || code === 'ACCESS_DENIED')) {
          navigate(ROUTER.MENTOR_DRAFTS, { replace: true, state: { toast: { message: t('drafts.accessDenied'), type: 'error' } satisfies ToastState } })
          return
        }
        if (!isCreateMode && (status === 404 || code === 'LEARNING_PATH_NOT_FOUND')) {
          navigate(ROUTER.MENTOR_DRAFTS, { replace: true, state: { toast: { message: t('drafts.notFound'), type: 'error' } satisfies ToastState } })
          return
        }
        if (!isCreateMode && (status === 400 || code === 'INVALID_STATUS')) {
          navigate(ROUTER.MENTOR_DRAFTS, { replace: true, state: { toast: { message: t('drafts.invalidStatus'), type: 'error' } satisfies ToastState } })
          return
        }
        setLoadError(getApiErrorMessage(err, t('drafts.loadFailed')))
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => { active = false }
  }, [isCreateMode, location.state?.draft, navigate, pathId, t])

  const selectedSubject = useMemo(() => subjects.find((subject) => subject.id === form.subjectId) ?? null, [form.subjectId, subjects])
  const filteredSubjects = useMemo(() => {
    const keyword = subjectSearch.trim().toLowerCase()
    const matched = keyword ? subjects.filter((subject) => subject.name.toLowerCase().includes(keyword)) : subjects
    if (selectedSubject && !matched.some((subject) => subject.id === selectedSubject.id)) return [selectedSubject, ...matched]
    return matched
  }, [selectedSubject, subjectSearch, subjects])
  const activeChapter = useMemo(() => form.chapters.find((chapter) => chapter.id === activeChapterId) ?? form.chapters[0] ?? null, [activeChapterId, form.chapters])
  const activeLesson = useMemo(() => activeChapter?.lessons.find((lesson) => lesson.id === activeLessonId) ?? activeChapter?.lessons[0] ?? null, [activeChapter, activeLessonId])
  const isGeneratingActiveMentorLessonContent = activeLesson?.id != null && generatingMentorLessonContentId === activeLesson.id
  const isGeneratingActiveChapterSkeleton = activeChapter?.id != null && generatingChapterSkeletonId === activeChapter.id
  const isGeneratingActiveSingleQuizSkeleton = activeLesson?.id != null && generatingSingleQuizSkeletonLessonId === activeLesson.id
  const hasPendingChapterSkeletonGeneration = generatingChapterSkeletonPathId != null

  useEffect(() => {
    setIsQuizSkeletonLoading(false)
    setHasQuizSkeleton(false)
    setQuizSkeletonError(null)
  }, [activeLessonId])

  useEffect(() => {
    if (!selectedSubject) {
      if (!form.subjectId) setSubjectSearch('')
      return
    }
    setSubjectSearch(selectedSubject.name)
  }, [form.subjectId, selectedSubject])

  useEffect(() => {
    if (!selectedSubject || form.goals.length < 2) return
    const sortedGoals = sortGoalsBySubjectOrder(form.goals, selectedSubject)
    const isSameOrder = sortedGoals.every((goal, index) => goal.goalId === form.goals[index]?.goalId)
    if (!isSameOrder) {
      setForm((prev) => ({ ...prev, goals: sortGoalsBySubjectOrder(prev.goals, selectedSubject) }))
    }
  }, [form.goals, selectedSubject])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!subjectPickerRef.current?.contains(event.target as Node)) setIsSubjectMenuOpen(false)
    }
    window.addEventListener('mousedown', handlePointerDown)
    return () => window.removeEventListener('mousedown', handlePointerDown)
  }, [])

  const updateChapter = (chapterId: string, updater: (chapter: EditableChapter) => EditableChapter) =>
    setForm((prev) => ({ ...prev, chapters: prev.chapters.map((chapter) => chapter.id === chapterId ? updater(chapter) : chapter) }))
  const updateLesson = (chapterId: string, lessonId: string, updater: (lesson: EditableLesson) => EditableLesson) =>
    updateChapter(chapterId, (chapter) => ({ ...chapter, lessons: chapter.lessons.map((lesson) => lesson.id === lessonId ? updater(lesson) : lesson) }))
  const updateTask = (chapterId: string, taskId: string, updater: (task: EditableTask) => EditableTask) =>
    updateChapter(chapterId, (chapter) => ({ ...chapter, tasks: chapter.tasks.map((task) => task.id === taskId ? updater(task) : task) }))
  const updateQuiz = (chapterId: string, lessonId: string, quizId: string, updater: (quiz: EditableQuiz) => EditableQuiz) =>
    updateLesson(chapterId, lessonId, (lesson) => ({ ...lesson, quizzes: lesson.quizzes.map((quiz) => quiz.id === quizId ? updater(quiz) : quiz) }))
  const updateQuestion = (
    chapterId: string,
    lessonId: string,
    quizId: string,
    questionId: string,
    updater: (question: EditableQuiz['questions'][number]) => EditableQuiz['questions'][number],
  ) => updateQuiz(chapterId, lessonId, quizId, (quiz) => ({
    ...quiz,
    questions: quiz.questions.map((question) => question.id === questionId ? updater(question) : question),
  }))

  const selectChapter = (chapterId: string, step: EditorStep = 'chapters') => {
    const chapter = form.chapters.find((item) => item.id === chapterId)
    setActiveChapterId(chapterId)
    setActiveLessonId(chapter?.lessons[0]?.id ?? null)
    setCurrentStep(step)
  }
  const selectLesson = (chapterId: string, lessonId: string, step: EditorStep = 'lesson') => {
    setActiveChapterId(chapterId)
    setActiveLessonId(lessonId)
    setCurrentStep(step)
  }

  const toggleGoal = (goalId: string) => setForm((prev) => {
    const exists = prev.goals.some((goal) => goal.goalId === goalId)
    if (exists) {
      const nextGoals = prev.goals.filter((goal) => goal.goalId !== goalId)
      if (nextGoals.length === 1) nextGoals[0] = { ...nextGoals[0], weight: 100 }
      return { ...prev, goals: sortGoalsBySubjectOrder(nextGoals, selectedSubject) }
    }
    if (prev.goals.length >= 2) return prev
    const nextGoals = [...prev.goals, { goalId, weight: prev.goals.length === 0 ? 100 : 50 }]
    if (nextGoals.length === 2) {
      nextGoals[0] = { ...nextGoals[0], weight: 50 }
      nextGoals[1] = { ...nextGoals[1], weight: 50 }
    }
    return { ...prev, goals: sortGoalsBySubjectOrder(nextGoals, selectedSubject) }
  })
  const setPrimaryWeight = (weight: number) => setForm((prev) => {
    if (prev.goals.length !== 2) return prev
    const clampedWeight = Math.min(90, Math.max(10, weight))
    return {
      ...prev,
      goals: [
        { ...prev.goals[0], weight: clampedWeight },
        { ...prev.goals[1], weight: 100 - clampedWeight },
      ],
    }
  })
  const selectSubject = (subject: SubjectOption) => {
    setForm((prev) => ({ ...prev, subjectId: subject.id, goals: [] }))
    setSubjectSearch(subject.name)
    setIsSubjectMenuOpen(false)
  }

  const addChapter = () => {
    const chapter = emptyChapter()
    setForm((prev) => ({ ...prev, chapters: [...prev.chapters, chapter] }))
    setActiveChapterId(chapter.id)
    setActiveLessonId(chapter.lessons[0]?.id ?? null)
    setCurrentStep('chapters')
  }
  const addLesson = (chapterId: string) => {
    const lesson = emptyLesson()
    updateChapter(chapterId, (chapter) => ({ ...chapter, lessons: [...chapter.lessons, lesson] }))
    setActiveChapterId(chapterId)
    setActiveLessonId(lesson.id)
    setCurrentStep('lesson')
  }
  const addTask = (chapterId: string) => updateChapter(chapterId, (chapter) => ({ ...chapter, tasks: [...chapter.tasks, emptyTask()] }))
  const addQuiz = (chapterId: string, lessonId: string) => updateLesson(chapterId, lessonId, (lesson) => ({ ...lesson, quizzes: [...lesson.quizzes, emptyQuiz()] }))
  const addQuestion = (chapterId: string, lessonId: string, quizId: string) =>
    updateQuiz(chapterId, lessonId, quizId, (quiz) => ({ ...quiz, questions: [...quiz.questions, emptyQuestion()] }))
  const moveChapter = (chapterId: string, direction: -1 | 1) => setForm((prev) => {
    const index = prev.chapters.findIndex((chapter) => chapter.id === chapterId)
    const targetIndex = index + direction
    if (index === -1 || targetIndex < 0 || targetIndex >= prev.chapters.length) return prev
    const nextChapters = [...prev.chapters]
    const [item] = nextChapters.splice(index, 1)
    nextChapters.splice(targetIndex, 0, item)
    return { ...prev, chapters: nextChapters }
  })
  const moveLesson = (chapterId: string, lessonId: string, direction: -1 | 1) => updateChapter(chapterId, (chapter) => {
    const index = chapter.lessons.findIndex((lesson) => lesson.id === lessonId)
    const targetIndex = index + direction
    if (index === -1 || targetIndex < 0 || targetIndex >= chapter.lessons.length) return chapter
    const nextLessons = [...chapter.lessons]
    const [item] = nextLessons.splice(index, 1)
    nextLessons.splice(targetIndex, 0, item)
    return { ...chapter, lessons: nextLessons }
  })
  const removeChapter = (chapterId: string) => setForm((prev) => {
    const nextChapters = prev.chapters.filter((chapter) => chapter.id !== chapterId)
    if (nextChapters.length === 0) {
      const fallback = emptyChapter()
      setActiveChapterId(fallback.id)
      setActiveLessonId(fallback.lessons[0]?.id ?? null)
      return { ...prev, chapters: [fallback] }
    }
    setActiveChapterId(nextChapters[0].id)
    setActiveLessonId(nextChapters[0].lessons[0]?.id ?? null)
    return { ...prev, chapters: nextChapters }
  })
  const removeLesson = (chapterId: string, lessonId: string) => updateChapter(chapterId, (chapter) => {
    const nextLessons = chapter.lessons.filter((lesson) => lesson.id !== lessonId)
    const safeLessons = nextLessons.length > 0 ? nextLessons : [emptyLesson()]
    setActiveLessonId(safeLessons[0].id)
    return { ...chapter, lessons: safeLessons }
  })
  const removeTask = (chapterId: string, taskId: string) => updateChapter(chapterId, (chapter) => ({ ...chapter, tasks: chapter.tasks.filter((task) => task.id !== taskId) }))
  const removeQuiz = (chapterId: string, lessonId: string, quizId: string) => updateLesson(chapterId, lessonId, (lesson) => ({ ...lesson, quizzes: lesson.quizzes.filter((quiz) => quiz.id !== quizId) }))
  const removeQuestion = (chapterId: string, lessonId: string, quizId: string, questionId: string) =>
    updateQuiz(chapterId, lessonId, quizId, (quiz) => ({ ...quiz, questions: quiz.questions.filter((question) => question.id !== questionId) }))

  const generateAiDraftFromSettings = async () => {
    const validationError = validateAiDraftInput(form)
    if (validationError) {
      setToast({ message: validationError, type: 'warning' })
      return
    }
    setGeneratingAiDraft(true)
    try {
      const draft = await LearningPathService.generateAiDraft({ subjectId: form.subjectId, goals: form.goals, complexityLevel: form.complexityLevel, languageSelection: form.languageSelection })
      if (!draft?.pathId) {
        setToast({ message: t('aiPlans.missingDraftId'), type: 'error' })
        return
      }
      navigate(ROUTER.MENTOR_DRAFT_DETAIL.replace(':pathId', String(draft.pathId)), { state: { pathId: draft.pathId, draft, toast: { message: t('drafts.aiGenerateSuccess'), type: 'success' } satisfies ToastState } })
    } catch (err: any) {
      setToast({ message: getApiErrorMessage(err, t('aiPlans.detailLoadFailed')), type: 'error' })
    } finally {
      setGeneratingAiDraft(false)
    }
  }

  const persistDraft = async (
    versionOptions?: {
      increaseVersion: boolean
      versionUpdateType: ManualDraftVersionUpdateType | null
    },
  ) => {
    const validationError = validateDraftForm(form)
    if (validationError) {
      setToast({ message: validationError, type: 'warning' })
      return null
    }

    const previousTitle = form.title
    setSaving(true)
    try {
      const response = currentPathId
        ? await LearningPathService.updateManualDraft(currentPathId, buildPayload(form, versionOptions))
        : await LearningPathService.createManualDraft(buildPayload(form))

      const resolvedPathId = String(response?.pathId ?? currentPathId ?? '')
      if (!resolvedPathId) {
        setToast({ message: t('drafts.saveFailed'), type: 'error' })
        return null
      }

      const latestDraft = await LearningPathService.getMyDraftDetail(resolvedPathId).catch(() => response)
      const nextForm = hydrateDraftForm(latestDraft, form)
      const nextSelection = resolveSelectionAfterHydrate(form, nextForm, activeChapterId, activeLessonId)

      setForm(nextForm)
      setActiveChapterId(nextSelection.chapterId)
      setActiveLessonId(nextSelection.lessonId)

      if (isCreateMode && response?.pathId) {
        navigate(ROUTER.MENTOR_DRAFT_DETAIL.replace(':pathId', String(response.pathId)), { replace: true, state: { draft: latestDraft } })
      }

      return {
        resolvedPathId,
        response,
        latestDraft,
        nextForm,
        nextSelection,
        successMessage: isCreateMode
          ? t('drafts.manualCreateSuccess')
          : resolveDraftUpdateSuccessMessage(response, latestDraft, previousTitle, t),
      }
    } catch (err: any) {
      setToast({ message: getApiErrorMessage(err, t('drafts.saveFailed')), type: 'error' })
      return null
    } finally {
      setSaving(false)
    }
  }

  const saveDraftForGeneration = async () => persistDraft(
    currentPathId
      ? { increaseVersion: false, versionUpdateType: null }
      : undefined,
  )

  const generateChapterMentorSkeletonForActiveChapter = async () => {
    if (!activeChapter) {
      setToast({ message: t('drafts.noChapterSelected'), type: 'warning' })
      return
    }

    const activeChapterSnapshot = {
      id: activeChapter.id,
      title: activeChapter.title,
      content: activeChapter.content,
    }
    const activeChapterIndex = form.chapters.findIndex((chapter) => chapter.id === activeChapter.id)

    if (currentPathId && chapterSkeletonPendingByPathRef.current.has(currentPathId)) {
      setToast({ message: t('drafts.chapterMentorSkeletonGenerateInProgress'), type: 'warning' })
      return
    }

    setGeneratingChapterSkeletonId(activeChapter.id)
    let requestPathId: string | null = null
    let requestKey: string | null = null

    try {
      const persisted = await saveDraftForGeneration()
      if (!persisted) return

      requestPathId = persisted.resolvedPathId
      if (chapterSkeletonPendingByPathRef.current.has(requestPathId)) {
        setToast({ message: t('drafts.chapterMentorSkeletonGenerateInProgress'), type: 'warning' })
        return
      }

      const chapterFromSelection = persisted.nextSelection.chapterId
        ? persisted.nextForm.chapters.find((chapter) => chapter.id === persisted.nextSelection.chapterId)
        : null
      const chapterFromIndex = activeChapterIndex >= 0
        ? (persisted.nextForm.chapters[activeChapterIndex] ?? null)
        : null

      const chapterForContext = chapterFromSelection ?? chapterFromIndex ?? {
        ...activeChapterSnapshot,
        lessons: [],
        tasks: [],
        startDate: '',
        endDate: '',
        estimatedDays: '',
        persistedId: null,
      }

      const chapterIdToUpdate = chapterFromSelection?.id ?? chapterFromIndex?.id ?? null

      requestKey = `${requestPathId}:${chapterForContext.title.trim().toLowerCase()}:${++chapterSkeletonRequestCounterRef.current}`
      chapterSkeletonPendingByPathRef.current.set(requestPathId, requestKey)
      setGeneratingChapterSkeletonPathId(requestPathId)

      setGeneratingChapterSkeletonId(chapterIdToUpdate ?? activeChapterSnapshot.id)

      const chapterSkeleton = await LearningPathService.generateChapterMentorSkeleton(
        requestPathId,
        chapterForContext.title,
        chapterForContext.content,
        {
          useSignalR: true,
          onLoading: () => {
            setGeneratingChapterSkeletonId(chapterIdToUpdate ?? activeChapterSnapshot.id)
          },
        },
      )

      if (requestPathId && requestKey && chapterSkeletonPendingByPathRef.current.get(requestPathId) !== requestKey) {
        return
      }

      const rawLessonArray = Array.isArray((chapterSkeleton as any)?.lessons)
        ? (chapterSkeleton as any).lessons
        : Array.isArray((chapterSkeleton as any)?.Lessons)
          ? (chapterSkeleton as any).Lessons
          : []

      const parsedLessons = parseChapterMentorSkeletonLessons(chapterSkeleton)
      if (rawLessonArray.length === 0) {
        setToast({ message: t('drafts.chapterMentorSkeletonGenerateEmpty'), type: 'warning' })
        return
      }
      if (rawLessonArray.length > 0 && parsedLessons.length === 0) {
        setToast({ message: t('drafts.chapterMentorSkeletonGenerateInvalidPayload'), type: 'warning' })
        return
      }

      const nextLessons: EditableLesson[] = parsedLessons.map((lesson) => {
        const base = emptyLesson()
        return {
          ...base,
          title: lesson.title,
        }
      })

      const nextChapters = [...persisted.nextForm.chapters]
      let targetChapterIndex = chapterIdToUpdate
        ? nextChapters.findIndex((chapter) => chapter.id === chapterIdToUpdate)
        : -1

      if (targetChapterIndex < 0 && activeChapterIndex >= 0 && activeChapterIndex < nextChapters.length) {
        targetChapterIndex = activeChapterIndex
      }

      let resolvedChapterId: string
      if (targetChapterIndex >= 0) {
        const targetChapter = nextChapters[targetChapterIndex]
        nextChapters[targetChapterIndex] = {
          ...targetChapter,
          lessons: nextLessons,
        }
        resolvedChapterId = nextChapters[targetChapterIndex].id
      } else {
        const fallbackChapter = emptyChapter()
        fallbackChapter.title = chapterForContext.title
        fallbackChapter.content = chapterForContext.content
        fallbackChapter.lessons = nextLessons
        nextChapters.push(fallbackChapter)
        resolvedChapterId = fallbackChapter.id
      }

      setForm({
        ...persisted.nextForm,
        chapters: nextChapters,
      })
      setActiveChapterId(resolvedChapterId)
      setActiveLessonId(nextLessons[0]?.id ?? null)
      setToast({ message: t('drafts.chapterMentorSkeletonGenerateSuccess'), type: 'success' })
    } catch (err: any) {
      if (requestPathId && requestKey && chapterSkeletonPendingByPathRef.current.get(requestPathId) !== requestKey) {
        return
      }
      const toastPayload = resolveChapterMentorSkeletonErrorToast(err, t)
      setToast({ message: toastPayload.message, type: toastPayload.type })
    } finally {
      if (requestPathId && requestKey && chapterSkeletonPendingByPathRef.current.get(requestPathId) === requestKey) {
        chapterSkeletonPendingByPathRef.current.delete(requestPathId)
        setGeneratingChapterSkeletonPathId((prev) => (prev === requestPathId ? null : prev))
      }
      setGeneratingChapterSkeletonId(null)
    }
  }

  const generateAiTaskForChapter = async (chapterId: string, taskId: string) => {
    const targetChapter = form.chapters.find((chapter) => chapter.id === chapterId) ?? null
    const targetTask = targetChapter?.tasks.find((task) => task.id === taskId) ?? null

    if (!targetChapter || !targetTask) {
      setToast({ message: t('drafts.noChapterSelected'), type: 'warning' })
      return
    }

    if (generatingTaskId) {
      setToast({ message: t('drafts.singleTaskGenerateInProgress'), type: 'warning' })
      return
    }

    if (!targetChapter.persistedId) {
      setToast({ message: t('drafts.saveBeforeGenerateSingleTask'), type: 'warning' })
      return
    }

    setGeneratingTaskId(taskId)

    try {
      setGeneratingTaskId(targetTask.id)
      const requestedTaskType = TASK_TYPE_TO_SIGNALR[targetTask.taskType]
      const preferredTitle = targetTask.title.trim() || null
      const generatedTaskPayload = await LearningPathService.generateSingleTask(
        targetChapter.persistedId,
        preferredTitle,
        requestedTaskType,
        {
          onLoading: () => setGeneratingTaskId(targetTask.id),
        },
      )

      const source = extractSingleTaskPayload(generatedTaskPayload) as any
      if (!source) {
        setToast({ message: t('drafts.singleTaskGenerateInvalidPayload'), type: 'warning' })
        return
      }

      const nextPersistedId = toPersistedId(source?.taskId ?? source?.TaskId ?? source?.id ?? source?.Id)
      const nextTitle = String(source?.title ?? source?.Title ?? '').trim()
      const nextDescription = String(source?.description ?? source?.Description ?? '').trim()
      const hasTaskType = source?.taskType != null || source?.TaskType != null
      const hasPriority = source?.priority != null || source?.Priority != null
      const hasTaskStatus = source?.taskStatus != null || source?.TaskStatus != null
      const hasQuizJson = source?.quizQuestionsJson != null
        || source?.QuizQuestionsJson != null
        || source?.quizQuestions != null
        || source?.QuizQuestions != null

      updateTask(targetChapter.id, targetTask.id, (task) => ({
        ...task,
        persistedId: nextPersistedId ?? task.persistedId,
        title: nextTitle || task.title,
        description: nextDescription || task.description,
        taskType: hasTaskType ? normalizeTaskType(source?.taskType ?? source?.TaskType) : task.taskType,
        priority: hasPriority ? normalizeTaskPriority(source?.priority ?? source?.Priority) : task.priority,
        taskStatus: hasTaskStatus ? normalizeTaskStatus(source?.taskStatus ?? source?.TaskStatus) : task.taskStatus,
        quizQuestionsJson: hasQuizJson
          ? normalizeJsonField(source?.quizQuestionsJson ?? source?.QuizQuestionsJson ?? source?.quizQuestions ?? source?.QuizQuestions)
          : task.quizQuestionsJson,
      }))

      setToast({ message: t('drafts.singleTaskGenerateSuccess'), type: 'success' })
    } catch (err: any) {
      const toastPayload = resolveSingleTaskGenerationErrorToast(err, t)
      setToast({ message: toastPayload.message, type: toastPayload.type })
    } finally {
      setGeneratingTaskId(null)
    }
  }

  const generateMentorLessonContentForActiveLesson = async () => {
    if (!activeChapter || !activeLesson) {
      setToast({ message: t('drafts.noLessonSelected'), type: 'warning' })
      return
    }

    if (generatingMentorLessonContentId) {
      setToast({ message: t('drafts.lessonContentGenerateInProgress'), type: 'warning' })
      return
    }

    let targetChapterId = activeChapter.id
    let targetLessonId = activeLesson.id
    let persistedLessonId = activeLesson.persistedId

    setGeneratingMentorLessonContentId(activeLesson.id)

    try {
      if (!persistedLessonId) {
        const chapterIndex = form.chapters.findIndex((chapter) => chapter.id === activeChapter.id)
        const lessonIndex = chapterIndex >= 0
          ? form.chapters[chapterIndex]?.lessons.findIndex((lesson) => lesson.id === activeLesson.id)
          : -1

        const persisted = await saveDraftForGeneration()
        if (!persisted) return

        const chapterFromSelection = persisted.nextSelection.chapterId
          ? persisted.nextForm.chapters.find((chapter) => chapter.id === persisted.nextSelection.chapterId)
          : null
        const chapterFromIndex = chapterIndex >= 0
          ? (persisted.nextForm.chapters[chapterIndex] ?? null)
          : null
        const targetChapter = chapterFromSelection ?? chapterFromIndex
        const lessonFromSelection = persisted.nextSelection.lessonId && targetChapter
          ? targetChapter.lessons.find((lesson) => lesson.id === persisted.nextSelection.lessonId)
          : null
        const lessonFromIndex = targetChapter && lessonIndex >= 0
          ? (targetChapter.lessons[lessonIndex] ?? null)
          : null
        const targetLesson = lessonFromSelection ?? lessonFromIndex ?? targetChapter?.lessons[0] ?? null

        if (!targetChapter || !targetLesson?.persistedId) {
          setToast({ message: t('drafts.saveBeforeGenerateLessonContent'), type: 'warning' })
          return
        }

        targetChapterId = targetChapter.id
        targetLessonId = targetLesson.id
        persistedLessonId = targetLesson.persistedId
        setGeneratingMentorLessonContentId(targetLesson.id)
      }

      if (!persistedLessonId) {
        setToast({ message: t('drafts.saveBeforeGenerateLessonContent'), type: 'warning' })
        return
      }

      const generatedLessonPayload = await LearningPathService.generateMentorLessonContent(persistedLessonId, {
        onLoading: () => setGeneratingMentorLessonContentId(targetLessonId),
      })

      const generatedContent = extractMentorLessonGeneratedContent(generatedLessonPayload)
      if (!generatedContent.trim()) {
        setToast({ message: t('drafts.lessonContentGenerateEmpty'), type: 'warning' })
        return
      }

      updateLesson(targetChapterId, targetLessonId, (lesson) => ({
        ...lesson,
        sections: parseLessonSections(generatedContent),
      }))

      setToast({ message: t('drafts.lessonContentGenerateSuccess'), type: 'success' })
    } catch (err: any) {
      const toastPayload = resolveMentorLessonContentErrorToast(err, t)
      setToast({ message: toastPayload.message, type: toastPayload.type })
    } finally {
      setGeneratingMentorLessonContentId(null)
    }
  }

  const generateSingleQuizSkeletonForActiveLesson = async () => {
    if (!activeChapter || !activeLesson) {
      setToast({ message: t('drafts.noLessonSelected'), type: 'warning' })
      return
    }

    if (generatingSingleQuizSkeletonLessonId) {
      setToast({ message: t('drafts.singleQuizSkeletonGenerateInProgress'), type: 'warning' })
      return
    }

    let targetChapterId = activeChapter.id
    let targetLessonId = activeLesson.id
    let persistedLessonId = activeLesson.persistedId

    setGeneratingSingleQuizSkeletonLessonId(activeLesson.id)
    setIsQuizSkeletonLoading(true)
    setHasQuizSkeleton(false)
    setQuizSkeletonError(null)

    try {
      if (!persistedLessonId) {
        const chapterIndex = form.chapters.findIndex((chapter) => chapter.id === activeChapter.id)
        const lessonIndex = chapterIndex >= 0
          ? form.chapters[chapterIndex]?.lessons.findIndex((lesson) => lesson.id === activeLesson.id)
          : -1

        const persisted = await saveDraftForGeneration()
        if (!persisted) return

        const chapterFromSelection = persisted.nextSelection.chapterId
          ? persisted.nextForm.chapters.find((chapter) => chapter.id === persisted.nextSelection.chapterId)
          : null
        const chapterFromIndex = chapterIndex >= 0
          ? (persisted.nextForm.chapters[chapterIndex] ?? null)
          : null
        const targetChapter = chapterFromSelection ?? chapterFromIndex
        const lessonFromSelection = persisted.nextSelection.lessonId && targetChapter
          ? targetChapter.lessons.find((lesson) => lesson.id === persisted.nextSelection.lessonId)
          : null
        const lessonFromIndex = targetChapter && lessonIndex >= 0
          ? (targetChapter.lessons[lessonIndex] ?? null)
          : null
        const targetLesson = lessonFromSelection ?? lessonFromIndex ?? targetChapter?.lessons[0] ?? null

        if (!targetChapter || !targetLesson?.persistedId) {
          setToast({ message: t('drafts.saveBeforeGenerateSingleQuizSkeleton'), type: 'warning' })
          return
        }

        targetChapterId = targetChapter.id
        targetLessonId = targetLesson.id
        persistedLessonId = targetLesson.persistedId
        setGeneratingSingleQuizSkeletonLessonId(targetLesson.id)
      }

      if (!persistedLessonId) {
        setToast({ message: t('drafts.saveBeforeGenerateSingleQuizSkeleton'), type: 'warning' })
        return
      }

      const generatedQuizPayload = await LearningPathService.generateSingleQuizSkeleton(persistedLessonId, {
        onLoading: () => {
          setGeneratingSingleQuizSkeletonLessonId(targetLessonId)
          setIsQuizSkeletonLoading(true)
        },
      })

      const parsedQuiz = extractSingleQuizSkeletonPayload(generatedQuizPayload)
      if (!parsedQuiz || !parsedQuiz.title) {
        const message = t('drafts.singleQuizSkeletonGenerateInvalidPayload')
        setQuizSkeletonError(message)
        setToast({ message, type: 'warning' })
        return
      }

      const quizTemplate = emptyQuiz()
      const nextQuiz: EditableQuiz = {
        ...quizTemplate,
        persistedId: parsedQuiz.persistedId,
        title: parsedQuiz.title,
        description: parsedQuiz.description,
      }

      updateLesson(targetChapterId, targetLessonId, (lesson) => ({
        ...lesson,
        quizzes: [...lesson.quizzes, nextQuiz],
      }))

      setHasQuizSkeleton(true)
      setQuizSkeletonError(null)
      setToast({ message: t('drafts.singleQuizSkeletonGenerateSuccess'), type: 'success' })
    } catch (err: any) {
      const toastPayload = resolveSingleQuizSkeletonErrorToast(err, t)
      setHasQuizSkeleton(false)
      setQuizSkeletonError(toastPayload.message)
      setToast({ message: toastPayload.message, type: toastPayload.type })
    } finally {
      setIsQuizSkeletonLoading(false)
      setGeneratingSingleQuizSkeletonLessonId(null)
    }
  }

  const generateSingleQuizQuestionForQuiz = async (
    quiz: EditableQuiz,
    questionId: string,
    questionType: QuestionType,
  ) => {
    if (!activeChapter || !activeLesson) {
      setToast({ message: t('drafts.noLessonSelected'), type: 'warning' })
      return
    }

    if (generatingSingleQuizQuestionQuizId) {
      setToast({ message: t('drafts.singleQuizQuestionGenerateInProgress'), type: 'warning' })
      return
    }

    const requestedQuestionType = questionType
    const requestedQuestionTypeNumber = QUESTION_TYPE_TO_SIGNALR[questionType]

    let targetChapterId = activeChapter.id
    let targetLessonId = activeLesson.id
    let targetQuizId = quiz.id
    let targetQuestionId = questionId
    const targetQuestionIndex = quiz.questions.findIndex((item) => item.id === questionId)
    let persistedQuizId = quiz.persistedId

    setGeneratingSingleQuizQuestionQuizId(quiz.id)

    try {
      if (!persistedQuizId) {
        const chapterIndex = form.chapters.findIndex((chapter) => chapter.id === activeChapter.id)
        const lessonIndex = chapterIndex >= 0
          ? form.chapters[chapterIndex]?.lessons.findIndex((lesson) => lesson.id === activeLesson.id)
          : -1
        const quizIndex = chapterIndex >= 0 && lessonIndex >= 0
          ? form.chapters[chapterIndex]?.lessons[lessonIndex]?.quizzes.findIndex((item) => item.id === quiz.id)
          : -1

        const persisted = await saveDraftForGeneration()
        if (!persisted) return

        const chapterFromSelection = persisted.nextSelection.chapterId
          ? persisted.nextForm.chapters.find((chapter) => chapter.id === persisted.nextSelection.chapterId)
          : null
        const chapterFromIndex = chapterIndex >= 0
          ? (persisted.nextForm.chapters[chapterIndex] ?? null)
          : null
        const targetChapter = chapterFromSelection ?? chapterFromIndex

        const lessonFromSelection = persisted.nextSelection.lessonId && targetChapter
          ? targetChapter.lessons.find((lesson) => lesson.id === persisted.nextSelection.lessonId)
          : null
        const lessonFromIndex = targetChapter && lessonIndex >= 0
          ? (targetChapter.lessons[lessonIndex] ?? null)
          : null
        const targetLesson = lessonFromSelection ?? lessonFromIndex ?? targetChapter?.lessons[0] ?? null

        const quizFromIndex = targetLesson && quizIndex >= 0
          ? (targetLesson.quizzes[quizIndex] ?? null)
          : null
        const targetQuiz = quizFromIndex
          ?? targetLesson?.quizzes.find((item) => item.id === quiz.id)
          ?? null

        const targetQuestionFromIndex = targetQuiz && targetQuestionIndex >= 0
          ? (targetQuiz.questions[targetQuestionIndex] ?? null)
          : null
        const targetQuestion = targetQuiz?.questions.find((item) => item.id === questionId)
          ?? targetQuestionFromIndex
          ?? null

        if (!targetChapter || !targetLesson || !targetQuiz?.persistedId || !targetQuestion) {
          setToast({ message: t('drafts.saveBeforeGenerateSingleQuizQuestion'), type: 'warning' })
          return
        }

        targetChapterId = targetChapter.id
        targetLessonId = targetLesson.id
        targetQuizId = targetQuiz.id
        targetQuestionId = targetQuestion.id
        persistedQuizId = targetQuiz.persistedId
        setGeneratingSingleQuizQuestionQuizId(targetQuiz.id)
      }

      if (!persistedQuizId) {
        setToast({ message: t('drafts.saveBeforeGenerateSingleQuizQuestion'), type: 'warning' })
        return
      }

      const generatedQuestionPayload = await LearningPathService.generateSingleQuizQuestion(
        persistedQuizId,
        requestedQuestionTypeNumber,
        {
          onLoading: () => setGeneratingSingleQuizQuestionQuizId(targetQuizId),
        },
      )

      const parsedGeneratedQuestion = extractSingleQuizQuestionPayload(generatedQuestionPayload)
      if (!parsedGeneratedQuestion || !parsedGeneratedQuestion.hasExplicitType || !parsedGeneratedQuestion.question.questionText.trim()) {
        setToast({ message: t('drafts.singleQuizQuestionGenerateInvalidPayload'), type: 'warning' })
        return
      }

      if (
        parsedGeneratedQuestion.quizPersistedId
        && !isSameIdentifier(parsedGeneratedQuestion.quizPersistedId, persistedQuizId)
      ) {
        setToast({ message: t('drafts.singleQuizQuestionGenerateInvalidPayload'), type: 'warning' })
        return
      }

      if (parsedGeneratedQuestion.question.type !== requestedQuestionType) {
        setToast({ message: t('drafts.singleQuizQuestionErrorQuestionTypeMismatch'), type: 'warning' })
        return
      }

      let didReplaceQuestion = false
      updateQuiz(targetChapterId, targetLessonId, targetQuizId, (currentQuiz) => {
        let targetFound = false
        const { id: _generatedQuestionId, ...generatedQuestionPatch } = parsedGeneratedQuestion.question
        const nextQuestions = currentQuiz.questions.map((currentQuestion) => {
          if (currentQuestion.id !== targetQuestionId) return currentQuestion
          targetFound = true
          didReplaceQuestion = true
          return {
            ...currentQuestion,
            ...generatedQuestionPatch,
            id: currentQuestion.id,
            persistedId: generatedQuestionPatch.persistedId ?? currentQuestion.persistedId,
          }
        })

        if (!targetFound) {
          return currentQuiz
        }

        return {
          ...currentQuiz,
          questions: nextQuestions,
        }
      })

      if (!didReplaceQuestion) {
        setToast({ message: t('drafts.singleQuizQuestionGenerateInvalidPayload'), type: 'warning' })
        return
      }

      setToast({ message: t('drafts.singleQuizQuestionGenerateSuccess'), type: 'success' })
    } catch (err: any) {
      const toastPayload = resolveSingleQuizQuestionErrorToast(err, t)
      setToast({ message: toastPayload.message, type: toastPayload.type })
    } finally {
      setGeneratingSingleQuizQuestionQuizId(null)
    }
  }

  const saveDraft = async () => {
    const validationError = validateDraftForm(form)
    if (validationError) {
      setToast({ message: validationError, type: 'warning' })
      return
    }

    if (!isCreateMode) {
      setIsVersionUpdateModalOpen(true)
      return
    }

    const result = await persistDraft()
    if (result?.successMessage) {
      setToast({ message: result.successMessage, type: 'success' })
    }
  }

  const handleConfirmVersionUpdate = async (options: {
    increaseVersion: boolean
    versionUpdateType: ManualDraftVersionUpdateType | null
  }) => {
    const result = await persistDraft(options)
    if (!result) return
    setIsVersionUpdateModalOpen(false)
    setToast({ message: result.successMessage, type: 'success' })
  }

  const handleShareDraft = async () => {
    if (!currentPathId || !selectedStudentId) return
    setSharing(true)
    setShareError(null)
    try {
      const conversation = await createOrGetConversation(selectedStudentId)
      await shareToStudent(currentPathId, selectedStudentId)
      navigate(ROUTER.MENTOR_CHAT, { state: { conversationId: conversation.conversationId, toast: { message: t('chat.shareSuccess'), type: 'success' } satisfies ToastState } })
    } catch (err: any) {
      setShareError(resolveShareToStudentErrorMessage(err, t, getApiErrorMessage(err, t('chat.shareError'))))
    } finally {
      setSharing(false)
    }
  }

  const handlePublish = () => {
    const validationError = validateDraftForm(form)
    if (validationError) {
      setToast({ message: validationError, type: 'warning' })
      return
    }
    setIsPublishModalOpen(true)
  }

  const handleConfirmPublish = async (options: {
    increaseVersion: boolean
    versionUpdateType: ManualDraftVersionUpdateType | null
  }) => {
    if (!currentPathId) return
    const validationError = validateDraftForm(form)
    if (validationError) {
      setToast({ message: validationError, type: 'warning' })
      setIsPublishModalOpen(false)
      return
    }
    setPublishing(true)
    try {
      const payload = buildPayload(form, options)
      await LearningPathService.publishLearningPath(currentPathId, payload)
      setIsPublishModalOpen(false)
      setToast({ message: t('drafts.publishSuccess'), type: 'success' })
      navigate(ROUTER.MENTOR_DRAFTS)
    } catch (err: any) {
      const code = err?.response?.data?.errorCode || err?.response?.data?.code
      setIsPublishModalOpen(false)
      if (code === 'CONTENT_INCOMPLETE') {
        setToast({ message: t('drafts.publishErrorContentIncomplete'), type: 'error' })
      } else if (code === 'CHAPTERS_REQUIRED') {
        setToast({ message: t('drafts.publishErrorChaptersRequired'), type: 'error' })
      } else if (code === 'PATH_NOT_IN_DRAFT_STATUS') {
        setToast({ message: t('drafts.publishErrorNotDraft'), type: 'error' })
      } else {
        setToast({ message: getApiErrorMessage(err, t('drafts.publishFailed')), type: 'error' })
      }
    } finally {
      setPublishing(false)
    }
  }

  const contextLabel = useMemo(() => {
    if (currentStep === 'chapters' && activeChapter) return `${t('drafts.contextChapter')}: ${activeChapter.title || t('drafts.untitledChapter')}`
    if (currentStep === 'lesson' && activeChapter && activeLesson) return `${t('drafts.contextChapter')}: ${activeChapter.title || t('drafts.untitledChapter')} · ${t('drafts.contextLesson')}: ${activeLesson.title || t('drafts.untitledLesson')}`
    if (currentStep === 'assessments') {
      if (assessmentTab === 'tasks' && activeChapter) return `${t('drafts.contextTasks')}: ${activeChapter.title || t('drafts.untitledChapter')}`
      if (assessmentTab === 'quizzes' && activeLesson) return `${t('drafts.contextQuizzes')}: ${activeLesson.title || t('drafts.untitledLesson')}`
    }
    return null
  }, [activeChapter, activeLesson, assessmentTab, currentStep, t])

  if (loading) return <Layout sidebar={sidebarConfig}><div style={{ ...shellStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ textAlign: 'center', color: 'var(--accent-primary)' }}><Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" /><p>{t('drafts.loading')}</p></div></div></Layout>
  if (loadError) return <Layout sidebar={sidebarConfig}><div style={shellStyle}><div style={{ ...cardStyle, padding: 20, color: 'var(--danger-primary)' }}>{loadError}</div></div></Layout>

  return (
    <Layout sidebar={sidebarConfig}>
      <div style={shellStyle}>
        <div style={{ maxWidth: 1440, margin: '0 auto', display: 'grid', gap: 20 }}>
          <DraftEditorHeader
            isCreateMode={isCreateMode}
            title={form.title}
            chapterCount={form.chapters.length}
            version={form.version}
            currentStep={currentStep}
            contextLabel={contextLabel}
            canShare={canShare}
            saving={saving}
            sharing={sharing}
            publishing={publishing}
            onBack={() => navigate(ROUTER.MENTOR_DRAFTS)}
            onSave={saveDraft}
            onShare={() => { setShareError(null); setSelectedStudentId(''); setIsShareModalOpen(true) }}
            onPublish={handlePublish}
            onStepChange={setCurrentStep}
          />

          {isSmallScreen ? (
            <ContentNavigator
              chapters={form.chapters}
              activeChapterId={activeChapterId}
              activeLessonId={activeLessonId}
              isCompact
              isOpen={isNavigatorOpen}
              currentStep={currentStep}
              onToggleOpen={() => setIsNavigatorOpen((prev) => !prev)}
              onSelectChapter={(chapterId) => selectChapter(chapterId, 'chapters')}
              onSelectLesson={selectLesson}
              onAddChapter={addChapter}
              onAddLesson={addLesson}
              onMoveChapter={moveChapter}
              onMoveLesson={moveLesson}
              onRemoveChapter={removeChapter}
              onRemoveLesson={removeLesson}
            />
          ) : null}

          <div style={{ display: 'grid', gridTemplateColumns: isSmallScreen ? '1fr' : '320px minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
            {!isSmallScreen ? (
              <ContentNavigator
                chapters={form.chapters}
                activeChapterId={activeChapterId}
                activeLessonId={activeLessonId}
                isCompact={false}
                isOpen
                currentStep={currentStep}
                onToggleOpen={() => {}}
                onSelectChapter={(chapterId) => selectChapter(chapterId, 'chapters')}
                onSelectLesson={selectLesson}
                onAddChapter={addChapter}
                onAddLesson={addLesson}
                onMoveChapter={moveChapter}
                onMoveLesson={moveLesson}
                onRemoveChapter={removeChapter}
                onRemoveLesson={removeLesson}
              />
            ) : null}

            <main style={{ display: 'grid', gap: 20, minWidth: 0 }}>
              {currentStep === 'overview' ? (
                <OverviewStep
                  form={form}
                  subjectSearch={subjectSearch}
                  selectedSubject={selectedSubject}
                  filteredSubjects={filteredSubjects}
                  isSubjectMenuOpen={isSubjectMenuOpen}
                  subjectPickerRef={subjectPickerRef}
                  generatingAiDraft={generatingAiDraft}
                  saving={saving}
                  levelOptions={LEVEL_OPTIONS}
                  onFormChange={(updater) => setForm((prev) => updater(prev))}
                  onToggleGoal={toggleGoal}
                  onSetPrimaryWeight={setPrimaryWeight}
                  onSelectSubject={selectSubject}
                  onSubjectSearchChange={(value) => {
                    setSubjectSearch(value)
                    setIsSubjectMenuOpen(true)
                    if (selectedSubject && value !== selectedSubject.name) setForm((prev) => ({ ...prev, subjectId: '', goals: [] }))
                  }}
                  onSubjectMenuToggle={(next) => setIsSubjectMenuOpen((prev) => next ?? !prev)}
                  onGenerateAiDraft={generateAiDraftFromSettings}
                  isCreateMode={isCreateMode}
                />
              ) : null}

              {currentStep === 'chapters' ? (
                <ChaptersStep
                  activeChapter={activeChapter}
                  generatingChapterSkeleton={isGeneratingActiveChapterSkeleton}
                  disableChapterSkeletonAction={saving || hasPendingChapterSkeletonGeneration}
                  onUpdateChapter={(updater) => activeChapter ? updateChapter(activeChapter.id, updater) : undefined}
                  onUpdateLesson={(lessonId, updater) => activeChapter ? updateLesson(activeChapter.id, lessonId, updater) : undefined}
                  onOpenLessonStudio={(lessonId) => activeChapter ? selectLesson(activeChapter.id, lessonId, 'lesson') : undefined}
                  onGenerateChapterSkeleton={generateChapterMentorSkeletonForActiveChapter}
                />
              ) : null}

              {currentStep === 'lesson' ? (
                <LessonStudioStep
                  activeChapter={activeChapter}
                  activeLesson={activeLesson}
                  isGeneratingLessonContent={isGeneratingActiveMentorLessonContent}
                  isQuizSkeletonLoading={isQuizSkeletonLoading}
                  hasQuizSkeleton={hasQuizSkeleton}
                  quizSkeletonError={quizSkeletonError}
                  onGenerateLessonContent={generateMentorLessonContentForActiveLesson}
                  onUpdateLesson={(updater) => activeChapter && activeLesson ? updateLesson(activeChapter.id, activeLesson.id, updater) : undefined}
                />
              ) : null}

              {currentStep === 'assessments' ? (
                <AssessmentsStep
                  assessmentTab={assessmentTab}
                  activeChapter={activeChapter}
                  activeLesson={activeLesson}
                  generatingTaskId={generatingTaskId}
                  generatingSingleQuizSkeleton={isGeneratingActiveSingleQuizSkeleton}
                  generatingSingleQuizQuestionQuizId={generatingSingleQuizQuestionQuizId}
                  saving={saving}
                  onAssessmentTabChange={setAssessmentTab}
                  onAddTask={() => activeChapter ? addTask(activeChapter.id) : undefined}
                  onUpdateTask={(taskId, updater) => activeChapter ? updateTask(activeChapter.id, taskId, updater) : undefined}
                  onRemoveTask={(taskId) => activeChapter ? removeTask(activeChapter.id, taskId) : undefined}
                  onGenerateTask={(task) => activeChapter ? generateAiTaskForChapter(activeChapter.id, task.id) : undefined}
                  onAddQuiz={() => activeChapter && activeLesson ? addQuiz(activeChapter.id, activeLesson.id) : undefined}
                  onUpdateQuiz={(quizId, updater) => activeChapter && activeLesson ? updateQuiz(activeChapter.id, activeLesson.id, quizId, updater) : undefined}
                  onRemoveQuiz={(quizId) => activeChapter && activeLesson ? removeQuiz(activeChapter.id, activeLesson.id, quizId) : undefined}
                  onGenerateSingleQuizQuestion={generateSingleQuizQuestionForQuiz}
                  onAddQuestion={(quizId) => activeChapter && activeLesson ? addQuestion(activeChapter.id, activeLesson.id, quizId) : undefined}
                  onUpdateQuestion={(quizId, questionId, updater) => activeChapter && activeLesson ? updateQuestion(activeChapter.id, activeLesson.id, quizId, questionId, updater) : undefined}
                  onRemoveQuestion={(quizId, questionId) => activeChapter && activeLesson ? removeQuestion(activeChapter.id, activeLesson.id, quizId, questionId) : undefined}
                  onGenerateSingleQuizSkeleton={generateSingleQuizSkeletonForActiveLesson}
                />
              ) : null}
            </main>
          </div>
        </div>

        <ShareLearningPathModal
          isOpen={isShareModalOpen}
          title={t('chat.shareTitle')}
          studentLabel={t('chat.selectStudent')}
          pathLabel={t('chat.selectPath', { defaultValue: 'Select learning path' })}
          selectStudentPlaceholder={t('chat.selectStudent')}
          selectPathPlaceholder={t('chat.selectPath', { defaultValue: 'Select learning path' })}
          submitLabel={t('chat.sharePath')}
          submittingLabel={t('chat.sharing')}
          closeLabel={t('drafts.close', { defaultValue: 'Close' })}
          students={studentOptions}
          paths={canShare ? [{ id: currentPathId, label: form.title.trim() || t('chat.untitledPath', { defaultValue: 'Untitled learning path' }) }] : []}
          selectedStudentId={selectedStudentId}
          selectedPathId={currentPathId}
          onSelectStudent={setSelectedStudentId}
          onSelectPath={() => {}}
          onClose={() => setIsShareModalOpen(false)}
          onSubmit={handleShareDraft}
          error={shareError}
          submitting={sharing}
          lockPath
        />
        <VersionUpdateModal
          isOpen={isVersionUpdateModalOpen}
          saving={saving}
          onClose={() => setIsVersionUpdateModalOpen(false)}
          onSubmit={handleConfirmVersionUpdate}
        />
        <PublishModal
          isOpen={isPublishModalOpen}
          publishing={publishing}
          onClose={() => setIsPublishModalOpen(false)}
          onSubmit={handleConfirmPublish}
        />
        {toast ? <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 50 }}><Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} /></div> : null}

        {/* Floating review button when opened from chat review request */}
        {reviewPathId && (
          <button
            onClick={() => setShowReviewModal(true)}
            style={{ position: 'fixed', bottom: 80, right: 24, zIndex: 100, display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            ✉️ Gửi review cho student
          </button>
        )}

        {/* Review submit modal */}
        {showReviewModal && reviewPathId && (
          <ReviewSubmitModal
            originalPathId={reviewPathId}
            onClose={() => setShowReviewModal(false)}
            onSuccess={() => { setShowReviewModal(false); navigate(-1) }}
          />
        )}
      </div>
    </Layout>
  )
}

// ── Review Submit Modal ───────────────────────────────────────────────────────
const REVIEW_DRAFT_KEY = (pathId: string) => `review_draft:${pathId}`

function ReviewSubmitModal({ originalPathId, onClose, onSuccess }: {
  originalPathId: string
  onClose: () => void; onSuccess: () => void
}) {
  // Persist draft to sessionStorage so data survives close/reopen
  const draftKey = REVIEW_DRAFT_KEY(originalPathId)
  const loadDraft = () => {
    try { return JSON.parse(sessionStorage.getItem(draftKey) || '{}') } catch { return {} }
  }
  const saved = loadDraft()

  const [changeSummary, setChangeSummary] = useState<string>(saved.changeSummary || '')
  const [changeReason, setChangeReason] = useState<string>(saved.changeReason || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Save to sessionStorage on every change
  const persist = (summary: string, reason: string) => {
    try { sessionStorage.setItem(draftKey, JSON.stringify({ changeSummary: summary, changeReason: reason })) } catch { }
  }

  const handleClose = () => {
    persist(changeSummary, changeReason)
    onClose()
  }

  const ta: React.CSSProperties = {
    width: '100%', padding: '10px 14px', background: 'var(--bg-main)',
    border: '1px solid var(--border-base)', borderRadius: 8, color: 'var(--text-primary)',
    fontSize: 14, resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6,
    fontFamily: 'inherit',
  }
  const lbl: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 8 }

  const handleSubmit = async () => {
    if (!changeSummary.trim()) { setError('Vui lòng nhập tóm tắt thay đổi.'); return }
    setSubmitting(true); setError(null)
    try {
      await LearningPathService.submitMentorReview(originalPathId, {
        score: 5,
        feedback: changeSummary.trim(),
        changeSummary: changeSummary.trim() || null,
        changeReason: changeReason.trim() || null,
      })
      // Clear draft on success
      try { sessionStorage.removeItem(draftKey) } catch { }
      setSuccess(true)
      setTimeout(onSuccess, 1200)
    } catch (e: any) {
      setError(resolveMentorReviewError(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}
      onClick={handleClose}>
      <div style={{ background: 'var(--bg-surface)', borderRadius: 12, maxWidth: 500, width: '100%', border: '1px solid var(--border-base)', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-base)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Gửi review cho student</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Nội dung được lưu tự động khi đóng</div>
          </div>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 6, display: 'flex', borderRadius: 6, fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: '20px 24px' }}>
          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>Tóm tắt thay đổi *</label>
            <textarea value={changeSummary}
              onChange={e => { setChangeSummary(e.target.value); persist(e.target.value, changeReason) }}
              rows={4} placeholder="Đổi thứ tự chapter, thêm task thực chiến..." style={ta}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border-base)'} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={lbl}>Lý do thay đổi</label>
            <textarea value={changeReason}
              onChange={e => { setChangeReason(e.target.value); persist(changeSummary, e.target.value) }}
              rows={3} placeholder="Để student có output sớm, bám mục tiêu tuyển dụng..." style={ta}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border-base)'} />
          </div>
          {error && <div style={{ fontSize: 13, color: 'var(--danger-primary)', marginBottom: 14, padding: '10px 14px', background: 'rgba(220,38,38,0.06)', borderRadius: 8 }}>{error}</div>}
          {success && <div style={{ fontSize: 13, color: 'var(--success-primary)', marginBottom: 14, padding: '10px 14px', background: 'rgba(34,197,94,0.08)', borderRadius: 8 }}>✓ Đã gửi review thành công!</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={handleClose} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--border-base)', borderRadius: 8, fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit' }}>Đóng</button>
            <button onClick={handleSubmit} disabled={submitting || success}
              style={{ padding: '10px 24px', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: (submitting || success) ? 'not-allowed' : 'pointer', opacity: (submitting || success) ? 0.7 : 1, fontFamily: 'inherit' }}>
              {submitting ? 'Đang gửi...' : 'Gửi review'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MentorDraftFormPage
