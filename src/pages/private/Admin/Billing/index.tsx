import React, { useEffect, useMemo, useState } from 'react'
import Layout from '../../../../components/Layout'
import { useAdminSidebarConfig } from '../components/AdminSideBar'
import { UserService, AdminSubscriptionService } from '../../../../services'
import AdminBillingService, { PaymentStatus, type BillingTransaction } from '../../../../services/AdminBillingService'
import { RefreshCw, Search, ReceiptText, ChevronLeft, ChevronRight, FilterX, Eye, X } from 'lucide-react'
import { formatDateTimeVN } from '../../../../utils/dateUtils'
import { useTranslation } from 'react-i18next'

type StudentOption = {
  id: string
  label: string
}

type PlanOption = {
  id: string
  name: string
}

const PAGE_SIZE_OPTIONS = [20, 50, 100]

const AdminBillingPage: React.FC = () => {
  const { t } = useTranslation('admin')
  const navItems = useAdminSidebarConfig()

  const sidebarConfig = {
    navItems: navItems as any,
    actions: [],
    brand: { name: 'Admin', subtitle: 'Billing' },
  }

  const [rows, setRows] = useState<BillingTransaction[]>([])
  const [students, setStudents] = useState<StudentOption[]>([])
  const [plans, setPlans] = useState<PlanOption[]>([])

  const [loading, setLoading] = useState<boolean>(false)
  const [loadingFilters, setLoadingFilters] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  const [pageNumber, setPageNumber] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(20)
  const [totalCount, setTotalCount] = useState<number>(0)
  const [totalPages, setTotalPages] = useState<number>(1)

  const [fromUtc, setFromUtc] = useState<string>('')
  const [toUtc, setToUtc] = useState<string>('')
  const [status, setStatus] = useState<string>('')
  const [userId, setUserId] = useState<string>('')
  const [subscriptionPlanId, setSubscriptionPlanId] = useState<string>('')
  const [provider, setProvider] = useState<string>('VNPAY')
  const [search, setSearch] = useState<string>('')
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false)
  const [detailLoading, setDetailLoading] = useState<boolean>(false)
  const [selectedTransaction, setSelectedTransaction] = useState<BillingTransaction | null>(null)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value || 0)
  }

  const formatDateTimeRaw = (date: string | Date | null | undefined): string => {
    if (!date) return 'N/A'

    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date
      if (isNaN(dateObj.getTime())) {
        return 'Invalid date'
      }

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const month = months[dateObj.getMonth()]
      const day = dateObj.getDate()
      const year = dateObj.getFullYear()
      let hours = dateObj.getHours()
      const minutes = dateObj.getMinutes().toString().padStart(2, '0')
      const ampm = hours >= 12 ? 'PM' : 'AM'
      hours = hours % 12 || 12

      return `${month} ${day}, ${year}, ${hours}:${minutes} ${ampm}`
    } catch {
      return 'Invalid date'
    }
  }

  const getStatusLabel = (value: number) => {
    if (value === PaymentStatus.Pending) return t('billing.pending')
    if (value === PaymentStatus.Success) return t('billing.success')
    if (value === PaymentStatus.Failed) return t('billing.failed')
    if (value === PaymentStatus.Canceled) return t('billing.canceled')
    return String(value)
  }

  const getStatusClassName = (value: number) => {
    if (value === PaymentStatus.Success) return 'text-green-700 border-green-600 bg-green-50'
    if (value === PaymentStatus.Failed) return 'text-red-700 border-red-600 bg-red-50'
    if (value === PaymentStatus.Canceled) return 'text-gray-700 border-gray-600 bg-gray-50'
    return 'text-amber-700 border-amber-600 bg-amber-50'
  }

  const isStudent = (raw: any) => {
    const roleName = String(raw?.role?.name || raw?.roleName || '').toLowerCase()
    return roleName === 'student'
  }

  const getUserId = (raw: any) => String(raw?.id ?? raw?.userId ?? '')

  const getUserLabel = (raw: any) => {
    const username = String(raw?.username || '').trim()
    const fullName = String(raw?.name || `${raw?.firstName || ''} ${raw?.lastName || ''}` || '').trim()
    const email = String(raw?.email || '').trim()
    const primary = fullName || username || email || getUserId(raw)
    if (email) return `${primary} (${email})`
    return primary
  }

  const loadFilterSources = async () => {
    setLoadingFilters(true)
    try {
      const [usersData, plansData] = await Promise.all([
        UserService.listUsers(),
        AdminSubscriptionService.getPlans(),
      ])

      const studentOptions = (Array.isArray(usersData) ? usersData : [])
        .filter(isStudent)
        .map((item) => ({
          id: getUserId(item),
          label: getUserLabel(item),
        }))
        .filter((item) => item.id)
        .sort((a, b) => a.label.localeCompare(b.label))

      const planOptions = (Array.isArray(plansData) ? plansData : [])
        .map((item) => ({
          id: String(item.subscriptionPlanId || ''),
          name: String(item.name || item.planType || item.subscriptionPlanId || ''),
        }))
        .filter((item) => item.id)

      setStudents(studentOptions)
      setPlans(planOptions)
    } catch {
      setStudents([])
      setPlans([])
    } finally {
      setLoadingFilters(false)
    }
  }

  const fetchTransactions = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await AdminBillingService.getTransactions({
        pageNumber,
        pageSize,
        fromUtc: fromUtc ? new Date(fromUtc).toISOString() : undefined,
        toUtc: toUtc ? new Date(toUtc).toISOString() : undefined,
        status: status === '' ? undefined : Number(status) as PaymentStatus,
        userId: userId || undefined,
        subscriptionPlanId: subscriptionPlanId || undefined,
        provider: provider || undefined,
        search: search.trim() || undefined,
      })

      setRows(response.items)
      setTotalCount(response.totalCount)
      setTotalPages(response.totalPages || 1)
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || t('billing.failedToLoad')
      setError(message)
      setRows([])
      setTotalCount(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFilterSources()
  }, [])

  useEffect(() => {
    fetchTransactions()
  }, [pageNumber, pageSize, fromUtc, toUtc, status, userId, subscriptionPlanId, provider, search])

  const resetFilters = () => {
    setFromUtc('')
    setToUtc('')
    setStatus('')
    setUserId('')
    setSubscriptionPlanId('')
    setProvider('VNPAY')
    setSearch('')
    setPageNumber(1)
  }

  const handleOpenDetails = async (row: BillingTransaction) => {
    setIsDetailOpen(true)
    setDetailLoading(true)
    setSelectedTransaction(null)
    try {
      const detail = await AdminBillingService.getTransactionById(row.paymentTransactionId)
      setSelectedTransaction(detail)
    } catch {
      setSelectedTransaction(row)
    } finally {
      setDetailLoading(false)
    }
  }

  const statusOptions = useMemo(() => ([
    { value: '', label: t('billing.allStatuses') },
    { value: String(PaymentStatus.Pending), label: t('billing.pending') },
    { value: String(PaymentStatus.Success), label: t('billing.success') },
    { value: String(PaymentStatus.Failed), label: t('billing.failed') },
    { value: String(PaymentStatus.Canceled), label: t('billing.canceled') },
  ]), [t])

  const startIndex = rows.length === 0 ? 0 : (pageNumber - 1) * pageSize + 1
  const endIndex = Math.min(pageNumber * pageSize, totalCount)

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="px-4 py-8 bg-[var(--gray-100)] min-h-screen font-mono overflow-x-hidden">
        <div className="max-w-full mx-auto space-y-6">
          <div className="mb-6 border-b border-bd pb-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-heading border-none bg-transparent flex items-center gap-2">
                  <ReceiptText className="text-status-blue" size={28} />
                  {t('billing.title', { defaultValue: 'Billing Transactions' })}
                </h1>
                <p className="text-muted mt-2">
                  {t('billing.subtitle', { defaultValue: 'Manage and track all subscription payment transactions.' })}
                </p>
              </div>

              <button
                onClick={fetchTransactions}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 border border-blue-600 bg-th-card text-status-blue text-sm font-bold hover:bg-status-blue-bg transition-colors cursor-pointer rounded-sm disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {t('billing.reload', { defaultValue: 'Reload' })}
              </button>
            </div>
          </div>

          <div className="bg-th-card border border-bd-strong p-4 space-y-4">
            <h2 className="text-sm font-bold text-heading">{t('billing.filters')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-muted mb-2">{t('billing.fromUtc')}</label>
                <input
                  type="datetime-local"
                  value={fromUtc}
                  onChange={(event) => {
                    setFromUtc(event.target.value)
                    setPageNumber(1)
                  }}
                  className="w-full px-3 py-2 border border-bd-input bg-white text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted mb-2">{t('billing.toUtc')}</label>
                <input
                  type="datetime-local"
                  value={toUtc}
                  onChange={(event) => {
                    setToUtc(event.target.value)
                    setPageNumber(1)
                  }}
                  className="w-full px-3 py-2 border border-bd-input bg-white text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted mb-2">{t('billing.paymentStatus')}</label>
                <select
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value)
                    setPageNumber(1)
                  }}
                  className="w-full px-3 py-2 border border-bd-input bg-white text-sm focus:outline-none"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted mb-2">{t('billing.provider')}</label>
                <select
                  value={provider}
                  onChange={(event) => {
                    setProvider(event.target.value)
                    setPageNumber(1)
                  }}
                  className="w-full px-3 py-2 border border-bd-input bg-white text-sm focus:outline-none"
                >
                  <option value="">{t('billing.allProviders')}</option>
                  <option value="VNPAY">VNPAY</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted mb-2">{t('billing.student')}</label>
                <select
                  value={userId}
                  onChange={(event) => {
                    setUserId(event.target.value)
                    setPageNumber(1)
                  }}
                  className="w-full px-3 py-2 border border-bd-input bg-white text-sm focus:outline-none"
                  disabled={loadingFilters}
                >
                  <option value="">{t('billing.allStudents')}</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>{student.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted mb-2">{t('billing.subscriptionPlan')}</label>
                <select
                  value={subscriptionPlanId}
                  onChange={(event) => {
                    setSubscriptionPlanId(event.target.value)
                    setPageNumber(1)
                  }}
                  className="w-full px-3 py-2 border border-bd-input bg-white text-sm focus:outline-none"
                >
                  <option value="">{t('billing.allPlans')}</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>{plan.name}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 xl:col-span-2">
                <label className="block text-xs font-bold text-muted mb-2">{t('billing.search')}</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-placeholder" />
                  <input
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value)
                      setPageNumber(1)
                    }}
                    placeholder={t('billing.searchPlaceholder')}
                    className="w-full pl-10 pr-4 py-2 border border-bd-input bg-white text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted mb-2">{t('billing.pageSize')}</label>
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value))
                    setPageNumber(1)
                  }}
                  className="w-full px-3 py-2 border border-bd-input bg-white text-sm focus:outline-none"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-2 px-4 py-2 border border-bd-input bg-th-card text-body text-sm font-bold hover:bg-th-page transition-colors cursor-pointer rounded-sm"
              >
                <FilterX size={16} />
                {t('billing.resetFilters')}
              </button>
            </div>
          </div>

          {error ? (
            <div className="px-4 py-3 text-sm border rounded-sm text-red-800 border-red-300 bg-red-50">
              {error}
            </div>
          ) : null}

          <div className="bg-th-card border border-bd-strong overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse table-fixed">
                <thead className="bg-th-input border-b border-bd text-heading text-sm font-semibold">
                  <tr>
                    <th className="p-3 w-[260px]">{t('billing.student')}</th>
                    <th className="p-3 w-[180px]">{t('billing.subscriptionPlan')}</th>
                    <th className="p-3 w-[130px]">{t('billing.amount')}</th>
                    <th className="p-3 w-[100px]">{t('billing.provider')}</th>
                    <th className="p-3 w-[190px]">{t('billing.paidAt')}</th>
                    <th className="p-3 w-[120px]">{t('billing.status')}</th>
                    <th className="p-3 w-[90px] text-center">{t('billing.details')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-layer text-body text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-muted">
                        <div className="inline-flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          {t('billing.loading')}
                        </div>
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-muted">
                        {t('billing.empty')}
                      </td>
                    </tr>
                  ) : (
                    rows.map((item) => (
                      <tr key={item.paymentTransactionId} className="hover:bg-th-page/70 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-heading truncate">{item.username || '-'}</div>
                          <div className="text-xs text-muted truncate">{item.email || '-'}</div>
                        </td>
                        <td className="p-3 whitespace-nowrap truncate" title={item.subscriptionPlanName || item.subscriptionPlanId || '-'}>
                          {item.subscriptionPlanName || item.subscriptionPlanId || '-'}
                        </td>
                        <td className="p-3 whitespace-nowrap font-bold">{formatCurrency(item.amount)}</td>
                        <td className="p-3 whitespace-nowrap">{item.provider || '-'}</td>
                        <td className="p-3">
                          <div className="truncate" title={formatDateTimeRaw(item.paidAt || item.createdAt)}>
                            {formatDateTimeRaw(item.paidAt || item.createdAt)}
                          </div>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 text-xs font-bold border rounded-sm ${getStatusClassName(item.status)}`}>
                            {getStatusLabel(item.status)}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleOpenDetails(item)}
                            className="inline-flex items-center justify-center p-1 text-status-blue hover:bg-status-blue-bg border border-transparent hover:border-blue-200 rounded-sm transition-colors"
                            title={t('billing.view')}
                          >
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-bd flex flex-col md:flex-row items-center justify-between gap-4 bg-th-input/30">
              <span className="text-sm text-muted">
                {t('billing.showing', {
                  start: startIndex,
                  end: endIndex,
                  total: totalCount,
                })}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPageNumber((previous) => Math.max(1, previous - 1))}
                  disabled={pageNumber <= 1 || loading}
                  className="p-1 text-body hover:bg-th-card border border-transparent hover:border-bd disabled:opacity-30 transition-all"
                >
                  <ChevronLeft size={20} />
                </button>

                <span className="text-sm font-medium text-heading min-w-[5rem] text-center">
                  {pageNumber} / {totalPages}
                </span>

                <button
                  onClick={() => setPageNumber((previous) => Math.min(totalPages, previous + 1))}
                  disabled={pageNumber >= totalPages || loading}
                  className="p-1 text-body hover:bg-th-card border border-transparent hover:border-bd disabled:opacity-30 transition-all"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isDetailOpen ? (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-th-card border border-bd shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-bd">
              <h3 className="font-bold text-heading">{t('billing.detailTitle')}</h3>
              <button
                onClick={() => {
                  setIsDetailOpen(false)
                  setSelectedTransaction(null)
                }}
                className="p-1 hover:bg-th-input text-muted transition-colors"
                title={t('billing.close')}
              >
                <X size={18} />
              </button>
            </div>

            {detailLoading ? (
              <div className="p-6 text-sm text-muted flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                {t('billing.loading')}
              </div>
            ) : selectedTransaction ? (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted">{t('billing.student')}:</span><div className="font-semibold text-heading mt-1">{selectedTransaction.username || '-'}</div></div>
              <div><span className="text-muted">{t('billing.email')}:</span><div className="font-semibold text-heading mt-1">{selectedTransaction.email || '-'}</div></div>
              <div><span className="text-muted">{t('billing.subscriptionPlan')}:</span><div className="font-semibold text-heading mt-1">{selectedTransaction.subscriptionPlanName || selectedTransaction.subscriptionPlanId || '-'}</div></div>
              <div><span className="text-muted">{t('billing.amount')}:</span><div className="font-semibold text-heading mt-1">{formatCurrency(selectedTransaction.amount)}</div></div>
              <div><span className="text-muted">{t('billing.provider')}:</span><div className="font-semibold text-heading mt-1">{selectedTransaction.provider || '-'}</div></div>
              <div><span className="text-muted">{t('billing.status')}:</span><div className="font-semibold text-heading mt-1">{getStatusLabel(selectedTransaction.status)}</div></div>
              <div><span className="text-muted">{t('billing.paidAt')}:</span><div className="font-semibold text-heading mt-1">{formatDateTimeRaw(selectedTransaction.paidAt)}</div></div>
              <div><span className="text-muted">{t('billing.txnRef')}:</span><div className="font-semibold text-heading mt-1 break-all">{selectedTransaction.txnRef || '-'}</div></div>
              <div><span className="text-muted">{t('billing.transactionNo')}:</span><div className="font-semibold text-heading mt-1">{selectedTransaction.transactionNo || '-'}</div></div>
              <div><span className="text-muted">{t('billing.responseCode')}:</span><div className="font-semibold text-heading mt-1">{selectedTransaction.responseCode || '-'}</div></div>
              <div><span className="text-muted">{t('billing.bankCode')}:</span><div className="font-semibold text-heading mt-1">{selectedTransaction.bankCode || '-'}</div></div>
              <div className="md:col-span-2"><span className="text-muted">{t('billing.orderInfo')}:</span><div className="font-semibold text-heading mt-1 break-all">{selectedTransaction.orderInfo || '-'}</div></div>
              <div><span className="text-muted">{t('billing.createdAt')}:</span><div className="font-semibold text-heading mt-1">{formatDateTimeVN(selectedTransaction.createdAt)}</div></div>
              <div><span className="text-muted">{t('billing.updatedAt')}:</span><div className="font-semibold text-heading mt-1">{formatDateTimeVN(selectedTransaction.updatedAt)}</div></div>
              </div>
            ) : (
              <div className="p-6 text-sm text-muted">{t('billing.empty')}</div>
            )}

            <div className="px-4 py-3 border-t border-bd flex justify-end">
              <button
                onClick={() => {
                  setIsDetailOpen(false)
                  setSelectedTransaction(null)
                }}
                className="px-4 py-2 border border-bd-input bg-th-card text-body text-sm font-bold hover:bg-th-page transition-colors rounded-sm"
              >
                {t('billing.close')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Layout>
  )
}

export default AdminBillingPage
