import { create } from 'zustand'
import NotificationService from '../services/NotificationService'
import type {
  MarkNotificationAsReadResultDto,
  NotificationDto,
  NotificationListQuery,
  NotificationPagedResultDto,
  NotificationTypeKey,
} from '../types/notification'

type MarkReadOutcome = {
  result: MarkNotificationAsReadResultDto | null
  removed: boolean
}

interface AppNotificationState {
  items: NotificationDto[]
  panelItems: NotificationDto[]
  unreadCount: number
  pageNumber: number
  pageSize: number
  totalCount: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  unreadOnly: boolean
  selectedType: NotificationTypeKey | null
  loading: boolean
  panelLoading: boolean
  error: string | null
  bootstrapped: boolean
  bootstrap: () => Promise<void>
  fetchUnreadCount: () => Promise<number>
  fetchPage: (query?: NotificationListQuery) => Promise<NotificationPagedResultDto>
  refreshPanel: () => Promise<void>
  prependRealtimeItem: (notification: NotificationDto) => void
  syncUnreadCount: (count: number) => void
  markAsRead: (notificationIds: string[]) => Promise<MarkReadOutcome>
  markAllAsRead: () => Promise<MarkReadOutcome>
  setUnreadOnly: (unreadOnly: boolean) => void
  setSelectedType: (type: NotificationTypeKey | null) => void
  removeNotification: (notificationId: string) => void
  reset: () => void
}

const DEFAULT_PAGE_NUMBER = 1
const DEFAULT_PAGE_SIZE = 20

let bootstrapPromise: Promise<void> | null = null

function dedupeNotifications(items: NotificationDto[]): NotificationDto[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (!item.notificationId || seen.has(item.notificationId)) return false
    seen.add(item.notificationId)
    return true
  })
}

function sortNotifications(items: NotificationDto[]): NotificationDto[] {
  return [...items].sort((left, right) => {
    const leftTs = new Date(left.createdAt).getTime()
    const rightTs = new Date(right.createdAt).getTime()
    return rightTs - leftTs
  })
}

function upsertNotification(items: NotificationDto[], nextItem: NotificationDto): NotificationDto[] {
  const updated = items.some((item) => item.notificationId === nextItem.notificationId)
    ? items.map((item) => item.notificationId === nextItem.notificationId ? nextItem : item)
    : [nextItem, ...items]

  return sortNotifications(dedupeNotifications(updated))
}

function applyMarkRead(items: NotificationDto[], result: MarkNotificationAsReadResultDto, unreadOnly: boolean): NotificationDto[] {
  const markedIds = new Set(result.notificationIds)
  const updated = items.map((item) => {
    if (!markedIds.has(item.notificationId)) return item
    return {
      ...item,
      isRead: true,
      readAt: result.readAt,
    }
  })

  if (unreadOnly) {
    return updated.filter((item) => !markedIds.has(item.notificationId))
  }

  return updated
}

function applyMarkAllRead(items: NotificationDto[], readAt: string | null, unreadOnly: boolean): NotificationDto[] {
  if (unreadOnly) {
    return []
  }

  return items.map((item) => (
    item.isRead
      ? item
      : {
        ...item,
        isRead: true,
        readAt,
      }
  ))
}

const initialState = {
  items: [] as NotificationDto[],
  panelItems: [] as NotificationDto[],
  unreadCount: 0,
  pageNumber: DEFAULT_PAGE_NUMBER,
  pageSize: DEFAULT_PAGE_SIZE,
  totalCount: 0,
  hasNextPage: false,
  hasPreviousPage: false,
  unreadOnly: false,
  selectedType: null as NotificationTypeKey | null,
  loading: false,
  panelLoading: false,
  error: null as string | null,
  bootstrapped: false,
}

