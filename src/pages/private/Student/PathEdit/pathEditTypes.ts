import type { LessonSectionKey } from '../../Mentor/Drafts/lessonContentContract'

export type ToastState = { message: string; type: 'success' | 'error' | 'warning' | 'info' }

export type EditorStep = 'chapters' | 'lesson'

export type ReadonlyQuiz = {
  quizId: string
  title: string
  description?: string | null
  questionCount: number
}

export type ReadonlyTask = {
  taskId: string
  title: string
  taskType?: string | number | null
  priority?: string | number | null
}

export type StudentEditableLesson = {
  id: string
  persistedId: string | null
  title: string
  lessonDay: string
  sections: Record<LessonSectionKey, string>
  quizzes: ReadonlyQuiz[]
}

export type StudentEditableChapter = {
  id: string
  persistedId: string | null
  title: string
  description: string
  startDate: string
  endDate: string
  estimatedDays: string
  lessons: StudentEditableLesson[]
  tasks: ReadonlyTask[]
}

export type StudentPathEditForm = {
  pathId: string
  pathTitle: string
  chapters: StudentEditableChapter[]
}

export type StudentChapterPayload = {
  title: string
  startDate?: string | null
  endDate?: string | null
  estimatedDays?: number | null
  lessons: StudentLessonPayload[]
}

export type StudentLessonPayload = {
  title: string
  lessonDay: string
  content?: string | null
}

export type StudentPathEditPayload = {
  chapters: StudentChapterPayload[]
}
