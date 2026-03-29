import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../Axios', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}))

import api from '../Axios'
import NotificationService from './index'

const mockedApi = vi.mocked(api, true)

describe('NotificationService', () => {
  beforeEach(() => {
    mockedApi.get.mockReset()
    mockedApi.patch.mockReset()
  })

  it('normalizes paged notifications and nested action metadata', async () => {
    mockedApi.get.mockResolvedValue({
      data: {
        items: [
          {
            notificationId: 'n-1',
            userId: 'u-1',
            type: 'PlanExpired',
            title: 'Expired',
            message: 'Your plan expired',
            createdAt: '2026-03-30T07:00:00Z',
            isRead: false,
            readAt: null,
            severity: 'Critical',
            channels: ['Web', 'Email'],
            action: {
              targetType: 'subscription',
              targetUrl: '/subscription',
            },
          },
        ],
        pageNumber: '2',
        pageSize: '20',
        totalCount: '45',
        hasNextPage: true,
        hasPreviousPage: true,
      },
    })

    await expect(
      NotificationService.getMyNotifications({ pageNumber: 2, pageSize: 20, unreadOnly: false })
    ).resolves.toEqual({
      items: [
        {
          notificationId: 'n-1',
          userId: 'u-1',
          type: 'PlanExpired',
          title: 'Expired',
          message: 'Your plan expired',
          createdAt: '2026-03-30T07:00:00Z',
          isRead: false,
          readAt: null,
          severity: 'Critical',
          channels: ['Web', 'Email'],
          action: {
            targetType: 'subscription',
            targetId: null,
            targetUrl: '/subscription',
            route: null,
            taskId: null,
            chapterId: null,
            lessonId: null,
            learningPathId: null,
          },
        },
      ],
      pageNumber: 2,
      pageSize: 20,
      totalCount: 45,
      hasNextPage: true,
      hasPreviousPage: true,
    })
  })

  it('supports raw unread-count number responses', async () => {
    mockedApi.get.mockResolvedValue(5)

    await expect(NotificationService.getUnreadCount()).resolves.toBe(5)
  })

  it('normalizes mark-as-read response payload', async () => {
    mockedApi.patch.mockResolvedValue({
      data: {
        notificationId: 'n-2',
        isRead: true,
        readAt: '2026-03-30T07:05:00Z',
        unreadCount: 4,
      },
    })

    await expect(NotificationService.markAsRead('n-2')).resolves.toEqual({
      notificationId: 'n-2',
      isRead: true,
      readAt: '2026-03-30T07:05:00Z',
      unreadCount: 4,
    })
  })
})
