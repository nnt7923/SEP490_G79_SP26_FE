import React, { useEffect, useMemo, useState } from 'react'
import Layout from '../../../../components/Layout'
import { useAdminSidebarConfig } from '../components/AdminSideBar'
import { AdminSubscriptionService } from '../../../../services'
import {
  type AdminTokenPackage,
  type UpsertAdminTokenPackagePayload,
} from '../../../../services/AdminSubscriptionService'
import { useTranslation } from 'react-i18next'
import { Package, RefreshCw, Plus, Pencil, Trash2, X } from 'lucide-react'

type NoticeType = 'success' | 'error'

const defaultForm: UpsertAdminTokenPackagePayload = {
  name: '',
  description: '',
  priceVnd: 0,
  creditedTokens: 0,
  isActive: true,
  displayOrder: 1,
}

const normalizeNumber = (value: string, fallback = 0): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const AdminSubscriptionPlansPage: React.FC = () => {
  const { t } = useTranslation('admin')
  const navItems = useAdminSidebarConfig()
  const sidebarConfig = {
    navItems: navItems as any,
    actions: [],
    brand: { name: 'Admin', subtitle: 'Token Packages' },
  }

  const [tokenPackages, setTokenPackages] = useState<AdminTokenPackage[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [saving, setSaving] = useState<boolean>(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string>('')
  const [notice, setNotice] = useState<{ type: NoticeType; message: string } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState<boolean>(false)
  const [form, setForm] = useState<UpsertAdminTokenPackagePayload>(defaultForm)

  const sortedTokenPackages = useMemo(
    () => [...tokenPackages].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name)),
    [tokenPackages],
  )

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN').format(Math.max(0, Math.round(Number(amount) || 0)))
  }

  const resetForm = () => {
    setEditingId(null)
    setForm(defaultForm)
    setShowForm(false)
  }

  const fetchTokenPackages = async () => {
    setLoading(true)
    setError('')
    try {
      const list = await AdminSubscriptionService.getTokenPackages()
      setTokenPackages(list)
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message || t('subscriptionPlans.failedToLoad')
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchTokenPackages()
  }, [])

  const onCreateOrUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice(null)

    try {
      if (editingId) {
        await AdminSubscriptionService.updateTokenPackage(editingId, form)
        setNotice({ type: 'success', message: t('subscriptionPlans.updateSuccess') })
      } else {
        await AdminSubscriptionService.createTokenPackage(form)
        setNotice({ type: 'success', message: t('subscriptionPlans.createSuccess') })
      }
      await fetchTokenPackages()
      resetForm()
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message || t('subscriptionPlans.saveFailed')
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  const onEdit = (tokenPackage: AdminTokenPackage) => {
    setEditingId(tokenPackage.tokenPackageId)
    setForm({
      name: tokenPackage.name,
      description: tokenPackage.description,
      priceVnd: tokenPackage.priceVnd,
      creditedTokens: tokenPackage.creditedTokens,
      isActive: tokenPackage.isActive,
      displayOrder: tokenPackage.displayOrder,
    })
    setShowForm(true)
    setNotice(null)
    setError('')
  }

  const onDelete = async (tokenPackage: AdminTokenPackage) => {
    const accepted = window.confirm(t('subscriptionPlans.deleteConfirm', { name: tokenPackage.name }))
    if (!accepted) return

    setDeletingId(tokenPackage.tokenPackageId)
    setError('')
    setNotice(null)
    try {
      await AdminSubscriptionService.deleteTokenPackage(tokenPackage.tokenPackageId)
      setNotice({ type: 'success', message: t('subscriptionPlans.deleteSuccess') })
      await fetchTokenPackages()
      if (editingId === tokenPackage.tokenPackageId) {
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
                  <Package className="text-status-blue" size={28} />
                  {t('subscriptionPlans.title')}
                </h1>
                <p className="text-muted mt-2">{t('subscriptionPlans.subtitle')}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => { void fetchTokenPackages() }}
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
                  <label className="block text-sm font-bold text-body mb-2">{t('subscriptionPlans.name')}</label>
                  <input
                    required
                    value={form.name}
                    onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))}
                    placeholder={t('subscriptionPlans.namePlaceholder')}
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
                  <label className="block text-sm font-bold text-body mb-2">{t('subscriptionPlans.creditedTokens')}</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={form.creditedTokens}
                    onChange={(event) => setForm((previous) => ({ ...previous, creditedTokens: normalizeNumber(event.target.value) }))}
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
              {t('subscriptionPlans.listTitle', { count: sortedTokenPackages.length })}
            </div>

            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-muted">{t('subscriptionPlans.loading')}</div>
            ) : sortedTokenPackages.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted">{t('subscriptionPlans.empty')}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--gray-100)] border-b border-bd-strong">
                    <tr className="text-left">
                      <th className="px-4 py-3 font-bold text-heading">{t('subscriptionPlans.name')}</th>
                      <th className="px-4 py-3 font-bold text-heading">{t('subscriptionPlans.priceVnd')}</th>
                      <th className="px-4 py-3 font-bold text-heading">{t('subscriptionPlans.creditedTokens')}</th>
                      <th className="px-4 py-3 font-bold text-heading">{t('subscriptionPlans.bonusVnd')}</th>
                      <th className="px-4 py-3 font-bold text-heading">{t('subscriptionPlans.displayOrder')}</th>
                      <th className="px-4 py-3 font-bold text-heading">{t('subscriptionPlans.status')}</th>
                      <th className="px-4 py-3 font-bold text-heading">{t('subscriptionPlans.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTokenPackages.map((tokenPackage) => (
                      <tr key={tokenPackage.tokenPackageId} className="border-b border-bd last:border-b-0">
                        <td className="px-4 py-3">
                          <p className="font-bold text-heading">{tokenPackage.name}</p>
                          <p className="text-xs text-muted mt-1">{tokenPackage.description}</p>
                        </td>
                        <td className="px-4 py-3 text-label">{formatCurrency(tokenPackage.priceVnd)} VND</td>
                        <td className="px-4 py-3 text-label">{formatCurrency(tokenPackage.creditedTokens)} token</td>
                        <td className="px-4 py-3 text-label">+{formatCurrency(tokenPackage.bonusVnd)} VND</td>
                        <td className="px-4 py-3 text-label">{tokenPackage.displayOrder}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 border rounded-sm text-xs font-bold ${tokenPackage.isActive
                            ? 'bg-green-50 text-green-700 border-green-300'
                            : 'bg-gray-100 text-gray-600 border-gray-300'}`}>
                            {tokenPackage.isActive ? t('subscriptionPlans.active') : t('subscriptionPlans.inactive')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onEdit(tokenPackage)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-blue-400 text-status-blue text-xs font-bold hover:bg-status-blue-bg transition-colors cursor-pointer rounded-sm"
                            >
                              <Pencil size={14} />
                              {t('subscriptionPlans.edit')}
                            </button>
                            <button
                              onClick={() => onDelete(tokenPackage)}
                              disabled={deletingId === tokenPackage.tokenPackageId}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-red-400 text-red-700 text-xs font-bold hover:bg-red-50 transition-colors cursor-pointer rounded-sm disabled:opacity-60"
                            >
                              <Trash2 size={14} />
                              {deletingId === tokenPackage.tokenPackageId ? t('subscriptionPlans.deleting') : t('subscriptionPlans.delete')}
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
