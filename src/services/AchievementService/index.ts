import api from '../Axios'

export const ACHIEVEMENT_CATEGORIES = [
  'LearningMilestone',
  'Consistency',
  'Focus',
  'Goals',
  'Social',
  'Special',
] as const

export type AchievementCategory = (typeof ACHIEVEMENT_CATEGORIES)[number]

export interface AchievementDto {
  achievementId: string
  name: string
  description: string
  icon: string
  points: number
  category: AchievementCategory
  isActive: boolean
}

export interface UserAchievementDto {
  achievementId: string
  isUnlocked: boolean
  unlockedAt?: string | null
  progressCurrent?: number
  progressTarget?: number
  name?: string
  description?: string
  icon?: string
  points?: number
  category?: string
}

export interface AchievementStatsDto {
  unlockedCount: number
  totalCount: number
  totalPoints: number
  currentLevel: number
  pointsToNextLevel: number
  progressToNextLevel: number
}

export interface AchievementNotificationDto {
  achievementId: string
  name: string
  points: number
  unlockedAt: string
}

export interface GetMyAchievementsQuery {
  unlockedOnly?: boolean
  category?: AchievementCategory
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toStringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function toPercentage(value: unknown, fallback: number): number {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.endsWith('%')) {
      const parsed = Number(trimmed.slice(0, -1).trim())
      return Number.isFinite(parsed) ? parsed : fallback
    }
  }

  return toNumber(value, fallback)
}

function normalizeCategory(category: unknown): AchievementCategory {
  const raw = toStringValue(category)
  return (ACHIEVEMENT_CATEGORIES as readonly string[]).includes(raw)
    ? raw as AchievementCategory
    : 'Special'
}

function unwrapArrayResponse(root: unknown): unknown[] {
  if (Array.isArray(root)) return root
  if (!isRecord(root)) return []

  if (Array.isArray(root.data)) return root.data
  if (Array.isArray(root.items)) return root.items
  if (isRecord(root.data)) {
    if (Array.isArray(root.data.items)) return root.data.items
    if (Array.isArray(root.data.value)) return root.data.value
    if (Array.isArray(root.data.data)) return root.data.data
  }

  return []
}

function resolveAchievementId(record: Record<string, unknown>): string {
  return String(
    record.achievementId
    ?? record.id
    ?? record.catalogAchievementId
    ?? record.catalogId
    ?? ''
  )
}

function normalizeAchievement(raw: unknown): AchievementDto {
  const record = isRecord(raw) ? raw : {}

  return {
    achievementId: resolveAchievementId(record),
    name: toStringValue(record.name),
    description: toStringValue(record.description),
    icon: toStringValue(record.icon ?? record.iconUrl ?? record.iconKey ?? '🏆'),
    points: toNumber(record.points, 0),
    category: normalizeCategory(record.category),
    isActive: Boolean(record.isActive ?? true),
  }
}

function normalizeUserAchievement(raw: unknown): UserAchievementDto {
  const record = isRecord(raw) ? raw : {}
  return {
    achievementId: resolveAchievementId(record),
    isUnlocked: Boolean(record.isUnlocked ?? record.unlockedAt),
    unlockedAt: toStringValue(record.unlockedAt) || null,
    progressCurrent: toNumber(record.progressCurrent ?? record.currentProgress, 0),
    progressTarget: toNumber(record.progressTarget ?? record.targetProgress, 0),
    name: toStringValue(record.name),
    description: toStringValue(record.description),
    icon: toStringValue(record.icon ?? record.iconUrl ?? record.iconKey),
    points: toNumber(record.points, 0),
    category: toStringValue(record.category),
  }
}

function resolveStatsSource(root: unknown): Record<string, unknown> {
  const direct = isRecord(root) ? root : null
  const data = direct && isRecord(direct.data) ? direct.data : null
  const nestedData = data && isRecord(data.data) ? data.data : null
  const value = data && isRecord(data.value) ? data.value : null

  const candidates = [nestedData, value, data, direct].filter((item): item is Record<string, unknown> => Boolean(item))
  const markerKeys = new Set([
    'unlockedCount',
    'unlockedAchievements',
    'totalCount',
    'totalAchievements',
    'totalPoints',
    'points',
    'currentLevel',
    'level',
    'pointsToNextLevel',
    'progressToNextLevel',
    'progressPercentage',
    'nextLevelProgress',
    'progress',
  ])

  const matched = candidates.find((candidate) => Object.keys(candidate).some((key) => markerKeys.has(key)))
  return matched || {}
}

