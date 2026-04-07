import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import Layout from '../../../../components/Layout'
import ConfirmDialog from '../../../../components/ConfirmDialog'
import Toast from '../../../../components/Toast'
import { useStudentSidebarConfig } from '../components/StudentSideBar'
import ROUTER from '../../../../router/ROUTER'
import {
  applyUpdate,
  getUpdateContext,
} from '../../../../services/LearningPathShareService'
import type {
  LearningPathShareUpdateAction,
  LearningPathShareUpdateContextDto,
} from '../../../../types/chat'
import { clearUserLearningPathsCache } from '../../../../services/LearningPathService'
import { clearCachedShareUpdateContext } from '../../../../components/Notifications/shareUpdateContextCache'
import useAuthStore from '../../../../store/useAuthStore'
import useAppNotificationStore from '../../../../store/useAppNotificationStore'
import { useTranslation } from 'react-i18next'
import { shouldShowShareUpdateBadge } from '../shareVersionBadge'

type ToastState = { message: string; type: 'success' | 'error' | 'warning' | 'info' }

const MAX_VISIBLE_ITEMS = 5

const STATUS_COLORS: Record<'added' | 'removed' | 'updated', string> = {
  added: 'var(--success-primary)',
  removed: 'var(--danger-primary)',
  updated: 'var(--accent-primary)',
}

