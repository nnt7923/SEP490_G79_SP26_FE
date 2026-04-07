import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../../../../components/Layout'
import Toast from '../../../../components/Toast'
import ROUTER from '../../../../router/ROUTER'
import { SubjectService } from '../../../../services'
import LearningPathService, { type SkeletonResponse } from '../../../../services/LearningPathService'
import { useMentorSidebarConfig } from '../components/MentorSideBar'
import ShareLearningPathModal from '../../../../components/Chat/ShareLearningPathModal'
import { createOrGetConversation, getContacts } from '../../../../services/DirectChatService'
import { shareToStudent } from '../../../../services/LearningPathShareService'
import { resolveShareToStudentErrorMessage } from '../../../../services/LearningPathShareService/shareErrorMessage'
import { requestChapterTasks, requestQuizQuestions } from '../../../../services/SignalR'
import { useResponsive } from '../../../../hook/useResponsive'
import OverviewStep from './components/OverviewStep'
import ChaptersStep from './components/ChaptersStep'
import LessonStudioStep from './components/LessonStudioStep'
import AssessmentsStep from './components/AssessmentsStep'
import { ContentNavigator, DraftEditorHeader } from './components/EditorChrome'
import { cardStyle, shellStyle } from './components/editorUi'
import { parseLessonSections } from './lessonContentContract'
import {
  LEVEL_OPTIONS,
  buildPayload,
  createSelectionSnapshot,
  emptyChapter,
  emptyLesson,
  emptyQuiz,
  emptyTask,
  extractQuizQuestionsJsonPayload,
  hydrateDraftForm,
  mergeLessonQuizzesWithSkeleton,
  normalizeJsonField,
  parseQuizSkeletonPayload,
  normalizeTaskStatus,
  normalizeTaskType,
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

const sortGoalsBySubjectOrder = (
  goals: DraftFormState['goals'],
  subject: SubjectOption | null,
) => {
  if (!subject || goals.length < 2) return goals
  const order = new Map(subject.goals.map((goal, index) => [goal.goalId, index]))
  return [...goals].sort((a, b) => (order.get(a.goalId) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.goalId) ?? Number.MAX_SAFE_INTEGER))
}

