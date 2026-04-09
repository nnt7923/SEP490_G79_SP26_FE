import React from 'react'
import { RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from '../../../components/Layout'
import NotificationList from '../../../components/Notifications/NotificationList'
import { navigateAndMarkNotificationRead } from '../../../components/Notifications/utils'
import useAppNotificationStore from '../../../store/useAppNotificationStore'
import useNotificationStore from '../../../store/useNotificationStore'

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation('common')
  const {
    items,
    loading,
    error,
    unreadOnly,
    pageNumber,
    hasNextPage,
    hasPreviousPage,
    fetchPage,
    setUnreadOnly,
    markAsRead,
  } = useAppNotificationStore()
  const showToast = useNotificationStore((state) => state.showToast)

  React.useEffect(() => {
    void fetchPage({
      pageNumber: useAppNotificationStore.getState().pageNumber,
      unreadOnly: useAppNotificationStore.getState().unreadOnly,
    })
  }, [fetchPage])

  const handleToggleUnreadOnly = async (nextValue: boolean) => {
    setUnreadOnly(nextValue)
    try {
      await fetchPage({ pageNumber: 1, unreadOnly: nextValue })
    } catch (err: any) {
      showToast(err?.message || t('notifications.fetchError'), 'error')
    }
  }

  const handleRefresh = async () => {
    try {
      await fetchPage({ pageNumber, unreadOnly })
    } catch (err: any) {
      showToast(err?.message || t('notifications.fetchError'), 'error')
    }
  }

  const handlePageChange = async (nextPage: number) => {
    try {
      await fetchPage({ pageNumber: nextPage, unreadOnly })
    } catch (err: any) {
      showToast(err?.message || t('notifications.fetchError'), 'error')
    }
  }

  const handleItemClick = async (notification: any) => {
    try {
      await navigateAndMarkNotificationRead(notification, navigate, markAsRead)
    } catch (err: any) {
      showToast(err?.message || t('notifications.markReadError'), 'error')
    }
  }

  return (
    <Layout>
      <div style={{ minHeight: '100vh', background: 'var(--bg-main)', padding: 24 }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 16,
              marginBottom: 16,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <h1 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 28, fontWeight: 800 }}>
                {t('notifications.title')}
              </h1>
              <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>
                {t('notifications.subtitle')}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                }}
              >
                <input
                  type="checkbox"
                  checked={unreadOnly}
                  onChange={(event) => { void handleToggleUnreadOnly(event.target.checked) }}
                />
                {t('notifications.unreadOnly')}
              </label>

              <button
                type="button"
                onClick={() => { void handleRefresh() }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  border: '1px solid var(--border-base)',
                  borderRadius: 4,
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={14} />
                {t('notifications.refresh')}
              </button>
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-base)',
              borderRadius: 6,
              padding: 16,
            }}
          >
            <NotificationList
              items={items}
              loading={loading}
              error={error}
              emptyLabel={t('notifications.empty')}
              onItemClick={handleItemClick}
              onReadVisible={markAsRead}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 16 }}>
            <button
              type="button"
              onClick={() => { void handlePageChange(Math.max(1, pageNumber - 1)) }}
              disabled={!hasPreviousPage || loading}
              style={{
                padding: '8px 14px',
                border: '1px solid var(--border-base)',
                borderRadius: 4,
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                cursor: !hasPreviousPage || loading ? 'not-allowed' : 'pointer',
                opacity: !hasPreviousPage || loading ? 0.5 : 1,
              }}
            >
              {t('pagination.prev')}
            </button>

            <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              {t('notifications.pageLabel', { page: pageNumber })}
            </div>

            <button
              type="button"
              onClick={() => { void handlePageChange(pageNumber + 1) }}
              disabled={!hasNextPage || loading}
              style={{
                padding: '8px 14px',
                border: '1px solid var(--border-base)',
                borderRadius: 4,
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                cursor: !hasNextPage || loading ? 'not-allowed' : 'pointer',
                opacity: !hasNextPage || loading ? 0.5 : 1,
              }}
            >
              {t('pagination.next')}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default NotificationsPage
