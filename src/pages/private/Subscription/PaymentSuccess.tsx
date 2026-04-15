import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Layout from '../../../components/Layout'
import ROUTER from '../../../router/ROUTER'
import { useStudentSidebarConfig } from '../Student/components/StudentSideBar'
import SubscriptionService, { clearCurrentSubscriptionCache, clearSubscriptionCaches } from '../../../services/SubscriptionService'

const PaymentSuccess: React.FC = () => {
  const { t } = useTranslation('student')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const navItems = useStudentSidebarConfig()

  const sidebarConfig = useMemo(() => ({
    navItems,
    actions: [],
    brand: { name: 'Subscription', subtitle: 'Student' },
  }), [navItems])

  const status = String(searchParams.get('status') || '').trim().toLowerCase()
  const expectedPlanId = String(searchParams.get('planId') || '').trim()
  const isSuccess = status === 'success'
  const [isVerifying, setIsVerifying] = useState<boolean>(false)
  const [isPlanUpdated, setIsPlanUpdated] = useState<boolean>(false)

  const resolveSubscriptionPlanId = (subscription: any): string => {
    if (!subscription || typeof subscription !== 'object') return ''

    const directId = String(subscription.subscriptionPlanId || '').trim()
    if (directId) return directId

    const nestedPlan = subscription.subscriptionPlan
    if (nestedPlan && typeof nestedPlan === 'object') {
      return String((nestedPlan as { subscriptionPlanId?: string }).subscriptionPlanId || '').trim()
    }

    return ''
  }

  useEffect(() => {
    if (!isSuccess) {
      setIsPlanUpdated(false)
      return
    }

    let cancelled = false
    setIsVerifying(true)
    setIsPlanUpdated(false)

    const verifyPlan = async () => {
      clearSubscriptionCaches()

      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          clearCurrentSubscriptionCache()
          const latest = await SubscriptionService.getCurrentSubscription()
          const currentPlanId = resolveSubscriptionPlanId(latest)
          const matched = !expectedPlanId || currentPlanId === expectedPlanId

          if (matched) {
            if (!cancelled) {
              setIsPlanUpdated(true)
              setIsVerifying(false)
            }
            return
          }
        } catch {
          // Ignore and retry a few times for eventual consistency.
        }

        if (attempt < 2) {
          await new Promise((resolve) => window.setTimeout(resolve, 1200))
        }
      }

      if (!cancelled) {
        setIsPlanUpdated(false)
        setIsVerifying(false)
      }
    }

    void verifyPlan()

    return () => {
      cancelled = true
    }
  }, [expectedPlanId, isSuccess])

  const renderSuccessDescription = () => {
    if (isVerifying) return t('subscription.paymentSuccessProcessing')
    if (isPlanUpdated) return t('subscription.paymentSuccessDescription')
    return t('subscription.paymentSuccessPending')
  }

  return (
    <Layout sidebar={sidebarConfig}>
      <div style={{ padding: 20, background: 'var(--bg-main)', minHeight: '100vh' }}>
        <div
          style={{
            border: '1px solid var(--border-base)',
            borderRadius: 12,
            background: 'var(--bg-surface)',
            maxWidth: 760,
            margin: '0 auto',
            padding: 28,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            {isSuccess
              ? (isVerifying
                ? <Loader2 size={26} color="var(--accent-primary)" className="animate-spin" />
                : <CheckCircle2 size={26} color="var(--success-primary)" />)
              : <XCircle size={26} color="var(--danger-primary)" />}
            <h1 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 24, fontWeight: 800 }}>
              {isSuccess
                ? (isVerifying ? t('subscription.paymentSuccessCheckingTitle') : t('subscription.paymentSuccessTitle'))
                : t('subscription.paymentFailedTitle')}
            </h1>
          </div>

          <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {isSuccess ? renderSuccessDescription() : t('subscription.paymentFailedDescription')}
          </p>

          {isSuccess && !isVerifying && !isPlanUpdated && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                borderRadius: 8,
                border: '1px solid var(--border-base)',
                background: 'var(--bg-main)',
                color: 'var(--text-primary)',
                padding: '10px 16px',
                fontWeight: 700,
                cursor: 'pointer',
                marginRight: 10,
              }}
            >
              {t('subscription.retrySync')}
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate(ROUTER.SUBSCRIPTION)}
            style={{
              borderRadius: 8,
              border: '1px solid var(--accent-primary)',
              background: 'var(--accent-primary)',
              color: 'var(--bg-surface)',
              padding: '10px 16px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {isSuccess ? t('subscription.backToSubscription') : t('subscription.retryPayment')}
          </button>
        </div>
      </div>
    </Layout>
  )
}

export default PaymentSuccess
