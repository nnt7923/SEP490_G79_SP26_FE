import React, { useEffect, useMemo, useState } from 'react'
import Layout from '../../../../components/Layout'
import { useAdminSidebarConfig } from '../components/AdminSideBar'
import { AdminSubscriptionService } from '../../../../services'
import {
  type AdminMentorPackage,
  type AdminTokenPackage,
  type UpsertAdminMentorPackagePayload,
  type UpsertAdminTokenPackagePayload,
} from '../../../../services/AdminSubscriptionService'
import { useTranslation } from 'react-i18next'
import { Package, RefreshCw, Plus, Pencil, Trash2, X } from 'lucide-react'

type NoticeType = 'success' | 'error'
type ShopAdminTab = 'token' | 'mentor'

const defaultTokenForm: UpsertAdminTokenPackagePayload = {
  name: '',
  description: '',
  priceVnd: 0,
  creditedTokens: 0,
  isActive: true,
  displayOrder: 1,
}

const defaultMentorForm: UpsertAdminMentorPackagePayload = {
  name: '',
  description: '',
  priceVnd: 0,
  sharesFromMentorLimit: 0,
  validationRequestLimit: 0,
  taskReviewLimit: 0,
  isActive: true,
  displayOrder: 1,
}

const normalizeNumber = (value: string, fallback = 0): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const normalizeLimit = (value: string, fallback = 0): number => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return parsed
}

