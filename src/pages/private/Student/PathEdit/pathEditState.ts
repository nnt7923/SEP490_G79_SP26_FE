import type { SkeletonResponse } from '../../../../services/LearningPathService'
import { buildLessonContentFromSections, createEmptyLessonSections, parseLessonSections } from '../../Mentor/Drafts/lessonContentContract'
import type {
  ReadonlyQuiz,
  ReadonlyTask,
  StudentChapterPayload,
  StudentEditableChapter,
  StudentEditableLesson,
  StudentLessonPayload,
  StudentPathEditForm,
  StudentPathEditPayload,
} from './pathEditTypes'

const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`

export const toDateInput = (value?: string | null): string =>
  value ? new Date(value).toISOString().slice(0, 10) : ''

const toIsoDate = (value?: string): string | null =>
  value ? new Date(`${value}T00:00:00.000Z`).toISOString() : null

export const emptyLesson = (): StudentEditableLesson => ({
  id: uid('lesson'),
  persistedId: null,
  title: '',
  lessonDay: '',
  sections: createEmptyLessonSections(),
  quizzes: [],
})

export const emptyChapter = (): StudentEditableChapter => ({
  id: uid('chapter'),
  persistedId: null,
  title: '',
  description: '',
  startDate: '',
  endDate: '',
  estimatedDays: '',
  lessons: [emptyLesson()],
  tasks: [],
})

export const hydrateStudentForm = (payload: SkeletonResponse): StudentPathEditForm => {
  const rawChapters = Array.isArray(payload?.chapters) && payload.chapters.length > 0
    ? payload.chapters
    : []

  const chapters: StudentEditableChapter[] = rawChapters.map((chapter: any) => {
    const rawLessons = Array.isArray(chapter?.lessons) ? chapter.lessons : []

    const lessons: StudentEditableLesson[] = rawLessons.map((lesson: any) => {
      const lessonId = lesson?.id ?? lesson?.lessonId
      const rawQuizzes = Array.isArray(lesson?.quizzes) ? lesson.quizzes : []

      const quizzes: ReadonlyQuiz[] = rawQuizzes.map((quiz: any) => ({
        quizId: String(quiz?.id ?? quiz?.quizId ?? quiz?.quizzId ?? uid('quiz')),
        title: quiz?.title ?? '',
        description: quiz?.description ?? null,
        questionCount: Array.isArray(quiz?.questions) ? quiz.questions.length : 0,
      }))

      return {
        id: String(lessonId ?? uid('lesson')),
        persistedId: lessonId != null ? String(lessonId) : null,
        title: lesson?.title ?? '',
        lessonDay: toDateInput(lesson?.lessonDay ?? lesson?.LessonDay),
        sections: parseLessonSections(lesson?.content ?? ''),
        quizzes,
      }
    })

    const chapterId = chapter?.id ?? chapter?.chapterId
    const rawTasks = Array.isArray(chapter?.tasks) ? chapter.tasks : []
    const tasks: ReadonlyTask[] = rawTasks.map((task: any) => ({
      taskId: String(task?.id ?? task?.taskId ?? uid('task')),
      title: task?.title ?? '',
      taskType: task?.taskType ?? null,
      priority: task?.priority ?? null,
    }))

    return {
      id: String(chapterId ?? uid('chapter')),
      persistedId: chapterId != null ? String(chapterId) : null,
      title: chapter?.title ?? '',
      description: chapter?.content ?? chapter?.description ?? '',
      startDate: toDateInput(chapter?.startDate ?? chapter?.StartDate),
      endDate: toDateInput(chapter?.endDate ?? chapter?.EndDate),
      estimatedDays: chapter?.estimatedDays != null ? String(chapter.estimatedDays) : '',
      lessons,
      tasks,
    }
  })

  return {
    pathId: payload?.pathId ?? '',
    pathTitle: payload?.title ?? '',
    chapters: chapters.length > 0 ? chapters : [emptyChapter()],
  }
}

export const buildStudentPayload = (form: StudentPathEditForm): StudentPathEditPayload => ({
  chapters: form.chapters.map((chapter): StudentChapterPayload => ({
    title: chapter.title.trim(),
    startDate: toIsoDate(chapter.startDate),
    endDate: toIsoDate(chapter.endDate),
    estimatedDays: chapter.estimatedDays.trim() ? Number(chapter.estimatedDays) : null,
    lessons: chapter.lessons.map((lesson): StudentLessonPayload => ({
      title: lesson.title.trim(),
      lessonDay: toIsoDate(lesson.lessonDay) ?? new Date().toISOString(),
      content: buildLessonContentFromSections(lesson.sections).trim() || null,
    })),
  })),
})

export const validateStudentForm = (form: StudentPathEditForm): string | null => {
  if (form.chapters.length === 0) return 'At least one chapter is required.'
  for (let ci = 0; ci < form.chapters.length; ci++) {
    const chapter = form.chapters[ci]
    if (!chapter.title.trim()) return `Chapter ${ci + 1} is missing a title.`
    if (chapter.lessons.length === 0) return `Chapter ${ci + 1} must have at least one lesson.`
    for (let li = 0; li < chapter.lessons.length; li++) {
      const lesson = chapter.lessons[li]
      if (!lesson.title.trim()) return `Chapter ${ci + 1}, Lesson ${li + 1} is missing a title.`
      if (!lesson.lessonDay) return `Chapter ${ci + 1}, Lesson ${li + 1} is missing a date.`
    }
  }
  return null
}
