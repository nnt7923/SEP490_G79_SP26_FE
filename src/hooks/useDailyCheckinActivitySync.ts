import { useTranslation } from 'react-i18next'
import DailyCheckinService from '../services/DailyCheckinService'
import { syncDailyCheckinAfterActivity, type SyncDailyCheckinOptions } from '../features/dailyCheckin/orchestration'

const useDailyCheckinActivitySync = () => {
  const { t } = useTranslation('student')

  return async (options?: SyncDailyCheckinOptions) => {
    try {
      return await syncDailyCheckinAfterActivity(
        {
          getTodayCheckinWithFallback: () => DailyCheckinService.getTodayCheckinWithFallback(),
          getDailyCheckinStats: () => DailyCheckinService.getDailyCheckinStats(),
          t,
        },
        options,
      )
    } catch (error) {
      console.warn('Daily Checkin sync failed after learning activity.', error)
      return null
    }
  }
}

export default useDailyCheckinActivitySync
