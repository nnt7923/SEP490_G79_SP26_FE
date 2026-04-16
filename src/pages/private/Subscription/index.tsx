import React, { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Coins, Loader2, Wallet } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import Layout from '../../../components/Layout'
import { useStudentSidebarConfig } from '../Student/components/StudentSideBar'
import SubscriptionService, {
  type CreateVnpayPaymentRequest,
  type TokenPackage,
  type TokenTopUpPricing,
} from '../../../services/SubscriptionService'
import ROUTER from '../../../router/ROUTER'
import useAuthStore from '../../../store/useAuthStore'
import { UserService } from '../../../services'

const Subscription: React.FC = () => {
  const { t } = useTranslation('student')
  const navigate = useNavigate()
  const { user, setUser } = useAuthStore()
  const navItems = useStudentSidebarConfig()
  const sidebarConfig = useMemo(() => ({
    navItems,
    actions: [],
    brand: { name: 'Token', subtitle: 'Student' },
  }), [navItems])

  const [tokenPackages, setTokenPackages] = useState<TokenPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingBalance, setLoadingBalance] = useState(true)
  const [balanceVnd, setBalanceVnd] = useState<number>(0)
  const [topUpPricing, setTopUpPricing] = useState<TokenTopUpPricing | null>(null)
  const [processingKey, setProcessingKey] = useState<string | null>(null)
  const [customTopUpAmount, setCustomTopUpAmount] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    const fetchTokenPackages = async () => {
      try {
        const [packagesResponse, pricingResponse] = await Promise.allSettled([
          SubscriptionService.getTokenPackages(),
          SubscriptionService.getTokenTopUpPricing(),
        ])

        const data = packagesResponse.status === 'fulfilled' ? packagesResponse.value : []
        if (Array.isArray(data)) {
          const sorted = [...data]
            .filter((item) => item.isActive)
            .sort((left, right) => left.displayOrder - right.displayOrder)
          setTokenPackages(sorted)
        } else {
          setTokenPackages([])
        }

        if (pricingResponse.status === 'fulfilled') {
          setTopUpPricing(pricingResponse.value)
        } else {
          setTopUpPricing(null)
        }
      } catch (error: any) {
        setTokenPackages([])
        setTopUpPricing(null)
        setErrorMessage(error?.message || t('subscription.tokenPackagesLoadFailed'))
      } finally {
        setLoading(false)
      }
    }

    void fetchTokenPackages()
  }, [])

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
        const fallbackBalance = readBalance(user)
        setBalanceVnd(fallbackBalance)
      } finally {
        setLoadingBalance(false)
      }
    }

    void fetchBalance()
  }, [setUser, user])

  const formatCurrency = (amountVnd: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.max(0, Math.round(amountVnd)))
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 }).format(Number.isFinite(value) ? value : 0)
  }

  const customTopUpAmountNumber = Number(customTopUpAmount.replace(/[\D]/g, ''))
  const customTopUpEstimatedTokens = (() => {
    if (!topUpPricing) return 0
    if (!Number.isFinite(customTopUpAmountNumber) || customTopUpAmountNumber <= 0) return 0

    if (topUpPricing.tokensPer1000Vnd > 0) {
      return (customTopUpAmountNumber / 1000) * topUpPricing.tokensPer1000Vnd
    }

    if (topUpPricing.vndPerToken > 0) {
      return customTopUpAmountNumber / topUpPricing.vndPerToken
    }

    return 0
  })()

  const toNumber = (value: unknown): number => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  const getPriceVnd = (pack: TokenPackage): number => {
    return toNumber(pack.priceVnd)
  }

  const getCreditedTokens = (pack: TokenPackage): number => {
    return toNumber(pack.creditedTokens)
  }

  const getBonusVnd = (pack: TokenPackage): number => {
    return Math.max(0, getCreditedTokens(pack) - getPriceVnd(pack))
  }

  const createPayment = async (payload: CreateVnpayPaymentRequest, processingId: string) => {
    if (processingKey) {
      return
    }

    try {
      setErrorMessage('')
      setProcessingKey(processingId)
      const callbackPath = ROUTER.BILLING_RESULT
      const returnUrl = `${window.location.origin}${callbackPath}?source=token`
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

  const handleBuyPackage = async (pack: TokenPackage) => {
    if (pack.priceVnd <= 0) return
    await createPayment({ tokenPackageId: pack.tokenPackageId, orderInfo: pack.name, returnUrl: '' }, `package:${pack.tokenPackageId}`)
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

    await createPayment({ topUpAmountVnd: amount, orderInfo: t('subscription.customTopUpOrderInfo'), returnUrl: '' }, 'custom')
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
            padding: 20,
            marginBottom: 16,
            background: 'var(--bg-surface)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Coins size={20} color="var(--accent-primary)" />
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              {t('subscription.title')}
            </h1>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>
            {t('subscription.subtitle')}
          </p>
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
          }}
        >
          <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 700, marginBottom: 8 }}>
            {t('subscription.customTopUpTitle')}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              value={customTopUpAmount}
              onChange={(e) => setCustomTopUpAmount(e.target.value)}
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
              {processingKey === 'custom' ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              {processingKey === 'custom' ? t('subscription.processingPayment') : t('subscription.topUpNow')}
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

        {errorMessage && (
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
        )}

        {loading ? (
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
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 16,
            }}
          >
            {tokenPackages.map((pack, index) => {
              const priceVnd = getPriceVnd(pack)
              const creditedTokens = getCreditedTokens(pack)
              const bonusVnd = getBonusVnd(pack)
              const isButtonDisabled = Boolean(processingKey) || pack.priceVnd <= 0
              const isProcessing = processingKey === `package:${pack.tokenPackageId}`

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
                    {bonusVnd > 0 && (
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
                    )}
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

                    {bonusVnd > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                          {t('subscription.bonusVndLabel')}
                        </span>
                        <span style={{ color: 'var(--success-primary)', fontSize: 14, fontWeight: 800 }}>
                          +{formatCurrency(bonusVnd)} VND
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleBuyPackage(pack)}
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
      </div>
    </Layout>
  )
}

export default Subscription