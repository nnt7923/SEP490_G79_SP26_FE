import api from '../Axios'

export interface MentorQuotaStatusQuery {
  pageNumber?: number
  pageSize?: number
  nearThresholdPercent?: number
  onlyNearOrReached?: boolean
  search?: string
}

export interface MentorQuotaStatusItem {
  mentorId: string
  username: string
  email: string
  usedPaidRequestsThisMonth: number
  monthlyLimit: number
  usageRatio: number
  isNearLimit: boolean
  isReachedLimit: boolean
  windowStartUtc: string
}

export interface MentorQuotaStatusPage {
  items: MentorQuotaStatusItem[]
  pageNumber: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export interface MentorAIAccessPolicy {
  mentorPaidRequestsMonthlyLimit: number
  mentorDowngradeNotifyCooldownHours: number
  policyKey?: string
  description?: string
  isActive?: boolean
  updatedAt?: string
}

export interface UpdateMentorAIAccessPolicyPayload {
  description: string
  configJson: {
    mentorPaidRequestsMonthlyLimit: number
    mentorDowngradeNotifyCooldownHours: number
  }
  isActive: boolean
}

export interface AIUsageLogsSummaryQuery {
  fromDate?: string
  toDate?: string
  includeProviderModelBreakdown?: boolean
}

export interface AIUsageLogsQuery {
  pageNumber?: number
  pageSize?: number
  usageType?: string
  accessTierUsed?: string
  providerName?: string
  fromDate?: string
  toDate?: string
  sortBy?: string
  sortDescending?: boolean
}

export interface AIUsageSummaryItem {
  tier: string
  usageType: string
  provider: string
  model: string
  requests: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  costUsd: number
}

export interface AIUsageDailyCostItem {
  date: string
  paidCostUsd: number
  freeCostUsd: number
}

export interface AIUsageSummaryResponse {
  items: AIUsageSummaryItem[]
  totalCostUsd: number
  paidCostUsd: number
  freeCostUsd: number
  totalRequests: number
  totalTokens: number
  daily: AIUsageDailyCostItem[]
}

export interface AIUsageLogItem {
  id: string
  createdAt: string
  accessTierUsed: string
  usageType: string
  providerName: string
  modelName: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  costUsd: number
  userId: string
}

export interface AIUsageLogPage {
  items: AIUsageLogItem[]
  pageNumber: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

function buildQueryParams(query: MentorQuotaStatusQuery): URLSearchParams {
  const params = new URLSearchParams()

  if (Number.isFinite(query.pageNumber) && Number(query.pageNumber) > 0) {
    params.set('PageNumber', String(query.pageNumber))
  }

  if (Number.isFinite(query.pageSize) && Number(query.pageSize) > 0) {
    params.set('PageSize', String(query.pageSize))
  }

  if (Number.isFinite(query.nearThresholdPercent)) {
    params.set('NearThresholdPercent', String(query.nearThresholdPercent))
  }

  params.set('OnlyNearOrReached', String(Boolean(query.onlyNearOrReached)))

  if (query.search?.trim()) {
    params.set('Search', query.search.trim())
  }

  return params
}

function buildSummaryQueryParams(query: AIUsageLogsSummaryQuery): URLSearchParams {
  const params = new URLSearchParams()

  if (query.fromDate) {
    params.set('fromDate', query.fromDate)
  }

  if (query.toDate) {
    params.set('toDate', query.toDate)
  }

  if (query.includeProviderModelBreakdown !== undefined) {
    params.set('includeProviderModelBreakdown', String(Boolean(query.includeProviderModelBreakdown)))
  }

  return params
}

function buildLogsQueryParams(query: AIUsageLogsQuery): URLSearchParams {
  const params = new URLSearchParams()

  if (Number.isFinite(query.pageNumber) && Number(query.pageNumber) > 0) {
    params.set('pageNumber', String(query.pageNumber))
  }

  if (Number.isFinite(query.pageSize) && Number(query.pageSize) > 0) {
    params.set('pageSize', String(query.pageSize))
  }

  if (query.usageType?.trim()) {
    params.set('usageType', query.usageType.trim())
  }

  if (query.accessTierUsed?.trim()) {
    params.set('accessTierUsed', query.accessTierUsed.trim())
  }

  if (query.providerName?.trim()) {
    params.set('providerName', query.providerName.trim())
  }

  if (query.fromDate) {
    params.set('fromDate', query.fromDate)
  }

  if (query.toDate) {
    params.set('toDate', query.toDate)
  }

  if (query.sortBy?.trim()) {
    params.set('sortBy', query.sortBy.trim())
  }

  if (query.sortDescending !== undefined) {
    params.set('sortDescending', String(Boolean(query.sortDescending)))
  }

  return params
}

function toSafeNumber(value: unknown, fallback = 0): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function normalizeItem(raw: unknown): MentorQuotaStatusItem {
  const source = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {}

  return {
    mentorId: String(source.mentorId ?? ''),
    username: String(source.username ?? ''),
    email: String(source.email ?? ''),
    usedPaidRequestsThisMonth: toSafeNumber(source.usedPaidRequestsThisMonth),
    monthlyLimit: toSafeNumber(source.monthlyLimit),
    usageRatio: toSafeNumber(source.usageRatio),
    isNearLimit: Boolean(source.isNearLimit),
    isReachedLimit: Boolean(source.isReachedLimit),
    windowStartUtc: String(source.windowStartUtc ?? ''),
  }
}

function normalizePage(raw: unknown): MentorQuotaStatusPage {
  const data = (raw as { data?: unknown })?.data ?? raw
  const source = (data && typeof data === 'object' && (data as Record<string, unknown>).value !== undefined)
    ? (data as Record<string, unknown>).value
    : data

  const record = (source && typeof source === 'object') ? source as Record<string, unknown> : {}
  const itemsRaw = Array.isArray(record.items)
    ? record.items
    : Array.isArray(record.data)
      ? record.data
      : []

  return {
    items: itemsRaw.map(normalizeItem),
    pageNumber: Math.max(1, toSafeNumber(record.pageNumber, 1)),
    pageSize: Math.max(1, toSafeNumber(record.pageSize, itemsRaw.length || 10)),
    totalCount: Math.max(0, toSafeNumber(record.totalCount, itemsRaw.length)),
    totalPages: Math.max(1, toSafeNumber(record.totalPages, 1)),
    hasPreviousPage: Boolean(record.hasPreviousPage),
    hasNextPage: Boolean(record.hasNextPage),
  }
}

function unwrapValue(raw: unknown): unknown {
  const data = (raw as { data?: unknown })?.data ?? raw
  if (data && typeof data === 'object' && (data as Record<string, unknown>).value !== undefined) {
    return (data as Record<string, unknown>).value
  }
  return data
}

function normalizePolicy(raw: unknown): MentorAIAccessPolicy {
  const source = unwrapValue(raw)
  const record = (source && typeof source === 'object') ? source as Record<string, unknown> : {}
  const configRecord = (record.configJson && typeof record.configJson === 'object')
    ? record.configJson as Record<string, unknown>
    : {}

  const monthlyLimitRaw = configRecord.mentorPaidRequestsMonthlyLimit ?? record.mentorPaidRequestsMonthlyLimit
  const cooldownHoursRaw = configRecord.mentorDowngradeNotifyCooldownHours ?? record.mentorDowngradeNotifyCooldownHours

  return {
    mentorPaidRequestsMonthlyLimit: Math.max(0, toSafeNumber(monthlyLimitRaw, 0)),
    mentorDowngradeNotifyCooldownHours: Math.max(0, toSafeNumber(cooldownHoursRaw, 0)),
    policyKey: String(record.policyKey ?? 'mentor_ai_access_policy'),
    description: String(record.description ?? ''),
    isActive: Boolean(record.isActive),
    updatedAt: String(record.updatedAt ?? ''),
  }
}

function normalizeSummaryItem(raw: unknown): AIUsageSummaryItem {
  const source = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {}

  return {
    tier: String(source.tier ?? source.accessTierUsed ?? source.accessTier ?? 'Unknown'),
    usageType: String(source.usageType ?? source.aiUsageType ?? 'Unknown'),
    provider: String(source.provider ?? source.providerName ?? 'All'),
    model: String(source.model ?? source.modelName ?? 'All'),
    requests: toSafeNumber(source.requests ?? source.totalRequests),
    inputTokens: toSafeNumber(source.inputTokens ?? source.totalInputTokens),
    outputTokens: toSafeNumber(source.outputTokens ?? source.totalOutputTokens),
    totalTokens: toSafeNumber(source.totalTokens),
    costUsd: toSafeNumber(source.costUsd ?? source.totalCostUsd),
  }
}

function normalizeDailyItem(raw: unknown): AIUsageDailyCostItem {
  const source = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {}

  return {
    date: String(source.date ?? source.day ?? source.createdAt ?? source.usageDate ?? source.logDate ?? ''),
    paidCostUsd: toSafeNumber(
      source.paidCostUsd
      ?? source.paidCostUSD
      ?? source.totalPaidCostUsd
      ?? source.paidTotalCostUsd
      ?? source.paidUsd
      ?? source.paidCost
      ?? source.paid
      ?? 0
    ),
    freeCostUsd: toSafeNumber(
      source.freeCostUsd
      ?? source.freeCostUSD
      ?? source.totalFreeCostUsd
      ?? source.freeTotalCostUsd
      ?? source.freeUsd
      ?? source.freeCost
      ?? source.free
      ?? 0
    ),
  }
}

function normalizeDaily(rawItems: unknown[]): AIUsageDailyCostItem[] {
  const grouped = new Map<string, { paidCostUsd: number; freeCostUsd: number }>()

  rawItems.forEach((raw) => {
    const source = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {}
    const base = normalizeDailyItem(raw)
    const date = base.date

    if (!date) return

    const current = grouped.get(date) || { paidCostUsd: 0, freeCostUsd: 0 }
    const hasSplitValues =
      source.paidCostUsd !== undefined
      || source.paidCostUSD !== undefined
      || source.totalPaidCostUsd !== undefined
      || source.paidTotalCostUsd !== undefined
      || source.paidUsd !== undefined
      || source.paidCost !== undefined
      || source.paid !== undefined
      || source.freeCostUsd !== undefined
      || source.freeCostUSD !== undefined
      || source.totalFreeCostUsd !== undefined
      || source.freeTotalCostUsd !== undefined
      || source.freeUsd !== undefined
      || source.freeCost !== undefined
      || source.free !== undefined

    if (hasSplitValues) {
      current.paidCostUsd += base.paidCostUsd
      current.freeCostUsd += base.freeCostUsd
      grouped.set(date, current)
      return
    }

    const tierRaw = String(source.accessTierUsed ?? source.accessTier ?? source.tier ?? '').trim().toLowerCase()
    const cost = toSafeNumber(source.costUsd ?? source.totalCostUsd ?? source.cost ?? source.amountUsd ?? 0)

    if (tierRaw === 'paid' || tierRaw === '1') {
      current.paidCostUsd += cost
    } else if (tierRaw === 'free' || tierRaw === '0') {
      current.freeCostUsd += cost
    } else {
      current.freeCostUsd += cost
    }

    grouped.set(date, current)
  })

  return Array.from(grouped.entries())
    .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
    .map(([date, costs]) => ({
      date,
      paidCostUsd: costs.paidCostUsd,
      freeCostUsd: costs.freeCostUsd,
    }))
}

function normalizeSummary(raw: unknown): AIUsageSummaryResponse {
  const source = unwrapValue(raw)
  const record = (source && typeof source === 'object') ? source as Record<string, unknown> : {}

  const itemsRaw = Array.isArray(record.items)
    ? record.items
    : Array.isArray(record.data)
      ? record.data
      : Array.isArray(record.summaries)
        ? record.summaries
        : Array.isArray(source)
          ? source
          : []

  const dailyRaw = Array.isArray(record.daily)
    ? record.daily
    : Array.isArray(record.dailyBreakdown)
      ? record.dailyBreakdown
      : Array.isArray(record.byDate)
        ? record.byDate
        : []

  const items = itemsRaw.map(normalizeSummaryItem)
  const totalCostUsd = toSafeNumber(record.totalCostUsd, items.reduce((sum, item) => sum + item.costUsd, 0))
  const paidCostUsd = toSafeNumber(record.paidCostUsd, items.filter((item) => item.tier.toLowerCase() === 'paid').reduce((sum, item) => sum + item.costUsd, 0))
  const freeCostUsd = toSafeNumber(record.freeCostUsd, items.filter((item) => item.tier.toLowerCase() === 'free').reduce((sum, item) => sum + item.costUsd, 0))
  const totalRequests = toSafeNumber(record.totalRequests, items.reduce((sum, item) => sum + item.requests, 0))
  const totalTokens = toSafeNumber(record.totalTokens, items.reduce((sum, item) => sum + item.totalTokens, 0))

  return {
    items,
    totalCostUsd,
    paidCostUsd,
    freeCostUsd,
    totalRequests,
    totalTokens,
    daily: normalizeDaily(dailyRaw),
  }
}

function normalizeLogItem(raw: unknown): AIUsageLogItem {
  const source = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {}

  return {
    id: String(source.id ?? source.logId ?? source.aiUsageLogId ?? ''),
    createdAt: String(source.createdAt ?? source.timestamp ?? source.createdDate ?? ''),
    accessTierUsed: String(source.accessTierUsed ?? source.accessTier ?? 'Unknown'),
    usageType: String(source.usageType ?? source.aiUsageType ?? 'Unknown'),
    providerName: String(source.providerName ?? source.provider ?? ''),
    modelName: String(source.modelName ?? source.model ?? ''),
    inputTokens: toSafeNumber(source.inputTokens ?? source.totalInputTokens),
    outputTokens: toSafeNumber(source.outputTokens ?? source.totalOutputTokens),
    totalTokens: toSafeNumber(source.totalTokens),
    costUsd: toSafeNumber(source.costUsd ?? source.totalCostUsd),
    userId: String(source.userId ?? source.createdBy ?? ''),
  }
}

function normalizeLogs(raw: unknown): AIUsageLogPage {
  const source = unwrapValue(raw)
  const record = (source && typeof source === 'object') ? source as Record<string, unknown> : {}

  const itemsRaw = Array.isArray(record.items)
    ? record.items
    : Array.isArray(record.data)
      ? record.data
      : Array.isArray(source)
        ? source
        : []

  return {
    items: itemsRaw.map(normalizeLogItem),
    pageNumber: Math.max(1, toSafeNumber(record.pageNumber, 1)),
    pageSize: Math.max(1, toSafeNumber(record.pageSize, itemsRaw.length || 20)),
    totalCount: Math.max(0, toSafeNumber(record.totalCount, itemsRaw.length)),
    totalPages: Math.max(1, toSafeNumber(record.totalPages, 1)),
    hasPreviousPage: Boolean(record.hasPreviousPage),
    hasNextPage: Boolean(record.hasNextPage),
  }
}

class AdminAIUsageService {
  async getMentorQuotaStatus(query: MentorQuotaStatusQuery): Promise<MentorQuotaStatusPage> {
    const params = buildQueryParams(query)
    const queryString = params.toString()

    const response = await api.get(
      queryString
        ? `/admin/ai-usage-logs/mentor-quota-status?${queryString}`
        : '/admin/ai-usage-logs/mentor-quota-status'
    )

    return normalizePage(response)
  }