const AdminSubscriptionPlansPage: React.FC = () => {
  const { t } = useTranslation('admin')
  const navItems = useAdminSidebarConfig()
  const sidebarConfig = {
    navItems: navItems as any,
    actions: [],
    brand: { name: 'Admin', subtitle: 'Pricing' },
  }

  const [activeTab, setActiveTab] = useState<ShopAdminTab>('token')
  const [tokenPackages, setTokenPackages] = useState<AdminTokenPackage[]>([])
  const [mentorPackages, setMentorPackages] = useState<AdminMentorPackage[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [saving, setSaving] = useState<boolean>(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string>('')
  const [notice, setNotice] = useState<{ type: NoticeType; message: string } | null>(null)

  const [editingTokenId, setEditingTokenId] = useState<string | null>(null)
  const [showTokenForm, setShowTokenForm] = useState<boolean>(false)
  const [tokenForm, setTokenForm] = useState<UpsertAdminTokenPackagePayload>(defaultTokenForm)

  const [editingMentorId, setEditingMentorId] = useState<string | null>(null)
  const [showMentorForm, setShowMentorForm] = useState<boolean>(false)
  const [mentorForm, setMentorForm] = useState<UpsertAdminMentorPackagePayload>(defaultMentorForm)

  const sortedTokenPackages = useMemo(
    () => [...tokenPackages].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name)),
    [tokenPackages],
  )

  const sortedMentorPackages = useMemo(
    () => [...mentorPackages].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name)),
    [mentorPackages],
  )

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN').format(Math.max(0, Math.round(Number(amount) || 0)))
  }

  const renderLimit = (value: number): string => {
    if (value === -1) return t('subscriptionPlans.unlimited', { defaultValue: 'Unlimited' })
    return formatCurrency(value)
  }

  const resetTokenForm = () => {
    setEditingTokenId(null)
    setTokenForm(defaultTokenForm)
    setShowTokenForm(false)
  }

  const resetMentorForm = () => {
    setEditingMentorId(null)
    setMentorForm(defaultMentorForm)
    setShowMentorForm(false)
  }

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const [tokenList, mentorList] = await Promise.all([
        AdminSubscriptionService.getTokenPackages(),
        AdminSubscriptionService.getMentorPackages(),
      ])
      setTokenPackages(tokenList)
      setMentorPackages(mentorList)
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message || t('subscriptionPlans.failedToLoad')
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchData()
  }, [])

  const onCreateOrUpdateToken = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice(null)

    try {
      if (editingTokenId) {
        await AdminSubscriptionService.updateTokenPackage(editingTokenId, tokenForm)
        setNotice({ type: 'success', message: t('subscriptionPlans.updateSuccess') })
      } else {
        await AdminSubscriptionService.createTokenPackage(tokenForm)
        setNotice({ type: 'success', message: t('subscriptionPlans.createSuccess') })
      }
      await fetchData()
      resetTokenForm()
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message || t('subscriptionPlans.saveFailed')
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  const onCreateOrUpdateMentor = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice(null)

    const limits = [mentorForm.sharesFromMentorLimit, mentorForm.validationRequestLimit, mentorForm.taskReviewLimit]
    if (limits.some((item) => item < -1)) {
      setError(t('subscriptionPlans.limitInvalid', { defaultValue: 'Limits must be -1 or greater.' }))
      setSaving(false)
      return
    }

    try {
      if (editingMentorId) {
        await AdminSubscriptionService.updateMentorPackage(editingMentorId, mentorForm)
        setNotice({ type: 'success', message: t('subscriptionPlans.mentorUpdateSuccess', { defaultValue: 'Mentor package updated successfully' }) })
      } else {
        await AdminSubscriptionService.createMentorPackage(mentorForm)
        setNotice({ type: 'success', message: t('subscriptionPlans.mentorCreateSuccess', { defaultValue: 'Mentor package created successfully' }) })
      }
      await fetchData()
      resetMentorForm()
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message || t('subscriptionPlans.mentorSaveFailed', { defaultValue: 'Failed to save mentor package' })
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  const onEditToken = (tokenPackage: AdminTokenPackage) => {
    setEditingTokenId(tokenPackage.tokenPackageId)
    setTokenForm({
      name: tokenPackage.name,
      description: tokenPackage.description,
      priceVnd: tokenPackage.priceVnd,
      creditedTokens: tokenPackage.creditedTokens,
      isActive: tokenPackage.isActive,
      displayOrder: tokenPackage.displayOrder,
    })
    setShowTokenForm(true)
    setActiveTab('token')
    setNotice(null)
    setError('')
  }

  const onEditMentor = (mentorPackage: AdminMentorPackage) => {
    setEditingMentorId(mentorPackage.mentorPackageId)
    setMentorForm({
      name: mentorPackage.name,
      description: mentorPackage.description,
      priceVnd: mentorPackage.priceVnd,
      sharesFromMentorLimit: mentorPackage.sharesFromMentorLimit,
      validationRequestLimit: mentorPackage.validationRequestLimit,
      taskReviewLimit: mentorPackage.taskReviewLimit,
      isActive: mentorPackage.isActive,
      displayOrder: mentorPackage.displayOrder,
    })
    setShowMentorForm(true)
    setActiveTab('mentor')
    setNotice(null)
    setError('')
  }

  const onDeleteToken = async (tokenPackage: AdminTokenPackage) => {
    const accepted = window.confirm(t('subscriptionPlans.deleteConfirm', { name: tokenPackage.name }))
    if (!accepted) return

    setDeletingId(tokenPackage.tokenPackageId)
    setError('')
    setNotice(null)
    try {
      await AdminSubscriptionService.deleteTokenPackage(tokenPackage.tokenPackageId)
      setNotice({ type: 'success', message: t('subscriptionPlans.deleteSuccess') })
      await fetchData()
      if (editingTokenId === tokenPackage.tokenPackageId) {
        resetTokenForm()
      }
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message || t('subscriptionPlans.deleteFailed')
      setError(message)
    } finally {
      setDeletingId(null)
    }
  }

  const onDeleteMentor = async (mentorPackage: AdminMentorPackage) => {
    const accepted = window.confirm(
      t('subscriptionPlans.mentorDeleteConfirm', {
        defaultValue: 'Delete mentor package "{{name}}"? This action cannot be undone.',
        name: mentorPackage.name,
      }),
    )
    if (!accepted) return

    setDeletingId(mentorPackage.mentorPackageId)
    setError('')
    setNotice(null)
    try {
      await AdminSubscriptionService.deleteMentorPackage(mentorPackage.mentorPackageId)
      setNotice({ type: 'success', message: t('subscriptionPlans.mentorDeleteSuccess', { defaultValue: 'Mentor package deleted successfully' }) })
      await fetchData()
      if (editingMentorId === mentorPackage.mentorPackageId) {
        resetMentorForm()
      }
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message || t('subscriptionPlans.mentorDeleteFailed', { defaultValue: 'Failed to delete mentor package' })
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
                  {t('subscriptionPlans.shopTitle', { defaultValue: 'Pricing Management' })}
                </h1>
                <p className="text-muted mt-2">{t('subscriptionPlans.shopSubtitle', { defaultValue: 'Manage token and mentor packages in one place.' })}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => { void fetchData() }}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-blue-600 bg-th-card text-status-blue text-sm font-bold hover:bg-status-blue-bg transition-colors cursor-pointer rounded-sm disabled:opacity-60"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  {t('subscriptionPlans.reload')}
                </button>

                <button
                  onClick={() => {
                    if (activeTab === 'token') {
                      setShowTokenForm((previous) => !previous)
                      if (editingTokenId) {
                        setEditingTokenId(null)
                        setTokenForm(defaultTokenForm)
                      }
                    } else {
                      setShowMentorForm((previous) => !previous)
                      if (editingMentorId) {
                        setEditingMentorId(null)
                        setMentorForm(defaultMentorForm)
                      }
                    }
                    setNotice(null)
                    setError('')
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-green-600 bg-th-card text-green-700 text-sm font-bold hover:bg-green-50 transition-colors cursor-pointer rounded-sm"
                >
                  {(activeTab === 'token' && showTokenForm && !editingTokenId) || (activeTab === 'mentor' && showMentorForm && !editingMentorId) ? <X size={16} /> : <Plus size={16} />}
                  {(activeTab === 'token' && showTokenForm && !editingTokenId) || (activeTab === 'mentor' && showMentorForm && !editingMentorId)
                    ? t('subscriptionPlans.close')
                    : t('subscriptionPlans.addPlan')}
                </button>
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 border border-bd rounded-sm bg-th-card p-1">
            <button
              type="button"
              onClick={() => setActiveTab('token')}
              className={`px-4 py-2 text-sm font-bold rounded-sm transition-colors ${activeTab === 'token'
                ? 'bg-status-blue-solid text-white'
                : 'text-body hover:bg-th-page'}`}
            >
              {t('subscriptionPlans.tokenTab', { defaultValue: 'Token Packages' })}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('mentor')}
              className={`px-4 py-2 text-sm font-bold rounded-sm transition-colors ${activeTab === 'mentor'
                ? 'bg-status-blue-solid text-white'
                : 'text-body hover:bg-th-page'}`}
            >
              {t('subscriptionPlans.mentorTab', { defaultValue: 'Mentor Packages' })}
            </button>
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

          {activeTab === 'token' && showTokenForm ? (
            <form onSubmit={onCreateOrUpdateToken} className="bg-th-card border border-bd-strong p-5 space-y-4">
              <h2 className="text-lg font-bold text-heading">
                {editingTokenId ? t('subscriptionPlans.editPlan') : t('subscriptionPlans.createPlan')}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-body mb-2">{t('subscriptionPlans.name')}</label>
                  <input
                    required
                    value={tokenForm.name}
                    onChange={(event) => setTokenForm((previous) => ({ ...previous, name: event.target.value }))}
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
                    value={tokenForm.priceVnd}
                    onChange={(event) => setTokenForm((previous) => ({ ...previous, priceVnd: normalizeNumber(event.target.value) }))}
                    className="w-full px-3 py-2 border border-bd-input bg-white text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-body mb-2">{t('subscriptionPlans.creditedTokens')}</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={tokenForm.creditedTokens}
                    onChange={(event) => setTokenForm((previous) => ({ ...previous, creditedTokens: normalizeNumber(event.target.value) }))}
                    className="w-full px-3 py-2 border border-bd-input bg-white text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-body mb-2">{t('subscriptionPlans.displayOrder')}</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={tokenForm.displayOrder}
                    onChange={(event) => setTokenForm((previous) => ({ ...previous, displayOrder: normalizeNumber(event.target.value, 1) }))}
                    className="w-full px-3 py-2 border border-bd-input bg-white text-sm focus:outline-none"
                  />
                </div>

                <div className="flex items-end">
                  <label className="inline-flex items-center gap-2 text-sm text-body font-bold">
                    <input
                      type="checkbox"
                      checked={tokenForm.isActive}
                      onChange={(event) => setTokenForm((previous) => ({ ...previous, isActive: event.target.checked }))}
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
                  value={tokenForm.description}
                  onChange={(event) => setTokenForm((previous) => ({ ...previous, description: event.target.value }))}
                  className="w-full px-3 py-2 border border-bd-input bg-white text-sm focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className={`px-4 py-2 border text-white text-sm font-bold transition-colors cursor-pointer rounded-sm disabled:opacity-60 ${editingTokenId
                    ? 'border-indigo-600 bg-indigo-600 hover:bg-indigo-700'
                    : 'border-blue-600 bg-status-blue-solid hover:bg-blue-700'}`}
                >
                  {saving ? t('subscriptionPlans.saving') : editingTokenId ? t('subscriptionPlans.update') : t('subscriptionPlans.create')}
                </button>

                <button
                  type="button"
                  onClick={resetTokenForm}
                  className="px-4 py-2 border border-bd-strong bg-th-card text-sm font-bold text-label hover:bg-th-page transition-colors cursor-pointer rounded-sm"
                >
                  {t('subscriptionPlans.cancel')}
                </button>
              </div>
            </form>
          ) : null}

          {activeTab === 'mentor' && showMentorForm ? (
            <form onSubmit={onCreateOrUpdateMentor} className="bg-th-card border border-bd-strong p-5 space-y-4">
              <h2 className="text-lg font-bold text-heading">
                {editingMentorId
                  ? t('subscriptionPlans.mentorEditPlan', { defaultValue: 'Edit mentor package' })
                  : t('subscriptionPlans.mentorCreatePlan', { defaultValue: 'Create mentor package' })}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-body mb-2">{t('subscriptionPlans.name')}</label>
                  <input
                    required
                    value={mentorForm.name}
                    onChange={(event) => setMentorForm((previous) => ({ ...previous, name: event.target.value }))}
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
                    value={mentorForm.priceVnd}
                    onChange={(event) => setMentorForm((previous) => ({ ...previous, priceVnd: normalizeNumber(event.target.value) }))}
                    className="w-full px-3 py-2 border border-bd-input bg-white text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-body mb-2">{t('subscriptionPlans.mentorSharesFromMentorLimit', { defaultValue: 'Shares from mentor limit' })}</label>
                  <input
                    type="number"
                    min={-1}
                    required
                    value={mentorForm.sharesFromMentorLimit}
                    onChange={(event) => setMentorForm((previous) => ({ ...previous, sharesFromMentorLimit: normalizeLimit(event.target.value) }))}
                    className="w-full px-3 py-2 border border-bd-input bg-white text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-body mb-2">{t('subscriptionPlans.mentorValidationRequestLimit', { defaultValue: 'Validation request limit' })}</label>
                  <input
                    type="number"
                    min={-1}
                    required
                    value={mentorForm.validationRequestLimit}
                    onChange={(event) => setMentorForm((previous) => ({ ...previous, validationRequestLimit: normalizeLimit(event.target.value) }))}
                    className="w-full px-3 py-2 border border-bd-input bg-white text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-body mb-2">{t('subscriptionPlans.mentorTaskReviewLimit', { defaultValue: 'Task review limit' })}</label>
                  <input
                    type="number"
                    min={-1}
                    required
                    value={mentorForm.taskReviewLimit}
                    onChange={(event) => setMentorForm((previous) => ({ ...previous, taskReviewLimit: normalizeLimit(event.target.value) }))}
                    className="w-full px-3 py-2 border border-bd-input bg-white text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-body mb-2">{t('subscriptionPlans.displayOrder')}</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={mentorForm.displayOrder}
                    onChange={(event) => setMentorForm((previous) => ({ ...previous, displayOrder: normalizeNumber(event.target.value, 1) }))}
                    className="w-full px-3 py-2 border border-bd-input bg-white text-sm focus:outline-none"
                  />
                </div>

                <div className="flex items-end">
                  <label className="inline-flex items-center gap-2 text-sm text-body font-bold">
                    <input
                      type="checkbox"
                      checked={mentorForm.isActive}
                      onChange={(event) => setMentorForm((previous) => ({ ...previous, isActive: event.target.checked }))}
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
                  value={mentorForm.description}
                  onChange={(event) => setMentorForm((previous) => ({ ...previous, description: event.target.value }))}
                  className="w-full px-3 py-2 border border-bd-input bg-white text-sm focus:outline-none"
                />
              </div>

              <div className="text-xs text-muted">
                {t('subscriptionPlans.limitHint', { defaultValue: 'Set -1 for unlimited.' })}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className={`px-4 py-2 border text-white text-sm font-bold transition-colors cursor-pointer rounded-sm disabled:opacity-60 ${editingMentorId
                    ? 'border-indigo-600 bg-indigo-600 hover:bg-indigo-700'
                    : 'border-blue-600 bg-status-blue-solid hover:bg-blue-700'}`}
                >
                  {saving
                    ? t('subscriptionPlans.saving')
                    : editingMentorId
                      ? t('subscriptionPlans.update')
                      : t('subscriptionPlans.create')}
                </button>

                <button
                  type="button"
                  onClick={resetMentorForm}
                  className="px-4 py-2 border border-bd-strong bg-th-card text-sm font-bold text-label hover:bg-th-page transition-colors cursor-pointer rounded-sm"
                >
                  {t('subscriptionPlans.cancel')}
                </button>
              </div>
            </form>
          ) : null}

          <div className="bg-th-card border border-bd-strong overflow-hidden">
            <div className="px-4 py-3 border-b border-bd text-sm font-bold text-heading">
              {activeTab === 'token'
                ? t('subscriptionPlans.listTitle', { count: sortedTokenPackages.length })
                : t('subscriptionPlans.mentorListTitle', { defaultValue: 'Mentor packages: {{count}}', count: sortedMentorPackages.length })}
            </div>

            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-muted">{t('subscriptionPlans.loading')}</div>
            ) : activeTab === 'token' && sortedTokenPackages.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted">{t('subscriptionPlans.empty')}</div>
            ) : activeTab === 'mentor' && sortedMentorPackages.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted">{t('subscriptionPlans.mentorEmpty', { defaultValue: 'No mentor packages found' })}</div>
            ) : (
              <div className="overflow-x-auto">
                {activeTab === 'token' ? (
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--gray-100)] border-b border-bd-strong">
                      <tr className="text-left">
                        <th className="px-4 py-3 font-bold text-heading">{t('subscriptionPlans.name')}</th>
                        <th className="px-4 py-3 font-bold text-heading">{t('subscriptionPlans.priceVnd')}</th>
                        <th className="px-4 py-3 font-bold text-heading">{t('subscriptionPlans.creditedTokens')}</th>
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
                                onClick={() => onEditToken(tokenPackage)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-blue-400 text-status-blue text-xs font-bold hover:bg-status-blue-bg transition-colors cursor-pointer rounded-sm"
                              >
                                <Pencil size={14} />
                                {t('subscriptionPlans.edit')}
                              </button>
                              <button
                                onClick={() => onDeleteToken(tokenPackage)}
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
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--gray-100)] border-b border-bd-strong">
                      <tr className="text-left">
                        <th className="px-4 py-3 font-bold text-heading">{t('subscriptionPlans.name')}</th>
                        <th className="px-4 py-3 font-bold text-heading">{t('subscriptionPlans.priceVnd')}</th>
                        <th className="px-4 py-3 font-bold text-heading">{t('subscriptionPlans.mentorSharesFromMentorLimit', { defaultValue: 'Share limit' })}</th>
                        <th className="px-4 py-3 font-bold text-heading">{t('subscriptionPlans.mentorValidationRequestLimit', { defaultValue: 'Max rejections' })}</th>
                        <th className="px-4 py-3 font-bold text-heading">{t('subscriptionPlans.mentorTaskReviewLimit', { defaultValue: 'Task review limit' })}</th>
                        <th className="px-4 py-3 font-bold text-heading">{t('subscriptionPlans.displayOrder')}</th>
                        <th className="px-4 py-3 font-bold text-heading">{t('subscriptionPlans.status')}</th>
                        <th className="px-4 py-3 font-bold text-heading">{t('subscriptionPlans.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedMentorPackages.map((mentorPackage) => (
                        <tr key={mentorPackage.mentorPackageId} className="border-b border-bd last:border-b-0">
                          <td className="px-4 py-3">
                            <p className="font-bold text-heading">{mentorPackage.name}</p>
                            <p className="text-xs text-muted mt-1">{mentorPackage.description}</p>
                          </td>
                          <td className="px-4 py-3 text-label">{formatCurrency(mentorPackage.priceVnd)} VND</td>
                          <td className="px-4 py-3 text-label">{renderLimit(mentorPackage.sharesFromMentorLimit)}</td>
                          <td className="px-4 py-3 text-label">{renderLimit(mentorPackage.validationRequestLimit)}</td>
                          <td className="px-4 py-3 text-label">{renderLimit(mentorPackage.taskReviewLimit)}</td>
                          <td className="px-4 py-3 text-label">{mentorPackage.displayOrder}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 border rounded-sm text-xs font-bold ${mentorPackage.isActive
                              ? 'bg-green-50 text-green-700 border-green-300'
                              : 'bg-gray-100 text-gray-600 border-gray-300'}`}>
                              {mentorPackage.isActive ? t('subscriptionPlans.active') : t('subscriptionPlans.inactive')}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => onEditMentor(mentorPackage)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-blue-400 text-status-blue text-xs font-bold hover:bg-status-blue-bg transition-colors cursor-pointer rounded-sm"
                              >
                                <Pencil size={14} />
                                {t('subscriptionPlans.edit')}
                              </button>
                              <button
                                onClick={() => onDeleteMentor(mentorPackage)}
                                disabled={deletingId === mentorPackage.mentorPackageId}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-red-400 text-red-700 text-xs font-bold hover:bg-red-50 transition-colors cursor-pointer rounded-sm disabled:opacity-60"
                              >
                                <Trash2 size={14} />
                                {deletingId === mentorPackage.mentorPackageId ? t('subscriptionPlans.deleting') : t('subscriptionPlans.delete')}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default AdminSubscriptionPlansPage
