import { describe, expect, it } from 'vitest'
import {
  hasShareVersionUpdatedSnapshot,
  resolveNotificationNavigationTarget,
  resolveNotificationText,
  resolveNotificationTextWithContext,
  resolveShareVersionUpdatedNotificationText,
  resolveShareVersionUpdatedTitleParts,
} from './utils'

const translateMap: Record<string, string> = {
  'notification.shareVersionUpdated.title': 'Learning path updated by mentor',
  'notification.shareVersionUpdated.message': 'A newer shared learning path version is available.',
  'notification.taskReviewRequested.title': 'New task review request',
  'notification.taskReviewRequested.message': 'A student requested you to review a focus session submission.',
  'notification.taskReviewCompleted.title': 'Task review completed',
  'notification.taskReviewCompleted.message': 'Your mentor has completed the task review.',
  'notification.shareVersionUpdated.titleDetailed': '{{pathTitle}} has a new version',
  'notification.shareVersionUpdated.titleDetailedWithVersion': 'Learning path {{pathTitle}} has a new version ver {{version}}',
  'notification.shareVersionUpdated.messageDetailed': 'Mentor {{mentorName}} updated the shared learning path {{pathTitle}}.',
  'notification.shareVersionUpdated.messagePathOnly': 'The shared learning path {{pathTitle}} has a new version from your mentor.',
  'notification.shareVersionUpdated.messageMentorOnly': 'Mentor {{mentorName}} updated a shared learning path.',
  'notification.default.title': 'Notification',
}

const t = (key: string, options?: Record<string, unknown>) => {
  const template = translateMap[key]
  if (!template) return key

  return template.replace(/\{\{(\w+)\}\}/g, (_, token: string) => {
    const value = options?.[token]
    return value == null ? '' : String(value)
  })
}

