export type ToastState = { message: string; type: 'success' | 'error' | 'warning' | 'info' }
export type Level = 'Beginner' | 'Intermediate' | 'Advanced'
export type EditorStep = 'overview' | 'chapters' | 'lesson' | 'assessments'
export type AssessmentTab = 'tasks' | 'quizzes'
export type SubjectOption = { id: string; name: string; goals: Array<{ goalId: string; title: string }> }
export type TaskType = 'Practice' | 'Theory' | 'Quizz'
export type TaskStatus = 'Pending' | 'InProgress' | 'Completed'
export type TaskPriority = 'Low' | 'Medium' | 'High'
export type QuestionType = 'TrueFalse' | 'MultipleChoice' | 'SingleChoice' | 'Matching' | 'FillInTheBlank' | 'Ordering'
export type EditableMatchingPair = {
  id: string
  left: string
  right: string
}
export type EditableQuestion = {
  id: string
  persistedId: string | null
  questionText: string
  type: QuestionType
  options: string[]
  correctAnswer: string
  points: string
  selectedAnswers: string[]
  matchingPairs: EditableMatchingPair[]
  orderingSequence: string[]
}
export type EditableQuiz = {
  id: string
  persistedId: string | null
  title: string
  description: string
  dueDate: string
  questions: EditableQuestion[]
}
export type EditableTask = {
  id: string
  persistedId: string | null
  title: string
  description: string
  priority: TaskPriority | ''
  taskStatus: TaskStatus
  dueDate: string
  taskType: TaskType
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
  versionNumber?: string
  title: string
  description: string
  startDate: string
  endDate: string
  chapters: EditableChapter[]
}
