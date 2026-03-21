import React, { useEffect, useMemo, useState } from 'react'
import Layout from '../../../../components/Layout'
import { useAdminSidebarConfig } from '../components/AdminSideBar'
import { AdminSubscriptionService } from '../../../../services'
import type { AdminSubscriptionPlan, UpsertAdminSubscriptionPlanPayload } from '../../../../services/AdminSubscriptionService'
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
}

const normalizeNumber = (value: string, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

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
    })
    setShowForm(true)
    setNotice(null)
    setError('')
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

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 border border-blue-600 bg-status-blue-solid text-white text-sm font-bold hover:opacity-90 transition-opacity cursor-pointer rounded-sm disabled:opacity-60"
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
                      <th className="px-4 py-3 font-bold text-heading">{t('subscriptionPlans.displayOrder')}</th>
                      <th className="px-4 py-3 font-bold text-heading">{t('subscriptionPlans.status')}</th>
                      <th className="px-4 py-3 font-bold text-heading">{t('subscriptionPlans.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPlans.map((plan) => (
                      <tr key={plan.subscriptionPlanId} className="border-b border-bd last:border-b-0">
                        <td className="px-4 py-3">
                          <p className="font-bold text-heading">{plan.name}</p>
                          <p className="text-xs text-muted mt-1">{plan.description}</p>
                        </td>
                        <td className="px-4 py-3 text-label">{plan.planType}</td>
                        <td className="px-4 py-3 text-label">{plan.priceVnd.toLocaleString('vi-VN')} VND</td>
                        <td className="px-4 py-3 text-label">{plan.durationDays}</td>
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
