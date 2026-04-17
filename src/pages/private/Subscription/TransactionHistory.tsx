import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, CheckCircle2, Clock3, Loader2, RefreshCw, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import Layout from '../../../components/Layout'
import ROUTER from '../../../router/ROUTER'
import { useStudentSidebarConfig } from '../Student/components/StudentSideBar'
import SubscriptionService, {
  type PaymentTransactionDetail,
  type PaymentTransactionItem,
  type MyTransactionsQuery,
} from '../../../services/SubscriptionService'

const TransactionHistory: React.FC = () => {
  const { t } = useTranslation('student')
  const navigate = useNavigate()
  const navItems = useStudentSidebarConfig()
  const sidebarConfig = useMemo(() => ({
    navItems,
    actions: [],
    brand: { name: 'Token', subtitle: 'Student' },
  }), [navItems])

  const [items, setItems] = useState<PaymentTransactionItem[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(10)
  const [filterFromDate, setFilterFromDate] = useState<string>('')
  const [filterToDate, setFilterToDate] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [appliedFilters, setAppliedFilters] = useState<{ fromDate: string; toDate: string; status: string }>({
    fromDate: '',
    toDate: '',
    status: '',
  })
  const [loading, setLoading] = useState<boolean>(true)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [selectedItem, setSelectedItem] = useState<PaymentTransactionDetail | null>(null)
  const [loadingDetailId, setLoadingDetailId] = useState<string>('')

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN').format(Math.max(0, Math.round(amount)))
  }

  const parseApiDate = (value: string, assumeUtcWhenNoTimezone: boolean): Date | null => {
    const raw = String(value || '').trim()
    if (!raw) return null

    const hasTimezoneInfo = /([zZ]|[+-]\d{2}:?\d{2})$/.test(raw)
    const hasFullDateTime = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/.test(raw)

    const normalizedBase = raw.replace(' ', 'T')
    const normalized = hasTimezoneInfo
      ? normalizedBase
      : (assumeUtcWhenNoTimezone && hasFullDateTime)
        ? `${normalizedBase}Z`
        : normalizedBase

    const parsed = new Date(normalized)
    if (Number.isNaN(parsed.getTime())) return null
    return parsed
  }

  const formatDateTimeUtcToPlus7 = (value: string | undefined): string => {
    if (!value) return '--'
    const parsed = parseApiDate(value, true)
    if (!parsed) return '--'

    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(parsed)
  }

  const formatDateTimeKeepOriginal = (value: string | undefined): string => {
    if (!value) return '--'
    const parsed = parseApiDate(value, false)
    if (!parsed) return '--'

    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(parsed)
  }

  const getStatusKey = (statusRaw: string | undefined): string => {
    const status = String(statusRaw || '').trim().toLowerCase()
    if (status === 'success' || status === 'paid' || status === 'completed' || status === 'succeeded') return 'success'
    if (status === 'canceled' || status === 'cancelled') return 'canceled'
    if (status === 'failed' || status === 'error') return 'failed'
    return 'pending'
  }

  const toUtcIsoFromDate = (value: string, endOfDay: boolean): string => {
    if (!value) return ''
    const suffix = endOfDay ? 'T23:59:59.999Z' : 'T00:00:00.000Z'
    return `${value}${suffix}`
  }

  const loadTransactions = async () => {
    try {
      setErrorMessage('')
      setLoading(true)
      const query: MyTransactionsQuery = {
        PageNumber: pageNumber,
        PageSize: pageSize,
      }

      if (appliedFilters.fromDate) {
        query.FromUtc = toUtcIsoFromDate(appliedFilters.fromDate, false)
      }
      if (appliedFilters.toDate) {
        query.ToUtc = toUtcIsoFromDate(appliedFilters.toDate, true)
      }
      if (appliedFilters.status) {
        query.Status = appliedFilters.status as MyTransactionsQuery['Status']
      }

      const data = await SubscriptionService.getMyTransactions(query)
      const sorted = [...data.items].sort((left, right) => {
        const leftAt = Date.parse(String(left.paidAt || left.createdAt || ''))
        const rightAt = Date.parse(String(right.paidAt || right.createdAt || ''))
        return (Number.isFinite(rightAt) ? rightAt : 0) - (Number.isFinite(leftAt) ? leftAt : 0)
      })
      setItems(sorted)
      setTotalCount(Math.max(0, Number(data.totalCount || sorted.length)))

      if (data.pageNumber > 0 && data.pageNumber !== pageNumber) {
        setPageNumber(data.pageNumber)
      }
      if (data.pageSize > 0 && data.pageSize !== pageSize) {
        setPageSize(data.pageSize)
      }
    } catch (error: any) {
      setItems([])
      setTotalCount(0)
      setErrorMessage(String(error?.response?.data?.message || error?.message || t('subscription.historyLoadFailed')))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadTransactions()
  }, [pageNumber, pageSize, appliedFilters])

  const totalPages = Math.max(1, Math.ceil((totalCount || items.length || 0) / pageSize))

  const refresh = () => {
    void loadTransactions()
  }

  const applyFilter = () => {
    setPageNumber(1)
    setAppliedFilters({
      fromDate: filterFromDate,
      toDate: filterToDate,
      status: filterStatus,
    })
  }

  const clearFilter = () => {
    setFilterFromDate('')
    setFilterToDate('')
    setFilterStatus('')
    setPageNumber(1)
    setAppliedFilters({ fromDate: '', toDate: '', status: '' })
  }

  const goToPage = (nextPage: number) => {
    const normalized = Math.max(1, Math.min(totalPages, nextPage))
    setPageNumber(normalized)
  }

  const openTransactionDetail = async (item: PaymentTransactionItem) => {
    const id = String(item.paymentTransactionId || '').trim()
    if (!id || loadingDetailId) return

    try {
      setLoadingDetailId(id)
      const detail = await SubscriptionService.getMyTransactionById(id)
      setSelectedItem(detail)
    } catch {
      setSelectedItem({
        ...item,
        updatedAt: undefined,
      })
    } finally {
      setLoadingDetailId('')
    }
  }

  const statusLabel = (statusRaw: string): string => {
    const status = getStatusKey(statusRaw)
    if (status === 'success') return t('subscription.historyStatusSuccess')
    if (status === 'canceled') return t('subscription.historyStatusCanceled')
    if (status === 'failed') return t('subscription.historyStatusFailed')
    return t('subscription.historyStatusPending')
  }

  const statusTone = (statusRaw: string) => {
    const status = getStatusKey(statusRaw)
    if (status === 'success') {
      return {
        color: 'var(--success-primary)',
        bg: 'color-mix(in oklab, var(--success-primary) 12%, var(--bg-main))',
        icon: <CheckCircle2 size={14} />,
      }
    }

    if (status === 'canceled' || status === 'failed') {
      return {
        color: 'var(--danger-primary)',
        bg: 'color-mix(in oklab, var(--danger-primary) 12%, var(--bg-main))',
        icon: <XCircle size={14} />,
      }
    }

    return {
      color: 'var(--accent-primary)',
      bg: 'color-mix(in oklab, var(--accent-primary) 10%, var(--bg-main))',
      icon: <Clock3 size={14} />,
    }
  }

  return (
    <Layout sidebar={sidebarConfig}>
      <div style={{ padding: 20, background: 'var(--bg-main)', minHeight: '100vh' }}>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            border: '1px solid var(--border-base)',
            borderRadius: 10,
            padding: 16,
            marginBottom: 16,
            background: 'var(--bg-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h1 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 24, fontWeight: 800 }}>
              {t('subscription.transactionHistoryTitle')}
            </h1>
            <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
              {t('subscription.historyPageSubtitle')}
            </div>
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              style={{
                borderRadius: 8,
                border: '1px solid var(--border-base)',
                background: 'var(--bg-main)',
                color: 'var(--text-primary)',
                padding: '8px 12px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.85 : 1,
              }}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {t('subscription.retrySync')}
            </button>

            <button
              type="button"
              onClick={() => navigate(ROUTER.SUBSCRIPTION)}
              style={{
                borderRadius: 8,
                border: '1px solid var(--accent-primary)',
                background: 'var(--accent-primary)',
                color: 'var(--bg-surface)',
                padding: '8px 12px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={14} />
              {t('subscription.backToSubscription')}
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          style={{
            border: '1px solid var(--border-base)',
            borderRadius: 10,
            background: 'var(--bg-surface)',
            overflow: 'hidden',
            marginBottom: 14,
          }}
        >
          <div
            style={{
              padding: 12,
              borderBottom: '1px solid var(--border-base)',
              display: 'grid',
              gap: 10,
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              background: 'var(--bg-main)',
            }}
          >
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 4 }}>{t('subscription.historyFilterFrom')}</div>
              <input
                type="date"
                value={filterFromDate}
                onChange={(event) => setFilterFromDate(event.target.value)}
                style={{
                  width: '100%',
                  border: '1px solid var(--border-base)',
                  borderRadius: 8,
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  padding: '8px 10px',
                  fontSize: 13,
                }}
              />
            </div>

            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 4 }}>{t('subscription.historyFilterTo')}</div>
              <input
                type="date"
                value={filterToDate}
                onChange={(event) => setFilterToDate(event.target.value)}
                style={{
                  width: '100%',
                  border: '1px solid var(--border-base)',
                  borderRadius: 8,
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  padding: '8px 10px',
                  fontSize: 13,
                }}
              />
            </div>

            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 4 }}>{t('subscription.historyFilterStatus')}</div>
              <select
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value)}
                style={{
                  width: '100%',
                  border: '1px solid var(--border-base)',
                  borderRadius: 8,
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  padding: '8px 10px',
                  fontSize: 13,
                }}
              >
                <option value="">{t('subscription.historyFilterStatusAll')}</option>
                <option value="pending">{t('subscription.historyStatusPending')}</option>
                <option value="success">{t('subscription.historyStatusSuccess')}</option>
                <option value="failed">{t('subscription.historyStatusFailed')}</option>
                <option value="canceled">{t('subscription.historyStatusCanceled')}</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'end', gap: 8 }}>
              <button
                type="button"
                onClick={applyFilter}
                style={{
                  borderRadius: 8,
                  border: '1px solid var(--accent-primary)',
                  background: 'var(--accent-primary)',
                  color: 'var(--bg-surface)',
                  padding: '8px 12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {t('subscription.historyApplyFilter')}
              </button>
              <button
                type="button"
                onClick={clearFilter}
                style={{
                  borderRadius: 8,
                  border: '1px solid var(--border-base)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  padding: '8px 12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {t('subscription.historyClearFilter')}
              </button>
            </div>

          </div>

          {loading ? (
            <div
              style={{
                minHeight: 220,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                gap: 8,
              }}
            >
              <Loader2 size={16} className="animate-spin" />
              {t('subscription.historyLoading')}
            </div>
          ) : errorMessage ? (
            <div
              style={{
                minHeight: 220,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--danger-primary)',
                padding: 20,
                textAlign: 'center',
                fontWeight: 600,
              }}
            >
              {errorMessage}
            </div>
          ) : items.length === 0 ? (
            <div
              style={{
                minHeight: 220,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                padding: 20,
                textAlign: 'center',
              }}
            >
              {t('subscription.historyEmpty')}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-main)' }}>
                    <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)' }}>{t('subscription.historyTokenPackageName')}</th>
                    <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)' }}>{t('subscription.historyAmount')}</th>
                    <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)' }}>{t('subscription.historyCreditedAmountVnd')}</th>
                    <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)' }}>{t('subscription.historyStatus')}</th>
                    <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)' }}>{t('subscription.historyBankCode')}</th>
                    <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)' }}>{t('subscription.historyPaidAt')}</th>
                    <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)' }}>{t('subscription.historyAction')}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const tone = statusTone(String(item.status || ''))
                    const isLoadingDetail = loadingDetailId === item.paymentTransactionId
                    return (
                      <tr
                        key={item.paymentTransactionId || item.txnRef || item.createdAt || Math.random()}
                        style={{ borderTop: '1px solid var(--border-base)' }}
                      >
                        <td style={{ padding: '12px', color: 'var(--text-primary)', fontWeight: 700 }}>
                          {item.tokenPackageName || '--'}
                        </td>
                        <td style={{ padding: '12px', color: 'var(--text-primary)' }}>
                          {formatCurrency(item.amount)} VND
                        </td>
                        <td style={{ padding: '12px', color: 'var(--text-primary)' }}>
                          {formatCurrency(item.creditedTokens)} token
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              borderRadius: 999,
                              padding: '4px 10px',
                              color: tone.color,
                              background: tone.bg,
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {tone.icon}
                            {statusLabel(String(item.status || ''))}
                          </span>
                        </td>
                        <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                          {item.bankCode || '--'}
                        </td>
                        <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                          {formatDateTimeKeepOriginal(item.paidAt)}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <button
                            type="button"
                            onClick={() => void openTransactionDetail(item)}
                            disabled={isLoadingDetail}
                            style={{
                              borderRadius: 8,
                              border: '1px solid var(--border-base)',
                              background: 'var(--bg-main)',
                              color: 'var(--text-primary)',
                              padding: '7px 10px',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: isLoadingDetail ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {t('subscription.historyViewDetailBtn')}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        <div
          style={{
            border: '1px solid var(--border-base)',
            borderRadius: 10,
            background: 'var(--bg-surface)',
            padding: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            {t('subscription.historyPagingSummary', {
              pageNumber,
              totalPages,
              totalCount,
            })}
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => goToPage(pageNumber - 1)}
              disabled={pageNumber <= 1 || loading}
              style={{
                borderRadius: 8,
                border: '1px solid var(--border-base)',
                background: 'var(--bg-main)',
                color: 'var(--text-primary)',
                padding: '8px 10px',
                fontWeight: 700,
                cursor: pageNumber <= 1 || loading ? 'not-allowed' : 'pointer',
                opacity: pageNumber <= 1 || loading ? 0.7 : 1,
              }}
            >
              {t('subscription.historyPrevPage')}
            </button>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{t('subscription.historyPageNumber')}</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={pageNumber}
                onChange={(event) => {
                  const value = Number(event.target.value)
                  if (!Number.isFinite(value)) return
                  goToPage(value)
                }}
                style={{
                  width: 70,
                  border: '1px solid var(--border-base)',
                  borderRadius: 8,
                  background: 'var(--bg-main)',
                  color: 'var(--text-primary)',
                  padding: '7px 8px',
                  fontSize: 13,
                }}
              />
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{t('subscription.historyPageSize')}</span>
              <select
                value={String(pageSize)}
                onChange={(event) => {
                  setPageNumber(1)
                  setPageSize(Number(event.target.value))
                }}
                style={{
                  width: 86,
                  border: '1px solid var(--border-base)',
                  borderRadius: 8,
                  background: 'var(--bg-main)',
                  color: 'var(--text-primary)',
                  padding: '7px 8px',
                  fontSize: 13,
                }}
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => goToPage(pageNumber + 1)}
              disabled={pageNumber >= totalPages || loading}
              style={{
                borderRadius: 8,
                border: '1px solid var(--border-base)',
                background: 'var(--bg-main)',
                color: 'var(--text-primary)',
                padding: '8px 10px',
                fontWeight: 700,
                cursor: pageNumber >= totalPages || loading ? 'not-allowed' : 'pointer',
                opacity: pageNumber >= totalPages || loading ? 0.7 : 1,
              }}
            >
              {t('subscription.historyNextPage')}
            </button>
          </div>
        </div>

        {selectedItem && (
          <div
            role="button"
            tabIndex={0}
            onClick={() => setSelectedItem(null)}
            onKeyDown={(event) => {
              if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
                setSelectedItem(null)
              }
            }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.35)',
              zIndex: 60,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
          >
            <div
              onClick={(event) => event.stopPropagation()}
              style={{
                width: 'min(620px, 100%)',
                borderRadius: 12,
                border: '1px solid var(--border-base)',
                background: 'var(--bg-surface)',
                padding: 18,
              }}
            >
              <h2 style={{ margin: '0 0 12px', color: 'var(--text-primary)', fontSize: 20, fontWeight: 800 }}>
                {t('subscription.historyDetailTitle')}
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{t('subscription.historyTokenPackageName')}: <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{selectedItem.tokenPackageName || '--'}</span></div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{t('subscription.historyAmount')}: <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{formatCurrency(selectedItem.amount)} VND</span></div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{t('subscription.historyCreditedAmountVnd')}: <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{formatCurrency(selectedItem.creditedTokens)} token</span></div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{t('subscription.historyStatus')}: <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{statusLabel(String(selectedItem.status || ''))}</span></div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{t('subscription.historyBankCode')}: <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{selectedItem.bankCode || '--'}</span></div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{t('subscription.historyPaidAt')}: <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{formatDateTimeKeepOriginal(selectedItem.paidAt || selectedItem.createdAt)}</span></div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{t('subscription.historyUpdatedAt')}: <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{formatDateTimeUtcToPlus7(selectedItem.updatedAt)}</span></div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{t('subscription.historyTxnRef')}: <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{selectedItem.txnRef || '--'}</span></div>
              </div>
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  style={{
                    borderRadius: 8,
                    border: '1px solid var(--border-base)',
                    background: 'var(--bg-main)',
                    color: 'var(--text-primary)',
                    padding: '8px 12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {t('subscription.closeDetail')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default TransactionHistory
