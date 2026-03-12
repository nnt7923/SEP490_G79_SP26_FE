import api from '../Axios'
import { startSessionUrl, sessionUrl, stopSessionUrl, reviewUrl, completeUrl, mySessionsUrl } from './url'

export const SessionType = {
  Pomodoro: 0,
  Study: 1,
} as const

export type SessionType = typeof SessionType[keyof typeof SessionType]

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

  return {
    id: data?.id ?? data?.sessionId,
    taskId: data?.taskId,
    sessionType: data?.sessionType,
    plannedDurationMinutes: data?.plannedDurationMinutes,
    title: data?.title ?? null,
    startTime: data?.startTime,
    endTime: data?.endTime ?? null,
    isActive: data?.isActive ?? true,
    createdAt: data?.createdAt,
    ...data,
  }
}

export async function stopSession(id: string | number): Promise<FocusSession> {
  const res: any = await api.post(stopSessionUrl(String(id)))
  const data: any = res?.data ?? res
  return {
    id: data?.id ?? data?.sessionId ?? String(id),
    taskId: data?.taskId,
    sessionType: data?.sessionType,
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
    sessionType: data?.sessionType,
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
    sessionType: s?.sessionType,
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

export default { startSession, stopSession, getSession, getMySessions, getAiReview, completeSession, SessionType }