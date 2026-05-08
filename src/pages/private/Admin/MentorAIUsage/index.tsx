import React, { useEffect, useState } from 'react'
import Layout from '../../../../components/Layout'
import { useAdminSidebarConfig } from '../components/AdminSideBar'
import { useTranslation } from 'react-i18next'
import { Bot, ChevronLeft, ChevronRight, FilterX, RefreshCw, Save, Search, SlidersHorizontal } from 'lucide-react'
import { formatDateTimeVN } from '../../../../utils/dateUtils'
import AdminAIUsageService, { type MentorQuotaStatusItem } from '../../../../services/AdminAIUsageService'

const PAGE_SIZE_OPTIONS = [10, 20, 50]
const MENTOR_AI_ACCESS_POLICY_KEY = 'mentor_ai_access_policy'

const AdminMentorAIUsagePage: React.FC = () => {
  const { t } = useTranslation('admin')
  const navItems = useAdminSidebarConfig()

  const sidebarConfig = {
    navItems: navItems as any,
    actions: [],
    brand: { name: 'Admin', subtitle: 'Mentor AI Usage' },
  }

  const [rows, setRows] = useState<MentorQuotaStatusItem[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  const [pageNumber, setPageNumber] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(10)
  const [totalCount, setTotalCount] = useState<number>(0)
  const [totalPages, setTotalPages] = useState<number>(1)

  const [nearThresholdPercent, setNearThresholdPercent] = useState<number>(80)
  const [onlyNearOrReached, setOnlyNearOrReached] = useState<boolean>(false)
  const [search, setSearch] = useState<string>('')

  const [policyLoading, setPolicyLoading] = useState<boolean>(false)
  const [policySaving, setPolicySaving] = useState<boolean>(false)
  const [policyError, setPolicyError] = useState<string>('')
  const [policySuccess, setPolicySuccess] = useState<string>('')
  const [mentorPaidRequestsMonthlyLimit, setMentorPaidRequestsMonthlyLimit] = useState<number>(0)
  const [mentorDowngradeNotifyCooldownHours, setMentorDowngradeNotifyCooldownHours] = useState<number>(0)
  const [policyDescription, setPolicyDescription] = useState<string>('')
  const [policyIsActive, setPolicyIsActive] = useState<boolean>(true)
  const [policyUpdatedAt, setPolicyUpdatedAt] = useState<string>('')

  const fetchData = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await AdminAIUsageService.getMentorQuotaStatus({
        pageNumber,
        pageSize,
        nearThresholdPercent,
        onlyNearOrReached,
        search: search.trim() || undefined,
      })

      setRows(response.items)
      setTotalCount(response.totalCount)
      setTotalPages(response.totalPages || 1)
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || t('mentorAiUsage.failedToLoad')
      setError(message)
      setRows([])
      setTotalCount(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [pageNumber, pageSize, nearThresholdPercent, onlyNearOrReached, search])

  const fetchPolicy = async () => {
    setPolicyLoading(true)
    setPolicyError('')
    try {
      const policy = await AdminAIUsageService.getMentorAIAccessPolicy(MENTOR_AI_ACCESS_POLICY_KEY)
      setMentorPaidRequestsMonthlyLimit(policy.mentorPaidRequestsMonthlyLimit)
      setMentorDowngradeNotifyCooldownHours(policy.mentorDowngradeNotifyCooldownHours)
      setPolicyDescription(policy.description || '')
      setPolicyIsActive(Boolean(policy.isActive))
      setPolicyUpdatedAt(policy.updatedAt || '')
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || t('mentorAiUsage.policyFailedToLoad')
      setPolicyError(message)
    } finally {
      setPolicyLoading(false)
    }
  }

  useEffect(() => {
    fetchPolicy()
  }, [])

  const handleSavePolicy = async () => {
    setPolicyError('')
    setPolicySuccess('')

    const monthlyLimit = Number(mentorPaidRequestsMonthlyLimit)
    // Hidden cooldown fixed at 5 hours
    const cooldownHours = 5
    if (!Number.isFinite(monthlyLimit) || monthlyLimit < 0) {
      setPolicyError(t('mentorAiUsage.policyValidation'))
      return
    }

    setPolicySaving(true)
    try {
      const normalizedMonthlyLimit = Math.floor(monthlyLimit)
      const normalizedCooldownHours = cooldownHours

      const updated = await AdminAIUsageService.updateMentorAIAccessPolicy(
        MENTOR_AI_ACCESS_POLICY_KEY,
        {
          description: policyDescription || 'Mentor AI access policy',
          configJson: {
            mentorPaidRequestsMonthlyLimit: normalizedMonthlyLimit,
            mentorDowngradeNotifyCooldownHours: normalizedCooldownHours,
          },
          isActive: policyIsActive,
        }
      )
      setMentorPaidRequestsMonthlyLimit(updated.mentorPaidRequestsMonthlyLimit)
      setMentorDowngradeNotifyCooldownHours(updated.mentorDowngradeNotifyCooldownHours)
      setPolicyDescription(updated.description || policyDescription)
      setPolicyIsActive(Boolean(updated.isActive))
      setPolicyUpdatedAt(updated.updatedAt || policyUpdatedAt)

      setRows((previousRows) => previousRows.map((row) => ({
        ...row,
        monthlyLimit: updated.mentorPaidRequestsMonthlyLimit,
      })))

      await fetchData()
      setPolicySuccess(t('mentorAiUsage.policySaveSuccess'))
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || t('mentorAiUsage.policySaveFailed')
      setPolicyError(message)
    } finally {
      setPolicySaving(false)
    }
  }

  const resetFilters = () => {
    setNearThresholdPercent(80)
    setOnlyNearOrReached(false)
    setSearch('')
    setPageNumber(1)
  }

  const getUsagePercent = (ratio: number): number => {
    if (!Number.isFinite(Number(ratio))) return 0
    const normalized = Number(ratio)
    const percent = normalized <= 1 ? normalized * 100 : normalized
    return Math.max(0, percent)
  }

  const getStatusLabel = (item: MentorQuotaStatusItem): string => {
    if (item.isReachedLimit) return t('mentorAiUsage.reached')
    if (item.isNearLimit) return t('mentorAiUsage.near')
    return t('mentorAiUsage.normal')
  }

  const getStatusClassName = (item: MentorQuotaStatusItem): string => {
    if (item.isReachedLimit) return 'text-red-700 border-red-600 bg-red-50'
    if (item.isNearLimit) return 'text-amber-700 border-amber-600 bg-amber-50'
    return 'text-green-700 border-green-600 bg-green-50'
  }

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
                  <Bot className="text-status-blue" size={28} />
                  {t('mentorAiUsage.title')}
                </h1>
                <p className="text-muted mt-2">{t('mentorAiUsage.subtitle')}</p>
              </div>

              <button
                onClick={() => {
                  fetchData()
                  fetchPolicy()
                }}
                disabled={loading || policyLoading}
                className="inline-flex items-center gap-2 px-4 py-2 border border-blue-600 bg-th-card text-status-blue text-sm font-bold hover:bg-status-blue-bg transition-colors cursor-pointer rounded-sm disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${(loading || policyLoading) ? 'animate-spin' : ''}`} />
                {t('mentorAiUsage.reload')}
              </button>
            </div>
          </div>

          <div className="bg-th-card border border-bd-strong p-4 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-heading inline-flex items-center gap-2">
                <SlidersHorizontal size={16} className="text-status-blue" />
                {t('mentorAiUsage.policyTitle')}
              </h2>
              <span className="text-xs text-muted">{policyLoading ? t('mentorAiUsage.loading') : t('mentorAiUsage.policyHint')}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="px-3 py-2 border border-bd-input bg-th-input/40 text-xs text-muted">
                <div className="font-bold text-heading mb-1">{t('mentorAiUsage.policyStatusLabel')}</div>
                <div className={policyIsActive ? 'text-green-700 font-bold' : 'text-red-700 font-bold'}>
                  {policyIsActive ? t('mentorAiUsage.policyStatusActive') : t('mentorAiUsage.policyStatusInactive')}
                </div>
              </div>
              <div className="px-3 py-2 border border-bd-input bg-th-input/40 text-xs text-muted">
                <div className="font-bold text-heading mb-1">{t('mentorAiUsage.policyUpdatedAtLabel')}</div>
                <div>{policyUpdatedAt ? formatDateTimeVN(policyUpdatedAt) : '-'}</div>
              </div>
            </div>

            {policyDescription ? (
              <div className="px-3 py-2 text-xs border border-bd-input bg-th-input/30 text-muted">
                <span className="font-bold text-heading mr-2">{t('mentorAiUsage.policyDescriptionLabel')}:</span>
                {policyDescription}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-bold text-muted mb-2">{t('mentorAiUsage.policyMonthlyLimit')}</label>
                <input
                  type="number"
                  min={0}
                  value={mentorPaidRequestsMonthlyLimit}
                  onChange={(event) => setMentorPaidRequestsMonthlyLimit(Number(event.target.value))}
                  className="w-full px-3 py-2 border border-bd-input bg-white text-sm focus:outline-none"
                />
              </div>
            </div>

            {policyError ? (
              <div className="px-3 py-2 text-sm border rounded-sm text-red-800 border-red-300 bg-red-50">{policyError}</div>
            ) : null}

            {policySuccess ? (
              <div className="px-3 py-2 text-sm border rounded-sm text-green-800 border-green-300 bg-green-50">{policySuccess}</div>
            ) : null}

            <div className="flex justify-end">
              <button
                onClick={handleSavePolicy}
                disabled={policySaving || policyLoading}
                className="inline-flex items-center gap-2 px-4 py-2 border border-blue-600 bg-th-card text-status-blue text-sm font-bold hover:bg-status-blue-bg transition-colors cursor-pointer rounded-sm disabled:opacity-60"
              >
                <Save size={16} />
                {policySaving ? t('mentorAiUsage.savingPolicy') : t('mentorAiUsage.savePolicy')}
              </button>
            </div>
          </div>

          <div className="bg-th-card border border-bd-strong p-4 space-y-4">
            <h2 className="text-sm font-bold text-heading">{t('mentorAiUsage.filters')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-muted mb-2">{t('mentorAiUsage.search')}</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-placeholder" />
                  <input
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value)
                      setPageNumber(1)
                    }}
                    placeholder={t('mentorAiUsage.searchPlaceholder')}
                    className="w-full pl-10 pr-4 py-2 border border-bd-input bg-white text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted mb-2">{t('mentorAiUsage.nearThresholdPercent')}</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={nearThresholdPercent}
                  onChange={(event) => {
                    const nextValue = Number(event.target.value)
                    setNearThresholdPercent(Number.isFinite(nextValue) ? nextValue : 80)
                    setPageNumber(1)
                  }}
                  className="w-full px-3 py-2 border border-bd-input bg-white text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted mb-2">{t('mentorAiUsage.onlyNearOrReached')}</label>
                <select
                  value={String(onlyNearOrReached)}
                  onChange={(event) => {
                    setOnlyNearOrReached(event.target.value === 'true')
                    setPageNumber(1)
                  }}
                  className="w-full px-3 py-2 border border-bd-input bg-white text-sm focus:outline-none"
                >
                  <option value="false">{t('mentorAiUsage.showAll')}</option>
                  <option value="true">{t('mentorAiUsage.showNearOrReached')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted mb-2">{t('mentorAiUsage.pageSize')}</label>
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
                {t('mentorAiUsage.resetFilters')}
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
                    <th className="p-3 w-[220px]">{t('mentorAiUsage.mentor')}</th>
                    <th className="p-3 w-[150px]">{t('mentorAiUsage.usedRequests')}</th>
                    <th className="p-3 w-[120px]">{t('mentorAiUsage.monthlyLimit')}</th>
                    <th className="p-3 w-[140px]">{t('mentorAiUsage.usageRatio')}</th>
                    <th className="p-3 w-[140px]">{t('mentorAiUsage.status')}</th>
                    <th className="p-3 w-[220px]">{t('mentorAiUsage.windowStartUtc')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-layer text-body text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-muted">
                        <div className="inline-flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          {t('mentorAiUsage.loading')}
                        </div>
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-muted">
                        {t('mentorAiUsage.empty')}
                      </td>
                    </tr>
                  ) : (
                    rows.map((item) => {
                      const usagePercent = getUsagePercent(item.usageRatio)
                      return (
                        <tr key={item.mentorId} className="hover:bg-th-page/70 transition-colors">
                          <td className="p-3">
                            <div className="font-bold text-heading truncate">{item.username || '-'}</div>
                            <div className="text-xs text-muted truncate">{item.email || '-'}</div>
                          </td>
                          <td className="p-3 whitespace-nowrap font-semibold">{item.usedPaidRequestsThisMonth}</td>
                          <td className="p-3 whitespace-nowrap">{item.monthlyLimit}</td>
                          <td className="p-3">
                            <div className="font-semibold">{usagePercent.toFixed(2)}%</div>
                            <div className="h-2 bg-th-page border border-bd mt-1 overflow-hidden">
                              <div
                                className={`${item.isReachedLimit ? 'bg-red-600' : item.isNearLimit ? 'bg-amber-500' : 'bg-status-blue'} h-full`}
                                style={{ width: `${Math.min(100, usagePercent)}%` }}
                              />
                            </div>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 text-xs font-bold border rounded-sm ${getStatusClassName(item)}`}>
                              {getStatusLabel(item)}
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap">{item.windowStartUtc ? formatDateTimeVN(item.windowStartUtc) : '-'}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-bd flex flex-col md:flex-row items-center justify-between gap-4 bg-th-input/30">
              <span className="text-sm text-muted">
                {t('mentorAiUsage.showing', {
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
    </Layout>
  )
}

export default AdminMentorAIUsagePage
