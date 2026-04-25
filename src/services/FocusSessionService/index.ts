import api from '../Axios'
import { basePath, startSessionUrl, sessionUrl, stopSessionUrl, pauseSessionUrl, resumeSessionUrl, heartbeatSessionUrl, reviewUrl, completeUrl, notesUrl, mySessionsUrl, serverTimeUrl, activeSessionUrl, activeSessionsUrl } from './url'
import type { TaskReviewSummary } from '../TaskReviewService'

export const SessionType = {
  Pomodoro: 0,
  Study: 1,
} as const

export type SessionType = typeof SessionType[keyof typeof SessionType]

// Helper function to parse SessionType from backend
export function parseSessionType(value: any): SessionType {
  // Handle string values from backend
  if (typeof value === 'string') {
    const lowerValue = value.toLowerCase()
    if (lowerValue === 'pomodoro') {
      return SessionType.Pomodoro
    }
    if (lowerValue === 'study') {
      return SessionType.Study
    }
  }
  
  // Handle number values
  if (typeof value === 'number') {
    if (value === 0) {
      return SessionType.Pomodoro
    }
    if (value === 1) {
      return SessionType.Study
    }
  }
  
  // Handle exact string matches (case sensitive)
  if (value === 'Pomodoro') {
    return SessionType.Pomodoro
  }
  if (value === 'Study') {
    return SessionType.Study
  }
  
  console.warn('Unknown SessionType value:', value, 'defaulting to Pomodoro')
  
  // Default fallback
  return SessionType.Pomodoro
}

export interface FocusSession {
  id: string
  taskId: string
  sessionType: SessionType
  plannedDurationMinutes: number
  title?: string | null
  startTime: string
  endTime?: string | null
  message?: string | null
  isActive: boolean
  createdAt: string
  serverCurrentTime?: string // Add server current time for offset calculation
  // Pause/Resume specific fields
  sessionStatus?: string // "Paused", "Running", etc.
  submittedCode?: string | null
  submittedSummary?: string | null
  submittedQuizAnswers?: string | null
  elapsedMinutes?: number
  remainingMinutes?: number
  elapsedSeconds?: number
  remainingSeconds?: number
  isOvertime?: boolean
  [key: string]: any
}

export interface StartSessionRequest {
  taskId: string
  sessionType: SessionType
  plannedDurationMinutes: number
  title?: string | null
}

export interface FocusSessionHistoryItem {
  sessionId: string
  taskId: string
  taskTitle?: string | null
  chapterTitle?: string | null
  learningPathTitle?: string | null
  title: string
  startTime: string
  endTime?: string | null
  plannedDurationMinutes: number
  actualDurationMinutes?: number | null
  sessionStatus: string
  sessionType: SessionType
  submittedCode?: string | null
  submittedSummary?: string | null
  submittedQuizAnswers?: string | null
  aiFeedback?: string | null
  verificationScore?: number | null
  isVerified: boolean
  taskReview?: TaskReviewSummary | null
  createdAt: string
  [key: string]: any
}

function normalizeTaskReviewSummary(raw: unknown): TaskReviewSummary | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  const reviewId = String(record.reviewId ?? record.taskReviewId ?? record.id ?? '').trim()
  if (!reviewId) return null

  const normalizeStatus = (value: unknown): TaskReviewSummary['status'] => {
    const normalized = String(value ?? '').trim().toLowerCase()
    return normalized === 'reviewed' || normalized === '1' ? 'Reviewed' : 'Pending'
  }

  const toNullableString = (value: unknown): string | null => {
    const normalized = String(value ?? '').trim()
    return normalized || null
  }

  const toNullableNumber = (value: unknown): number | null => {
    if (value == null || value === '') return null
    const numeric = Number(value)
    return Number.isFinite(numeric) ? numeric : null
  }

  return {
    reviewId,
    mentorId: String(record.mentorId ?? '').trim(),
    mentorUserName: toNullableString(record.mentorUserName ?? record.mentorName),
    score: toNullableNumber(record.score),
    feedback: toNullableString(record.feedback),
    suggestions: toNullableString(record.suggestions),
    status: normalizeStatus(record.status),
    requestedAt: toNullableString(record.requestedAt),
    reviewedAt: toNullableString(record.reviewedAt),
  }
}

