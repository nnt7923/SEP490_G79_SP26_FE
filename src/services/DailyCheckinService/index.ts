import api from '../Axios'
import {
  dailyCheckinStatsUrl,
  dailyCheckinStatusUrl,
  myDailyCheckinUrl,
  todayDailyCheckinUrl,
} from './url'

export interface DailyCheckinDto {
  checkinId: string
  userId: string
  checkinDate: string
  mood?: string | null
  productivity?: number | null
  createdAt: string
}

export interface DailyCheckinStatsDto {
  todayCheckedIn: boolean
  currentStreak: number
  longestStreak: number
  totalCheckins: number
  lastCheckinDate?: string | null
  isStreakMilestone: boolean
  popupCode: string
  popupParams?: Record<string, string> | null
}

export interface DailyCheckinStatusDto {
  todayCheckedIn: boolean
  currentStreak: number
}

export interface DailyCheckinQueryParams {
  fromDate?: string
  toDate?: string
  pageNumber?: number
  pageSize?: number
}

export interface DailyCheckinLookupResult {
  todayCheckin: DailyCheckinDto | null
  todayCheckedIn: boolean
}

export interface DailyCheckinApiError {
  status?: number
  code?: string
  message: string
}

const unwrap = <T,>(res: any): T => {
  const data = (res?.data ?? res) as any
  if (data && typeof data === 'object') {
    if ('value' in data) return data.value as T
    if ('data' in data && data?.data && typeof data.data === 'object' && 'value' in data.data) {
      return data.data.value as T
    }
  }
  return data as T
}

const normalizeNumber = (value: unknown, fallback = 0) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

const normalizeProductivity = (value: unknown): number | null => {
  const numeric = normalizeNumber(value, NaN)
  if (!Number.isFinite(numeric)) return null
  const rounded = Math.round(numeric)
  if (rounded < 1 || rounded > 5) return null
  return rounded
}

const normalizePopupParams = (value: unknown): Record<string, string> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const entries = Object.entries(value).filter(([key]) => key.trim().length > 0)
  if (entries.length === 0) return null
  return Object.fromEntries(entries.map(([key, item]) => [key, String(item)]))
}

const normalizeDailyCheckin = (payload: any): DailyCheckinDto => ({
  checkinId: String(payload?.checkinId ?? payload?.id ?? ''),
  userId: String(payload?.userId ?? ''),
  checkinDate: String(payload?.checkinDate ?? ''),
  mood: typeof payload?.mood === 'string' && payload.mood.trim().length > 0 ? payload.mood : null,
  productivity: normalizeProductivity(payload?.productivity),
  createdAt: String(payload?.createdAt ?? payload?.checkInCreatedAt ?? ''),
})

const normalizeDailyCheckinStats = (payload: any): DailyCheckinStatsDto => ({
  todayCheckedIn: Boolean(payload?.todayCheckedIn),
  currentStreak: normalizeNumber(payload?.currentStreak),
  longestStreak: normalizeNumber(payload?.longestStreak),
  totalCheckins: normalizeNumber(payload?.totalCheckins),
  lastCheckinDate: payload?.lastCheckinDate ? String(payload.lastCheckinDate) : null,
  isStreakMilestone: Boolean(payload?.isStreakMilestone),
  popupCode: String(payload?.popupCode ?? '').trim(),
  popupParams: normalizePopupParams(payload?.popupParams),
})

const normalizeDailyCheckinStatus = (payload: any): DailyCheckinStatusDto => ({
  todayCheckedIn: Boolean(payload?.todayCheckedIn),
  currentStreak: normalizeNumber(payload?.currentStreak),
})

export const getUtcDateOnly = (value = new Date()) => value.toISOString().slice(0, 10)

export const normalizeDailyCheckinError = (error: any): DailyCheckinApiError => ({
  status: error?.response?.status,
  code: error?.response?.data?.errorCode ?? error?.response?.data?.code,
  message: error?.response?.data?.errorMessage
    || error?.response?.data?.message
    || error?.message
    || 'Daily Checkin request failed',
})

export const isDailyCheckinNotFoundError = (error: any) => {
  const normalized = normalizeDailyCheckinError(error)
  return normalized.status === 404 || normalized.code === 'DAILY_CHECKIN_NOT_FOUND'
}

export async function getTodayCheckin(): Promise<DailyCheckinDto> {
  const res: any = await api.get(todayDailyCheckinUrl)
  return normalizeDailyCheckin(unwrap(res))
}

export async function getMyCheckins(params?: DailyCheckinQueryParams): Promise<DailyCheckinDto[]> {
  const queryParams = new URLSearchParams()

  if (params?.fromDate) queryParams.append('fromDate', params.fromDate)
  if (params?.toDate) queryParams.append('toDate', params.toDate)
  if (params?.pageNumber !== undefined) queryParams.append('pageNumber', String(params.pageNumber))
  if (params?.pageSize !== undefined) queryParams.append('pageSize', String(params.pageSize))

  const url = `${myDailyCheckinUrl}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
  const res: any = await api.get(url)
  const raw = unwrap<any>(res)
  const items = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : []
  return items.map(normalizeDailyCheckin)
}

export async function getDailyCheckinStats(): Promise<DailyCheckinStatsDto> {
  const res: any = await api.get(dailyCheckinStatsUrl)
  return normalizeDailyCheckinStats(unwrap(res))
}

export async function getDailyCheckinStatus(): Promise<DailyCheckinStatusDto> {
  const res: any = await api.get(dailyCheckinStatusUrl)
  return normalizeDailyCheckinStatus(unwrap(res))
}

export async function getTodayCheckinWithFallback(date = new Date()): Promise<DailyCheckinLookupResult> {
  try {
    const todayCheckin = await getTodayCheckin()
    return {
      todayCheckin,
      todayCheckedIn: true,
    }
  } catch (error) {
    if (!isDailyCheckinNotFoundError(error)) throw error

    const utcDate = getUtcDateOnly(date)
    const items = await getMyCheckins({
      fromDate: utcDate,
      toDate: utcDate,
      pageNumber: 1,
      pageSize: 20,
    })

    return {
      todayCheckin: items[0] ?? null,
      todayCheckedIn: items.length > 0,
    }
  }
}

export default {
  getTodayCheckin,
  getMyCheckins,
  getDailyCheckinStats,
  getDailyCheckinStatus,
  getTodayCheckinWithFallback,
  getUtcDateOnly,
  normalizeDailyCheckinError,
  isDailyCheckinNotFoundError,
}