describe('notification navigation resolver', () => {
  it('routes task notifications to learning path detail and keeps selected task metadata', () => {
    const target = resolveNotificationNavigationTarget({
      notificationId: 'n-1',
      userId: 'u-1',
      type: 'TaskOverdue',
      title: 'Task overdue',
      message: null,
      notifiedPathTitle: null,
      notifiedSourceVersion: null,
      notifiedMentorUserName: null,
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
      notifiedPathTitle: null,
      notifiedSourceVersion: null,
      notifiedMentorUserName: null,
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

    expect(target).toEqual({ path: '/shop' })
  })

  it('routes expiring-soon plan notifications to the subscription update screen', () => {
    const target = resolveNotificationNavigationTarget({
      notificationId: 'n-3',
      userId: 'u-1',
      type: 'PlanExpiringSoon',
      title: 'Plan expiring soon',
      message: null,
      notifiedPathTitle: null,
      notifiedSourceVersion: null,
      notifiedMentorUserName: null,
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

    expect(target).toEqual({ path: '/shop' })
  })

  it('routes learningPathShareUpdate notifications to the share update review page', () => {
    const target = resolveNotificationNavigationTarget({
      notificationId: 'n-4',
      userId: 'u-1',
      type: 'ShareVersionUpdated',
      title: 'Learning path updated',
      message: null,
      notifiedPathTitle: null,
      notifiedSourceVersion: null,
      notifiedMentorUserName: null,
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
      notifiedPathTitle: null,
      notifiedSourceVersion: null,
      notifiedMentorUserName: null,
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

  it('routes task review notifications to the shared task review detail page', () => {
    const target = resolveNotificationNavigationTarget({
      notificationId: 'n-task-review-1',
      userId: 'u-1',
      type: 'TaskReviewRequested',
      title: 'Task review requested',
      message: null,
      notifiedPathTitle: null,
      notifiedSourceVersion: null,
      notifiedMentorUserName: null,
      createdAt: '2026-04-24T07:00:00Z',
      isRead: false,
      readAt: null,
      severity: 'Medium',
      channels: ['Web'],
      action: {
        targetType: 'taskReview',
        targetId: 'review-123',
        targetUrl: '/task-reviews/review-123',
        route: '/task-reviews/:reviewId',
        taskId: null,
        chapterId: null,
        lessonId: null,
        learningPathId: null,
      },
    })

    expect(target).toEqual({ path: '/task-reviews/review-123' })
  })

  it('supports task review targetUrl path even without taskReview targetType', () => {
    const target = resolveNotificationNavigationTarget({
      notificationId: 'n-task-review-2',
      userId: 'u-1',
      type: 'TaskReviewCompleted',
      title: 'Task review completed',
      message: null,
      notifiedPathTitle: null,
      notifiedSourceVersion: null,
      notifiedMentorUserName: null,
      createdAt: '2026-04-24T07:00:00Z',
      isRead: false,
      readAt: null,
      severity: 'Medium',
      channels: ['Web'],
      action: {
        targetType: null,
        targetId: null,
        targetUrl: '/task-reviews/review-456',
        route: '/task-reviews/:reviewId',
        taskId: null,
        chapterId: null,
        lessonId: null,
        learningPathId: null,
      },
    })

    expect(target).toEqual({ path: '/task-reviews/review-456' })
  })

  it('normalizes legacy learningpath-shares targetUrl to canonical route', () => {
    const target = resolveNotificationNavigationTarget({
      notificationId: 'n-6',
      userId: 'u-1',
      type: 'ShareVersionUpdated',
      title: 'Learning path updated',
      message: null,
      notifiedPathTitle: null,
      notifiedSourceVersion: null,
      notifiedMentorUserName: null,
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

describe('notification text resolver', () => {
  it('resolves title and message from payload i18n keys', () => {
    const text = resolveNotificationText(
      {
        type: 'TaskOverdue',
        title: 'notification.shareVersionUpdated.title',
        message: 'notification.shareVersionUpdated.message',
      },
      t,
    )

    expect(text).toEqual({
      title: 'Learning path updated by mentor',
      message: 'A newer shared learning path version is available.',
    })
  })

  it('falls back by ShareVersionUpdated type when payload key is missing', () => {
    const text = resolveNotificationText(
      {
        type: 'ShareVersionUpdated',
        title: 'notification.unknown.title',
        message: 'notification.unknown.message',
      },
      t,
    )

    expect(text).toEqual({
      title: 'Learning path updated by mentor',
      message: 'A newer shared learning path version is available.',
    })
  })

  it('supports legacy numeric type value 9 for ShareVersionUpdated fallback', () => {
    const text = resolveNotificationText(
      {
        type: '9',
        title: '',
        message: '',
      },
      t,
    )

    expect(text).toEqual({
      title: 'Learning path updated by mentor',
      message: 'A newer shared learning path version is available.',
    })
  })

  it('uses default title fallback for non-share unresolved keys', () => {
    const text = resolveNotificationText(
      {
        type: 'TaskOverdue',
        title: 'notification.unknown.title',
        message: 'notification.unknown.message',
      },
      t,
    )

    expect(text).toEqual({
      title: 'Notification',
      message: '',
    })
  })

  it('falls back by TaskReviewRequested type when payload key is missing', () => {
    const text = resolveNotificationText(
      {
        type: 'TaskReviewRequested',
        title: '',
        message: '',
      },
      t,
    )

    expect(text).toEqual({
      title: 'New task review request',
      message: 'A student requested you to review a focus session submission.',
    })
  })

  it('falls back by TaskReviewCompleted type when payload key is missing', () => {
    const text = resolveNotificationText(
      {
        type: 'TaskReviewCompleted',
        title: '',
        message: '',
      },
      t,
    )

    expect(text).toEqual({
      title: 'Task review completed',
      message: 'Your mentor has completed the task review.',
    })
  })

  it('uses task review context to disambiguate numeric type values', () => {
    const text = resolveNotificationTextWithContext(
      {
        type: '9',
        title: '',
        message: '',
        action: {
          targetType: 'taskReview',
          targetId: 'review-123',
          targetUrl: '/task-reviews/review-123',
          route: '/task-reviews/:reviewId',
          taskId: null,
          chapterId: null,
          lessonId: null,
          learningPathId: null,
        },
      },
      t,
    )

    expect(text).toEqual({
      title: 'Task review completed',
      message: 'Your mentor has completed the task review.',
    })
  })

  it('prefers notification snapshot fields for share update copy', () => {
    const text = resolveShareVersionUpdatedNotificationText(
      {
        type: 'ShareVersionUpdated',
        title: 'notification.shareVersionUpdated.title',
        message: 'notification.shareVersionUpdated.message',
        notifiedPathTitle: 'Fullstack Path',
        notifiedSourceVersion: 4,
        notifiedMentorUserName: 'mentor-x',
      },
      t,
    )

    expect(text).toEqual({
      title: 'Learning path Fullstack Path has a new version ver 4',
      message: 'Mentor mentor-x updated the shared learning path Fullstack Path.',
    })
  })

  it('falls back to cached legacy context only when snapshot fields are missing', () => {
    const text = resolveShareVersionUpdatedNotificationText(
      {
        type: 'ShareVersionUpdated',
        title: 'notification.shareVersionUpdated.title',
        message: 'notification.shareVersionUpdated.message',
        notifiedPathTitle: null,
        notifiedSourceVersion: null,
        notifiedMentorUserName: null,
      },
      t,
      {
        sourceLearningPathTitle: 'Legacy Path',
        mentorUserName: 'mentor-legacy',
      },
    )

    expect(text).toEqual({
      title: 'Legacy Path has a new version',
      message: 'Mentor mentor-legacy updated the shared learning path Legacy Path.',
    })
  })

  it('uses versioned title when path and version are available without mentor snapshot', () => {
    const text = resolveShareVersionUpdatedNotificationText(
      {
        type: 'ShareVersionUpdated',
        title: 'notification.shareVersionUpdated.title',
        message: 'notification.shareVersionUpdated.message',
        notifiedPathTitle: 'React Basics',
        notifiedSourceVersion: 9,
        notifiedMentorUserName: null,
      },
      t,
    )

    expect(text).toEqual({
      title: 'Learning path React Basics has a new version ver 9',
      message: 'The shared learning path React Basics has a new version from your mentor.',
    })
  })

  it('removes duplicated trailing version from path title before composing versioned title', () => {
    const text = resolveShareVersionUpdatedNotificationText(
      {
        type: 'ShareVersionUpdated',
        title: 'notification.shareVersionUpdated.title',
        message: 'notification.shareVersionUpdated.message',
        notifiedPathTitle: 'ABC ver 13',
        notifiedSourceVersion: 13,
        notifiedMentorUserName: null,
      },
      t,
    )

    expect(text).toEqual({
      title: 'Learning path ABC has a new version ver 13',
      message: 'The shared learning path ABC has a new version from your mentor.',
    })
  })

  it('detects snapshot presence from any share update snapshot field', () => {
    expect(hasShareVersionUpdatedSnapshot({
      notifiedPathTitle: null,
      notifiedSourceVersion: 2,
      notifiedMentorUserName: null,
    })).toBe(true)

    expect(hasShareVersionUpdatedSnapshot({
      notifiedPathTitle: null,
      notifiedSourceVersion: null,
      notifiedMentorUserName: '',
    })).toBe(false)
  })

  it('extracts highlighted title parts and strips duplicated trailing version from path title', () => {
    expect(resolveShareVersionUpdatedTitleParts({
      notifiedPathTitle: 'ABC ver 13',
      notifiedSourceVersion: 13,
    })).toEqual({
      pathTitle: 'ABC',
      version: 13,
    })

    expect(resolveShareVersionUpdatedTitleParts({
      notifiedPathTitle: null,
      notifiedSourceVersion: 13,
    })).toBeNull()
  })
})
