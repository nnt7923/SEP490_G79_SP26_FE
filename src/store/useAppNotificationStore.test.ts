import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../services/NotificationService', () => ({
  default: {
    getUnreadCount: vi.fn(),
    getMyNotifications: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  },
}))

import NotificationService from '../services/NotificationService'
import useAppNotificationStore from './useAppNotificationStore'

const mockedNotificationService = vi.mocked(NotificationService, true)

describe('useAppNotificationStore', () => {
  beforeEach(() => {
    useAppNotificationStore.getState().reset()
    mockedNotificationService.getUnreadCount.mockReset()
    mockedNotificationService.getMyNotifications.mockReset()
    mockedNotificationService.markAsRead.mockReset()
    mockedNotificationService.markAllAsRead.mockReset()
  })

  it('bootstraps unread count and first page', async () => {
    mockedNotificationService.getUnreadCount.mockResolvedValue(3)
    mockedNotificationService.getMyNotifications.mockResolvedValue({
      items: [
        {
          notificationId: 'n-1',
          userId: 'u-1',
          type: 'LessonOverdue',
          title: 'Lesson overdue',
          message: null,
          notifiedPathTitle: null,
          notifiedSourceVersion: null,
          notifiedMentorUserName: null,
          createdAt: '2026-03-30T07:00:00Z',
          isRead: false,
          readAt: null,
          severity: 'Low',
          channels: ['Web'],
          action: {
            targetType: 'lesson',
            targetId: 'lesson-1',
            targetUrl: '/lesson/lesson-1',
            route: '/lesson/:lessonId',
            taskId: null,
            chapterId: 'chapter-1',
            lessonId: 'lesson-1',
            learningPathId: 'path-1',
          },
        },
      ],
      pageNumber: 1,
      pageSize: 20,
      totalCount: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    })

    await useAppNotificationStore.getState().bootstrap()

    const state = useAppNotificationStore.getState()
    expect(state.unreadCount).toBe(3)
    expect(state.items).toHaveLength(1)
    expect(state.panelItems).toHaveLength(1)
    expect(state.bootstrapped).toBe(true)
  })

  it('prepends realtime items once and trims first page list', async () => {
    useAppNotificationStore.setState({
      items: [
        {
          notificationId: 'n-1',
          userId: 'u-1',
          type: 'TaskOverdue',
          title: 'First',
          message: null,
          notifiedPathTitle: null,
          notifiedSourceVersion: null,
          notifiedMentorUserName: null,
          createdAt: '2026-03-30T07:00:00Z',
          isRead: false,
          readAt: null,
          severity: 'Medium',
          channels: ['Web'],
          action: { targetType: 'task', targetId: 'task-1', targetUrl: '/task/chapter-1', route: null, taskId: 'task-1', chapterId: 'chapter-1', lessonId: null, learningPathId: 'path-1' },
        },
        {
          notificationId: 'n-2',
          userId: 'u-1',
          type: 'TaskOverdue',
          title: 'Second',
          message: null,
          notifiedPathTitle: null,
          notifiedSourceVersion: null,
          notifiedMentorUserName: null,
          createdAt: '2026-03-30T06:00:00Z',
          isRead: false,
          readAt: null,
          severity: 'Medium',
          channels: ['Web'],
          action: { targetType: 'task', targetId: 'task-2', targetUrl: '/task/chapter-2', route: null, taskId: 'task-2', chapterId: 'chapter-2', lessonId: null, learningPathId: 'path-1' },
        },
      ],
      panelItems: [
        {
          notificationId: 'n-1',
          userId: 'u-1',
          type: 'TaskOverdue',
          title: 'First',
          message: null,
          notifiedPathTitle: null,
          notifiedSourceVersion: null,
          notifiedMentorUserName: null,
          createdAt: '2026-03-30T07:00:00Z',
          isRead: false,
          readAt: null,
          severity: 'Medium',
          channels: ['Web'],
          action: { targetType: 'task', targetId: 'task-1', targetUrl: '/task/chapter-1', route: null, taskId: 'task-1', chapterId: 'chapter-1', lessonId: null, learningPathId: 'path-1' },
        },
      ],
      pageNumber: 1,
      pageSize: 2,
      totalCount: 2,
      unreadOnly: false,
    })

    const realtimeItem = {
      notificationId: 'n-3',
      userId: 'u-1',
      type: 'PlanExpired',
      title: 'Latest',
      message: null,
      notifiedPathTitle: null,
      notifiedSourceVersion: null,
      notifiedMentorUserName: null,
      createdAt: '2026-03-30T08:00:00Z',
      isRead: false,
      readAt: null,
      severity: 'Critical',
      channels: ['Web'],
      action: { targetType: 'subscription', targetId: null, targetUrl: '/subscription', route: null, taskId: null, chapterId: null, lessonId: null, learningPathId: null },
    }

    useAppNotificationStore.getState().prependRealtimeItem(realtimeItem)
    useAppNotificationStore.getState().prependRealtimeItem(realtimeItem)

    const state = useAppNotificationStore.getState()
    expect(state.items.map((item) => item.notificationId)).toEqual(['n-3', 'n-1'])
    expect(state.panelItems.map((item) => item.notificationId)).toEqual(['n-3', 'n-1'])
    expect(state.totalCount).toBe(3)
  })

  it('marks unread notifications as read and removes them from unread-only pages', async () => {
    useAppNotificationStore.setState({
      items: [
        {
          notificationId: 'n-4',
          userId: 'u-1',
          type: 'LessonOverdue',
          title: 'Unread lesson',
          message: null,
          notifiedPathTitle: null,
          notifiedSourceVersion: null,
          notifiedMentorUserName: null,
          createdAt: '2026-03-30T07:00:00Z',
          isRead: false,
          readAt: null,
          severity: 'Low',
          channels: ['Web'],
          action: { targetType: 'lesson', targetId: 'lesson-4', targetUrl: '/lesson/lesson-4', route: null, taskId: null, chapterId: 'chapter-4', lessonId: 'lesson-4', learningPathId: 'path-4' },
        },
      ],
      panelItems: [
        {
          notificationId: 'n-4',
          userId: 'u-1',
          type: 'LessonOverdue',
          title: 'Unread lesson',
          message: null,
          notifiedPathTitle: null,
          notifiedSourceVersion: null,
          notifiedMentorUserName: null,
          createdAt: '2026-03-30T07:00:00Z',
          isRead: false,
          readAt: null,
          severity: 'Low',
          channels: ['Web'],
          action: { targetType: 'lesson', targetId: 'lesson-4', targetUrl: '/lesson/lesson-4', route: null, taskId: null, chapterId: 'chapter-4', lessonId: 'lesson-4', learningPathId: 'path-4' },
        },
      ],
      unreadCount: 2,
      unreadOnly: true,
      totalCount: 1,
    })

    mockedNotificationService.markAsRead.mockResolvedValue({
      notificationIds: ['n-4'],
      readAt: '2026-03-30T07:05:00Z',
      unreadCount: 1,
    })

    await useAppNotificationStore.getState().markAsRead(['n-4'])

    const state = useAppNotificationStore.getState()
    expect(state.unreadCount).toBe(1)
    expect(state.items).toHaveLength(0)
    expect(state.panelItems[0]?.isRead).toBe(true)
    expect(state.totalCount).toBe(0)
  })

  it('fetches notification pages with selected type filter', async () => {
    mockedNotificationService.getMyNotifications.mockResolvedValue({
      items: [],
      pageNumber: 1,
      pageSize: 20,
      totalCount: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    })

    useAppNotificationStore.setState({
      selectedType: 'TaskOverdue',
    })

    await useAppNotificationStore.getState().fetchPage({ pageNumber: 1 })

    expect(mockedNotificationService.getMyNotifications).toHaveBeenCalledWith({
      pageNumber: 1,
      pageSize: 20,
      unreadOnly: false,
      type: 'TaskOverdue',
    })
    expect(useAppNotificationStore.getState().selectedType).toBe('TaskOverdue')
  })

  it('marks all notifications as read and syncs both page and panel items', async () => {
    useAppNotificationStore.setState({
      items: [
        {
          notificationId: 'n-5',
          userId: 'u-1',
          type: 'TaskOverdue',
          title: 'Unread task',
          message: null,
          notifiedPathTitle: null,
          notifiedSourceVersion: null,
          notifiedMentorUserName: null,
          createdAt: '2026-03-30T07:00:00Z',
          isRead: false,
          readAt: null,
          severity: 'Medium',
          channels: ['Web'],
          action: { targetType: 'task', targetId: 'task-5', targetUrl: '/task/5', route: null, taskId: 'task-5', chapterId: 'chapter-5', lessonId: null, learningPathId: 'path-5' },
        },
      ],
      panelItems: [
        {
          notificationId: 'n-6',
          userId: 'u-1',
          type: 'PlanExpired',
          title: 'Unread plan',
          message: null,
          notifiedPathTitle: null,
          notifiedSourceVersion: null,
          notifiedMentorUserName: null,
          createdAt: '2026-03-30T08:00:00Z',
          isRead: false,
          readAt: null,
          severity: 'Critical',
          channels: ['Web'],
          action: { targetType: 'subscription', targetId: null, targetUrl: '/subscription', route: null, taskId: null, chapterId: null, lessonId: null, learningPathId: null },
        },
      ],
      unreadCount: 2,
      unreadOnly: false,
      totalCount: 5,
    })

    mockedNotificationService.markAllAsRead.mockResolvedValue({
      notificationIds: ['n-5', 'n-6'],
      markedCount: 2,
      readAt: '2026-03-30T09:00:00Z',
      unreadCount: 0,
    })

    await useAppNotificationStore.getState().markAllAsRead()

    const state = useAppNotificationStore.getState()
    expect(state.unreadCount).toBe(0)
    expect(state.items[0]?.isRead).toBe(true)
    expect(state.items[0]?.readAt).toBe('2026-03-30T09:00:00Z')
    expect(state.panelItems[0]?.isRead).toBe(true)
    expect(state.totalCount).toBe(5)
  })

  it('clears unread-only page items when marking all notifications as read', async () => {
    useAppNotificationStore.setState({
      items: [
        {
          notificationId: 'n-7',
          userId: 'u-1',
          type: 'LessonOverdue',
          title: 'Unread lesson',
          message: null,
          notifiedPathTitle: null,
          notifiedSourceVersion: null,
          notifiedMentorUserName: null,
          createdAt: '2026-03-30T07:00:00Z',
          isRead: false,
          readAt: null,
          severity: 'Low',
          channels: ['Web'],
          action: { targetType: 'lesson', targetId: 'lesson-7', targetUrl: '/lesson/7', route: null, taskId: null, chapterId: 'chapter-7', lessonId: 'lesson-7', learningPathId: 'path-7' },
        },
      ],
      panelItems: [
        {
          notificationId: 'n-7',
          userId: 'u-1',
          type: 'LessonOverdue',
          title: 'Unread lesson',
          message: null,
          notifiedPathTitle: null,
          notifiedSourceVersion: null,
          notifiedMentorUserName: null,
          createdAt: '2026-03-30T07:00:00Z',
          isRead: false,
          readAt: null,
          severity: 'Low',
          channels: ['Web'],
          action: { targetType: 'lesson', targetId: 'lesson-7', targetUrl: '/lesson/7', route: null, taskId: null, chapterId: 'chapter-7', lessonId: 'lesson-7', learningPathId: 'path-7' },
        },
      ],
      unreadCount: 1,
      unreadOnly: true,
      totalCount: 1,
    })

    mockedNotificationService.markAllAsRead.mockResolvedValue({
      notificationIds: ['n-7'],
      markedCount: 1,
      readAt: '2026-03-30T09:10:00Z',
      unreadCount: 0,
    })

    await useAppNotificationStore.getState().markAllAsRead()

    const state = useAppNotificationStore.getState()
    expect(state.items).toHaveLength(0)
    expect(state.panelItems[0]?.isRead).toBe(true)
    expect(state.totalCount).toBe(0)
    expect(state.unreadCount).toBe(0)
  })

  it('does not prepend realtime items into filtered page lists', () => {
    useAppNotificationStore.setState({
      items: [
        {
          notificationId: 'n-8',
          userId: 'u-1',
          type: 'TaskOverdue',
          title: 'Existing task',
          message: null,
          notifiedPathTitle: null,
          notifiedSourceVersion: null,
          notifiedMentorUserName: null,
          createdAt: '2026-03-30T07:00:00Z',
          isRead: false,
          readAt: null,
          severity: 'Medium',
          channels: ['Web'],
          action: { targetType: 'task', targetId: 'task-8', targetUrl: '/task/8', route: null, taskId: 'task-8', chapterId: 'chapter-8', lessonId: null, learningPathId: 'path-8' },
        },
      ],
      panelItems: [],
      pageNumber: 1,
      pageSize: 20,
      totalCount: 1,
      unreadOnly: false,
      selectedType: 'TaskOverdue',
    })

    useAppNotificationStore.getState().prependRealtimeItem({
      notificationId: 'n-9',
      userId: 'u-1',
      type: 'PlanExpired',
      title: 'Filtered out',
      message: null,
      notifiedPathTitle: null,
      notifiedSourceVersion: null,
      notifiedMentorUserName: null,
      createdAt: '2026-03-30T08:00:00Z',
      isRead: false,
      readAt: null,
      severity: 'Critical',
      channels: ['Web'],
      action: { targetType: 'subscription', targetId: null, targetUrl: '/subscription', route: null, taskId: null, chapterId: null, lessonId: null, learningPathId: null },
    })

    const state = useAppNotificationStore.getState()
    expect(state.items.map((item) => item.notificationId)).toEqual(['n-8'])
    expect(state.panelItems.map((item) => item.notificationId)).toEqual(['n-9'])
    expect(state.totalCount).toBe(1)
  })
})
