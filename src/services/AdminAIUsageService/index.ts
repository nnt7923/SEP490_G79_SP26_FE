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
}

export interface UpdateMentorAIAccessPolicyPayload {
  mentorPaidRequestsMonthlyLimit: number
  mentorDowngradeNotifyCooldownHours: number
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

  return {
    mentorPaidRequestsMonthlyLimit: Math.max(0, toSafeNumber(record.mentorPaidRequestsMonthlyLimit, 0)),
    mentorDowngradeNotifyCooldownHours: Math.max(0, toSafeNumber(record.mentorDowngradeNotifyCooldownHours, 0)),
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

  async getMentorAIAccessPolicy(): Promise<MentorAIAccessPolicy> {
    const response = await api.get('/admin/ai-access-policy/mentor')
    return normalizePolicy(response)
  }

  async updateMentorAIAccessPolicy(payload: UpdateMentorAIAccessPolicyPayload): Promise<MentorAIAccessPolicy> {
    const response = await api.put('/admin/ai-access-policy/mentor', payload)
    return normalizePolicy(response)
  }
}

export default new AdminAIUsageService()
