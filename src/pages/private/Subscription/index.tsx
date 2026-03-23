import React, { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, Crown, Loader2, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import Layout from '../../../components/Layout'
import { useStudentSidebarConfig } from '../Student/components/StudentSideBar'
import SubscriptionService, {
  type CurrentSubscriptionPlan,
  type SubscriptionPlan,
  type SubscriptionPlanLimit,
} from '../../../services/SubscriptionService'
import ROUTER from '../../../router/ROUTER'

const Subscription: React.FC = () => {
  const { t } = useTranslation('student')
  const navigate = useNavigate()
  const navItems = useStudentSidebarConfig()
  const sidebarConfig = useMemo(() => ({
    navItems,
    actions: [],
    brand: { name: 'Subscription', subtitle: 'Student' },
  }), [navItems])

  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscriptionPlan | null>(null)
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null)

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const data = await SubscriptionService.getSubscriptionPlans()
        if (Array.isArray(data)) {
          const sorted = [...data]
            .filter((item) => item.isActive)
            .sort((left, right) => left.displayOrder - right.displayOrder)
          setPlans(sorted)
        } else {
          setPlans([])
        }
      } catch {
        setPlans([])
      } finally {
        setLoading(false)
      }
    }

    fetchPlans()
  }, [])

  useEffect(() => {
    const fetchCurrentSubscription = async () => {
      try {
        const response = await SubscriptionService.getCurrentSubscription()
        setCurrentSubscription(response)
      } catch {
        setCurrentSubscription(null)
      }
    }

    fetchCurrentSubscription()
  }, [])

  const formatPrice = (priceVnd: number) => {
    if (priceVnd <= 0) return t('subscription.free')
    return new Intl.NumberFormat('vi-VN').format(priceVnd)
  }

  const getFeatureLabel = (featureKey: unknown) => {
    const normalized = String(featureKey)
    switch (normalized) {
      case '1':
      case 'LearningPathCreation':
        return t('subscription.featureLearningPathCreation')
      case '2':
      case 'TutorMessages':
        return t('subscription.featureTutorMessages')
      case '3':
      case 'FocusSessionReview':
        return t('subscription.featureFocusSessionReview')
      default:
        return t('subscription.featureUsage')
    }
  }

  const getWindowLabel = (windowType: unknown) => {
    const normalized = String(windowType)
    switch (normalized) {
      case '1':
      case 'Daily':
        return t('subscription.windowDay')
      case '2':
      case 'Monthly':
        return t('subscription.windowMonth')
      case '3':
      case 'Lifetime':
        return t('subscription.windowLifetime')
      default:
        return t('subscription.windowMonth')
    }
  }

  const formatLimitLabel = (limit: SubscriptionPlanLimit) => {
    const feature = getFeatureLabel(limit.featureKey)
    const windowType = String(limit.windowType)

    if (windowType === '3' || windowType === 'Lifetime') {
      return t('subscription.limitLifetime', {
        count: limit.limitCount,
        feature,
      })
    }

    return t('subscription.limitPeriod', {
      count: limit.limitCount,
      feature,
      period: getWindowLabel(limit.windowType),
    })
  }

  const getCurrentPlanId = () => {
    if (!currentSubscription || typeof currentSubscription !== 'object') {
      return ''
    }

    const directId = currentSubscription.subscriptionPlanId
    if (typeof directId === 'string' && directId.length > 0) {
      return directId
    }

    const nestedPlan = currentSubscription.subscriptionPlan
    if (nestedPlan && typeof nestedPlan === 'object') {
      const nestedId = (nestedPlan as { subscriptionPlanId?: string }).subscriptionPlanId
      if (typeof nestedId === 'string' && nestedId.length > 0) {
        return nestedId
      }
    }

    return ''
  }

  const currentPlanId = getCurrentPlanId()
  const getCurrentPlanType = () => {
    if (!currentSubscription || typeof currentSubscription !== 'object') {
      return ''
    }

    const directType = currentSubscription.planType
    if (typeof directType === 'string' && directType.length > 0) {
      return directType
    }

    const nestedPlan = currentSubscription.subscriptionPlan
    if (nestedPlan && typeof nestedPlan === 'object') {
      const nestedType = (nestedPlan as { planType?: string }).planType
      if (typeof nestedType === 'string' && nestedType.length > 0) {
        return nestedType
      }
    }

    return ''
  }

  const getPlanTier = (planType: string) => {
    const normalized = planType.trim().toLowerCase()
    if (normalized === 'free') return 1
    if (normalized === 'standard') return 2
    if (normalized === 'pro') return 3
    return 0
  }

  const currentPlanType = getCurrentPlanType()
  const currentPlanTier = getPlanTier(currentPlanType)
  const visiblePlans = currentPlanTier > 0
    ? plans.filter((plan) => getPlanTier(plan.planType) >= currentPlanTier)
    : plans

  const currentPlanName =
    (typeof currentSubscription?.name === 'string' && currentSubscription?.name)
    || (typeof currentSubscription?.planType === 'string' && currentSubscription?.planType)
    || t('subscription.notSubscribed')

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    if (plan.priceVnd <= 0 || processingPlanId) {
      return
    }

    try {
      setProcessingPlanId(plan.subscriptionPlanId)
      const returnUrl = `${window.location.origin}${ROUTER.SUBSCRIPTION_SUCCESS}`
      const paymentResponse = await SubscriptionService.createVnpayPayment({
        subscriptionPlanId: plan.subscriptionPlanId,
        orderInfo: plan.name,
        returnUrl,
      })

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
    } catch {
      alert(t('subscription.createPaymentFailed'))
      setProcessingPlanId(null)
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
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
              {t('subscription.currentSubscriptionLabel')}
            </div>
            <div style={{ fontSize: 18, color: 'var(--text-primary)', fontWeight: 700 }}>
              {currentPlanName}
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate(ROUTER.SUBSCRIPTION_CURRENT)}
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
            {t('subscription.viewCurrentSubscription')}
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
            <Crown size={20} color="var(--accent-primary)" />
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              {t('subscription.title')}
            </h1>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>
            {t('subscription.subtitle')}
          </p>
        </motion.div>

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
            <span>{t('subscription.loading')}</span>
          </div>
        ) : visiblePlans.length === 0 ? (
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
            {t('subscription.noPlans')}
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 16,
            }}
          >
            {visiblePlans.map((plan, index) => {
              const type = plan.planType.toLowerCase()
              const isPro = type === 'pro'
              const isStandard = type === 'standard'
              const isPaid = plan.priceVnd > 0
              const isCurrentPlan = Boolean(currentPlanId) && currentPlanId === plan.subscriptionPlanId
              const isButtonDisabled = Boolean(processingPlanId) || !isPaid || isCurrentPlan
              const visibleLimits = Array.isArray(plan.limits)
                ? plan.limits.filter((limit) => limit.isEnabled)
                : []

              return (
                <motion.div
                  key={plan.subscriptionPlanId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4, scale: 1.01 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  style={{
                    border: `1px solid ${isCurrentPlan ? 'var(--accent-primary)' : 'var(--border-base)'}`,
                    borderRadius: 12,
                    background: 'var(--bg-surface)',
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 420,
                    boxShadow: isCurrentPlan ? '0 0 0 1px var(--accent-primary)' : '0 2px 8px rgba(0, 0, 0, 0.04)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 10 }}>
                    <h2 style={{ margin: 0, fontSize: 22, color: 'var(--text-primary)', fontWeight: 700 }}>{plan.name}</h2>
                    {isCurrentPlan ? (
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
                        {t('subscription.currentPlanBadge')}
                      </span>
                    ) : isPro ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '4px 8px',
                          borderRadius: 999,
                          background: 'var(--accent-primary)',
                          color: 'var(--bg-surface)',
                        }}
                      >
                        <Sparkles size={12} />
                        {t('subscription.badgeBestValue')}
                      </span>
                    ) : isStandard ? (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '4px 8px',
                          borderRadius: 999,
                          border: '1px solid var(--border-base)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {t('subscription.badgePopular')}
                      </span>
                    ) : null}
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
                      <span style={{ fontSize: 30, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                        {formatPrice(plan.priceVnd)}
                      </span>
                      {isPaid && (
                        <span style={{ color: 'var(--text-secondary)', fontSize: 13, paddingBottom: 3 }}>
                          VND
                        </span>
                      )}
                    </div>
                    <div style={{ marginTop: 6, color: 'var(--text-secondary)', fontSize: 12 }}>
                      {isPaid
                        ? t('subscription.cycleDays', { days: plan.durationDays })
                        : t('subscription.foreverFree')}
                    </div>
                  </div>

                  <p style={{ margin: '0 0 14px', color: 'var(--text-secondary)', minHeight: 40, fontSize: 13 }}>
                    {plan.description}
                  </p>

                  <div style={{ borderTop: '1px solid var(--border-base)', paddingTop: 12, marginBottom: 14, flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10 }}>
                      {t('subscription.usageLimitsTitle')}
                    </div>
                    {visibleLimits.length > 0 ? visibleLimits.map((limit, limitIndex) => (
                      <div
                        key={`${plan.subscriptionPlanId}-${String(limit.featureKey)}-${String(limit.windowType)}-${limitIndex}`}
                        style={{ display: 'flex', alignItems: 'start', gap: 8, marginBottom: 10, color: 'var(--text-primary)' }}
                      >
                        <CheckCircle2 size={16} color="var(--success-primary)" style={{ marginTop: 2, flexShrink: 0 }} />
                        <span style={{ fontSize: 13 }}>{formatLimitLabel(limit)}</span>
                      </div>
                    )) : (
                      <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                        {t('subscription.noLimitInfo')}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleUpgrade(plan)}
                    disabled={isButtonDisabled}
                    style={{
                      width: '100%',
                      borderRadius: 8,
                      padding: '10px 12px',
                      border: `1px solid ${isCurrentPlan ? 'var(--border-base)' : (isPaid ? 'var(--accent-primary)' : 'var(--border-base)')}`,
                      background: isCurrentPlan ? 'var(--border-base)' : (isPaid ? 'var(--accent-primary)' : 'var(--bg-main)'),
                      color: isCurrentPlan ? 'var(--text-secondary)' : (isPaid ? 'var(--bg-surface)' : 'var(--text-primary)'),
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      cursor: isButtonDisabled ? 'not-allowed' : 'pointer',
                      opacity: Boolean(processingPlanId) && isPaid && !isCurrentPlan ? 0.8 : 1,
                    }}
                  >
                    {isPaid
                      ? (processingPlanId === plan.subscriptionPlanId
                        ? t('subscription.processingPayment')
                        : (isCurrentPlan ? t('subscription.currentPlan') : t('subscription.upgradeNow')))
                      : t('subscription.currentPlan')}
                    {isPaid && !isCurrentPlan && processingPlanId !== plan.subscriptionPlanId && <ArrowRight size={16} />}
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