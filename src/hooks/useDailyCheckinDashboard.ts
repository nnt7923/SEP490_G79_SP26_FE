import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import DailyCheckinService, {
  type DailyCheckinDto,
  type DailyCheckinStatsDto,
} from '../services/DailyCheckinService'
import { resolveDailyCheckinErrorMessage } from '../features/dailyCheckin/orchestration'

type DailyCheckinDashboardState = {
  loading: boolean
  error: string | null
  todayCheckin: DailyCheckinDto | null
  stats: DailyCheckinStatsDto | null
}

const initialState: DailyCheckinDashboardState = {
  loading: true,
  error: null,
  todayCheckin: null,
  stats: null,
}

const useDailyCheckinDashboard = () => {
  const { t } = useTranslation('student')
  const [state, setState] = useState<DailyCheckinDashboardState>(initialState)
  const [refreshCount, setRefreshCount] = useState(0)

  const refresh = () => setRefreshCount(prev => prev + 1)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setState((prev) => ({
        ...prev,
        loading: true,
        error: null,
      }))

      try {
        const [todayResult, stats] = await Promise.all([
          DailyCheckinService.getTodayCheckinWithFallback(),
          DailyCheckinService.getDailyCheckinStats(),
        ])

        if (cancelled) return

        setState({
          loading: false,
          error: null,
          todayCheckin: todayResult.todayCheckin,
          stats,
        })
      } catch (error: any) {
        if (cancelled) return
        setState({
          loading: false,
          error: resolveDailyCheckinErrorMessage(t, DailyCheckinService.normalizeDailyCheckinError(error)),
          todayCheckin: null,
          stats: null,
        })
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [t, refreshCount])

  return { ...state, refresh }
}

export default useDailyCheckinDashboard
