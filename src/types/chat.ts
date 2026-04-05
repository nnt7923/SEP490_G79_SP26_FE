// ============================================================
// Chat Types — Direct Chat + Learning Path Share
// Based on: fe-chat-learningpath-ui-guide.md
// ============================================================

export type MessageType = 'Text' | 'Emoji' | 'LearningPathShare'
export type ShareStatus = 'Pending' | 'Accepted' | 'Rejected'
export type LearningPathShareUpdateAction = 'CreateNewFromLatest' | 'UpdateCurrentToLatest' | 'KeepCurrent'

/** 3.1 ConversationDTO */
export interface DirectConversationDto {
  conversationId: string
  mentorId: string
  mentorName: string
  studentId: string
  studentName: string
  lastMessagePreview: string | null
  lastMessageAt: string | null   // ISO 8601
  unreadCount: number
}

/** 3.2 MessageDTO */
export interface DirectMessageDto {
  messageId: string
  conversationId: string
  senderId: string
  content: string
  messageType: MessageType
  sentAt: string          // ISO 8601
  deliveredAt: string | null
  seenAt: string | null
  replyToMessageId?: string | null
  replyToContent?: string | null
  replyToSenderId?: string | null
  learningPathShareId?: string | null
  learningPathTitle?: string | null
  learningPathDescription?: string | null
  shareStatus?: ShareStatus | null
  pathId?: string | null
  mentorName?: string | null
  studentName?: string | null
  respondedAt?: string | null
  learningPathShare?: Partial<LearningPathShareDto> & {
    learningPathTitle?: string | null
    learningPathDescription?: string | null
    mentorName?: string | null
    studentName?: string | null
    pathId?: string | null
  }
}

/** 3.3 UnreadCount DTO */
export interface DirectUnreadCountDto {
  totalUnreadCount: number
}

/** 3.4 LearningPathShare DTO */
export interface LearningPathShareDto {
  shareId: string
  pathId: string
  mentorId: string
  studentId: string
  status: ShareStatus
  sentAt: string
  respondedAt: string | null
  acceptedPathId?: string | null
  sourceVersionAtAccept?: number | null
  ignoredSourceVersion?: number | null
  lastNotifiedSourceVersion?: number | null
  isTrackingEnabled?: boolean
  invalidatedReason?: string | null
}

/** 3.5 Pending LearningPathShare Summary DTO */
export interface PendingLearningPathShareSummaryDto {
  shareId: string
  pathId: string
  learningPathTitle: string
  learningPathDescription: string | null
  mentorId: string
  mentorName: string
  status: 'Pending'
  sentAt: string
}

export interface SentLearningPathShareSummaryDto {
  shareId: string
  pathId: string
  learningPathTitle: string
  learningPathDescription: string | null
  studentId: string
  studentName: string
  status: ShareStatus
  sentAt: string
  respondedAt: string | null
}

export interface ReceivedLearningPathShareSummaryDto {
  shareId: string
  pathId: string
  learningPathTitle: string
  learningPathDescription: string | null
  mentorId: string
  mentorName: string
  status: ShareStatus
  sentAt: string
  respondedAt: string | null
}

export interface LearningPathSharePreviewGoalDto {
  goalId: string
  title: string
  weight: number
  durationInDays?: number | null
}

export interface LearningPathSharePreviewQuizDto {
  quizzId?: string
  quizId?: string
  id?: string
  title?: string
  description?: string | null
  quizQuestionsJson?: string | null
  [key: string]: any
}

export interface LearningPathSharePreviewLessonDto {
  lessonId: string
  title: string
  content?: string | null
  lessonDay?: string | null
  quizzes?: LearningPathSharePreviewQuizDto[]
  [key: string]: any
}

export interface LearningPathSharePreviewTaskDto {
  taskId?: string
  id?: string
  title: string
  description?: string | null
  priority?: string | null
  taskStatus?: string | null
  dueDate?: string | null
  taskType?: string | number | null
  [key: string]: any
}

export interface LearningPathSharePreviewChapterDto {
  chapterId: string
  title: string
  content?: string | null
  orderIndex?: number
  lessons?: LearningPathSharePreviewLessonDto[]
  tasks?: LearningPathSharePreviewTaskDto[]
}

export interface LearningPathSharePreviewPathDto {
  pathId: string
  subjectId?: string
  subjectName?: string | null
  goals?: LearningPathSharePreviewGoalDto[]
  startDate?: string | null
  endDate?: string | null
  title?: string | null
  description?: string | null
  status?: string | null
  createdByType?: boolean
  userId?: string
  userName?: string | null
  chapterDtos?: LearningPathSharePreviewChapterDto[]
  chapterCount?: number
  createdAt?: string | null
}

export interface LearningPathSharePreviewDto {
  shareId: string
  mentorId: string
  mentorName: string
  studentId: string
  studentName: string
  status: ShareStatus
  sentAt: string
  respondedAt: string | null
  invalidatedReason?: string | null
  learningPath: LearningPathSharePreviewPathDto
}

export interface LearningPathShareVersionChangeSummaryDto {
  addedChapterCount: number
  removedChapterCount: number
  updatedChapterCount: number
  addedLessonCount: number
  removedLessonCount: number
  updatedLessonCount: number
  addedChapters: string[]
  removedChapters: string[]
  updatedChapters: string[]
  addedLessons: string[]
  removedLessons: string[]
  updatedLessons: string[]
}

export interface LearningPathShareUpdateContextDto {
  shareId: string
  sourceLearningPathId: string
  sourceLearningPathTitle: string
  acceptedPathId: string
  mentorId: string
  mentorUserName: string
  currentSourceVersion: number
  latestSourceVersion: number
  hasNewVersion: boolean
  ignoredSourceVersion: number | null
  lastNotifiedSourceVersion: number
  changeSummary: LearningPathShareVersionChangeSummaryDto | null
}

export interface LearningPathShareCardData {
  shareId: string
  pathId?: string | null
  title: string
  description?: string | null
  mentorName?: string | null
  studentName?: string | null
  status: ShareStatus
  sentAt?: string | null
  respondedAt?: string | null
}

/** Contact DTO — section 4.1.2 */
export interface DirectChatContactDto {
  userId: string
  username: string
  avatarUrl: string | null
  roleName: 'Mentor' | 'Student'
  conversationId: string | null
  lastMessageAt: string | null
}

/** NewMessageNotification event payload — section 5.3 */
export interface NewMessageNotificationPayload {
  conversationId: string
  messageId: string
  preview: string
  sentAt: string
  badgeIncrement: number
  playSound: boolean
}

/** Derived: message delivery status for UI */
export type MessageStatus = 'sent' | 'delivered' | 'seen'

export function getMessageStatus(msg: DirectMessageDto): MessageStatus {
  if (msg.seenAt) return 'seen'
  if (msg.deliveredAt) return 'delivered'
  return 'sent'
}
