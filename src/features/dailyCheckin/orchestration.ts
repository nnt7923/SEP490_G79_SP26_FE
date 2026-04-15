import type {
  DailyCheckinApiError,
  DailyCheckinDto,
  DailyCheckinLookupResult,
  DailyCheckinStatusDto,
  DailyCheckinStatsDto,
} from '../../services/DailyCheckinService'

type TranslateFn = (key: string, options?: Record<string, unknown>) => string

export interface SyncDailyCheckinDeps {
  getTodayCheckinWithFallback: () => Promise<DailyCheckinLookupResult>
  getDailyCheckinStats: () => Promise<DailyCheckinStatsDto>
  t: TranslateFn
}

export interface SyncDailyCheckinOptions {
  enabled?: boolean
  preActionStatus?: DailyCheckinStatusDto | null
}

export interface DailyCheckinActivityResult {
  todayCheckin: DailyCheckinDto | null
  todayCheckedIn: boolean
  stats: DailyCheckinStatsDto
  shouldShowPopup: boolean
  message: string
}

export const resolveDailyCheckinPopupMessage = (
  t: TranslateFn,
  popupCode?: string | null,
  popupParams?: Record<string, string> | null,
) => {
  const normalizedCode = String(popupCode ?? '').trim()
  if (!normalizedCode) return ''

  const key = `dashboard.dailyCheckin.popup.${normalizedCode}`
  const translated = t(key, {
    ...(popupParams ?? {}),
    defaultValue: '',
  })

  return translated || normalizedCode
}

export const resolveDailyCheckinErrorMessage = (
  t: TranslateFn,
  error: DailyCheckinApiError,
) => {
  const code = String(error.code ?? '').trim()
  if (code) {
    const translated = t(`dashboard.dailyCheckin.errors.${code}`, { defaultValue: '' })
    if (translated) return translated
  }

  if (error.status === 401) {
    const unauthorized = t('dashboard.dailyCheckin.errors.UNAUTHORIZED', { defaultValue: '' })
    if (unauthorized) return unauthorized
  }

  return error.message || t('dashboard.dailyCheckin.errors.DEFAULT', {
    defaultValue: 'Unable to load daily check-in data.',
  })
}

export async function syncDailyCheckinAfterActivity(
  deps: SyncDailyCheckinDeps,
  options?: SyncDailyCheckinOptions,
): Promise<DailyCheckinActivityResult | null> {
  if (options?.enabled === false) return null

  const [todayResult, stats] = await Promise.all([
    deps.getTodayCheckinWithFallback(),
    deps.getDailyCheckinStats(),
  ])

  const popupMessage = resolveDailyCheckinPopupMessage(deps.t, stats.popupCode, stats.popupParams)
  const hadCheckedInBeforeAction = options?.preActionStatus?.todayCheckedIn !== false
  const shouldShowPopup = !hadCheckedInBeforeAction && stats.todayCheckedIn && popupMessage.length > 0

  return {
    todayCheckin: todayResult.todayCheckin,
    todayCheckedIn: todayResult.todayCheckedIn,
    stats,
    shouldShowPopup,
    message: shouldShowPopup ? popupMessage : '',
  }
}
