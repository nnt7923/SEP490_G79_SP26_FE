import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { ArrowLeft, BookOpen, ChevronDown, ChevronUp, Loader2, Plus, Save, Share2, Sparkles, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Layout from '../../../../components/Layout'
import Toast from '../../../../components/Toast'
import ROUTER from '../../../../router/ROUTER'
import { SubjectService, LanguageSelection } from '../../../../services'
import LearningPathService, { type ManualDraftPayload, type SkeletonResponse } from '../../../../services/LearningPathService'
import LessonContent from '../../Plans/components/LessonContent'
import { useMentorSidebarConfig } from '../components/MentorSideBar'
import { buildLessonContentFromSections, createEmptyLessonSections, parseLessonSections, SECTION_KEYS, SECTION_LABELS, type LessonSectionKey } from './lessonContentContract'
import { createOrGetConversation, getContacts } from '../../../../services/DirectChatService'
import { shareToStudent } from '../../../../services/LearningPathShareService'
import ShareLearningPathModal from '../../../../components/Chat/ShareLearningPathModal'
import { requestChapterTasks, requestQuizQuestions } from '../../../../services/SignalR'

type ToastState = { message: string; type: 'success' | 'error' | 'warning' | 'info' }
type Level = 'Beginner' | 'Intermediate' | 'Advanced'
type EditorTab = 'structure' | 'lesson'
type SubjectOption = { id: string; name: string; goals: Array<{ goalId: string; title: string }> }
type EditableQuiz = { id: string; persistedId: string | null; title: string; description: string; quizQuestionsJson: string }
type EditableTask = { id: string; persistedId: string | null; title: string; description: string; priority: string; taskStatus: string; dueDate: string; taskType: string; quizQuestionsJson: string }
type EditableLesson = { id: string; persistedId: string | null; title: string; lessonDay: string; sections: Record<LessonSectionKey, string>; quizzes: EditableQuiz[] }
type EditableChapter = { id: string; persistedId: string | null; title: string; content: string; startDate: string; endDate: string; estimatedDays: string; lessons: EditableLesson[]; tasks: EditableTask[] }
type DraftFormState = {
  subjectId: string
  goals: Array<{ goalId: string; weight: number }>
  complexityLevel: Level
  languageSelection: number
  title: string
  description: string
  startDate: string
  endDate: string
  chapters: EditableChapter[]
}

const LEVEL_OPTIONS: Level[] = ['Beginner', 'Intermediate', 'Advanced']
const TASK_TYPE_OPTIONS = ['Practice', 'Theory', 'Quizz']
const TASK_STATUS_OPTIONS = ['Pending', 'InProgress', 'Completed']
const SECTION_HINT_KEYS: Record<LessonSectionKey, string> = {
  overview: 'drafts.sectionHints.overview',
  'core-concepts': 'drafts.sectionHints.coreConcepts',
  'code-examples': 'drafts.sectionHints.codeExamples',
  'common-mistakes': 'drafts.sectionHints.commonMistakes',
  'best-practices': 'drafts.sectionHints.bestPractices',
  summary: 'drafts.sectionHints.summary',
}

const shellStyle: React.CSSProperties = { minHeight: '100vh', padding: 24, background: 'var(--bg-main)', fontFamily: 'monospace' }
const cardStyle: React.CSSProperties = { background: 'var(--bg-surface)', border: '1px solid var(--border-base)', borderRadius: 4 }
const buttonStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 4, border: '1px solid var(--border-base)', background: 'var(--bg-surface)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid var(--border-base)', borderRadius: 4, background: 'var(--bg-main)', color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none' }
const textAreaStyle: React.CSSProperties = { ...inputStyle, minHeight: 110, resize: 'vertical' }

const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`
const toDateInput = (value?: string | null) => value ? new Date(value).toISOString().slice(0, 10) : ''
const toIsoDate = (value?: string) => value ? new Date(`${value}T00:00:00.000Z`).toISOString() : undefined
const extractMarkdown = (payload: any): string => typeof payload === 'string' ? payload : payload?.content ?? payload?.markdown ?? payload?.body ?? payload?.text ?? ''
const normalizeJsonField = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (value == null || value === '') return ''
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}
const normalizeTaskType = (value: unknown): string => {
  if (value === 0 || String(value).trim() === '0') return 'Practice'
  if (value === 1 || String(value).trim() === '1') return 'Theory'
  if (value === 2 || String(value).trim() === '2') return 'Quizz'
  const normalized = String(value ?? '').trim()
  return TASK_TYPE_OPTIONS.includes(normalized) ? normalized : 'Practice'
}
const normalizeTaskStatus = (value: unknown): string => {
  if (value === 0 || String(value).trim() === '0') return 'Pending'
  if (value === 1 || String(value).trim() === '1') return 'InProgress'
  if (value === 2 || String(value).trim() === '2') return 'Completed'
  const normalized = String(value ?? '').trim()
  return TASK_STATUS_OPTIONS.includes(normalized) ? normalized : 'Pending'
}
const normalizeLanguage = (value: unknown) => value === 'English' ? LanguageSelection.English : value === 'VietNamese' || value === 'Vietnamese' ? LanguageSelection.Vietnamese : typeof value === 'number' ? value : LanguageSelection.Vietnamese
const emptyQuiz = (): EditableQuiz => ({ id: uid('quiz'), persistedId: null, title: '', description: '', quizQuestionsJson: '' })
const emptyTask = (): EditableTask => ({ id: uid('task'), persistedId: null, title: '', description: '', priority: '', taskStatus: 'Pending', dueDate: '', taskType: 'Practice', quizQuestionsJson: '' })
const emptyLesson = (): EditableLesson => ({ id: uid('lesson'), persistedId: null, title: '', lessonDay: '', sections: createEmptyLessonSections(), quizzes: [] })
const emptyChapter = (): EditableChapter => ({ id: uid('chapter'), persistedId: null, title: '', content: '', startDate: '', endDate: '', estimatedDays: '', lessons: [emptyLesson()], tasks: [] })
const emptyForm = (): DraftFormState => ({ subjectId: '', goals: [], complexityLevel: 'Beginner', languageSelection: LanguageSelection.Vietnamese, title: '', description: '', startDate: '', endDate: '', chapters: [emptyChapter()] })

const extractGoals = (payload: any) => {
  const source = Array.isArray(payload?.goals) ? payload.goals : Array.isArray(payload?.goalDtos) ? payload.goalDtos : payload?.goalId ? [{ goalId: payload.goalId, weight: 100 }] : []
  return source.map((goal: any) => ({ goalId: String(goal?.goalId ?? goal?.id ?? ''), weight: Number(goal?.weight ?? 100) })).filter((goal: any) => goal.goalId).slice(0, 2)
}

const hydrateDraftForm = (payload?: SkeletonResponse | null): DraftFormState => {
  if (!payload) return emptyForm()
  const chapters = Array.isArray(payload?.chapters) && payload.chapters.length > 0
    ? payload.chapters.map((chapter: any) => ({
      id: String(chapter?.id ?? chapter?.chapterId ?? uid('chapter')),
      persistedId: chapter?.id != null || chapter?.chapterId != null ? String(chapter?.id ?? chapter?.chapterId) : null,
      title: chapter?.title ?? '',
      content: chapter?.content ?? '',
      startDate: toDateInput(chapter?.startDate ?? chapter?.StartDate),
      endDate: toDateInput(chapter?.endDate ?? chapter?.EndDate),
      estimatedDays: chapter?.estimatedDays != null ? String(chapter.estimatedDays) : '',
      lessons: Array.isArray(chapter?.lessons) && chapter.lessons.length > 0
        ? chapter.lessons.map((lesson: any) => ({
          id: String(lesson?.id ?? lesson?.lessonId ?? uid('lesson')),
          persistedId: lesson?.id != null || lesson?.lessonId != null ? String(lesson?.id ?? lesson?.lessonId) : null,
          title: lesson?.title ?? '',
          lessonDay: toDateInput(lesson?.lessonDay),
          sections: parseLessonSections(extractMarkdown(lesson?.content)),
          quizzes: Array.isArray(lesson?.quizzes) ? lesson.quizzes.map((quiz: any) => ({
            id: String(quiz?.id ?? quiz?.quizId ?? quiz?.quizzId ?? uid('quiz')),
            persistedId: quiz?.id != null || quiz?.quizId != null || quiz?.quizzId != null ? String(quiz?.id ?? quiz?.quizId ?? quiz?.quizzId) : null,
            title: quiz?.title ?? '',
            description: quiz?.description ?? '',
            quizQuestionsJson: normalizeJsonField(quiz?.quizQuestionsJson ?? quiz?.QuizQuestionsJson),
          })) : [],
        }))
        : [emptyLesson()],
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
    }))
    : [emptyChapter()]

  return {
    subjectId: String(payload?.subjectId ?? payload?.SubjectId ?? ''),
    goals: extractGoals(payload),
    complexityLevel: (payload?.complexityLevel ?? payload?.ComplexityLevel ?? 'Beginner') as Level,
    languageSelection: normalizeLanguage(payload?.languageSelection ?? payload?.LanguageSelection),
    title: payload?.title ?? '',
    description: payload?.description ?? '',
    startDate: toDateInput(payload?.startDate ?? payload?.StartDate),
    endDate: toDateInput(payload?.endDate ?? payload?.EndDate),
    chapters,
  }
}

const validateDraftForm = (form: DraftFormState): string | null => {
  if (!form.subjectId) return 'Subject is required.'
  if (!form.title.trim()) return 'Title is required.'
  if (form.goals.length === 0) return 'Select at least one goal.'
  if (form.goals.length === 1 && form.goals[0].weight !== 100) return 'Single goal must have weight 100.'
  if (form.goals.length === 2 && form.goals[0].weight + form.goals[1].weight !== 100) return 'Goal weights must total 100.'
  for (const chapter of form.chapters) {
    if (!chapter.title.trim()) return 'Every chapter needs a title.'
    if (!chapter.lessons.length) return `Chapter "${chapter.title || 'Untitled'}" needs at least one lesson.`
    for (const lesson of chapter.lessons) if (!lesson.title.trim()) return `Every lesson needs a title in chapter "${chapter.title || 'Untitled'}".`
  }
  return null
}

const buildPayload = (form: DraftFormState): ManualDraftPayload => ({
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
      content: buildLessonContentFromSections(lesson.sections),
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

const Panel = ({
  title,
  subtitle,
  action,
  children,
  collapsible = false,
  defaultCollapsed = false,
  collapseLabel,
  expandLabel,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
  collapsible?: boolean
  defaultCollapsed?: boolean
  collapseLabel?: string
  expandLabel?: string
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  return (
    <section style={{ ...cardStyle, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'start', marginBottom: collapsed ? 0 : 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text-primary)' }}>{title}</h2>
          {subtitle && <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>{subtitle}</p>}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {action}
          {collapsible && (
            <button
              type="button"
              style={buttonStyle}
              onClick={() => setCollapsed((prev) => !prev)}
              aria-expanded={!collapsed}
            >
              {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              {collapsed ? expandLabel : collapseLabel}
            </button>
          )}
        </div>
      </div>
      {!collapsed && children}
    </section>
  )
}

const Field = ({ label, children, required = false }: { label: string; children: React.ReactNode; required?: boolean }) => (
  <label style={{ display: 'grid', gap: 8 }}>
    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.6 }}>
      {label}
      {required && <span style={{ color: 'var(--danger-primary)', marginLeft: 4 }}>*</span>}
    </span>
    {children}
  </label>
)

const MentorDraftFormPage: React.FC = () => {
  const { pathId } = useParams()
  const isCreateMode = !pathId
  const navigate = useNavigate()
  const location = useLocation() as { state?: { draft?: SkeletonResponse; toast?: ToastState } }
  const { t } = useTranslation('mentor')
  const sidebarConfig = { navItems: useMentorSidebarConfig(), actions: [], brand: { name: t('drafts.brandName'), subtitle: t('drafts.brandSubtitle') } }

  const [subjects, setSubjects] = useState<SubjectOption[]>([])
  const [subjectSearch, setSubjectSearch] = useState('')
  const [isSubjectMenuOpen, setIsSubjectMenuOpen] = useState(false)
  const [form, setForm] = useState<DraftFormState>(hydrateDraftForm(location.state?.draft))
  const [loading, setLoading] = useState(!isCreateMode)
  const [saving, setSaving] = useState(false)
  const [generatingAiDraft, setGeneratingAiDraft] = useState(false)
  const [generatingLessonId, setGeneratingLessonId] = useState<string | null>(null)
  const [generatingTaskChapterId, setGeneratingTaskChapterId] = useState<string | null>(null)
  const [generatingQuizId, setGeneratingQuizId] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState | null>(location.state?.toast ?? null)
  const [activeTab, setActiveTab] = useState<EditorTab>('structure')
  const [activeChapterId, setActiveChapterId] = useState<string | null>(form.chapters[0]?.id ?? null)
  const [activeLessonId, setActiveLessonId] = useState<string | null>(form.chapters[0]?.lessons[0]?.id ?? null)
  const [studentOptions, setStudentOptions] = useState<Array<{ id: string; label: string }>>([])
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [shareError, setShareError] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const subjectPickerRef = useRef<HTMLDivElement | null>(null)
  const collapseLabel = t('drafts.collapse')
  const expandLabel = t('drafts.expand')
  const currentPathId = String(pathId ?? location.state?.draft?.pathId ?? '')
  const canShare = !!currentPathId

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(!isCreateMode)
      setLoadError(null)
      try {
        const [subjectList, draft] = await Promise.all([
          SubjectService.listSubjects(),
          isCreateMode ? Promise.resolve(location.state?.draft ?? null) : location.state?.draft ? Promise.resolve(location.state.draft) : LearningPathService.getMyDraftDetail(pathId as string),
        ])
        if (!active) return
        setSubjects(subjectList.map((subject: any) => ({
          id: String(subject?.id ?? subject?.subjectId),
          name: subject?.name ?? 'Subject',
          goals: Array.isArray(subject?.goals) ? subject.goals.map((goal: any) => ({ goalId: String(goal?.goalId ?? goal?.id), title: goal?.title ?? goal?.name ?? 'Goal' })) : [],
        })))
        getContacts()
          .then((items) => {
            if (!active) return
            setStudentOptions(
              items
                .filter((item: any) => item?.roleName === 'Student')
                .map((item: any) => ({ id: String(item?.userId), label: item?.username ?? 'Student' }))
            )
          })
          .catch(() => {
            if (active) setStudentOptions([])
          })
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
        setLoadError(err?.response?.data?.message || err?.message || t('drafts.loadFailed'))
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [isCreateMode, location.state?.draft, navigate, pathId])

  const selectedSubject = useMemo(() => subjects.find((subject) => subject.id === form.subjectId) ?? null, [form.subjectId, subjects])
  const filteredSubjects = useMemo(() => {
    const keyword = subjectSearch.trim().toLowerCase()
    const matched = keyword
      ? subjects.filter((subject) => subject.name.toLowerCase().includes(keyword))
      : subjects

    if (selectedSubject && !matched.some((subject) => subject.id === selectedSubject.id)) {
      return [selectedSubject, ...matched]
    }

    return matched
  }, [selectedSubject, subjectSearch, subjects])
  const activeChapter = useMemo(() => form.chapters.find((chapter) => chapter.id === activeChapterId) ?? form.chapters[0] ?? null, [activeChapterId, form.chapters])
  const activeLesson = useMemo(() => activeChapter?.lessons.find((lesson) => lesson.id === activeLessonId) ?? activeChapter?.lessons[0] ?? null, [activeChapter?.lessons, activeLessonId])
  const canGenerateActiveLesson = !!activeLesson?.persistedId
  const isGeneratingActiveLesson = activeLesson?.id != null && generatingLessonId === activeLesson.id

  useEffect(() => {
    if (!selectedSubject) {
      if (!form.subjectId) setSubjectSearch('')
      return
    }
    setSubjectSearch(selectedSubject.name)
  }, [form.subjectId, selectedSubject])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!subjectPickerRef.current?.contains(event.target as Node)) setIsSubjectMenuOpen(false)
    }

    window.addEventListener('mousedown', handlePointerDown)
    return () => window.removeEventListener('mousedown', handlePointerDown)
  }, [])

  const updateChapter = (chapterId: string, updater: (chapter: EditableChapter) => EditableChapter) => setForm((prev) => ({ ...prev, chapters: prev.chapters.map((chapter) => chapter.id === chapterId ? updater(chapter) : chapter) }))
  const updateLesson = (chapterId: string, lessonId: string, updater: (lesson: EditableLesson) => EditableLesson) => updateChapter(chapterId, (chapter) => ({ ...chapter, lessons: chapter.lessons.map((lesson) => lesson.id === lessonId ? updater(lesson) : lesson) }))
  const updateTask = (chapterId: string, taskId: string, updater: (task: EditableTask) => EditableTask) => updateChapter(chapterId, (chapter) => ({ ...chapter, tasks: chapter.tasks.map((task) => task.id === taskId ? updater(task) : task) }))
  const updateQuiz = (chapterId: string, lessonId: string, quizId: string, updater: (quiz: EditableQuiz) => EditableQuiz) => updateLesson(chapterId, lessonId, (lesson) => ({ ...lesson, quizzes: lesson.quizzes.map((quiz) => quiz.id === quizId ? updater(quiz) : quiz) }))
  const toggleGoal = (goalId: string) => setForm((prev) => {
    const exists = prev.goals.some((goal) => goal.goalId === goalId)
    if (exists) {
      const nextGoals = prev.goals.filter((goal) => goal.goalId !== goalId)
      if (nextGoals.length === 1) nextGoals[0] = { ...nextGoals[0], weight: 100 }
      return { ...prev, goals: nextGoals }
    }
    if (prev.goals.length >= 2) return prev
    const nextGoals = [...prev.goals, { goalId, weight: prev.goals.length === 0 ? 100 : 50 }]
    if (nextGoals.length === 2) {
      nextGoals[0] = { ...nextGoals[0], weight: 50 }
      nextGoals[1] = { ...nextGoals[1], weight: 50 }
    }
    return { ...prev, goals: nextGoals }
  })
  const setPrimaryWeight = (weight: number) => setForm((prev) => prev.goals.length !== 2 ? prev : { ...prev, goals: [{ ...prev.goals[0], weight }, { ...prev.goals[1], weight: 100 - weight }] })
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
    setActiveTab('structure')
  }
  const addLesson = (chapterId: string) => {
    const lesson = emptyLesson()
    updateChapter(chapterId, (chapter) => ({ ...chapter, lessons: [...chapter.lessons, lesson] }))
    setActiveChapterId(chapterId)
    setActiveLessonId(lesson.id)
    setActiveTab('lesson')
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

  const validateAiDraftInput = () => {
    if (!form.subjectId) return 'Subject is required.'
    if (form.goals.length === 0) return 'Select at least one goal.'
    if (!form.complexityLevel) return 'Level is required.'
    if (form.languageSelection === undefined || form.languageSelection === null) return 'Language is required.'
    return null
  }

  const generateAiDraftFromSettings = async () => {
    const validationError = validateAiDraftInput()
    if (validationError) {
      setToast({ message: validationError, type: 'warning' })
      return
    }

    setGeneratingAiDraft(true)
    try {
      const draft = await LearningPathService.generateAiDraft({
        subjectId: form.subjectId,
        goals: form.goals,
        complexityLevel: form.complexityLevel,
        languageSelection: form.languageSelection,
      })

      if (!draft?.pathId) {
        setToast({ message: t('aiPlans.missingDraftId'), type: 'error' })
        return
      }

      navigate(ROUTER.MENTOR_DRAFT_DETAIL.replace(':pathId', String(draft.pathId)), {
        state: {
          pathId: draft.pathId,
          draft,
          toast: { message: t('drafts.aiGenerateSuccess'), type: 'success' } satisfies ToastState,
        },
      })
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || err?.message || t('aiPlans.detailLoadFailed'), type: 'error' })
    } finally {
      setGeneratingAiDraft(false)
    }
  }

  const generateAiLessonContent = async () => {
    if (!activeChapter || !activeLesson) return

    if (!activeLesson.persistedId) {
      setToast({
        message: t('drafts.saveBeforeGenerateLesson', { defaultValue: 'Save the draft before generating AI lesson content.' }),
        type: 'warning',
      })
      return
    }

    setGeneratingLessonId(activeLesson.id)
    try {
      const result = await LearningPathService.generateLessonContent(activeLesson.persistedId)
      const generatedContent = extractMarkdown(result)

      if (!generatedContent.trim()) {
        setToast({
          message: t('drafts.lessonGenerateEmpty', { defaultValue: 'AI did not return lesson content.' }),
          type: 'warning',
        })
        return
      }

      const generatedSections = parseLessonSections(generatedContent)
      updateLesson(activeChapter.id, activeLesson.id, (lesson) => ({
        ...lesson,
        title: result?.title?.trim() || lesson.title,
        lessonDay: result?.lessonDay ? toDateInput(result.lessonDay) : lesson.lessonDay,
        sections: generatedSections,
      }))
      setToast({
        message: t('drafts.lessonGenerateSuccess', { defaultValue: 'AI lesson content generated successfully.' }),
        type: 'success',
      })
    } catch (err: any) {
      setToast({
        message: err?.response?.data?.message || err?.message || t('drafts.lessonGenerateFailed', { defaultValue: 'Failed to generate AI lesson content.' }),
        type: 'error',
      })
    } finally {
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
        id: uid('task'),
        persistedId: task?.id ?? task?.taskId ?? null,
        title: task?.title ?? '',
        description: task?.description ?? '',
        priority: task?.priority != null ? String(task.priority) : '',
        taskStatus: normalizeTaskStatus(task?.taskStatus ?? task?.TaskStatus),
        dueDate: toDateInput(task?.dueDate ?? task?.DueDate),
        taskType: normalizeTaskType(task?.taskType ?? task?.TaskType),
        quizQuestionsJson: normalizeJsonField(task?.quizQuestionsJson ?? task?.QuizQuestionsJson),
      }))

      updateChapter(activeChapter.id, (chapter) => ({ ...chapter, tasks: [...chapter.tasks, ...newTasks] }))
      setToast({ message: t('drafts.tasksGenerateSuccess'), type: 'success' })
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || err?.message || t('drafts.tasksGenerateFailed'), type: 'error' })
    } finally {
      setGeneratingTaskChapterId(null)
    }
  }

  const generateAiQuizQuestions = async (chapterId: string, lessonId: string, quiz: EditableQuiz) => {
    if (!quiz.persistedId) {
      setToast({ message: t('drafts.saveBeforeGenerateQuiz'), type: 'warning' })
      return
    }

    setGeneratingQuizId(quiz.id)
    try {
      const result = await requestQuizQuestions(quiz.persistedId)
      const rawJson = typeof result === 'string' ? result : result?.quizQuestionsJson ?? result?.QuizQuestionsJson ?? result?.questions ?? result
      const normalized = normalizeJsonField(rawJson)

      if (!normalized.trim()) {
        setToast({ message: t('drafts.quizGenerateEmpty'), type: 'warning' })
        return
      }

      updateQuiz(chapterId, lessonId, quiz.id, (item) => ({ ...item, quizQuestionsJson: normalized }))
      setToast({ message: t('drafts.quizGenerateSuccess'), type: 'success' })
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || err?.message || t('drafts.quizGenerateFailed'), type: 'error' })
    } finally {
      setGeneratingQuizId(null)
    }
  }

  const saveDraft = async () => {
    const validationError = validateDraftForm(form)
    if (validationError) {
      setToast({ message: validationError, type: 'warning' })
      return
    }
    setSaving(true)
    try {
      const response = isCreateMode ? await LearningPathService.createManualDraft(buildPayload(form)) : await LearningPathService.updateManualDraft(pathId as string, buildPayload(form))
      const nextForm = hydrateDraftForm(response)
      setForm(nextForm)
      setActiveChapterId(nextForm.chapters[0]?.id ?? null)
      setActiveLessonId(nextForm.chapters[0]?.lessons[0]?.id ?? null)
      setToast({ message: isCreateMode ? t('drafts.manualCreateSuccess') : t('drafts.manualUpdateSuccess'), type: 'success' })
      if (isCreateMode && response?.pathId) navigate(ROUTER.MENTOR_DRAFT_DETAIL.replace(':pathId', String(response.pathId)), { replace: true, state: { draft: response } })
    } catch (err: any) {
      setToast({ message: err?.response?.data?.message || err?.message || t('drafts.saveFailed'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleShareDraft = async () => {
    const nextPathId = currentPathId
    if (!nextPathId || !selectedStudentId) return
    setSharing(true)
    setShareError(null)
    try {
      const conversation = await createOrGetConversation(selectedStudentId)
      await shareToStudent(nextPathId, selectedStudentId)
      navigate(ROUTER.MENTOR_CHAT, {
        state: {
          conversationId: conversation.conversationId,
          toast: { message: t('chat.shareSuccess'), type: 'success' } satisfies ToastState,
        },
      })
    } catch (err: any) {
      const code = err?.response?.data?.errorCode
      setShareError(code === 'SHARE_ALREADY_PENDING' ? t('chat.shareAlreadyPending') : (err?.response?.data?.message || err?.message || t('chat.shareError')))
    } finally {
      setSharing(false)
    }
  }

  if (loading) return <Layout sidebar={sidebarConfig}><div style={{ ...shellStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ textAlign: 'center', color: 'var(--accent-primary)' }}><Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" /><p>{t('drafts.loading')}</p></div></div></Layout>
  if (loadError) return <Layout sidebar={sidebarConfig}><div style={shellStyle}><Panel title={t('drafts.title')} subtitle={loadError}><button type="button" style={buttonStyle} onClick={() => navigate(ROUTER.MENTOR_DRAFTS)}><ArrowLeft size={14} /> {t('drafts.backToList')}</button></Panel></div></Layout>

  return (
    <Layout sidebar={sidebarConfig}>
      <div style={shellStyle}>
        <div style={{ maxWidth: 1380, margin: '0 auto', display: 'grid', gap: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" style={buttonStyle} onClick={() => navigate(ROUTER.MENTOR_DRAFTS)}><ArrowLeft size={14} /> {t('drafts.backToList')}</button>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="button" style={buttonStyle} onClick={() => setActiveTab('structure')}><BookOpen size={14} /> {t('drafts.pathSettings')}</button>
              <button type="button" style={buttonStyle} onClick={() => setActiveTab('lesson')}><Sparkles size={14} /> {t('drafts.lessonStudio')}</button>
              <button
                type="button"
                style={{
                  ...buttonStyle,
                  borderColor: 'var(--accent-primary)',
                  color: 'var(--accent-primary)',
                  opacity: canShare ? 1 : 0.55,
                  cursor: canShare ? 'pointer' : 'not-allowed',
                }}
                onClick={() => {
                  if (!canShare) {
                    setToast({ message: t('drafts.saveBeforeShare', { defaultValue: 'Save the draft before sharing it.' }), type: 'warning' })
                    return
                  }
                  setShareError(null)
                  setSelectedStudentId('')
                  setIsShareModalOpen(true)
                }}
                disabled={sharing}
              >
                <Share2 size={14} /> {t('chat.sharePathBtn')}
              </button>
              <button type="button" style={{ ...buttonStyle, borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }} onClick={saveDraft} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={14} />}{saving ? t('drafts.saving') : t('drafts.save')}</button>
            </div>
          </div>

          <div style={{ ...cardStyle, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'start', flexWrap: 'wrap' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 26, color: 'var(--text-primary)' }}>{isCreateMode ? t('drafts.createManualTitle') : form.title || t('drafts.title')}</h1>
                <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-secondary)', maxWidth: 760 }}>{t('drafts.manualEditorHint')}</p>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ padding: '6px 10px', borderRadius: 999, border: '1px dashed var(--warning-primary)', color: 'var(--warning-primary)', fontSize: 12, fontWeight: 700 }}>{t('drafts.draftBadge')}</span>
                <span style={{ padding: '6px 10px', borderRadius: 999, border: '1px dashed var(--border-base)', color: 'var(--text-secondary)', fontSize: 12 }}>{t('drafts.chapterCount', { count: form.chapters.length })}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
            <aside style={{ ...cardStyle, padding: 16, position: 'sticky', top: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <strong style={{ color: 'var(--text-primary)' }}>{t('drafts.contentTree')}</strong>
                <button type="button" style={buttonStyle} onClick={addChapter}><Plus size={14} /> {t('drafts.addChapter')}</button>
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {form.chapters.map((chapter, chapterIndex) => (
                  <div key={chapter.id} style={{ ...cardStyle, padding: 12, background: chapter.id === activeChapterId ? 'var(--bg-main)' : 'var(--bg-surface)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'start' }}>
                      <button type="button" onClick={() => { setActiveChapterId(chapter.id); setActiveLessonId(chapter.lessons[0]?.id ?? null); setActiveTab('structure') }} style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', flex: 1 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Chapter {chapterIndex + 1}</div>
                        <div style={{ color: 'var(--text-primary)', fontWeight: 700, marginTop: 4 }}>{chapter.title || t('drafts.untitledChapter')}</div>
                      </button>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button type="button" style={buttonStyle} onClick={() => moveChapter(chapter.id, -1)}><ChevronUp size={14} /></button>
                        <button type="button" style={buttonStyle} onClick={() => moveChapter(chapter.id, 1)}><ChevronDown size={14} /></button>
                        <button type="button" style={buttonStyle} onClick={() => removeChapter(chapter.id)}><Trash2 size={14} /></button>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                      {chapter.lessons.map((lesson, lessonIndex) => (
                        <div key={lesson.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <button type="button" onClick={() => { setActiveChapterId(chapter.id); setActiveLessonId(lesson.id); setActiveTab('lesson') }} style={{ flex: 1, background: lesson.id === activeLessonId ? 'var(--bg-blue-hover)' : 'var(--bg-main)', border: `1px solid ${lesson.id === activeLessonId ? 'var(--accent-primary)' : 'var(--border-base)'}`, borderRadius: 4, padding: '8px 10px', cursor: 'pointer', textAlign: 'left', color: 'var(--text-primary)' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Lesson {lessonIndex + 1}</div>
                            <div>{lesson.title || t('drafts.untitledLesson')}</div>
                          </button>
                          <button type="button" style={buttonStyle} onClick={() => moveLesson(chapter.id, lesson.id, -1)}><ChevronUp size={14} /></button>
                          <button type="button" style={buttonStyle} onClick={() => moveLesson(chapter.id, lesson.id, 1)}><ChevronDown size={14} /></button>
                          <button type="button" style={buttonStyle} onClick={() => removeLesson(chapter.id, lesson.id)}><Trash2 size={14} /></button>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <button type="button" style={buttonStyle} onClick={() => addLesson(chapter.id)}><Plus size={14} /> {t('drafts.addLesson')}</button>
                    </div>
                  </div>
                ))}
              </div>
            </aside>

            <main style={{ display: 'grid', gap: 20, minWidth: 0 }}>
              {activeTab === 'structure' && (
                <>
                  <Panel
                    title={t('drafts.pathSettings')}
                    subtitle={t('drafts.pathSettingsHint')}
                    action={isCreateMode ? (
                      <button
                        type="button"
                        style={{ ...buttonStyle, borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }}
                        onClick={generateAiDraftFromSettings}
                        disabled={generatingAiDraft || saving}
                      >
                        {generatingAiDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles size={14} />}
                        {generatingAiDraft ? t('aiPlans.generatingDraft') : t('aiPlans.generateByAi')}
                      </button>
                    ) : undefined}
                    collapsible
                    collapseLabel={collapseLabel}
                    expandLabel={expandLabel}
                  >
                    <div style={{ marginBottom: 14, fontSize: 12, color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--danger-primary)', fontWeight: 700 }}>*</span> {t('drafts.aiRequiredHint')}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
                      <Field label={t('drafts.subject')} required>
                        <div ref={subjectPickerRef} style={{ position: 'relative' }}>
                          <input
                            style={{ ...inputStyle, paddingRight: 36 }}
                            value={subjectSearch}
                            placeholder={t('drafts.subjectSearchPlaceholder')}
                            onFocus={() => setIsSubjectMenuOpen(true)}
                            onChange={(event) => {
                              const nextValue = event.target.value
                              setSubjectSearch(nextValue)
                              setIsSubjectMenuOpen(true)
                              if (selectedSubject && nextValue !== selectedSubject.name) setForm((prev) => ({ ...prev, subjectId: '', goals: [] }))
                            }}
                            onKeyDown={(event) => {
                              if (event.key === 'ArrowDown') {
                                event.preventDefault()
                                setIsSubjectMenuOpen(true)
                              }
                              if (event.key === 'Enter' && filteredSubjects.length > 0) {
                                event.preventDefault()
                                selectSubject(filteredSubjects[0])
                              }
                            }}
                          />
                          <button
                            type="button"
                            aria-label={t('drafts.selectSubject')}
                            onClick={() => setIsSubjectMenuOpen((prev) => !prev)}
                            style={{ position: 'absolute', top: 1, right: 1, bottom: 1, width: 34, border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                          >
                            <ChevronDown size={16} />
                          </button>
                          {isSubjectMenuOpen && (
                            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 20, ...cardStyle, background: 'var(--bg-surface)', maxHeight: 220, overflowY: 'auto', padding: 6 }}>
                              {filteredSubjects.length > 0 ? filteredSubjects.map((subject) => (
                                <button
                                  key={subject.id}
                                  type="button"
                                  onClick={() => selectSubject(subject)}
                                  style={{ width: '100%', textAlign: 'left', border: 'none', borderRadius: 4, padding: '10px 12px', background: subject.id === form.subjectId ? 'var(--bg-blue-hover)' : 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'inherit' }}
                                >
                                  {subject.name}
                                </button>
                              )) : (
                                <div style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontSize: 13 }}>
                                  {t('drafts.noSubjectMatch')}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </Field>
                      <Field label={t('drafts.level')} required><select style={inputStyle} value={form.complexityLevel} onChange={(event) => setForm((prev) => ({ ...prev, complexityLevel: event.target.value as Level }))}>{LEVEL_OPTIONS.map((level) => <option key={level} value={level}>{level}</option>)}</select></Field>
                      <Field label={t('drafts.titleLabel')}><input style={inputStyle} value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} /></Field>
                      <Field label={t('drafts.language')} required><select style={inputStyle} value={form.languageSelection} onChange={(event) => setForm((prev) => ({ ...prev, languageSelection: Number(event.target.value) }))}><option value={LanguageSelection.Vietnamese}>Tiếng Việt</option><option value={LanguageSelection.English}>English</option></select></Field>
                    </div>
                    <div style={{ marginTop: 14 }}><Field label={t('drafts.description')}><textarea style={{ ...textAreaStyle, minHeight: 90 }} value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} /></Field></div>
                    <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{t('drafts.goals')}<span style={{ color: 'var(--danger-primary)', marginLeft: 4 }}>*</span></div>
                      {!selectedSubject ? <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{t('drafts.selectSubjectForGoals')}</div> : selectedSubject.goals.length === 0 ? <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{t('drafts.noGoalsForSubject')}</div> : <div style={{ display: 'grid', gap: 10 }}>
                        {selectedSubject.goals.map((goal) => {
                          const selected = form.goals.some((item) => item.goalId === goal.goalId)
                          return <label key={goal.goalId} style={{ ...cardStyle, padding: 12, display: 'flex', gap: 10, alignItems: 'center', background: selected ? 'var(--bg-blue-hover)' : 'var(--bg-main)' }}><input type="checkbox" checked={selected} onChange={() => toggleGoal(goal.goalId)} /><span style={{ color: 'var(--text-primary)', flex: 1 }}>{goal.title}</span></label>
                        })}
                        {form.goals.length === 2 && <div style={{ ...cardStyle, padding: 14, background: 'var(--bg-main)' }}><div style={{ display: 'grid', gap: 8 }}><div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{t('drafts.goalWeightHint')}</div><input type="range" min={0} max={100} value={form.goals[0].weight} onChange={(event) => setPrimaryWeight(Number(event.target.value))} /><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)' }}><span>{selectedSubject.goals.find((goal) => goal.goalId === form.goals[0].goalId)?.title}: {form.goals[0].weight}%</span><span>{selectedSubject.goals.find((goal) => goal.goalId === form.goals[1].goalId)?.title}: {form.goals[1].weight}%</span></div></div></div>}
                      </div>}
                    </div>
                  </Panel>

                  {activeChapter && <Panel
                    title={t('drafts.chapterSettings')}
                    subtitle={t('drafts.chapterSettingsHint')}
                    collapsible
                    collapseLabel={collapseLabel}
                    expandLabel={expandLabel}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
                      <Field label={t('drafts.chapterTitle')}><input style={inputStyle} value={activeChapter.title} onChange={(event) => updateChapter(activeChapter.id, (chapter) => ({ ...chapter, title: event.target.value }))} /></Field>
                      <Field label={t('drafts.estimatedDays')}><input type="number" min={1} style={inputStyle} value={activeChapter.estimatedDays} onChange={(event) => updateChapter(activeChapter.id, (chapter) => ({ ...chapter, estimatedDays: event.target.value }))} /></Field>
                    </div>
                    <div style={{ marginTop: 14 }}><Field label={t('drafts.chapterDescription')}><textarea style={textAreaStyle} value={activeChapter.content} onChange={(event) => updateChapter(activeChapter.id, (chapter) => ({ ...chapter, content: event.target.value }))} /></Field></div>
                    <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
                      {activeChapter.lessons.map((lesson, lessonIndex) => <div key={lesson.id} style={{ ...cardStyle, padding: 12, background: 'var(--bg-main)' }}><div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 10, alignItems: 'end' }}><Field label={`Lesson ${lessonIndex + 1}`}><input style={inputStyle} value={lesson.title} onChange={(event) => updateLesson(activeChapter.id, lesson.id, (item) => ({ ...item, title: event.target.value }))} /></Field><Field label={t('drafts.lessonDay')}><input type="date" style={inputStyle} value={lesson.lessonDay} onChange={(event) => updateLesson(activeChapter.id, lesson.id, (item) => ({ ...item, lessonDay: event.target.value }))} /></Field><button type="button" style={{ ...buttonStyle, alignSelf: 'stretch' }} onClick={() => { setActiveLessonId(lesson.id); setActiveTab('lesson') }}>{t('drafts.openStudio')}</button></div></div>)}
                    </div>
                  </Panel>}

                  {activeChapter && <Panel
                    title={t('drafts.tasks')}
                    subtitle={t('drafts.tasksHint')}
                    action={
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          style={{
                            ...buttonStyle,
                            borderColor: 'var(--accent-primary)',
                            color: 'var(--accent-primary)',
                            opacity: activeChapter.persistedId ? 1 : 0.55,
                            cursor: activeChapter.persistedId ? 'pointer' : 'not-allowed',
                          }}
                          onClick={generateAiTasks}
                          disabled={generatingTaskChapterId === activeChapter.id || saving}
                          title={!activeChapter.persistedId ? t('drafts.saveBeforeGenerateTasks') : undefined}
                        >
                          {generatingTaskChapterId === activeChapter.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles size={14} />}
                          {generatingTaskChapterId === activeChapter.id ? t('drafts.generatingTasks') : t('drafts.generateTasksByAi')}
                        </button>
                        <button type="button" style={buttonStyle} onClick={() => addTask(activeChapter.id)}><Plus size={14} /> {t('drafts.addTask')}</button>
                      </div>
                    }
                    collapsible
                    defaultCollapsed={false}
                    collapseLabel={collapseLabel}
                    expandLabel={expandLabel}
                  >
                    {activeChapter.tasks.length === 0 ? (
                      <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{t('drafts.noTasksYet')}</div>
                    ) : (
                      <div style={{ display: 'grid', gap: 12 }}>
                        {activeChapter.tasks.map((task, taskIndex) => (
                          <div key={task.id} style={{ ...cardStyle, padding: 14, background: 'var(--bg-main)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                              <strong style={{ color: 'var(--text-primary)' }}>{task.title || `${t('drafts.untitledTask')} ${taskIndex + 1}`}</strong>
                              <button type="button" style={buttonStyle} onClick={() => removeTask(activeChapter.id, task.id)}><Trash2 size={14} /></button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
                              <Field label={t('drafts.taskTitle')}><input style={inputStyle} value={task.title} onChange={(event) => updateTask(activeChapter.id, task.id, (item) => ({ ...item, title: event.target.value }))} /></Field>
                              <Field label={t('drafts.taskType')}>
                                <select style={inputStyle} value={task.taskType} onChange={(event) => updateTask(activeChapter.id, task.id, (item) => ({ ...item, taskType: event.target.value }))}>
                                  {TASK_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                                </select>
                              </Field>
                              <Field label={t('drafts.priority')}><input style={inputStyle} value={task.priority} onChange={(event) => updateTask(activeChapter.id, task.id, (item) => ({ ...item, priority: event.target.value }))} placeholder="Low / Medium / High" /></Field>
                              <Field label={t('drafts.dueDate')}><input type="date" style={inputStyle} value={task.dueDate} onChange={(event) => updateTask(activeChapter.id, task.id, (item) => ({ ...item, dueDate: event.target.value }))} /></Field>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 180px) minmax(0, 1fr)', gap: 12, marginTop: 12 }}>
                              <Field label="Task Status">
                                <select style={inputStyle} value={task.taskStatus} onChange={(event) => updateTask(activeChapter.id, task.id, (item) => ({ ...item, taskStatus: event.target.value }))}>
                                  {TASK_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                                </select>
                              </Field>
                              <Field label="Description"><textarea style={{ ...textAreaStyle, minHeight: 90 }} value={task.description} onChange={(event) => updateTask(activeChapter.id, task.id, (item) => ({ ...item, description: event.target.value }))} placeholder={t('drafts.taskDescriptionHint')} /></Field>
                            </div>
                            <div style={{ marginTop: 12 }}>
                              <Field label={t('drafts.quizJson')}>
                                <>
                                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{t('drafts.quizJsonHint')}</div>
                                  <textarea style={{ ...textAreaStyle, minHeight: 140 }} value={task.quizQuestionsJson} onChange={(event) => updateTask(activeChapter.id, task.id, (item) => ({ ...item, quizQuestionsJson: event.target.value }))} />
                                </>
                              </Field>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Panel>}
                </>
              )}

              {activeTab === 'lesson' && activeChapter && activeLesson && <Panel
                title={t('drafts.lessonStudio')}
                subtitle={t('drafts.lessonStudioHint')}
                action={
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{activeLesson.title || t('drafts.untitledLesson')}</span>
                    <button
                      type="button"
                      style={{
                        ...buttonStyle,
                        borderColor: 'var(--accent-primary)',
                        color: 'var(--accent-primary)',
                        opacity: canGenerateActiveLesson ? 1 : 0.6,
                      }}
                      onClick={generateAiLessonContent}
                      disabled={saving || isGeneratingActiveLesson}
                      title={!canGenerateActiveLesson ? t('drafts.saveBeforeGenerateLesson', { defaultValue: 'Save the draft before generating AI lesson content.' }) : undefined}
                    >
                      {isGeneratingActiveLesson ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles size={14} />}
                      {isGeneratingActiveLesson
                        ? t('drafts.generatingLessonContent', { defaultValue: 'Generating lesson...' })
                        : t('drafts.generateLessonContent', { defaultValue: 'Generate Lesson by AI' })}
                    </button>
                  </div>
                }
                collapsible
                collapseLabel={collapseLabel}
                expandLabel={expandLabel}
              >
                <div style={{ display: 'grid', gap: 20, minWidth: 0 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 20, minWidth: 0 }}>
                    <div style={{ display: 'grid', gap: 14, minWidth: 0 }}>
                      {SECTION_KEYS.map((key) => <Field key={key} label={SECTION_LABELS[key]}><><div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{t(SECTION_HINT_KEYS[key])}</div><textarea style={{ ...textAreaStyle, minHeight: key === 'code-examples' || key === 'common-mistakes' ? 180 : 110 }} value={activeLesson.sections[key]} onChange={(event) => updateLesson(activeChapter.id, activeLesson.id, (lesson) => ({ ...lesson, sections: { ...lesson.sections, [key]: event.target.value } }))} /></></Field>)}
                    </div>
                    <div style={{ display: 'grid', gap: 14, minWidth: 0 }}>
                      <div style={{ minWidth: 0, overflow: 'hidden' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>Markdown Sync</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.5 }}>{t('drafts.markdownSyncHint')}</div>
                        <Editor height="340px" width="100%" defaultLanguage="markdown" theme="vs-light" value={buildLessonContentFromSections(activeLesson.sections)} onChange={(next) => updateLesson(activeChapter.id, activeLesson.id, (lesson) => ({ ...lesson, sections: parseLessonSections(next ?? '') }))} options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: 'on', scrollBeyondLastLine: false, wrappingStrategy: 'advanced' }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>Preview</div>
                        <div style={{ ...cardStyle, padding: 16, background: 'var(--bg-main)', maxHeight: 580, overflow: 'auto', minWidth: 0, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                          <LessonContent content={buildLessonContentFromSections(activeLesson.sections)} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ ...cardStyle, padding: 16, background: 'var(--bg-main)', minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{t('drafts.lessonQuizzes')}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{t('drafts.lessonQuizzesHint')}</div>
                      </div>
                      <button type="button" style={buttonStyle} onClick={() => addQuiz(activeChapter.id, activeLesson.id)}><Plus size={14} /> {t('drafts.addQuiz')}</button>
                    </div>
                    {activeLesson.quizzes.length === 0 ? (
                      <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{t('drafts.noQuizzesYet')}</div>
                    ) : (
                      <div style={{ display: 'grid', gap: 12 }}>
                        {activeLesson.quizzes.map((quiz, quizIndex) => (
                          <div key={quiz.id} style={{ ...cardStyle, padding: 14, background: 'var(--bg-surface)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                              <strong style={{ color: 'var(--text-primary)' }}>{quiz.title || `${t('drafts.untitledQuiz')} ${quizIndex + 1}`}</strong>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <button
                                  type="button"
                                  style={{
                                    ...buttonStyle,
                                    borderColor: 'var(--accent-primary)',
                                    color: 'var(--accent-primary)',
                                    opacity: quiz.persistedId ? 1 : 0.55,
                                    cursor: quiz.persistedId ? 'pointer' : 'not-allowed',
                                    fontSize: 12,
                                  }}
                                  onClick={() => generateAiQuizQuestions(activeChapter.id, activeLesson.id, quiz)}
                                  disabled={generatingQuizId === quiz.id || saving}
                                  title={!quiz.persistedId ? t('drafts.saveBeforeGenerateQuiz') : undefined}
                                >
                                  {generatingQuizId === quiz.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles size={12} />}
                                  {generatingQuizId === quiz.id ? t('drafts.generatingQuiz') : t('drafts.generateQuizByAi')}
                                </button>
                                <button type="button" style={buttonStyle} onClick={() => removeQuiz(activeChapter.id, activeLesson.id, quiz.id)}><Trash2 size={14} /></button>
                              </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: 12 }}>
                              <Field label={t('drafts.quizTitle')}>
                                <>
                                  <input style={inputStyle} value={quiz.title} onChange={(event) => updateQuiz(activeChapter.id, activeLesson.id, quiz.id, (item) => ({ ...item, title: event.target.value }))} />
                                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{t('drafts.quizTitleHint')}</div>
                                </>
                              </Field>
                              <Field label="Description"><textarea style={{ ...textAreaStyle, minHeight: 90 }} value={quiz.description} onChange={(event) => updateQuiz(activeChapter.id, activeLesson.id, quiz.id, (item) => ({ ...item, description: event.target.value }))} /></Field>
                            </div>
                            <div style={{ marginTop: 12 }}>
                              <Field label={t('drafts.quizJson')}>
                                <>
                                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{t('drafts.quizJsonHint')}</div>
                                  <textarea style={{ ...textAreaStyle, minHeight: 180 }} value={quiz.quizQuestionsJson} onChange={(event) => updateQuiz(activeChapter.id, activeLesson.id, quiz.id, (item) => ({ ...item, quizQuestionsJson: event.target.value }))} />
                                </>
                              </Field>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Panel>}
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
          onSelectPath={() => { }}
          onClose={() => setIsShareModalOpen(false)}
          onSubmit={handleShareDraft}
          error={shareError}
          submitting={sharing}
          lockPath
        />
        {toast && <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 50 }}><Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} /></div>}
      </div>
    </Layout>
  )
}

export default MentorDraftFormPage
