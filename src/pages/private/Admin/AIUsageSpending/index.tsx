import React, { useEffect, useMemo, useState } from 'react'
import Layout from '../../../../components/Layout'
import { useAdminSidebarConfig } from '../components/AdminSideBar'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  FilterX,
  PieChart,
  RefreshCw,
  Search,
  Wallet,
  X,
} from 'lucide-react'
import AdminAIUsageService, {
  type AIUsageDailyCostItem,
  type AIUsageLogItem,
  type AIUsageLogsQuery,
  type AIUsageSummaryItem,
} from '../../../../services/AdminAIUsageService'
import { UserService } from '../../../../services'

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]
const UTC7_OFFSET_MS = 7 * 60 * 60 * 1000
const USD_TO_VND_API_URL = 'https://open.er-api.com/v6/latest/USD'
const EXCHANGE_RATE_REFRESH_MS = 15 * 60 * 1000

type TierFilterValue = 'All' | 'Free' | 'Paid'
type SortByValue = 'CreatedAt' | 'InputTokens' | 'OutputTokens' | 'TotalTokens'
type CurrencyCode = 'USD' | 'VND'

interface FilterState {
  fromDate: string
  toDate: string
  tier: TierFilterValue
  usageType: string
  providerName: string
  includeProviderModelBreakdown: boolean
}

interface DailyTrendDataItem {
  dayKey: string
  paidCostUsd: number
  freeCostUsd: number
  totalCostUsd: number
}

const toLocalYmd = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getTodayYmd = () => toLocalYmd(new Date())

const getDateDaysAgoYmd = (daysAgo: number) => {
  const now = new Date()
  now.setDate(now.getDate() - daysAgo)
  return toLocalYmd(now)
}

const addDaysToYmd = (ymd: string, days: number) => {
  const [yearRaw, monthRaw, dayRaw] = String(ymd || '').split('-')
  const year = Number(yearRaw)
  const month = Number(monthRaw)
  const day = Number(dayRaw)

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return ymd
  }

  const nextDate = new Date(year, month - 1, day)
  nextDate.setDate(nextDate.getDate() + days)
  return toLocalYmd(nextDate)
}

const formatYmdToDmy = (input: string) => {
  const normalized = String(input || '').trim()
  const [year, month, day] = normalized.split('-')
  if (!year || !month || !day) return ''
  return `${day}/${month}/${year}`
}

const buildDefaultFilters = (): FilterState => ({
  fromDate: getDateDaysAgoYmd(6),
  toDate: getTodayYmd(),
  tier: 'All',
  usageType: 'All',
  providerName: '',
  includeProviderModelBreakdown: false,
})

const formatToken = (value: number) => {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number.isFinite(value) ? value : 0)
}

const formatCostUsd = (value: number, min = 4, max = 6) => {
  return `$${(Number.isFinite(value) ? value : 0).toLocaleString('en-US', {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  })}`
}

