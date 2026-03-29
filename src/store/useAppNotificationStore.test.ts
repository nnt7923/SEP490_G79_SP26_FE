import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../services/NotificationService', () => ({
  default: {
    getUnreadCount: vi.fn(),
    getMyNotifications: vi.fn(),
    markAsRead: vi.fn(),
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
      notificationId: 'n-4',
      isRead: true,
      readAt: '2026-03-30T07:05:00Z',
      unreadCount: 1,
    })

    await useAppNotificationStore.getState().markAsRead('n-4')

    const state = useAppNotificationStore.getState()
    expect(state.unreadCount).toBe(1)
    expect(state.items).toHaveLength(0)
    expect(state.panelItems[0]?.isRead).toBe(true)
    expect(state.totalCount).toBe(0)
  })
})