const MentorDraftFormPage: React.FC = () => {
  const { pathId } = useParams()
  const isCreateMode = !pathId
  const navigate = useNavigate()
  const location = useLocation() as { state?: { draft?: SkeletonResponse; toast?: ToastState } }
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
  const [generatingLessonId, setGeneratingLessonId] = useState<string | null>(null)
  const [isQuizSkeletonLoading, setIsQuizSkeletonLoading] = useState(false)
  const [hasQuizSkeleton, setHasQuizSkeleton] = useState(false)
  const [quizSkeletonError, setQuizSkeletonError] = useState<string | null>(null)
  const [generatingTaskChapterId, setGeneratingTaskChapterId] = useState<string | null>(null)
  const [generatingQuizId, setGeneratingQuizId] = useState<string | null>(null)
  const [generatingAllLessonQuizzes, setGeneratingAllLessonQuizzes] = useState(false)
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
  const [isNavigatorOpen, setIsNavigatorOpen] = useState(!isSmallScreen)
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
  const canGenerateActiveLesson = !!activeLesson?.persistedId
  const isGeneratingActiveLesson = activeLesson?.id != null && generatingLessonId === activeLesson.id

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
    setActiveLessonId(chapter.lessons[0].id)
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
      setActiveLessonId(fallback.lessons[0].id)
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

  type QuizSkeletonHandlingStatus = 'applied' | 'empty' | 'invalid' | 'missing'

  const applyQuizSkeletonToLesson = (
    chapterId: string,
    lessonId: string,
    quizSkeleton: unknown,
  ): QuizSkeletonHandlingStatus => {
    if (quizSkeleton == null) return 'missing'

    const parsedQuizSkeleton = parseQuizSkeletonPayload(quizSkeleton)
    if (!parsedQuizSkeleton.hasQuizArray) return 'invalid'
    if (parsedQuizSkeleton.rawItemCount > 0 && parsedQuizSkeleton.items.length === 0) return 'invalid'
    if (parsedQuizSkeleton.items.length === 0) return 'empty'

    updateLesson(chapterId, lessonId, (lesson) => ({
      ...lesson,
      quizzes: mergeLessonQuizzesWithSkeleton(lesson.quizzes, parsedQuizSkeleton.items),
    }))

    return 'applied'
  }

  const getQuizSkeletonValidationMessage = (status: QuizSkeletonHandlingStatus): string | null => {
    if (status === 'empty') return t('drafts.quizSkeletonGenerateEmpty')
    if (status === 'invalid') return t('drafts.quizSkeletonGenerateInvalidPayload')
    if (status === 'missing') return t('drafts.quizSkeletonGenerateMissingEvent')
    return null
  }

  const applyQuizSkeletonUiState = (status: QuizSkeletonHandlingStatus, errorMessage?: string | null) => {
    setIsQuizSkeletonLoading(false)
    if (status === 'applied') {
      setHasQuizSkeleton(true)
      setQuizSkeletonError(null)
      return
    }

    setHasQuizSkeleton(false)
    setQuizSkeletonError(errorMessage ?? (status === 'missing' ? null : getQuizSkeletonValidationMessage(status)))
  }

  const generateAiLessonContent = async () => {
    if (!activeChapter || !activeLesson) return
    if (!activeLesson.persistedId) {
      setToast({ message: t('drafts.saveBeforeGenerateLesson'), type: 'warning' })
      return
    }

    setGeneratingLessonId(activeLesson.id)
    setIsQuizSkeletonLoading(false)
    setHasQuizSkeleton(false)
    setQuizSkeletonError(null)

    try {
      let didReceiveQuizSkeleton = false
      let skeletonFailureMessage: string | null = null

      const result = await LearningPathService.generateLessonContent(activeLesson.persistedId, undefined, {
        onLoading: () => {
          setIsQuizSkeletonLoading(true)
          setQuizSkeletonError(null)
        },
        onSuccess: (quizSkeleton) => {
          didReceiveQuizSkeleton = true
          const status = applyQuizSkeletonToLesson(activeChapter.id, activeLesson.id, quizSkeleton)
          if (status !== 'applied') {
            skeletonFailureMessage = getQuizSkeletonValidationMessage(status)
          }
          applyQuizSkeletonUiState(status, skeletonFailureMessage)
        },
        onError: (err) => {
          skeletonFailureMessage = getApiErrorMessage(err, t('drafts.lessonQuizSkeletonFailed'))
          applyQuizSkeletonUiState('invalid', skeletonFailureMessage)
        },
      })

      if (!didReceiveQuizSkeleton && result?.quizSkeleton) {
        didReceiveQuizSkeleton = true
        const status = applyQuizSkeletonToLesson(activeChapter.id, activeLesson.id, result.quizSkeleton)
        if (status !== 'applied') {
          skeletonFailureMessage = getQuizSkeletonValidationMessage(status)
        }
        applyQuizSkeletonUiState(status, skeletonFailureMessage)
      }

      const generatedContent = typeof result === 'string' ? result : result?.content ?? result?.markdown ?? result?.body ?? result?.text ?? ''
      if (!generatedContent.trim()) {
        setToast({ message: t('drafts.lessonGenerateEmpty'), type: 'warning' })
        return
      }
      updateLesson(activeChapter.id, activeLesson.id, (lesson) => ({
        ...lesson,
        title: result?.title?.trim() || lesson.title,
        lessonDay: result?.lessonDay ? new Date(result.lessonDay).toISOString().slice(0, 10) : lesson.lessonDay,
        sections: parseLessonSections(generatedContent),
      }))

      if (skeletonFailureMessage) {
        setToast({ message: t('drafts.lessonGeneratePartialWithQuizError'), type: 'warning' })
      } else {
        setToast({ message: t('drafts.lessonGenerateSuccess'), type: 'success' })
      }
    } catch (err: any) {
      setToast({ message: getApiErrorMessage(err, t('drafts.lessonGenerateFailed')), type: 'error' })
    } finally {
      setIsQuizSkeletonLoading(false)
      setGeneratingLessonId(null)
    }
  }

  const generateAiTasks = async () => {
    if (!activeChapter) return
    if (!activeChapter.persistedId) {
      setToast({ message: t('drafts.saveBeforeGenerateTasks'), type: 'warning' })
      return
    }
    setGeneratingTaskChapterId(activeChapter.id)
    try {
      const result = await requestChapterTasks(activeChapter.persistedId)
      const rawTasks: any[] = Array.isArray(result) ? result : Array.isArray(result?.tasks) ? result.tasks : []
      if (rawTasks.length === 0) {
        setToast({ message: t('drafts.tasksGenerateEmpty'), type: 'warning' })
        return
      }
      const newTasks = rawTasks.map((task: any) => ({
        id: `task-${Math.random().toString(36).slice(2, 10)}`,
        persistedId: task?.id ?? task?.taskId ?? null,
        title: task?.title ?? '',
        description: task?.description ?? '',
        priority: task?.priority != null ? String(task.priority) : '',
        taskStatus: normalizeTaskStatus(task?.taskStatus ?? task?.TaskStatus),
        dueDate: task?.dueDate ?? task?.DueDate ? new Date(task?.dueDate ?? task?.DueDate).toISOString().slice(0, 10) : '',
        taskType: normalizeTaskType(task?.taskType ?? task?.TaskType),
        quizQuestionsJson: normalizeJsonField(task?.quizQuestionsJson ?? task?.QuizQuestionsJson),
      }))
      updateChapter(activeChapter.id, (chapter) => ({ ...chapter, tasks: [...chapter.tasks, ...newTasks] }))
      setToast({ message: t('drafts.tasksGenerateSuccess'), type: 'success' })
    } catch (err: any) {
      setToast({ message: getApiErrorMessage(err, t('drafts.tasksGenerateFailed')), type: 'error' })
    } finally {
      setGeneratingTaskChapterId(null)
    }
  }

  const generateAiQuizQuestions = async (chapterId: string, lessonId: string, quiz: EditableQuiz) => {
    const chapterIndex = form.chapters.findIndex((chapter) => chapter.id === chapterId)
    const lessonIndex = form.chapters[chapterIndex]?.lessons.findIndex((lesson) => lesson.id === lessonId) ?? -1
    const quizIndex = form.chapters[chapterIndex]?.lessons[lessonIndex]?.quizzes.findIndex((item) => item.id === quiz.id) ?? -1

    let targetQuiz = quiz

    if (!targetQuiz.persistedId) {
      if (!currentPathId || chapterIndex < 0 || lessonIndex < 0 || quizIndex < 0) {
        setToast({ message: t('drafts.saveBeforeGenerateQuiz'), type: 'warning' })
        return
      }

      setSaving(true)
      try {
        const response = await LearningPathService.updateManualDraft(currentPathId, buildPayload(form))
        const latestDraft = await LearningPathService.getMyDraftDetail(currentPathId).catch(() => response)
        const nextForm = hydrateDraftForm(latestDraft, form)
        const nextChapter = nextForm.chapters[chapterIndex] ?? null
        const nextLesson = nextChapter?.lessons[lessonIndex] ?? null
        const nextQuiz = nextLesson?.quizzes[quizIndex] ?? null

        setForm(nextForm)
        setActiveChapterId(nextChapter?.id ?? nextForm.chapters[0]?.id ?? null)
        setActiveLessonId(nextLesson?.id ?? nextChapter?.lessons[0]?.id ?? null)

        if (!nextQuiz?.persistedId) {
          setToast({ message: t('drafts.saveBeforeGenerateQuiz'), type: 'warning' })
          return
        }

        targetQuiz = nextQuiz
      } catch (err: any) {
        setToast({ message: getApiErrorMessage(err, t('drafts.saveFailed')), type: 'error' })
        return
      } finally {
        setSaving(false)
      }
    }

    setGeneratingQuizId(targetQuiz.id)
    try {
      const persistedQuizId = targetQuiz.persistedId
      if (!persistedQuizId) {
        setToast({ message: t('drafts.saveBeforeGenerateQuiz'), type: 'warning' })
        return
      }

      const result = await requestQuizQuestions(persistedQuizId)
      const normalized = extractQuizQuestionsJsonPayload(result)
      if (!normalized.trim()) {
        setToast({ message: t('drafts.quizGenerateEmpty'), type: 'warning' })
        return
      }
      updateQuiz(chapterId, lessonId, targetQuiz.id, (item) => ({ ...item, quizQuestionsJson: normalized }))
      setToast({ message: t('drafts.quizGenerateSuccess'), type: 'success' })
    } catch (err: any) {
      setToast({ message: getApiErrorMessage(err, t('drafts.quizGenerateFailed')), type: 'error' })
    } finally {
      setGeneratingQuizId(null)
    }
  }

  const generateAiQuizQuestionsForAllLessons = async () => {
    if (!activeChapter || !activeLesson) {
      setToast({ message: t('drafts.noLessonSelected'), type: 'warning' })
      return
    }

    if (!activeLesson.persistedId) {
      setToast({ message: t('drafts.saveBeforeGenerateLesson'), type: 'warning' })
      return
    }

    setGeneratingAllLessonQuizzes(true)
    setIsQuizSkeletonLoading(true)
    setHasQuizSkeleton(false)
    setQuizSkeletonError(null)

    try {
      const quizSkeleton = await LearningPathService.generateLessonQuizSkeleton(activeLesson.persistedId, {
        onLoading: () => {
          setIsQuizSkeletonLoading(true)
          setQuizSkeletonError(null)
        },
      })

      const status = applyQuizSkeletonToLesson(activeChapter.id, activeLesson.id, quizSkeleton)
      applyQuizSkeletonUiState(status)
      if (status !== 'applied') {
        const message = getQuizSkeletonValidationMessage(status)
        setToast({ message: message ?? t('drafts.quizSkeletonGenerateFailed'), type: status === 'missing' || status === 'empty' || status === 'invalid' ? 'warning' : 'error' })
        return
      }
      setToast({ message: t('drafts.quizSkeletonGenerateSuccess'), type: 'success' })
    } catch (err: any) {
      setHasQuizSkeleton(false)
      setQuizSkeletonError(getApiErrorMessage(err, t('drafts.quizSkeletonGenerateFailed')))
      setToast({ message: getApiErrorMessage(err, t('drafts.quizSkeletonGenerateFailed')), type: 'error' })
    } finally {
      setIsQuizSkeletonLoading(false)
      setGeneratingAllLessonQuizzes(false)
    }
  }

  const saveDraft = async () => {
    const validationError = validateDraftForm(form)
    if (validationError) {
      setToast({ message: validationError, type: 'warning' })
      return
    }
    const previousTitle = form.title
    setSaving(true)
    const selectionSnapshot = createSelectionSnapshot(form, activeChapterId, activeLessonId)
    try {
      const response = isCreateMode
        ? await LearningPathService.createManualDraft(buildPayload(form))
        : await LearningPathService.updateManualDraft(pathId as string, buildPayload(form))
      const resolvedPathId = String(response?.pathId ?? pathId ?? '')
      const latestDraft = resolvedPathId
        ? await LearningPathService.getMyDraftDetail(resolvedPathId).catch(() => response)
        : response
      const nextForm = hydrateDraftForm(latestDraft, form)
      const nextSelection = restoreSelectionSnapshot(nextForm, selectionSnapshot)
      setForm(nextForm)
      setActiveChapterId(nextSelection.chapterId)
      setActiveLessonId(nextSelection.lessonId)
      const successMessage = isCreateMode
        ? t('drafts.manualCreateSuccess')
        : resolveDraftUpdateSuccessMessage(response, latestDraft, previousTitle, t)
      setToast({ message: successMessage, type: 'success' })
      if (isCreateMode && response?.pathId) navigate(ROUTER.MENTOR_DRAFT_DETAIL.replace(':pathId', String(response.pathId)), { replace: true, state: { draft: response } })
    } catch (err: any) {
      setToast({ message: getApiErrorMessage(err, t('drafts.saveFailed')), type: 'error' })
    } finally {
      setSaving(false)
    }
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
            currentStep={currentStep}
            contextLabel={contextLabel}
            canShare={canShare}
            saving={saving}
            sharing={sharing}
            onBack={() => navigate(ROUTER.MENTOR_DRAFTS)}
            onSave={saveDraft}
            onShare={() => { setShareError(null); setSelectedStudentId(''); setIsShareModalOpen(true) }}
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
                  onUpdateChapter={(updater) => activeChapter ? updateChapter(activeChapter.id, updater) : undefined}
                  onUpdateLesson={(lessonId, updater) => activeChapter ? updateLesson(activeChapter.id, lessonId, updater) : undefined}
                  onOpenLessonStudio={(lessonId) => activeChapter ? selectLesson(activeChapter.id, lessonId, 'lesson') : undefined}
                />
              ) : null}

              {currentStep === 'lesson' ? (
                <LessonStudioStep
                  activeChapter={activeChapter}
                  activeLesson={activeLesson}
                  canGenerateActiveLesson={canGenerateActiveLesson}
                  isGeneratingActiveLesson={isGeneratingActiveLesson}
                  isQuizSkeletonLoading={isQuizSkeletonLoading}
                  hasQuizSkeleton={hasQuizSkeleton}
                  quizSkeletonError={quizSkeletonError}
                  onGenerateLessonContent={generateAiLessonContent}
                  onUpdateLesson={(updater) => activeChapter && activeLesson ? updateLesson(activeChapter.id, activeLesson.id, updater) : undefined}
                />
              ) : null}

              {currentStep === 'assessments' ? (
                <AssessmentsStep
                  assessmentTab={assessmentTab}
                  activeChapter={activeChapter}
                  activeLesson={activeLesson}
                  generatingTaskChapterId={generatingTaskChapterId}
                  generatingQuizId={generatingQuizId}
                  generatingAllLessonQuizzes={generatingAllLessonQuizzes}
                  saving={saving}
                  onAssessmentTabChange={setAssessmentTab}
                  onGenerateTasks={generateAiTasks}
                  onAddTask={() => activeChapter ? addTask(activeChapter.id) : undefined}
                  onUpdateTask={(taskId, updater) => activeChapter ? updateTask(activeChapter.id, taskId, updater) : undefined}
                  onRemoveTask={(taskId) => activeChapter ? removeTask(activeChapter.id, taskId) : undefined}
                  onAddQuiz={() => activeChapter && activeLesson ? addQuiz(activeChapter.id, activeLesson.id) : undefined}
                  onUpdateQuiz={(quizId, updater) => activeChapter && activeLesson ? updateQuiz(activeChapter.id, activeLesson.id, quizId, updater) : undefined}
                  onRemoveQuiz={(quizId) => activeChapter && activeLesson ? removeQuiz(activeChapter.id, activeLesson.id, quizId) : undefined}
                  onGenerateQuiz={(quiz) => activeChapter && activeLesson ? generateAiQuizQuestions(activeChapter.id, activeLesson.id, quiz) : undefined}
                  onGenerateAllLessonQuizzes={generateAiQuizQuestionsForAllLessons}
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
        {toast ? <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 50 }}><Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} /></div> : null}
      </div>
    </Layout>
  )
}

export default MentorDraftFormPage