  async getMentorAIAccessPolicy(policyKey: string): Promise<MentorAIAccessPolicy> {
    const normalizedPolicyKey = encodeURIComponent(String(policyKey || '').trim())
    const response = await api.get(`/admin/system-runtime-policy/${normalizedPolicyKey}`)
    return normalizePolicy(response)
  }

  async updateMentorAIAccessPolicy(policyKey: string, payload: UpdateMentorAIAccessPolicyPayload): Promise<MentorAIAccessPolicy> {
    const normalizedPolicyKey = encodeURIComponent(String(policyKey || '').trim())
    const response = await api.put(`/admin/system-runtime-policy/${normalizedPolicyKey}`, payload)
    return normalizePolicy(response)
  }

  async getUsageLogsSummary(query: AIUsageLogsSummaryQuery): Promise<AIUsageSummaryResponse> {
    const params = buildSummaryQueryParams(query)
    const queryString = params.toString()

    const response = await api.get(
      queryString
        ? `/admin/ai-usage-logs/summary?${queryString}`
        : '/admin/ai-usage-logs/summary'
    )

    return normalizeSummary(response)
  }

  async getUsageLogs(query: AIUsageLogsQuery): Promise<AIUsageLogPage> {
    const params = buildLogsQueryParams(query)
    const queryString = params.toString()

    const response = await api.get(
      queryString
        ? `/admin/ai-usage-logs?${queryString}`
        : '/admin/ai-usage-logs'
    )

    return normalizeLogs(response)
  }
}

export default new AdminAIUsageService()
