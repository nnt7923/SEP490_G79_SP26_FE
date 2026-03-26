import React, { useEffect, useMemo, useState } from 'react'
import Layout from '../../../../components/Layout'
import { useAdminSidebarConfig } from '../components/AdminSideBar'
import { AdminSubscriptionService } from '../../../../services'
import {
  SubscriptionFeatureKey,
  SubscriptionWindowType,
  type AdminSubscriptionPlan,
  type SubscriptionPlanLimit,
  type UpsertAdminSubscriptionPlanPayload,
} from '../../../../services/AdminSubscriptionService'
import { useTranslation } from 'react-i18next'
import { CreditCard, RefreshCw, Plus, Pencil, Trash2, X } from 'lucide-react'

type NoticeType = 'success' | 'error'

const defaultForm: UpsertAdminSubscriptionPlanPayload = {
  planType: '',
  name: '',
  description: '',
  priceVnd: 0,
  durationDays: 0,
  isActive: true,
  displayOrder: 1,
  limits: [
    {
      featureKey: SubscriptionFeatureKey.LearningPathCreation,
      limitCount: 0,
      windowType: SubscriptionWindowType.Daily,
      isEnabled: true,
    },
  ],
}

const normalizeNumber = (value: string, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const featureKeyOptions = [
  SubscriptionFeatureKey.LearningPathCreation,
  SubscriptionFeatureKey.TutorMessages,
  SubscriptionFeatureKey.FocusSessionReview,
] as const

const windowTypeOptions = [
  SubscriptionWindowType.Daily,
  SubscriptionWindowType.Monthly,
  SubscriptionWindowType.Lifetime,
] as const

const AdminSubscriptionPlansPage: React.FC = () => {
  const { t } = useTranslation('admin')
  const navItems = useAdminSidebarConfig()
  const sidebarConfig = {
    navItems: navItems as any,
    actions: [],
    brand: { name: 'Admin', subtitle: 'Subscriptions' },
  }

  const [plans, setPlans] = useState<AdminSubscriptionPlan[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [saving, setSaving] = useState<boolean>(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string>('')
  const [notice, setNotice] = useState<{ type: NoticeType; message: string } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState<boolean>(false)
  const [form, setForm] = useState<UpsertAdminSubscriptionPlanPayload>(defaultForm)

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name)),
    [plans]
  )

  const getFeatureKeyLabel = (value: number) => {
    if (value === SubscriptionFeatureKey.LearningPathCreation) return t('subscriptionPlans.featureKeyLearningPathCreation')
    if (value === SubscriptionFeatureKey.TutorMessages) return t('subscriptionPlans.featureKeyTutorMessages')
    if (value === SubscriptionFeatureKey.FocusSessionReview) return t('subscriptionPlans.featureKeyFocusSessionReview')
    return String(value)
  }

  const getWindowTypeLabel = (value: number) => {
    if (value === SubscriptionWindowType.Daily) return t('subscriptionPlans.windowTypeDaily')
    if (value === SubscriptionWindowType.Monthly) return t('subscriptionPlans.windowTypeMonthly')
    if (value === SubscriptionWindowType.Lifetime) return t('subscriptionPlans.windowTypeLifetime')
    return String(value)
  }

  const formatLimitValue = (limit: SubscriptionPlanLimit) => {
    const cycle = getWindowTypeLabel(limit.windowType).toLowerCase()
    if (limit.windowType === SubscriptionWindowType.Lifetime && limit.limitCount <= 0) {
      return t('subscriptionPlans.durationUnlimited')
    }
    if (limit.windowType === SubscriptionWindowType.Lifetime) {
      return t('subscriptionPlans.lifetimeQuotaLabel', { count: limit.limitCount })
    }
    return `${limit.limitCount}/${cycle}`
  }

  const getLocalizedPlanName = (name: string) => {
    const normalized = String(name || '').trim().toLowerCase()
    if (normalized === 'free') return t('subscriptionPlans.planNameFree')
    if (normalized === 'standard') return t('subscriptionPlans.planNameStandard')
    if (normalized === 'pro') return t('subscriptionPlans.planNamePro')
    if (normalized === 'premium') return t('subscriptionPlans.planNamePremium')
    return name
  }

  const formatDurationLabel = (durationDays: number) => {
    if (!Number.isFinite(durationDays) || durationDays <= 0) {
      return t('subscriptionPlans.durationUnlimited')
    }
    return t('subscriptionPlans.durationDaysLabel', { count: durationDays })
  }

  const resetForm = () => {
    setEditingId(null)
    setForm(defaultForm)
    setShowForm(false)
  }

  const fetchPlans = async () => {
    setLoading(true)
    setError('')
    try {
      const list = await AdminSubscriptionService.getPlans()
      setPlans(list)
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message || t('subscriptionPlans.failedToLoad')
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  const onCreateOrUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice(null)

    try {
      if (!form.limits.length) {
        setError(t('subscriptionPlans.limitsRequired'))
        return
      }

      if (editingId) {
        await AdminSubscriptionService.updatePlan(editingId, form)
        setNotice({ type: 'success', message: t('subscriptionPlans.updateSuccess') })
      } else {
        await AdminSubscriptionService.createPlan(form)
        setNotice({ type: 'success', message: t('subscriptionPlans.createSuccess') })
      }
      await fetchPlans()
      resetForm()
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message || t('subscriptionPlans.saveFailed')
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  const onEdit = (plan: AdminSubscriptionPlan) => {
    setEditingId(plan.subscriptionPlanId)
    setForm({
      planType: plan.planType,
      name: plan.name,
      description: plan.description,
      priceVnd: plan.priceVnd,
      durationDays: plan.durationDays,
      isActive: plan.isActive,
      displayOrder: plan.displayOrder,
      limits: plan.limits?.length
        ? plan.limits.map((item) => ({
          featureKey: item.featureKey,
          limitCount: item.limitCount,
          windowType: item.windowType,
          isEnabled: item.isEnabled,
        }))
        : [
          {
            featureKey: SubscriptionFeatureKey.LearningPathCreation,
            limitCount: 0,
            windowType: SubscriptionWindowType.Daily,
            isEnabled: true,
          },
        ],
    })
    setShowForm(true)
    setNotice(null)
    setError('')
  }

  const updateLimit = (index: number, patch: Partial<SubscriptionPlanLimit>) => {
    setForm((previous) => ({
      ...previous,
      limits: previous.limits.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }))
  }

  const addLimit = () => {
    setForm((previous) => ({
      ...previous,
      limits: [
        ...previous.limits,
        {
          featureKey: SubscriptionFeatureKey.LearningPathCreation,
          limitCount: 0,
          windowType: SubscriptionWindowType.Daily,
          isEnabled: true,
        },
      ],
    }))
  }

  const removeLimit = (index: number) => {
    setForm((previous) => {
      if (previous.limits.length <= 1) return previous
      return {
        ...previous,
        limits: previous.limits.filter((_, itemIndex) => itemIndex !== index),
      }
    })
  }

  const onDelete = async (plan: AdminSubscriptionPlan) => {
    const accepted = window.confirm(t('subscriptionPlans.deleteConfirm', { name: plan.name }))
    if (!accepted) return

    setDeletingId(plan.subscriptionPlanId)
    setError('')
    setNotice(null)
    try {
      await AdminSubscriptionService.deletePlan(plan.subscriptionPlanId)
      setNotice({ type: 'success', message: t('subscriptionPlans.deleteSuccess') })
      await fetchPlans()
      if (editingId === plan.subscriptionPlanId) {
        resetForm()
      }
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message || t('subscriptionPlans.deleteFailed')
      setError(message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Layout sidebar={sidebarConfig}>
      <div className="px-4 py-8 bg-[var(--gray-100)] min-h-screen font-mono">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="mb-6 border-b border-bd pb-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-heading border-none bg-transparent flex items-center gap-2">
                  <CreditCard className="text-status-blue" size={28} />
                  {t('subscriptionPlans.title')}
                </h1>
                <p className="text-muted mt-2">{t('subscriptionPlans.subtitle')}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchPlans}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-blue-600 bg-th-card text-status-blue text-sm font-bold hover:bg-status-blue-bg transition-colors cursor-pointer rounded-sm disabled:opacity-60"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  {t('subscriptionPlans.reload')}
                </button>

                <button
                  onClick={() => {
                    setShowForm((previous) => !previous)
                    if (editingId) {
                      setEditingId(null)
                      setForm(defaultForm)
                    }
                    setNotice(null)
                    setError('')
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-green-600 bg-th-card text-green-700 text-sm font-bold hover:bg-green-50 transition-colors cursor-pointer rounded-sm"
                >
                  {showForm && !editingId ? <X size={16} /> : <Plus size={16} />}
                  {showForm && !editingId ? t('subscriptionPlans.close') : t('subscriptionPlans.addPlan')}
                </button>
              </div>
            </div>
          </div>

          {notice ? (
            <div className={`px-4 py-3 text-sm border rounded-sm ${notice.type === 'success'
              ? 'text-green-800 border-green-300 bg-green-50'
              : 'text-red-800 border-red-300 bg-red-50'}`}>
              {notice.message}
            </div>
          ) : null}

          {error ? (
            <div className="px-4 py-3 text-sm border rounded-sm text-red-800 border-red-300 bg-red-50">
              {error}
            </div>
          ) : null}

          {showForm ? (
            <form onSubmit={onCreateOrUpdate} className="bg-th-card border border-bd-strong p-5 space-y-4">
              <h2 className="text-lg font-bold text-heading">
                {editingId ? t('subscriptionPlans.editPlan') : t('subscriptionPlans.createPlan')}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-body mb-2">{t('subscriptionPlans.planType')}</label>
                  <input
                    required
                    value={form.planType}
                    onChange={(event) => setForm((previous) => ({ ...previous, planType: event.target.value }))}
                    placeholder="Standard"
                    className="w-full px-3 py-2 border border-bd-input bg-white text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-body mb-2">{t('subscriptionPlans.name')}</label>
                  <input
                    required
                    value={form.name}
                    onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))}
                    placeholder="Pro"
                    className="w-full px-3 py-2 border border-bd-input bg-white text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-body mb-2">{t('subscriptionPlans.priceVnd')}</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={form.priceVnd}
                    onChange={(event) => setForm((previous) => ({ ...previous, priceVnd: normalizeNumber(event.target.value) }))}
                    className="w-full px-3 py-2 border border-bd-input bg-white text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-body mb-2">{t('subscriptionPlans.durationDays')}</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={form.durationDays}
                    onChange={(event) => setForm((previous) => ({ ...previous, durationDays: normalizeNumber(event.target.value) }))}
                    className="w-full px-3 py-2 border border-bd-input bg-white text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-body mb-2">{t('subscriptionPlans.displayOrder')}</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={form.displayOrder}
                    onChange={(event) => setForm((previous) => ({ ...previous, displayOrder: normalizeNumber(event.target.value, 1) }))}
                    className="w-full px-3 py-2 border border-bd-input bg-white text-sm focus:outline-none"
                  />
                </div>

                <div className="flex items-end">
                  <label className="inline-flex items-center gap-2 text-sm text-body font-bold">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(event) => setForm((previous) => ({ ...previous, isActive: event.target.checked }))}
                      className="w-4 h-4"
                    />
                    {t('subscriptionPlans.isActive')}
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-body mb-2">{t('subscriptionPlans.description')}</label>
                <textarea
                  rows={3}
                  required
                  value={form.description}
                  onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))}
                  className="w-full px-3 py-2 border border-bd-input bg-white text-sm focus:outline-none"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-bold text-body">{t('subscriptionPlans.limits')}</label>
                  <button
                    type="button"
                    onClick={addLimit}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-green-500 text-green-700 text-xs font-bold hover:bg-green-50 transition-colors rounded-sm"
                  >
                    <Plus size={14} />
                    {t('subscriptionPlans.addLimit')}
                  </button>
                </div>

                <div className="space-y-3">
                  {form.limits.map((limit, index) => (
                    <div key={`limit-${index}`} className="border border-bd p-3 rounded-sm bg-th-page">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-body mb-1">{t('subscriptionPlans.featureKey')}</label>
                          <select
                            value={limit.featureKey}
                            onChange={(event) =>
                              updateLimit(index, {
                                featureKey: normalizeNumber(event.target.value, SubscriptionFeatureKey.LearningPathCreation) as SubscriptionFeatureKey,
                              })
                            }
                            className="w-full px-3 py-2 border border-bd-input bg-white text-sm focus:outline-none"
                          >
                            {featureKeyOptions.map((option) => (
                              <option key={option} value={option}>{getFeatureKeyLabel(option)}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-body mb-1">{t('subscriptionPlans.limitCount')}</label>
                          <input
                            type="number"
                            min={0}
                            value={limit.limitCount}
                            onChange={(event) => updateLimit(index, { limitCount: normalizeNumber(event.target.value) })}
                            className="w-full px-3 py-2 border border-bd-input bg-white text-sm focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-body mb-1">{t('subscriptionPlans.windowType')}</label>
                          <select
                            value={limit.windowType}
                            onChange={(event) =>
                              updateLimit(index, {
                                windowType: normalizeNumber(event.target.value, SubscriptionWindowType.Daily) as SubscriptionWindowType,
                              })
                            }
                            className="w-full px-3 py-2 border border-bd-input bg-white text-sm focus:outline-none"
                          >
                            {windowTypeOptions.map((option) => (
                              <option key={option} value={option}>{getWindowTypeLabel(option)}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center justify-between md:justify-start gap-4">
                          <label className="inline-flex items-center gap-2 text-xs font-bold text-body mt-5">
                            <input
                              type="checkbox"
                              checked={limit.isEnabled}
                              onChange={(event) => updateLimit(index, { isEnabled: event.target.checked })}
                              className="w-4 h-4"
                            />
                            {t('subscriptionPlans.isEnabled')}
                          </label>

                          <button
                            type="button"
                            disabled={form.limits.length <= 1}
                            onClick={() => removeLimit(index)}
                            className="mt-5 inline-flex items-center gap-1 px-2 py-1 border border-red-400 text-red-700 text-xs font-bold hover:bg-red-50 transition-colors rounded-sm disabled:opacity-50"
                          >
                            <Trash2 size={13} />
                            {t('subscriptionPlans.removeLimit')}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className={`px-4 py-2 border text-white text-sm font-bold transition-colors cursor-pointer rounded-sm disabled:opacity-60 ${editingId
                    ? 'border-indigo-600 bg-indigo-600 hover:bg-indigo-700'
                    : 'border-blue-600 bg-status-blue-solid hover:bg-blue-700'}`}
                >
                  {saving ? t('subscriptionPlans.saving') : editingId ? t('subscriptionPlans.update') : t('subscriptionPlans.create')}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-bd-strong bg-th-card text-sm font-bold text-label hover:bg-th-page transition-colors cursor-pointer rounded-sm"
                >
                  {t('subscriptionPlans.cancel')}
                </button>
              </div>
            </form>
          ) : null}

          <div className="bg-th-card border border-bd-strong overflow-hidden">
            <div className="px-4 py-3 border-b border-bd text-sm font-bold text-heading">
              {t('subscriptionPlans.listTitle', { count: sortedPlans.length })}
            </div>

            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-muted">{t('subscriptionPlans.loading')}</div>
            ) : sortedPlans.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted">{t('subscriptionPlans.empty')}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--gray-100)] border-b border-bd-strong">
                    <tr className="text-left">
                      <th className="px-4 py-3 font-bold text-heading">{t('subscriptionPlans.name')}</th>
                      <th className="px-4 py-3 font-bold text-heading">{t('subscriptionPlans.planType')}</th>
                      <th className="px-4 py-3 font-bold text-heading">{t('subscriptionPlans.priceVnd')}</th>
                      <th className="px-4 py-3 font-bold text-heading">{t('subscriptionPlans.durationDays')}</th>
                      <th className="px-4 py-3 font-bold text-heading">{t('subscriptionPlans.limits')}</th>
                      <th className="px-4 py-3 font-bold text-heading">{t('subscriptionPlans.displayOrder')}</th>
                      <th className="px-4 py-3 font-bold text-heading">{t('subscriptionPlans.status')}</th>
                      <th className="px-4 py-3 font-bold text-heading">{t('subscriptionPlans.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPlans.map((plan) => (
                      <tr key={plan.subscriptionPlanId} className="border-b border-bd last:border-b-0">
                        <td className="px-4 py-3">
                          <p className="font-bold text-heading">{getLocalizedPlanName(plan.name)}</p>
                          <p className="text-xs text-muted mt-1">{plan.description}</p>
                        </td>
                        <td className="px-4 py-3 text-label">{getLocalizedPlanName(plan.planType)}</td>
                        <td className="px-4 py-3 text-label">{plan.priceVnd.toLocaleString('vi-VN')} VND</td>
                        <td className="px-4 py-3 text-label">{formatDurationLabel(plan.durationDays)}</td>
                        <td className="px-4 py-3">
                          {plan.limits?.length ? (
                            <div className="min-w-[250px] rounded-sm border border-[var(--gray-300)] bg-th-card divide-y divide-[var(--gray-300)]">
                              {plan.limits.map((limit, index) => (
                                <div
                                  key={`${plan.subscriptionPlanId}-limit-${index}`}
                                  className="px-3 py-2.5"
                                >
                                  <p className="text-[13px] font-bold text-[var(--gray-900)] leading-5">{getFeatureKeyLabel(limit.featureKey)}</p>
                                  <p className="mt-1 text-[12px] text-[var(--gray-700)] font-semibold">{formatLimitValue(limit)}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted">{t('subscriptionPlans.noLimits')}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-label">{plan.displayOrder}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 border rounded-sm text-xs font-bold ${plan.isActive
                            ? 'bg-green-50 text-green-700 border-green-300'
                            : 'bg-gray-100 text-gray-600 border-gray-300'}`}>
                            {plan.isActive ? t('subscriptionPlans.active') : t('subscriptionPlans.inactive')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onEdit(plan)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-blue-400 text-status-blue text-xs font-bold hover:bg-status-blue-bg transition-colors cursor-pointer rounded-sm"
                            >
                              <Pencil size={14} />
                              {t('subscriptionPlans.edit')}
                            </button>
                            <button
                              onClick={() => onDelete(plan)}
                              disabled={deletingId === plan.subscriptionPlanId}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-red-400 text-red-700 text-xs font-bold hover:bg-red-50 transition-colors cursor-pointer rounded-sm disabled:opacity-60"
                            >
                              <Trash2 size={14} />
                              {deletingId === plan.subscriptionPlanId ? t('subscriptionPlans.deleting') : t('subscriptionPlans.delete')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default AdminSubscriptionPlansPage
