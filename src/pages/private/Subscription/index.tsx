import React, { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Coins, Crown, Loader2, Wallet } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import Layout from '../../../components/Layout'
import { useStudentSidebarConfig } from '../Student/components/StudentSideBar'
import SubscriptionService, {
  type CreateVnpayPaymentRequest,
  type MentorPackage,
  type StudentMentorQuota,
  type TokenPackage,
  type TokenTopUpPricing,
} from '../../../services/SubscriptionService'
import ROUTER from '../../../router/ROUTER'
import useAuthStore from '../../../store/useAuthStore'
import { UserService } from '../../../services'

type ShopTab = 'token' | 'mentor'

const defaultMentorQuota: StudentMentorQuota = {
  subscriptionId: null,
  packageId: null,
  packageName: null,
  hasActiveSubscription: false,
  sharesFromMentorLimit: 0,
  sharesFromMentorUsed: 0,
  sharesFromMentorRemaining: 0,
  validationRequestLimit: 0,
  validationRequestsUsed: 0,
  validationRequestsRemaining: 0,
  taskReviewLimit: 0,
  taskReviewsUsed: 0,
  taskReviewsRemaining: 0,
}

const Subscription: React.FC = () => {
  const { t, i18n } = useTranslation('student')
  const navigate = useNavigate()
  const location = useLocation()
  const { user, setUser } = useAuthStore()
  const navItems = useStudentSidebarConfig()
  const sidebarConfig = useMemo(() => ({
    navItems,
    actions: [],
    brand: { name: 'Pricing', subtitle: 'Student' },
  }), [navItems])

  const [activeTab, setActiveTab] = useState<ShopTab>('token')
  const [tokenPackages, setTokenPackages] = useState<TokenPackage[]>([])
  const [mentorPackages, setMentorPackages] = useState<MentorPackage[]>([])
  const [mentorQuota, setMentorQuota] = useState<StudentMentorQuota>(defaultMentorQuota)
  const [loadingPackages, setLoadingPackages] = useState(true)
  const [loadingQuota, setLoadingQuota] = useState(true)
  const [loadingBalance, setLoadingBalance] = useState(true)
  const [balanceVnd, setBalanceVnd] = useState<number>(0)
  const [topUpPricing, setTopUpPricing] = useState<TokenTopUpPricing | null>(null)
  const [processingKey, setProcessingKey] = useState<string | null>(null)
  const [customTopUpAmount, setCustomTopUpAmount] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    const requestedTab = new URLSearchParams(location.search).get('tab')
    if (requestedTab === 'mentor' || requestedTab === 'token') {
      setActiveTab(requestedTab)
    }
  }, [location.search])

  useEffect(() => {
    const fetchShopData = async () => {
      try {
        const [tokenPackagesResponse, topupPricingResponse, mentorPackagesResponse, mentorQuotaResponse] = await Promise.allSettled([
          SubscriptionService.getTokenPackages(),
          SubscriptionService.getTokenTopUpPricing(),
          SubscriptionService.getMentorPackages(),
          SubscriptionService.getMentorQuota(),
        ])

        const tokenData = tokenPackagesResponse.status === 'fulfilled' ? tokenPackagesResponse.value : []
        const mentorData = mentorPackagesResponse.status === 'fulfilled' ? mentorPackagesResponse.value : []

        setTokenPackages(
          Array.isArray(tokenData)
            ? [...tokenData].filter((item) => item.isActive).sort((left, right) => left.displayOrder - right.displayOrder)
            : [],
        )
        setMentorPackages(
          Array.isArray(mentorData)
            ? [...mentorData].filter((item) => item.isActive).sort((left, right) => left.displayOrder - right.displayOrder)
            : [],
        )

        if (topupPricingResponse.status === 'fulfilled') {
          setTopUpPricing(topupPricingResponse.value)
        } else {
          setTopUpPricing(null)
        }

        if (mentorQuotaResponse.status === 'fulfilled') {
          setMentorQuota(mentorQuotaResponse.value)
        } else {
          setMentorQuota(defaultMentorQuota)
        }

        const firstRejected = [tokenPackagesResponse, topupPricingResponse, mentorPackagesResponse, mentorQuotaResponse]
          .find((entry) => entry.status === 'rejected') as PromiseRejectedResult | undefined
        if (firstRejected) {
          setErrorMessage(String(firstRejected.reason?.message || t('subscription.shopPartialLoadWarning', { defaultValue: 'Some shop data could not be loaded.' })))
        }
      } catch (error: any) {
        setTokenPackages([])
        setMentorPackages([])
        setTopUpPricing(null)
        setMentorQuota(defaultMentorQuota)
        setErrorMessage(error?.message || t('subscription.shopLoadFailed', { defaultValue: 'Unable to load shop data.' }))
      } finally {
        setLoadingPackages(false)
        setLoadingQuota(false)
      }
    }

    void fetchShopData()
  }, [t])

  useEffect(() => {
    const readBalance = (source: any): number => {
      const value = Number(source?.tokenBalance ?? source?.BalanceVnd ?? source?.balanceVnd ?? source?.walletBalanceVnd)
      return Number.isFinite(value) ? value : 0
    }

    const fetchBalance = async () => {
      try {
        const profileRaw = await UserService.getProfile()
        const profile = profileRaw?.data ?? profileRaw
        const latestBalance = readBalance(profile)
        setBalanceVnd(latestBalance)
        if (profile) {
          setUser({ ...(user ?? {}), ...profile } as any)
        }
      } catch {
        setBalanceVnd(readBalance(user))
      } finally {
        setLoadingBalance(false)
      }
    }

    void fetchBalance()
  }, [setUser, user])

  const formatCurrency = (amountVnd: number) => new Intl.NumberFormat('vi-VN').format(Math.round(Number(amountVnd) || 0))

  const formatNumber = (value: number) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 }).format(Number.isFinite(value) ? value : 0)

  const customTopUpAmountNumber = Number(customTopUpAmount.replace(/[\D]/g, ''))
  const customTopUpEstimatedTokens = (() => {
    if (!topUpPricing) return 0
    if (!Number.isFinite(customTopUpAmountNumber) || customTopUpAmountNumber <= 0) return 0
    if (topUpPricing.tokensPer1000Vnd > 0) return (customTopUpAmountNumber / 1000) * topUpPricing.tokensPer1000Vnd
    if (topUpPricing.vndPerToken > 0) return customTopUpAmountNumber / topUpPricing.vndPerToken
    return 0
  })()

  const toNumber = (value: unknown): number => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  const createPayment = async (
    payload: CreateVnpayPaymentRequest,
    processingId: string,
    source: 'token' | 'mentor',
  ) => {
    if (processingKey) return

    try {
      setErrorMessage('')
      setProcessingKey(processingId)
      const callbackPath = ROUTER.BILLING_RESULT
      const returnUrl = `${window.location.origin}${callbackPath}?source=${source}`
      const paymentResponse = await SubscriptionService.createVnpayPayment({ ...payload, returnUrl })

      const paymentUrl =
        (paymentResponse?.paymentUrl as string | undefined)
        || (paymentResponse?.payUrl as string | undefined)
        || (paymentResponse?.url as string | undefined)
        || (paymentResponse?.data as { paymentUrl?: string; payUrl?: string; url?: string } | undefined)?.paymentUrl
        || (paymentResponse?.data as { paymentUrl?: string; payUrl?: string; url?: string } | undefined)?.payUrl
        || (paymentResponse?.data as { paymentUrl?: string; payUrl?: string; url?: string } | undefined)?.url

      if (!paymentUrl) {
        throw new Error('Payment URL not found in response')
      }

      window.location.href = paymentUrl
    } catch (error: any) {
      setErrorMessage(error?.message || t('subscription.createPaymentFailed'))
      setProcessingKey(null)
    }
  }

  const handleBuyTokenPackage = async (pack: TokenPackage) => {
    if (pack.priceVnd <= 0) return
    await createPayment({ tokenPackageId: pack.tokenPackageId, orderInfo: pack.name, returnUrl: '' }, `token-package:${pack.tokenPackageId}`, 'token')
  }

  const handleBuyMentorPackage = async (pack: MentorPackage) => {
    if (pack.priceVnd <= 0) return
    await createPayment({ mentorPackageId: pack.mentorPackageId, orderInfo: pack.name, returnUrl: '' }, `mentor-package:${pack.mentorPackageId}`, 'mentor')
  }

  const handleCustomTopUp = async () => {
    const amount = Number(customTopUpAmount.replace(/[\D]/g, ''))
    if (!Number.isFinite(amount) || amount <= 0) {
      setErrorMessage(t('subscription.invalidTopUpAmount'))
      return
    }

    if (topUpPricing?.minimumTopUpVnd && amount < topUpPricing.minimumTopUpVnd) {
      setErrorMessage(t('subscription.invalidTopUpAmountMin', { min: formatCurrency(topUpPricing.minimumTopUpVnd) }))
      return
    }

    if (topUpPricing?.maximumTopUpVnd && amount > topUpPricing.maximumTopUpVnd) {
      setErrorMessage(t('subscription.invalidTopUpAmountMax', { max: formatCurrency(topUpPricing.maximumTopUpVnd) }))
      return
    }

    await createPayment({ topUpAmountVnd: amount, orderInfo: t('subscription.customTopUpOrderInfo'), returnUrl: '' }, 'custom-topup', 'token')
  }

  const calculateRemaining = (limit: number, used: number) => {
    if (limit === -1) return -1
    return Math.max(0, limit - Math.max(0, used))
  }

  const remainingShares = calculateRemaining(mentorQuota.sharesFromMentorLimit, mentorQuota.sharesFromMentorUsed)
  const remainingValidationRequests = calculateRemaining(mentorQuota.validationRequestLimit, mentorQuota.validationRequestsUsed)
  const remainingTaskReviews = calculateRemaining(mentorQuota.taskReviewLimit, mentorQuota.taskReviewsUsed)

  const formatRemainingQuota = (value: number) => (
    value === -1
      ? t('subscription.unlimitedLabel', { defaultValue: 'Unlimited' })
      : formatCurrency(value)
  )
  const isVietnamese = String(i18n.resolvedLanguage || i18n.language || 'en').toLowerCase().startsWith('vi')

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
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
              {t('subscription.currentBalanceLabel')}
            </div>
            <div style={{ fontSize: 20, color: 'var(--text-primary)', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Wallet size={18} color="var(--accent-primary)" />
              {loadingBalance ? t('subscription.loadingBalance') : `${formatCurrency(balanceVnd)} token`}
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate(ROUTER.BILLING_HISTORY)}
            style={{
              borderRadius: 8,
              border: '1px solid var(--border-base)',
              background: 'var(--bg-main)',
              color: 'var(--text-primary)',
              padding: '8px 12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t('subscription.transactionHistoryBtn')}
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            border: '1px solid var(--border-base)',
            borderRadius: 10,
            padding: 16,
            marginBottom: 16,
            background: 'var(--bg-surface)',
            display: 'grid',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Crown size={20} color="var(--accent-primary)" />
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              {t('subscription.shopTitle', { defaultValue: t('subscription.title') })}
            </h1>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>
            {t('subscription.shopSubtitle', { defaultValue: t('subscription.subtitle') })}
          </p>
          <div
            style={{
              border: '1px dashed var(--border-base)',
              borderRadius: 8,
              padding: 12,
              background: 'var(--bg-main)',
              display: 'grid',
              gap: 6,
            }}
          >
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {t('subscription.mentorQuotaPackageLabel', { defaultValue: 'Mentor package' })}:{' '}
              <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                {loadingQuota
                  ? t('subscription.loading', { defaultValue: 'Loading...' })
                  : mentorQuota.hasActiveSubscription
                    ? (mentorQuota.packageName || t('subscription.mentorQuotaUnknownPackage', { defaultValue: 'Active package' }))
                    : t('subscription.mentorQuotaNotActive', { defaultValue: 'No active mentor package' })}
              </span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {t('subscription.mentorQuotaShareRemainingLabel', { defaultValue: 'Learning path share left' })}:{' '}
              <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                {loadingQuota
                  ? '--'
                  : `${formatRemainingQuota(remainingShares)}${(!isVietnamese && remainingShares !== -1) ? ' share' : ''}`}
              </span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {t('subscription.mentorQuotaValidationRemainingLabel', { defaultValue: 'Learning path validations left' })}:{' '}
              <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                {loadingQuota ? '--' : formatRemainingQuota(remainingValidationRequests)}
              </span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {t('subscription.mentorQuotaTaskReviewRemainingLabel', { defaultValue: 'Task reviews left' })}:{' '}
              <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                {loadingQuota ? '--' : formatRemainingQuota(remainingTaskReviews)}
              </span>
            </div>
          </div>
        </motion.div>

        <div
          style={{
            border: '1px solid var(--border-base)',
            borderRadius: 10,
            background: 'var(--bg-surface)',
            padding: 6,
            marginBottom: 16,
            display: 'inline-flex',
            gap: 6,
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('token')}
            style={{
              borderRadius: 8,
              border: '1px solid var(--border-base)',
              background: activeTab === 'token' ? 'var(--accent-primary)' : 'var(--bg-main)',
              color: activeTab === 'token' ? 'var(--bg-surface)' : 'var(--text-primary)',
              padding: '8px 12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {t('subscription.shopTabToken', { defaultValue: 'Top Up Tokens' })}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mentor')}
            style={{
              borderRadius: 8,
              border: '1px solid var(--border-base)',
              background: activeTab === 'mentor' ? 'var(--accent-primary)' : 'var(--bg-main)',
              color: activeTab === 'mentor' ? 'var(--bg-surface)' : 'var(--text-primary)',
              padding: '8px 12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {t('subscription.shopTabMentor', { defaultValue: 'Mentor Packages' })}
          </button>
        </div>

        {errorMessage ? (
          <div
            style={{
              border: '1px solid var(--danger-primary)',
              borderRadius: 10,
              background: 'color-mix(in oklab, var(--danger-primary) 8%, var(--bg-surface))',
              color: 'var(--danger-primary)',
              padding: '10px 12px',
              marginBottom: 16,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {errorMessage}
          </div>
        ) : null}

        {activeTab === 'token' ? (
          <>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              style={{
                border: '1px solid var(--border-base)',
                borderRadius: 10,
                padding: 16,
                marginBottom: 16,
                background: 'var(--bg-surface)',
              }}
            >
              <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 700, marginBottom: 8 }}>
                {t('subscription.customTopUpTitle')}
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  type="text"
                  value={customTopUpAmount}
                  onChange={(event) => setCustomTopUpAmount(event.target.value)}
                  placeholder={t('subscription.customTopUpPlaceholder')}
                  style={{
                    minWidth: 260,
                    flex: 1,
                    border: '1px solid var(--border-base)',
                    borderRadius: 8,
                    background: 'var(--bg-main)',
                    color: 'var(--text-primary)',
                    padding: '10px 12px',
                    fontSize: 14,
                  }}
                />
                <button
                  type="button"
                  onClick={handleCustomTopUp}
                  disabled={Boolean(processingKey)}
                  style={{
                    borderRadius: 8,
                    border: '1px solid var(--accent-primary)',
                    background: 'var(--accent-primary)',
                    color: 'var(--bg-surface)',
                    padding: '10px 14px',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: processingKey ? 'not-allowed' : 'pointer',
                  }}
                >
                  {processingKey === 'custom-topup' ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  {processingKey === 'custom-topup' ? t('subscription.processingPayment') : t('subscription.topUpNow')}
                </button>
              </div>
              {topUpPricing ? (
                <div style={{ marginTop: 8, color: 'var(--text-secondary)', fontSize: 12, display: 'grid', gap: 4 }}>
                  <div>
                    {t('subscription.customTopUpConversionRate', {
                      vndPerToken: formatCurrency(topUpPricing.vndPerToken),
                      tokensPer1000Vnd: formatNumber(topUpPricing.tokensPer1000Vnd),
                    })}
                  </div>
                  <div>
                    {t('subscription.customTopUpRange', {
                      min: formatCurrency(topUpPricing.minimumTopUpVnd),
                      max: formatCurrency(topUpPricing.maximumTopUpVnd),
                    })}
                  </div>
                  {customTopUpAmountNumber > 0 ? (
                    <div
                      style={{
                        marginTop: 4,
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: '1px solid color-mix(in oklab, var(--accent-primary) 60%, var(--border-base))',
                        background: 'color-mix(in oklab, var(--accent-primary) 12%, var(--bg-surface))',
                        color: 'var(--text-primary)',
                        fontWeight: 700,
                      }}
                    >
                      {t('subscription.customTopUpRealtimeEstimate', {
                        amountVnd: formatCurrency(customTopUpAmountNumber),
                        tokens: formatNumber(customTopUpEstimatedTokens),
                      })}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </motion.div>

            {loadingPackages ? (
              <div
                style={{
                  border: '1px solid var(--border-base)',
                  borderRadius: 10,
                  background: 'var(--bg-surface)',
                  minHeight: 220,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  color: 'var(--text-secondary)',
                }}
              >
                <Loader2 size={18} className="animate-spin" />
                <span>{t('subscription.loadingTokenPackages')}</span>
              </div>
            ) : tokenPackages.length === 0 ? (
              <div
                style={{
                  border: '1px solid var(--border-base)',
                  borderRadius: 10,
                  background: 'var(--bg-surface)',
                  minHeight: 220,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary)',
                }}
              >
                {t('subscription.noTokenPackages')}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                {tokenPackages.map((pack, index) => {
                  const priceVnd = toNumber(pack.priceVnd)
                  const creditedTokens = toNumber(pack.creditedTokens)
                  const bonusVnd = Math.max(0, creditedTokens - priceVnd)
                  const isButtonDisabled = Boolean(processingKey) || pack.priceVnd <= 0
                  const isProcessing = processingKey === `token-package:${pack.tokenPackageId}`

                  return (
                    <motion.div
                      key={pack.tokenPackageId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ y: -4, scale: 1.01 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      style={{
                        border: '1px solid var(--border-base)',
                        borderRadius: 12,
                        background: 'var(--bg-surface)',
                        padding: 16,
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: 320,
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 10 }}>
                        <h2 style={{ margin: 0, fontSize: 22, color: 'var(--text-primary)', fontWeight: 700 }}>{pack.name}</h2>
                        {bonusVnd > 0 ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '4px 8px',
                              borderRadius: 999,
                              background: 'var(--success-primary)',
                              color: 'var(--bg-surface)',
                            }}
                          >
                            +{formatCurrency(bonusVnd)} VND {t('subscription.bonusBadge')}
                          </span>
                        ) : null}
                      </div>

                      <div style={{ marginBottom: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
                          <span style={{ fontSize: 30, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                            {formatCurrency(priceVnd)}
                          </span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: 13, paddingBottom: 3 }}>VND</span>
                        </div>
                      </div>

                      <p style={{ margin: '0 0 14px', color: 'var(--text-secondary)', minHeight: 40, fontSize: 13, flex: 1 }}>
                        {pack.description || t('subscription.defaultPackageDescription')}
                      </p>

                      <div
                        style={{
                          marginBottom: 14,
                          paddingTop: 10,
                          borderTop: '1px dashed var(--border-base)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                          <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                            {t('subscription.creditedTokensLabel')}
                          </span>
                          <span style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 700 }}>
                            {formatCurrency(creditedTokens)} token
                          </span>
                        </div>

                        {bonusVnd > 0 ? (
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                              {t('subscription.bonusVndLabel')}
                            </span>
                            <span style={{ color: 'var(--success-primary)', fontSize: 14, fontWeight: 800 }}>
                              +{formatCurrency(bonusVnd)} VND
                            </span>
                          </div>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleBuyTokenPackage(pack)}
                        disabled={isButtonDisabled}
                        style={{
                          width: '100%',
                          borderRadius: 8,
                          padding: '10px 12px',
                          border: '1px solid var(--accent-primary)',
                          background: 'var(--accent-primary)',
                          color: 'var(--bg-surface)',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          cursor: isButtonDisabled ? 'not-allowed' : 'pointer',
                          opacity: isButtonDisabled ? 0.85 : 1,
                        }}
                      >
                        {isProcessing ? t('subscription.processingPayment') : t('subscription.topUpNow')}
                        {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                      </button>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </>
        ) : (
          <>
            {loadingPackages ? (
              <div
                style={{
                  border: '1px solid var(--border-base)',
                  borderRadius: 10,
                  background: 'var(--bg-surface)',
                  minHeight: 220,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  color: 'var(--text-secondary)',
                }}
              >
                <Loader2 size={18} className="animate-spin" />
                <span>{t('subscription.loadingMentorPackages', { defaultValue: 'Loading mentor packages...' })}</span>
              </div>
            ) : mentorPackages.length === 0 ? (
              <div
                style={{
                  border: '1px solid var(--border-base)',
                  borderRadius: 10,
                  background: 'var(--bg-surface)',
                  minHeight: 220,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary)',
                }}
              >
                {t('subscription.noMentorPackages', { defaultValue: 'No mentor packages are available right now.' })}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                {mentorPackages.map((pack, index) => {
                  const isProcessing = processingKey === `mentor-package:${pack.mentorPackageId}`
                  const isButtonDisabled = Boolean(processingKey) || pack.priceVnd <= 0
                  const formatLimit = (value: number) => {
                    if (value === -1) {
                      return t('subscription.unlimitedLabel', { defaultValue: 'Unlimited' })
                    }
                    return formatCurrency(value)
                  }

                  return (
                    <motion.div
                      key={pack.mentorPackageId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ y: -4, scale: 1.01 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      style={{
                        border: '1px solid var(--border-base)',
                        borderRadius: 12,
                        background: 'var(--bg-surface)',
                        padding: 16,
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: 320,
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 10 }}>
                        <h2 style={{ margin: 0, fontSize: 22, color: 'var(--text-primary)', fontWeight: 700 }}>{pack.name}</h2>
                        <Coins size={18} color="var(--accent-primary)" />
                      </div>

                      <div style={{ marginBottom: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
                          <span style={{ fontSize: 30, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                            {formatCurrency(pack.priceVnd)}
                          </span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: 13, paddingBottom: 3 }}>VND</span>
                        </div>
                      </div>

                      <p style={{ margin: '0 0 14px', color: 'var(--text-secondary)', minHeight: 40, fontSize: 13, flex: 1 }}>
                        {pack.description || t('subscription.defaultMentorPackageDescription', { defaultValue: 'Mentor package for learning-path share and review limits.' })}
                      </p>

                      <div
                        style={{
                          marginBottom: 14,
                          paddingTop: 10,
                          borderTop: '1px dashed var(--border-base)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                          <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                            {t('subscription.mentorSharesLimitLabel', { defaultValue: 'Share requests' })}
                          </span>
                          <span style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 700 }}>{formatLimit(pack.sharesFromMentorLimit)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                          <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                            {t('subscription.mentorValidationLimitLabel', { defaultValue: 'Max rejections' })}
                          </span>
                          <span style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 700 }}>{formatLimit(pack.validationRequestLimit)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                          <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                            {t('subscription.mentorTaskReviewLimitLabel', { defaultValue: 'Task reviews' })}
                          </span>
                          <span style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 700 }}>{formatLimit(pack.taskReviewLimit)}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleBuyMentorPackage(pack)}
                        disabled={isButtonDisabled}
                        style={{
                          width: '100%',
                          borderRadius: 8,
                          padding: '10px 12px',
                          border: '1px solid var(--accent-primary)',
                          background: 'var(--accent-primary)',
                          color: 'var(--bg-surface)',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          cursor: isButtonDisabled ? 'not-allowed' : 'pointer',
                          opacity: isButtonDisabled ? 0.85 : 1,
                        }}
                      >
                        {isProcessing ? t('subscription.processingPayment') : t('subscription.buyMentorPackageNow', { defaultValue: 'Buy now' })}
                        {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                      </button>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}

export default Subscription
