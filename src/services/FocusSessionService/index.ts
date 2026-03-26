import api from '../Axios'
import { startSessionUrl, sessionUrl, stopSessionUrl, pauseSessionUrl, resumeSessionUrl, reviewUrl, completeUrl, mySessionsUrl, serverTimeUrl, activeSessionUrl, activeSessionsUrl } from './url'

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
  isActive: boolean
  createdAt: string
  serverCurrentTime?: string // Add server current time for offset calculation
  // Pause/Resume specific fields
  sessionStatus?: string // "Paused", "Running", etc.
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

export async function startSession(payload: StartSessionRequest): Promise<FocusSession> {
  const res: any = await api.post(startSessionUrl, payload)
  const data: any = res?.data ?? res

  // Parse SessionType properly
  const sessionType = data?.sessionType !== undefined 
    ? parseSessionType(data.sessionType) 
    : payload.sessionType

  const result = {
    id: data?.id ?? data?.sessionId,
    taskId: data?.taskId,
    sessionType: sessionType,
    plannedDurationMinutes: data?.plannedDurationMinutes,
    title: data?.title ?? null,
    startTime: data?.startTime,
    endTime: data?.endTime ?? null,
    isActive: data?.isActive ?? true,
    createdAt: data?.createdAt,
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

export async function getAiReview(sessionId: string | number, payload: any): Promise<any> {
  const res: any = await api.post(reviewUrl(sessionId), payload)
  const data: any = res?.data ?? res

  return data
}

export async function completeSession(sessionId: string | number, payload: any): Promise<any> {
  const res: any = await api.post(completeUrl(sessionId), payload)
  const data: any = res?.data ?? res

  return data
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
    
    return {
      id: data?.id ?? data?.sessionId,
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
  } catch (error: any) {
    // Return null if no active session found (404) or other errors
    return null
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
  const data: any = res?.data ?? res
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
  const data: any = res?.data ?? res
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

export default { startSession, stopSession, getSession, getMySessions, getAiReview, completeSession, getServerTime, getActiveSession, getActiveSessions, pauseSession, resumeSession, SessionType, parseSessionType }