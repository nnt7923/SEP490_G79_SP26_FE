export type ToastState = { message: string; type: 'success' | 'error' | 'warning' | 'info' }
export type Level = 'Beginner' | 'Intermediate' | 'Advanced'
export type EditorStep = 'overview' | 'chapters' | 'lesson' | 'assessments'
export type AssessmentTab = 'tasks' | 'quizzes'
export type SubjectOption = { id: string; name: string; goals: Array<{ goalId: string; title: string }> }
export type EditableQuiz = {
  id: string
  persistedId: string | null
  title: string
  description: string
  quizQuestionsJson: string
}
export type EditableTask = {
  id: string
  persistedId: string | null
  title: string
  description: string
  priority: string
  taskStatus: string
  dueDate: string
  taskType: string
  quizQuestionsJson: string
}
export type EditableLesson = {
  id: string
  persistedId: string | null
  title: string
  lessonDay: string
  sections: Record<string, string>
  quizzes: EditableQuiz[]
}
export type EditableChapter = {
  id: string
  persistedId: string | null
  title: string
  content: string
  startDate: string
  endDate: string
  estimatedDays: string
  lessons: EditableLesson[]
  tasks: EditableTask[]
}
export type DraftFormState = {
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