const formatCostByCurrency = (value: number, currency: CurrencyCode, usdToVndRate: number | null) => {
  const safeValue = Number.isFinite(value) ? value : 0

  if (currency === 'USD') {
    return formatCostUsd(safeValue)
  }

  if (!usdToVndRate || !Number.isFinite(usdToVndRate) || usdToVndRate <= 0) {
    return formatCostUsd(safeValue)
  }

  const convertedValue = safeValue * usdToVndRate
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(convertedValue)} ₫`
}

const formatUtc7DateTime = (input: string) => {
  if (!input) return '-'

  const date = new Date(input)
  if (Number.isNaN(date.getTime())) return '-'

  const utc7Date = new Date(date.getTime() + UTC7_OFFSET_MS)
  const day = String(utc7Date.getUTCDate()).padStart(2, '0')
  const month = String(utc7Date.getUTCMonth() + 1).padStart(2, '0')
  const year = utc7Date.getUTCFullYear()
  const hours = String(utc7Date.getUTCHours()).padStart(2, '0')
  const minutes = String(utc7Date.getUTCMinutes()).padStart(2, '0')

  return `${day}/${month}/${year} ${hours}:${minutes}`
}

const formatUtcRaw = (input: string) => {
  if (!input) return '-'

  const date = new Date(input)
  if (Number.isNaN(date.getTime())) return input

  return date.toISOString().replace('T', ' ').replace('Z', ' UTC')
}

const normalizeTier = (value: string): 'Free' | 'Paid' | 'Unknown' => {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'free' || normalized === '0') return 'Free'
  if (normalized === 'paid' || normalized === '1') return 'Paid'
  return 'Unknown'
}

const extractRoleName = (detail: Record<string, unknown> | null | undefined) => {
  if (!detail) return ''

  const roleObject = detail.role
  if (roleObject && typeof roleObject === 'object') {
    const roleName = String((roleObject as Record<string, unknown>).name ?? '').trim()
    if (roleName) return roleName
  }

  return String(detail.roleName ?? detail.userRole ?? '').trim()
}

const normalizeUsageTypeKey = (value: string): string => {
  return String(value || '').trim().toLowerCase().replace(/[\s_-]/g, '')
}

const toUtc7DayKey = (input: string) => {
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) return ''

  const utc7Date = new Date(date.getTime() + UTC7_OFFSET_MS)
  const year = utc7Date.getUTCFullYear()
  const month = String(utc7Date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(utc7Date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatDayLabel = (dayKey: string) => {
  if (!dayKey) return '-'
  const [year, month, day] = dayKey.split('-')
  if (!year || !month || !day) return dayKey
  return `${day}/${month}`
}

const openNativeDatePicker = (inputId: string) => {
  const element = document.getElementById(inputId) as (HTMLInputElement & { showPicker?: () => void }) | null
  if (!element) return

  if (typeof element.showPicker === 'function') {
    element.showPicker()
    return
  }

  element.focus()
  element.click()
}

const formatExchangeUpdatedDate = (input: string, locale: string) => {
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) return input || '-'

  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

const buildDailyTrendFromLogs = (items: AIUsageLogItem[]): DailyTrendDataItem[] => {
  const map = new Map<string, { paidCostUsd: number; freeCostUsd: number }>()

  items.forEach((item) => {
    const dayKey = toUtc7DayKey(item.createdAt)
    if (!dayKey) return

    const current = map.get(dayKey) || { paidCostUsd: 0, freeCostUsd: 0 }
    const tier = normalizeTier(item.accessTierUsed)
    if (tier === 'Paid') current.paidCostUsd += item.costUsd
    else current.freeCostUsd += item.costUsd
    map.set(dayKey, current)
  })

  return Array.from(map.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([dayKey, costs]) => ({
      dayKey,
      paidCostUsd: costs.paidCostUsd,
      freeCostUsd: costs.freeCostUsd,
      totalCostUsd: costs.paidCostUsd + costs.freeCostUsd,
    }))
}

const buildDailyTrendFromSummary = (items: AIUsageDailyCostItem[]): DailyTrendDataItem[] => {
  return items
    .map((item) => ({
      dayKey: item.date,
      paidCostUsd: item.paidCostUsd,
      freeCostUsd: item.freeCostUsd,
      totalCostUsd: item.paidCostUsd + item.freeCostUsd,
    }))
    .filter((item) => item.dayKey)
}

const isDailyTrendConsistentWithTotals = (
  dailyItems: DailyTrendDataItem[],
  totalPaidCostUsd: number,
  totalFreeCostUsd: number,
) => {
  if (dailyItems.length === 0) return false

  const dailyPaid = dailyItems.reduce((sum, item) => sum + item.paidCostUsd, 0)
  const dailyFree = dailyItems.reduce((sum, item) => sum + item.freeCostUsd, 0)
  const epsilon = 1e-9

  if (totalPaidCostUsd > epsilon && dailyPaid <= epsilon) return false
  if (totalFreeCostUsd > epsilon && dailyFree <= epsilon) return false

  const paidDiff = Math.abs(dailyPaid - totalPaidCostUsd)
  const freeDiff = Math.abs(dailyFree - totalFreeCostUsd)
  const paidAllowed = Math.max(0.000001, totalPaidCostUsd * 0.2)
  const freeAllowed = Math.max(0.000001, totalFreeCostUsd * 0.2)

  return paidDiff <= paidAllowed && freeDiff <= freeAllowed
}

const unwrapServiceValue = (raw: unknown): unknown => {
  const data = (raw as { data?: unknown })?.data ?? raw
  if (data && typeof data === 'object' && (data as Record<string, unknown>).value !== undefined) {
    return (data as Record<string, unknown>).value
  }
  return data
}

const normalizeUserDetail = (raw: unknown): Record<string, unknown> | null => {
  const source = unwrapServiceValue(raw)
  if (!source || typeof source !== 'object') return null
  return source as Record<string, unknown>
}

const AdminAIUsageSpendingPage: React.FC = () => {
  const { t, i18n } = useTranslation('admin')
  const navItems = useAdminSidebarConfig()

  const sidebarConfig = {
    navItems: navItems as any,
    actions: [],
    brand: { name: 'Admin', subtitle: t('aiSpending.brandSubtitle') },
  }

  const [draftFilters, setDraftFilters] = useState<FilterState>(buildDefaultFilters)
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(buildDefaultFilters)
  const [fromDateInput, setFromDateInput] = useState(() => formatYmdToDmy(buildDefaultFilters().fromDate))
  const [toDateInput, setToDateInput] = useState(() => formatYmdToDmy(buildDefaultFilters().toDate))

  const [summaryItems, setSummaryItems] = useState<AIUsageSummaryItem[]>([])
  const [summaryDaily, setSummaryDaily] = useState<AIUsageDailyCostItem[]>([])
  const [totalCostUsd, setTotalCostUsd] = useState(0)
  const [paidCostUsd, setPaidCostUsd] = useState(0)
  const [freeCostUsd, setFreeCostUsd] = useState(0)
  const [totalRequests, setTotalRequests] = useState(0)
  const [totalTokens, setTotalTokens] = useState(0)

  const [logs, setLogs] = useState<AIUsageLogItem[]>([])
  const [trendLogs, setTrendLogs] = useState<AIUsageLogItem[]>([])
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [logsLoading, setLogsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const [sortBy, setSortBy] = useState<SortByValue>('CreatedAt')
  const [sortDescending, setSortDescending] = useState(true)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [userDetailLoading, setUserDetailLoading] = useState(false)
  const [userDetailError, setUserDetailError] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedUserDetail, setSelectedUserDetail] = useState<Record<string, unknown> | null>(null)
  const [topSpenderProfiles, setTopSpenderProfiles] = useState<Record<string, { email: string; username: string; role: string }>>({})
  const [currency, setCurrency] = useState<CurrencyCode>('USD')
  const [usdToVndRate, setUsdToVndRate] = useState<number | null>(null)
  const [exchangeRateLoading, setExchangeRateLoading] = useState(false)
  const [exchangeRateUpdatedAt, setExchangeRateUpdatedAt] = useState('')

  const usageTypeOptions = useMemo(() => {
    const fallback = ['StructureGeneration', 'ContentGeneration', 'Verification', 'Assistant']
    const source = [
      ...summaryItems.map((item) => item.usageType),
      ...logs.map((item) => item.usageType),
      ...fallback,
    ]

    const unique = source
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .filter((item, index, array) => array.indexOf(item) === index)

    return ['All', ...unique]
  }, [logs, summaryItems])

  const getUsageTypeLabel = (value: string) => {
    const normalized = normalizeUsageTypeKey(value)

    if (normalized === 'structuregeneration') return t('aiSpending.usageTypeStructureGeneration')
    if (normalized === 'contentgeneration') return t('aiSpending.usageTypeContentGeneration')
    if (normalized === 'verification') return t('aiSpending.usageTypeVerification')
    if (normalized === 'assistant') return t('aiSpending.usageTypeAssistant')

    return value || '-'
  }

  const getTierLabel = (value: string) => {
    const normalized = normalizeTier(value)
    if (normalized === 'Free') return t('aiSpending.free')
    if (normalized === 'Paid') return t('aiSpending.paid')
    return t('aiSpending.unknown')
  }

  const providerOptions = useMemo(() => {
    const source = [
      ...summaryItems.map((item) => item.provider),
      ...logs.map((item) => item.providerName),
    ]

    return source
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .filter((item, index, array) => array.indexOf(item) === index)
      .slice(0, 20)
  }, [logs, summaryItems])

  const payableRawUsd = useMemo(
    () => summaryItems.reduce((sum, item) => sum + (Number.isFinite(item.totalRawRevenueUsd) ? item.totalRawRevenueUsd : 0), 0),
    [summaryItems],
  )

  const billedRevenueUsd = useMemo(
    () => summaryItems.reduce((sum, item) => sum + (Number.isFinite(item.totalRevenueUsd) ? item.totalRevenueUsd : 0), 0),
    [summaryItems],
  )

  const billedProfitUsd = useMemo(
    () => summaryItems.reduce((sum, item) => sum + (Number.isFinite(item.totalProfitUsd) ? item.totalProfitUsd : 0), 0),
    [summaryItems],
  )

  const fetchUsageData = async (silent = false) => {
    if (!silent) {
      setSummaryLoading(true)
      setLogsLoading(true)
    } else {
      setRefreshing(true)
    }

    setError('')

    const apiFromDate = appliedFilters.fromDate || undefined
    const apiToDate = appliedFilters.toDate ? addDaysToYmd(appliedFilters.toDate, 1) : undefined

    const logsQuery: AIUsageLogsQuery = {
      pageNumber,
      pageSize,
      usageType: appliedFilters.usageType !== 'All' ? appliedFilters.usageType : undefined,
      accessTierUsed: appliedFilters.tier !== 'All' ? appliedFilters.tier : undefined,
      providerName: appliedFilters.providerName.trim() || undefined,
      fromDate: apiFromDate,
      toDate: apiToDate,
      sortBy,
      sortDescending,
    }

    const trendLogsQuery: AIUsageLogsQuery = {
      pageNumber: 1,
      pageSize: 2000,
      usageType: appliedFilters.usageType !== 'All' ? appliedFilters.usageType : undefined,
      accessTierUsed: appliedFilters.tier !== 'All' ? appliedFilters.tier : undefined,
      providerName: appliedFilters.providerName.trim() || undefined,
      fromDate: apiFromDate,
      toDate: apiToDate,
      sortBy: 'CreatedAt',
      sortDescending: true,
    }

    try {
      const [summaryResponse, logsResponse, trendLogsResponse] = await Promise.all([
        AdminAIUsageService.getUsageLogsSummary({
          fromDate: apiFromDate,
          toDate: apiToDate,
          includeProviderModelBreakdown: appliedFilters.includeProviderModelBreakdown,
        }),
        AdminAIUsageService.getUsageLogs(logsQuery),
        AdminAIUsageService.getUsageLogs(trendLogsQuery),
      ])

      setSummaryItems(summaryResponse.items)
      setSummaryDaily(summaryResponse.daily)
      setTotalCostUsd(summaryResponse.totalCostUsd)
      setPaidCostUsd(summaryResponse.paidCostUsd)
      setFreeCostUsd(summaryResponse.freeCostUsd)
      setTotalRequests(summaryResponse.totalRequests)
      setTotalTokens(summaryResponse.totalTokens)

      setLogs(logsResponse.items)
      setTrendLogs(trendLogsResponse.items)
      setTotalCount(logsResponse.totalCount)
      setTotalPages(logsResponse.totalPages)
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || t('aiSpending.failedToLoad')
      setError(message)
      if (!silent) {
        setSummaryItems([])
        setSummaryDaily([])
        setLogs([])
        setTrendLogs([])
        setTotalCount(0)
        setTotalPages(1)
      }
    } finally {
      setSummaryLoading(false)
      setLogsLoading(false)
      setRefreshing(false)
    }
  }

  const fetchUsdToVndRate = async () => {
    setExchangeRateLoading(true)
    try {
      const response = await fetch(USD_TO_VND_API_URL)
      if (!response.ok) {
        throw new Error(`Exchange rate HTTP ${response.status}`)
      }

      const data = await response.json()
      const nextRate = Number(data?.rates?.VND)
      if (!Number.isFinite(nextRate) || nextRate <= 0) {
        throw new Error('Invalid exchange rate payload')
      }

      setUsdToVndRate(nextRate)
      setExchangeRateUpdatedAt(String(data?.time_last_update_utc || new Date().toISOString()))
    } catch {
      setUsdToVndRate(null)
      setExchangeRateUpdatedAt('')
    } finally {
      setExchangeRateLoading(false)
    }
  }

  useEffect(() => {
    fetchUsageData(false)
  }, [appliedFilters, pageNumber, pageSize, sortBy, sortDescending])

  useEffect(() => {
    fetchUsdToVndRate()
    const timer = window.setInterval(fetchUsdToVndRate, EXCHANGE_RATE_REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      fetchUsageData(true)
    }, 45000)

    return () => window.clearInterval(timer)
  }, [appliedFilters, pageNumber, pageSize, sortBy, sortDescending])

  const resetFilters = () => {
    const defaults = buildDefaultFilters()
    setDraftFilters(defaults)
    setFromDateInput(formatYmdToDmy(defaults.fromDate))
    setToDateInput(formatYmdToDmy(defaults.toDate))
    setAppliedFilters(defaults)
    setPageNumber(1)
    setSortBy('CreatedAt')
    setSortDescending(true)
  }

  const applyFilters = () => {
    const nextDraftFilters: FilterState = {
      ...draftFilters,
      fromDate: draftFilters.fromDate,
      toDate: draftFilters.toDate,
    }

    setDraftFilters(nextDraftFilters)
    setFromDateInput(formatYmdToDmy(nextDraftFilters.fromDate))
    setToDateInput(formatYmdToDmy(nextDraftFilters.toDate))
    setAppliedFilters(nextDraftFilters)
    setPageNumber(1)
  }

  const handleSort = (nextSortBy: SortByValue) => {
    if (sortBy === nextSortBy) {
      setSortDescending((previous) => !previous)
      return
    }

    setSortBy(nextSortBy)
    setSortDescending(true)
  }

  const getUserDisplayName = (detail: Record<string, unknown> | null) => {
    if (!detail) return '-'
    const fullName = String(detail.fullName ?? detail.name ?? '').trim()
    const firstName = String(detail.firstName ?? '').trim()
    const lastName = String(detail.lastName ?? '').trim()
    const composedName = `${firstName} ${lastName}`.trim()
    const username = String(detail.username ?? detail.userName ?? '').trim()
    return fullName || composedName || username || '-'
  }

  const getUserRole = (detail: Record<string, unknown> | null) => {
    if (!detail) return '-'
    const roleName = extractRoleName(detail)
    return roleName || '-'
  }

  const getUserStatus = (detail: Record<string, unknown> | null) => {
    if (!detail) return '-'

    if (typeof detail.isBanned === 'boolean') {
      return detail.isBanned ? t('aiSpending.userStatusBanned') : t('aiSpending.userStatusActive')
    }

    if (typeof detail.isActive === 'boolean') {
      return detail.isActive ? t('aiSpending.userStatusActive') : t('aiSpending.userStatusInactive')
    }

    const rawStatus = String(detail.status ?? detail.accountStatus ?? '').trim()
    return rawStatus || '-'
  }

  const getUserCreatedAt = (detail: Record<string, unknown> | null) => {
    if (!detail) return '-'
    const createdAt = String(detail.createdAt ?? detail.createdDate ?? '').trim()
    if (!createdAt) return '-'
    return formatUtc7DateTime(createdAt)
  }

  const closeUserDetailModal = () => {
    setIsUserModalOpen(false)
    setUserDetailLoading(false)
    setUserDetailError('')
    setSelectedUserDetail(null)
    setSelectedUserId('')
  }

  const openUserDetailModal = async (userId: string) => {
    if (!userId) return

    setIsUserModalOpen(true)
    setUserDetailLoading(true)
    setUserDetailError('')
    setSelectedUserId(userId)
    setSelectedUserDetail(null)

    try {
      const response = await UserService.getUserById(userId)
      const normalized = normalizeUserDetail(response)
      if (!normalized) {
        setUserDetailError(t('aiSpending.userDetailEmpty'))
        return
      }
      setSelectedUserDetail(normalized)
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || t('aiSpending.userDetailLoadFailed')
      setUserDetailError(message)
    } finally {
      setUserDetailLoading(false)
    }
  }

  const dailyTrendData = useMemo(() => {
    const dailyFromSummary = buildDailyTrendFromSummary(summaryDaily)
    const logsForTrend = trendLogs.length > 0 ? trendLogs : logs
    const dailyFromLogs = buildDailyTrendFromLogs(logsForTrend)

    if (isDailyTrendConsistentWithTotals(dailyFromSummary, paidCostUsd, freeCostUsd)) {
      return dailyFromSummary
    }

    return dailyFromLogs
  }, [freeCostUsd, logs, paidCostUsd, summaryDaily, trendLogs])

  const usageTypeCostByTier = useMemo(() => {
    const paidMap = new Map<string, number>()
    const freeMap = new Map<string, number>()

    summaryItems.forEach((item) => {
      const key = item.usageType || 'Unknown'
      const tier = normalizeTier(item.tier)
      if (tier === 'Paid') {
        paidMap.set(key, (paidMap.get(key) || 0) + item.costUsd)
        return
      }

      if (tier === 'Free') {
        freeMap.set(key, (freeMap.get(key) || 0) + item.costUsd)
      }
    })

    const toSortedArray = (map: Map<string, number>) =>
      Array.from(map.entries())
        .map(([usageType, costUsd]) => ({ usageType, costUsd }))
        .sort((left, right) => right.costUsd - left.costUsd)

    return {
      paid: toSortedArray(paidMap),
      free: toSortedArray(freeMap),
    }
  }, [summaryItems])

  const usageTypePaidTotalCost = usageTypeCostByTier.paid.reduce((sum, item) => sum + item.costUsd, 0)
  const usageTypeFreeTotalCost = usageTypeCostByTier.free.reduce((sum, item) => sum + item.costUsd, 0)
  const allTopSpenderRows = useMemo(() => {
    const source = trendLogs.length > 0 ? trendLogs : logs
    const map = new Map<string, { costUsd: number; totalTokens: number; requests: number }>()

    source.forEach((item) => {
      const userId = String(item.userId || '').trim()
      if (!userId) return

      const current = map.get(userId) || { costUsd: 0, totalTokens: 0, requests: 0 }
      current.costUsd += item.costUsd
      current.totalTokens += item.totalTokens
      current.requests += 1
      map.set(userId, current)
    })

    return Array.from(map.entries())
      .map(([userId, values]) => ({ userId, ...values }))
      .sort((left, right) => right.costUsd - left.costUsd)
  }, [logs, trendLogs])

  const topSpenderRows = useMemo(() => {
    return allTopSpenderRows
      .filter((item) => String(topSpenderProfiles[item.userId]?.role || '').trim().toLowerCase() === 'student')
      .slice(0, 5)
  }, [allTopSpenderRows, topSpenderProfiles])

  const maxTopSpenderCost = Math.max(...topSpenderRows.map((item) => item.costUsd), 0)

  useEffect(() => {
    const missingUserIds = allTopSpenderRows
      .slice(0, 30)
      .map((item) => item.userId)
      .filter((userId) => userId && !topSpenderProfiles[userId])

    if (missingUserIds.length === 0) {
      return
    }

    let cancelled = false

    const loadProfiles = async () => {
      const fetchedEntries = await Promise.all(
        missingUserIds.map(async (userId) => {
          try {
            const response = await UserService.getUserById(userId)
            const normalized = normalizeUserDetail(response)
            const email = String(normalized?.email ?? '').trim() || '-'
            const username = String(normalized?.username ?? normalized?.userName ?? '').trim() || '-'
            const role = extractRoleName(normalized).trim() || '-'
            return [userId, { email, username, role }] as const
          } catch {
            return [userId, { email: '-', username: '-', role: '-' }] as const
          }
        }),
      )

      if (cancelled) {
        return
      }

      setTopSpenderProfiles((previous) => {
        const next = { ...previous }
        fetchedEntries.forEach(([userId, profile]) => {
          next[userId] = profile
        })
        return next
      })
    }

    void loadProfiles()

    return () => {
      cancelled = true
    }
  }, [allTopSpenderRows, topSpenderProfiles])
  const maxDailyCost = Math.max(...dailyTrendData.map((item) => item.totalCostUsd), 0)
  const costLabelCurrency = currency === 'VND' ? 'VND' : 'USD'
  const exchangeRateLocale = i18n.language?.startsWith('vi') ? 'vi-VN' : 'en-US'
  const exchangeRateUpdatedDateText = useMemo(
    () => formatExchangeUpdatedDate(exchangeRateUpdatedAt, exchangeRateLocale),
    [exchangeRateLocale, exchangeRateUpdatedAt],
  )
  const vndUnavailable = !usdToVndRate || exchangeRateLoading

  const handleCurrencyChange = (nextCurrency: CurrencyCode) => {
    if (nextCurrency === currency) {
      return
    }

    if (nextCurrency === 'VND' && vndUnavailable) {
      return
    }

    setCurrency(nextCurrency)
  }

  const buildUsageTypeDonutSegments = (items: Array<{ usageType: string; costUsd: number }>, totalCost: number) => {
    if (totalCost <= 0) return []

    const radius = 64
    const circumference = 2 * Math.PI * radius
    let accumulatedOffset = 0
    const colors = ['#2563eb', '#0ea5e9', '#14b8a6', '#f59e0b', '#a855f7', '#ef4444', '#64748b']

    return items.map((item, index) => {
      const fraction = item.costUsd / totalCost
      const dash = circumference * fraction
      const offset = -accumulatedOffset
      accumulatedOffset += dash

      return {
        ...item,
        stroke: colors[index % colors.length],
        dash,
        offset,
        percent: fraction * 100,
      }
    })
  }

  const paidDonutSegments = useMemo(
    () => buildUsageTypeDonutSegments(usageTypeCostByTier.paid, usageTypePaidTotalCost),
    [usageTypeCostByTier.paid, usageTypePaidTotalCost],
  )

  const freeDonutSegments = useMemo(
    () => buildUsageTypeDonutSegments(usageTypeCostByTier.free, usageTypeFreeTotalCost),
    [usageTypeCostByTier.free, usageTypeFreeTotalCost],
  )

  const startIndex = logs.length === 0 ? 0 : (pageNumber - 1) * pageSize + 1
  const endIndex = Math.min(pageNumber * pageSize, totalCount)
  const isEmpty = !summaryLoading && !logsLoading && summaryItems.length === 0 && logs.length === 0 && !error

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="px-4 py-8 bg-[var(--gray-100)] min-h-screen font-mono w-full max-w-full overflow-x-hidden">
        <div className="max-w-[1120px] w-full mx-auto space-y-6 min-w-0">
          <div className="mb-6 border-b border-bd pb-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-heading border-none bg-transparent flex items-center gap-2">
                  <Wallet className="text-status-blue" size={28} />
                  {t('aiSpending.title')}
                </h1>
                <p className="text-muted mt-2">{t('aiSpending.subtitle')}</p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <button
                  type="button"
                  onClick={() => handleCurrencyChange(currency === 'USD' ? 'VND' : 'USD')}
                  disabled={vndUnavailable && currency === 'USD'}
                  className="relative h-10 w-[126px] overflow-hidden rounded-full border border-bd-input bg-th-card transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title={vndUnavailable ? t('aiSpending.exchangeRateUnavailable') : ''}
                >
                  <span
                    className={`pointer-events-none absolute left-1 top-1 h-8 w-[58px] rounded-full border border-blue-500 bg-status-blue-bg shadow-sm transition-transform duration-300 ease-out ${currency === 'VND' ? 'translate-x-[58px]' : 'translate-x-0'}`}
                  />
                  <span className="relative z-10 grid h-full grid-cols-2 text-xs font-bold">
                    <span className={`flex items-center justify-center transition-colors ${currency === 'USD' ? 'text-status-blue' : 'text-muted'}`}>
                      {t('aiSpending.currencyUsd')}
                    </span>
                    <span className={`flex items-center justify-center transition-colors ${currency === 'VND' ? 'text-status-blue' : 'text-muted'}`}>
                      {t('aiSpending.currencyVnd')}
                    </span>
                  </span>
                </button>

                <button
                  onClick={() => fetchUsageData(false)}
                  disabled={summaryLoading || logsLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-blue-600 bg-th-card text-status-blue text-sm font-bold hover:bg-status-blue-bg transition-colors cursor-pointer rounded-sm disabled:opacity-60"
                >
                  <RefreshCw className={`w-4 h-4 ${(summaryLoading || logsLoading || refreshing) ? 'animate-spin' : ''}`} />
                  {refreshing ? t('aiSpending.refreshing') : t('aiSpending.reload')}
                </button>

                <span className="text-[11px] text-muted text-right">
                  {usdToVndRate
                    ? t('aiSpending.exchangeRateLive', { rate: new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(usdToVndRate) })
                    : t('aiSpending.exchangeRateUnavailable')}
                </span>
                {exchangeRateUpdatedAt ? (
                  <span className="text-[11px] text-muted text-right">{t('aiSpending.rateUpdatedAt', { date: exchangeRateUpdatedDateText })}</span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="bg-th-card border border-bd-strong p-3 space-y-3 w-full min-w-0 overflow-x-hidden">
            <div className="flex flex-wrap items-start justify-between gap-2 min-w-0">
              <h2 className="text-sm font-bold text-heading">{t('aiSpending.filters')}</h2>
              <span className="text-xs text-muted flex-1 min-w-0 text-left md:text-right whitespace-normal break-words">{t('aiSpending.autoRefreshHint')}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 min-w-0">
              <div className="min-w-0">
                <label className="block text-xs font-bold text-muted mb-2">{t('aiSpending.fromDate')}</label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={fromDateInput}
                    onClick={() => openNativeDatePicker('ai-spending-from-date')}
                    className="w-full px-3 py-2 pr-10 border border-bd-input bg-white text-sm focus:outline-none cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => openNativeDatePicker('ai-spending-from-date')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-body cursor-pointer"
                    aria-label={t('aiSpending.fromDate')}
                  >
                    <CalendarDays size={16} />
                  </button>
                  <input
                    id="ai-spending-from-date"
                    type="date"
                    value={draftFilters.fromDate}
                    onChange={(event) => {
                      const nextValue = event.target.value || draftFilters.fromDate
                      setDraftFilters((previous) => ({ ...previous, fromDate: nextValue }))
                      setFromDateInput(formatYmdToDmy(nextValue))
                    }}
                    className="absolute inset-0 opacity-0 pointer-events-none"
                    tabIndex={-1}
                    aria-hidden="true"
                  />
                </div>
              </div>

              <div className="min-w-0">
                <label className="block text-xs font-bold text-muted mb-2">{t('aiSpending.toDate')}</label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={toDateInput}
                    onClick={() => openNativeDatePicker('ai-spending-to-date')}
                    className="w-full px-3 py-2 pr-10 border border-bd-input bg-white text-sm focus:outline-none cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => openNativeDatePicker('ai-spending-to-date')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-body cursor-pointer"
                    aria-label={t('aiSpending.toDate')}
                  >
                    <CalendarDays size={16} />
                  </button>
                  <input
                    id="ai-spending-to-date"
                    type="date"
                    value={draftFilters.toDate}
                    onChange={(event) => {
                      const nextValue = event.target.value || draftFilters.toDate
                      setDraftFilters((previous) => ({ ...previous, toDate: nextValue }))
                      setToDateInput(formatYmdToDmy(nextValue))
                    }}
                    className="absolute inset-0 opacity-0 pointer-events-none"
                    tabIndex={-1}
                    aria-hidden="true"
                  />
                </div>
              </div>

              <div className="min-w-0">
                <label className="block text-xs font-bold text-muted mb-2">{t('aiSpending.tier')}</label>
                <select
                  value={draftFilters.tier}
                  onChange={(event) => setDraftFilters((previous) => ({ ...previous, tier: event.target.value as TierFilterValue }))}
                  className="w-full px-3 py-2 border border-bd-input bg-white text-sm focus:outline-none"
                >
                  <option value="All">{t('aiSpending.all')}</option>
                  <option value="Free">{t('aiSpending.free')}</option>
                  <option value="Paid">{t('aiSpending.paid')}</option>
                </select>
              </div>

              <div className="min-w-0">
                <label className="block text-xs font-bold text-muted mb-2">{t('aiSpending.usageType')}</label>
                <select
                  value={draftFilters.usageType}
                  onChange={(event) => setDraftFilters((previous) => ({ ...previous, usageType: event.target.value }))}
                  className="w-full px-3 py-2 border border-bd-input bg-white text-sm focus:outline-none"
                >
                  {usageTypeOptions.map((item) => (
                    <option key={item} value={item}>{item === 'All' ? t('aiSpending.all') : getUsageTypeLabel(item)}</option>
                  ))}
                </select>
              </div>

              <div className="min-w-0">
                <label className="block text-xs font-bold text-muted mb-2">{t('aiSpending.provider')}</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-placeholder" />
                  <input
                    value={draftFilters.providerName}
                    onChange={(event) => setDraftFilters((previous) => ({ ...previous, providerName: event.target.value }))}
                    placeholder={providerOptions[0] || t('aiSpending.providerPlaceholder')}
                    className="w-full pl-10 pr-4 py-2 border border-bd-input bg-white text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="min-w-0">
                <label className="block text-xs font-bold text-muted mb-2">{t('aiSpending.breakdown')}</label>
                <button
                  type="button"
                  onClick={() => setDraftFilters((previous) => ({ ...previous, includeProviderModelBreakdown: !previous.includeProviderModelBreakdown }))}
                  className={`w-full h-[38px] px-3 border text-sm font-bold transition-colors cursor-pointer ${draftFilters.includeProviderModelBreakdown
                    ? 'border-blue-600 bg-status-blue-bg text-status-blue'
                    : 'border-bd-input bg-white text-body'}`}
                  title={draftFilters.includeProviderModelBreakdown ? t('aiSpending.breakdownOn') : t('aiSpending.breakdownOff')}
                >
                  <span className="block whitespace-nowrap overflow-hidden text-ellipsis">
                    {draftFilters.includeProviderModelBreakdown ? t('aiSpending.breakdownOn') : t('aiSpending.breakdownOff')}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 w-full min-w-0 pt-1">
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-2 px-3 py-2 border border-bd-input bg-th-card text-body text-sm font-bold hover:bg-th-page transition-colors cursor-pointer rounded-sm whitespace-nowrap"
              >
                <FilterX size={16} />
                {t('aiSpending.reset')}
              </button>
              <button
                onClick={applyFilters}
                className="inline-flex items-center gap-2 px-3 py-2 border border-blue-600 bg-th-card text-status-blue text-sm font-bold hover:bg-status-blue-bg transition-colors cursor-pointer rounded-sm whitespace-nowrap"
              >
                {t('aiSpending.apply')}
              </button>
            </div>
          </div>

          {error ? (
            <div className="px-4 py-3 text-sm border rounded-sm text-red-800 border-red-300 bg-red-50 flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2">
                <AlertTriangle size={16} />
                {error}
              </div>
              <button
                onClick={() => fetchUsageData(false)}
                className="px-3 py-1 border border-red-400 bg-white text-red-700 text-xs font-bold hover:bg-red-50 cursor-pointer"
              >
                {t('aiSpending.retry')}
              </button>
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {[{
              label: t('aiSpending.totalCost', { currency: costLabelCurrency }),
              value: formatCostByCurrency(totalCostUsd, currency, usdToVndRate),
              className: 'text-status-blue',
            }, {
              label: t('aiSpending.paidCost', { currency: costLabelCurrency }),
              value: formatCostByCurrency(paidCostUsd, currency, usdToVndRate),
              className: 'text-orange-700',
            }, {
              label: t('aiSpending.freeCost', { currency: costLabelCurrency }),
              value: formatCostByCurrency(freeCostUsd, currency, usdToVndRate),
              className: 'text-emerald-700',
            }, {
              label: t('aiSpending.totalRequests'),
              value: formatToken(totalRequests),
              className: 'text-heading',
            }, {
              label: t('aiSpending.totalTokens'),
              value: formatToken(totalTokens),
              className: 'text-heading',
            }, {
              label: t('aiSpending.studentPayableRaw', { currency: costLabelCurrency }),
              value: formatCostByCurrency(payableRawUsd, currency, usdToVndRate),
              className: 'text-violet-700',
            }, {
              label: t('aiSpending.studentPaidBilled', { currency: costLabelCurrency }),
              value: formatCostByCurrency(billedRevenueUsd, currency, usdToVndRate),
              className: 'text-cyan-700',
            }, {
              label: t('aiSpending.totalProfit', { currency: costLabelCurrency }),
              value: formatCostByCurrency(billedProfitUsd, currency, usdToVndRate),
              className: billedProfitUsd >= 0 ? 'text-emerald-700' : 'text-red-700',
            }].map((card) => (
              <div key={card.label} className="bg-th-card border border-bd-strong p-4">
                <div className="text-xs text-muted mb-2">{card.label}</div>
                {summaryLoading ? (
                  <div className="h-7 bg-th-page animate-pulse" />
                ) : (
                  <div className={`text-2xl font-bold ${card.className}`}>{card.value}</div>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="bg-th-card border border-bd-strong p-4">
              <div className="text-sm font-bold text-heading mb-4 inline-flex items-center gap-2">
                <BarChart3 size={16} className="text-status-blue" />
                {t('aiSpending.topSpenders')}
              </div>

              {summaryLoading ? (
                <div className="h-[260px] bg-th-page animate-pulse" />
              ) : topSpenderRows.length === 0 ? (
                <div className="h-[260px] flex items-center justify-center text-sm text-muted">{t('aiSpending.noDataInRange')}</div>
              ) : (
                <div className="space-y-4 min-w-0">
                  <div className="border border-bd bg-th-page/50 p-3">
                    <div className="text-xs text-muted mb-1">{t('aiSpending.topSpendersHint')}</div>
                    <div className="text-sm font-bold text-heading">{t('aiSpending.topSpendersShareHint')}</div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 min-w-0">
                    {topSpenderRows.map((row) => {
                      const profile = topSpenderProfiles[row.userId]
                      const profileLabel = profile
                        ? `${profile.email} | ${profile.username}`
                        : '... | ...'
                      const sharePercent = totalCostUsd > 0 ? (row.costUsd / totalCostUsd) * 100 : 0
                      return (
                        <div key={`top-spender-${row.userId}`} className="space-y-1.5">
                          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-xs">
                            <div className="inline-flex items-center gap-2 min-w-0">
                              <span className="w-3 h-3 inline-block bg-blue-500" />
                              <button
                                type="button"
                                className="truncate font-semibold text-heading text-left hover:text-status-blue cursor-pointer"
                                title={profileLabel}
                                onClick={() => openUserDetailModal(row.userId)}
                              >
                                {profileLabel}
                              </button>
                            </div>
                            <div className="text-status-blue font-semibold whitespace-nowrap">{sharePercent.toFixed(1)}%</div>
                          </div>

                          <div className="h-3 bg-th-page overflow-hidden">
                            <div
                              className="h-full"
                              style={{
                                width: `${maxTopSpenderCost > 0 ? Math.max(6, (row.costUsd / maxTopSpenderCost) * 100) : 0}%`,
                                background: '#3b82f6',
                              }}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px] text-muted tabular-nums">
                            <span>{t('aiSpending.cost', { currency: costLabelCurrency })}: {formatCostByCurrency(row.costUsd, currency, usdToVndRate)}</span>
                            <span className="text-right">{t('aiSpending.totalTokens')}: {formatToken(row.totalTokens)}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-stretch">
              <div className="bg-th-card border border-bd-strong p-4 h-full min-h-[420px] flex flex-col">
                <div className="text-sm font-bold text-heading mb-4 inline-flex items-center gap-2">
                  <BarChart3 size={16} className="text-status-blue" />
                  {t('aiSpending.dailyTrend')}
                </div>

                {summaryLoading ? (
                  <div className="h-[300px] bg-th-page animate-pulse" />
                ) : dailyTrendData.length === 0 ? (
                  <div className="h-[300px] flex items-center justify-center text-sm text-muted">{t('aiSpending.noDataInRange')}</div>
                ) : (
                  <div className="h-[300px] flex items-end gap-2 overflow-x-auto pb-2">
                    {dailyTrendData.map((item) => {
                      const freeHeight = maxDailyCost > 0 && item.freeCostUsd > 0 ? Math.max(4, (item.freeCostUsd / maxDailyCost) * 180) : 0
                      const paidHeight = maxDailyCost > 0 && item.paidCostUsd > 0 ? Math.max(4, (item.paidCostUsd / maxDailyCost) * 180) : 0
                      return (
                        <div key={item.dayKey} className="flex flex-col items-center min-w-[48px]" title={`${item.dayKey} | Free: ${formatCostByCurrency(item.freeCostUsd, currency, usdToVndRate)} | Paid: ${formatCostByCurrency(item.paidCostUsd, currency, usdToVndRate)}`}>
                          <div className="w-8 flex flex-col justify-end">
                            {paidHeight > 0 ? <div style={{ height: `${paidHeight}px` }} className="bg-orange-500" /> : null}
                            {freeHeight > 0 ? <div style={{ height: `${freeHeight}px` }} className={`bg-emerald-500 ${paidHeight > 0 ? 'border-t border-white' : ''}`} /> : null}
                          </div>
                          <span className="text-[10px] text-muted mt-2">{formatDayLabel(item.dayKey)}</span>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div className="flex gap-4 text-xs mt-3">
                  <span className="inline-flex items-center gap-1"><span className="w-3 h-3 bg-orange-500 inline-block" />{t('aiSpending.paid')}</span>
                  <span className="inline-flex items-center gap-1"><span className="w-3 h-3 bg-emerald-500 inline-block" />{t('aiSpending.free')}</span>
                </div>
              </div>

              <div className="bg-th-card border border-bd-strong p-4 h-full min-h-[420px] flex flex-col">
              <div className="text-sm font-bold text-heading mb-4 inline-flex items-center gap-2">
                <PieChart size={16} className="text-status-blue" />
                {t('aiSpending.usageTypeSplit')}
              </div>

              {summaryLoading ? (
                <div className="h-[300px] bg-th-page animate-pulse" />
              ) : (usageTypePaidTotalCost + usageTypeFreeTotalCost) <= 0 ? (
                <div className="h-[300px] flex items-center justify-center text-sm text-muted">{t('aiSpending.noDataInRange')}</div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 min-w-0">
                  {[{
                    key: 'paid',
                    label: t('aiSpending.paid'),
                    totalCost: usageTypePaidTotalCost,
                    segments: paidDonutSegments,
                  }, {
                    key: 'free',
                    label: t('aiSpending.free'),
                    totalCost: usageTypeFreeTotalCost,
                    segments: freeDonutSegments,
                  }].map((group) => (
                    <div key={group.key} className="border border-bd p-4 bg-th-card min-w-0 rounded-sm">
                      <div className="text-xs font-bold text-heading mb-4">{t('aiSpending.total')} {group.label}</div>
                      {group.totalCost <= 0 ? (
                        <div className="h-[180px] flex items-center justify-center text-xs text-muted">{t('aiSpending.noDataInRange')}</div>
                      ) : (
                        <div className="grid grid-cols-1 2xl:grid-cols-[140px_minmax(0,1fr)] gap-4 items-center min-w-0">
                          <div className="flex justify-center">
                            <svg width="140" height="140" viewBox="0 0 140 140">
                              <circle cx="70" cy="70" r="50" fill="transparent" stroke="var(--bg-page)" strokeWidth="18" />
                              {group.segments.map((segment) => (
                                <circle
                                  key={`${group.key}-${segment.usageType}`}
                                  cx="70"
                                  cy="70"
                                  r="50"
                                  fill="transparent"
                                  stroke={segment.stroke}
                                  strokeWidth="18"
                                  strokeDasharray={`${segment.dash} ${2 * Math.PI * 50}`}
                                  strokeDashoffset={segment.offset}
                                  transform="rotate(-90 70 70)"
                                />
                              ))}
                              <text x="70" y="68" textAnchor="middle" className="fill-current text-heading" style={{ fontSize: 13, fontWeight: 700 }}>
                                {group.label}
                              </text>
                              <text x="70" y="84" textAnchor="middle" className="fill-current text-body" style={{ fontSize: 11 }}>
                                {formatCostByCurrency(group.totalCost, currency, usdToVndRate)}
                              </text>
                            </svg>
                          </div>

                          <div className="space-y-2 min-w-0 pr-1">
                            {group.segments.map((segment) => (
                              <div key={`${group.key}-${segment.usageType}-legend`} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 text-[11px]">
                                <div className="inline-flex items-center gap-2 min-w-0">
                                  <span className="w-3 h-3 inline-block" style={{ background: segment.stroke }} />
                                  <span className="truncate" title={getUsageTypeLabel(segment.usageType)}>{getUsageTypeLabel(segment.usageType)}</span>
                                </div>
                                <div className="text-right tabular-nums leading-tight shrink-0">
                                  <div className="font-bold text-heading">{formatCostByCurrency(segment.costUsd, currency, usdToVndRate)}</div>
                                  <div className="text-status-blue font-semibold">{segment.percent.toFixed(1)}%</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              </div>
            </div>
          </div>

          <div className="bg-th-card border border-bd-strong overflow-hidden">
            <div className="px-4 py-3 border-b border-bd flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-heading">{t('aiSpending.summaryTable')}</h2>
              <span className="text-xs text-muted">{appliedFilters.includeProviderModelBreakdown ? t('aiSpending.breakdownOn') : t('aiSpending.breakdownOff')}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse table-fixed">
                <thead className="bg-th-input border-b border-bd text-heading text-xs font-semibold">
                  <tr>
                    <th className="p-3 w-[80px]">{t('aiSpending.tier')}</th>
                    <th className="p-3 w-[150px]">{t('aiSpending.usageType')}</th>
                    <th className="p-3 w-[120px]">{t('aiSpending.provider')}</th>
                    <th className="p-3 w-[140px]">{t('aiSpending.model')}</th>
                    <th className="p-3 w-[90px]">{t('aiSpending.requests')}</th>
                    <th className="p-3 w-[105px]">{t('aiSpending.inputTokens')}</th>
                    <th className="p-3 w-[105px]">{t('aiSpending.outputTokens')}</th>
                    <th className="p-3 w-[110px]">{t('aiSpending.totalTokens')}</th>
                    <th className="p-3 w-[120px]">{t('aiSpending.cost', { currency: costLabelCurrency })}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-layer text-body text-sm">
                  {summaryLoading ? (
                    Array.from({ length: 4 }).map((_, index) => (
                      <tr key={`summary-skeleton-${index}`}>
                        <td colSpan={9} className="p-3"><div className="h-5 bg-th-page animate-pulse" /></td>
                      </tr>
                    ))
                  ) : summaryItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-6 text-center text-muted">{t('aiSpending.noDataInRange')}</td>
                    </tr>
                  ) : (
                    summaryItems.map((item, index) => (
                      <tr key={`${item.tier}-${item.usageType}-${item.provider}-${item.model}-${index}`} className="hover:bg-th-page/70 transition-colors">
                        <td className="p-3 whitespace-nowrap">{getTierLabel(item.tier)}</td>
                        <td className="p-3 truncate" title={item.usageType}>{getUsageTypeLabel(item.usageType)}</td>
                        <td className="p-3 truncate" title={item.provider}>{appliedFilters.includeProviderModelBreakdown ? item.provider : t('aiSpending.all')}</td>
                        <td className="p-3 truncate" title={item.model}>{appliedFilters.includeProviderModelBreakdown ? item.model : t('aiSpending.all')}</td>
                        <td className="p-3 whitespace-nowrap">{formatToken(item.requests)}</td>
                        <td className="p-3 whitespace-nowrap">{formatToken(item.inputTokens)}</td>
                        <td className="p-3 whitespace-nowrap">{formatToken(item.outputTokens)}</td>
                        <td className="p-3 whitespace-nowrap">{formatToken(item.totalTokens)}</td>
                        <td className="p-3 whitespace-nowrap">{formatCostByCurrency(item.costUsd, currency, usdToVndRate)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-th-card border border-bd-strong overflow-hidden">
            <div className="px-4 py-3 border-b border-bd flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-heading">{t('aiSpending.logsTable')}</h2>
              <div className="inline-flex items-center gap-2 text-xs">
                <span className="text-muted">{t('aiSpending.pageSize')}</span>
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value))
                    setPageNumber(1)
                  }}
                  className="px-2 py-1 border border-bd-input bg-white text-xs"
                >
                  {PAGE_SIZE_OPTIONS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse table-fixed">
                <thead className="bg-th-input border-b border-bd text-heading text-xs font-semibold">
                  <tr>
                    <th className="p-3 w-[190px] cursor-pointer" onClick={() => handleSort('CreatedAt')}>
                      <span className="inline-flex items-center gap-1">{t('aiSpending.createdAtUtc7')}{sortBy === 'CreatedAt' ? (sortDescending ? '↓' : '↑') : ''}</span>
                    </th>
                    <th className="p-3 w-[90px]">{t('aiSpending.tier')}</th>
                    <th className="p-3 w-[150px]">{t('aiSpending.usageType')}</th>
                    <th className="p-3 w-[130px]">{t('aiSpending.provider')}</th>
                    <th className="p-3 w-[130px]">{t('aiSpending.model')}</th>
                    <th className="p-3 w-[110px] cursor-pointer" onClick={() => handleSort('InputTokens')}>
                      <span className="inline-flex items-center gap-1">{t('aiSpending.inputTokens')}{sortBy === 'InputTokens' ? (sortDescending ? '↓' : '↑') : ''}</span>
                    </th>
                    <th className="p-3 w-[110px] cursor-pointer" onClick={() => handleSort('OutputTokens')}>
                      <span className="inline-flex items-center gap-1">{t('aiSpending.outputTokens')}{sortBy === 'OutputTokens' ? (sortDescending ? '↓' : '↑') : ''}</span>
                    </th>
                    <th className="p-3 w-[120px] cursor-pointer" onClick={() => handleSort('TotalTokens')}>
                      <span className="inline-flex items-center gap-1">{t('aiSpending.totalTokens')}{sortBy === 'TotalTokens' ? (sortDescending ? '↓' : '↑') : ''}</span>
                    </th>
                    <th className="p-3 w-[120px]">{t('aiSpending.cost', { currency: costLabelCurrency })}</th>
                    <th className="p-3 w-[90px]">{t('aiSpending.userDetails')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-layer text-body text-sm">
                  {logsLoading ? (
                    Array.from({ length: 8 }).map((_, index) => (
                      <tr key={`logs-skeleton-${index}`}>
                        <td colSpan={10} className="p-3"><div className="h-5 bg-th-page animate-pulse" /></td>
                      </tr>
                    ))
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-6 text-center text-muted">{t('aiSpending.noDataInRange')}</td>
                    </tr>
                  ) : (
                    logs.map((row, index) => (
                      <tr key={`${row.id || row.createdAt}-${index}`} className="hover:bg-th-page/70 transition-colors">
                        <td className="p-3 whitespace-nowrap" title={formatUtcRaw(row.createdAt)}>{formatUtc7DateTime(row.createdAt)}</td>
                        <td className="p-3 whitespace-nowrap">{getTierLabel(row.accessTierUsed)}</td>
                        <td className="p-3 truncate" title={row.usageType}>{getUsageTypeLabel(row.usageType)}</td>
                        <td className="p-3 truncate" title={row.providerName}>{row.providerName || '-'}</td>
                        <td className="p-3 truncate" title={row.modelName}>{row.modelName || '-'}</td>
                        <td className="p-3 whitespace-nowrap">{formatToken(row.inputTokens)}</td>
                        <td className="p-3 whitespace-nowrap">{formatToken(row.outputTokens)}</td>
                        <td className="p-3 whitespace-nowrap">{formatToken(row.totalTokens)}</td>
                        <td className="p-3 whitespace-nowrap">{formatCostByCurrency(row.costUsd, currency, usdToVndRate)}</td>
                        <td className="p-3">
                          {row.userId ? (
                            <button
                              onClick={() => openUserDetailModal(row.userId)}
                              className="inline-flex items-center justify-center p-1 border border-bd-input hover:border-blue-600 hover:text-status-blue cursor-pointer"
                              title={t('aiSpending.viewUserDetails')}
                            >
                              <Eye size={14} />
                            </button>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-bd flex flex-col md:flex-row items-center justify-between gap-4 bg-th-input/30">
              <span className="text-sm text-muted">
                {t('aiSpending.showing', { start: startIndex, end: endIndex, total: totalCount })}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPageNumber((previous) => Math.max(1, previous - 1))}
                  disabled={pageNumber <= 1 || logsLoading}
                  className="p-1 text-body hover:bg-th-card border border-transparent hover:border-bd disabled:opacity-30 transition-all"
                >
                  <ChevronLeft size={20} />
                </button>

                <span className="text-sm font-medium text-heading min-w-[5rem] text-center">
                  {pageNumber} / {totalPages}
                </span>

                <button
                  onClick={() => setPageNumber((previous) => Math.min(totalPages, previous + 1))}
                  disabled={pageNumber >= totalPages || logsLoading}
                  className="p-1 text-body hover:bg-th-card border border-transparent hover:border-bd disabled:opacity-30 transition-all"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>

          {isEmpty ? (
            <div className="bg-th-card border border-bd-strong p-6 text-center">
              <p className="text-sm text-muted mb-3">{t('aiSpending.noDataInRange')}</p>
              <button
                onClick={resetFilters}
                className="px-4 py-2 border border-blue-600 text-status-blue font-bold text-sm hover:bg-status-blue-bg cursor-pointer"
              >
                {t('aiSpending.reset')}
              </button>
            </div>
          ) : null}

          {isUserModalOpen ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-xl bg-th-card border border-bd-strong shadow-xl">
                <div className="px-4 py-3 border-b border-bd flex items-center justify-between gap-3">
                  <h3 className="text-base font-bold text-heading">{t('aiSpending.userDetailModalTitle')}</h3>
                  <button
                    type="button"
                    onClick={closeUserDetailModal}
                    className="p-1 border border-bd-input hover:border-blue-600 hover:text-status-blue cursor-pointer"
                    title={t('aiSpending.close')}
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="p-4 space-y-3 text-sm">
                  <div className="grid grid-cols-[120px_1fr] gap-2">
                    <span className="text-muted font-bold">{t('aiSpending.userId')}</span>
                    <span className="text-body break-all">{selectedUserId || '-'}</span>
                  </div>

                  {userDetailLoading ? (
                    <div className="text-muted">{t('aiSpending.userDetailLoading')}</div>
                  ) : userDetailError ? (
                    <div className="text-red-700">{userDetailError}</div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-muted font-bold">{t('aiSpending.userName')}</span>
                        <span className="text-body break-all">{String(selectedUserDetail?.username ?? selectedUserDetail?.userName ?? '-')}</span>
                      </div>
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-muted font-bold">{t('aiSpending.fullName')}</span>
                        <span className="text-body break-all">{getUserDisplayName(selectedUserDetail)}</span>
                      </div>
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-muted font-bold">{t('aiSpending.email')}</span>
                        <span className="text-body break-all">{String(selectedUserDetail?.email ?? '-')}</span>
                      </div>
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-muted font-bold">{t('aiSpending.role')}</span>
                        <span className="text-body break-all">{getUserRole(selectedUserDetail)}</span>
                      </div>
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-muted font-bold">{t('aiSpending.status')}</span>
                        <span className="text-body break-all">{getUserStatus(selectedUserDetail)}</span>
                      </div>
                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <span className="text-muted font-bold">{t('aiSpending.createdAt')}</span>
                        <span className="text-body break-all">{getUserCreatedAt(selectedUserDetail)}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-4 py-3 border-t border-bd flex justify-end">
                  <button
                    type="button"
                    onClick={closeUserDetailModal}
                    className="px-4 py-2 border border-blue-600 text-status-blue font-bold text-sm hover:bg-status-blue-bg cursor-pointer"
                  >
                    {t('aiSpending.close')}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </Layout>
  )
}

export default AdminAIUsageSpendingPage
