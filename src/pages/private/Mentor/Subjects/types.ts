export type Subject = {
  subjectId: string
  name: string
  description?: string
  color?: string
  icon?: string | null
  category?: string
  createdBy?: string
  createdByUserId?: string
  createdAt?: string
  goals?: Array<{
    goalId?: string
    title: string
    description?: string
    duration?: string
    durationInDays?: number
  }>
}