const ShareUpdatesPage: React.FC = () => {
  const { shareId = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { t } = useTranslation('student')
  const refreshNotificationPanel = useAppNotificationStore((state) => state.refreshPanel)
  const fetchNotificationUnreadCount = useAppNotificationStore((state) => state.fetchUnreadCount)
  const [loading, setLoading] = useState(true)
  const [context, setContext] = useState<LearningPathShareUpdateContextDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [actionLoading, setActionLoading] = useState<LearningPathShareUpdateAction | null>(null)
  const [showDisableNotificationsConfirm, setShowDisableNotificationsConfirm] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

  const sidebarConfig = {
    navItems: useStudentSidebarConfig(),
    actions: [],
    brand: { name: t('shareUpdates.brandName', { defaultValue: 'Share Updates' }), subtitle: t('chat.title') },
  }

  const errorCode = (err: any) => String(err?.response?.data?.errorCode || err?.response?.data?.code || '').trim()

  const loadContext = async () => {
    if (!shareId) {
      setError(t('shareUpdates.errors.invalidShareId', { defaultValue: 'Invalid share ID.' }))
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await getUpdateContext(shareId)
      setContext(response)
    } catch (err: any) {
      const status = err?.response?.status
      const code = errorCode(err)

      if (status === 403 || code === 'ACCESS_DENIED') {
        setToast({ message: t('shareUpdates.errors.accessDenied', { defaultValue: 'You are not allowed to access this share.' }), type: 'error' })
        navigate(ROUTER.MY_PLANS)
        return
      }

      if (code === 'INVALID_SHARE_STATE') {
        setError(t('shareUpdates.errors.invalidShareState', { defaultValue: 'This share is no longer in a valid state. Please refresh your learning paths.' }))
      } else if (code === 'SHARE_NOT_FOUND' || status === 404) {
        setError(t('shareUpdates.errors.shareNotFound', { defaultValue: 'Share not found.' }))
      } else {
        setError(err?.response?.data?.message || err?.message || t('shareUpdates.errors.loadFailed', { defaultValue: 'Failed to load update context.' }))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadContext()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareId])

  const handleApplyUpdate = async (action: LearningPathShareUpdateAction) => {
    if (!context) return

    setActionLoading(action)
    try {
      await applyUpdate(context.shareId, action)
      clearCachedShareUpdateContext(context.shareId)
      clearUserLearningPathsCache(user?.id)
      const notificationState = useAppNotificationStore.getState()
      await Promise.allSettled([
        refreshNotificationPanel(),
        fetchNotificationUnreadCount(),
        notificationState.bootstrapped
          ? notificationState.fetchPage({
              pageNumber: notificationState.pageNumber,
              pageSize: notificationState.pageSize,
              unreadOnly: notificationState.unreadOnly,
            })
          : Promise.resolve(),
      ])

      const successMessage =
        action === 'CreateNewFromLatest'
          ? t('shareUpdates.actions.createNewSuccess', { defaultValue: 'Created a new learning path from the latest shared version.' })
          : action === 'UpdateCurrentToLatest'
            ? t('shareUpdates.actions.updateCurrentSuccess', { defaultValue: 'Updated your current learning path to the latest shared version.' })
            : t('shareUpdates.actions.disableNotificationsSuccess', { defaultValue: 'Kept your current learning path and turned off future update notifications for this share.' })

      setToast({ message: successMessage, type: 'success' })
      setShowDisableNotificationsConfirm(false)
      navigate(ROUTER.MY_PLANS)
    } catch (err: any) {
      const status = err?.response?.status
      const code = errorCode(err)

      if (status === 403 || code === 'ACCESS_DENIED') {
        setToast({ message: t('shareUpdates.errors.accessDenied', { defaultValue: 'You are not allowed to access this share.' }), type: 'error' })
        navigate(ROUTER.MY_PLANS)
        return
      }

      if (code === 'NO_NEW_VERSION_AVAILABLE') {
        setToast({ message: t('shareUpdates.errors.noNewVersion', { defaultValue: 'No new version is available anymore. Your list will be refreshed.' }), type: 'warning' })
        navigate(ROUTER.MY_PLANS)
        return
      }

      if (code === 'INVALID_SHARE_STATE') {
        setToast({ message: t('shareUpdates.errors.invalidShareState', { defaultValue: 'This share is no longer in a valid state. Please refresh your learning paths.' }), type: 'warning' })
        navigate(ROUTER.MY_PLANS)
        return
      }

      if (code === 'LEARNING_PATH_NOT_FOUND' || code === 'SOURCE_LEARNING_PATH_NOT_FOUND' || status === 404) {
        setToast({ message: t('shareUpdates.errors.pathNotFound', { defaultValue: 'Learning path data has changed on the server. Please sync again.' }), type: 'warning' })
        navigate(ROUTER.MY_PLANS)
        return
      }

      setToast({
        message: err?.response?.data?.message || err?.message || t('shareUpdates.errors.applyFailed', { defaultValue: 'Could not apply update action.' }),
        type: 'error',
      })
    } finally {
      setActionLoading(null)
    }
  }

  const summaryCards = useMemo(() => {
    if (!context?.changeSummary) return []
    const summary = context.changeSummary
    return [
      { key: 'addedChapterCount', label: t('shareUpdates.counts.addedChapters', { defaultValue: 'Added chapters' }), value: summary.addedChapterCount, tone: 'added' as const },
      { key: 'removedChapterCount', label: t('shareUpdates.counts.removedChapters', { defaultValue: 'Removed chapters' }), value: summary.removedChapterCount, tone: 'removed' as const },
      { key: 'updatedChapterCount', label: t('shareUpdates.counts.updatedChapters', { defaultValue: 'Updated chapters' }), value: summary.updatedChapterCount, tone: 'updated' as const },
      { key: 'addedLessonCount', label: t('shareUpdates.counts.addedLessons', { defaultValue: 'Added lessons' }), value: summary.addedLessonCount, tone: 'added' as const },
      { key: 'removedLessonCount', label: t('shareUpdates.counts.removedLessons', { defaultValue: 'Removed lessons' }), value: summary.removedLessonCount, tone: 'removed' as const },
      { key: 'updatedLessonCount', label: t('shareUpdates.counts.updatedLessons', { defaultValue: 'Updated lessons' }), value: summary.updatedLessonCount, tone: 'updated' as const },
    ]
  }, [context?.changeSummary, t])

  const detailGroups = useMemo(() => {
    const summary = context?.changeSummary
    if (!summary) return []

    return [
      { key: 'addedChapters', label: t('shareUpdates.groups.addedChapters', { defaultValue: 'Added chapters' }), items: summary.addedChapters, tone: 'added' as const },
      { key: 'removedChapters', label: t('shareUpdates.groups.removedChapters', { defaultValue: 'Removed chapters' }), items: summary.removedChapters, tone: 'removed' as const },
      { key: 'updatedChapters', label: t('shareUpdates.groups.updatedChapters', { defaultValue: 'Updated chapters' }), items: summary.updatedChapters, tone: 'updated' as const },
      { key: 'addedLessons', label: t('shareUpdates.groups.addedLessons', { defaultValue: 'Added lessons' }), items: summary.addedLessons, tone: 'added' as const },
      { key: 'removedLessons', label: t('shareUpdates.groups.removedLessons', { defaultValue: 'Removed lessons' }), items: summary.removedLessons, tone: 'removed' as const },
      { key: 'updatedLessons', label: t('shareUpdates.groups.updatedLessons', { defaultValue: 'Updated lessons' }), items: summary.updatedLessons, tone: 'updated' as const },
    ]
  }, [context?.changeSummary, t])

  if (loading) {
    return (
      <Layout sidebar={sidebarConfig}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: 'var(--text-secondary)' }}>
          {t('shareUpdates.loading', { defaultValue: 'Loading latest version changes...' })}
        </div>
      </Layout>
    )
  }

  if (!context || error) {
    return (
      <Layout sidebar={sidebarConfig}>
        <div style={{ padding: 24, minHeight: '100vh', background: 'var(--bg-main)' }}>
          <button
            type="button"
            onClick={() => navigate(ROUTER.MY_PLANS)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: 16 }}
          >
            <ArrowLeft size={14} />
            {t('shareUpdates.backToPlans', { defaultValue: 'Back to My Plans' })}
          </button>

          <div style={{ border: '1px solid var(--danger-primary)', borderRadius: 8, padding: 16, background: 'var(--bg-surface)' }}>
            <h2 style={{ margin: '0 0 8px', color: 'var(--text-primary)', fontSize: 18 }}>{t('shareUpdates.errorTitle', { defaultValue: 'Cannot open update review' })}</h2>
            <p style={{ margin: 0, color: 'var(--danger-primary)', fontSize: 13 }}>{error || t('shareUpdates.errors.loadFailed', { defaultValue: 'Failed to load update context.' })}</p>
            <button
              type="button"
              onClick={() => { void loadContext() }}
              style={{ marginTop: 12, border: '1px solid var(--border-base)', background: 'var(--bg-main)', color: 'var(--text-primary)', borderRadius: 4, padding: '8px 12px', cursor: 'pointer' }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <RefreshCw size={14} />
                {t('shareUpdates.retry', { defaultValue: 'Retry' })}
              </span>
            </button>
          </div>

          {toast && <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 120 }}><Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} /></div>}
        </div>
      </Layout>
    )
  }

  const hasSummary = !!context.changeSummary
  const hasNewVersion = shouldShowShareUpdateBadge(context)

  return (
    <Layout sidebar={sidebarConfig}>
      <div style={{ padding: 24, minHeight: '100vh', background: 'var(--bg-main)' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <button
            type="button"
            onClick={() => navigate(ROUTER.MY_PLANS)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: 16 }}
          >
            <ArrowLeft size={14} />
            {t('shareUpdates.backToPlans', { defaultValue: 'Back to My Plans' })}
          </button>

          <section style={{ border: '1px solid var(--border-base)', borderRadius: 12, background: 'var(--bg-surface)', padding: 18, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <h1 style={{ margin: '0 0 6px', color: 'var(--text-primary)', fontSize: 24, fontWeight: 800 }}>
                  {t('shareUpdates.title', { defaultValue: 'Learning path version update' })}
                </h1>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13 }}>
                  {t('shareUpdates.subtitle', { defaultValue: 'Review changes from your mentor and choose how to sync your learning path.' })}
                </p>
              </div>
              <div style={{ minWidth: 240, border: '1px dashed var(--border-base)', borderRadius: 8, padding: 10, background: 'var(--bg-main)' }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>{t('shareUpdates.sharedBy', { defaultValue: 'Shared by' })}: <strong style={{ color: 'var(--text-primary)' }}>{context.mentorUserName}</strong></div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('shareUpdates.sourceTitle', { defaultValue: 'Source learning path' })}: <strong style={{ color: 'var(--text-primary)' }}>{context.sourceLearningPathTitle}</strong></div>
              </div>
            </div>

            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--text-primary)', border: '1px solid var(--border-base)', borderRadius: 999, padding: '5px 10px', background: 'var(--bg-main)' }}>
                {t('shareUpdates.currentVersion', { defaultValue: 'Current version' })}: v{context.currentSourceVersion}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-primary)', border: '1px solid var(--border-base)', borderRadius: 999, padding: '5px 10px', background: 'var(--bg-main)' }}>
                {t('shareUpdates.latestVersion', { defaultValue: 'Latest version' })}: v{context.latestSourceVersion}
              </span>
              {hasNewVersion && (
                <span style={{ fontSize: 12, color: '#854d0e', border: '1px solid rgba(245, 158, 11, 0.35)', borderRadius: 999, padding: '5px 10px', background: 'rgba(245, 158, 11, 0.1)' }}>
                  {t('shareUpdates.newVersionBadge', { defaultValue: 'New version available' })}
                </span>
              )}
            </div>
          </section>

          <section style={{ border: '1px solid var(--border-base)', borderRadius: 12, background: 'var(--bg-surface)', padding: 18, marginBottom: 16 }}>
            <h2 style={{ margin: '0 0 10px', color: 'var(--text-primary)', fontSize: 18 }}>{t('shareUpdates.changeSummaryTitle', { defaultValue: 'Change summary' })}</h2>
            <p style={{ margin: '0 0 12px', color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.5 }}>
              {t('shareUpdates.updatedLessonsRule', {
                defaultValue: 'Updated lessons in this summary only reflect lesson title changes. Content/progress changes are not included.',
              })}
            </p>
            {!hasSummary ? (
              <div style={{ border: '1px dashed var(--border-base)', borderRadius: 8, padding: 12, color: 'var(--text-secondary)', fontSize: 13 }}>
                {t('shareUpdates.noDetailedComparison', { defaultValue: 'No detailed comparison data available.' })}
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 14 }}>
                  {summaryCards.map((card) => (
                    <div key={card.key} style={{ border: '1px solid var(--border-base)', borderRadius: 8, padding: 10, background: 'var(--bg-main)' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{card.label}</div>
                      <div style={{ marginTop: 4, fontSize: 22, fontWeight: 800, color: STATUS_COLORS[card.tone] }}>{card.value}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 10 }}>
                  {detailGroups.map((group) => {
                    const expanded = !!expandedSections[group.key]
                    const visibleItems = expanded ? group.items : group.items.slice(0, MAX_VISIBLE_ITEMS)
                    const hasMore = group.items.length > MAX_VISIBLE_ITEMS

                    return (
                      <div key={group.key} style={{ border: '1px solid var(--border-base)', borderRadius: 8, padding: 12, background: 'var(--bg-main)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: STATUS_COLORS[group.tone] }}>{group.label}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{group.items.length}</div>
                        </div>
                        {group.items.length === 0 ? (
                          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                            {t('shareUpdates.none', { defaultValue: 'None' })}
                          </div>
                        ) : (
                          <>
                            <ul style={{ margin: '8px 0 0', paddingLeft: 18, color: 'var(--text-primary)', fontSize: 12, lineHeight: 1.6 }}>
                              {visibleItems.map((item, idx) => (
                                <li key={`${group.key}-${idx}`}>{item}</li>
                              ))}
                            </ul>
                            {hasMore && (
                              <button
                                type="button"
                                onClick={() => setExpandedSections((prev) => ({ ...prev, [group.key]: !expanded }))}
                                style={{ marginTop: 8, border: 'none', background: 'transparent', color: 'var(--accent-primary)', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}
                              >
                                {expanded
                                  ? t('shareUpdates.showLess', { defaultValue: 'Show less' })
                                  : t('shareUpdates.showMore', { count: group.items.length - MAX_VISIBLE_ITEMS, defaultValue: 'Show {{count}} more' })}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </section>

          <section style={{ border: '1px solid var(--border-base)', borderRadius: 12, background: 'var(--bg-surface)', padding: 18 }}>
            <h2 style={{ margin: '0 0 10px', color: 'var(--text-primary)', fontSize: 18 }}>{t('shareUpdates.actionsTitle', { defaultValue: 'Choose update action' })}</h2>
            <p style={{ margin: '0 0 14px', color: 'var(--text-secondary)', fontSize: 13 }}>
              {t('shareUpdates.actionsHint', { defaultValue: 'Pick one action below. Your learning path list will refresh right after completion.' })}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
              <button
                type="button"
                disabled={!!actionLoading}
                onClick={() => { void handleApplyUpdate('CreateNewFromLatest') }}
                style={{ border: 'none', borderRadius: 8, padding: '12px 14px', background: 'var(--success-primary)', color: '#fff', fontWeight: 700, cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.65 : 1 }}
              >
                {actionLoading === 'CreateNewFromLatest'
                  ? t('shareUpdates.actions.creating', { defaultValue: 'Creating...' })
                  : t('shareUpdates.actions.createNew', { defaultValue: 'Create New From Latest' })}
              </button>

              <button
                type="button"
                disabled={!!actionLoading}
                onClick={() => { void handleApplyUpdate('UpdateCurrentToLatest') }}
                style={{ border: '1px solid var(--accent-primary)', borderRadius: 8, padding: '12px 14px', background: 'var(--bg-main)', color: 'var(--accent-primary)', fontWeight: 700, cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.65 : 1 }}
              >
                {actionLoading === 'UpdateCurrentToLatest'
                  ? t('shareUpdates.actions.updating', { defaultValue: 'Updating...' })
                  : t('shareUpdates.actions.updateCurrent', { defaultValue: 'Update Current To Latest' })}
              </button>

              <button
                type="button"
                disabled={!!actionLoading}
                onClick={() => setShowDisableNotificationsConfirm(true)}
                style={{ border: '1px solid var(--border-base)', borderRadius: 8, padding: '12px 14px', background: 'var(--bg-main)', color: 'var(--text-primary)', fontWeight: 700, cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.65 : 1 }}
              >
                {actionLoading === 'DisableUpdateNotifications'
                  ? t('shareUpdates.actions.saving', { defaultValue: 'Saving...' })
                  : t('shareUpdates.actions.disableNotifications', { defaultValue: 'Turn off update notifications for this learning path' })}
              </button>
            </div>
          </section>
        </div>

        <ConfirmDialog
          isOpen={showDisableNotificationsConfirm}
          variant="warning"
          title={t('shareUpdates.actions.disableNotificationsConfirmTitle', { defaultValue: 'Turn off update notifications?' })}
          message={t('shareUpdates.actions.disableNotificationsDescription', { defaultValue: 'You will keep your current learning path, but you will stop receiving notifications for newer versions of this share.' })}
          confirmText={t('shareUpdates.actions.disableNotificationsConfirm', { defaultValue: 'Turn off notifications' })}
          cancelText={t('shareUpdates.actions.cancel', { defaultValue: 'Cancel' })}
          onCancel={() => setShowDisableNotificationsConfirm(false)}
          onConfirm={() => { void handleApplyUpdate('DisableUpdateNotifications') }}
        />

        {toast && <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 120 }}><Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} /></div>}
      </div>
    </Layout>
  )
}

export default ShareUpdatesPage