export interface FocusSessionHistoryQuery {
  taskId?: string
  sessionStatus?: string
  sessionType?: 'Pomodoro' | 'Study'
  startedFrom?: string
  startedTo?: string
  includeAbandoned?: boolean
  pageNumber?: number
  pageSize?: number
}

export interface FocusSessionHistoryPage {
  items: FocusSessionHistoryItem[]
  pageNumber: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export interface ActiveSessionStatus {
  sessionId: string
  sessionStatus: string
  lastActivityAt: string
}

export interface FocusSessionNotePayload {
  title: string
  content: string
}

export interface CompleteSessionRequest {
  submissionType: 0 | 1
  isEarlyCompletion?: boolean
  submittedCode?: string
  submittedSummary?: string
  submittedQuizAnswers?: string
}

export interface CompleteSessionResponse {
  sessionId: string
  endTime?: string | null
  actualDurationMinutes?: number | null
  sessionStatus?: string | null
  message?: string | null
  taskCompleted?: boolean
  aiFeedback?: string | null
  verificationScore?: number | null
  [key: string]: any
}

export async function startSession(payload: StartSessionRequest): Promise<FocusSession> {
  const res: any = await api.post(startSessionUrl, payload)
  const root: any = res?.data ?? res
  const data: any = root?.data ?? root?.value ?? root

  // Parse SessionType properly
  const sessionType = data?.sessionType !== undefined 
    ? parseSessionType(data.sessionType) 
    : payload.sessionType

  const result = {
    id: data?.id ?? data?.sessionId,
    taskId: data?.taskId ?? payload.taskId,
    sessionType: sessionType,
    plannedDurationMinutes: data?.plannedDurationMinutes ?? payload.plannedDurationMinutes,
    title: data?.title ?? null,
    startTime: data?.startTime ?? new Date().toISOString(),
    endTime: data?.endTime ?? null,
    message: data?.message ?? null,
    isActive: data?.isActive ?? true,
    createdAt: data?.createdAt ?? data?.startTime ?? new Date().toISOString(),
    sessionStatus: data?.sessionStatus,
    submittedCode: data?.submittedCode ?? null,
    submittedSummary: data?.submittedSummary ?? null,
    submittedQuizAnswers: data?.submittedQuizAnswers ?? null,
    serverCurrentTime: data?.serverCurrentTime || data?.currentTime,
    // Don't spread ...data to avoid overriding parsed sessionType
  }
  return result
}

export async function stopSession(id: string | number): Promise<FocusSession> {
  const res: any = await api.post(stopSessionUrl(String(id)))
  const data: any = res?.data ?? res
  return {
    id: data?.id ?? data?.sessionId ?? String(id),
    taskId: data?.taskId,
    sessionType: parseSessionType(data?.sessionType),
    plannedDurationMinutes: data?.plannedDurationMinutes,
    title: data?.title ?? null,
    startTime: data?.startTime,
    endTime: data?.endTime,
    isActive: data?.isActive ?? false,
    createdAt: data?.createdAt,
    ...data,
  }
}

export async function getSession(id: string | number): Promise<FocusSession> {
  const res: any = await api.get(sessionUrl(String(id)))
  const data: any = res?.data ?? res
  return {
    id: data?.id ?? data?.sessionId ?? String(id),
    taskId: data?.taskId,
    sessionType: parseSessionType(data?.sessionType),
    plannedDurationMinutes: data?.plannedDurationMinutes,
    title: data?.title ?? null,
    startTime: data?.startTime,
    endTime: data?.endTime ?? null,
    isActive: data?.isActive ?? true,
    createdAt: data?.createdAt,
    ...data,
  }
}

export async function getMySessions(): Promise<FocusSession[]> {
  const res: any = await api.get(mySessionsUrl)

  // Unwrap response
  const root: any = res?.data ?? res
  let items: any[] = []
  if (Array.isArray(root)) items = root
  else if (Array.isArray(root?.items)) items = root.items
  else if (Array.isArray(root?.sessions)) items = root.sessions
  else if (Array.isArray(root?.value)) items = root.value
  else if (Array.isArray(root?.data)) items = root.data
  else if (Array.isArray(root?.data?.items)) items = root.data.items
  else if (Array.isArray(root?.data?.value)) items = root.data.value
  else if (Array.isArray(root?.data?.sessions)) items = root.data.sessions

  return items.map((s: any) => ({
    id: s?.id ?? s?.sessionId,
    taskId: s?.taskId,
    sessionType: parseSessionType(s?.sessionType),
    plannedDurationMinutes: s?.plannedDurationMinutes,
    title: s?.title ?? null,
    startTime: s?.startTime,
    endTime: s?.endTime ?? null,
    isActive: s?.isActive ?? true,
    createdAt: s?.createdAt,
    ...s,
  }))
}

export async function getSessionHistory(query: FocusSessionHistoryQuery = {}): Promise<FocusSessionHistoryPage> {
  const pageNumber = Number(query.pageNumber) > 0 ? Number(query.pageNumber) : 1
  const pageSizeRaw = Number(query.pageSize) > 0 ? Number(query.pageSize) : 10
  const pageSize = Math.min(pageSizeRaw, 50)

  const res: any = await api.get(`${basePath}/history`, {
    params: {
      ...(query.taskId ? { taskId: query.taskId } : {}),
      ...(query.sessionStatus ? { sessionStatus: query.sessionStatus } : {}),
      ...(query.sessionType ? { sessionType: query.sessionType } : {}),
      ...(query.startedFrom ? { startedFrom: query.startedFrom } : {}),
      ...(query.startedTo ? { startedTo: query.startedTo } : {}),
      ...(typeof query.includeAbandoned === 'boolean' ? { includeAbandoned: query.includeAbandoned } : {}),
      pageNumber,
      pageSize,
    },
  })

  const root: any = res?.data ?? res
  const source: any = root?.data ?? root
  const rawItems: any[] = Array.isArray(source?.items)
    ? source.items
    : Array.isArray(source?.value)
      ? source.value
      : Array.isArray(source)
        ? source
        : []

  const items: FocusSessionHistoryItem[] = rawItems.map((item: any) => ({
    ...item,
    sessionId: String(item?.sessionId ?? item?.id ?? ''),
    taskId: String(item?.taskId ?? ''),
    taskTitle: item?.taskTitle ?? null,
    chapterTitle: item?.chapterTitle ?? null,
    learningPathTitle: item?.learningPathTitle ?? null,
    title: String(item?.title ?? item?.taskTitle ?? ''),
    startTime: String(item?.startTime ?? ''),
    endTime: item?.endTime ?? null,
    plannedDurationMinutes: Number(item?.plannedDurationMinutes ?? 0),
    actualDurationMinutes: item?.actualDurationMinutes == null ? null : Number(item.actualDurationMinutes),
    sessionStatus: String(item?.sessionStatus ?? ''),
    sessionType: parseSessionType(item?.sessionType),
    submittedCode: item?.submittedCode ?? null,
    submittedSummary: item?.submittedSummary ?? null,
    submittedQuizAnswers: item?.submittedQuizAnswers ?? null,
    aiFeedback: item?.aiFeedback ?? null,
    verificationScore: item?.verificationScore == null ? null : Number(item.verificationScore),
    isVerified: Boolean(item?.isVerified),
    taskReview: normalizeTaskReviewSummary(item?.taskReview ?? item?.TaskReview),
    createdAt: String(item?.createdAt ?? item?.startTime ?? ''),
  }))

  const normalizedPageSize = Number(source?.pageSize ?? pageSize)
  const normalizedTotalCount = Number(source?.totalCount ?? items.length)
  const fallbackTotalPages = normalizedPageSize > 0 ? Math.ceil(normalizedTotalCount / normalizedPageSize) : 1

  return {
    items,
    pageNumber: Number(source?.pageNumber ?? pageNumber),
    pageSize: Number.isFinite(normalizedPageSize) && normalizedPageSize > 0 ? normalizedPageSize : pageSize,
    totalCount: Number.isFinite(normalizedTotalCount) && normalizedTotalCount >= 0 ? normalizedTotalCount : items.length,
    totalPages: Number(source?.totalPages ?? fallbackTotalPages),
  }
}

export async function getAiReview(sessionId: string | number, payload: any): Promise<any> {
  const res: any = await api.post(reviewUrl(sessionId), payload)
  const root: any = res?.data ?? res
  return root?.value ?? root?.data?.value ?? root?.data ?? root
}

export async function completeSession(sessionId: string | number, payload: CompleteSessionRequest): Promise<CompleteSessionResponse> {
  const res: any = await api.post(completeUrl(sessionId), payload)
  const root: any = res?.data ?? res
  const data: any = root?.data ?? root?.value ?? root

  return {
    ...data,
    sessionId: String(data?.sessionId ?? data?.id ?? sessionId),
    endTime: data?.endTime ?? null,
    actualDurationMinutes: data?.actualDurationMinutes == null ? null : Number(data.actualDurationMinutes),
    sessionStatus: data?.sessionStatus ?? null,
    message: data?.message ?? null,
    taskCompleted: Boolean(data?.taskCompleted),
    aiFeedback: data?.aiFeedback ?? null,
    verificationScore: data?.verificationScore == null ? null : Number(data.verificationScore),
  }
}

export async function createSessionNote(sessionId: string | number, payload: FocusSessionNotePayload): Promise<any> {
  const res: any = await api.post(notesUrl(sessionId), payload)
  const data: any = res?.data ?? res
  return data
}

export async function getSessionNotes(sessionId: string | number): Promise<any[]> {
  const res: any = await api.get(notesUrl(sessionId))
  const root: any = res?.data ?? res
  const source: any = root?.data ?? root?.value ?? root

  let items: any[] = []
  if (Array.isArray(source)) items = source
  else if (Array.isArray(source?.items)) items = source.items
  else if (Array.isArray(source?.value)) items = source.value
  else if (Array.isArray(source?.notes)) items = source.notes
  else if (Array.isArray(source?.data)) items = source.data

  return items
}

export async function getServerTime(): Promise<string> {
  const res: any = await api.get(serverTimeUrl)
  const data: any = res?.data ?? res
  return data?.currentTime || data?.serverTime || new Date().toISOString()
}

export async function getActiveSession(taskId: string): Promise<FocusSession | null> {
  try {
    const res: any = await api.get(activeSessionUrl(taskId))
    const data: any = res?.data ?? res
    
    if (!data) return null

    const parsedSessionType = data?.sessionType !== undefined
      ? parseSessionType(data?.sessionType)
      : SessionType.Pomodoro
    
    return {
      id: data?.id ?? data?.sessionId,
      taskId: data?.taskId,
      sessionType: parsedSessionType,
      plannedDurationMinutes: data?.plannedDurationMinutes,
      title: data?.title ?? null,
      startTime: data?.startTime,
      endTime: data?.endTime ?? null,
      isActive: data?.isActive ?? true,
      createdAt: data?.createdAt,
      ...data,
    }
  } catch (error: any) {
    // Return null if no active session found (404) or other errors
    return null
  }
}

export async function getActiveSessionStatus(taskId: string): Promise<ActiveSessionStatus | null> {
  try {
    const res: any = await api.get(activeSessionUrl(taskId))
    const data: any = res?.data ?? res
    if (!data?.sessionId) return null

    return {
      sessionId: String(data.sessionId),
      sessionStatus: String(data.sessionStatus ?? ''),
      lastActivityAt: String(data.lastActivityAt ?? ''),
    }
  } catch (error: any) {
    throw error
  }
}

export async function getActiveSessions(): Promise<FocusSession[]> {
  try {
    const res: any = await api.get(activeSessionsUrl)
    const data: any = res?.data ?? res
    
    let items: any[] = []
    if (Array.isArray(data)) items = data
    else if (Array.isArray(data?.items)) items = data.items
    else if (Array.isArray(data?.sessions)) items = data.sessions
    else if (Array.isArray(data?.value)) items = data.value
    else if (Array.isArray(data?.data)) items = data.data
    else items = []

    return items.map((s: any) => ({
      id: s?.id ?? s?.sessionId,
      taskId: s?.taskId,
      sessionType: parseSessionType(s?.sessionType),
      plannedDurationMinutes: s?.plannedDurationMinutes,
      title: s?.title ?? null,
      startTime: s?.startTime,
      endTime: s?.endTime ?? null,
      isActive: s?.isActive ?? true,
      createdAt: s?.createdAt,
      ...s,
    }))
  } catch (error: any) {
    return []
  }
}

export async function pauseSession(sessionId: string | number): Promise<FocusSession> {
  const res: any = await api.post(pauseSessionUrl(sessionId))
  const root: any = res?.data ?? res
  const data: any = root?.data ?? root?.value ?? root
  return {
    id: data?.id ?? data?.sessionId ?? String(sessionId),
    taskId: data?.taskId,
    sessionType: parseSessionType(data?.sessionType),
    plannedDurationMinutes: data?.plannedDurationMinutes,
    title: data?.title ?? null,
    startTime: data?.startTime,
    endTime: data?.endTime ?? null,
    isActive: data?.isActive ?? false,
    createdAt: data?.createdAt,
    // Add pause/resume specific fields
    sessionStatus: data?.sessionStatus,
    elapsedMinutes: data?.elapsedMinutes,
    remainingMinutes: data?.remainingMinutes,
    elapsedSeconds: data?.elapsedSeconds,
    remainingSeconds: data?.remainingSeconds,
    isOvertime: data?.isOvertime,
    ...data,
  }
}

export async function resumeSession(sessionId: string | number): Promise<FocusSession> {
  const res: any = await api.post(resumeSessionUrl(sessionId))
  const root: any = res?.data ?? res
  const data: any = root?.data ?? root?.value ?? root
  return {
    id: data?.id ?? data?.sessionId ?? String(sessionId),
    taskId: data?.taskId,
    sessionType: parseSessionType(data?.sessionType),
    plannedDurationMinutes: data?.plannedDurationMinutes,
    title: data?.title ?? null,
    startTime: data?.startTime,
    endTime: data?.endTime ?? null,
    isActive: data?.isActive ?? true,
    createdAt: data?.createdAt,
    // Add pause/resume specific fields
    sessionStatus: data?.sessionStatus,
    elapsedMinutes: data?.elapsedMinutes,
    remainingMinutes: data?.remainingMinutes,
    elapsedSeconds: data?.elapsedSeconds,
    remainingSeconds: data?.remainingSeconds,
    isOvertime: data?.isOvertime,
    ...data,
  }
}

export async function sendHeartbeat(sessionId: string | number): Promise<any> {
  const res: any = await api.post(heartbeatSessionUrl(sessionId))
  return res?.data ?? res
}

export default {
  startSession,
  stopSession,
  getSession,
  getMySessions,
  getSessionHistory,
  getAiReview,
  completeSession,
  createSessionNote,
  getSessionNotes,
  getServerTime,
  getActiveSession,
  getActiveSessionStatus,
  getActiveSessions,
  pauseSession,
  resumeSession,
  sendHeartbeat,
  SessionType,
  parseSessionType,
}
