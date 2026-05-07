
import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import useAuthStore from '../../../store/useAuthStore'
import Layout from '../../../components/Layout'
import { useAdminSidebarConfig } from './components/AdminSideBar'
import { UserService } from '../../../services'
import AdminBillingService, { type BillingSummaryDailyRevenue } from '../../../services/AdminBillingService'
import { useTranslation } from 'react-i18next'
import { Shield, Users, Key, PieChart, Activity, CheckCircle2, Server, KeySquare, ChevronRight, ReceiptText, BarChart3, TrendingUp } from 'lucide-react'

const USD_TO_VND_API_URL = 'https://open.er-api.com/v6/latest/USD'
const EXCHANGE_RATE_REFRESH_MS = 15 * 60 * 1000

type CurrencyCode = 'USD' | 'VND'

const AdminDashboard: React.FC = () => {
  const { user } = useAuthStore()
  const name = user?.name || user?.username || 'Admin'
  const { t, i18n } = useTranslation('admin')
  const [studentCount, setStudentCount] = useState(0)
  const [mentorCount, setMentorCount] = useState(0)
  const [adminCount, setAdminCount] = useState(0)
  const [aiProfitUsd, setAiProfitUsd] = useState(0)
  const [currency, setCurrency] = useState<CurrencyCode>('VND')
  const [usdToVndRate, setUsdToVndRate] = useState<number | null>(null)
  const [exchangeRateUpdatedAt, setExchangeRateUpdatedAt] = useState('')
  const [billingLoading, setBillingLoading] = useState(true)
  const [billingFromDate, setBillingFromDate] = useState<string>('')
  const [billingToDate, setBillingToDate] = useState<string>('')
  const [billingTotalTransactions, setBillingTotalTransactions] = useState(0)
  const [billingSuccessTransactions, setBillingSuccessTransactions] = useState(0)
  const [billingFailedTransactions, setBillingFailedTransactions] = useState(0)
  const [billingTotalRevenue, setBillingTotalRevenue] = useState(0)
  const [billingDailyRevenue, setBillingDailyRevenue] = useState<BillingSummaryDailyRevenue[]>([])
  const [loading, setLoading] = useState(true)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value || 0)
  }

  const formatDateOnly = (date: string | null | undefined): string => {
    if (!date) return '-'
    const dateObj = new Date(date)
    if (isNaN(dateObj.getTime())) return String(date)
    return dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
  }

  const fetchUsdToVndRate = async () => {
    try {
      const response = await fetch(USD_TO_VND_API_URL)
      if (!response.ok) throw new Error('Failed to fetch exchange rate')
      const data = await response.json()
      const rate = Number(data?.rates?.VND)
      if (Number.isFinite(rate) && rate > 0) {
        setUsdToVndRate(rate)
        setExchangeRateUpdatedAt(new Date().toISOString())
      } else {
        setUsdToVndRate(null)
      }
    } catch {
      setUsdToVndRate(null)
    }
  }

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        const now = new Date()
        const [studentsPage, mentorsPage, adminsPage, monthlyOverview] = await Promise.all([
          UserService.listUsersPaged({ pageNumber: 1, pageSize: 1, role: 'Student' }),
          UserService.listUsersPaged({ pageNumber: 1, pageSize: 1, role: 'Mentor' }),
          UserService.listUsersPaged({ pageNumber: 1, pageSize: 1, role: 'Admin' }),
          AdminBillingService.getMonthlyOverview(now.getFullYear(), now.getMonth() + 1),
        ])

        setStudentCount(Number(studentsPage?.totalCount || 0))
        setMentorCount(Number(mentorsPage?.totalCount || 0))
        setAdminCount(Number(adminsPage?.totalCount || 0))
        setAiProfitUsd(monthlyOverview?.aiProfitUsd || 0)
      } catch (error) {
        // Removed console.error in admin stats load
        setStudentCount(0)
        setMentorCount(0)
        setAdminCount(0)
        setAiProfitUsd(0)
      } finally {
        setLoading(false)
      }
    }

    const fetchBillingSummary = async () => {
      try {
        setBillingLoading(true)
        const summary = await AdminBillingService.getSummary({
          provider: 'VNPAY',
          fromUtc: billingFromDate ? new Date(billingFromDate).toISOString() : undefined,
          toUtc: billingToDate ? new Date(billingToDate).toISOString() : undefined,
        })
        setBillingTotalTransactions(summary.totalTransactions)
        setBillingSuccessTransactions(summary.successfulTransactions)
        setBillingFailedTransactions(summary.failedTransactions)
        setBillingTotalRevenue(summary.totalRevenueVnd)

        const dailyRows = Array.isArray(summary.dailyRevenue) ? summary.dailyRevenue : []
        dailyRows.sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())
        setBillingDailyRevenue(dailyRows.slice(-14))
      } catch {
        setBillingTotalTransactions(0)
        setBillingSuccessTransactions(0)
        setBillingFailedTransactions(0)
        setBillingTotalRevenue(0)
        setBillingDailyRevenue([])
      } finally {
        setBillingLoading(false)
      }
    }

    fetchStats()
    fetchBillingSummary()
    fetchUsdToVndRate()
    const timer = window.setInterval(fetchUsdToVndRate, EXCHANGE_RATE_REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [billingFromDate, billingToDate])

  const sidebarConfig = {
    navItems: useAdminSidebarConfig() as any,
    actions: [],
    brand: { name: 'Admin', subtitle: 'Overview' },
  }

  // Role distribution from real API totals
  const roleDistribution = [
    { name: 'Students', count: studentCount, color: 'var(--brand-blue)' },
    { name: 'Mentors', count: mentorCount, color: 'var(--accent-purple)' },
    { name: 'Admins', count: adminCount, color: 'var(--color-amber-500)' },
  ]

  const totalForChart = Math.max(roleDistribution.reduce((sum, item) => sum + item.count, 0), 1)
  const maxRevenue = Math.max(...billingDailyRevenue.map((item) => item.revenueVnd), 1)
  const lineChartWidth = 560
  const lineChartHeight = 240
  const lineChartPadding = 24

  const revenuePoints = billingDailyRevenue.map((item, index) => {
    const x = billingDailyRevenue.length <= 1
      ? lineChartWidth / 2
      : lineChartPadding + (index * (lineChartWidth - (lineChartPadding * 2))) / (billingDailyRevenue.length - 1)

    const y = lineChartHeight - lineChartPadding - ((item.revenueVnd / maxRevenue) * (lineChartHeight - (lineChartPadding * 2)))
    return { x, y, item }
  })

  const linePath = revenuePoints.map((point) => `${point.x},${point.y}`).join(' ')

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="px-4 py-8 bg-[var(--gray-100)] min-h-screen font-mono">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="mb-6 border-b border-bd pb-4">
            <h1 className="text-2xl outline-none font-bold text-heading border-none bg-transparent flex items-center gap-2">
              <Shield className="text-status-blue" size={28} />
              {t('dashboard.title')}
            </h1>
            <p className="text-muted mt-2">
              {t('dashboard.welcome', { name })}
            </p>
          </div>

          <div className="bg-[var(--gray-100)] rounded-none border border-bd-strong p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h2 className="text-base font-bold text-heading flex items-center gap-2">
                <ReceiptText size={20} className="text-status-blue-muted" />
                {t('dashboard.billingOverview')}
              </h2>
            </div>

            {/* Date Filter & Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 p-3 bg-th-card border border-bd rounded-sm">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2">
                  <span className="text-xs font-bold text-heading uppercase">{t('dashboard.filterFromDate')}:</span>
                  <input
                    type="date"
                    value={billingFromDate}
                    onChange={(e) => setBillingFromDate(e.target.value)}
                    disabled={billingLoading}
                    className="px-2 py-1 border border-bd bg-th-page text-heading text-sm rounded-sm disabled:opacity-60"
                  />
                </label>
                <label className="flex items-center gap-2">
                  <span className="text-xs font-bold text-heading uppercase">{t('dashboard.filterToDate')}:</span>
                  <input
                    type="date"
                    value={billingToDate}
                    onChange={(e) => setBillingToDate(e.target.value)}
                    disabled={billingLoading}
                    className="px-2 py-1 border border-bd bg-th-page text-heading text-sm rounded-sm disabled:opacity-60"
                  />
                </label>
                <button
                  onClick={() => {
                    setBillingFromDate('')
                    setBillingToDate('')
                  }}
                  disabled={billingLoading}
                  className="px-3 py-1 border border-bd bg-th-page text-heading text-xs font-bold uppercase rounded-sm hover:bg-th-card disabled:opacity-60"
                >
                  {t('dashboard.filterClear')}
                </button>
              </div>
              
              <div className="flex flex-col items-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const nextCurrency = currency === 'USD' ? 'VND' : 'USD'
                    if (nextCurrency === 'VND' && !usdToVndRate) return
                    setCurrency(nextCurrency)
                  }}
                  disabled={!usdToVndRate}
                  className="relative h-10 w-[126px] overflow-hidden rounded-full border border-bd-input bg-th-card transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span
                    className={`pointer-events-none absolute left-1 top-1 h-8 w-[58px] rounded-full border border-blue-500 bg-status-blue-bg shadow-sm transition-transform duration-300 ease-out ${currency === 'VND' ? 'translate-x-[58px]' : 'translate-x-0'}`}
                  />
                  <span className="relative z-10 grid h-full grid-cols-2 text-xs font-bold">
                    <span className={`flex items-center justify-center transition-colors ${currency === 'USD' ? 'text-status-blue' : 'text-muted'}`}>
                      USD
                    </span>
                    <span className={`flex items-center justify-center transition-colors ${currency === 'VND' ? 'text-status-blue' : 'text-muted'}`}>
                      VND
                    </span>
                  </span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
              <div className="border border-bd p-3 bg-th-card">
                <div className="text-xs text-muted">{t('dashboard.totalTransactions')}</div>
                <div className="text-xl font-bold text-heading mt-1">{billingLoading ? '...' : billingTotalTransactions}</div>
              </div>
              <div className="border border-bd p-3 bg-th-card">
                <div className="text-xs text-muted">{t('dashboard.successfulTransactions')}</div>
                <div className="text-xl font-bold text-green-700 mt-1">{billingLoading ? '...' : billingSuccessTransactions}</div>
              </div>
              <div className="border border-bd p-3 bg-th-card">
                <div className="text-xs text-muted">{t('dashboard.failedTransactions')}</div>
                <div className="text-xl font-bold text-red-700 mt-1">{billingLoading ? '...' : billingFailedTransactions}</div>
              </div>
              <div className="border border-bd p-3 bg-th-card">
                <div className="text-xs text-muted">{t('dashboard.packageRevenue')}</div>
                <div className="text-xl font-bold text-status-blue mt-1 truncate" title={currency === 'VND' ? formatCurrency(billingTotalRevenue) : (billingTotalRevenue / (usdToVndRate || 25400)).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}>
                  {billingLoading ? '...' : (currency === 'VND' ? formatCurrency(billingTotalRevenue) : (billingTotalRevenue / (usdToVndRate || 25400)).toLocaleString('en-US', { style: 'currency', currency: 'USD' }))}
                </div>
              </div>
              <div className="border border-bd p-3 bg-th-card">
                <div className="text-xs text-muted">{t('dashboard.totalCombinedRevenue')}</div>
                <div className="text-xl font-bold text-status-blue mt-1 truncate" title={currency === 'VND' ? formatCurrency(billingTotalRevenue + (aiProfitUsd * (usdToVndRate || 25400))) : ((billingTotalRevenue / (usdToVndRate || 25400)) + aiProfitUsd).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}>
                  {billingLoading ? '...' : (currency === 'VND' ? formatCurrency(billingTotalRevenue + (aiProfitUsd * (usdToVndRate || 25400))) : ((billingTotalRevenue / (usdToVndRate || 25400)) + aiProfitUsd).toLocaleString('en-US', { style: 'currency', currency: 'USD' }))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="border border-bd p-3 bg-th-card">
                <div className="text-sm font-bold text-heading mb-3 flex items-center gap-2">
                  <TrendingUp size={16} className="text-status-blue-muted" />
                  {t('dashboard.revenueTrend')}
                </div>

                {billingDailyRevenue.length === 0 ? (
                  <div className="h-[220px] flex items-center justify-center text-sm text-muted">{t('dashboard.noBillingData')}</div>
                ) : (
                  <div className="w-full overflow-x-auto">
                    <svg viewBox={`0 0 ${lineChartWidth} ${lineChartHeight}`} className="w-full min-w-[520px] h-[220px]">
                      <line x1={lineChartPadding} y1={lineChartHeight - lineChartPadding} x2={lineChartWidth - lineChartPadding} y2={lineChartHeight - lineChartPadding} stroke="var(--border)" strokeWidth="1" />
                      <line x1={lineChartPadding} y1={lineChartPadding} x2={lineChartPadding} y2={lineChartHeight - lineChartPadding} stroke="var(--border)" strokeWidth="1" />

                      <polyline fill="none" stroke="var(--brand-blue)" strokeWidth="3" points={linePath} />

                      {revenuePoints.map((point) => (
                        <g key={`${point.item.date}-${point.x}`}>
                          <circle cx={point.x} cy={point.y} r="4" fill="var(--brand-blue)" />
                        </g>
                      ))}
                    </svg>
                    <div className="mt-2 grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(billingDailyRevenue.length, 1)}, minmax(0, 1fr))` }}>
                      {billingDailyRevenue.map((item) => (
                        <div key={`label-${item.date}`} className="text-[10px] text-muted text-center truncate" title={`${formatDateOnly(item.date)} - ${formatCurrency(item.revenueVnd)}`}>
                          {formatDateOnly(item.date)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="border border-bd p-3 bg-th-card">
                <div className="text-sm font-bold text-heading mb-3 flex items-center gap-2">
                  <BarChart3 size={16} className="text-status-blue-muted" />
                  {t('dashboard.transactionsByDay')}
                </div>

                {billingDailyRevenue.length === 0 ? (
                  <div className="h-[220px] flex items-center justify-center text-sm text-muted">{t('dashboard.noBillingData')}</div>
                ) : (
                  <div className="space-y-2 max-h-[230px] overflow-y-auto pr-1">
                    {billingDailyRevenue.map((item) => {
                      const ratio = Math.max(6, Math.round((item.transactions / Math.max(...billingDailyRevenue.map((x) => x.transactions), 1)) * 100))
                      return (
                        <div key={`bar-${item.date}`} className="grid grid-cols-[56px_1fr_auto] items-center gap-2">
                          <span className="text-xs text-muted whitespace-nowrap">{formatDateOnly(item.date)}</span>
                          <div className="h-3 bg-th-page border border-bd overflow-hidden">
                            <div className="h-full bg-status-blue" style={{ width: `${ratio}%` }} />
                          </div>
                          <span className="text-xs font-bold text-heading whitespace-nowrap">{item.transactions}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-8">
            {/* Students Card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              whileHover={{ y: -3, scale: 1.01 }}
              className="bg-[var(--gray-100)] rounded-none border border-bd-strong p-6 flex flex-col justify-between hover:bg-th-card transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted text-sm font-bold uppercase">{t('dashboard.totalStudents')}</span>
                <span className="text-xs font-bold text-status-green-dark bg-status-green-bg-strong px-2 py-0.5 border border-green-300 rounded-sm">
                  {t('dashboard.active')}
                </span>
              </div>
              <div className="text-3xl font-bold text-heading my-2">
                {loading ? '...' : studentCount}
              </div>
              <div className="text-xs text-muted flex items-center gap-2">
                <Users size={16} className="text-status-blue-muted flex-shrink-0" />
                {t('dashboard.activeStudentAccounts')}
              </div>
            </motion.div>
          </div>

          {/* Charts & Status Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* User Distribution Pie Chart */}
            <div className="bg-[var(--gray-100)] rounded-none border border-bd-strong p-6">
              <h2 className="text-base font-bold text-heading mb-6 flex items-center gap-2">
                <PieChart size={20} className="text-status-blue-muted" />
                {t('dashboard.userDistribution')}
              </h2>
              <div className="flex items-center justify-center gap-8">
                {/* Pie Chart SVG */}
                <svg width="140" height="140" viewBox="0 0 160 160" className="flex-shrink-0">
                  {roleDistribution.reduce((acc, item, idx) => {
                    const startAngle = acc.angle
                    const sliceAngle = (item.count / totalForChart) * 360
                    const endAngle = startAngle + sliceAngle

                    const startRad = (startAngle * Math.PI) / 180
                    const endRad = (endAngle * Math.PI) / 180

                    const x1 = 80 + 60 * Math.cos(startRad)
                    const y1 = 80 + 60 * Math.sin(startRad)
                    const x2 = 80 + 60 * Math.cos(endRad)
                    const y2 = 80 + 60 * Math.sin(endRad)

                    const largeArc = sliceAngle > 180 ? 1 : 0

                    const path = `M 80 80 L ${x1} ${y1} A 60 60 0 ${largeArc} 1 ${x2} ${y2} Z`

                    acc.paths.push(
                      <path key={idx} d={path} fill={item.color} stroke="var(--gray-100)" strokeWidth="2" />
                    )

                    return { angle: endAngle, paths: acc.paths }
                  }, { angle: 0, paths: [] as React.ReactNode[] }).paths}
                </svg>

                {/* Legend */}
                <div className="space-y-3">
                  {roleDistribution.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="font-bold flex items-center" style={{ color: item.color }}>&#9632;</div>
                      <div>
                        <p className="text-sm font-bold text-heading lowercase">{item.name}</p>
                        <p className="text-xs text-muted">{item.count} {t('dashboard.users')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Activity Overview */}
            <div className="bg-[var(--gray-100)] rounded-none border border-bd-strong p-6 flex flex-col">
              <h2 className="text-base font-bold text-heading mb-6 flex items-center gap-2">
                <Activity size={20} className="text-status-blue-muted" />
                {t('dashboard.systemStatus')}
              </h2>
              
              <div className="space-y-3 flex-1">
                <div className="flex items-center justify-between p-3 bg-th-card border border-bd group hover:border-bd-strong transition-colors rounded-sm">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={18} className="text-status-green" />
                    <span className="text-sm font-bold text-heading">{t('dashboard.apiServices')}</span>
                  </div>
                  <span className="text-sm font-bold text-status-green-dark bg-status-green-bg px-2 py-0.5 border border-green-200 rounded-sm">{t('dashboard.ok')}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-th-card border border-bd group hover:border-bd-strong transition-colors rounded-sm">
                  <div className="flex items-center gap-3">
                    <Server size={18} className="text-status-blue" />
                    <span className="text-sm font-bold text-heading">{t('dashboard.database')}</span>
                  </div>
                  <span className="text-sm font-bold text-status-blue bg-status-blue-bg px-2 py-0.5 border border-blue-200 rounded-sm">{t('dashboard.connected')}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-th-card border border-bd group hover:border-bd-strong transition-colors rounded-sm">
                  <div className="flex items-center gap-3">
                    <KeySquare size={18} className="text-orange-500" />
                    <span className="text-sm font-bold text-heading">{t('dashboard.aiModels')}</span>
                  </div>
                  <span className="text-sm font-bold text-status-green-dark bg-status-green-bg-strong px-2 py-0.5 border border-green-300 rounded-sm">{t('dashboard.active')}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-bd">
                <div className="flex items-center gap-2 text-sm text-label font-bold">
                  <ChevronRight size={16} className="text-status-green" />
                  <span>{t('dashboard.allSystemsOperational')}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  )
}

export default AdminDashboard