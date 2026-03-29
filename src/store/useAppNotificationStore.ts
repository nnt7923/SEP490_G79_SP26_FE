import { create } from 'zustand'
import NotificationService from '../services/NotificationService'
import type {
  MarkNotificationAsReadResultDto,
  NotificationDto,
  NotificationListQuery,
  NotificationPagedResultDto,
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
  markAsRead: (notificationId: string) => Promise<MarkReadOutcome>
  setUnreadOnly: (unreadOnly: boolean) => void
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
  const updated = items.map((item) => {
    if (item.notificationId !== result.notificationId) return item
    return {
      ...item,
      isRead: result.isRead,
      readAt: result.readAt,
    }
  })

  if (unreadOnly) {
    return updated.filter((item) => item.notificationId !== result.notificationId)
  }

  return updated
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
          panelLoading: false,
          error: null,
          bootstrapped: true,
        }))
      } catch (error: any) {
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

    set({ loading: true, error: null })
    try {
      const page = await NotificationService.getMyNotifications({ pageNumber, pageSize, unreadOnly })
      set({
        items: page.items,
        pageNumber: page.pageNumber,
        pageSize: page.pageSize,
        totalCount: page.totalCount,
        hasNextPage: page.hasNextPage,
        hasPreviousPage: page.hasPreviousPage,
        unreadOnly,
        loading: false,
        error: null,
        bootstrapped: true,
      })
      return page
    } catch (error: any) {
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
    } catch (error: any) {
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

      if (state.pageNumber === DEFAULT_PAGE_NUMBER && state.unreadOnly === false) {
        items = upsertNotification(state.items, notification).slice(0, state.pageSize)
      }

      if (!state.items.some((item) => item.notificationId === notification.notificationId)) {
        totalCount += 1
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

  markAsRead: async (notificationId) => {
    const state = get()
    const target = [...state.items, ...state.panelItems].find((item) => item.notificationId === notificationId)
    if (!target || target.isRead) {
      return { result: null, removed: false }
    }

    try {
      const result = await NotificationService.markAsRead(notificationId)
      set((current) => ({
        unreadCount: result.unreadCount,
        items: applyMarkRead(current.items, result, current.unreadOnly),
        panelItems: applyMarkRead(current.panelItems, result, false),
        totalCount: current.unreadOnly ? Math.max(0, current.totalCount - 1) : current.totalCount,
      }))

      return { result, removed: state.unreadOnly }
    } catch (error: any) {
      if (error?.response?.status === 404) {
        get().removeNotification(notificationId)
        return { result: null, removed: true }
      }
      throw error
    }
  },

  setUnreadOnly: (unreadOnly) => {
    set({ unreadOnly })
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
