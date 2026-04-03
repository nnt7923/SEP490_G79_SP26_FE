import React from 'react'
import { Award, Lock, Search, Sparkles, Trophy, RefreshCw, Loader2, CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Layout from '../../../../components/Layout'
import { useStudentSidebarConfig } from '../components/StudentSideBar'
import AchievementService, {
  ACHIEVEMENT_CATEGORIES,
  type AchievementCategory,
  type AchievementDto,
  type AchievementNotificationDto,
  type AchievementStatsDto,
  type UserAchievementDto,
} from '../../../../services/AchievementService'

type CategoryFilter = 'All' | AchievementCategory

type AchievementCardView = {
  achievementId: string
  name: string
  description: string
  icon: string
  points: number
  category: AchievementCategory
  isUnlocked: boolean
  unlockedAt: string | null
  isNew: boolean
}

type ToastView = {
  key: string
  text: string
}

type LevelUpCelebrationView = {
  key: string
  level: number
}

const NEW_WINDOW_MS = 24 * 60 * 60 * 1000
const TOAST_SEEN_STORAGE_KEY = 'student_achievement_seen_toast_keys'
const LAST_SEEN_LEVEL_STORAGE_KEY = 'student_achievement_last_seen_level'

function buildNewKey(notification: AchievementNotificationDto): string {
  return `${notification.achievementId}:${notification.unlockedAt}`
}

function loadSeenToastKeys(): string[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(TOAST_SEEN_STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function saveSeenToastKeys(keys: Set<string>) {
  if (typeof window === 'undefined') return

  try {
    const values = Array.from(keys)
    const limited = values.slice(Math.max(0, values.length - 300))
    window.localStorage.setItem(TOAST_SEEN_STORAGE_KEY, JSON.stringify(limited))
  } catch {
  }
}

function loadLastSeenLevel(): number {
  if (typeof window === 'undefined') return 0

  try {
    const raw = window.localStorage.getItem(LAST_SEEN_LEVEL_STORAGE_KEY)
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0
  } catch {
    return 0
  }
}

function saveLastSeenLevel(level: number) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(LAST_SEEN_LEVEL_STORAGE_KEY, String(Math.max(0, Math.floor(level))))
  } catch {
  }
}

function toTranslationKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

const StudentAchievementsPage: React.FC = () => {
  const { t, i18n } = useTranslation('student')
  const navItems = useStudentSidebarConfig()

  const sidebarConfig = React.useMemo(() => ({
    navItems,
    actions: [],
    brand: { name: 'Achievements', subtitle: 'Student' },
  }), [navItems])

  const [catalog, setCatalog] = React.useState<AchievementDto[]>([])
  const [stats, setStats] = React.useState<AchievementStatsDto | null>(null)
  const [myAchievements, setMyAchievements] = React.useState<UserAchievementDto[]>([])
  const [loadingInit, setLoadingInit] = React.useState(true)
  const [loadingList, setLoadingList] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [unlockedOnly, setUnlockedOnly] = React.useState(false)
  const [category, setCategory] = React.useState<CategoryFilter>('All')
  const [search, setSearch] = React.useState('')

  const [toasts, setToasts] = React.useState<ToastView[]>([])
  const [levelUpCelebration, setLevelUpCelebration] = React.useState<LevelUpCelebrationView | null>(null)
  const shownToastKeysRef = React.useRef<Set<string>>(new Set(loadSeenToastKeys()))
  const initializedRef = React.useRef(false)
  const previousLevelRef = React.useRef<number | null>(null)
  const lastSeenLevelRef = React.useRef<number>(loadLastSeenLevel())
  const celebrationTimeoutRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    return () => {
      if (celebrationTimeoutRef.current !== null) {
        window.clearTimeout(celebrationTimeoutRef.current)
      }
    }
  }, [])

  const showLevelUpCelebration = React.useCallback((level: number) => {
    const safeLevel = Number.isFinite(level) ? level : 1
    setLevelUpCelebration({
      key: `${safeLevel}-${Date.now()}`,
      level: safeLevel,
    })

    if (celebrationTimeoutRef.current !== null) {
      window.clearTimeout(celebrationTimeoutRef.current)
    }

    celebrationTimeoutRef.current = window.setTimeout(() => {
      setLevelUpCelebration(null)
    }, 4200)
  }, [])

  const applyStats = React.useCallback((nextStats: AchievementStatsDto) => {
    const nextLevel = Number(nextStats.currentLevel ?? 1)
    const previousLevel = previousLevelRef.current
    const lastSeenLevel = lastSeenLevelRef.current

    if (previousLevel !== null && nextLevel > previousLevel) {
      showLevelUpCelebration(nextLevel)
    } else if (previousLevel === null && nextLevel > lastSeenLevel) {
      showLevelUpCelebration(nextLevel)
    }

    previousLevelRef.current = nextLevel
    lastSeenLevelRef.current = nextLevel
    saveLastSeenLevel(nextLevel)
    setStats(nextStats)
  }, [showLevelUpCelebration])

  const isCategoryValid = React.useCallback((value: CategoryFilter) => {
    return value !== 'All' && AchievementService.isValidCategory(value)
  }, [])

  const toLocalDateTime = React.useCallback((rawDate?: string | null) => {
    if (!rawDate) return '-'

    const parsed = new Date(rawDate)
    if (Number.isNaN(parsed.getTime())) return '-'

    const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US'
    return new Intl.DateTimeFormat(locale, {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(parsed)
  }, [i18n.language])

  const pushNotificationToasts = React.useCallback((notifications: AchievementNotificationDto[]) => {
    if (!Array.isArray(notifications) || notifications.length === 0) return

    const nextToasts: ToastView[] = []
    const now = Date.now()

    notifications.forEach((item) => {
      const key = buildNewKey(item)
      if (shownToastKeysRef.current.has(key)) return

      const unlockedTs = item.unlockedAt ? new Date(item.unlockedAt).getTime() : NaN
      const isRecent = Number.isFinite(unlockedTs) ? (now - unlockedTs <= NEW_WINDOW_MS) : true

      const rawName = item.name || t('achievements.fallback.unknownName')
      const nameKey = toTranslationKey(rawName)
      const localizedName = t(`achievements.catalogById.${item.achievementId}.name`, {
        defaultValue: t(`achievements.catalogByName.${nameKey}.name`, { defaultValue: rawName }),
      })

      shownToastKeysRef.current.add(key)
      if (!isRecent) return

      nextToasts.push({
        key,
        text: t('achievements.newUnlockToast', {
          name: localizedName,
          points: item.points,
        }),
      })
    })

    saveSeenToastKeys(shownToastKeysRef.current)

    if (nextToasts.length === 0) return

    setToasts((previous) => [...previous, ...nextToasts])
    nextToasts.forEach((toast) => {
      window.setTimeout(() => {
        setToasts((previous) => previous.filter((item) => item.key !== toast.key))
      }, 5000)
    })
  }, [t])

  const fetchSummary = React.useCallback(async () => {
    const [statsData, notifications] = await Promise.all([
      AchievementService.getStats(),
      AchievementService.getNotifications(),
    ])

    applyStats(statsData)
    pushNotificationToasts(notifications)
  }, [applyStats, pushNotificationToasts])

  const fetchMyAchievements = React.useCallback(async () => {
    setLoadingList(true)
    setError(null)

    try {
      const response = await AchievementService.getMyAchievements({
        unlockedOnly,
        category: isCategoryValid(category) ? category : undefined,
      })
      setMyAchievements(response)
    } catch (err: any) {
      setError(err?.message || t('achievements.errors.loadList'))
      setMyAchievements([])
    } finally {
      setLoadingList(false)
    }
  }, [category, isCategoryValid, t, unlockedOnly])

  const loadInitial = React.useCallback(async () => {
    setLoadingInit(true)
    setError(null)

    try {
      const [catalogData, myData, statsData, notifications] = await Promise.all([
        AchievementService.getAll(),
        AchievementService.getMyAchievements({ unlockedOnly: false }),
        AchievementService.getStats(),
        AchievementService.getNotifications(),
      ])

      setCatalog(catalogData)
      setMyAchievements(myData)
      applyStats(statsData)
      pushNotificationToasts(notifications)
      initializedRef.current = true
    } catch (err: any) {
      setError(err?.message || t('achievements.errors.loadInit'))
      setCatalog([])
      setMyAchievements([])
      setStats(null)
    } finally {
      setLoadingInit(false)
    }
  }, [applyStats, pushNotificationToasts, t])

  React.useEffect(() => {
    void loadInitial()
  }, [loadInitial])

  React.useEffect(() => {
    if (!initializedRef.current) return
    void fetchMyAchievements()
  }, [fetchMyAchievements])

  React.useEffect(() => {
    const intervalId = window.setInterval(() => {
      void AchievementService.getNotifications().then(pushNotificationToasts).catch(() => {})
    }, 45000)

    return () => window.clearInterval(intervalId)
  }, [pushNotificationToasts])

  const handleManualRefresh = React.useCallback(async () => {
    await Promise.all([fetchSummary(), fetchMyAchievements()])
  }, [fetchMyAchievements, fetchSummary])

  const cardItems = React.useMemo<AchievementCardView[]>(() => {
    const catalogMap = new Map<string, AchievementDto>()
    catalog.forEach((item) => {
      if (item.achievementId) {
        catalogMap.set(item.achievementId, item)
      }
    })

    const ids = new Set<string>([
      ...catalog.map((item) => item.achievementId),
      ...myAchievements.map((item) => item.achievementId),
    ])

    const now = Date.now()

    return Array.from(ids)
      .filter(Boolean)
      .map((id) => {
        const base = catalogMap.get(id)
        const mine = myAchievements.find((item) => item.achievementId === id)

        const rawName = base?.name || mine?.name || t('achievements.fallback.unknownName')
        const rawDescription = base?.description || mine?.description || t('achievements.fallback.noDescription')
        const nameKey = toTranslationKey(rawName)
        const descriptionKey = toTranslationKey(rawDescription)

        const unlockedAt = mine?.unlockedAt || null
        const unlockedTs = unlockedAt ? new Date(unlockedAt).getTime() : NaN

        return {
          achievementId: id,
          name: t(`achievements.catalogById.${id}.name`, {
            defaultValue: t(`achievements.catalogByName.${nameKey}.name`, { defaultValue: rawName }),
          }),
          description: t(`achievements.catalogById.${id}.description`, {
            defaultValue: t(`achievements.catalogByDescription.${descriptionKey}`, { defaultValue: rawDescription }),
          }),
          icon: base?.icon || mine?.icon || '🏆',
          points: base?.points ?? mine?.points ?? 0,
          category: base?.category || (AchievementService.isValidCategory(mine?.category || '') ? (mine?.category as AchievementCategory) : 'Special'),
          isUnlocked: Boolean(mine?.isUnlocked || unlockedAt),
          unlockedAt,
          isNew: Number.isFinite(unlockedTs) ? (now - unlockedTs <= NEW_WINDOW_MS) : false,
        }
      })
      .filter((item) => {
        if (category !== 'All' && item.category !== category) return false
        if (unlockedOnly && !item.isUnlocked) return false
        if (!search.trim()) return true

        return item.name.toLowerCase().includes(search.trim().toLowerCase())
      })
      .sort((left, right) => {
        if (left.isUnlocked !== right.isUnlocked) {
          return left.isUnlocked ? -1 : 1
        }

        return right.points - left.points
      })
  }, [catalog, myAchievements, category, unlockedOnly, search, t])

  const progress = stats?.progressToNextLevel ?? 0

  const unlockedCount = stats?.unlockedCount ?? cardItems.filter((item) => item.isUnlocked).length
  const totalCount = stats?.totalCount ?? Math.max(catalog.length, cardItems.length)

  return (
    <Layout sidebar={sidebarConfig}>
      <div style={{ padding: 20, background: 'var(--bg-main)', minHeight: '100vh' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gap: 16 }}>
          <div style={{ border: '1px solid var(--border-base)', borderRadius: 10, background: 'var(--bg-surface)', padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
                  {t('achievements.title')}
                </h1>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                  {t('achievements.subtitle')}
                </p>
              </div>

              <button
                type="button"
                onClick={() => { void handleManualRefresh() }}
                style={{
                  borderRadius: 8,
                  border: '1px solid var(--border-base)',
                  background: 'var(--bg-main)',
                  color: 'var(--text-primary)',
                  padding: '8px 12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                <RefreshCw size={16} />
                {t('achievements.refresh')}
              </button>
            </div>

            <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
              <div style={{ border: '1px solid var(--border-base)', borderRadius: 8, padding: 12, background: 'var(--bg-main)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('achievements.stats.unlocked')}</div>
                <div style={{ marginTop: 4, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {unlockedCount} / {totalCount}
                </div>
              </div>

              <div style={{ border: '1px solid var(--border-base)', borderRadius: 8, padding: 12, background: 'var(--bg-main)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('achievements.stats.totalPoints')}</div>
                <div style={{ marginTop: 4, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {stats?.totalPoints ?? 0}
                </div>
              </div>

              <div style={{ border: '1px solid var(--border-base)', borderRadius: 8, padding: 12, background: 'var(--bg-main)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('achievements.stats.currentLevel')}</div>
                <div style={{ marginTop: 4, fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {stats?.currentLevel ?? 1}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                <span>{t('achievements.stats.progressToNextLevel')}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div style={{ height: 10, borderRadius: 999, background: 'var(--border-base)', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.max(0, Math.min(100, progress))}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, var(--accent-primary), #60a5fa)',
                  }}
                />
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                {t('achievements.stats.pointsToNextLevel', { points: stats?.pointsToNextLevel ?? 0 })}
              </div>
            </div>
          </div>

          <div
            style={{
              border: '1px solid var(--border-base)',
              borderRadius: 14,
              background: 'var(--bg-surface)',
              padding: 16,
              boxShadow: '0 6px 16px rgba(15, 23, 42, 0.05)',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 10,
                marginBottom: 12,
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ position: 'relative', flex: '1 1 280px' }}>
                <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t('achievements.filters.searchPlaceholder')}
                  style={{
                    width: '100%',
                    border: '1px solid var(--border-base)',
                    borderRadius: 10,
                    background: 'var(--bg-main)',
                    color: 'var(--text-primary)',
                    padding: '10px 12px 10px 34px',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: 4,
                  borderRadius: 10,
                  border: '1px solid var(--border-base)',
                  background: 'var(--bg-main)',
                  gap: 4,
                }}
              >
                <button
                  type="button"
                  onClick={() => setUnlockedOnly(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: 'none',
                    background: !unlockedOnly ? 'var(--accent-primary)' : 'transparent',
                    color: !unlockedOnly ? '#fff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: 13,
                    transition: 'all 0.2s ease',
                    boxShadow: !unlockedOnly ? '0 4px 10px rgba(37, 99, 235, 0.22)' : 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t('achievements.filters.all')}
                </button>

                <button
                  type="button"
                  onClick={() => setUnlockedOnly(true)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: 'none',
                    background: unlockedOnly ? 'var(--accent-primary)' : 'transparent',
                    color: unlockedOnly ? '#fff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: 13,
                    transition: 'all 0.2s ease',
                    boxShadow: unlockedOnly ? '0 4px 10px rgba(37, 99, 235, 0.22)' : 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t('achievements.filters.unlockedOnly')}
                </button>
              </div>
            </div>

            {loadingList && !loadingInit && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 12, marginBottom: 10 }}>
                <Loader2 size={14} className="animate-spin" />
                {t('achievements.loadingFiltered')}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'nowrap',
                overflowX: 'auto',
                paddingBottom: 2,
              }}
            >
              <button
                type="button"
                onClick={() => setCategory('All')}
                style={{
                  padding: '7px 12px',
                  borderRadius: 8,
                  border: `1px solid ${category === 'All' ? 'var(--accent-primary)' : 'var(--border-base)'}`,
                  background: category === 'All' ? 'var(--accent-primary)' : 'var(--bg-main)',
                  color: category === 'All' ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 700,
                  boxShadow: category === 'All' ? '0 4px 10px rgba(37, 99, 235, 0.22)' : 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {t('achievements.filters.categoryAll')}
              </button>

              {ACHIEVEMENT_CATEGORIES.map((item) => {
                const active = category === item
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    style={{
                      padding: '7px 12px',
                      borderRadius: 8,
                      border: `1px solid ${active ? 'var(--accent-primary)' : 'var(--border-base)'}`,
                      background: active ? 'var(--accent-primary)' : 'var(--bg-main)',
                      color: active ? '#fff' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 700,
                      boxShadow: active ? '0 4px 10px rgba(37, 99, 235, 0.22)' : 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t(`achievements.categories.${item}`)}
                  </button>
                )
              })}
            </div>
          </div>

          {error && (
            <div style={{ border: '1px solid var(--danger-primary)', color: 'var(--danger-primary)', borderRadius: 8, padding: 12, background: 'var(--bg-red-tint)' }}>
              {error}
            </div>
          )}

          {loadingInit ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  style={{
                    border: '1px solid var(--border-base)',
                    borderRadius: 10,
                    background: 'var(--bg-surface)',
                    padding: 14,
                    minHeight: 150,
                    opacity: 0.8,
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--border-base)', marginBottom: 10 }} />
                  <div style={{ width: '70%', height: 12, borderRadius: 6, background: 'var(--border-base)', marginBottom: 8 }} />
                  <div style={{ width: '100%', height: 10, borderRadius: 6, background: 'var(--border-base)', marginBottom: 6 }} />
                  <div style={{ width: '85%', height: 10, borderRadius: 6, background: 'var(--border-base)' }} />
                </div>
              ))}
            </div>
          ) : cardItems.length === 0 ? (
            <div style={{ border: '1px solid var(--border-base)', borderRadius: 10, padding: 24, textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--bg-surface)' }}>
              {t('achievements.empty')}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 14 }}>
              {cardItems.map((item) => {
                const iconIsUrl = item.icon.startsWith('http://') || item.icon.startsWith('https://') || item.icon.startsWith('/')
                return (
                  <div
                    key={item.achievementId}
                    style={{
                      border: `1px solid ${item.isUnlocked ? 'color-mix(in srgb, var(--accent-primary) 40%, var(--border-base) 60%)' : 'var(--border-base)'}`,
                      borderRadius: 14,
                      background: item.isUnlocked
                        ? 'linear-gradient(180deg, color-mix(in srgb, var(--accent-primary) 10%, var(--bg-surface) 90%), var(--bg-surface))'
                        : 'linear-gradient(180deg, var(--bg-surface), color-mix(in srgb, var(--bg-main) 88%, var(--bg-surface) 12%))',
                      padding: 16,
                      position: 'relative',
                      opacity: item.isUnlocked ? 1 : 0.82,
                      boxShadow: item.isUnlocked ? '0 10px 24px rgba(37, 99, 235, 0.14)' : '0 8px 20px rgba(15,23,42,0.06)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 3,
                        background: item.isUnlocked
                          ? 'linear-gradient(90deg, #3b82f6, #22c55e)'
                          : 'linear-gradient(90deg, var(--border-base), color-mix(in srgb, var(--border-base) 65%, var(--bg-surface) 35%))',
                      }}
                    />

                    {item.isNew && (
                      <span
                        style={{
                          position: 'absolute',
                          top: 10,
                          right: 10,
                          borderRadius: 999,
                          padding: '4px 9px',
                          fontSize: 10,
                          fontWeight: 700,
                          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.16), rgba(52, 211, 153, 0.22))',
                          color: 'var(--success-primary)',
                        }}
                      >
                        {t('achievements.newBadge')}
                      </span>
                    )}

                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          border: '1px solid color-mix(in srgb, var(--accent-primary) 22%, var(--border-base) 78%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'color-mix(in srgb, var(--bg-main) 74%, var(--accent-primary) 26%)',
                          flexShrink: 0,
                        }}
                      >
                        {iconIsUrl ? <img src={item.icon} alt={item.name} style={{ width: 26, height: 26, objectFit: 'contain' }} /> : <span style={{ fontSize: 20 }}>{item.icon || '🏆'}</span>}
                      </div>

                      <div style={{ flex: 1, minWidth: 0, marginLeft: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <span
                            style={{
                              fontSize: 10,
                              borderRadius: 999,
                              border: '1px solid var(--border-base)',
                              padding: '3px 8px',
                              color: 'var(--text-secondary)',
                              background: 'var(--bg-main)',
                              fontWeight: 700,
                            }}
                          >
                            {t(`achievements.categories.${item.category}`)}
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            {item.isUnlocked ? <CheckCircle2 size={12} color="var(--success-primary)" /> : <Lock size={12} />}
                            {item.isUnlocked ? t('achievements.filters.unlockedOnly') : t('achievements.locked')}
                          </span>
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.35 }}>
                          {item.name}
                        </div>
                        <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <Sparkles size={12} color="var(--accent-primary)" />
                          +{item.points} {t('achievements.points')}
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', minHeight: 42, lineHeight: 1.55 }}>
                      {item.description}
                    </div>

                    <div
                      style={{
                        marginTop: 12,
                        display: 'flex',
                        justifyContent: 'flex-start',
                        alignItems: 'center',
                        gap: 8,
                        borderTop: '1px dashed var(--border-base)',
                        paddingTop: 10,
                      }}
                    >
                      <span style={{ fontSize: 11, color: item.isUnlocked ? 'var(--success-primary)' : 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700 }}>
                        {item.isUnlocked ? <Award size={12} /> : <Lock size={12} />}
                        {item.isUnlocked
                          ? t('achievements.unlockedAt', { time: toLocalDateTime(item.unlockedAt) })
                          : t('achievements.locked')}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {toasts.length > 0 && (
          <div style={{ position: 'fixed', top: 70, right: 16, zIndex: 120, display: 'grid', gap: 8, width: 'min(360px, calc(100vw - 32px))' }}>
            {toasts.map((toast) => (
              <div
                key={toast.key}
                style={{
                  border: '1px solid rgba(16, 185, 129, 0.45)',
                  borderRadius: 10,
                  background: 'var(--bg-surface)',
                  boxShadow: '0 10px 30px rgba(15,23,42,0.12)',
                  padding: '10px 12px',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Trophy size={16} color="var(--success-primary)" />
                <span style={{ fontSize: 13 }}>{toast.text}</span>
              </div>
            ))}
          </div>
        )}

        {levelUpCelebration && (
          <>
            <style>{`
              @keyframes levelup-cup-pop {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.55) rotate(-8deg); }
                22% { opacity: 1; transform: translate(-50%, -50%) scale(1.08) rotate(0deg); }
                78% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(0.96) translateY(-8px); }
              }

              @keyframes levelup-particle-pulse {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.2); }
                18% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(1.25); }
              }

              @keyframes levelup-text-fade {
                0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
                20% { opacity: 1; transform: translateX(-50%) translateY(0); }
                82% { opacity: 1; transform: translateX(-50%) translateY(0); }
                100% { opacity: 0; transform: translateX(-50%) translateY(-8px); }
              }
            `}</style>

            <div style={{ position: 'fixed', inset: 0, zIndex: 180, pointerEvents: 'none', overflow: 'hidden' }}>
              {Array.from({ length: 44 }).map((_, index) => {
                const angle = (index / 44) * Math.PI * 2
                const radiusX = 8 + (index % 5) * 3.6
                const radiusY = 6 + (index % 4) * 2.8
                const left = 50 + Math.cos(angle) * radiusX
                const top = 44 + Math.sin(angle) * radiusY
                const delay = (index % 10) * 0.045
                const duration = 0.9 + (index % 6) * 0.13
                const hue = 20 + ((index * 37) % 320)
                const size = 5 + (index % 4)

                return (
                  <span
                    key={`levelup-firework-${levelUpCelebration.key}-${index}`}
                    style={{
                      position: 'absolute',
                      left: `${left}%`,
                      top: `${top}%`,
                      width: size,
                      height: size,
                      borderRadius: 999,
                      background: `hsl(${hue}, 90%, 62%)`,
                      boxShadow: '0 0 12px rgba(255,255,255,0.55), 0 0 22px hsla(48, 96%, 62%, 0.45)',
                      animation: `levelup-particle-pulse ${duration}s ease-out forwards`,
                      animationDelay: `${delay}s`,
                    }}
                  />
                )
              })}

              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '44%',
                  transform: 'translate(-50%, -50%)',
                  animation: 'levelup-cup-pop 4.2s ease-out forwards',
                }}
              >
                <div
                  style={{
                    fontSize: 140,
                    lineHeight: 1,
                    filter: 'drop-shadow(0 0 10px rgba(251,191,36,0.9)) drop-shadow(0 8px 20px rgba(15,23,42,0.35))',
                  }}
                >
                  🏆
                </div>
              </div>

              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '54%',
                  transform: 'translateX(-50%)',
                  textAlign: 'center',
                  animation: 'levelup-text-fade 4.2s ease-out forwards',
                }}
              >
                <div style={{ fontWeight: 900, fontSize: 28, color: '#fef08a', letterSpacing: 0.8, textShadow: '0 0 18px rgba(250,204,21,0.6), 0 4px 14px rgba(15,23,42,0.45)' }}>
                  {t('achievements.levelUp.title')}
                </div>
                <div style={{ marginTop: 8, color: 'var(--text-primary)', fontSize: 16, fontWeight: 800, textShadow: '0 0 10px rgba(255,255,255,0.75), 0 2px 8px rgba(15,23,42,0.25)' }}>
                  {t('achievements.levelUp.message', { level: levelUpCelebration.level })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}

export default StudentAchievementsPage
