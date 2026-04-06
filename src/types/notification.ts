export type NotificationSeverity = 'Low' | 'Medium' | 'High' | 'Critical'

export type NotificationTargetType =
  | 'task'
  | 'chapter'
  | 'lesson'
  | 'learningPath'
  | 'learningPathShareUpdate'
  | 'subscription'
  | null

export interface NotificationAction {
  targetType: NotificationTargetType
  targetId: string | null
  targetUrl: string | null
  route: string | null
  taskId: string | null
  chapterId: string | null
  lessonId: string | null
  learningPathId: string | null
}

export interface NotificationDto {
  notificationId: string
  userId: string
  type: string | null
  title: string
  message: string | null
  notifiedPathTitle: string | null
  notifiedSourceVersion: number | null
  notifiedMentorUserName: string | null
  createdAt: string
  isRead: boolean
  readAt: string | null
  severity: NotificationSeverity | string
  channels: string[]
  action: NotificationAction
}

export interface NotificationPagedResultDto {
  items: NotificationDto[]
  pageNumber: number
  pageSize: number
  totalCount: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface MarkNotificationAsReadResultDto {
  notificationId: string
  isRead: boolean
  readAt: string | null
  unreadCount: number
}

export interface NotificationListQuery {
  pageNumber?: number
  pageSize?: number
  unreadOnly?: boolean
}