function computeProgressFallback(source: Record<string, unknown>, totalPoints: number, pointsToNextLevel: number): number {
  const currentProgress = toNumber(
    source.currentLevelPoints
    ?? source.pointsInCurrentLevel
    ?? source.progressCurrent
    ?? source.currentProgress
    ?? source.levelProgressCurrent,
    NaN,
  )
  const targetProgress = toNumber(
    source.currentLevelTarget
    ?? source.pointsRequiredForNextLevel
    ?? source.progressTarget
    ?? source.targetProgress
    ?? source.levelProgressTarget,
    NaN,
  )

  if (Number.isFinite(currentProgress) && Number.isFinite(targetProgress) && targetProgress > 0) {
    return (currentProgress / targetProgress) * 100
  }

  if (pointsToNextLevel > 0 && totalPoints > 0) {
    const estimatedTarget = totalPoints + pointsToNextLevel
    if (estimatedTarget > 0) {
      return (totalPoints / estimatedTarget) * 100
    }
  }

  if (pointsToNextLevel === 0 && totalPoints > 0) {
    return 100
  }

  return 0
}

function normalizeStats(root: unknown): AchievementStatsDto {
  const source = resolveStatsSource(root)

  const unlockedCount = toNumber(source.unlockedCount ?? source.unlockedAchievements ?? source.unlocked, 0)
  const totalCount = toNumber(source.totalCount ?? source.totalAchievements ?? source.total, 0)
  const totalPoints = toNumber(source.totalPoints ?? source.points, 0)
  const currentLevel = toNumber(source.currentLevel ?? source.level, 1)
  const pointsToNextLevel = toNumber(source.pointsToNextLevel, 0)
  let progressToNextLevel = toPercentage(
    source.progressToNextLevel ?? source.progressPercentage ?? source.nextLevelProgress ?? source.progress,
    0,
  )

  if (progressToNextLevel > 0 && progressToNextLevel <= 1) {
    progressToNextLevel *= 100
  }

  if (progressToNextLevel <= 0) {
    progressToNextLevel = computeProgressFallback(source, totalPoints, pointsToNextLevel)
  }

  return {
    unlockedCount,
    totalCount,
    totalPoints,
    currentLevel,
    pointsToNextLevel,
    progressToNextLevel: Math.max(0, Math.min(100, progressToNextLevel)),
  }
}

function normalizeNotification(raw: unknown): AchievementNotificationDto {
  const record = isRecord(raw) ? raw : {}

  return {
    achievementId: resolveAchievementId(record),
    name: toStringValue(record.name ?? record.achievementName ?? 'Achievement'),
    points: toNumber(record.points ?? record.rewardPoints, 0),
    unlockedAt: toStringValue(record.unlockedAt ?? record.createdAt),
  }
}

class AchievementService {
  isValidCategory(category?: string | null): category is AchievementCategory {
    if (!category) return false
    return (ACHIEVEMENT_CATEGORIES as readonly string[]).includes(category)
  }

  async getAll(): Promise<AchievementDto[]> {
    const response = await api.get('/achievement/all')
    return unwrapArrayResponse(response).map(normalizeAchievement).filter((item) => item.achievementId)
  }

  async getMyAchievements(query: GetMyAchievementsQuery = {}): Promise<UserAchievementDto[]> {
    const params = new URLSearchParams()
    params.set('unlockedOnly', String(Boolean(query.unlockedOnly)))

    if (query.category && this.isValidCategory(query.category)) {
      params.set('category', query.category)
    }

    const response = await api.get(`/achievement/my-achievements?${params.toString()}`)
    return unwrapArrayResponse(response).map(normalizeUserAchievement).filter((item) => item.achievementId)
  }

  async getStats(): Promise<AchievementStatsDto> {
    const response = await api.get('/achievement/stats')
    return normalizeStats(response)
  }

  async getNotifications(): Promise<AchievementNotificationDto[]> {
    const response = await api.get('/achievement/notifications')
    return unwrapArrayResponse(response).map(normalizeNotification).filter((item) => item.achievementId)
  }

  async getByCategory(category: string): Promise<UserAchievementDto[]> {
    if (!this.isValidCategory(category)) {
      return []
    }

    const response = await api.get(`/achievement/category/${encodeURIComponent(category)}`)
    return unwrapArrayResponse(response).map(normalizeUserAchievement).filter((item) => item.achievementId)
  }
}

export default new AchievementService()
