import { describe, expect, it } from 'vitest'
import { resolveNotificationNavigationTarget } from './utils'

describe('notification navigation resolver', () => {
  it('routes task notifications to learning path detail and keeps selected task metadata', () => {
    const target = resolveNotificationNavigationTarget({
      notificationId: 'n-1',
      userId: 'u-1',
      type: 'TaskOverdue',
      title: 'Task overdue',
      message: null,
      createdAt: '2026-03-30T07:00:00Z',
      isRead: false,
      readAt: null,
      severity: 'Medium',
      channels: ['Web'],
      action: {
        targetType: 'task',
        targetId: 'task-1',
        targetUrl: '/learning-paths/path-1/chapters/chapter-1/tasks/task-1',
        route: '/tasks/:taskId',
        taskId: 'task-1',
        chapterId: 'chapter-1',
        lessonId: null,
        learningPathId: 'path-1',
      },
    })

    expect(target).toEqual({
      path: '/my-plans/detail',
      state: {
        pathId: 'path-1',
        activeChapterId: 'chapter-1',
        selectedTaskId: 'task-1',
      },
    })
  })

  it('keeps FE-supported targetUrl values', () => {
    const target = resolveNotificationNavigationTarget({
      notificationId: 'n-2',
      userId: 'u-1',
      type: 'PlanExpired',
      title: 'Plan expired',
      message: null,
      createdAt: '2026-03-30T07:00:00Z',
      isRead: false,
      readAt: null,
      severity: 'Critical',
      channels: ['Web'],
      action: {
        targetType: 'subscription',
        targetId: null,
        targetUrl: '/subscription',
        route: '/subscription',
        taskId: null,
        chapterId: null,
        lessonId: null,
        learningPathId: null,
      },
    })

    expect(target).toEqual({ path: '/subscription' })
  })

  it('routes expiring-soon plan notifications to the subscription update screen', () => {
    const target = resolveNotificationNavigationTarget({
      notificationId: 'n-3',
      userId: 'u-1',
      type: 'PlanExpiringSoon',
      title: 'Plan expiring soon',
      message: null,
      createdAt: '2026-03-30T07:00:00Z',
      isRead: false,
      readAt: null,
      severity: 'High',
      channels: ['Web'],
      action: {
        targetType: 'subscription',
        targetId: null,
        targetUrl: '/subscription/current',
        route: '/subscription/current',
        taskId: null,
        chapterId: null,
        lessonId: null,
        learningPathId: null,
      },
    })

    expect(target).toEqual({ path: '/subscription' })
  })

  it('routes learningPathShareUpdate notifications to the share update review page', () => {
    const target = resolveNotificationNavigationTarget({
      notificationId: 'n-4',
      userId: 'u-1',
      type: 'ShareVersionUpdated',
      title: 'Learning path updated',
      message: null,
      createdAt: '2026-03-30T07:00:00Z',
      isRead: false,
      readAt: null,
      severity: 'High',
      channels: ['Web'],
      action: {
        targetType: 'learningPathShareUpdate',
        targetId: 'share-123',
        targetUrl: '/learning-path-shares/share-123/updates',
        route: '/learningpath-shares/:shareId/updates',
        taskId: null,
        chapterId: null,
        lessonId: null,
        learningPathId: 'path-1',
      },
    })

    expect(target).toEqual({ path: '/learning-path-shares/share-123/updates' })
  })

  it('supports update-context targetUrl path even without targetType', () => {
    const target = resolveNotificationNavigationTarget({
      notificationId: 'n-5',
      userId: 'u-1',
      type: 'ShareVersionUpdated',
      title: 'Learning path updated',
      message: null,
      createdAt: '2026-03-30T07:00:00Z',
      isRead: false,
      readAt: null,
      severity: 'High',
      channels: ['Web'],
      action: {
        targetType: null,
        targetId: null,
        targetUrl: '/learning-path-shares/share-456/updates',
        route: '/learningpath-shares/:shareId/updates',
        taskId: null,
        chapterId: null,
        lessonId: null,
        learningPathId: null,
      },
    })

    expect(target).toEqual({ path: '/learning-path-shares/share-456/updates' })
  })

  it('normalizes legacy learningpath-shares targetUrl to canonical route', () => {
    const target = resolveNotificationNavigationTarget({
      notificationId: 'n-6',
      userId: 'u-1',
      type: 'ShareVersionUpdated',
      title: 'Learning path updated',
      message: null,
      createdAt: '2026-03-30T07:00:00Z',
      isRead: false,
      readAt: null,
      severity: 'High',
      channels: ['Web'],
      action: {
        targetType: null,
        targetId: null,
        targetUrl: '/learningpath-shares/share-789/updates',
        route: '/learningpath-shares/:shareId/updates',
        taskId: null,
        chapterId: null,
        lessonId: null,
        learningPathId: null,
      },
    })

    expect(target).toEqual({ path: '/learning-path-shares/share-789/updates' })
  })
})
