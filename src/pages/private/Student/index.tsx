import React from 'react'
import { motion } from 'framer-motion'
import useAuthStore from '../../../store/useAuthStore'
import ROUTER from '../../../router/ROUTER'
import { useNavigate } from 'react-router-dom'
import Layout from '../../../components/Layout'
import { useStudentSidebarConfig } from './components/StudentSideBar'
import { AlertTriangle, CheckCircle2, Clock3, Flag, Circle, ArrowRight, X } from 'lucide-react'
import { getTimeline, type TimelineItem, type TimelineResponse } from '../../../services/TimelineService'
import LearningPathService from '../../../services/LearningPathService'
import { useTranslation } from 'react-i18next'
import useAppNotificationStore from '../../../store/useAppNotificationStore'
import useNotificationStore from '../../../store/useNotificationStore'
import { navigateAndMarkNotificationRead } from '../../../components/Notifications/utils'
import type { NotificationDto } from '../../../types/notification'
import SubscriptionService from '../../../services/SubscriptionService'

type DayBucket = {
  key: string
  date: Date
  items: TimelineItem[]
  due: number
  completed: number
}

type PriorityType = 'Lesson' | 'Task' | 'Quiz'
type PriorityPathOption = {
  key: string
  title: string
}

const DAY_MS = 24 * 60 * 60 * 1000
const PRIORITY_PAGE_SIZE = 3
const PRIORITY_ALL_PATH_KEY = '__all_paths__'
const UTC_PLUS_7_TIMEZONE = 'Asia/Ho_Chi_Minh'
const TIMELINE_LOAD_ERROR_CODE = 'timeline_load_error'
const TIMELINE_COLORS = ['#5B8FF9', '#5AD8A6', '#F6BD16', '#E8684A', '#6DC8EC', '#9270CA', '#FF9D4D']
const TIMELINE_FROM_UTC = '2000-01-01T00:00:00.000Z'
const TIMELINE_TO_UTC = '2100-01-01T00:00:00.000Z'
const DISMISSED_EXPIRING_NOTICE_KEY = 'student-dashboard-expiring-notice-dismissed'

const getUtc7DateKey = (value?: Date | string | null): string | null => {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: UTC_PLUS_7_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  if (!year || !month || !day) return null

  return `${year}-${month}-${day}`
}

const toStartOfDay = (date: Date) => {
  const key = getUtc7DateKey(date)
  if (!key) return new Date(date)
  return new Date(`${key}T00:00:00+07:00`)
}

const getDateFromUtc7DateKey = (value?: string | null): Date | null => {
  if (!value) return null
  const normalized = String(value).trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null
  const parsed = new Date(`${normalized}T00:00:00+07:00`)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

const parseDueTime = (value?: string | null): number => {
  if (!value) return Number.POSITIVE_INFINITY
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed
}

const isSameLocalDay = (left?: string | null, right?: Date) => {
  if (!left || !right) return false
  const leftKey = getUtc7DateKey(left)
  const rightKey = getUtc7DateKey(right)
  if (!leftKey || !rightKey) return false
  return leftKey === rightKey
}

const getTimelineItemScheduleDate = (item: TimelineItem): string | null => {
  const raw = item as Record<string, unknown>
  const candidates = [
    item.dueAtUtc,
    raw?.dueDate,
    raw?.DueDate,
    raw?.lessonDay,
    raw?.LessonDay,
  ]

  for (const value of candidates) {
    if (typeof value !== 'string') continue
    const trimmed = value.trim()
    if (!trimmed) continue
    const parsed = new Date(trimmed)
    if (!Number.isNaN(parsed.getTime())) return trimmed
  }

  return null
}

const parseTimelineItemScheduleTime = (item: TimelineItem): number => {
  const scheduleDate = getTimelineItemScheduleDate(item)
  if (!scheduleDate) return Number.POSITIVE_INFINITY
  const parsed = new Date(scheduleDate).getTime()
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed
}

const getPathChipColor = (key: string) => {
  let hash = 0
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash << 5) - hash + key.charCodeAt(i)
    hash |= 0
  }
  return TIMELINE_COLORS[Math.abs(hash) % TIMELINE_COLORS.length]
}

