import api from '../Axios'

export const TaskReviewStatus = {
  Pending: 'Pending',
  Reviewed: 'Reviewed',
} as const

export type TaskReviewStatus = typeof TaskReviewStatus[keyof typeof TaskReviewStatus]

export interface RequestTaskReviewPayload {
  mentorId: string
  studentRequestNote?: string | null
}

export interface SubmitTaskReviewPayload {
  score: number
  feedback: string
  suggestions?: string | null
}

export interface RequestTaskReviewResult {
  reviewId: string
  messageId: string
  conversationId: string
}

export interface TaskReviewSummary {
  reviewId: string
  mentorId: string
  mentorUserName: string | null
  score: number | null
  feedback: string | null
  suggestions: string | null
  status: TaskReviewStatus
  requestedAt: string | null
  reviewedAt: string | null
}

export interface TaskReviewDetail extends TaskReviewSummary {
  sessionId: string
  taskId: string
  taskTitle: string | null
  studentId: string
  studentUserName: string | null
  studentRequestNote: string | null
  submittedCode: string | null
  submittedSummary: string | null
  submittedQuizAnswers: string | null
  aiFeedback: string | null
  verificationScore: number | null
  isVerified: boolean
}

export interface TaskReviewListItem extends TaskReviewSummary {
  sessionId: string
  taskId: string
  taskTitle: string | null
  studentId: string
  studentUserName: string | null
  studentAvatarUrl: string | null
  mentorAvatarUrl: string | null
  studentRequestNote: string | null
}