const useAppNotificationStore = create<AppNotificationState>((set, get) => ({
  ...initialState,

  bootstrap: async () => {
    if (bootstrapPromise) return bootstrapPromise

    bootstrapPromise = (async () => {
      set({ panelLoading: true, error: null })
      try {
        const [unreadCount, firstPage] = await Promise.all([
          NotificationService.getUnreadCount(),
          NotificationService.getMyNotifications({
            pageNumber: DEFAULT_PAGE_NUMBER,
            pageSize: DEFAULT_PAGE_SIZE,
            unreadOnly: false,
          }),
        ])

        set((state) => ({
          unreadCount,
          panelItems: firstPage.items,
          items: state.items.length > 0 ? state.items : firstPage.items,
          pageNumber: state.items.length > 0 ? state.pageNumber : firstPage.pageNumber,
          pageSize: state.items.length > 0 ? state.pageSize : firstPage.pageSize,
          totalCount: state.items.length > 0 ? state.totalCount : firstPage.totalCount,
          hasNextPage: state.items.length > 0 ? state.hasNextPage : firstPage.hasNextPage,
          hasPreviousPage: state.items.length > 0 ? state.hasPreviousPage : firstPage.hasPreviousPage,
          unreadOnly: state.items.length > 0 ? state.unreadOnly : false,
          selectedType: state.items.length > 0 ? state.selectedType : null,
          panelLoading: false,
          error: null,
          bootstrapped: true,
        }))
      } catch (error: any) {
        if (error?.response?.status === 400 || error?.response?.status === 404) {
          set({
            unreadCount: 0,
            panelItems: [],
            items: [],
            pageNumber: DEFAULT_PAGE_NUMBER,
            pageSize: DEFAULT_PAGE_SIZE,
            totalCount: 0,
            hasNextPage: false,
            hasPreviousPage: false,
            unreadOnly: false,
            selectedType: null,
            panelLoading: false,
            error: null,
            bootstrapped: true,
          })
          return
        }

        set({
          panelLoading: false,
          error: error?.response?.data?.message || error?.message || 'Failed to load notifications',
        })
        throw error
      } finally {
        bootstrapPromise = null
      }
    })()

    return bootstrapPromise
  },

  fetchUnreadCount: async () => {
    const unreadCount = await NotificationService.getUnreadCount()
    set({ unreadCount })
    return unreadCount
  },

  fetchPage: async (query = {}) => {
    const pageNumber = query.pageNumber ?? get().pageNumber
    const pageSize = query.pageSize ?? get().pageSize
    const unreadOnly = query.unreadOnly ?? get().unreadOnly
    const selectedType = query.type === undefined ? get().selectedType : query.type

    set({ loading: true, error: null })
    try {
      const page = await NotificationService.getMyNotifications({
        pageNumber,
        pageSize,
        unreadOnly,
        type: selectedType,
      })
      set({
        items: page.items,
        pageNumber: page.pageNumber,
        pageSize: page.pageSize,
        totalCount: page.totalCount,
        hasNextPage: page.hasNextPage,
        hasPreviousPage: page.hasPreviousPage,
        unreadOnly,
        selectedType,
        loading: false,
        error: null,
        bootstrapped: true,
      })
      return page
    } catch (error: any) {
      if (error?.response?.status === 400 || error?.response?.status === 404) {
        const emptyPage = {
          items: [],
          pageNumber,
          pageSize,
          totalCount: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        }
        set({
          ...emptyPage,
          unreadOnly,
          selectedType,
          loading: false,
          error: null,
          bootstrapped: true,
        })
        return emptyPage
      }

      set({
        loading: false,
        error: error?.response?.data?.message || error?.message || 'Failed to load notifications',
      })
      throw error
    }
  },

  refreshPanel: async () => {
    set({ panelLoading: true, error: null })
    try {
      const page = await NotificationService.getMyNotifications({
        pageNumber: DEFAULT_PAGE_NUMBER,
        pageSize: DEFAULT_PAGE_SIZE,
        unreadOnly: false,
      })
      set({
        panelItems: page.items,
        panelLoading: false,
        error: null,
      })
      return
    } catch (error: any) {
      if (error?.response?.status === 400 || error?.response?.status === 404) {
        set({
          panelItems: [],
          panelLoading: false,
          error: null,
        })
        return
      }

      set({
        panelLoading: false,
        error: error?.response?.data?.message || error?.message || 'Failed to refresh notifications',
      })
      throw error
    }
  },

  prependRealtimeItem: (notification) => {
    set((state) => {
      const panelItems = upsertNotification(state.panelItems, notification).slice(0, DEFAULT_PAGE_SIZE)
      let items = state.items
      let totalCount = state.totalCount

      if (
        state.pageNumber === DEFAULT_PAGE_NUMBER
        && state.unreadOnly === false
        && state.selectedType == null
      ) {
        items = upsertNotification(state.items, notification).slice(0, state.pageSize)
        if (!state.items.some((item) => item.notificationId === notification.notificationId)) {
          totalCount += 1
        }
      }

      return {
        panelItems,
        items,
        totalCount,
      }
    })
  },

  syncUnreadCount: (count) => {
    set({ unreadCount: Math.max(0, count) })
  },

  markAsRead: async (notificationIds) => {
    const dedupedIds = Array.from(new Set(notificationIds.map((id) => String(id || '').trim()).filter(Boolean)))
    if (dedupedIds.length === 0) {
      return { result: null, removed: false }
    }

    const state = get()
    const unreadIds = dedupedIds.filter((notificationId) => {
      const target = [...state.items, ...state.panelItems].find((item) => item.notificationId === notificationId)
      return Boolean(target && !target.isRead)
    })

    if (unreadIds.length === 0) {
      return { result: null, removed: false }
    }

    try {
      const result = await NotificationService.markAsRead(unreadIds)
      const normalizedResult: MarkNotificationAsReadResultDto = {
        ...result,
        notificationIds: result.notificationIds.length > 0 ? result.notificationIds : unreadIds,
      }

      set((current) => ({
        unreadCount: normalizedResult.unreadCount,
        items: applyMarkRead(current.items, normalizedResult, current.unreadOnly),
        panelItems: applyMarkRead(current.panelItems, normalizedResult, false),
        totalCount: current.unreadOnly
          ? Math.max(0, current.totalCount - normalizedResult.notificationIds.length)
          : current.totalCount,
      }))

      return { result: normalizedResult, removed: state.unreadOnly && normalizedResult.notificationIds.length > 0 }
    } catch (error: any) {
      if (error?.response?.status === 404) {
        unreadIds.forEach((notificationId) => {
          get().removeNotification(notificationId)
        })
        return { result: null, removed: true }
      }
      throw error
    }
  },

  markAllAsRead: async () => {
    const state = get()
    const hasUnreadItems = [...state.items, ...state.panelItems].some((item) => !item.isRead)

    if (state.unreadCount === 0 && !hasUnreadItems) {
      return { result: null, removed: false }
    }

    const result = await NotificationService.markAllAsRead()
    const normalizedResult: MarkNotificationAsReadResultDto = {
      ...result,
      notificationIds: result.notificationIds,
      markedCount: result.markedCount ?? result.notificationIds.length,
    }

    set((current) => ({
      unreadCount: normalizedResult.unreadCount,
      items: applyMarkAllRead(current.items, normalizedResult.readAt, current.unreadOnly),
      panelItems: applyMarkAllRead(current.panelItems, normalizedResult.readAt, false),
      totalCount: current.unreadOnly ? 0 : current.totalCount,
    }))

    return { result: normalizedResult, removed: state.unreadOnly }
  },

  setUnreadOnly: (unreadOnly) => {
    set({ unreadOnly })
  },

  setSelectedType: (selectedType) => {
    set({ selectedType })
  },

  removeNotification: (notificationId) => {
    set((state) => {
      const wasUnread = [...state.items, ...state.panelItems]
        .some((item) => item.notificationId === notificationId && !item.isRead)

      return {
        items: state.items.filter((item) => item.notificationId !== notificationId),
        panelItems: state.panelItems.filter((item) => item.notificationId !== notificationId),
        totalCount: Math.max(0, state.totalCount - 1),
        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      }
    })
  },

  reset: () => {
    set(initialState)
  },
}))

export default useAppNotificationStore