const StudentIndex: React.FC = () => {
  const { user } = useAuthStore()
  const displayName = user?.name || user?.username || 'Student'
  const avatarUrl = String(user?.avatarUrl ?? '').trim()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation('student')
  const notificationItems = useAppNotificationStore((state) => state.items)
  const notificationPanelItems = useAppNotificationStore((state) => state.panelItems)
  const markNotificationAsRead = useAppNotificationStore((state) => state.markAsRead)
  const showToast = useNotificationStore((state) => state.showToast)
  const priorityQueueRef = React.useRef<HTMLDivElement | null>(null)
  const sevenDayDateInputRef = React.useRef<HTMLInputElement | null>(null)

  const [timeline, setTimeline] = React.useState<TimelineResponse | null>(null)
  const [timelineLoading, setTimelineLoading] = React.useState(true)
  const [timelineError, setTimelineError] = React.useState<string | null>(null)
  const [activeDayKey, setActiveDayKey] = React.useState<string>('')
  const [priorityScope, setPriorityScope] = React.useState<'all' | 'overdue'>('all')
  const [selectedPriorityPathKey, setSelectedPriorityPathKey] = React.useState<string>(PRIORITY_ALL_PATH_KEY)
  const [selectedPriorityType, setSelectedPriorityType] = React.useState<PriorityType>('Lesson')
  const [selectedSevenDayPathKey, setSelectedSevenDayPathKey] = React.useState<string>(PRIORITY_ALL_PATH_KEY)
  const [selectedSevenDayType, setSelectedSevenDayType] = React.useState<PriorityType>('Lesson')
  const [avatarLoadFailed, setAvatarLoadFailed] = React.useState(false)
  const [showExpiringSoonModal, setShowExpiringSoonModal] = React.useState(false)
  const [currentSubExpiredAt, setCurrentSubExpiredAt] = React.useState<Date | null>(null)
  const [priorityPages, setPriorityPages] = React.useState<Record<PriorityType, number>>({
    Lesson: 1,
    Task: 1,
    Quiz: 1,
  })
  const learningPathSkeletonCacheRef = React.useRef<Map<string, any>>(new Map())

  React.useEffect(() => {
    setAvatarLoadFailed(false)
  }, [avatarUrl])

  React.useEffect(() => {
    const fetchTimeline = async () => {
      setTimelineLoading(true)
      setTimelineError(null)
      try {
        const data = await getTimeline({
          fromUtc: TIMELINE_FROM_UTC,
          toUtc: TIMELINE_TO_UTC,
          onlyActivePaths: true,
        })
        setTimeline(data)
      } catch {
        setTimeline(null)
        setTimelineError(TIMELINE_LOAD_ERROR_CODE)
      } finally {
        setTimelineLoading(false)
      }
    }

    const fetchCurrentSub = async () => {
      try {
        const sub = await SubscriptionService.getCurrentSubscription()
        if (sub) {
          const expiredStr = (sub.expiresAt || sub.expiredAt || sub.endDate) as string | undefined
          if (expiredStr) {
            const parsed = new Date(expiredStr)
            if (!Number.isNaN(parsed.getTime())) {
              setCurrentSubExpiredAt(parsed)
            }
          }
        }
      } catch {
        // Error handling
      }
    }

    fetchTimeline()
    fetchCurrentSub()
  }, [])

  const items = React.useMemo(() => {
    return Array.isArray(timeline?.items) ? timeline.items : []
  }, [timeline?.items])

  const now = React.useMemo(() => new Date(), [timeline?.fromUtc, timeline?.toUtc, items.length])
  const nowTs = now.getTime()

  const overdueItems = React.useMemo(
    () => items.filter((item) => !item.isCompleted && (item.isOverdue || parseDueTime(item.dueAtUtc) < nowTs)),
    [items, nowTs]
  )

  const dueSoonItems = React.useMemo(
    () => items.filter((item) => {
      if (item.isCompleted) return false
      const dueTs = parseDueTime(item.dueAtUtc)
      return dueTs >= nowTs && dueTs <= nowTs + 3 * DAY_MS
    }),
    [items, nowTs]
  )

  const notStartedItems = React.useMemo(
    () => items.filter((item) => !item.isCompleted && String(item.status || '').toLowerCase() === 'pending'),
    [items]
  )

  const completedTodayCount = React.useMemo(
    () => items.filter((item) => item.isCompleted).length,
    [items]
  )

  const buildPriorityPathKey = React.useCallback((item: TimelineItem) => {
    const learningPathId = String(item.learningPathId ?? '').trim()
    const learningPathTitle = String(item.learningPathTitle ?? '').trim()
    return learningPathId || `title:${learningPathTitle.toLowerCase()}`
  }, [])

  const priorityCandidates = React.useMemo(() => {
    const typeOrder: Record<string, number> = { Lesson: 0, Task: 1, Quiz: 2, Other: 3 }

    const getBucketScore = (item: TimelineItem) => {
      const dueTs = parseDueTime(item.dueAtUtc)
      if (item.isOverdue || dueTs < nowTs) return 0
      if (dueTs <= nowTs + DAY_MS) return 1
      if (dueTs <= nowTs + 3 * DAY_MS) return 2
      return 3
    }

    return items
      .filter((item) => !item.isCompleted)
      .sort((left, right) => {
        const scoreDiff = getBucketScore(left) - getBucketScore(right)
        if (scoreDiff !== 0) return scoreDiff

        const dueDiff = parseDueTime(left.dueAtUtc) - parseDueTime(right.dueAtUtc)
        if (dueDiff !== 0) return dueDiff

        const typeDiff = (typeOrder[left.itemType] ?? typeOrder.Other) - (typeOrder[right.itemType] ?? typeOrder.Other)
        if (typeDiff !== 0) return typeDiff

        return String(left.title || '').localeCompare(String(right.title || ''))
      })
  }, [items, nowTs])

  const scopedPriorityCandidates = React.useMemo(() => {
    if (priorityScope === 'all') return priorityCandidates
    return priorityCandidates.filter((item) => item.isOverdue || parseDueTime(item.dueAtUtc) < nowTs)
  }, [priorityCandidates, priorityScope, nowTs])

  const priorityPathOptions = React.useMemo(() => {
    const map = new Map<string, PriorityPathOption>()

    scopedPriorityCandidates.forEach((item) => {
      const key = buildPriorityPathKey(item)
      const title = String(item.learningPathTitle || '').trim() || t('dashboard.timeline.unknownPath')
      if (key && !map.has(key)) {
        map.set(key, { key, title })
      }
    })

    return Array.from(map.values()).sort((left, right) => left.title.localeCompare(right.title))
  }, [scopedPriorityCandidates, buildPriorityPathKey, t])

  React.useEffect(() => {
    if (selectedPriorityPathKey === PRIORITY_ALL_PATH_KEY) return
    const exists = priorityPathOptions.some((option) => option.key === selectedPriorityPathKey)
    if (!exists) setSelectedPriorityPathKey(PRIORITY_ALL_PATH_KEY)
  }, [priorityPathOptions, selectedPriorityPathKey])

  const filteredPriorityCandidates = React.useMemo(() => {
    if (selectedPriorityPathKey === PRIORITY_ALL_PATH_KEY) return scopedPriorityCandidates
    return scopedPriorityCandidates.filter((item) => buildPriorityPathKey(item) === selectedPriorityPathKey)
  }, [scopedPriorityCandidates, selectedPriorityPathKey, buildPriorityPathKey])

  const handleUrgentCardClick = React.useCallback(() => {
    setPriorityScope('overdue')
    setSelectedPriorityPathKey(PRIORITY_ALL_PATH_KEY)
    setPriorityPages({ Lesson: 1, Task: 1, Quiz: 1 })
    priorityQueueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const priorityGroupedItems = React.useMemo(() => {

    const grouped: Record<PriorityType, TimelineItem[]> = {
      Lesson: [],
      Task: [],
      Quiz: [],
    }

    filteredPriorityCandidates.forEach((item) => {
      if (item.itemType === 'Lesson' || item.itemType === 'Task' || item.itemType === 'Quiz') {
        grouped[item.itemType].push(item)
      }
    })

    return grouped
  }, [filteredPriorityCandidates])

  React.useEffect(() => {
    const clampPage = (type: PriorityType, page: number) => {
      const total = priorityGroupedItems[type].length
      const maxPage = Math.max(1, Math.ceil(total / PRIORITY_PAGE_SIZE))
      return Math.min(Math.max(page, 1), maxPage)
    }

    setPriorityPages((prev) => ({
      Lesson: clampPage('Lesson', prev.Lesson),
      Task: clampPage('Task', prev.Task),
      Quiz: clampPage('Quiz', prev.Quiz),
    }))
  }, [priorityGroupedItems])

  React.useEffect(() => {
    if (priorityGroupedItems[selectedPriorityType].length > 0) return
    const fallbackType = (['Lesson', 'Task', 'Quiz'] as PriorityType[])
      .find((type) => priorityGroupedItems[type].length > 0)
    if (fallbackType) setSelectedPriorityType(fallbackType)
  }, [priorityGroupedItems, selectedPriorityType])

  const sevenDayBuckets = React.useMemo(() => {
    const start = toStartOfDay(now)

    const buckets: DayBucket[] = Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(start.getTime() + index * DAY_MS)
      const key = getUtc7DateKey(date) || date.toISOString().slice(0, 10)
      const dayItems = items
        .filter((item) => isSameLocalDay(getTimelineItemScheduleDate(item), date))
        .sort((left, right) => parseTimelineItemScheduleTime(left) - parseTimelineItemScheduleTime(right))

      const dueCount = dayItems.filter((item) => !item.isCompleted).length

      return {
        key,
        date,
        items: dayItems,
        due: dueCount,
        completed: dayItems.filter((item) => item.isCompleted).length,
      }
    })

    return buckets
  }, [items, now])

  React.useEffect(() => {
    if (sevenDayBuckets.length === 0) {
      setActiveDayKey('')
      return
    }
    if (!activeDayKey) {
      setActiveDayKey(sevenDayBuckets[0].key)
    }
  }, [sevenDayBuckets, activeDayKey])

  const activeDayDate = React.useMemo(() => {
    const fromKey = getDateFromUtc7DateKey(activeDayKey)
    if (fromKey) return fromKey
    return sevenDayBuckets[0]?.date
  }, [activeDayKey, sevenDayBuckets])

  const activeDayItems = React.useMemo(() => {
    if (!activeDayDate) return []
    return items
      .filter((item) => isSameLocalDay(getTimelineItemScheduleDate(item), activeDayDate))
      .sort((left, right) => parseTimelineItemScheduleTime(left) - parseTimelineItemScheduleTime(right))
  }, [activeDayDate, items])

  const sevenDayPathOptions = React.useMemo(() => {
    const map = new Map<string, PriorityPathOption>()
    const dayItems = Array.isArray(activeDayItems) ? activeDayItems : []

    dayItems.forEach((item) => {
      const key = buildPriorityPathKey(item)
      const title = String(item.learningPathTitle || '').trim() || t('dashboard.timeline.unknownPath')
      if (key && !map.has(key)) {
        map.set(key, { key, title })
      }
    })

    return Array.from(map.values()).sort((left, right) => left.title.localeCompare(right.title))
  }, [activeDayItems, buildPriorityPathKey, t])

  React.useEffect(() => {
    if (selectedSevenDayPathKey === PRIORITY_ALL_PATH_KEY) return
    const exists = sevenDayPathOptions.some((option) => option.key === selectedSevenDayPathKey)
    if (!exists) setSelectedSevenDayPathKey(PRIORITY_ALL_PATH_KEY)
  }, [selectedSevenDayPathKey, sevenDayPathOptions])

  const filteredSevenDayItems = React.useMemo(() => {
    const dayItems = Array.isArray(activeDayItems) ? activeDayItems : []
    if (selectedSevenDayPathKey === PRIORITY_ALL_PATH_KEY) return dayItems
    return dayItems.filter((item) => buildPriorityPathKey(item) === selectedSevenDayPathKey)
  }, [activeDayItems, selectedSevenDayPathKey, buildPriorityPathKey])

  const sevenDayGroupedItems = React.useMemo(() => {
    const grouped: Record<PriorityType, TimelineItem[]> = {
      Lesson: [],
      Task: [],
      Quiz: [],
    }

    filteredSevenDayItems.forEach((item) => {
      if (item.itemType === 'Lesson' || item.itemType === 'Task' || item.itemType === 'Quiz') {
        grouped[item.itemType].push(item)
      }
    })

    return grouped
  }, [filteredSevenDayItems])

  React.useEffect(() => {
    if (sevenDayGroupedItems[selectedSevenDayType].length > 0) return
    const fallbackType = (['Lesson', 'Task', 'Quiz'] as PriorityType[])
      .find((type) => sevenDayGroupedItems[type].length > 0)
    if (fallbackType) setSelectedSevenDayType(fallbackType)
  }, [selectedSevenDayType, sevenDayGroupedItems])

  const selectedSevenDayItems = React.useMemo(
    () => sevenDayGroupedItems[selectedSevenDayType],
    [sevenDayGroupedItems, selectedSevenDayType]
  )

  const visibleSevenDayItems = React.useMemo(
    () => selectedSevenDayItems.slice(0, PRIORITY_PAGE_SIZE),
    [selectedSevenDayItems]
  )

  const hiddenSevenDayItemCount = Math.max(0, selectedSevenDayItems.length - visibleSevenDayItems.length)

  const openSevenDayCalendarPicker = React.useCallback(() => {
    const input = sevenDayDateInputRef.current
    if (!input) return
    const pickerInput = input as HTMLInputElement & { showPicker?: () => void }
    if (typeof pickerInput.showPicker === 'function') {
      pickerInput.showPicker()
      return
    }
    input.focus()
    input.click()
  }, [])

  const progressByPath = React.useMemo(() => {
    const groups = new Map<string, {
      pathId: string
      pathTitle: string
      total: number
      completed: number
      overdue: number
      nearestDue?: string | null
    }>()

    items.forEach((item) => {
      const pathId = String(item.learningPathId || item.learningPathTitle || 'unknown-path')
      const pathTitle = String(item.learningPathTitle || t('dashboard.timeline.unknownPath'))
      if (!groups.has(pathId)) {
        groups.set(pathId, { pathId, pathTitle, total: 0, completed: 0, overdue: 0, nearestDue: null })
      }
      const target = groups.get(pathId)!
      target.total += 1
      if (item.isCompleted) target.completed += 1
      if (!item.isCompleted && (item.isOverdue || parseDueTime(item.dueAtUtc) < nowTs)) target.overdue += 1
      if (!item.isCompleted && item.dueAtUtc) {
        if (!target.nearestDue || parseDueTime(item.dueAtUtc) < parseDueTime(target.nearestDue)) {
          target.nearestDue = item.dueAtUtc
        }
      }
    })

    return Array.from(groups.values())
      .map((entry) => ({ ...entry, percent: entry.total > 0 ? Math.round((entry.completed / entry.total) * 100) : 0 }))
      .sort((left, right) => {
        if (left.overdue !== right.overdue) return right.overdue - left.overdue
        return parseDueTime(left.nearestDue) - parseDueTime(right.nearestDue)
      })
  }, [items, nowTs, t])

  const formatLocalDateTime = React.useCallback((value?: string | null) => {
    if (!value) return t('dashboard.timeline.noDeadline')
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return t('dashboard.timeline.noDeadline')
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: UTC_PLUS_7_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date)
  }, [t])

  const displayLocale = React.useMemo(() => {
    const language = String(i18n.resolvedLanguage || i18n.language || 'en').toLowerCase()
    return language.startsWith('vi') ? 'vi-VN' : 'en-GB'
  }, [i18n.language, i18n.resolvedLanguage])

  const formatDisplayDate = React.useCallback((value?: Date | string | null) => {
    if (!value) return '—'
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: UTC_PLUS_7_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date)
  }, [])

  const formatDisplayWeekday = React.useCallback((value?: Date | string | null) => {
    if (!value) return '—'
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return new Intl.DateTimeFormat(displayLocale, {
      timeZone: UTC_PLUS_7_TIMEZONE,
      weekday: 'short',
    }).format(date)
  }, [displayLocale])

  const getPriorityTypeLabel = React.useCallback((type: PriorityType) => {
    if (type === 'Lesson') return t('dashboard.timeline.typeLesson')
    if (type === 'Task') return t('dashboard.timeline.typeTask')
    return t('dashboard.timeline.typeQuiz')
  }, [t])

  const getTimelineItemTypeLabel = React.useCallback((itemType?: string | null) => {
    if (itemType === 'Lesson') return t('dashboard.timeline.typeLesson')
    if (itemType === 'Task') return t('dashboard.timeline.typeTask')
    if (itemType === 'Quiz') return t('dashboard.timeline.typeQuiz')
    return t('dashboard.timeline.typeOther')
  }, [t])

  const getTimelineStatusLabel = React.useCallback((item: TimelineItem) => {
    const rawStatus = String(item.status ?? '').trim()
    const normalizedStatus = rawStatus.toLowerCase()

    if (item.isCompleted || normalizedStatus === 'completed' || normalizedStatus === 'done' || normalizedStatus === 'finished') {
      return t('dashboard.timeline.statusCompleted')
    }

    if (item.isOverdue || normalizedStatus === 'overdue') {
      return t('dashboard.timeline.statusOverdue')
    }

    if (normalizedStatus === 'pending' || normalizedStatus === 'notstarted' || normalizedStatus === 'not_started') {
      return t('dashboard.timeline.statusPending')
    }

    if (!rawStatus) {
      return t('dashboard.timeline.statusPending')
    }

    return rawStatus
  }, [t])

  const readTimelineIdField = React.useCallback((item: TimelineItem, candidates: string[]) => {
    for (const candidate of candidates) {
      const value = item?.[candidate]
      const normalized = String(value ?? '').trim()
      if (normalized) return normalized
    }
    return ''
  }, [])

  const resolveTimelineLessonSkeleton = React.useCallback(async (item: TimelineItem, lessonId: string) => {
    const userId = user?.id
    if (!userId) return null

    const learningPathId = readTimelineIdField(item, ['learningPathId', 'pathId', 'PathId'])
    if (learningPathId && learningPathSkeletonCacheRef.current.has(learningPathId)) {
      return learningPathSkeletonCacheRef.current.get(learningPathId)
    }

    try {
      const result = await LearningPathService.getUserLearningPaths(userId, {
        pageNumber: 1,
        pageSize: 200,
        sortDescending: true,
      })
      const paths = Array.isArray(result?.items) ? result.items : []

      let foundPath = learningPathId
        ? paths.find((path: any) => String(path?.pathId ?? path?.id ?? '').trim() === learningPathId)
        : null

      if (!foundPath) {
        foundPath = paths.find((path: any) =>
          Array.isArray(path?.chapters) && path.chapters.some((chapter: any) =>
            Array.isArray(chapter?.lessons) && chapter.lessons.some((lesson: any) => {
              const currentLessonId = String(lesson?.id ?? lesson?.lessonId ?? '').trim()
              return currentLessonId === lessonId
            })
          )
        )
      }

      const foundPathId = String(foundPath?.pathId ?? foundPath?.id ?? '').trim()
      if (foundPathId && foundPath) {
        learningPathSkeletonCacheRef.current.set(foundPathId, foundPath)
      }

      return foundPath || null
    } catch {
      return null
    }
  }, [readTimelineIdField, user?.id])

  const handleTimelineItemClick = React.useCallback(async (item: TimelineItem) => {
    const itemType = String(item.itemType ?? '').trim().toLowerCase()

    if (itemType === 'lesson') {
      const lessonId = readTimelineIdField(item, ['lessonId', 'LessonId', 'itemId', 'id'])
      if (!lessonId) return
      const lessonTitle = String(item.title ?? '').trim()
      const chapterTitle = String(item.chapterTitle ?? item.learningPathTitle ?? '').trim()
      const lessonState = {
        lessonTitle,
        chapterTitle,
      }

      const skeleton = await resolveTimelineLessonSkeleton(item, lessonId)
      if (skeleton) {
        try {
          sessionStorage.setItem('learningPathSkeleton', JSON.stringify(skeleton))
        } catch {}
        navigate(`/lesson/${encodeURIComponent(lessonId)}`, { state: { skeleton, ...lessonState } })
        return
      }

      navigate(`/lesson/${encodeURIComponent(lessonId)}`, { state: lessonState })
      return
    }

    if (itemType === 'quiz') {
      const quizId = readTimelineIdField(item, ['quizId', 'QuizId', 'quizzId', 'QuizzId', 'itemId', 'id'])
      if (!quizId) return
      navigate(`/quiz/${encodeURIComponent(quizId)}`)
      return
    }

    if (itemType === 'task') {
      const taskRouteId = readTimelineIdField(item, ['chapterId', 'ChapterId', 'taskId', 'TaskId', 'itemId', 'id'])
      if (!taskRouteId) return
      navigate(`/task/${encodeURIComponent(taskRouteId)}`)
    }
  }, [navigate, readTimelineIdField, resolveTimelineLessonSkeleton])
  const getInitials = (name: string) => {
    const initials = name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
    return initials || 'U'
  }

  const sidebarConfig = {
    navItems: useStudentSidebarConfig(),
    actions: [],
    brand: { name: 'Dashboard', subtitle: 'Learning' },
  }

  const expiringSoonNotification = React.useMemo<NotificationDto | null>(() => {
    const seen = new Set<string>()
    const deduped = [...notificationPanelItems, ...notificationItems].filter((item) => {
      if (!item.notificationId || seen.has(item.notificationId)) return false
      seen.add(item.notificationId)
      return true
    })

    const matched = deduped
      .filter((item) => {
        const type = String(item.type || '').trim()
        return type === 'PlanExpiringSoon' || type === 'PlanExpired'
      })
      .map((item) => {
        const type = String(item.type || '').trim()
        if (type === 'PlanExpiringSoon' && currentSubExpiredAt && currentSubExpiredAt.getTime() < Date.now()) {
          return { ...item, type: 'PlanExpired' }
        }
        return item
      })
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())

    return matched[0] ?? null
  }, [notificationItems, notificationPanelItems, currentSubExpiredAt])

  const handleExpiringSoonBannerClick = React.useCallback(async () => {
    if (!expiringSoonNotification) return

    try {
      setShowExpiringSoonModal(false)
      await navigateAndMarkNotificationRead(expiringSoonNotification, navigate, (notificationId) => markNotificationAsRead(notificationId))
    } catch (error: any) {
      showToast(error?.message || 'Failed to open subscription update screen.', 'error')
    }
  }, [expiringSoonNotification, markNotificationAsRead, navigate, showToast])

  React.useEffect(() => {
    if (!expiringSoonNotification?.notificationId) {
      setShowExpiringSoonModal(false)
      return
    }

    try {
      const dismissedId = sessionStorage.getItem(DISMISSED_EXPIRING_NOTICE_KEY)
      setShowExpiringSoonModal(dismissedId !== expiringSoonNotification.notificationId)
    } catch {
      setShowExpiringSoonModal(true)
    }
  }, [expiringSoonNotification?.notificationId])

  const handleCloseExpiringSoonModal = React.useCallback(() => {
    setShowExpiringSoonModal(false)
    if (!expiringSoonNotification?.notificationId) return

    try {
      sessionStorage.setItem(DISMISSED_EXPIRING_NOTICE_KEY, expiringSoonNotification.notificationId)
    } catch {
      // ignore storage failures
    }
  }, [expiringSoonNotification?.notificationId])

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="page-fade-in" style={{ padding: 16, background: 'var(--bg-surface)' }}>
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: '16px 20px', marginBottom: 16 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 2, border: '1px solid var(--border-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', flexShrink: 0, overflow: 'hidden' }}>
              {avatarUrl && !avatarLoadFailed ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={() => setAvatarLoadFailed(true)}
                />
              ) : (
                getInitials(displayName)
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{displayName}</h1>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>{user?.email ?? '—'}</p>
            </div>
          </div>
        </motion.div>

        <div style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 16, marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('dashboard.timeline.whatTodayTitle')}</h2>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 12px' }}>{t('dashboard.timeline.whatTodaySubtitle')}</p>

          {timelineLoading ? (
            <div style={{ padding: 16, fontSize: 12, color: 'var(--text-secondary)' }}>{t('dashboard.timeline.loading')}</div>
          ) : timelineError ? (
            <div style={{ padding: 16, border: '1px solid var(--danger-primary)', borderRadius: 2, color: 'var(--danger-primary)', background: 'var(--bg-red-tint)', fontSize: 12 }}>
              {timelineError === TIMELINE_LOAD_ERROR_CODE ? t('dashboard.timeline.errorLoad') : timelineError}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
              {[
                { label: t('dashboard.timeline.statUrgent'), value: overdueItems.length, color: 'var(--danger-primary)', bg: 'var(--bg-red-tint)', onClick: handleUrgentCardClick },
                { label: t('dashboard.timeline.statDue3Days'), value: dueSoonItems.length, color: 'var(--warning-primary)', bg: 'var(--bg-yellow-tint)' },
                { label: t('dashboard.timeline.statNotStarted'), value: notStartedItems.length, color: 'var(--accent-primary)', bg: 'var(--bg-main)' },
                { label: t('dashboard.timeline.statCompletedToday'), value: completedTodayCount, color: 'var(--success-primary)', bg: 'var(--bg-green-tint)' },
              ].map((card) => (
                <div
                  key={card.label}
                  onClick={card.onClick}
                  role={card.onClick ? 'button' : undefined}
                  tabIndex={card.onClick ? 0 : undefined}
                  onKeyDown={(event) => {
                    if (!card.onClick) return
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      card.onClick()
                    }
                  }}
                  style={{
                    border: `1px solid ${card.color}`,
                    borderRadius: 2,
                    background: card.bg,
                    padding: '10px 12px',
                    cursor: card.onClick ? 'pointer' : 'default'
                  }}
                >
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{card.label}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 700, color: card.color }}>{card.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {!timelineLoading && !timelineError && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 12, marginBottom: 16 }}>
              <div style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 16, height: 'fit-content' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{t('dashboard.timeline.sevenDaysTitle')}</h3>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <input
                      ref={sevenDayDateInputRef}
                      type="date"
                      value={activeDayKey || ''}
                      onChange={(event) => {
                        const selectedDateKey = event.target.value
                        if (!selectedDateKey) return
                        setActiveDayKey(selectedDateKey)
                      }}
                      style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
                      aria-hidden="true"
                      tabIndex={-1}
                    />
                    <button
                      type="button"
                      onClick={openSevenDayCalendarPicker}
                      title={t('dashboard.timeline.openCalendar')}
                      aria-label={t('dashboard.timeline.openCalendar')}
                      onMouseEnter={(event) => {
                        event.currentTarget.style.borderColor = 'var(--accent-primary)'
                        event.currentTarget.style.background = 'var(--bg-main)'
                        event.currentTarget.style.color = 'var(--accent-primary)'
                      }}
                      onMouseLeave={(event) => {
                        event.currentTarget.style.borderColor = 'var(--border-base)'
                        event.currentTarget.style.background = 'transparent'
                        event.currentTarget.style.color = 'var(--accent-primary)'
                      }}
                      onFocus={(event) => {
                        event.currentTarget.style.borderColor = 'var(--accent-primary)'
                        event.currentTarget.style.background = 'var(--bg-main)'
                        event.currentTarget.style.color = 'var(--accent-primary)'
                        event.currentTarget.style.outline = '2px solid var(--accent-primary)'
                        event.currentTarget.style.outlineOffset = '2px'
                      }}
                      onBlur={(event) => {
                        event.currentTarget.style.borderColor = 'var(--border-base)'
                        event.currentTarget.style.background = 'transparent'
                        event.currentTarget.style.color = 'var(--accent-primary)'
                        event.currentTarget.style.outline = 'none'
                        event.currentTarget.style.outlineOffset = ''
                      }}
                      style={{
                        border: '1px solid var(--border-base)',
                        borderRadius: 2,
                        width: 30,
                        height: 30,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        background: 'transparent',
                        color: 'var(--accent-primary)',
                        lineHeight: 1,
                        transition: 'all 0.12s ease'
                      }}
                    >
                      <span aria-hidden="true" style={{ display: 'inline-block', fontSize: 14, lineHeight: 1 }}>📅</span>
                    </button>
                  </div>
                </div>
                <p style={{ margin: '6px 0 12px', fontSize: 13, color: 'var(--text-secondary)' }}>{t('dashboard.timeline.sevenDaysSubtitle')}</p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6, marginBottom: 12 }}>
                  {sevenDayBuckets.map((bucket) => {
                    const isActive = activeDayKey === bucket.key
                    return (
                      <button
                        key={bucket.key}
                        type="button"
                        onClick={() => setActiveDayKey(bucket.key)}
                        style={{
                          border: isActive ? '1px solid var(--accent-primary)' : '1px solid var(--border-base)',
                          borderRadius: 2,
                          background: isActive ? 'var(--bg-main)' : 'var(--bg-surface-short)',
                          cursor: 'pointer',
                          padding: '9px 7px',
                          textAlign: 'left'
                        }}
                      >
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', fontWeight: 700 }}>{formatDisplayWeekday(bucket.date)}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>{formatDisplayDate(bucket.date)}</p>
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--warning-primary)' }}>{t('dashboard.timeline.kDue')}: {bucket.due}</p>
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--success-primary)' }}>{t('dashboard.timeline.kCompleted')}: {bucket.completed}</p>
                      </button>
                    )
                  })}
                </div>

                <div style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 12 }}>
                  <p style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {t('dashboard.timeline.dayPanelTitle', { date: formatDisplayDate(activeDayDate) })}
                  </p>
                  {activeDayItems.length === 0 ? (
                    <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>{t('dashboard.timeline.emptyDay')}</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label htmlFor="seven-day-path-filter" style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                          {t('dashboard.timeline.learningPathFilterLabel')}
                        </label>
                        <select
                          id="seven-day-path-filter"
                          value={selectedSevenDayPathKey}
                          onChange={(event) => setSelectedSevenDayPathKey(event.target.value)}
                          style={{ border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-main)', color: 'var(--text-primary)', padding: '6px 8px', fontSize: 12, maxWidth: 360 }}
                        >
                          <option value={PRIORITY_ALL_PATH_KEY}>{t('dashboard.timeline.allLearningPaths')}</option>
                          {sevenDayPathOptions.map((option) => (
                            <option key={option.key} value={option.key}>{option.title}</option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap' }}>
                        {(['Lesson', 'Task', 'Quiz'] as PriorityType[]).map((type) => {
                          const isActive = selectedSevenDayType === type
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setSelectedSevenDayType(type)}
                              style={{
                                border: isActive ? '1px solid var(--accent-primary)' : '1px solid var(--border-base)',
                                background: isActive ? 'var(--bg-main)' : 'var(--bg-surface-short)',
                                color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                borderRadius: 999,
                                padding: '4px 10px',
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              {getPriorityTypeLabel(type)} ({sevenDayGroupedItems[type].length})
                            </button>
                          )
                        })}
                      </div>

                      {selectedSevenDayItems.length === 0 ? (
                        <div style={{ border: '1px dashed var(--border-base)', borderRadius: 2, padding: 10, textAlign: 'center', fontSize: 11, color: 'var(--text-secondary)' }}>
                          {t('dashboard.timeline.emptyTypeItems', { type: getPriorityTypeLabel(selectedSevenDayType).toLowerCase() })}
                        </div>
                      ) : visibleSevenDayItems.map((item) => {
                        const isCompleted = Boolean(item.isCompleted)
                        const isOverdue = !isCompleted && (item.isOverdue || parseDueTime(item.dueAtUtc) < nowTs)
                        return (
                          <div
                            key={`${activeDayKey || 'selected-day'}-${item.itemType}-${item.itemId}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => handleTimelineItemClick(item)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                handleTimelineItemClick(item)
                              }
                            }}
                            style={{
                              border: isCompleted
                                ? '1px solid var(--success-primary)'
                                : '1px solid var(--border-base)',
                              borderLeft: isOverdue ? '3px solid var(--danger-primary)' : undefined,
                              borderRadius: 2,
                              padding: '8px 10px',
                              cursor: 'pointer',
                              background: isCompleted
                                ? 'var(--bg-green-tint)'
                                : isOverdue
                                  ? 'rgba(207, 34, 46, 0.07)'
                                  : 'var(--bg-main)'
                            }}
                          >
                            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-primary)', fontWeight: 600, lineHeight: 1.35 }}>{item.title || '—'}</p>
                            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.35 }}>{item.learningPathTitle || t('dashboard.timeline.unknownPath')}</p>
                            <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: isCompleted ? 'var(--success-primary)' : isOverdue ? 'var(--danger-primary)' : 'var(--text-secondary)' }}>
                              {isCompleted ? <CheckCircle2 size={12} /> : isOverdue ? <AlertTriangle size={12} /> : <Circle size={12} />}
                              {getTimelineStatusLabel(item)}
                            </div>
                          </div>
                        )
                      })}

                      {hiddenSevenDayItemCount > 0 && (
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
                          {t('dashboard.timeline.moreItems', { count: hiddenSevenDayItemCount })}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 10, marginTop: 10, background: 'var(--bg-surface-short)' }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>{t('dashboard.quickActions')}</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      { label: t('dashboard.newPath'), sub: t('dashboard.generateLearningPath'), route: ROUTER.PLANS },
                      { label: t('dashboard.newGoal'), sub: t('dashboard.setLearningObjective'), route: ROUTER.GOALS },
                    ].map((action) => (
                      <button
                        key={action.label}
                        type="button"
                        onClick={() => navigate(action.route)}
                        style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: '9px 11px', textAlign: 'left', cursor: 'pointer', background: 'var(--bg-main)' }}
                      >
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{action.label}</span>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '3px 0 0' }}>{action.sub}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 12, marginBottom: 16, alignItems: 'start' }}>
              <div ref={priorityQueueRef} style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 16 }}>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{t('dashboard.timeline.priorityQueueTitle')}</h3>

                {priorityScope === 'overdue' && (
                  <div style={{ border: '1px solid var(--danger-primary)', borderRadius: 2, background: 'var(--bg-red-tint)', color: 'var(--danger-primary)', fontSize: 11, padding: '8px 10px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <span>{t('dashboard.timeline.overdueFilterActive')}</span>
                    <button
                      type="button"
                      onClick={() => setPriorityScope('all')}
                      style={{ border: '1px solid var(--danger-primary)', background: 'var(--bg-main)', color: 'var(--danger-primary)', borderRadius: 2, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}
                    >
                      {t('dashboard.timeline.clearOverdueFilter')}
                    </button>
                  </div>
                )}

                {priorityGroupedItems.Lesson.length === 0 && priorityGroupedItems.Task.length === 0 && priorityGroupedItems.Quiz.length === 0 ? (
                  <div style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 14, textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>
                    {t('dashboard.timeline.emptyPriority')}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label htmlFor="priority-path-filter" style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                        {t('dashboard.timeline.learningPathFilterLabel')}
                      </label>
                      <select
                        id="priority-path-filter"
                        value={selectedPriorityPathKey}
                        onChange={(event) => {
                          setSelectedPriorityPathKey(event.target.value)
                          setPriorityPages({ Lesson: 1, Task: 1, Quiz: 1 })
                        }}
                        style={{ border: '1px solid var(--border-base)', borderRadius: 2, background: 'var(--bg-main)', color: 'var(--text-primary)', padding: '6px 8px', fontSize: 12, maxWidth: 360 }}
                      >
                        <option value={PRIORITY_ALL_PATH_KEY}>{t('dashboard.timeline.allLearningPaths')}</option>
                        {priorityPathOptions.map((option) => (
                          <option key={option.key} value={option.key}>{option.title}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap' }}>
                      {(['Lesson', 'Task', 'Quiz'] as PriorityType[]).map((type) => {
                        const isActive = selectedPriorityType === type
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setSelectedPriorityType(type)}
                            style={{
                              border: isActive ? '1px solid var(--accent-primary)' : '1px solid var(--border-base)',
                              background: isActive ? 'var(--bg-main)' : 'var(--bg-surface-short)',
                              color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                              borderRadius: 999,
                              padding: '4px 10px',
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            {getPriorityTypeLabel(type)} ({priorityGroupedItems[type].length})
                          </button>
                        )
                      })}
                    </div>

                    {(() => {
                      const type = selectedPriorityType
                      const allItems = priorityGroupedItems[type]
                      const currentPage = priorityPages[type]
                      const totalPages = Math.max(1, Math.ceil(allItems.length / PRIORITY_PAGE_SIZE))
                      const startIndex = (currentPage - 1) * PRIORITY_PAGE_SIZE
                      const pagedItems = allItems.slice(startIndex, startIndex + PRIORITY_PAGE_SIZE)

                      return (
                        <div style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{getPriorityTypeLabel(type)} ({allItems.length})</p>
                            {allItems.length > PRIORITY_PAGE_SIZE && (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                <button
                                  type="button"
                                  onClick={() => setPriorityPages((prev) => ({ ...prev, [type]: Math.max(1, prev[type] - 1) }))}
                                  disabled={currentPage <= 1}
                                  style={{ border: '1px solid var(--border-base)', background: 'var(--bg-main)', color: 'var(--text-primary)', borderRadius: 2, fontSize: 11, cursor: currentPage <= 1 ? 'not-allowed' : 'pointer', padding: '2px 6px', opacity: currentPage <= 1 ? 0.5 : 1 }}
                                >
                                  ←
                                </button>
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{currentPage}/{totalPages}</span>
                                <button
                                  type="button"
                                  onClick={() => setPriorityPages((prev) => ({ ...prev, [type]: Math.min(totalPages, prev[type] + 1) }))}
                                  disabled={currentPage >= totalPages}
                                  style={{ border: '1px solid var(--border-base)', background: 'var(--bg-main)', color: 'var(--text-primary)', borderRadius: 2, fontSize: 11, cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', padding: '2px 6px', opacity: currentPage >= totalPages ? 0.5 : 1 }}
                                >
                                  →
                                </button>
                              </div>
                            )}
                          </div>

                          {allItems.length === 0 ? (
                            <div style={{ border: '1px dashed var(--border-base)', borderRadius: 2, padding: 10, textAlign: 'center', fontSize: 11, color: 'var(--text-secondary)' }}>
                              {t('dashboard.timeline.emptyTypeItems', { type: getPriorityTypeLabel(type).toLowerCase() })}
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {pagedItems.map((item) => {
                                const pathKey = String(item.learningPathId || item.learningPathTitle || 'unknown')
                                const chipColor = getPathChipColor(pathKey)
                                const isOverdue = !item.isCompleted && (item.isOverdue || parseDueTime(item.dueAtUtc) < nowTs)
                                const statusColor = item.isCompleted
                                  ? 'var(--success-primary)'
                                  : isOverdue
                                    ? 'var(--danger-primary)'
                                    : 'var(--text-secondary)'

                                return (
                                  <div
                                    key={`${type}-${item.itemId}`}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => handleTimelineItemClick(item)}
                                    onKeyDown={(event) => {
                                      if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault()
                                        handleTimelineItemClick(item)
                                      }
                                    }}
                                    style={{
                                      border: '1px solid var(--border-base)',
                                      borderLeft: isOverdue ? '3px solid var(--danger-primary)' : undefined,
                                      borderRadius: 2,
                                      padding: 10,
                                      background: isOverdue ? 'rgba(207, 34, 46, 0.07)' : 'var(--bg-surface-short)',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start' }}>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{item.title || '—'}</p>
                                        <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-secondary)' }}>
                                          {item.learningPathTitle || t('dashboard.timeline.unknownPath')}
                                        </p>
                                      </div>
                                      <span style={{ fontSize: 10, padding: '2px 8px', border: '1px solid var(--border-base)', borderRadius: 999, color: 'var(--text-secondary)', background: 'var(--bg-main)', textTransform: 'uppercase', fontWeight: 700 }}>
                                        {getTimelineItemTypeLabel(item.itemType)}
                                      </span>
                                    </div>

                                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-secondary)' }}>
                                        <Clock3 size={12} /> {formatLocalDateTime(item.dueAtUtc)}
                                      </span>
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: statusColor }}>
                                        {item.isCompleted ? <CheckCircle2 size={12} /> : isOverdue ? <AlertTriangle size={12} /> : <Circle size={12} />}
                                        {getTimelineStatusLabel(item)}
                                      </span>
                                      <span style={{ width: 10, height: 10, borderRadius: 999, background: chipColor, display: 'inline-block' }} />
                                      <span style={{ fontSize: 11, color: chipColor, fontWeight: 600 }}>{item.learningPathTitle || t('dashboard.timeline.unknownPath')}</span>
                                      {item.priority !== null && item.priority !== undefined && String(item.priority).trim() !== '' && (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-secondary)' }}>
                                          <Flag size={12} /> {String(item.priority)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>

              <div style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 16 }}>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{t('dashboard.timeline.pathProgressTitle')}</h3>
                <p style={{ margin: '4px 0 10px', fontSize: 11, color: 'var(--text-secondary)' }}>{t('dashboard.timeline.pathProgressSubtitle')}</p>

                {progressByPath.length === 0 ? (
                  <div style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 14, textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>
                    {t('dashboard.timeline.emptyPathProgress')}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {progressByPath.map((entry) => (
                      <div key={entry.pathId} style={{ border: '1px solid var(--border-base)', borderRadius: 2, padding: 10, background: 'var(--bg-surface-short)' }}>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{entry.pathTitle}</p>
                        <div style={{ height: 8, borderRadius: 999, overflow: 'hidden', background: 'var(--bg-main)', border: '1px solid var(--border-base)', marginTop: 6 }}>
                          <div style={{ width: `${entry.percent}%`, height: '100%', background: 'var(--accent-primary)' }} />
                        </div>
                        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t('dashboard.timeline.progressPercent', { percent: entry.percent })}</span>
                          <span style={{ fontSize: 11, color: entry.overdue > 0 ? 'var(--danger-primary)' : 'var(--text-secondary)' }}>{t('dashboard.timeline.progressOverdue', { count: entry.overdue })}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t('dashboard.timeline.progressNearestDue', { due: formatLocalDateTime(entry.nearestDue) })}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate('/my-plans/detail', { state: { pathId: entry.pathId } })}
                          style={{ marginTop: 8, fontSize: 11, border: '1px solid var(--accent-primary)', borderRadius: 2, color: 'var(--accent-primary)', background: 'var(--bg-main)', cursor: 'pointer', padding: '6px 10px' }}
                        >
                          {t('dashboard.timeline.continueLearning')}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </>
        )}

      </div>

      {showExpiringSoonModal && expiringSoonNotification && (
        <div
          onClick={handleCloseExpiringSoonModal}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 80,
            background: 'rgba(15, 23, 42, 0.28)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="expiring-plan-modal-title"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 430,
              borderRadius: 14,
              border: '1px solid rgba(245, 158, 11, 0.2)',
              background: 'var(--bg-surface)',
              boxShadow: '0 24px 60px rgba(15, 23, 42, 0.2)',
              padding: 22,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
              <button
                type="button"
                onClick={handleCloseExpiringSoonModal}
                aria-label="Close"
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: 2,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 999,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(180deg, #4ade80, #22c55e)',
                  color: '#fff',
                  boxShadow: '0 16px 30px rgba(34, 197, 94, 0.28)',
                }}
              >
                <AlertTriangle size={28} />
              </div>
            </div>

            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <h2 id="expiring-plan-modal-title" style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
                {expiringSoonNotification.title || t('overview.subscriptionNotice.title')}
              </h2>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: 'var(--text-secondary)' }}>
                {expiringSoonNotification.message || t('overview.subscriptionNotice.description')}
              </p>
            </div>

            <div
              style={{
                border: '1px solid var(--border-base)',
                borderRadius: 10,
                background: 'var(--bg-main)',
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                {String(expiringSoonNotification.type).trim() === 'PlanExpired' ? t('overview.subscriptionNotice.eyebrowExpired') : t('overview.subscriptionNotice.eyebrow')}
              </div>
              <button
                type="button"
                onClick={() => { void handleExpiringSoonBannerClick() }}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '1px solid rgba(245, 158, 11, 0.22)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                <span>{t('overview.subscriptionNotice.action')}</span>
                <ArrowRight size={16} />
              </button>
              <button
                type="button"
                onClick={handleCloseExpiringSoonModal}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid var(--border-base)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Để sau
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </Layout>
  )
}

export default StudentIndex