export interface PaginatedTaskReviews {
  items: TaskReviewListItem[]
  pageNumber: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

type TranslateFn = (key: string, options?: Record<string, unknown>) => string

function unwrapObject(raw: unknown): unknown {
  const data = (raw as { data?: unknown })?.data ?? raw
  if (data && typeof data === 'object' && (data as Record<string, unknown>).value !== undefined) {
    return (data as Record<string, unknown>).value
  }
  return data
}

function toSafeNumber(value: unknown): number | null {
  if (value == null || value === '') return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function toNullableString(value: unknown): string | null {
  const normalized = String(value ?? '').trim()
  return normalized || null
}

function normalizeStatus(value: unknown): TaskReviewStatus {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (normalized === 'reviewed' || normalized === '1') return TaskReviewStatus.Reviewed
  return TaskReviewStatus.Pending
}

export function normalizeTaskReviewSummary(raw: unknown): TaskReviewSummary | null {
  const source = unwrapObject(raw)
  const record = (source && typeof source === 'object') ? source as Record<string, unknown> : {}
  const reviewId = String(record.reviewId ?? record.taskReviewId ?? record.id ?? '').trim()
  if (!reviewId) return null

  return {
    reviewId,
    mentorId: String(record.mentorId ?? '').trim(),
    mentorUserName: toNullableString(record.mentorUserName ?? record.mentorName),
    score: toSafeNumber(record.score),
    feedback: toNullableString(record.feedback),
    suggestions: toNullableString(record.suggestions),
    status: normalizeStatus(record.status),
    requestedAt: toNullableString(record.requestedAt),
    reviewedAt: toNullableString(record.reviewedAt),
  }
}

export function normalizeTaskReviewDetail(raw: unknown): TaskReviewDetail {
  const source = unwrapObject(raw)
  const record = (source && typeof source === 'object') ? source as Record<string, unknown> : {}
  const summary = normalizeTaskReviewSummary(record) ?? {
    reviewId: String(record.reviewId ?? record.taskReviewId ?? record.id ?? ''),
    mentorId: String(record.mentorId ?? ''),
    mentorUserName: null,
    score: null,
    feedback: null,
    suggestions: null,
    status: TaskReviewStatus.Pending,
    requestedAt: null,
    reviewedAt: null,
  }

  return {
    ...summary,
    sessionId: String(record.sessionId ?? ''),
    taskId: String(record.taskId ?? ''),
    taskTitle: toNullableString(record.taskTitle),
    studentId: String(record.studentId ?? ''),
    studentUserName: toNullableString(record.studentUserName ?? record.studentName),
    studentRequestNote: toNullableString(record.studentRequestNote),
    submittedCode: toNullableString(record.submittedCode),
    submittedSummary: toNullableString(record.submittedSummary),
    submittedQuizAnswers: toNullableString(record.submittedQuizAnswers),
    aiFeedback: toNullableString(record.aiFeedback),
    verificationScore: toSafeNumber(record.verificationScore),
    isVerified: Boolean(record.isVerified),
  }
}

export function normalizeTaskReviewListItem(raw: unknown): TaskReviewListItem {
  const source = unwrapObject(raw)
  const record = (source && typeof source === 'object') ? source as Record<string, unknown> : {}
  const summary = normalizeTaskReviewSummary(record) ?? {
    reviewId: String(record.reviewId ?? record.taskReviewId ?? record.id ?? ''),
    mentorId: String(record.mentorId ?? ''),
    mentorUserName: null,
    score: null,
    feedback: null,
    suggestions: null,
    status: TaskReviewStatus.Pending,
    requestedAt: null,
    reviewedAt: null,
  }

  return {
    ...summary,
    sessionId: String(record.sessionId ?? ''),
    taskId: String(record.taskId ?? ''),
    taskTitle: toNullableString(record.taskTitle),
    studentId: String(record.studentId ?? ''),
    studentUserName: toNullableString(record.studentUserName ?? record.studentName),
    studentAvatarUrl: toNullableString(record.studentAvatarUrl),
    mentorAvatarUrl: toNullableString(record.mentorAvatarUrl),
    studentRequestNote: toNullableString(record.studentRequestNote),
  }
}

const TASK_REVIEW_ERROR_MESSAGES: Record<string, string> = {
  SESSION_NOT_FOUND: 'Session was not found.',
  REVIEW_ALREADY_REQUESTED: 'A review has already been requested for this session.',
  NO_SUBMISSION: 'This session does not have any submission to review.',
  SUBSCRIPTION_NOT_FOUND: 'No active mentor subscription was found.',
  TASK_REVIEW_LIMIT_REACHED: 'Task review quota has been reached.',
  REVIEW_NOT_FOUND: 'Task review was not found.',
  REVIEW_ALREADY_SUBMITTED: 'This task review has already been submitted.',
  UNAUTHORIZED: 'You are not allowed to access this task review.',
}

export function resolveTaskReviewError(err: any, t?: TranslateFn): string {
  const code = String(
    err?.response?.data?.errorCode
    ?? err?.response?.data?.ErrorCode
    ?? err?.errorCode
    ?? '',
  ).trim().toUpperCase()
  const fallback =
    (code && TASK_REVIEW_ERROR_MESSAGES[code])
    || err?.response?.data?.message
    || err?.message
    || 'Task review request failed.'

  if (!t || !code) return fallback
  const translated = t(`codes.${code}`, { defaultValue: fallback })
  return translated === `codes.${code}` ? fallback : translated
}

class TaskReviewService {
  async requestSessionReview(
    sessionId: string,
    payload: RequestTaskReviewPayload,
  ): Promise<RequestTaskReviewResult> {
    const response = await api.post(`/task-reviews/sessions/${sessionId}/request`, payload)
    const source = unwrapObject(response)
    const record = (source && typeof source === 'object') ? source as Record<string, unknown> : {}

    return {
      reviewId: String(record.reviewId ?? record.taskReviewId ?? ''),
      messageId: String(record.messageId ?? ''),
      conversationId: String(record.conversationId ?? ''),
    }
  }

  async getTaskReviews(params: { status?: TaskReviewStatus, pageNumber?: number, pageSize?: number }): Promise<PaginatedTaskReviews> {
    const response = await api.get('/task-reviews', { params })
    const source = unwrapObject(response)
    const record = (source && typeof source === 'object') ? source as Record<string, unknown> : {}
    return {
      items: Array.isArray(record.items) ? record.items.map(normalizeTaskReviewListItem) : [],
      pageNumber: toSafeNumber(record.pageNumber) ?? 1,
      pageSize: toSafeNumber(record.pageSize) ?? 20,
      totalCount: toSafeNumber(record.totalCount) ?? 0,
      totalPages: toSafeNumber(record.totalPages) ?? 1,
      hasPreviousPage: Boolean(record.hasPreviousPage),
      hasNextPage: Boolean(record.hasNextPage),
    }
  }

  async getTaskReviewById(reviewId: string): Promise<TaskReviewDetail> {
    const response = await api.get(`/task-reviews/${reviewId}`)
    return normalizeTaskReviewDetail(response)
  }

  async submitTaskReview(
    reviewId: string,
    payload: SubmitTaskReviewPayload,
  ): Promise<{ message: string }> {
    const response = await api.put(`/task-reviews/${reviewId}`, payload)
    const source = unwrapObject(response)
    const record = (source && typeof source === 'object') ? source as Record<string, unknown> : {}
    return {
      message: String(record.message ?? 'Review submitted successfully.'),
    }
  }
}

export default new TaskReviewService()
